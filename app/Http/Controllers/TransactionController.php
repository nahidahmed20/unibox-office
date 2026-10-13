<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Account;
use App\Models\Client;
use App\Models\Vendor;
use App\Models\User;
use App\Models\Project;
use App\Models\ClientAdvance;
use App\Models\VendorPayment;
use App\Models\ProjectExpense;
use App\Models\Expense;
use App\Models\Advance;
use App\Models\Salary;
use App\Models\InvoicePayment;
use App\Models\Investment;
use App\Models\InvestmentPayment;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        // 🟢 শুধুমাত্র টেবিলের নির্দিষ্ট কলাম সিলেক্ট করা হলো
        $query = Transaction::with('account')->select('transactions.*');

        // 🟢 MAGIC: Running Balance Calculation (ঐ লেনদেন পর্যন্ত মোট কত ব্যালেন্স ছিল)
        $query->selectSub(function ($q) {
            $q->selectRaw("SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)")
              ->from('transactions as t2')
              ->whereColumn('t2.account_id', 'transactions.account_id')
              ->where(function ($q2) {
                  // আগের তারিখের সব ট্রানজেকশন যোগ করবে
                  $q2->whereColumn('t2.transaction_date', '<', 'transactions.transaction_date')
                     ->orWhere(function ($q3) {
                         // একই তারিখ হলে ID অনুযায়ী হিসাব করবে
                         $q3->whereColumn('t2.transaction_date', '=', 'transactions.transaction_date')
                            ->whereColumn('t2.id', '<=', 'transactions.id');
                     });
              });
        }, 'running_balance');

        // 🟢 1. Universal Multi-Entity Search
        if ($request->filled('search')) {
            $searchTerm = trim($request->search);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('transactions.description', 'like', "%{$searchTerm}%")
                  ->orWhere('transactions.reference_number', 'like', "%{$searchTerm}%")
                  ->orWhere('transactions.amount', 'like', "%{$searchTerm}%")
                  ->orWhere('transactions.type', 'like', "%{$searchTerm}%")
                  ->orWhereHas('account', function ($aq) use ($searchTerm) {
                      $aq->where('name', 'like', "%{$searchTerm}%");
                  })
                  // Client Advance
                  ->orWhereHasMorph('transactionable', [ClientAdvance::class], function ($cq) use ($searchTerm) {
                      $cq->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$searchTerm}%")->orWhere('company_name', 'like', "%{$searchTerm}%"));
                  })
                  // Invoice Payment
                  ->orWhereHasMorph('transactionable', [InvoicePayment::class], function ($ipq) use ($searchTerm) {
                      $ipq->whereHas('invoice', function ($inv) use ($searchTerm) {
                          $inv->where('invoice_number', 'like', "%{$searchTerm}%")
                              ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$searchTerm}%")->orWhere('company_name', 'like', "%{$searchTerm}%"))
                              ->orWhereHas('items.project', fn ($p) => $p->where('title', 'like', "%{$searchTerm}%"));
                      });
                  })
                  // Vendor Bill Payment
                  ->orWhereHasMorph('transactionable', [VendorPayment::class], function ($vpq) use ($searchTerm) {
                      $vpq->whereHas('vendor', fn ($v) => $v->where('name', 'like', "%{$searchTerm}%")->orWhere('company_name', 'like', "%{$searchTerm}%"));
                  })
                  // Direct Vendor Advance / Refund
                  ->orWhereHasMorph('transactionable', [Vendor::class], function ($vq) use ($searchTerm) {
                      $vq->where('name', 'like', "%{$searchTerm}%")->orWhere('company_name', 'like', "%{$searchTerm}%");
                  })
                  // Project Expense
                  ->orWhereHasMorph('transactionable', [ProjectExpense::class], function ($peq) use ($searchTerm) {
                      $peq->where('payee_name', 'like', "%{$searchTerm}%")
                          ->orWhereHas('vendor', fn ($v) => $v->where('name', 'like', "%{$searchTerm}%")->orWhere('company_name', 'like', "%{$searchTerm}%"))
                          ->orWhereHas('project', fn ($p) => $p->where('title', 'like', "%{$searchTerm}%"))
                          ->orWhereHas('advanceUser', fn ($u) => $u->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // General Office Expense
                  ->orWhereHasMorph('transactionable', [Expense::class], function ($eq) use ($searchTerm) {
                      $eq->where('title', 'like', "%{$searchTerm}%")
                          ->orWhereHas('vendor', fn ($v) => $v->where('name', 'like', "%{$searchTerm}%"))
                          ->orWhereHas('category', fn ($cat) => $cat->where('name', 'like', "%{$searchTerm}%"))
                          ->orWhereHas('advance_user', fn ($u) => $u->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // Staff Advance
                  ->orWhereHasMorph('transactionable', [Advance::class], function ($advq) use ($searchTerm) {
                      $advq->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // Salary / Payroll
                  ->orWhereHasMorph('transactionable', [Salary::class], function ($salq) use ($searchTerm) {
                      $salq->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // Investment
                  ->orWhereHasMorph('transactionable', [Investment::class], function ($invq) use ($searchTerm) {
                      $invq->whereHas('investor', fn ($inv) => $inv->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // Investment Return
                  ->orWhereHasMorph('transactionable', [InvestmentPayment::class], function ($ipq) use ($searchTerm) {
                      $ipq->whereHas('investor', fn ($inv) => $inv->where('name', 'like', "%{$searchTerm}%"));
                  })
                  // Asset Purchase
                  ->orWhereHasMorph('transactionable', [Asset::class], function ($asq) use ($searchTerm) {
                      $asq->where('name', 'like', "%{$searchTerm}%")->orWhere('category', 'like', "%{$searchTerm}%");
                  });
            });
        }

        // 🟢 2. Party Type / Category Filter
        if ($request->filled('party_type') && $request->party_type !== 'all') {
            $pType = $request->party_type;
            if ($pType === 'client') {
                $query->whereIn('transactions.transactionable_type', [ClientAdvance::class, InvoicePayment::class]);
            } elseif ($pType === 'vendor') {
                $query->where(function ($q) {
                    $q->whereIn('transactions.transactionable_type', [VendorPayment::class, Vendor::class])
                      ->orWhere(function ($q2) {
                          $q2->where('transactions.transactionable_type', ProjectExpense::class)->whereNotNull('transactionable_id');
                      })
                      ->orWhere(function ($q3) {
                          $q3->where('transactions.transactionable_type', Expense::class)->whereNotNull('transactionable_id');
                      });
                });
            } elseif ($pType === 'employee') {
                $query->whereIn('transactions.transactionable_type', [Advance::class, Salary::class]);
            } elseif ($pType === 'expense') {
                $query->whereIn('transactions.transactionable_type', [Expense::class, ProjectExpense::class, Asset::class]);
            } elseif ($pType === 'transfer') {
                $query->whereNull('transactions.transactionable_type')
                      ->where('transactions.description', 'like', '%Fund transfer%');
            } elseif ($pType === 'investor') {
                $query->whereIn('transactions.transactionable_type', [Investment::class, InvestmentPayment::class]);
            } elseif ($pType === 'manual') {
                $query->whereNull('transactions.transactionable_type')
                      ->where('transactions.description', 'not like', '%Fund transfer%');
            }
        }

        // 🟢 3. Specific Entity Dropdown Filters
        if ($request->filled('client_id')) {
            $clientId = $request->client_id;
            $query->where(function ($q) use ($clientId) {
                $q->whereHasMorph('transactionable', [ClientAdvance::class], fn ($cq) => $cq->where('client_id', $clientId))
                  ->orWhereHasMorph('transactionable', [InvoicePayment::class], fn ($ipq) => $ipq->whereHas('invoice', fn ($inv) => $inv->where('client_id', $clientId)));
            });
        }

        if ($request->filled('vendor_id')) {
            $vendorId = $request->vendor_id;
            $query->where(function ($q) use ($vendorId) {
                $q->where(function ($vq) use ($vendorId) {
                    $vq->where('transactions.transactionable_type', Vendor::class)
                       ->where('transactions.transactionable_id', $vendorId);
                })
                ->orWhereHasMorph('transactionable', [VendorPayment::class], fn ($vpq) => $vpq->where('vendor_id', $vendorId))
                ->orWhereHasMorph('transactionable', [ProjectExpense::class], fn ($peq) => $peq->where('vendor_id', $vendorId))
                ->orWhereHasMorph('transactionable', [Expense::class], fn ($eq) => $eq->where('vendor_id', $vendorId));
            });
        }

        if ($request->filled('user_id')) {
            $userId = $request->user_id;
            $query->where(function ($q) use ($userId) {
                $q->whereHasMorph('transactionable', [Advance::class], fn ($advq) => $advq->where('user_id', $userId))
                  ->orWhereHasMorph('transactionable', [Salary::class], fn ($salq) => $salq->where('user_id', $userId))
                  ->orWhereHasMorph('transactionable', [ProjectExpense::class], fn ($peq) => $peq->where('advance_user_id', $userId))
                  ->orWhereHasMorph('transactionable', [Expense::class], fn ($eq) => $eq->where('advance_user_id', $userId));
            });
        }

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            $query->where(function ($q) use ($projectId) {
                $q->whereHasMorph('transactionable', [ProjectExpense::class], fn ($peq) => $peq->where('project_id', $projectId))
                  ->orWhereHasMorph('transactionable', [InvoicePayment::class], fn ($ipq) => $ipq->whereHas('invoice.items', fn ($item) => $item->where('project_id', $projectId)));
            });
        }

        // 🟢 4. Standard Account & Type & Date Filters
        if ($request->filled('account_id')) {
            $query->where('transactions.account_id', $request->account_id);
        }
        if ($request->filled('type')) {
            $query->where('transactions.type', $request->type);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('transactions.transaction_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transactions.transaction_date', '<=', $request->date_to);
        }

        // 🟢 Top Summary Calculations
        $totalCredit = (clone $query)->where('transactions.type', 'credit')->sum('transactions.amount');
        $totalDebit  = (clone $query)->where('transactions.type', 'debit')->sum('transactions.amount');
        $netBalance  = $totalCredit - $totalDebit;

        $totalCount = $query->count();
        if ($request->input('per_page') === 'all') {
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
        }

        $transactions = $query
            ->orderByDesc('transactions.transaction_date')
            ->orderByDesc('transactions.id')
            ->paginate($perPage)
            ->withQueryString();

        // 🟢 MAGIC: Eager Load Morph Relations with Clean Sub-Relations
        try {
            $transactions->getCollection()->loadMorph('transactionable', [
                Advance::class => ['user:id,name'],
                ClientAdvance::class => ['client:id,name,company_name'],
                InvoicePayment::class => ['invoice.client:id,name,company_name', 'invoice.items.project:id,title'],
                VendorPayment::class => ['vendor:id,name,company_name'],
                Vendor::class => [],
                ProjectExpense::class => ['vendor:id,name,company_name', 'project:id,title', 'advanceUser:id,name'],
                Expense::class => ['vendor:id,name,company_name', 'category:id,name', 'advance_user:id,name'],
                Salary::class => ['user:id,name'],
                Investment::class => ['investor:id,name'],
                InvestmentPayment::class => ['investor:id,name'],
                Asset::class => ['assignee:id,name'],
            ]);
        } catch (\Exception $e) {}

        // 🟢 Transform Data for Frontend with Crystal Clear Party Identification
        $transactions->getCollection()->transform(function ($trx) {
            $trx->party_name = null;
            $trx->party_company = null;
            $trx->party_type = null;
            $trx->context_label = 'Manual Entry';
            $trx->project_name = null;
            $trx->invoice_number = null;

            if ($trx->transactionable) {
                $type = class_basename($trx->transactionable_type);
                switch ($type) {
                    case 'Advance':
                        $trx->party_name = $trx->transactionable->user->name ?? 'Staff';
                        $trx->party_type = 'Employee';
                        $trx->context_label = 'Staff Advance';
                        break;
                    case 'ClientAdvance':
                        $trx->party_name = $trx->transactionable->client->name ?? 'Client';
                        $trx->party_company = $trx->transactionable->client->company_name ?? null;
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Client Advance';
                        break;
                    case 'InvoicePayment':
                        $client = $trx->transactionable->invoice?->client;
                        $trx->party_name = $client?->name ?? 'Client';
                        $trx->party_company = $client?->company_name ?? null;
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Invoice Payment';
                        $trx->project_name = collect($trx->transactionable->invoice?->items)->map(fn($i) => $i->project?->title)->filter()->unique()->implode(', ') ?: null;
                        $trx->invoice_number = $trx->transactionable->invoice?->invoice_number;
                        break;
                    case 'VendorPayment':
                        $trx->party_name = $trx->transactionable->vendor->name ?? 'Vendor';
                        $trx->party_company = $trx->transactionable->vendor->company_name ?? null;
                        $trx->party_type = 'Vendor';
                        $trx->context_label = 'Vendor Bill Payment';
                        break;
                    case 'Vendor':
                        $trx->party_name = $trx->transactionable->name ?? 'Vendor';
                        $trx->party_company = $trx->transactionable->company_name ?? null;
                        $trx->party_type = 'Vendor';
                        $trx->context_label = $trx->type === 'credit' ? 'Vendor Refund' : 'Vendor Advance';
                        break;
                    case 'ProjectExpense':
                        if ($trx->transactionable->vendor) {
                            $trx->party_name = $trx->transactionable->vendor->name;
                            $trx->party_company = $trx->transactionable->vendor->company_name;
                            $trx->party_type = 'Vendor';
                        } elseif ($trx->transactionable->payee_name) {
                            $trx->party_name = $trx->transactionable->payee_name;
                            $trx->party_type = 'Payee';
                        } else {
                            $trx->party_name = 'Project Expense Payee';
                            $trx->party_type = 'Payee';
                        }
                        $trx->context_label = 'Project Expense';
                        $trx->project_name = $trx->transactionable->project?->title;
                        break;
                    case 'Expense':
                        if ($trx->transactionable->vendor) {
                            $trx->party_name = $trx->transactionable->vendor->name;
                            $trx->party_company = $trx->transactionable->vendor->company_name;
                            $trx->party_type = 'Vendor';
                        } elseif ($trx->transactionable->category) {
                            $trx->party_name = $trx->transactionable->category->name;
                            $trx->party_type = 'Expense Category';
                        } else {
                            $trx->party_name = 'Office Expense';
                            $trx->party_type = 'Expense';
                        }
                        $trx->context_label = 'Office Expense';
                        break;
                    case 'Salary':
                        $trx->party_name = $trx->transactionable->user->name ?? 'Staff';
                        $trx->party_type = 'Employee';
                        $trx->context_label = 'Salary / Payroll';
                        break;
                    case 'Investment':
                        $trx->party_name = $trx->transactionable->investor?->name ?? 'Investor';
                        $trx->party_type = 'Investor';
                        $trx->context_label = 'Investment Received';
                        break;
                    case 'InvestmentPayment':
                        $trx->party_name = $trx->transactionable->investor?->name ?? 'Investor';
                        $trx->party_type = 'Investor';
                        $trx->context_label = 'Investment Return / Profit';
                        break;
                    case 'Asset':
                        $trx->party_name = $trx->transactionable->name ?? 'Asset';
                        $trx->party_company = $trx->transactionable->category ?? null;
                        $trx->party_type = 'Asset';
                        $trx->context_label = 'Asset Purchase';
                        break;
                    default:
                        $trx->party_name = $type;
                        $trx->party_type = 'System';
                        $trx->context_label = $type;
                        break;
                }
            } else {
                if (str_contains($trx->description, 'Fund transfer')) {
                    $trx->party_name = 'Inter-Account Transfer';
                    $trx->party_type = 'Transfer';
                    $trx->context_label = 'Fund Transfer';
                } else {
                    $trx->party_name = 'Direct Entry';
                    $trx->party_type = 'Manual';
                    $trx->context_label = 'Manual Entry';
                }
            }

            return $trx;
        });

        // 🟢 Pass dropdown options for rich filtering
        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name')->orderBy('name')->get();
        $users = User::select('id', 'name')->orderBy('name')->get();
        $projects = Project::select('id', 'title')->orderBy('title')->get();

        return Inertia::render('Admin/Transactions/Index', [
            'transactions' => $transactions,
            'accounts'     => $accounts,
            'clients'      => $clients,
            'vendors'      => $vendors,
            'users'        => $users,
            'projects'     => $projects,
            'totalCredit'  => $totalCredit,
            'totalDebit'   => $totalDebit,
            'netBalance'   => $netBalance,
            'filters'      => $request->only('search', 'per_page', 'account_id', 'type', 'date_from', 'date_to', 'party_type', 'client_id', 'vendor_id', 'user_id', 'project_id'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id'        => 'required|exists:accounts,id',
            'type'              => 'required|in:credit,debit',
            'amount'            => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge'       => 'nullable|numeric|decimal:0,2|min:0',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $validated['bank_charge'] = round((float) ($validated['bank_charge'] ?? 0), 2);
        if ($validated['type'] === 'credit' && $validated['bank_charge'] > 0) {
            throw \Illuminate\Validation\ValidationException::withMessages(['bank_charge' => 'Bank charge is only supported for outgoing payments.']);
        }
        $validated['amount'] = round((float) $validated['amount'] + $validated['bank_charge'], 2);

        DB::transaction(function () use ($validated, $request) {
            Transaction::create($validated);
            $account = Account::whereKey($request->account_id)->lockForUpdate()->firstOrFail();

            if ($request->type === 'credit') {
                $account->increment('current_balance', $validated['amount']);
            } else {
                if ($account->current_balance < $validated['amount']) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['amount' => 'Insufficient account balance.']);
                }
                $account->decrement('current_balance', $validated['amount']);
            }
        });

        return back()->with('success', 'Transaction saved successfully and balance updated.');
    }

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

            $transferAmount = round((float) $validated['amount'], 2);
            $charge = round((float) ($validated['bank_charge'] ?? 0), 2);

            if ($fromAccount->current_balance < $transferAmount + $charge) {
                throw new \Exception("Source account does not have sufficient balance!");
            }

            $desc = ($validated['description'] ?? '') ?: "Fund transfer from {$fromAccount->name} to {$toAccount->name}";
            $ref = $validated['reference_number'] ?? null;

            $fromAccount->decrement('current_balance', $transferAmount + $charge);

            Transaction::create([
                'account_id'       => $fromAccount->id,
                'type'             => 'debit',
                'amount'           => $transferAmount + $charge,
                'bank_charge'      => $charge,
                'transaction_date' => $validated['transaction_date'],
                'description'      => $desc . " (Out)",
                'reference_number' => $ref,
            ]);

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
            'bank_charge'       => 'nullable|numeric|decimal:0,2|min:0',
            'transaction_date'  => 'required|date',
            'description'       => 'required|string|max:500',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $validated['bank_charge'] = round((float) ($validated['bank_charge'] ?? 0), 2);
        if ($validated['type'] === 'credit' && $validated['bank_charge'] > 0) {
            throw \Illuminate\Validation\ValidationException::withMessages(['bank_charge' => 'Bank charge is only supported for outgoing payments.']);
        }
        $validated['amount'] = round((float) $validated['amount'] + $validated['bank_charge'], 2);

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
                    if ($newAccount->current_balance < $validated['amount']) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['amount' => 'Insufficient account balance.']);
                    }
                    $newAccount->decrement('current_balance', $validated['amount']);
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

        try {
            DB::transaction(function () use ($transaction) {
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