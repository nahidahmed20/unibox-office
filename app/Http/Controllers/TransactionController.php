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
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('description', 'like', "%{$searchTerm}%")
                ->orWhere('reference_number', 'like', "%{$searchTerm}%")
                ->orWhereHas('account', function ($aq) use ($searchTerm) {
                    $aq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 25), 100000); 
        }

        $transactions = $query
            ->latest('transaction_date')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Transactions/Index', [
            'transactions' => $transactions,
            'accounts' => $accounts,
            'filters' => $request->only('search', 'per_page'),
        ]);
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

    // --- NEW: Fund Transfer (Bank <-> Cash) ---
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_account_id'   => 'required|exists:accounts,id|different:to_account_id',
            'to_account_id'     => 'required|exists:accounts,id',
            'amount'            => 'required|numeric|min:0.01',
            'transaction_date'  => 'required|date',
            'description'       => 'nullable|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated) {
            $fromAccount = Account::findOrFail($validated['from_account_id']);
            $toAccount = Account::findOrFail($validated['to_account_id']);

            if ($fromAccount->current_balance < $validated['amount']) {
                throw new \Exception("Source account does not have sufficient balance!");
            }

            $desc = $validated['description'] ?: "Fund transfer from {$fromAccount->name} to {$toAccount->name}";
            $ref = $validated['reference_number'];

            // 1. Debit from source account
            $fromAccount->decrement('current_balance', $validated['amount']);
            Transaction::create([
                'account_id'       => $fromAccount->id,
                'type'             => 'debit',
                'amount'           => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'description'      => $desc . " (Out)",
                'reference_number' => $ref,
            ]);

            // 2. Credit to destination account
            $toAccount->increment('current_balance', $validated['amount']);
            Transaction::create([
                'account_id'       => $toAccount->id,
                'type'             => 'credit',
                'amount'           => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'description'      => $desc . " (In)",
                'reference_number' => $ref,
            ]);
        });

        return back()->with('success', 'Fund transferred successfully between accounts.');
    }

    public function update(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);
        if ($transaction->transactionable_id !== null) {
            return back()->withErrors(['error' => 'Auto-generated transactions cannot be modified directly.']);
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
            return back()->withErrors(['error' => 'Auto-generated transactions cannot be deleted directly.']);
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