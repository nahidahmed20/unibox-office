<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Advance;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ProjectExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = ProjectExpense::with(['project', 'category', 'account', 'vendor']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('vendor', function ($vq) use ($search) {
                      $vq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('project', function ($pq) use ($search) {
                      $pq->where('title', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->input('per_page', 10);
        if ($perPage === 'all') {
            $perPage = $query->count() ?: 10;
        }

        $project_expenses = $query->latest()->paginate($perPage)->withQueryString();

        $projects = Project::where('status', '!=', 'completed')->select('id', 'title')->get();
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')->get();
        $vendors = Vendor::select('id', 'name', 'company_name')->get();

        // NOTE: Advance no longer has a `given_to` column — it's tied to a user via `user_id`.
        $advances = Advance::with('user:id,name')
            ->where('status', 'unsettled')
            ->select('id', 'user_id', 'amount', 'settled_amount', 'returned_amount')
            ->get()
            ->sortBy('user.name')
            ->values();

        return Inertia::render('Admin/ProjectExpenses/Index', compact('project_expenses', 'projects', 'categories', 'accounts', 'vendors', 'advances'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['required', Rule::exists('projects', 'id')->where(function ($query) {
                $query->where('status', '!=', 'completed');
            })],
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id',
            'advance_id' => 'nullable|exists:advances,id',
            'title' => 'required|string|max:255',
            'vendor_id' => 'nullable|exists:vendors,id',
            'total_bill' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'description' => 'nullable|string'
        ]);

        if ($validated['paid_amount'] > 0 && empty($validated['account_id']) && empty($validated['advance_id'])) {
            return back()->withErrors(['error' => 'Please select either an Account or an Advance to pay the bill.']);
        }

        $due_amount = $validated['total_bill'] - $validated['paid_amount'];
        $validated['due_amount'] = $due_amount > 0 ? $due_amount : 0;

        if ($validated['due_amount'] <= 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($validated['paid_amount'] > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = 'due';
        }

        try {
            DB::transaction(function () use ($validated) {
                $advance = null;
                $account = null;

                // Validate the payment source BEFORE writing anything
                if ($validated['paid_amount'] > 0) {
                    if (!empty($validated['advance_id'])) {
                        $advance = Advance::findOrFail($validated['advance_id']);
                        $availableDue = $advance->amount - $advance->settled_amount - $advance->returned_amount;

                        if ($validated['paid_amount'] > $availableDue) {
                            throw new \Exception('Paid amount exceeds the available advance balance!');
                        }
                    } elseif (!empty($validated['account_id'])) {
                        $account = Account::findOrFail($validated['account_id']);

                        if ($account->current_balance < $validated['paid_amount']) {
                            throw new \Exception('Selected account does not have sufficient balance!');
                        }
                    }
                }

                $projectExpense = ProjectExpense::create($validated);

                if ($advance) {
                    $advance->settled_amount += $validated['paid_amount'];
                    if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                        $advance->status = 'settled';
                    }
                    $advance->save();
                } elseif ($account) {
                    $account->decrement('current_balance', $validated['paid_amount']);

                    $projectExpense->transaction()->create([
                        'account_id' => $account->id,
                        'type' => 'debit',
                        'amount' => $validated['paid_amount'],
                        'transaction_date' => $validated['date'],
                        'description' => 'Project Vendor Bill Paid: ' . $validated['title'],
                    ]);
                }
            });

            return back()->with('success', 'Project Expense created successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $projectExpense = ProjectExpense::findOrFail($id);

        $validated = $request->validate([
            'project_id' => ['required', Rule::exists('projects', 'id')->where(function ($query) {
                $query->where('status', '!=', 'completed');
            })],
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id',
            'advance_id' => 'nullable|exists:advances,id',
            'title' => 'required|string|max:255',
            'vendor_id' => 'nullable|exists:vendors,id',
            'total_bill' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'description' => 'nullable|string'
        ]);

        if ($validated['paid_amount'] > 0 && empty($validated['account_id']) && empty($validated['advance_id'])) {
            return back()->withErrors(['error' => 'Please select either an Account or an Advance.']);
        }

        $due_amount = $validated['total_bill'] - $validated['paid_amount'];
        $validated['due_amount'] = $due_amount > 0 ? $due_amount : 0;
        $validated['payment_status'] = $validated['due_amount'] <= 0 ? 'paid' : ($validated['paid_amount'] > 0 ? 'partial' : 'due');

        try {
            DB::transaction(function () use ($validated, $projectExpense) {

                // Step 1: reverse whatever the old payment did
                if ($projectExpense->paid_amount > 0) {
                    if ($projectExpense->advance_id) {
                        $oldAdvance = Advance::find($projectExpense->advance_id);
                        if ($oldAdvance) {
                            $oldAdvance->settled_amount -= $projectExpense->paid_amount;
                            if (($oldAdvance->settled_amount + $oldAdvance->returned_amount) < $oldAdvance->amount) {
                                $oldAdvance->status = 'unsettled';
                            }
                            $oldAdvance->save();
                        }
                    } elseif ($projectExpense->account_id) {
                        $oldAccount = Account::find($projectExpense->account_id);
                        if ($oldAccount) {
                            $oldAccount->increment('current_balance', $projectExpense->paid_amount);
                        }
                        if ($projectExpense->transaction) {
                            $projectExpense->transaction()->delete();
                        }
                    }
                }

                // Step 2: validate and apply the new payment
                if ($validated['paid_amount'] > 0) {
                    if (!empty($validated['advance_id'])) {
                        $newAdvance = Advance::findOrFail($validated['advance_id']);
                        $availableDue = $newAdvance->amount - $newAdvance->settled_amount - $newAdvance->returned_amount;

                        if ($validated['paid_amount'] > $availableDue) {
                            throw new \Exception('Paid amount exceeds the available advance balance!');
                        }

                        $newAdvance->settled_amount += $validated['paid_amount'];
                        if (($newAdvance->settled_amount + $newAdvance->returned_amount) >= $newAdvance->amount) {
                            $newAdvance->status = 'settled';
                        }
                        $newAdvance->save();
                    } elseif (!empty($validated['account_id'])) {
                        $newAccount = Account::findOrFail($validated['account_id']);

                        if ($newAccount->current_balance < $validated['paid_amount']) {
                            throw new \Exception('Selected account does not have sufficient balance!');
                        }

                        $newAccount->decrement('current_balance', $validated['paid_amount']);

                        $projectExpense->transaction()->create([
                            'account_id' => $newAccount->id,
                            'type' => 'debit',
                            'amount' => $validated['paid_amount'],
                            'transaction_date' => $validated['date'],
                            'description' => 'Project Vendor Bill Paid: ' . $validated['title'],
                        ]);
                    }
                }

                $projectExpense->update($validated);
            });

            return back()->with('success', 'Project Expense updated successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $projectExpense = ProjectExpense::findOrFail($id);

        try {
            DB::transaction(function () use ($projectExpense) {
                if ($projectExpense->paid_amount > 0) {
                    if ($projectExpense->advance_id) {
                        $advance = Advance::find($projectExpense->advance_id);
                        if ($advance) {
                            $advance->settled_amount -= $projectExpense->paid_amount;
                            if (($advance->settled_amount + $advance->returned_amount) < $advance->amount) {
                                $advance->status = 'unsettled';
                            }
                            $advance->save();
                        }
                    } elseif ($projectExpense->account_id) {
                        $account = Account::find($projectExpense->account_id);
                        if ($account) {
                            $account->increment('current_balance', $projectExpense->paid_amount);
                        }
                        if ($projectExpense->transaction) {
                            $projectExpense->transaction()->delete();
                        }
                    }
                }

                $projectExpense->delete();
            });

            return back()->with('success', 'Project Expense deleted successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function vendorDuesReport(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        $query = ProjectExpense::with('vendor')
            ->select('vendor_id', DB::raw('MIN(id) as id'), DB::raw('SUM(due_amount) as total_due'))
            ->where('due_amount', '>', 0)
            ->whereNotNull('vendor_id')
            ->groupBy('vendor_id')
            ->orderByDesc('total_due');

        if ($search) {
            $query->whereHas('vendor', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        if ($perPage === 'all') {
            $perPage = $query->count() ?: 10;
        }

        $vendorDues = $query->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', compact('vendorDues'));
    }
}
