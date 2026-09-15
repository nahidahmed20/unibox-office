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
        ]);

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

        $vendors = $query->latest()->paginate($perPage)->withQueryString();
        $vendors->getCollection()->transform(function ($vendor) {
            $vendor->append('total_due');
            return $vendor;
        });

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
            'payment_source'        => 'required|in:account,advance',
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
            if ($charge > 0 && ($request->payment_source !== 'account' || $payAmount <= 0)) throw new \Exception('Bank charge requires an account payment.');
            $adjustmentAmount = $request->adjustment_amount ?: 0;

            $totalClearing = $payAmount + $adjustmentAmount;

            if ($totalClearing <= 0) {
                throw new \Exception('Pay Amount অথবা Adjustment Amount দিতে হবে।');
            }

            $bills = ProjectExpense::where('vendor_id', $vendor->id)
                        ->whereIn('id', $request->project_expense_ids)
                        ->where('due_amount', '>', 0)
                        ->orderBy('created_at', 'asc')
                        ->lockForUpdate()
                        ->get();

            if ($bills->isEmpty()) {
                throw new \Exception('সিলেক্ট করা বিলগুলোর কোনো বকেয়া পাওয়া যায়নি।');
            }

            $totalDueSelected = $bills->sum('due_amount');

            if ($totalClearing > $totalDueSelected && $adjustmentAmount > 0) {
                throw new \Exception('Adjustment সহ মোট পরিমাণ বিলের বকেয়ার চেয়ে বেশি হতে পারবে না।');
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
                    $account = Account::findOrFail($request->account_id);
                    if ($account->current_balance < $payAmount + $charge) {
                        throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                } else {
                    // Advance allocation is recorded after creating the payment below.
                }
            }

            if ($walletCredit > 0) {
                $vendor->increment('wallet_balance', $walletCredit);
                VendorLedger::create([
                    'vendor_id'   => $vendor->id,
                    'type'        => 'credit',
                    'amount'      => $walletCredit,
                    'description' => 'অতিরিক্ত পেমেন্ট, ওয়ালেটে জমা হয়েছে (Bulk Bill Payment)',
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
            return redirect()->back()->with('success', 'পেমেন্ট ও এডজাস্টমেন্ট সফল হয়েছে।');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->append('total_due');

        // ভেন্ডরের সব পেমেন্ট হিস্টরি
        $payments = VendorPayment::with(['account', 'details.expense'])
            ->where('vendor_id', $vendor->id)
            ->latest('date')
            ->latest('id')
            ->get();

        // ভেন্ডরের ওয়ালেটের লেনদেন (Advance/Refund)
        $ledgers = \App\Models\VendorLedger::where('vendor_id', $vendor->id)
            ->latest()
            ->get();

        // ভেন্ডরের সব প্রজেক্ট বিল
        $bills = ProjectExpense::where('vendor_id', $vendor->id)
            ->latest('date')
            ->get();

        $stats = [
            'totalBilled' => $bills->sum('total_bill'),
            'totalPaid' => $bills->sum('paid_amount'),
        ];

        return Inertia::render('Admin/Vendors/Show', [
            'vendor' => $vendor,
            'payments' => $payments,
            'ledgers' => $ledgers,
            'bills' => $bills,
            'stats' => $stats
        ]);
    }
  
    public function addAdvance(Request $request, $id)
    {
        // 🟢 Check if this is an UNDO request (Mistake Correction)
        if ($request->has('undo_last') && $request->undo_last == true) {
            return $this->processUndoLastAdvance($id);
        }

        $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|decimal:0,2|min:1',
            'date' => 'required|date',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'description' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $vendor  = Vendor::whereKey($id)->lockForUpdate()->firstOrFail();
            $charge = round((float) ($request->bank_charge ?? 0), 2);
            $debit = round($request->amount + $charge, 2);
            $account = Account::whereKey($request->account_id)->lockForUpdate()->firstOrFail();

            if ($account->current_balance < $debit) {
                throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
            }

            $account->decrement('current_balance', $debit);

            $transaction = Transaction::create([
                'account_id'           => $account->id,
                'type'                 => 'debit',
                'amount'               => $debit,
                'bank_charge' => $charge,
                'transaction_date'     => $request->date,
                'description'          => "Advance given to vendor {$vendor->name}. " . $request->description,
                'transactionable_id'   => $vendor->id,
                'transactionable_type' => Vendor::class,
            ]);

            $vendor->increment('wallet_balance', $request->amount);

            VendorLedger::create([
                'vendor_id'   => $vendor->id,
                'date' => $request->date,
                'transaction_id' => $transaction->id,
                'type'        => 'credit',
                'amount'      => $request->amount,
                'description' => "Advance given from {$account->name}. " . $request->description
            ]);

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
                ->where('type', 'credit')->whereNotNull('transaction_id')
                ->orderByDesc('id')
                ->first();

            if (!$lastLedger) {
                throw new \Exception('বাতিল করার মতো কোনো অ্যাডভান্স রেকর্ড পাওয়া যায়নি।');
            }

            // Find matching transaction to safely delete it without inflating reports
            if ($vendor->wallet_balance < $lastLedger->amount) throw new \Exception('This advance has already been used. Reverse its payments first.');
            $transaction = Transaction::whereKey($lastLedger->transaction_id)->lockForUpdate()->firstOrFail();

            if ($transaction) {
                $account = Account::find($transaction->account_id);
                if ($account) {
                    $account->increment('current_balance', $transaction->amount); // Restore money
                }
                $transaction->delete(); // Permanently remove mistake
            }

            $vendor->decrement('wallet_balance', $lastLedger->amount); // Revert vendor wallet
            $lastLedger->delete(); // Remove ledger log

            DB::commit();
            return redirect()->back()->with('success', 'সর্বশেষ অ্যাডভান্সটি সম্পূর্ণ বাতিল (Undo) করা হয়েছে।');
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
                throw new \Exception('ভেন্ডরের ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!');
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

    public function voidPayment(Request $request, VendorPayment $payment)
    {
        if ($payment->status === 'voided') {
            return redirect()->back()->withErrors(['error' => 'এই পেমেন্টটি আগেই ভয়েড করা হয়েছে।']);
        }

        $request->validate(['void_reason' => 'required|string|max:255']);

        try {
            DB::beginTransaction();
            $payment = VendorPayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status === 'voided') throw new \Exception('Payment is already voided.');
            $vendor = Vendor::whereKey($payment->vendor_id)->lockForUpdate()->firstOrFail();
            if ($vendor->wallet_balance < $payment->wallet_credit_amount) throw new \Exception('The excess advance has been used. Reverse its usage first.');

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
                if ($settledBack > 0.009) throw new \Exception('Advance history cannot be safely reversed.');
            }

            if ($payment->wallet_credit_amount > 0) {
                $payment->vendor->decrement('wallet_balance', $payment->wallet_credit_amount);
                VendorLedger::create([
                    'vendor_id'   => $payment->vendor_id,
                    'type'        => 'debit',
                    'amount'      => $payment->wallet_credit_amount,
                    'description' => "পেমেন্ট ভয়েড হওয়ায় ওয়ালেট থেকে বিয়োগ (Payment #{$payment->id})",
                ]);
            }

            $payment->update([
                'status'      => 'voided',
                'voided_by'   => auth()->id(),
                'voided_at'   => now(),
                'void_reason' => $request->void_reason,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'পেমেন্ট ভয়েড হয়েছে, বকেয়া ও ব্যালেন্স রিস্টোর করা হয়েছে।');

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

        $totalDue = ProjectExpense::where('vendor_id', $vendor->id)->sum('due_amount');

        if ($totalDue > 0 || $vendor->wallet_balance > 0) {
            return redirect()->back()->withErrors(['error' => 'এই ভেন্ডরের নামে বকেয়া বা অ্যাডভান্স থাকায় ডিলিট করা সম্ভব নয়।']);
        }

        $vendor->delete();

        return redirect()->back()->with('success', 'ভেন্ডর সফলভাবে ডিলিট হয়েছে।');
    }
}


