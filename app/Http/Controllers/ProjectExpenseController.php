<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Vendor;
use App\Models\VendorLedger;
use App\Models\AdvanceBalance;
use App\Models\Advance;
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

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $project_expenses = $query->latest()->paginate($perPage)->withQueryString();

        $projects = Project::with('client:id,name,company_name')
            ->select('id', 'title', 'client_id', 'status')
            ->orderBy('id', 'desc')
            ->get();

        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->orderBy('name')->get();
        
        // Vendor query updated to include wallet_balance
        $vendors = Vendor::select('id', 'name', 'company_name', 'wallet_balance')->get();

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
                $this->deductFromSource($validated, $paid);

                // Ignore pay_type when inserting into DB, just use the IDs
                $insertData = collect($validated)->except('pay_type')->toArray();

                ProjectExpense::create([
                    ...$insertData,
                    'paid_amount'    => $paid,
                    'due_amount'     => round($validated['total_bill'] - $paid, 2),
                    'payment_status' => $this->resolveStatus($validated['total_bill'], $paid),
                    'logged_by'      => auth()->id() ?? 1,
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
                $oldPaid = (float) $expense->paid_amount;
                
                // Determine old payment source logic
                $oldPayType = 'wallet';
                if ($expense->account_id) $oldPayType = 'account';
                elseif ($expense->advance_user_id) $oldPayType = 'advance';

                $newPayType = $validated['pay_type'];
                
                $sourceChanged = ($oldPayType !== $newPayType) || 
                                 ($oldPayType === 'account' && $expense->account_id != $validated['account_id']) ||
                                 ($oldPayType === 'advance' && $expense->advance_user_id != $validated['advance_user_id']) ||
                                 ($oldPayType === 'wallet' && $expense->vendor_id != $validated['vendor_id']);

                if ($sourceChanged) {
                    $this->refundToSource($expense, $oldPaid);
                    $this->deductFromSource($validated, $newPaid);
                } else {
                    $diff = $newPaid - $oldPaid;
                    if ($diff > 0) $this->deductFromSource($validated, $diff);
                    elseif ($diff < 0) $this->refundToSource($expense, abs($diff));
                }

                $updateData = collect($validated)->except('pay_type')->toArray();

                // To ensure unselected sources are set to null in DB
                if ($newPayType === 'account') $updateData['advance_user_id'] = null;
                if ($newPayType === 'advance') $updateData['account_id'] = null;
                if ($newPayType === 'wallet') {
                    $updateData['account_id'] = null;
                    $updateData['advance_user_id'] = null;
                }

                $expense->update([
                    ...$updateData,
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
                $this->refundToSource($expense, (float) $expense->paid_amount);
                $expense->delete();
            });

            return redirect()->back()->with('success', 'Expense deleted and balance restored.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // --- NEW: Move Cancelled Project Funds to Vendor Wallet ---
    public function moveToWallet(string $id)
    {
        $expense = ProjectExpense::findOrFail($id);

        if (!$expense->vendor_id) {
            return redirect()->back()->withErrors(['error' => 'No vendor attached to this expense. Cannot move to wallet.']);
        }

        try {
            DB::transaction(function () use ($expense) {
                $amount = (float) $expense->paid_amount;
                
                if ($amount > 0) {
                    $vendor = Vendor::findOrFail($expense->vendor_id);
                    $vendor->increment('wallet_balance', $amount);
                    
                    VendorLedger::create([
                        'vendor_id' => $vendor->id,
                        'type' => 'credit',
                        'amount' => $amount,
                        'description' => 'Refunded to wallet from cancelled project: ' . ($expense->project->title ?? 'Unknown')
                    ]);
                }

                // Delete expense without refunding to bank (since money is now in vendor wallet)
                $expense->delete();
            });

            return redirect()->back()->with('success', 'Expense removed and amount transferred to Vendor Wallet.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Validation & Source Management Methods
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
            'pay_type'              => 'required|in:account,advance,wallet', // New Field
        ]);
    }

    private function validateSource(array $validated, float $paid): ?string
    {
        if ($paid > 0) {
            $payType = $validated['pay_type'];
            if ($payType === 'account' && empty($validated['account_id'])) return 'Please select an Account.';
            if ($payType === 'advance' && empty($validated['advance_user_id'])) return 'Please select an Advance User.';
            if ($payType === 'wallet' && empty($validated['vendor_id'])) return 'Please select a Vendor to pay from Wallet.';
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

    private function deductFromSource(array $validated, float $amount): void
    {
        if ($amount <= 0) return;
        $payType = $validated['pay_type'];

        if ($payType === 'account') {
            $account = Account::findOrFail($validated['account_id']);
            if ($account->current_balance < $amount) throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
            $account->decrement('current_balance', $amount);
        } elseif ($payType === 'advance') {
            $this->consumeAdvance($validated['advance_user_id'], $amount);
        } elseif ($payType === 'wallet') {
            $vendor = Vendor::findOrFail($validated['vendor_id']);
            if ($vendor->wallet_balance < $amount) throw new \Exception('Insufficient Vendor Wallet Balance! Vendor has only ' . $vendor->wallet_balance);
            $vendor->decrement('wallet_balance', $amount);
            
            VendorLedger::create([
                'vendor_id' => $vendor->id,
                'type' => 'debit',
                'amount' => $amount,
                'description' => 'Paid for expense: ' . $validated['title']
            ]);
        }
    }

    private function refundToSource(ProjectExpense $expense, float $amount): void
    {
        if ($amount <= 0) return;

        if ($expense->account_id) {
            Account::where('id', $expense->account_id)->increment('current_balance', $amount);
        } elseif ($expense->advance_user_id) {
            $this->refundAdvance($expense->advance_user_id, $amount);
        } else {
            // If neither account nor advance, it must be a wallet payment
            if ($expense->vendor_id) {
                $vendor = Vendor::find($expense->vendor_id);
                if ($vendor) {
                    $vendor->increment('wallet_balance', $amount);
                    VendorLedger::create([
                        'vendor_id' => $vendor->id,
                        'type' => 'credit',
                        'amount' => $amount,
                        'description' => 'Refunded from modified/deleted expense: ' . $expense->title
                    ]);
                }
            }
        }
    }

    private function consumeAdvance(int $userId, float $amount): void
    {
        $remaining = $amount;
        $advanceRecords = Advance::where('user_id', $userId)->where('status', 'unsettled')->orderBy('date')->lockForUpdate()->get();

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

        if ($remaining > 0.01) throw new \Exception('নির্বাচিত এমপ্লয়ির পর্যাপ্ত Advance ব্যালেন্স নেই।');
        AdvanceBalance::where('user_id', $userId)->increment('total_used', $amount);
    }

    private function refundAdvance(int $userId, float $amount): void
    {
        $remaining = $amount;
        $advanceRecords = Advance::where('user_id', $userId)->where('settled_amount', '>', 0)->orderByDesc('date')->lockForUpdate()->get();

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

        $query = Vendor::select('id', 'name as vendor_name', 'company_name', 'phone', 'wallet_balance')
            ->withSum('projectExpenses as total_due', 'due_amount')
            ->where(function ($q) {
                $q->whereHas('projectExpenses', function ($subQ) {
                    $subQ->where('due_amount', '>', 0);
                })->orWhere('wallet_balance', '>', 0);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $grandTotalDue = ProjectExpense::whereIn('vendor_id', $query->pluck('id'))
                                    ->sum('due_amount');
                                    
        $grandTotalAdvance = clone $query;
        $totalAdvanceAmount = $grandTotalAdvance->sum('wallet_balance');

        $vendorDues = $query->latest('id')->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', [
            'vendorDues' => $vendorDues,
            'grandTotal' => $grandTotalDue, 
            'grandTotalAdvance' => $totalAdvanceAmount 
        ]);
    }
}