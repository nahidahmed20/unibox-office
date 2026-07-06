<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AccountController extends Controller
{
    
    public function index(Request $request)
    {
        $query = Account::query();

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                ->orWhere('account_number', 'like', "%{$search}%")
                ->orWhere('type', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 10);

        $accounts = $query
            ->latest()
            ->paginate($perPage);
        $totalBalance = Account::sum('current_balance');

        return Inertia::render('Admin/Accounts/Index', [
            'accounts' => $accounts,
            'totalBalance' => $totalBalance,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:cash,bank,mobile_banking',
            'account_number' => 'nullable|string|max:100',
            'opening_balance' => 'nullable|numeric|min:0',
            'is_active' => 'required|boolean',
        ]);

        $openingBalance = $request->opening_balance ?? 0;
        $validated['opening_balance'] = $openingBalance;
        $validated['current_balance'] = $openingBalance;

        DB::transaction(function () use ($validated, $openingBalance) {
            $account = Account::create($validated);

            if ($openingBalance > 0) {
                Transaction::create([
                    'account_id' => $account->id,
                    'type' => 'credit',
                    'amount' => $openingBalance,
                    'transaction_date' => now()->toDateString(),
                    'description' => 'Opening Balance',
                ]);
            }
        });

        return back()->with('success', 'Account created successfully.');
    }

    public function update(Request $request, $id)
    {
        $account = Account::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:cash,bank,mobile_banking',
            'account_number' => 'nullable|string|max:100',
            'is_active' => 'required|boolean',
        ]);

        $account->update($validated);

        return back()->with('success', 'Account updated successfully.');
    }

    public function destroy($id)
    {
        $account = Account::findOrFail($id);

        $transactionsCount = Transaction::where('account_id', $account->id)->count();

        if ($transactionsCount > 1) { // 1 means opening balance transaction
            return back()->withErrors(['error' => 'Cannot delete account because it has active transactions.']);
        }

        DB::transaction(function () use ($account) {
            Transaction::where('account_id', $account->id)->delete();
            $account->delete();
        });

        return back()->with('success', 'Account deleted successfully.');
    }
}