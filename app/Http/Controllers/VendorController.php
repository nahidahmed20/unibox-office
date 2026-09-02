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
            $perPage = min((int) $request->input('per_page', 10), 100000);
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
            'account_id'            => 'required_if:payment_source,account',
            'advance_user_id'       => 'required_if:payment_source,advance',
            'pay_amount'            => 'required|numeric|min:0',
            'adjustment_amount'     => 'nullable|numeric|min:0',
            'date'                  => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            $payAmount = $request->pay_amount ?: 0;
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

                if ($request->payment_source === 'account') {
                    $bill->account_id = $request->account_id;
                } else {
                    $bill->advance_user_id = $request->advance_user_id;
                    $bill->advance_id = null;
                }

                $bill->save();
                $appliedDetails[$bill->id] = $clearedNow;
                $remainingClearing -= $clearedNow;
            }

            $walletCredit = max(0, $payAmount - $totalDueSelected);

            if ($payAmount > 0) {
                if ($request->payment_source === 'account') {
                    $account = Account::findOrFail($request->account_id);
                    if ($account->current_balance < $payAmount) {
                        throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                } else {
                    $userId = $request->advance_user_id;
                    $advanceBalance = AdvanceBalance::where('user_id', $userId)->lockForUpdate()->firstOrFail();
                    $availableAdvance = (float) $advanceBalance->total_given - (float) $advanceBalance->total_used - (float) $advanceBalance->total_returned;
                    if ($payAmount > $availableAdvance) {
                        throw new \Exception("Employee has only {$availableAdvance} TK advance available.");
                    }
                    $advanceBalance->increment('total_used', $payAmount);

                    $settleRemaining = $payAmount;
                    $unsettledAdvances = Advance::where('user_id', $userId)
                                ->where('status', 'unsettled')
                                ->orderBy('date', 'asc')->get();

                    foreach ($unsettledAdvances as $adv) {
                        if ($settleRemaining <= 0) break;
                        $available = $adv->amount - ($adv->settled_amount + $adv->returned_amount);
                        if ($available <= 0) continue;

                        if ($settleRemaining >= $available) {
                            $adv->settled_amount += $available;
                            $adv->status = 'settled';
                            $settleRemaining -= $available;
                        } else {
                            $adv->settled_amount += $settleRemaining;
                            $settleRemaining = 0;
                        }
                        $adv->save();
                    }
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
                'adjustment_amount'    => $adjustmentAmount,
                'wallet_credit_amount' => $walletCredit,
                'date'                 => $request->date,
                'status'               => 'completed',
                'created_by'           => auth()->id(),
            ]);

            foreach ($appliedDetails as $expenseId => $amount) {
                $payment->details()->create([
                    'project_expense_id' => $expenseId,
                    'amount'             => $amount,
                ]);
            }

            if ($request->payment_source === 'account' && $payAmount > 0) {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $payAmount);

                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'debit',
                    'amount'               => $payAmount,
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

    public function addAdvance(Request $request, $id)
    {
        $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|min:1',
            'description' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $vendor  = Vendor::findOrFail($id);
            $account = Account::findOrFail($request->account_id);

            if ($account->current_balance < $request->amount) {
                throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
            }

            $account->decrement('current_balance', $request->amount);

            Transaction::create([
                'account_id'           => $account->id,
                'type'                 => 'debit',
                'amount'               => $request->amount,
                'transaction_date'     => now()->toDateString(),
                'description'          => "Advance given to vendor {$vendor->name}. " . $request->description,
                'transactionable_id'   => $vendor->id,
                'transactionable_type' => Vendor::class,
            ]);

            $vendor->increment('wallet_balance', $request->amount);

            VendorLedger::create([
                'vendor_id'   => $vendor->id,
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

    public function receiveRefund(Request $request, $id)
    {
        $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|min:1',
            'description' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $vendor  = Vendor::findOrFail($id);
            $account = Account::findOrFail($request->account_id);

            if ($vendor->wallet_balance < $request->amount) {
                throw new \Exception('ভেন্ডরের ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!');
            }

            $vendor->decrement('wallet_balance', $request->amount);
            $account->increment('current_balance', $request->amount);

            Transaction::create([
                'account_id'           => $account->id,
                'type'                 => 'credit',
                'amount'               => $request->amount,
                'transaction_date'     => now()->toDateString(),
                'description'          => "Refund received from vendor {$vendor->name}. " . $request->description,
                'transactionable_id'   => $vendor->id,
                'transactionable_type' => Vendor::class,
            ]);

            VendorLedger::create([
                'vendor_id'   => $vendor->id,
                'type'        => 'debit',
                'amount'      => $request->amount,
                'description' => "Refund received to {$account->name}. " . $request->description
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Refund received successfully.');

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

            foreach ($payment->details as $detail) {
                $bill = ProjectExpense::lockForUpdate()->find($detail->project_expense_id);
                if (!$bill) continue;

                $bill->paid_amount -= $detail->amount;
                $bill->due_amount  += $detail->amount;
                $bill->payment_status = $bill->due_amount >= $bill->total_bill
                    ? 'unpaid'
                    : ($bill->due_amount > 0 ? 'partial' : 'paid');
                $bill->save();
            }

            if ($payment->payment_source === 'account') {
                $account = Account::findOrFail($payment->account_id);
                $account->increment('current_balance', $payment->pay_amount);

                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'credit',
                    'amount'               => $payment->pay_amount,
                    'transaction_date'     => now()->toDateString(),
                    'description'          => 'Payment voided (VP-' . $payment->id . '): ' . $request->void_reason,
                    'transactionable_id'   => $payment->id,
                    'transactionable_type' => VendorPayment::class,
                ]);

            } else {
                $advanceBalance = AdvanceBalance::where('user_id', $payment->advance_user_id)->first();
                $advanceBalance?->decrement('total_used', $payment->pay_amount);

                $settledBack = $payment->pay_amount;
                $advances = Advance::where('user_id', $payment->advance_user_id)
                            ->where('settled_amount', '>', 0)
                            ->orderBy('date', 'desc')->get();

                foreach ($advances as $adv) {
                    if ($settledBack <= 0) break;
                    $undo = min($settledBack, $adv->settled_amount);
                    $adv->settled_amount -= $undo;
                    $adv->status = 'unsettled';
                    $adv->save();
                    $settledBack -= $undo;
                }
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
        $vendor->delete();

        return redirect()->back();
    }
}
