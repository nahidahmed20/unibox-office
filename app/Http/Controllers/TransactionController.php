<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with('account');

        // Search logic
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhereHas('account', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
        }

        $transactions = $query->latest('transaction_date')->latest('id')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();

        return Inertia::render('Admin/Transactions/Index', compact('transactions', 'accounts'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id'        => 'required|exists:accounts,id',
            'type'              => 'required|in:credit,debit',
            'amount'            => 'required|numeric|min:0.01',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated, $request) {
            Transaction::create($validated);
            $account = Account::findOrFail($request->account_id);
            
            if ($request->type === 'credit') {
                $account->increment('current_balance', $request->amount);
            } else {
                $account->decrement('current_balance', $request->amount);
            }
        });

        return back()->with('success', 'Transaction saved successfully and balance updated.');
    }

    public function update(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);
        if ($transaction->transactionable_id !== null) {
            return back()->withErrors(['error' => 'Auto-generated transactions cannot be modified directly. Please edit the source (e.g. Expense/Bill).']);
        }

        $validated = $request->validate([
            'account_id'        => 'required|exists:accounts,id',
            'type'              => 'required|in:credit,debit',
            'amount'            => 'required|numeric|min:0.01',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated, $request, $transaction) {
            
            $oldAccount = Account::find($transaction->account_id);
            if ($oldAccount) {
                if ($transaction->type === 'credit') {
                    $oldAccount->decrement('current_balance', $transaction->amount);
                } else {
                    $oldAccount->increment('current_balance', $transaction->amount);
                }
            }

            $newAccount = Account::find($request->account_id);
            if ($newAccount) {
                if ($request->type === 'credit') {
                    $newAccount->increment('current_balance', $request->amount);
                } else {
                    $newAccount->decrement('current_balance', $request->amount);
                }
            }

            $transaction->update($validated);
        });

        return back()->with('success', 'Transaction updated successfully.');
    }

    public function destroy($id)
    {
        $transaction = Transaction::findOrFail($id);
        if ($transaction->transactionable_id !== null) {
            return back()->withErrors(['error' => 'Auto-generated transactions cannot be deleted directly. Please delete the source (e.g. Expense/Bill).']);
        }

        DB::transaction(function () use ($transaction) {
            $account = Account::find($transaction->account_id);
            if ($account) {
                if ($transaction->type === 'credit') {
                    $account->decrement('current_balance', $transaction->amount);
                } else {
                    $account->increment('current_balance', $transaction->amount);
                }
            }

            $transaction->delete();
        });

        return back()->with('success', 'Transaction deleted and account balance restored.');
    }
}