<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\Account;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AdvanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Advance::query()->with(['account', 'user']);

        // 1. Deep Text Search
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('user', function ($q2) use ($searchTerm) {
                    $q2->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('account', function ($q2) use ($searchTerm) {
                    $q2->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhere('purpose', 'like', "%{$searchTerm}%")
                ->orWhere('notes', 'like', "%{$searchTerm}%")
                ->orWhere('date', 'like', "%{$searchTerm}%")
                ->orWhere('status', 'like', "%{$searchTerm}%")
                ->orWhere('amount', 'like', "%{$searchTerm}%");
            });
        }

        // 2. Dropdown Filters
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        // 3. Accurate Global Totals
        $totals = [
            'total_given'    => (float) (clone $query)->sum('amount'),
            'total_expensed' => (float) (clone $query)->sum('settled_amount'),
            'total_returned' => (float) (clone $query)->sum('returned_amount'),
        ];
        $totals['total_due'] = $totals['total_given'] - $totals['total_expensed'] - $totals['total_returned'];

        // 4. Pagination
        if ($request->input('per_page') === 'all') {
            $totalCount = (clone $query)->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
        }

        $advances = $query->orderBy('date', 'desc')->latest()->paginate($perPage)->withQueryString();

        // 🟢 FIX: Fetch Bank Charges dynamically from transactions table without adding a column to advances table
        $advanceIds = $advances->pluck('id');
        $transactions = Transaction::whereIn('transactionable_id', $advanceIds)
            ->where('transactionable_type', Advance::class)
            ->where('type', 'debit')
            ->get()
            ->keyBy('transactionable_id');

        // Inject Bank Charge into the items
        $advances->getCollection()->transform(function ($adv) use ($transactions) {
            $adv->bank_charge = $transactions->has($adv->id) ? (float) $transactions[$adv->id]->bank_charge : 0;
            return $adv;
        });

        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();
        $employees = User::whereHas('employeeProfile')->select('id', 'name')->get();

        $employeeBalances = User::select('id', 'name')
            ->has('advances')
            ->withSum('advances', 'amount')
            ->withSum('advances', 'settled_amount')
            ->withSum('advances', 'returned_amount')
            ->get()
            ->map(function ($user) {
                $given = (float)($user->advances_sum_amount ?? 0);
                $settled = (float)($user->advances_sum_settled_amount ?? 0);
                $returned = (float)($user->advances_sum_returned_amount ?? 0);
                return [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'total_due' => round($given - ($settled + $returned), 2)
                ];
            })
            ->filter(fn($u) => $u['total_due'] > 0)
            ->sortByDesc('total_due')
            ->values();

        return Inertia::render('Admin/Advances/Index', [
            'advances'  => $advances,
            'filters'   => $request->only('search', 'per_page', 'user_id', 'account_id'),
            'accounts'  => $accounts,
            'employees' => $employees,
            'totals'    => $totals,
            'employeeBalances' => $employeeBalances,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'user_id'    => 'required|exists:users,id',
            'amount'     => 'required|numeric|min:1',
            'bank_charge'=> 'nullable|numeric|min:0', // Validating bank charge from frontend
            'date'       => 'required|date',
            'purpose'    => 'nullable|string|max:255',
            'status'     => 'required|in:unsettled,settled',
            'notes'      => 'nullable|string',
        ]);

        // 🟢 FIX: Extract bank_charge and REMOVE it from $validated so it doesn't try to save in advances table
        $charge = (float) ($validated['bank_charge'] ?? 0);
        unset($validated['bank_charge']);

        try {
            DB::transaction(function () use ($validated, $charge) {
                $account = Account::findOrFail($validated['account_id']);

                $totalDeduction = (float) $validated['amount'] + $charge;

                if ($account->current_balance < $totalDeduction) {
                    throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                }

                $account->current_balance -= $totalDeduction;
                $account->save();

                $validated['logged_by'] = auth()->id();
                $validated['settled_amount'] = 0;
                $validated['returned_amount'] = 0;

                // Create the Advance record
                $advance = Advance::create($validated);

                // Create the Transaction record WITH bank charge
                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'debit',
                    'amount'               => $totalDeduction,
                    'bank_charge'          => $charge, // Saved in Transactions table securely!
                    'transaction_date'     => $validated['date'],
                    'description'          => 'Employee Advance: ' . ($validated['purpose'] ?? 'Office Purpose'),
                    'transactionable_id'   => $advance->id,
                    'transactionable_type' => Advance::class,
                ]);

                $balance = AdvanceBalance::firstOrCreate(['user_id' => $validated['user_id']]);
                $balance->increment('total_given', $validated['amount']);
            });

            return redirect()->back()->with('success', 'Advance logged successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, string $id)
    {
        $advance = Advance::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'user_id'    => 'required|exists:users,id',
            'amount'     => 'required|numeric|min:1',
            'bank_charge'=> 'nullable|numeric|min:0',
            'date'       => 'required|date',
            'purpose'    => 'nullable|string|max:255',
            'status'     => 'required|in:unsettled,settled',
            'notes'      => 'nullable|string',
        ]);

        $newCharge = (float) ($validated['bank_charge'] ?? 0);
        unset($validated['bank_charge']);

        try {
            DB::transaction(function () use ($advance, $validated, $newCharge) {
                $advance = Advance::whereKey($advance->id)->lockForUpdate()->firstOrFail();

                if ($validated['amount'] < $advance->settled_amount + $advance->returned_amount || ($validated['user_id'] != $advance->user_id && $advance->settled_amount + $advance->returned_amount > 0)) {
                    throw new \Exception('Used or returned advances cannot be reassigned or reduced below the settled amount.');
                }

                $validated['status'] = $validated['amount'] <= $advance->settled_amount + $advance->returned_amount ? 'settled' : 'unsettled';

                // Fetch existing transaction to get OLD bank charge
                $transaction = Transaction::where('transactionable_id', $advance->id)
                    ->where('transactionable_type', Advance::class)
                    ->where('type', 'debit')
                    ->first();

                $oldCharge = $transaction ? (float) $transaction->bank_charge : 0;
                $oldTotalDeduction = (float) $advance->amount + $oldCharge;
                $newTotalDeduction = (float) $validated['amount'] + $newCharge;

                if ($advance->account_id != $validated['account_id']) {
                    // Account Changed - Refund old total to old account
                    $oldAccount = Account::findOrFail($advance->account_id);
                    $oldAccount->current_balance += $oldTotalDeduction;
                    $oldAccount->save();

                    // Deduct new total from new account
                    $newAccount = Account::findOrFail($validated['account_id']);
                    if ($newAccount->current_balance < $newTotalDeduction) {
                        throw new \Exception('নতুন অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                    $newAccount->current_balance -= $newTotalDeduction;
                    $newAccount->save();
                } elseif ($oldTotalDeduction != $newTotalDeduction) {
                    // Same Account, Amount/Charge changed
                    $account = Account::findOrFail($advance->account_id);
                    $difference = $newTotalDeduction - $oldTotalDeduction;

                    if ($difference > 0 && $account->current_balance < $difference) {
                        throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                    $account->current_balance -= $difference;
                    $account->save();
                }

                if ($transaction) {
                    $transaction->update([
                        'account_id'       => $validated['account_id'],
                        'amount'           => $newTotalDeduction,
                        'bank_charge'      => $newCharge, // Update charge directly in transaction
                        'transaction_date' => $validated['date'],
                        'description'      => 'Employee Advance: ' . ($validated['purpose'] ?? 'Office Purpose'),
                    ]);
                } else {
                    Transaction::create([
                        'account_id'           => $validated['account_id'],
                        'type'                 => 'debit',
                        'amount'               => $newTotalDeduction,
                        'bank_charge'          => $newCharge,
                        'transaction_date'     => $validated['date'],
                        'description'          => 'Employee Advance: ' . ($validated['purpose'] ?? 'Office Purpose'),
                        'transactionable_id'   => $advance->id,
                        'transactionable_type' => Advance::class,
                    ]);
                }

                $oldUserId = $advance->user_id;
                $newUserId = $validated['user_id'];
                $oldAmount = (float) $advance->amount;
                $newAmount = (float) $validated['amount'];

                if ($oldUserId != $newUserId) {
                    $oldBalance = AdvanceBalance::where('user_id', $oldUserId)->first();
                    if ($oldBalance) {
                        $oldBalance->decrement('total_given', $oldAmount);
                        $oldBalance->decrement('total_used', (float) $advance->settled_amount);
                        $oldBalance->decrement('total_returned', (float) $advance->returned_amount);
                    }

                    $newBalance = AdvanceBalance::firstOrCreate(['user_id' => $newUserId]);
                    $newBalance->increment('total_given', $newAmount);
                    $newBalance->increment('total_used', (float) $advance->settled_amount);
                    $newBalance->increment('total_returned', (float) $advance->returned_amount);
                } elseif ($oldAmount != $newAmount) {
                    $balance = AdvanceBalance::where('user_id', $oldUserId)->first();
                    if ($balance) {
                        $balance->increment('total_given', $newAmount - $oldAmount);
                    }
                }

                $advance->update($validated);
            });

            return redirect()->back()->with('success', 'Advance updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function returnMoney(Request $request, string $id)
    {
        $advance = Advance::findOrFail($id);

        $validated = $request->validate([
            'return_amount' => 'required|numeric|min:1',
            'return_account_id' => 'required|exists:accounts,id',
        ]);

        try {
            DB::transaction(function () use ($advance, $validated) {
                $advance->refresh();
                $availableToReturn = max((float) $advance->amount - (float) $advance->settled_amount - (float) $advance->returned_amount, 0);

                if ((float) $validated['return_amount'] > $availableToReturn) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'return_amount' => "Return cannot exceed available advance ({$availableToReturn} TK).",
                    ]);
                }

                $advance->returned_amount += $validated['return_amount'];
                if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                    $advance->status = 'settled';
                }
                $advance->save();

                $account = Account::find($validated['return_account_id']);
                if ($account) {
                    $account->current_balance += $validated['return_amount'];
                    $account->save();

                    Transaction::create([
                        'account_id'           => $account->id,
                        'type'                 => 'credit',
                        'amount'               => $validated['return_amount'],
                        'transaction_date'     => now()->toDateString(),
                        'description'          => 'Advance Refunded: ' . ($advance->purpose ?? 'Office Purpose'),
                        'transactionable_id'   => $advance->id,
                        'transactionable_type' => Advance::class,
                    ]);
                }

                AdvanceBalance::where('user_id', $advance->user_id)
                    ->increment('total_returned', $validated['return_amount']);
            });

            return redirect()->back()->with('success', 'Money returned to account successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy(string $id)
    {
        $advance = Advance::findOrFail($id);
        if ((float) $advance->settled_amount > 0) {
            return redirect()->back()->withErrors([
                'error' => 'এই Advance থেকে ইতিমধ্যে ' . number_format($advance->settled_amount, 2) . ' টাকা খরচ হয়ে গেছে। ডিলিট করা সম্ভব নয়।'
            ]);
        }

        try {
            DB::transaction(function () use ($advance) {
                $transactions = Transaction::where('transactionable_id', $advance->id)
                    ->where('transactionable_type', Advance::class)
                    ->get();

                if ($transactions->isNotEmpty()) {
                    foreach ($transactions as $trx) {
                        $account = Account::lockForUpdate()->find($trx->account_id);
                        if ($account) {
                            if ($trx->type === 'debit') {
                                $account->increment('current_balance', $trx->amount);
                            } else {
                                if ((float) $account->current_balance < (float) $trx->amount) {
                                    throw new \Exception("অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই রিটার্ন ট্রানজেকশন রিভার্স করার জন্য।");
                                }
                                $account->decrement('current_balance', $trx->amount);
                            }
                        }
                        $trx->delete();
                    }
                } elseif ($advance->account_id) {
                    $returned = (float) ($advance->returned_amount ?? 0);
                    $refund_amount = max(0, (float) $advance->amount - $returned);
                    if ($refund_amount > 0) {
                        $account = Account::lockForUpdate()->find($advance->account_id);
                        if ($account) {
                            $account->increment('current_balance', $refund_amount);
                        }
                    }
                }

                $returned = (float) ($advance->returned_amount ?? 0);
                $balance = AdvanceBalance::where('user_id', $advance->user_id)->first();
                if ($balance) {
                    $balance->decrement('total_given', $advance->amount);
                    if ($returned > 0) {
                        $balance->decrement('total_returned', $returned);
                    }
                }

                $advance->delete();
            });

            return redirect()->back()->with('success', 'Advance deleted and account balances restored.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function employeeLedger(Request $request, $userId)
    {
        $employee = User::with('employeeProfile')
            ->withSum('advances', 'amount')
            ->withSum('advances', 'settled_amount')
            ->withSum('advances', 'returned_amount')
            ->findOrFail($userId);

        $perPage = 15;

        $advancesHistory = Advance::where('user_id', $userId)
            ->latest()
            ->paginate($perPage, ['*'], 'taken_page')
            ->withQueryString();

        $settlements = \App\Models\AdvanceSettlement::whereHas('advance', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
        ->with('settleable')
        ->latest()
        ->paginate($perPage, ['*'], 'settled_page')
        ->withQueryString()
        ->through(function ($settlement) {
            $type = 'Unknown';
            $reference = '#';
            $description = 'Settled';
            $date = $settlement->created_at->format('Y-m-d');

            if ($settlement->settleable_type === \App\Models\Salary::class) {
                $type = 'Salary Deduction';
                $reference = 'Payslip: ' . ($settlement->settleable->month_year ?? 'N/A');
                $description = 'Deducted from salary';
                $date = $settlement->settleable->payment_date ?? clone $settlement->created_at;
            } elseif ($settlement->settleable_type === \App\Models\ProjectExpense::class) {
                $type = 'Project Expense';
                $reference = 'Exp: ' . ($settlement->settleable->title ?? 'N/A');
                $description = $settlement->settleable->description ?? 'Used for project expense';
                $date = $settlement->settleable->date ?? clone $settlement->created_at;
            } elseif ($settlement->settleable_type === \App\Models\Expense::class) {
                $type = 'Office Expense';
                $reference = 'Exp: ' . ($settlement->settleable->title ?? 'N/A');
                $description = $settlement->settleable->description ?? 'Used for office expense';
                $date = $settlement->settleable->date ?? clone $settlement->created_at;
            }

            return [
                'id' => $settlement->id,
                'date' => $date,
                'type' => $type,
                'reference' => $reference,
                'description' => $description,
                'amount' => $settlement->amount,
            ];
        });

        $totalAdvance = $employee->advances_sum_amount ?? 0;
        $totalSettled = $employee->advances_sum_settled_amount ?? 0;
        $totalReturned = $employee->advances_sum_returned_amount ?? 0;
        $currentDue = $totalAdvance - ($totalSettled + $totalReturned);

        return Inertia::render('Admin/Advances/Ledger', [
            'employee' => $employee,
            'advancesHistory' => $advancesHistory,
            'settlements' => $settlements,
            'summary' => [
                'total_advance'  => $totalAdvance,
                'total_settled'  => $totalSettled,
                'total_returned' => $totalReturned,
                'current_due'    => $currentDue,
            ],
        ]);
    }
}
