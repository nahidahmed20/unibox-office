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
                  ->orWhere('amount', 'like', "%{$searchTerm}%")
                  ->orWhere('type', 'like', "%{$searchTerm}%")
                  ->orWhereHas('account', function ($aq) use ($searchTerm) {
                      $aq->where('name', 'like', "%{$searchTerm}%");
                  });
            });
        }

        // 🟢 Advanced Filters
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        // 🟢 Top Summary Calculations
        $totalCredit = (clone $query)->where('type', 'credit')->sum('amount');
        $totalDebit  = (clone $query)->where('type', 'debit')->sum('amount');
        $netBalance  = $totalCredit - $totalDebit;

        $totalCount = $query->count();
        if ($request->input('per_page') === 'all') {
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
        }

        $transactions = $query
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        // 🟢 MAGIC: Eager Load Morph Relations to identify the exact person/vendor
        try {
            $transactions->getCollection()->loadMorph('transactionable', [
                \App\Models\Advance::class => ['user'],
                \App\Models\ClientAdvance::class => ['client'],
                \App\Models\VendorPayment::class => ['vendor'],
                \App\Models\ProjectExpense::class => ['vendor', 'project'],
                \App\Models\Vendor::class => [],
            ]);
        } catch (\Exception $e) {}

        // 🟢 Transform Data for Frontend
        $transactions->getCollection()->transform(function ($trx) {
            $trx->party_name = null;
            $trx->party_type = null;
            $trx->context_label = 'Manual Entry';

            if ($trx->transactionable) {
                $type = class_basename($trx->transactionable_type);
                switch ($type) {
                    case 'Advance':
                        $trx->party_name = $trx->transactionable->user->name ?? 'Unknown Employee';
                        $trx->party_type = 'Employee';
                        $trx->context_label = 'Staff Advance';
                        break;
                    case 'ClientAdvance':
                        $trx->party_name = $trx->transactionable->client->name ?? 'Unknown Client';
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Client Advance';
                        break;
                    case 'VendorPayment':
                        $trx->party_name = $trx->transactionable->vendor->name ?? 'Unknown Vendor';
                        $trx->party_type = 'Vendor';
                        $trx->context_label = 'Vendor Bill Payment';
                        break;
                    case 'ProjectExpense':
                        $trx->party_name = $trx->transactionable->payee_name ?: ($trx->transactionable->vendor->name ?? 'Payee not recorded');
                        $trx->party_type = $trx->transactionable->vendor_id ? 'Vendor' : 'Payee';
                        $trx->context_label = 'Project Expense';
                        break;
                    case 'Vendor':
                        $trx->party_name = $trx->transactionable->name ?? 'Unknown Vendor';
                        $trx->party_type = 'Vendor';
                        $trx->context_label = 'Vendor Wallet Trx';
                        break;
                    case 'InvoicePayment':
                        $trx->party_name = 'Client Payment';
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Invoice Payment';
                        break;
                    default:
                        $trx->context_label = $type;
                        break;
                }
            }

            return $trx;
        });

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Transactions/Index', [
            'transactions' => $transactions,
            'accounts' => $accounts,
            'totalCredit' => $totalCredit,
            'totalDebit' => $totalDebit,
            'netBalance' => $netBalance,
            'filters' => $request->only('search', 'per_page', 'account_id', 'type', 'date_from', 'date_to'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id'        => 'required|exists:accounts,id',
            'type'              => 'required|in:credit,debit',
            'amount'            => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $validated['bank_charge'] = round((float) ($validated['bank_charge'] ?? 0), 2);
        if ($validated['type'] !== 'debit' && $validated['bank_charge'] > 0) throw \Illuminate\Validation\ValidationException::withMessages(['bank_charge' => 'Bank charge is available for outgoing payments.']);
        $validated['amount'] = round($validated['amount'] + $validated['bank_charge'], 2);

        DB::transaction(function () use ($validated, $request) {
            Transaction::create($validated);
            $account = Account::findOrFail($request->account_id);

            if ($request->type === 'credit') {
                $account->increment('current_balance', $validated['amount']);
            } else {
                if ($account->current_balance < $validated['amount']) {
                    throw new \Exception("Insufficient balance in the account!");
                }
                $account->decrement('current_balance', $validated['amount']);
            }
        });

        return back()->with('success', 'Transaction saved successfully and balance updated.');
    }

    // 🟢 UPDATED: Transfer fund with separated bank charge logging
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_account_id'   => 'required|exists:accounts,id|different:to_account_id',
            'to_account_id'     => 'required|exists:accounts,id',
            'amount'            => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge'       => 'nullable|numeric|decimal:0,2|min:0',
            'transaction_date'  => 'required|date',
            'description'       => 'nullable|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated) {
            $fromAccount = Account::whereKey($validated['from_account_id'])->lockForUpdate()->firstOrFail();
            $toAccount = Account::whereKey($validated['to_account_id'])->lockForUpdate()->firstOrFail();

            $charge = (float) ($validated['bank_charge'] ?? 0);
            $transferAmount = round((float) $validated['amount'], 2);
            $totalDebit = round($transferAmount + $charge, 2);

            if ($fromAccount->current_balance < $totalDebit) {
                throw new \Exception("Source account does not have sufficient balance!");
            }

            $desc = ($validated['description'] ?? '') ?: "Fund transfer from {$fromAccount->name} to {$toAccount->name}";
            $ref = $validated['reference_number'] ?? null;

            // ১. সোর্স অ্যাকাউন্ট থেকে টাকা কেটে নেওয়া
            $fromAccount->decrement('current_balance', $totalDebit);

            // ২. সোর্স থেকে মূল টাকার Out Transaction
            Transaction::create([
                'account_id'       => $fromAccount->id,
                'type'             => 'debit',
                'amount'           => $transferAmount,
                'bank_charge'      => 0,
                'transaction_date' => $validated['transaction_date'],
                'description'      => $desc . " (Out)",
                'reference_number' => $ref,
            ]);

            // ৩. যদি ব্যাংক চার্জ থাকে তবে তার জন্য আলাদা Out Transaction
            if ($charge > 0) {
                Transaction::create([
                    'account_id'       => $fromAccount->id,
                    'type'             => 'debit',
                    'amount'           => $charge,
                    'bank_charge'      => $charge,
                    'transaction_date' => $validated['transaction_date'],
                    'description'      => "Bank Charge: " . $desc,
                    'reference_number' => $ref,
                ]);
            }

            // ৪. ডেস্টিনেশন অ্যাকাউন্টে মূল টাকার In Transaction
            $toAccount->increment('current_balance', $transferAmount);
            Transaction::create([
                'account_id'       => $toAccount->id,
                'type'             => 'credit',
                'amount'           => $transferAmount,
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
            'amount'            => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge' => 'nullable|numeric|decimal:0,2|min:0',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $validated['bank_charge'] = round((float) ($validated['bank_charge'] ?? 0), 2);
        if ($validated['type'] !== 'debit' && $validated['bank_charge'] > 0) throw \Illuminate\Validation\ValidationException::withMessages(['bank_charge' => 'Bank charge is available for outgoing payments.']);
        $validated['amount'] = round($validated['amount'] + $validated['bank_charge'], 2);

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
                    $newAccount->increment('current_balance', $validated['amount']);
                } else {
                    if ($newAccount->current_balance < $validated['amount']) throw \Illuminate\Validation\ValidationException::withMessages(['amount' => 'Insufficient account balance, including bank charge.']);
                    $newAccount->decrement('current_balance', $validated['amount']);
                }
            }

            $transaction->update($validated);
        });

        return back()->with('success', 'Transaction updated successfully.');
    }

    // 🟢 UPDATED: Flawless balance restoring on delete
    public function destroy($id)
    {
        $transaction = Transaction::findOrFail($id);

        if ($transaction->transactionable_id !== null) {
            return back()->withErrors(['error' => 'Auto-generated transactions cannot be deleted directly.']);
        }

        try {
            DB::transaction(function () use ($transaction) {
                // lockForUpdate() দিয়ে ব্যালেন্স রিভার্স করা হচ্ছে যেন হিসাব এলোমেলো না হয়
                $account = Account::whereKey($transaction->account_id)->lockForUpdate()->first();

                if ($account) {
                    if ($transaction->type === 'credit') {
                        $account->current_balance -= $transaction->amount;
                    } else {
                        $account->current_balance += $transaction->amount;
                    }
                    $account->save();
                }

                $transaction->delete();
            });

            return back()->with('success', 'Transaction deleted and account balance restored.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to reverse the transaction.']);
        }
    }
}
