<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorLedger;
use App\Models\Client;
use App\Models\Advance;
use App\Services\AdvanceSettlementService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SampleExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::sample()->with(['category', 'account', 'logger', 'advance_user', 'vendor', 'client']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%")
                    ->orWhere('amount', 'like', "%{$searchTerm}%")
                    ->orWhere('date', 'like', "%{$searchTerm}%")
                    ->orWhereHas('client', function ($cq) use ($searchTerm) {
                        $cq->where('name', 'like', "%{$searchTerm}%")
                           ->orWhere('company_name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('category', function ($cq) use ($searchTerm) {
                        $cq->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('account', function ($aq) use ($searchTerm) {
                        $aq->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('advance_user', function ($uq) use ($searchTerm) {
                        $uq->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('vendor', function ($vq) use ($searchTerm) {
                        $vq->where('name', 'like', "%{$searchTerm}%")
                           ->orWhere('company_name', 'like', "%{$searchTerm}%");
                    });
            });
        }

        // Client filter
        if ($request->filled('client_id')) {
            if ($request->client_id === 'internal') {
                $query->whereNull('client_id');
            } elseif ($request->client_id !== 'all') {
                $query->where('client_id', $request->client_id);
            }
        }

        // Status filter
        if ($request->filled('sample_status') && $request->sample_status !== 'all') {
            $query->where('sample_status', $request->sample_status);
        }

        // Cost Type filter
        if ($request->filled('cost_type') && $request->cost_type !== 'all') {
            $query->where('cost_type', $request->cost_type);
        }

        // Category filter
        if ($request->filled('expense_category_id') && $request->expense_category_id !== 'all') {
            $query->where('expense_category_id', $request->expense_category_id);
        }

        // Date Filters
        if ($request->filled('date_filter')) {
            $filter = $request->date_filter;
            if ($filter === 'today') {
                $query->whereDate('date', Carbon::today()->toDateString());
            } elseif ($filter === 'yesterday') {
                $query->whereDate('date', Carbon::yesterday()->toDateString());
            } elseif ($filter === 'this_week') {
                $query->whereBetween('date', [
                    Carbon::now()->startOfWeek()->toDateString(),
                    Carbon::now()->endOfWeek()->toDateString()
                ]);
            } elseif ($filter === 'last_7_days') {
                $query->whereBetween('date', [
                    Carbon::now()->subDays(6)->toDateString(),
                    Carbon::now()->toDateString()
                ]);
            } elseif ($filter === 'this_month') {
                $query->whereMonth('date', Carbon::now()->month)
                      ->whereYear('date', Carbon::now()->year);
            } elseif ($filter === 'last_month') {
                $lastMonth = Carbon::now()->subMonth();
                $query->whereMonth('date', $lastMonth->month)
                      ->whereYear('date', $lastMonth->year);
            } elseif ($filter === 'this_year') {
                $query->whereYear('date', Carbon::now()->year);
            } elseif ($filter === 'custom' && $request->filled('start_date') && $request->filled('end_date')) {
                $startDate = min($request->start_date, $request->end_date);
                $endDate = max($request->start_date, $request->end_date);
                $query->whereDate('date', '>=', $startDate)->whereDate('date', '<=', $endDate);
            }
        } elseif ($request->filled('start_date') || $request->filled('end_date')) {
            if ($request->filled('start_date') && $request->filled('end_date')) {
                $startDate = min($request->start_date, $request->end_date);
                $endDate = max($request->start_date, $request->end_date);
                $query->whereDate('date', '>=', $startDate)->whereDate('date', '<=', $endDate);
            } elseif ($request->filled('start_date')) {
                $query->whereDate('date', '>=', $request->start_date);
            } elseif ($request->filled('end_date')) {
                $query->whereDate('date', '<=', $request->end_date);
            }
        }

        // Monthly total for sample expenses
        $thisMonthTotal = Expense::sample()
            ->whereMonth('date', Carbon::now()->month)
            ->whereYear('date', Carbon::now()->year)
            ->sum(DB::raw('amount + COALESCE(bank_charge, 0)'));

        // Filtered total amount
        $totalAmount = (clone $query)->sum(DB::raw('amount + COALESCE(bank_charge, 0)'));

        // Counters
        $pendingCount = Expense::sample()->whereIn('sample_status', ['pending', 'in_progress'])->count();
        $approvedCount = Expense::sample()->where('sample_status', 'approved')->count();

        $perPage = $request->input('per_page') === 'all'
            ? max($query->count(), 1)
            : \App\Support\Pagination::perPage($request, $query);

        $samples = $query->reorder()->orderBy('date', 'desc')->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance', 'account_number')->orderBy('name')->get();

        $advances = User::select('id', 'name')
            ->whereHas('advances', fn ($q) => $q->where('status', '!=', 'settled')->orWhere('amount', '>', 0))
            ->withSum('advances', 'amount')
            ->withSum('advances', 'settled_amount')
            ->withSum('advances', 'returned_amount')
            ->get()
            ->map(function ($user) {
                $given = (float)($user->advances_sum_amount ?? 0);
                $settled = (float)($user->advances_sum_settled_amount ?? 0);
                $returned = (float)($user->advances_sum_returned_amount ?? 0);
                $availableBalance = $given - ($settled + $returned);

                return [
                    'user_id' => $user->id,
                    'user'    => ['name' => $user->name],
                    'balance' => round($availableBalance, 2),
                ];
            })
            ->filter(fn ($a) => $a['balance'] > 0)
            ->sortBy(fn ($a) => $a['user']['name'])
            ->values();

        $vendors = Vendor::select('id', 'name', 'company_name', 'wallet_balance')
            ->orderBy('name')
            ->get()
            ->map(function ($v) {
                return [
                    'id'             => $v->id,
                    'name'           => $v->name,
                    'company_name'   => $v->company_name,
                    'wallet_balance' => (float) $v->wallet_balance,
                ];
            });

        return Inertia::render('Admin/SampleExpenses/Index', [
            'samples'        => $samples,
            'totalAmount'    => (float) $totalAmount,
            'thisMonthTotal' => (float) $thisMonthTotal,
            'pendingCount'   => (int) $pendingCount,
            'approvedCount'  => (int) $approvedCount,
            'categories'     => $categories,
            'clients'        => $clients,
            'accounts'       => $accounts,
            'advances'       => $advances,
            'vendors'        => $vendors,
            'filters'        => $request->only('search', 'per_page', 'date_filter', 'start_date', 'end_date', 'client_id', 'sample_status', 'cost_type', 'expense_category_id'),
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
                $insertData['type'] = 'sample';
                $insertData['bank_charge'] = $validated['bank_charge'] ?? 0;
                $insertData['logged_by'] = auth()->id() ?? 1;

                if ($validated['pay_type'] === 'account') {
                    $insertData['advance_user_id'] = null;
                    $insertData['vendor_id'] = null;
                }
                if ($validated['pay_type'] === 'advance') {
                    $insertData['account_id'] = null;
                    $insertData['vendor_id'] = null;
                }
                if ($validated['pay_type'] === 'vendor') {
                    $insertData['account_id'] = null;
                    $insertData['advance_user_id'] = null;
                    $insertData['bank_charge'] = 0;
                }

                $expense = Expense::create($insertData);
                $this->deductFromSource($validated, (float) $expense->amount, $expense);
            });

            return redirect()->route('admin.sample-expenses.index')->with('success', 'Sample Expense created successfully.');
        } catch (\Exception $e) {
            if (isset($validated['attachment'])) {
                Storage::disk('public')->delete($validated['attachment']);
            }
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::sample()->findOrFail($id);
        $validated = $this->validateData($request);

        if ($error = $this->validateSource($validated, $expense)) {
            return back()->withErrors(['error' => $error]);
        }

        $oldAttachment = $expense->attachment;
        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses', 'public');
        } else {
            unset($validated['attachment']);
        }

        try {
            DB::transaction(function () use ($validated, $expense) {
                $this->refundToSource($expense, (float) $expense->amount);

                $updateData = collect($validated)->except(['pay_type'])->toArray();
                $updateData['type'] = 'sample';
                $updateData['bank_charge'] = $validated['bank_charge'] ?? 0;

                if ($validated['pay_type'] === 'account') {
                    $updateData['advance_user_id'] = null;
                    $updateData['vendor_id'] = null;
                }
                if ($validated['pay_type'] === 'advance') {
                    $updateData['account_id'] = null;
                    $updateData['vendor_id'] = null;
                }
                if ($validated['pay_type'] === 'vendor') {
                    $updateData['account_id'] = null;
                    $updateData['advance_user_id'] = null;
                    $updateData['bank_charge'] = 0;
                }

                $expense->update($updateData);
                $this->deductFromSource($validated, (float) $expense->amount, $expense);
            });

            if (isset($validated['attachment']) && $oldAttachment) {
                Storage::disk('public')->delete($oldAttachment);
            }

            return redirect()->route('admin.sample-expenses.index')->with('success', 'Sample Expense updated successfully.');
        } catch (\Exception $e) {
            if (isset($validated['attachment'])) {
                Storage::disk('public')->delete($validated['attachment']);
            }
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $expense = Expense::sample()->findOrFail($id);

        try {
            DB::transaction(function () use ($expense) {
                $this->refundToSource($expense, (float) $expense->amount);
                if ($expense->attachment) {
                    Storage::disk('public')->delete($expense->attachment);
                }
                $expense->delete();
            });

            return back()->with('success', 'Sample Expense deleted and balance restored.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'sample_status' => 'required|string|in:pending,in_progress,delivered,approved,rejected',
        ]);

        $expense = Expense::sample()->findOrFail($id);
        $expense->update(['sample_status' => $validated['sample_status']]);

        return back()->with('success', 'Sample status updated successfully.');
    }

    // ==========================================
    // Unified Validation & Logic Methods
    // ==========================================

    private function validateData(Request $request): array
    {
        return $request->validate([
            'title'               => 'required|string|max:255',
            'client_id'           => 'nullable|exists:clients,id',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'account_id'          => 'nullable|exists:accounts,id',
            'advance_user_id'     => 'nullable|exists:users,id',
            'vendor_id'           => 'nullable|exists:vendors,id',
            'amount'              => 'required|numeric|decimal:0,2|min:0.01',
            'bank_charge'         => 'nullable|numeric|decimal:0,2|min:0',
            'date'                => 'required|date',
            'sample_status'       => 'nullable|string|in:pending,in_progress,delivered,approved,rejected',
            'cost_type'           => 'nullable|string|in:company_cost,billable,adjusted',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'pay_type'            => 'required|in:account,advance,vendor',
        ]);
    }

    private function validateSource(array $validated, ?Expense $existingExpense = null): ?string
    {
        if ($validated['pay_type'] === 'account' && empty($validated['account_id'])) return 'Please select a Bank/Cash Account.';
        if ($validated['pay_type'] === 'advance' && empty($validated['advance_user_id'])) return 'Please select an Advance User.';
        if ($validated['pay_type'] === 'vendor' && empty($validated['vendor_id'])) return 'Please select a Vendor.';
        if ($validated['pay_type'] !== 'account' && ($validated['bank_charge'] ?? 0) > 0) return 'Bank charge requires an account payment.';

        if ($validated['pay_type'] === 'vendor') {
            $vendor = Vendor::find($validated['vendor_id']);
            $alreadyUsedFromSameVendor = ($existingExpense && (int) $existingExpense->vendor_id === (int) $validated['vendor_id'])
                ? (float) $existingExpense->amount
                : 0.0;
            $effectiveWallet = ($vendor ? (float) $vendor->wallet_balance : 0.0) + $alreadyUsedFromSameVendor;
            if (!$vendor || $effectiveWallet < (float) $validated['amount']) {
                $bal = number_format($effectiveWallet, 2);
                return "The selected vendor does not have sufficient advance balance (Available: ৳{$bal}).";
            }
        }

        if ($validated['pay_type'] === 'advance') {
            $userId = (int) $validated['advance_user_id'];
            $user = User::withSum('advances', 'amount')
                ->withSum('advances', 'settled_amount')
                ->withSum('advances', 'returned_amount')
                ->find($userId);

            $given = (float)($user?->advances_sum_amount ?? 0);
            $settled = (float)($user?->advances_sum_settled_amount ?? 0);
            $returned = (float)($user?->advances_sum_returned_amount ?? 0);
            $available = $given - ($settled + $returned);

            $alreadyUsedByThisExpense = ($existingExpense && (int) $existingExpense->advance_user_id === $userId)
                ? (float) $existingExpense->amount
                : 0.0;

            $effectiveAvailable = $available + $alreadyUsedByThisExpense;

            if ($effectiveAvailable < (float) $validated['amount']) {
                $bal = number_format($effectiveAvailable, 2);
                return "The selected staff member does not have sufficient advance balance (Available: ৳{$bal}).";
            }
        }

        return null;
    }

    private function deductFromSource(array $validated, float $amount, Expense $expense): void
    {
        if ($validated['pay_type'] === 'account') {
            $charge = round((float) ($validated['bank_charge'] ?? 0), 2);
            $totalDebit = round($amount + $charge, 2);
            $account = Account::whereKey($validated['account_id'])->lockForUpdate()->firstOrFail();
            if ($account->current_balance < $totalDebit) {
                throw new \Exception('Insufficient Account Balance');
            }
            $account->decrement('current_balance', $totalDebit);

            $expense->transaction()->create([
                'account_id'       => $account->id,
                'type'             => 'debit',
                'amount'           => $totalDebit,
                'bank_charge'      => $charge,
                'transaction_date' => $validated['date'],
                'description'      => 'Sample Expense: ' . $validated['title'],
            ]);
        } elseif ($validated['pay_type'] === 'advance') {
            app(AdvanceSettlementService::class)->consume($expense, (int) $validated['advance_user_id'], $amount);
        } elseif ($validated['pay_type'] === 'vendor') {
            $vendor = Vendor::whereKey($validated['vendor_id'])->lockForUpdate()->firstOrFail();
            if ($vendor->wallet_balance < $amount) {
                throw new \Exception('Insufficient Vendor Advance Balance.');
            }
            $vendor->decrement('wallet_balance', $amount);
            VendorLedger::create([
                'vendor_id'   => $vendor->id,
                'type'        => 'debit',
                'amount'      => $amount,
                'date'        => $validated['date'],
                'description' => "Sample Expense #{$expense->id}: {$validated['title']}",
            ]);
        }
    }

    private function refundToSource(Expense $expense, float $amount): void
    {
        if ($amount <= 0) return;

        if ($expense->account_id) {
            Account::where('id', $expense->account_id)->increment('current_balance', $amount + (float) ($expense->bank_charge ?? 0));
            if ($expense->transaction) {
                $expense->transaction()->delete();
            }
        } elseif ($expense->advance_user_id) {
            if (!app(AdvanceSettlementService::class)->refund($expense)) {
                $this->refundAdvance((int) $expense->advance_user_id, $amount);
            }
        } elseif ($expense->vendor_id) {
            $vendor = Vendor::whereKey($expense->vendor_id)->lockForUpdate()->first();
            if ($vendor) {
                $vendor->increment('wallet_balance', $amount);
                VendorLedger::where('vendor_id', $vendor->id)
                    ->where('description', 'like', "Sample Expense #{$expense->id}:%")
                    ->delete();
            }
        }
    }

    private function refundAdvance(int $userId, float $amount): void
    {
        $remaining = $amount;
        $advanceRecords = Advance::where('user_id', $userId)
            ->where('settled_amount', '>', 0)
            ->orderByDesc('date')
            ->lockForUpdate()
            ->get();

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

        \App\Models\AdvanceBalance::syncForUser($userId);
    }
}
