<?php

namespace App\Http\Controllers;

use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Vendor;
use App\Models\Advance;
use App\Models\AdvanceBalance;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ProjectExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = ProjectExpense::with(['project', 'category', 'account', 'vendor', 'advanceUser']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('vendor', fn ($vq) => $vq->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('project', fn ($pq) => $pq->where('title', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        $totals = [
            'total_bill'  => (float) (clone $query)->sum('total_bill'),
            'paid_amount' => (float) (clone $query)->sum('paid_amount'),
            'due_amount'  => (float) (clone $query)->sum('due_amount'),
        ];

        $perPage = $request->input('per_page', 10);
        if ($perPage === 'all') {
            $perPage = $query->count() ?: 10;
        }

        $project_expenses = $query->latest()->paginate($perPage)->withQueryString();

        $projects = Project::where('status', '!=', 'completed')->select('id', 'title')->get();
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name')->get();

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

        return Inertia::render('Admin/ProjectExpenses/Index', compact(
            'project_expenses', 'projects', 'categories', 'accounts', 'vendors', 'advances', 'totals'
        ) + [
            'filters' => $request->only(['search', 'project_id', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateData($request);
        $paid = (float) ($validated['paid_amount'] ?? 0);

        if ($error = $this->validateSource($validated, $paid)) {
            return redirect()->back()->withErrors(['error' => $error]);
        }

        try {
            DB::transaction(function () use ($validated, $paid) {
                $this->deductFromSource($validated['account_id'] ?? null, $validated['advance_user_id'] ?? null, $paid);

                ProjectExpense::create([
                    ...$validated,
                    'paid_amount'    => $paid,
                    'due_amount'     => round($validated['total_bill'] - $paid, 2),
                    'payment_status' => $this->resolveStatus($validated['total_bill'], $paid),
                ]);
            });

            return redirect()->back()->with('success', 'Expense logged successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, string $id)
    {
        $expense = ProjectExpense::findOrFail($id);
        $validated = $this->validateData($request);
        $newPaid = (float) ($validated['paid_amount'] ?? 0);

        if ($error = $this->validateSource($validated, $newPaid)) {
            return redirect()->back()->withErrors(['error' => $error]);
        }

        try {
            DB::transaction(function () use ($expense, $validated, $newPaid) {
                $oldPaid          = (float) $expense->paid_amount;
                $oldAccountId     = $expense->account_id;
                $oldAdvanceUserId = $expense->advance_user_id;

                $newAccountId     = $validated['account_id'] ?? null;
                $newAdvanceUserId = $validated['advance_user_id'] ?? null;

                $sourceChanged = ($oldAccountId != $newAccountId) || ($oldAdvanceUserId != $newAdvanceUserId);

                if ($sourceChanged) {
                    $this->refundToSource($oldAccountId, $oldAdvanceUserId, $oldPaid);
                    $this->deductFromSource($newAccountId, $newAdvanceUserId, $newPaid);
                } else {
                    $diff = $newPaid - $oldPaid;
                    if ($diff > 0) {
                        $this->deductFromSource($newAccountId, $newAdvanceUserId, $diff);
                    } elseif ($diff < 0) {
                        $this->refundToSource($newAccountId, $newAdvanceUserId, abs($diff));
                    }
                }

                $expense->update([
                    ...$validated,
                    'paid_amount'    => $newPaid,
                    'due_amount'     => round($validated['total_bill'] - $newPaid, 2),
                    'payment_status' => $this->resolveStatus($validated['total_bill'], $newPaid),
                ]);
            });

            return redirect()->back()->with('success', 'Expense updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy(string $id)
    {
        $expense = ProjectExpense::findOrFail($id);

        try {
            DB::transaction(function () use ($expense) {
                $this->refundToSource($expense->account_id, $expense->advance_user_id, (float) $expense->paid_amount);
                $expense->delete();
            });

            return redirect()->back()->with('success', 'Expense deleted and balance restored.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

  
    private function validateData(Request $request): array
    {
        return $request->validate([
            'project_id'            => 'required|exists:projects,id',
            'expense_category_id'   => 'required|exists:expense_categories,id',
            'account_id'            => 'nullable|exists:accounts,id',
            'advance_user_id'       => 'nullable|exists:users,id',
            'title'                 => 'required|string|max:255',
            'vendor_id'             => 'nullable|exists:vendors,id',
            'total_bill'            => 'required|numeric|min:0',
            'paid_amount'           => 'nullable|numeric|min:0',
            'date'                  => 'required|date',
            'description'           => 'nullable|string',
        ]);
    }

    private function validateSource(array $validated, float $paid): ?string
    {
        $hasAccount = !empty($validated['account_id']);
        $hasAdvance = !empty($validated['advance_user_id']);

        if ($hasAccount && $hasAdvance) {
            return 'একসাথে Account এবং Advance উভয় সোর্স সিলেক্ট করা যাবে না।';
        }
        if ($paid > 0 && !$hasAccount && !$hasAdvance) {
            return 'পেমেন্ট সোর্স (Account অথবা Advance) নির্বাচন করুন।';
        }
        return null;
    }

    private function resolveStatus($bill, $paid): string
    {
        $bill = (float) $bill;
        $paid = (float) $paid;
        if ($bill > 0 && $paid >= $bill) return 'paid';
        if ($paid > 0 && $paid < $bill) return 'partial';
        return 'due';
    }

    private function deductFromSource(?int $accountId, ?int $advanceUserId, float $amount): void
    {
        if ($amount <= 0) return;

        if ($accountId) {
            $account = Account::findOrFail($accountId);
            if ($account->current_balance < $amount) {
                throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
            }
            $account->current_balance -= $amount;
            $account->save();
        } elseif ($advanceUserId) {
            $this->consumeAdvance($advanceUserId, $amount);
        }
    }

    private function refundToSource(?int $accountId, ?int $advanceUserId, float $amount): void
    {
        if ($amount <= 0) return;

        if ($accountId) {
            $account = Account::find($accountId);
            if ($account) {
                $account->current_balance += $amount;
                $account->save();
            }
        } elseif ($advanceUserId) {
            $this->refundAdvance($advanceUserId, $amount);
        }
    }

  
    private function consumeAdvance(int $userId, float $amount): void
    {
        $remaining = $amount;

        $advanceRecords = Advance::where('user_id', $userId)
            ->where('status', 'unsettled')
            ->orderBy('date')
            ->lockForUpdate()
            ->get();

        foreach ($advanceRecords as $advance) {
            if ($remaining <= 0) break;

            $available = $advance->amount - $advance->settled_amount - $advance->returned_amount;
            if ($available <= 0) continue;

            $take = min($available, $remaining);
            $advance->settled_amount += $take;
            if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                $advance->status = 'settled';
            }
            $advance->save();

            $remaining -= $take;
        }

        if ($remaining > 0.01) {
            throw new \Exception('নির্বাচিত এমপ্লয়ির পর্যাপ্ত Advance ব্যালেন্স নেই।');
        }

        AdvanceBalance::where('user_id', $userId)->increment('total_used', $amount);
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

            $refundable = min($advance->settled_amount, $remaining);
            $advance->settled_amount -= $refundable;

            if ($advance->status === 'settled' && ($advance->settled_amount + $advance->returned_amount) < $advance->amount) {
                $advance->status = 'unsettled';
            }
            $advance->save();

            $remaining -= $refundable;
        }

        $actuallyRefunded = $amount - max($remaining, 0);
        if ($actuallyRefunded > 0) {
            AdvanceBalance::where('user_id', $userId)->decrement('total_used', $actuallyRefunded);
        }
    }

    public function vendorDuesReport(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        $query = Vendor::select('id', 'name as vendor_name', 'company_name')
            ->withSum('projectExpenses as total_due', 'due_amount')
            ->whereHas('projectExpenses', function ($q) {
                $q->where('due_amount', '>', 0);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $grandTotal = ProjectExpense::whereIn('vendor_id', $query->pluck('id'))
                                    ->sum('due_amount');

        $vendorDues = $query->latest('id')->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', [
            'vendorDues' => $vendorDues,
            'grandTotal' => $grandTotal 
        ]);
    }
}
