<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Vendor;
use App\Models\VendorLedger;
use App\Models\AdvanceBalance;
use App\Models\Advance;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ProjectExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = ProjectExpense::with(['project.client', 'category', 'account', 'vendor', 'advanceUser']);

        // 🟢 1. Deep Text Search (Title, Description, Payee, Client, Vendor, Account etc)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('total_bill', 'like', "%{$search}%")
                  ->orWhere('paid_amount', 'like', "%{$search}%")
                  ->orWhere('payee_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('payment_status', 'like', "%{$search}%")
                  ->orWhereHas('vendor', fn ($vq) => $vq->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%"))
                  ->orWhereHas('project', fn ($pq) => $pq->where('title', 'like', "%{$search}%"))
                  ->orWhereHas('project.client', fn ($cq) => $cq->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%"))
                  ->orWhereHas('category', fn ($cq) => $cq->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('account', fn ($aq) => $aq->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('advanceUser', fn ($uq) => $uq->where('name', 'like', "%{$search}%"));
            });
        }

        // 🟢 2. Advanced Dropdown Filters
        if ($request->filled('client_id')) {
            $query->whereHas('project', function ($q) use ($request) {
                $q->where('client_id', $request->client_id);
            });
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        // 🟢 3. Date Filters
        if ($request->filled('year')) $query->whereYear('date', $request->year);
        if ($request->filled('date_from')) $query->whereDate('date', '>=', $request->date_from);
        if ($request->filled('date_to')) $query->whereDate('date', '<=', $request->date_to);

        $totals = [
            'total_bill'  => (float) (clone $query)->sum('total_bill'),
            'paid_amount' => (float) (clone $query)->sum('paid_amount'),
            'due_amount'  => (float) (clone $query)->sum('due_amount'),
        ];

        $perPage = \App\Support\Pagination::perPage($request, $query);
        $project_expenses = $query->orderByDesc('date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        $projects = Project::with('client:id,name,company_name')->select('id', 'title', 'client_id', 'status')->orderByDesc('id')->get();
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name')->orderBy('name')->get();

        return Inertia::render('Admin/ProjectExpenses/Index', compact('project_expenses', 'projects', 'categories', 'vendors', 'totals') + [
            'filters' => $request->only(['search', 'client_id', 'project_id', 'vendor_id', 'per_page', 'year', 'date_from', 'date_to']),
        ]);
    }

    public function create()
    {
        $projects = Project::with('client:id,name,company_name')->select('id', 'title', 'client_id', 'status')->orderByDesc('id')->get();
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name', 'wallet_balance')->get();

        $advances = AdvanceBalance::with('user:id,name')->get()->filter(fn ($b) => $b->balance > 0.009)->values()
            ->map(fn ($b) => ['user_id' => $b->user_id, 'user' => $b->user, 'balance' => round($b->balance, 2)]);

        return Inertia::render('Admin/ProjectExpenses/Create', compact('projects', 'categories', 'accounts', 'vendors', 'advances'));
    }

    public function store(Request $request)
    {
        $validated = $this->validateData($request);

        try {
            DB::transaction(function () use ($validated, $request) {
                $this->processExpensePayment($validated, $request);
            });
            return redirect()->route('admin.project-expenses.index')->with('success', 'Expense logged successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function edit(string $id)
    {
        $expense = ProjectExpense::findOrFail($id);
        $projects = Project::with('client:id,name,company_name')->select('id', 'title', 'client_id', 'status')->orderByDesc('id')->get();
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name', 'wallet_balance')->get();

        $advances = AdvanceBalance::with('user:id,name')->get()->filter(fn ($b) => $b->balance > 0.009)->values()
            ->map(fn ($b) => ['user_id' => $b->user_id, 'user' => $b->user, 'balance' => round($b->balance, 2)]);

        $walletEntries = $expense->vendor_id ? VendorLedger::where('vendor_id', $expense->vendor_id)->where('description', 'like', "%expense #{$expense->id}:%")->get() : collect();
        $vendors->each(function ($vendor) use ($expense, $walletEntries) {
            if ($vendor->id == $expense->vendor_id) $vendor->wallet_balance += $walletEntries->where('type', 'debit')->sum('amount') - $walletEntries->where('type', 'credit')->sum('amount');
        });
        $restore = (float) ($expense->advance_amount ?? 0);
        if ($expense->advance_user_id && $restore > 0) {
            $advances = AdvanceBalance::with('user:id,name')->get()->map(fn ($b) => ['user_id' => $b->user_id, 'user' => $b->user, 'balance' => round($b->balance + ($b->user_id == $expense->advance_user_id ? $restore : 0), 2)])->filter(fn ($b) => $b['balance'] > 0)->values();
        }
        $expense->paid_amount = $expense->payment_amount ?? $expense->paid_amount;
        return Inertia::render('Admin/ProjectExpenses/Edit', compact('expense', 'projects', 'categories', 'accounts', 'vendors', 'advances'));
    }

    public function update(Request $request, string $id)
    {
        $expense = ProjectExpense::findOrFail($id);
        $validated = $this->validateData($request);

        try {
            DB::transaction(function () use ($expense, $validated, $request) {
                $expense = ProjectExpense::whereKey($expense->id)->lockForUpdate()->firstOrFail();
                // Refund the old amounts completely before processing new ones
                $this->refundToSource($expense, (float) $expense->paid_amount);

                // Process as new payment
                $this->processExpensePayment($validated, $request, $expense);
            });
            return redirect()->route('admin.project-expenses.index')->with('success', 'Expense updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy(string $id)
    {
        $expense = ProjectExpense::findOrFail($id);
        try {
            DB::transaction(function () use ($expense) {
                $expense = ProjectExpense::whereKey($expense->id)->lockForUpdate()->firstOrFail();
                $this->refundToSource($expense, (float) $expense->paid_amount);
                $expense->delete();
            });
            return redirect()->back()->with('success', 'Expense deleted and balance restored.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function moveToWallet(string $id)
    {
        try {
            DB::transaction(function () use ($id) {
                $expense = ProjectExpense::whereKey($id)->lockForUpdate()->firstOrFail();
                if (!$expense->vendor_id || $expense->paid_amount <= 0) throw new \Exception('A vendor and a paid amount are required.');
                if (\App\Models\VendorPaymentDetail::where('project_expense_id', $expense->id)->whereHas('payment', fn ($q) => $q->where('status', 'completed'))->exists()) throw new \Exception('Void linked vendor payments before moving this expense.');
                $vendor = Vendor::whereKey($expense->vendor_id)->lockForUpdate()->firstOrFail();
                $vendor->increment('wallet_balance', $expense->paid_amount);
                $ledger = VendorLedger::create([
                    'vendor_id' => $vendor->id, 'type' => 'credit', 'amount' => $expense->paid_amount,
                    'date' => $expense->date, 'description' => "Converted expense #{$expense->id} to vendor advance: {$expense->title}",
                ]);
                // The money has already left the funding account/employee. Reclassify it without withdrawing again.
                Transaction::where('transactionable_type', $expense->getMorphClass())->where('transactionable_id', $expense->id)
                    ->update(['transactionable_type' => $vendor->getMorphClass(), 'transactionable_id' => $vendor->id]);
                \App\Models\AdvanceSettlement::where('settleable_type', $expense->getMorphClass())->where('settleable_id', $expense->id)
                    ->update(['settleable_type' => $ledger->getMorphClass(), 'settleable_id' => $ledger->id]);
                $expense->delete();
            });
            return back()->with('success', 'Expense converted to vendor advance.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // 🟢 CORE LOGIC: Auto Split between Wallet and Cash
    private function processExpensePayment($validated, $request, $expenseModel = null)
    {
        $bill = (float) ($validated['total_bill'] ?? 0);
        $totalPaid = (float) ($validated['paid_amount'] ?? 0);
        $vendorId = $validated['vendor_id'] ?? null;
        $validated['pay_type'] = $validated['pay_type'] ?? 'account';
        $charge = round((float) ($validated['bank_charge'] ?? 0), 2);
        if ($charge > 0 && ($totalPaid <= 0 || ($validated['pay_type'] ?? 'account') !== 'account')) throw new \Exception('Bank charge requires a payment from an account.');

        $vendor = $vendorId ? Vendor::whereKey($vendorId)->lockForUpdate()->firstOrFail() : null;
        $vendorWallet = $vendor ? (float) $vendor->wallet_balance : 0;

        $actualExpensePaid = min($totalPaid, $bill);
        $overpayment = max($totalPaid - $bill, 0);

        // Calculate splits
        $walletDeduction = min($actualExpensePaid, $vendorWallet);
        $cashDeduction = $totalPaid - $walletDeduction; // Remaining to be paid via Bank/Advance

        // Validate Cash Deduction
        if ($cashDeduction + $charge > 0) {
            $payType = $validated['pay_type'] ?? 'account';
            if ($payType === 'account' && empty($validated['account_id'])) throw new \Exception('Please select a Bank/Cash Account.');
            if ($payType === 'advance' && empty($validated['advance_user_id'])) throw new \Exception('Please select an Advance User.');
        } else {
            $validated['pay_type'] = null;
            $validated['account_id'] = null;
            $validated['advance_user_id'] = null;
        }

        if (($validated['pay_type'] ?? null) === 'account') $validated['advance_user_id'] = null;
        if (($validated['pay_type'] ?? null) === 'advance') $validated['account_id'] = null;
        if ($overpayment > 0 && !$vendor && empty($validated['return_account_id'])) throw new \Exception('Select a return account for the excess payment.');
        if (($validated['pay_type'] ?? null) === 'wallet' && $cashDeduction > 0) throw new \Exception('Vendor wallet cannot cover this payment.');

        $insertData = collect($validated)->except(['pay_type', 'return_account_id'])->toArray();
        $dataToSave = [
            ...$insertData,
            'paid_amount'    => $actualExpensePaid,
            'payment_amount' => $totalPaid,
            'advance_amount' => ($validated['pay_type'] ?? null) === 'advance' ? $cashDeduction : 0,
            'bank_charge' => $charge,
            'payee_name' => $validated['payee_name'] ?? $vendor?->name,
            'due_amount'     => round($bill - $actualExpensePaid, 2),
            'payment_status' => $this->resolveStatus($bill, $actualExpensePaid),
            'logged_by'      => auth()->id() ?? 1,
        ];

        if ($expenseModel) {
            $expenseModel->update($dataToSave);
            $expense = $expenseModel;
        } else {
            $expense = ProjectExpense::create($dataToSave);
        }

        // 1. Deduct from Vendor Wallet
        if ($walletDeduction > 0) {
            $vendor->decrement('wallet_balance', $walletDeduction);
            VendorLedger::create([
                'vendor_id' => $vendor->id,
                'type' => 'debit',
                'amount' => $walletDeduction,
                'description' => "Paid for expense #{$expense->id}: {$expense->title}"
            ]);
        }

        // 2. Deduct from Cash/Advance
        if ($cashDeduction > 0) {
            $payType = $validated['pay_type'];
            if ($payType === 'account') {
                $account = Account::whereKey($validated['account_id'])->lockForUpdate()->firstOrFail();
                if ($account->current_balance < $cashDeduction + $charge) throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');

                $account->decrement('current_balance', $cashDeduction + $charge);
                Transaction::create([
                    'account_id'       => $account->id,
                    'type'             => 'debit',
                    'amount'           => $cashDeduction + $charge,
                    'bank_charge' => $charge,
                    'transaction_date' => $validated['date'],
                    'description'      => "Project Expense: {$expense->title}",
                    'transactionable_id' => $expense->id,
                    'transactionable_type' => get_class($expense)
                ]);
            } else {
                app(\App\Services\AdvanceSettlementService::class)->consume($expense, $validated['advance_user_id'], $cashDeduction);
            }
        }

        // 3. Handle Overpayment (Excess Cash returns to Wallet or Bank)
        if ($overpayment > 0) {
            if ($vendor) {
                $vendor->increment('wallet_balance', $overpayment);
                VendorLedger::create([
                    'vendor_id' => $vendor->id,
                    'type' => 'credit',
                    'amount' => $overpayment,
                    'description' => "Advance from overpaid expense #{$expense->id}: {$expense->title}"
                ]);
            } elseif ($request->filled('return_account_id')) {
                $returnAccount = Account::findOrFail($request->return_account_id);
                $returnAccount->increment('current_balance', $overpayment);
                Transaction::create([
                    'account_id'       => $returnAccount->id,
                    'type'             => 'credit',
                    'amount'           => $overpayment,
                    'transaction_date' => $validated['date'],
                    'description'      => "Overpayment returned to cash for expense #{$expense->id}: {$expense->title}",
                    'transactionable_id' => $expense->id,
                    'transactionable_type' => get_class($expense)
                ]);
            }
        }
    }

    // 🟢 CORE LOGIC: Reverse Split Payments Accurately
    private function refundToSource(ProjectExpense $expense, float $oldTotalPaid): void
    {
        if (\App\Models\VendorPaymentDetail::where('project_expense_id', $expense->id)->whereHas('payment', fn ($q) => $q->where('status', 'completed'))->exists()) throw new \Exception('Void linked vendor payments before editing or deleting this expense.');

        // 1. Revert Bank Transactions
        $bankTransaction = Transaction::where('transactionable_id', $expense->id)->where('transactionable_type', get_class($expense))->where('type', 'debit')->first();
        $bankAmount = $bankTransaction ? (float) $bankTransaction->amount : 0;

        if ($bankAmount > 0) {
            Account::where('id', $bankTransaction->account_id)->increment('current_balance', $bankAmount);
            $bankTransaction->delete();
        }

        // 2. Revert Overpayment Returns
        $overpaymentTransaction = Transaction::where('transactionable_id', $expense->id)->where('transactionable_type', get_class($expense))->where('type', 'credit')->first();
        if ($overpaymentTransaction) {
            Account::where('id', $overpaymentTransaction->account_id)->decrement('current_balance', $overpaymentTransaction->amount);
            $overpaymentTransaction->delete();
        }

        // 3. Revert Vendor Wallet
        $walletDeducted = 0;
        if ($expense->vendor_id) {
            $ledgers = VendorLedger::where('vendor_id', $expense->vendor_id)->where('description', 'like', "%expense #{$expense->id}:%")->get();
            $walletOverpaid = 0;

            foreach ($ledgers as $ledger) {
                if ($ledger->type === 'debit') $walletDeducted += $ledger->amount;
                if ($ledger->type === 'credit') $walletOverpaid += $ledger->amount;
                $ledger->delete();
            }

            $vendor = Vendor::find($expense->vendor_id);
            if ($vendor) {
                if ($walletDeducted > 0) $vendor->increment('wallet_balance', $walletDeducted);
                if ($vendor->wallet_balance < $walletOverpaid) throw new \Exception('The overpaid vendor advance has already been used.');
                if ($walletOverpaid > 0) $vendor->decrement('wallet_balance', $walletOverpaid);
            }
        }

        // 4. Revert Employee Advance
        $advanceAmount = $expense->advance_amount ?? ($oldTotalPaid - $bankAmount - $walletDeducted);
        if (app(\App\Services\AdvanceSettlementService::class)->refund($expense)) return;
        if ($advanceAmount > 0 && $expense->advance_user_id) {
            $this->refundAdvance($expense->advance_user_id, $advanceAmount);
        }
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'project_id'          => 'required|exists:projects,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id'          => 'nullable|exists:accounts,id',
            'advance_user_id'     => 'nullable|exists:users,id',
            'title'               => 'required|string|max:255',
            'vendor_id'           => 'nullable|exists:vendors,id',
            'payee_name' => 'nullable|string|max:255',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'total_bill'          => 'required|numeric|decimal:0,2|min:0',
            'paid_amount'         => 'nullable|numeric|decimal:0,2|min:0',
            'date'                => 'required|date',
            'description'         => 'nullable|string',
            'pay_type'            => 'nullable|in:account,advance,wallet',
            'return_account_id'   => 'nullable|exists:accounts,id',
        ]);
    }

    private function resolveStatus($bill, $paid): string
    {
        if ($bill > 0 && $paid >= $bill) return 'paid';
        if ($paid > 0 && $paid < $bill) return 'partial';
        return 'due';
    }

    private function refundAdvance(int $userId, float $amount): void
    {
        $remaining = $amount;
        $advanceRecords = Advance::where('user_id', $userId)->where('settled_amount', '>', 0)->orderByDesc('date')->lockForUpdate()->get();

        foreach ($advanceRecords as $advance) {
            if ($remaining <= 0) break;
            $reserved = \App\Models\AdvanceSettlement::where('advance_id', $advance->id)->sum('amount');
            $refundable = min(max($advance->settled_amount - $reserved, 0), $remaining);
            $advance->settled_amount -= $refundable;

            if ($advance->status === 'settled' && ($advance->settled_amount + $advance->returned_amount) < $advance->amount) {
                $advance->status = 'unsettled';
            }
            $advance->save();
            $remaining -= $refundable;
        }

        if ($remaining > 0.009) throw new \Exception('Advance history cannot be safely reversed.');
        $actuallyRefunded = $amount - max($remaining, 0);
        if ($actuallyRefunded > 0) AdvanceBalance::where('user_id', $userId)->decrement('total_used', $actuallyRefunded);
    }
}
