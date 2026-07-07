<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category', 'account', 'logger']);

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                ->orWhereHas('category', function ($cq) use ($searchTerm) {
                    $cq->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('account', function ($aq) use ($searchTerm) {
                    $aq->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('logger', function ($lq) use ($searchTerm) {
                    $lq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $expenses = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        // Dropdown Data
        $categories = ExpenseCategory::select('id', 'name')
            ->orderBy('name')
            ->get();

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Expenses/Index', [
            'expenses' => $expenses,
            'categories' => $categories,
            'accounts' => $accounts,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses', 'public');
        }

        $validated['user_id'] = auth()->id();

        DB::transaction(function () use ($validated, $request) {
            $expense = Expense::create($validated);

            $account = Account::findOrFail($request->account_id);
            $account->decrement('current_balance', $request->amount);

            $expense->transaction()->create([
                'account_id' => $account->id,
                'type' => 'debit',
                'amount' => $request->amount,
                'transaction_date' => $request->date,
                'description' => 'Office Expense: ' . $request->title,
            ]);
        });

        return back()->with('success', 'Expense logged successfully.');
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $request, $expense) {
            if ($expense->account_id != $request->account_id || $expense->amount != $request->amount) {
                
                $oldAccount = Account::find($expense->account_id);
                $oldAccount->increment('current_balance', $expense->amount);

                $newAccount = Account::find($request->account_id);
                $newAccount->decrement('current_balance', $request->amount);

                $expense->transaction()->update([
                    'account_id' => $request->account_id,
                    'amount' => $request->amount,
                    'transaction_date' => $request->date,
                ]);
            }

            $expense->update($validated);
        });

        return back()->with('success', 'Expense updated successfully.');
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);

        DB::transaction(function () use ($expense) {
            $account = Account::find($expense->account_id);
            if ($account) {
                $account->increment('current_balance', $expense->amount);
            }

            $expense->transaction()->delete();

            $expense->delete();
        });

        return back()->with('success', 'Expense deleted and amount restored.');
    }
}