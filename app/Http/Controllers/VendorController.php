<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\ProjectExpense;
use App\Models\Vendor;
use App\Models\VendorLedger;
use App\Models\VendorPayment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $query = Vendor::with([
            'projectExpenses' => function($q) {
                $q->where('due_amount', '>', 0)->select('id', 'vendor_id', 'title', 'total_bill', 'paid_amount', 'due_amount');
            },
        ])->withSum(['projectExpenses as total_due' => function($q) {
            $q->where('due_amount', '>', 0);
        }], 'due_amount');

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('company_name', 'like', "%{$request->search}%")
                ->orWhere('phone', 'like', "%{$request->search}%");
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
        }

        $vendors = $query->latest()->paginate($perPage)->through(function ($v) {
            $v->total_due = (float) ($v->total_due ?? 0) + (float) ($v->opening_balance ?? 0);
            return $v;
        })->withQueryString();

        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();

        $advances = AdvanceBalance::with('user:id,name')
            ->get()
            ->map(function($balance) {
                $balance->available_balance = $balance->total_given - ($balance->total_used + $balance->total_returned);
                return $balance;
            })
            ->filter(fn($balance) => $balance->available_balance > 0)
            ->values();

        return Inertia::render('Admin/Vendors/Index', [
            'vendors' => $vendors,
            'accounts' => $accounts,
            'advances' => $advances,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function payments(Vendor $vendor, Request $request)
    {
        $payments = $vendor->payments()
            ->with(['account:id,name', 'details.expense:id,title'])
            ->latest('date')
            ->paginate($request->input('per_page', 5));

        return response()->json($payments);
    }

    public function payVendor(Request $request, Vendor $vendor)
    {
        $request->validate([
            'project_expense_ids'   => 'required|array|min:1',
            'project_expense_ids.*' => 'exists:project_expenses,id',
            'payment_source'        => 'required|in:account,advance,wallet',
            'account_id'            => 'nullable|required_if:payment_source,account|exists:accounts,id',
            'advance_user_id'       => 'nullable|required_if:payment_source,advance|exists:users,id',
            'pay_amount'            => 'required|numeric|decimal:0,2|min:0',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'adjustment_amount'     => 'nullable|numeric|decimal:0,2|min:0',
            'date'                  => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            $vendor = Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();
            $payAmount = round((float) $request->pay_amount, 2);
            $charge = round((float) ($request->bank_charge ?? 0), 2);
            if ($charge > 0 && ($request->payment_source !== 'account' || $payAmount <= 0)) throw new \Exception('Payment from account is required for bank charges.');
            $adjustmentAmount = $request->adjustment_amount ?: 0;

            $totalClearing = $payAmount + $adjustmentAmount;

            if ($totalClearing <= 0) {
                throw new \Exception('Please provide Pay Amount or Adjustment Amount.');
            }

            $bills = ProjectExpense::where('vendor_id', $vendor->id)
                        ->whereIn('id', $request->project_expense_ids)
                        ->where('due_amount', '>', 0)
                        ->orderBy('created_at', 'asc')
                        ->lockForUpdate()
                        ->get();

            if ($bills->isEmpty()) {
                throw new \Exception('No dues found for selected bills.');
            }

            $totalDueSelected = $bills->sum('due_amount');

            if ($request->payment_source === 'wallet') {
                if ($payAmount > $vendor->wallet_balance) throw new \Exception('Insufficient vendor wallet balance.');
                if ($totalClearing > $totalDueSelected) throw new \Exception('Wallet settlement cannot exceed selected bill dues.');
            }

            if ($totalClearing > $totalDueSelected && $adjustmentAmount > 0) {
                throw new \Exception('Total amount including adjustment cannot exceed bill dues.');
            }

            $remainingClearing = $totalClearing;
            $appliedDetails = [];

            foreach ($bills as $bill) {
                if ($remainingClearing <= 0) break;
                $clearedNow = min($remainingClearing, $bill->due_amount);

                $bill->paid_amount += $clearedNow;
                $bill->due_amount  -= $clearedNow;
                $bill->payment_status = $bill->due_amount <= 0 ? 'paid' : 'partial';

                $bill->save();
                $appliedDetails[$bill->id] = $clearedNow;
                $remainingClearing -= $clearedNow;
            }

            $walletCredit = max(0, $payAmount - $totalDueSelected);

            if ($payAmount > 0) {
                if ($request->payment_source === 'account') {
                    $account = Account::whereKey($request->account_id)->lockForUpdate()->firstOrFail();
                    if ($account->current_balance < $payAmount + $charge) {
                        throw new \Exception('Insufficient balance in selected account!');
                    }
                } else {
                    // Advance allocation is recorded after creating the payment below.
                }
            }

            if ($walletCredit > 0) {
                $vendor->increment('wallet_balance', $walletCredit);
                VendorLedger::create([
                    'vendor_id'   => $vendor->id,
                    'date'        => $request->date,
                    'type'        => 'credit',
                    'amount'      => $walletCredit,
                    'description' => 'Excess payment credited to wallet (Bulk Bill Payment)',
                ]);
            }

            $payment = VendorPayment::create([
                'vendor_id'            => $vendor->id,
                'payment_source'       => $request->payment_source,
                'account_id'           => $request->payment_source === 'account' ? $request->account_id : null,
                'advance_user_id'      => $request->payment_source === 'advance' ? $request->advance_user_id : null,
                'pay_amount'           => $payAmount,
                'bank_charge' => $charge,
                'adjustment_amount'    => $adjustmentAmount,
                'wallet_credit_amount' => $walletCredit,
                'date'                 => $request->date,
                'status'               => 'completed',
                'created_by'           => auth()->id(),
            ]);

            if ($request->payment_source === 'advance') app(\App\Services\AdvanceSettlementService::class)->consume($payment, $request->advance_user_id, $payAmount);

            if ($request->payment_source === 'wallet' && $payAmount > 0) {
                $vendor->decrement('wallet_balance', $payAmount);
                VendorLedger::create([
                    'vendor_id' => $vendor->id, 'type' => 'debit', 'amount' => $payAmount,
                    'date' => $request->date,
                    'description' => 'Existing vendor advance applied to bills (VP-' . $payment->id . ')',
                ]);
            }

            foreach ($appliedDetails as $expenseId => $amount) {
                $payment->details()->create([
                    'project_expense_id' => $expenseId,
                    'amount'             => $amount,
                ]);
            }

            if ($request->payment_source === 'account' && $payAmount > 0) {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $payAmount + $charge);

                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'debit',
                    'amount'               => $payAmount + $charge,
                    'bank_charge' => $charge,
                    'transaction_date'     => $request->date,
                    'description'          => 'Bill payment to vendor: ' . $vendor->name . ' (VP-' . $payment->id . ')',
                    'transactionable_id'   => $payment->id,
                    'transactionable_type' => VendorPayment::class,
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Payment and adjustment processed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->append('total_due');

        // All payment history for vendor
        $payments = VendorPayment::with(['account', 'details.expense.project'])
            ->where('vendor_id', $vendor->id)
            ->latest('date')
            ->latest('id')
            ->get();

        // Vendor wallet transactions (Advance/Refund)
        $ledgers = \App\Models\VendorLedger::where('vendor_id', $vendor->id)
            ->latest('date')
            ->latest('id')
            ->get();

        // All project bills for vendor
        $bills = ProjectExpense::with(['project.client', 'category'])
            ->where('vendor_id', $vendor->id)
            ->latest('date')
            ->latest('id')
            ->get();

        // Chronological Statement & Date-wise Payment Summary
        $events = [];
        $directPayments = [];
        $paymentByDate = [];

        if ((float) ($vendor->opening_balance ?? 0) > 0) {
            $events[] = [
                'date' => $vendor->created_at ? $vendor->created_at->toDateString() : date('Y-m-d'),
                'sort_time' => '0000-00-00 00:00:00',
                'type' => 'opening_balance',
                'ref' => 'OPENING',
                'title' => 'Opening Balance',
                'project' => null,
                'client' => null,
                'category' => null,
                'billed' => (float) $vendor->opening_balance,
                'paid' => 0,
                'discount' => 0,
                'status' => 'due',
                'id' => 'opening',
            ];
        }

        foreach ($bills as $bill) {
            $voucherSettled = \App\Models\VendorPaymentDetail::where('project_expense_id', $bill->id)
                ->whereHas('payment', fn($q) => $q->where('status', 'completed'))
                ->sum('amount');

            $directPaid = max(0, (float)$bill->paid_amount - (float)$voucherSettled);

            $events[] = [
                'date' => $bill->date ?: ($bill->created_at ? $bill->created_at->toDateString() : date('Y-m-d')),
                'sort_time' => $bill->created_at ? $bill->created_at->toDateTimeString() : ($bill->date . ' 00:00:00'),
                'type' => 'bill',
                'ref' => 'BILL-' . $bill->id,
                'title' => $bill->title,
                'project' => $bill->project?->title,
                'client' => $bill->project?->client?->name,
                'category' => $bill->category?->name,
                'billed' => (float)$bill->total_bill,
                'paid' => 0,
                'discount' => 0,
                'status' => $bill->payment_status,
                'id' => $bill->id,
            ];

            if ($directPaid > 0) {
                // Identify the real source of the money paid at bill entry
                if ($bill->advance_user_id) {
                    $sourceType = 'advance';
                    $sourceName = 'Employee Advance (' . (\App\Models\User::find($bill->advance_user_id)?->name ?? 'Staff') . ')';
                } elseif ($bill->account_id) {
                    $sourceType = 'account';
                    $sourceName = Account::find($bill->account_id)?->name ?? 'Bank/Cash';
                } else {
                    $sourceType = 'wallet';
                    $sourceName = 'Vendor Advance (Wallet)';
                }
                $billDate = $bill->date ?: ($bill->created_at ? $bill->created_at->toDateString() : date('Y-m-d'));

                $directPayments[] = [
                    'id' => 'B' . $bill->id,
                    'bill_id' => $bill->id,
                    'date' => $billDate,
                    'source_type' => $sourceType,
                    'source_name' => $sourceName,
                    'bill_title' => $bill->title,
                    'project' => $bill->project?->title,
                    'bill_total' => (float) $bill->total_bill,
                    'bill_due' => (float) $bill->due_amount,
                    'amount' => $directPaid,
                ];

                $events[] = [
                    'date' => $billDate,
                    'sort_time' => $bill->created_at ? $bill->created_at->addSecond()->toDateTimeString() : ($bill->date . ' 00:00:01'),
                    'type' => 'direct_payment',
                    'ref' => 'BILL-' . $bill->id . ' (Paid)',
                    'title' => 'Direct bill payment (' . $sourceName . '): ' . $bill->title,
                    'project' => $bill->project?->title,
                    'client' => $bill->project?->client?->name,
                    'category' => $bill->category?->name,
                    'billed' => 0,
                    'paid' => $directPaid,
                    'discount' => 0,
                    'status' => 'completed',
                    'id' => $bill->id,
                ];

                if (!isset($paymentByDate[$billDate])) {
                    $paymentByDate[$billDate] = [
                        'date' => $billDate,
                        'total_amount' => 0,
                        'total_discount' => 0,
                        'items' => [],
                        'methods' => [],
                    ];
                }
                $paymentByDate[$billDate]['total_amount'] += $directPaid;
                $paymentByDate[$billDate]['items'][] = [
                    'type' => 'Direct Bill',
                    'ref' => 'BILL-' . $bill->id,
                    'title' => $bill->title . ($bill->project?->title ? " ({$bill->project->title})" : ""),
                    'amount' => $directPaid,
                    'discount' => 0,
                    'method' => $sourceName,
                ];
                if (!in_array($sourceName, $paymentByDate[$billDate]['methods'])) {
                    $paymentByDate[$billDate]['methods'][] = $sourceName;
                }
            }
        }

        foreach ($payments as $payment) {
            if ($payment->status === 'voided') continue;

            $sourceLabel = $payment->payment_source === 'account'
                ? ($payment->account?->name ?? 'Bank/Cash')
                : ($payment->payment_source === 'wallet' ? 'Vendor Advance' : 'Employee Advance');

            $payDate = $payment->getRawOriginal('date') ?: ($payment->created_at ? $payment->created_at->toDateString() : date('Y-m-d'));
            $vpRef = 'VP-' . str_pad($payment->id, 5, '0', STR_PAD_LEFT);

            $events[] = [
                'date' => $payDate,
                'sort_time' => $payment->created_at ? $payment->created_at->toDateTimeString() : ($payDate . ' 00:00:00'),
                'type' => 'payment',
                'ref' => $vpRef,
                'title' => 'Payment Voucher (' . $sourceLabel . ')' . ($payment->note ? ' - ' . $payment->note : ''),
                'project' => null,
                'client' => null,
                'category' => null,
                'billed' => 0,
                'paid' => (float)$payment->pay_amount,
                'discount' => (float)$payment->adjustment_amount,
                'status' => $payment->status,
                'id' => $payment->id,
            ];

            if (!isset($paymentByDate[$payDate])) {
                $paymentByDate[$payDate] = [
                    'date' => $payDate,
                    'total_amount' => 0,
                    'total_discount' => 0,
                    'items' => [],
                    'methods' => [],
                ];
            }
            $paymentByDate[$payDate]['total_amount'] += (float) $payment->pay_amount;
            $paymentByDate[$payDate]['total_discount'] += (float) $payment->adjustment_amount;
            $settledTitles = collect($payment->details)->map(fn($d) => $d->expense?->title)->filter()->implode(', ');
            $paymentByDate[$payDate]['items'][] = [
                'type' => 'Voucher',
                'ref' => $vpRef,
                'title' => $settledTitles ?: ($payment->note ?: 'Bill Settlement Voucher'),
                'amount' => (float) $payment->pay_amount,
                'discount' => (float) $payment->adjustment_amount,
                'method' => $sourceLabel,
            ];
            if (!in_array($sourceLabel, $paymentByDate[$payDate]['methods'])) {
                $paymentByDate[$payDate]['methods'][] = $sourceLabel;
            }
        }

        // Direct wallet advances given to vendor (credit entries)
        foreach ($ledgers as $l) {
            if ($l->type === 'credit') {
                $advDate = $l->date ?: ($l->created_at ? $l->created_at->toDateString() : date('Y-m-d'));
                if (!isset($paymentByDate[$advDate])) {
                    $paymentByDate[$advDate] = [
                        'date' => $advDate,
                        'total_amount' => 0,
                        'total_discount' => 0,
                        'items' => [],
                        'methods' => [],
                    ];
                }
                $methodLabel = $l->transaction_id ? 'Bank/Cash Advance' : 'Staff Advance';
                $paymentByDate[$advDate]['total_amount'] += (float) $l->amount;
                $paymentByDate[$advDate]['items'][] = [
                    'type' => 'Advance',
                    'ref' => 'ADV-' . $l->id,
                    'title' => $l->description ?: 'Vendor Wallet Advance',
                    'amount' => (float) $l->amount,
                    'discount' => 0,
                    'method' => $methodLabel,
                ];
                if (!in_array($methodLabel, $paymentByDate[$advDate]['methods'])) {
                    $paymentByDate[$advDate]['methods'][] = $methodLabel;
                }
            }
        }

        usort($events, function($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) return $cmp;
            return strcmp($a['sort_time'], $b['sort_time']);
        });

        $running = 0;
        foreach ($events as &$ev) {
            $running += $ev['billed'] - $ev['paid'] - $ev['discount'];
            $ev['balance'] = round($running, 2);
        }
        unset($ev);

        krsort($paymentByDate);
        $dateWisePayments = array_values($paymentByDate);

        $completedPayments = $payments->where('status', 'completed');
        $voucherSettledTotal = \App\Models\VendorPaymentDetail::whereIn('vendor_payment_id', $completedPayments->pluck('id'))->sum('amount');
        $directPaidTotal = max(0, $bills->sum('paid_amount') - $voucherSettledTotal);
        $totalCashPaid = $directPaidTotal + $completedPayments->sum('pay_amount');
        $totalDiscount = $completedPayments->sum('adjustment_amount');

        $stats = [
            'totalBilled' => (float) $bills->sum('total_bill') + (float) ($vendor->opening_balance ?? 0),
            'totalPaid' => (float) $bills->sum('paid_amount'),
            'actualCashPaid' => (float) $totalCashPaid,
            'totalDiscount' => (float) $totalDiscount,
            'currentDue' => (float) $bills->sum('due_amount') + (float) ($vendor->opening_balance ?? 0),
            'walletBalance' => (float) $vendor->wallet_balance,
        ];

        return Inertia::render('Admin/Vendors/Show', [
            'vendor' => $vendor,
            'payments' => $payments,
            'ledgers' => $ledgers,
            'bills' => $bills,
            'statement' => $events,
            'directPayments' => $directPayments,
            'dateWisePayments' => $dateWisePayments,
            'stats' => $stats,
            'accounts' => Account::where('is_active', true)->select('id', 'name', 'current_balance')->get(),
            'advances' => AdvanceBalance::with('user:id,name')
                ->get()
                ->map(function($balance) {
                    $balance->available_balance = $balance->total_given - ($balance->total_used + $balance->total_returned);
                    return $balance;
                })
                ->filter(fn($balance) => $balance->available_balance > 0)
                ->values(),
        ]);
    }

    public function addAdvance(Request $request, $id)
    {
        // 🟢 Check if this is an UNDO request (Mistake Correction)
        if ($request->has('undo_last') && $request->undo_last == true) {
            return $this->processUndoLastAdvance($id);
        }

        $paymentSource = $request->input('payment_source', 'account');

        $rules = [
            'payment_source'  => 'nullable|in:account,advance',
            'amount'          => 'required|numeric|decimal:0,2|min:1',
            'date'            => 'required|date',
            'description'     => 'nullable|string'
        ];

        if ($paymentSource === 'account') {
            $rules['account_id'] = 'required|exists:accounts,id';
            $rules['bank_charge'] = 'nullable|numeric|decimal:0,2|min:0';
        } else {
            $rules['advance_user_id'] = 'required|exists:users,id';
        }

        $request->validate($rules);

        try {
            DB::beginTransaction();

            $vendor = Vendor::whereKey($id)->lockForUpdate()->firstOrFail();
            $amount = round((float) $request->amount, 2);

            if ($paymentSource === 'account') {
                $charge = round((float) ($request->bank_charge ?? 0), 2);
                $debit = round($amount + $charge, 2);
                $account = Account::whereKey($request->account_id)->lockForUpdate()->firstOrFail();

                if ($account->current_balance < $debit) {
                    throw new \Exception('Insufficient balance in selected account!');
                }

                $account->decrement('current_balance', $debit);

                $transaction = Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'debit',
                    'amount'               => $debit,
                    'bank_charge'          => $charge,
                    'transaction_date'     => $request->date,
                    'description'          => "Advance given to vendor {$vendor->name}. " . $request->description,
                    'transactionable_id'   => $vendor->id,
                    'transactionable_type' => Vendor::class,
                ]);

                $vendor->increment('wallet_balance', $amount);

                VendorLedger::create([
                    'vendor_id'      => $vendor->id,
                    'date'           => $request->date,
                    'transaction_id' => $transaction->id,
                    'type'           => 'credit',
                    'amount'         => $amount,
                    'description'    => "Advance given from {$account->name}. " . $request->description
                ]);
            } else {
                // Paid from Staff Advance
                $staff = User::whereKey($request->advance_user_id)->firstOrFail();

                $vendor->increment('wallet_balance', $amount);

                $ledger = VendorLedger::create([
                    'vendor_id'      => $vendor->id,
                    'date'           => $request->date,
                    'transaction_id' => null,
                    'type'           => 'credit',
                    'amount'         => $amount,
                    'description'    => "Advance given by Staff: {$staff->name}. " . $request->description
                ]);

                // Consume staff advance balance atomically
                app(\App\Services\AdvanceSettlementService::class)->consume($ledger, $staff->id, $amount);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Advance added to Vendor Wallet successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // 🟢 PRIVATE FUNCTION: Logic for Undoing the last mistake perfectly
    private function processUndoLastAdvance($vendorId)
    {
        try {
            DB::beginTransaction();
            $vendor = Vendor::findOrFail($vendorId);

            // Find the last advance (credit) ledger entry
            $lastLedger = VendorLedger::where('vendor_id', $vendor->id)
                ->where('type', 'credit')
                ->orderByDesc('id')
                ->first();

            if (!$lastLedger) {
                throw new \Exception('No advance record found to undo.');
            }

            // Check if vendor wallet balance has enough to revert
            if ($vendor->wallet_balance < $lastLedger->amount) {
                throw new \Exception('Excess advance has already been utilized. Please reverse that first.');
            }

            if ($lastLedger->transaction_id) {
                $transaction = Transaction::whereKey($lastLedger->transaction_id)->lockForUpdate()->first();
                if ($transaction) {
                    $account = Account::find($transaction->account_id);
                    if ($account) {
                        $account->increment('current_balance', $transaction->amount); // Restore money
                    }
                    $transaction->delete(); // Permanently remove mistake
                }
            } else {
                // Refund employee advance settlement
                app(\App\Services\AdvanceSettlementService::class)->refund($lastLedger);
            }

            $vendor->decrement('wallet_balance', $lastLedger->amount); // Revert vendor wallet
            $lastLedger->delete(); // Remove ledger log

            DB::commit();
            return redirect()->back()->with('success', 'The latest advance was completely reversed (Undo).');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // 🟢 UPDATED: Handles both Wallet Refund AND Extra Profit together
    public function receiveRefund(Request $request, $id)
    {
        $request->validate([
            'account_id'    => 'required|exists:accounts,id',
            'amount'        => 'required|numeric|decimal:0,2|min:1', // Actual refund from wallet
            'profit_amount' => 'nullable|numeric|decimal:0,2|min:0', // Extra profit/commission
            'date' => 'required|date',
            'description'   => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $vendor  = Vendor::findOrFail($id);
            $account = Account::findOrFail($request->account_id);

            if ($vendor->wallet_balance < $request->amount) {
                throw new \Exception('Insufficient balance in vendor wallet!');
            }

            $profit = $request->profit_amount ?: 0;
            $totalReceived = $request->amount + $profit;

            // Deduct ONLY the principal amount from vendor's wallet
            $vendor->decrement('wallet_balance', $request->amount);

            // Add the TOTAL (Principal + Profit) to your bank account
            $account->increment('current_balance', $totalReceived);

            $desc = "Refund received from vendor {$vendor->name}.";
            if ($profit > 0) {
                $desc .= " (Including extra Profit: ৳{$profit}).";
            }
            $desc .= " " . $request->description;

            // Create ONE transaction for the full amount so accounts match perfectly
            Transaction::create([
                'account_id'           => $account->id,
                'type'                 => 'credit',
                'amount'               => $totalReceived,
                'transaction_date'     => $request->date,
                'description'          => trim($desc),
                'transactionable_id'   => $vendor->id,
                'transactionable_type' => Vendor::class,
            ]);

            // Only register the principal deduction in vendor ledger
            VendorLedger::create([
                'vendor_id'   => $vendor->id,
                'date' => $request->date,
                'type'        => 'debit',
                'amount'      => $request->amount,
                'description' => "Refund deducted from wallet to {$account->name}. " . $request->description
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Refund ' . ($profit > 0 ? '& Profit ' : '') . 'received successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateBankCharge(Request $request, VendorPayment $payment)
    {
        $data = $request->validate([
            'bank_charge'       => 'required|numeric|decimal:0,2|min:0|max:9999999999999.99',
            'pay_amount'        => 'sometimes|required|numeric|decimal:0,2|min:0.01|max:9999999999999.99',
            'adjustment_amount' => 'nullable|numeric|decimal:0,2|min:0|max:9999999999999.99',
        ]);

        DB::transaction(function () use ($payment, $data) {
            $payment = VendorPayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $fail = fn ($message) => throw \Illuminate\Validation\ValidationException::withMessages(['bank_charge' => $message]);
            if ($payment->status !== 'completed' || $payment->payment_source !== 'account' || $payment->pay_amount <= 0) {
                $fail('Only completed account payments can be edited.');
            }
            $vendor = Vendor::whereKey($payment->vendor_id)->lockForUpdate()->firstOrFail();
            $account = Account::whereKey($payment->account_id)->lockForUpdate()->firstOrFail();
            $transactions = Transaction::where('transactionable_type', $payment->getMorphClass())
                ->where('transactionable_id', $payment->id)->where('type', 'debit')->lockForUpdate()->get();

            if ($transactions->count() !== 1 || $transactions->first()->account_id != $account->id) {
                $fail('Original account transaction not found.');
            }

            $transaction = $transactions->first();

            if (abs((float) $transaction->amount - ((float) $payment->pay_amount + (float) $payment->bank_charge)) > 0.001) {
                $fail('Payment amount does not match original transaction amount.');
            }

            $charge = round((float) $data['bank_charge'], 2);
            $amount = round((float) ($data['pay_amount'] ?? $payment->pay_amount), 2);
            $adjustment = isset($data['adjustment_amount']) ? round((float) $data['adjustment_amount'], 2) : round((float) $payment->adjustment_amount, 2);

            if ($amount != (float) $payment->pay_amount || $adjustment != (float) $payment->adjustment_amount) {
                $details = $payment->details()->lockForUpdate()->get();
                $bills = ProjectExpense::whereIn('id', $details->pluck('project_expense_id'))->orderBy('created_at')->orderBy('id')->lockForUpdate()->get();

                if ($bills->count() !== $details->count() || $bills->isEmpty()) {
                    $fail('Original bills could not be identified.');
                }
                foreach ($bills as $bill) {
                    $previous = $details->firstWhere('project_expense_id', $bill->id)->amount;
                    if ($bill->vendor_id != $vendor->id || $bill->paid_amount < $previous) $fail('Original bill settlement does not match.');
                    $bill->paid_amount -= $previous;
                    $bill->due_amount += $previous;
                }
                $available = round($bills->sum('due_amount'), 2);
                $remaining = round($amount + $adjustment, 2);
                if ($adjustment > 0 && $remaining > $available) $fail('Payment and adjustment exceed selected bills.');

                $walletCredit = round(max(0, $amount - $available), 2);
                $walletDifference = round($walletCredit - $payment->wallet_credit_amount, 2);

                if ($walletDifference < 0 && $vendor->wallet_balance < -$walletDifference) $fail('Excess advance has already been utilized. Please reverse that first.');

                foreach ($bills as $bill) {
                    $allocated = min($remaining, $bill->due_amount);
                    $bill->paid_amount += $allocated;
                    $bill->due_amount -= $allocated;
                    $bill->payment_status = $bill->due_amount <= 0 ? 'paid' : ($bill->paid_amount > 0 ? 'partial' : 'due');
                    $bill->save();
                    $details->firstWhere('project_expense_id', $bill->id)->update(['amount' => $allocated]);
                    $remaining -= $allocated;
                }

                if ($walletDifference != 0) {
                    $vendor->increment('wallet_balance', $walletDifference);
                    VendorLedger::create([
                        'vendor_id' => $vendor->id,
                        'type' => $walletDifference > 0 ? 'credit' : 'debit',
                        'amount' => abs($walletDifference),
                        'date' => $payment->getRawOriginal('date'),
                        'description' => 'Payment amount correction (VP-'.$payment->id.')'
                    ]);
                }
                $payment->wallet_credit_amount = $walletCredit;
                $payment->adjustment_amount = $adjustment;
            }

            $difference = round($amount + $charge - $payment->pay_amount - $payment->bank_charge, 2);

            if ($difference > 0 && $account->current_balance < $difference) {
                $fail('Insufficient balance in account for modified payment amount.');
            }

            if ($difference != 0) {
                $account->decrement('current_balance', $difference);
            }

            $transaction->update([
                'amount' => round($amount + $charge, 2),
                'bank_charge' => $charge,
                'transaction_date' => $transaction->getRawOriginal('transaction_date')
            ]);

            $payment->update([
                'pay_amount' => $amount,
                'bank_charge' => $charge,
                'adjustment_amount' => $adjustment,
                'date' => $payment->getRawOriginal('date')
            ]);

        });

        return back()->with('success', 'Payment updated successfully.');
    }

    public function voidPayment(Request $request, VendorPayment $payment)
    {
        if ($payment->status === 'voided') {
            return redirect()->back()->withErrors(['error' => 'This payment has already been voided.']);
        }

        $request->validate(['void_reason' => 'required|string|max:255']);

        try {
            DB::beginTransaction();
            $payment = VendorPayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status === 'voided') throw new \Exception('This payment has already been voided.');
            $vendor = Vendor::whereKey($payment->vendor_id)->lockForUpdate()->firstOrFail();
            if ($vendor->wallet_balance < $payment->wallet_credit_amount) throw new \Exception('Excess advance has already been utilized. Please reverse that first.');

            foreach ($payment->details as $detail) {
                $bill = ProjectExpense::lockForUpdate()->find($detail->project_expense_id);
                if (!$bill) continue;

                $bill->paid_amount -= $detail->amount;
                $bill->due_amount  += $detail->amount;
                $bill->payment_status = $bill->due_amount >= $bill->total_bill
                    ? 'due'
                    : ($bill->due_amount > 0 ? 'partial' : 'paid');
                $bill->save();
            }

            if ($payment->payment_source === 'account') {
                $account = Account::findOrFail($payment->account_id);
                $account->increment('current_balance', $payment->pay_amount + $payment->bank_charge);

                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'credit',
                    'amount'               => $payment->pay_amount + $payment->bank_charge,
                    'bank_charge' => $payment->bank_charge,
                    'transaction_date'     => now()->toDateString(),
                    'description'          => 'Payment voided (VP-' . $payment->id . '): ' . $request->void_reason,
                    'transactionable_id'   => $payment->id,
                    'transactionable_type' => VendorPayment::class,
                ]);

            } elseif ($payment->payment_source === 'wallet') {
                if ($payment->pay_amount > 0) {
                    $vendor->increment('wallet_balance', $payment->pay_amount);
                    VendorLedger::create([
                        'vendor_id' => $vendor->id, 'type' => 'credit', 'amount' => $payment->pay_amount,
                        'date' => now()->toDateString(),
                        'description' => 'Wallet settlement voided (VP-' . $payment->id . '): ' . $request->void_reason,
                    ]);
                }
            } elseif (!app(\App\Services\AdvanceSettlementService::class)->refund($payment)) {
                $advanceBalance = AdvanceBalance::where('user_id', $payment->advance_user_id)->first();
                $advanceBalance?->decrement('total_used', $payment->pay_amount);

                $settledBack = $payment->pay_amount;
                $advances = Advance::where('user_id', $payment->advance_user_id)
                            ->where('settled_amount', '>', 0)
                            ->orderBy('date', 'desc')->get();

                foreach ($advances as $adv) {
                    if ($settledBack <= 0) break;
                    $reserved = \App\Models\AdvanceSettlement::where('advance_id', $adv->id)->sum('amount');
                    $undo = min($settledBack, max($adv->settled_amount - $reserved, 0));
                    $adv->settled_amount -= $undo;
                    $adv->status = 'unsettled';
                    $adv->save();
                    $settledBack -= $undo;
                }
                if ($settledBack > 0.009) throw new \Exception('Advance history could not be safely reversed.');
            }

            if ($payment->wallet_credit_amount > 0) {
                $payment->vendor->decrement('wallet_balance', $payment->wallet_credit_amount);
                VendorLedger::create([
                    'vendor_id'   => $payment->vendor_id,
                    'date'        => now()->toDateString(),
                    'type'        => 'debit',
                    'amount'      => $payment->wallet_credit_amount,
                    'description' => "Wallet balance debited due to voided payment (Payment #{$payment->id})",
                ]);
            }

            $payment->update([
                'status'      => 'voided',
                'voided_by'   => auth()->id(),
                'voided_at'   => now(),
                'void_reason' => $request->void_reason,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment has been voided; dues and balances restored successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:20|unique:vendors,phone',
            'address'         => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
        ]);

        $vendor = Vendor::create($validated);
        if ($request->wantsJson()) {
            return response()->json([
                'vendor' => $vendor->only(['id', 'name', 'company_name']),
            ]);
        }

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $vendor = Vendor::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:20|unique:vendors,phone,' . $vendor->id,
            'address'         => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
        ]);

        $vendor->update($validated);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $vendor = Vendor::findOrFail($id);

        $totalDue = ProjectExpense::where('vendor_id', $vendor->id)->sum('due_amount') + (float) ($vendor->opening_balance ?? 0);

        if ($totalDue > 0 || $vendor->wallet_balance > 0) {
            return redirect()->back()->withErrors(['error' => 'Cannot delete vendor with outstanding dues or wallet balance.']);
        }

        $vendor->delete();

        return redirect()->back()->with('success', 'Vendor deleted successfully.');
    }
}
