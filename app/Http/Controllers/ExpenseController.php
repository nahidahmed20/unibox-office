<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category', 'account', 'logger', 'advance_user']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                ->orWhere('description', 'like', "%{$searchTerm}%")

                ->orWhere('amount', 'like', "%{$searchTerm}%")
                ->orWhere('date', 'like', "%{$searchTerm}%")

                ->orWhereHas('category', function ($cq) use ($searchTerm) {
                    $cq->where('name', 'like', "%{$searchTerm}%");
                })

                ->orWhereHas('account', function ($aq) use ($searchTerm) {
                    $aq->where('name', 'like', "%{$searchTerm}%");
                })

                ->orWhereHas('advance_user', function ($uq) use ($searchTerm) {
                    $uq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Date Filters...
        if ($request->filled('date_filter')) {
            $filter = $request->date_filter;
            if ($filter === 'today') {
                $query->whereDate('date', Carbon::today());
            } elseif ($filter === 'this_week') {
                $query->whereBetween('date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]);
            } elseif ($filter === 'this_month') {
                $query->whereMonth('date', Carbon::now()->month)->whereYear('date', Carbon::now()->year);
            } elseif ($filter === 'this_year') {
                $query->whereYear('date', Carbon::now()->year);
            } elseif ($filter === 'custom' && $request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('date', [
                    $request->start_date . ' 00:00:00',
                    $request->end_date . ' 23:59:59'
                ]);
            }
        }

        $thisMonthTotal = Expense::whereMonth('date', Carbon::now()->month)
                                ->whereYear('date', Carbon::now()->year)
                                ->sum('amount');

        // Filtered total amount
        $totalAmount = (clone $query)->sum('amount');

        $perPage = $request->input('per_page') === 'all' ? max($query->count(), 1) : \App\Support\Pagination::perPage($request, $query);

        $expenses = $query->latest()->paginate($perPage)->withQueryString();
        $expenses = $query->orderBy('date', 'desc')->latest('id')->paginate($perPage)->withQueryString();

        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->orderBy('name')->get();

        $advances = AdvanceBalance::with('user:id,name')
            ->get()
            ->filter(fn ($b) => $b->balance > 0.009)
            ->sortBy(fn ($b) => $b->user->name ?? '')
            ->values()
            ->map(fn ($b) => [
                'user_id' => $b->user_id,
                'user'    => $b->user,
                'balance' => round($b->balance, 2),
            ]);

        return Inertia::render('Admin/Expenses/Index', compact('expenses', 'totalAmount', 'thisMonthTotal', 'categories', 'accounts', 'advances') + [
            'filters' => $request->only('search', 'per_page', 'date_filter', 'start_date', 'end_date'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateData($request);

        if ($error = $this->validateSource($validated)) {
            return back()->withErrors(['error' => $error]);
        }

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses', 'public');
        }

        try {
            DB::transaction(function () use ($validated) {
                $insertData = collect($validated)->except(['pay_type'])->toArray();
                if ($validated['pay_type'] === 'account') $insertData['advance_user_id'] = null;
                if ($validated['pay_type'] === 'advance') $insertData['account_id'] = null;
                $insertData['logged_by'] = auth()->id() ?? 1;

                $expense = Expense::create($insertData);
                $this->deductFromSource($validated, (float) $validated['amount'], $expense);
            });

            return back()->with('success', 'Expense logged successfully.');
        } catch (\Exception $e) {
            if (isset($validated['attachment'])) Storage::disk('public')->delete($validated['attachment']);
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        $validated = $this->validateData($request);

        if ($error = $this->validateSource($validated)) return back()->withErrors(['error' => $error]);

        $oldAttachment = $expense->attachment;
        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses', 'public');
        }

        try {
            DB::transaction(function () use ($validated, $expense) {
                $this->refundToSource($expense, (float) $expense->amount);

                $updateData = collect($validated)->except(['pay_type'])->toArray();
                if ($validated['pay_type'] === 'account') $updateData['advance_user_id'] = null;
                if ($validated['pay_type'] === 'advance') $updateData['account_id'] = null;

                $expense->update($updateData);
                $this->deductFromSource($validated, (float) $validated['amount'], $expense);
            });

            if (isset($validated['attachment']) && $oldAttachment) Storage::disk('public')->delete($oldAttachment);

            return back()->with('success', 'Expense updated successfully.');
        } catch (\Exception $e) {
            if (isset($validated['attachment'])) Storage::disk('public')->delete($validated['attachment']);
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);

        try {
            DB::transaction(function () use ($expense) {
                $this->refundToSource($expense, (float) $expense->amount);
                if ($expense->attachment) Storage::disk('public')->delete($expense->attachment);
                $expense->delete();
            });

            return back()->with('success', 'Expense deleted and amount restored.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // ==========================================
    // Unified Validation & Logic Methods
    // ==========================================

    private function validateData(Request $request): array
    {
        return $request->validate([
            'title'               => 'required|string|max:255',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id'          => 'nullable|exists:accounts,id',
            'advance_user_id'     => 'nullable|exists:users,id', // 🟢 Using User ID like Project Expenses
            'amount'              => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'date'                => 'required|date',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'pay_type'            => 'required|in:account,advance',
        ]);
    }

    private function validateSource(array $validated): ?string
    {
        if ($validated['pay_type'] === 'account' && empty($validated['account_id'])) return 'Please select a Bank/Cash Account.';
        if ($validated['pay_type'] === 'advance' && empty($validated['advance_user_id'])) return 'Please select an Advance User.';
        if ($validated['pay_type'] !== 'account' && ($validated['bank_charge'] ?? 0) > 0) return 'Bank charge requires an account payment.';
        return null;
    }

    private function deductFromSource(array $validated, float $amount, Expense $expense): void
    {
        if ($validated['pay_type'] === 'account') {
            $charge = round((float) ($validated['bank_charge'] ?? 0), 2);
            $amount = round($amount + $charge, 2);
            $account = Account::whereKey($validated['account_id'])->lockForUpdate()->firstOrFail();
            if ($account->current_balance < $amount) throw new \Exception('Insufficient Account Balance');
            $account->decrement('current_balance', $amount);

            $expense->transaction()->create([
                'account_id'       => $account->id,
                'type'             => 'debit',
                'amount'           => $amount,
                'bank_charge' => $charge,
                'transaction_date' => $validated['date'],
                'description'      => 'Office Expense: ' . $validated['title'],
            ]);
        } elseif ($validated['pay_type'] === 'advance') {
            app(\App\Services\AdvanceSettlementService::class)->consume($expense, $validated['advance_user_id'], $amount);
        }
    }

    private function refundToSource(Expense $expense, float $amount): void
    {
        if ($amount <= 0) return;

        if ($expense->account_id) {
            Account::where('id', $expense->account_id)->increment('current_balance', $amount + (float) ($expense->bank_charge ?? 0));
            if ($expense->transaction) $expense->transaction()->delete();
        } elseif ($expense->advance_user_id) {
            if (!app(\App\Services\AdvanceSettlementService::class)->refund($expense)) $this->refundAdvance($expense->advance_user_id, $amount);
        }
    }

    // 🟢 FIXED: Imported consumeAdvance from ProjectExpenseController
    // 🟢 FIXED: Imported refundAdvance from ProjectExpenseController
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
        if ($actuallyRefunded > 0) {
            AdvanceBalance::where('user_id', $userId)->decrement('total_used', $actuallyRefunded);
        }
    }
}
