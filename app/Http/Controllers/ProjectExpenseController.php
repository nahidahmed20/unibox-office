<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Vendor; // Vendor মডেল ইমপোর্ট করা হলো
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ProjectExpenseController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        
        // vendor রিলেশন লোড করা হলো
        $query = ProjectExpense::with(['project', 'category', 'account', 'vendor']);

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where('title', 'like', "%{$search}%")
                  ->orWhereHas('vendor', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('project', function($q) use ($search) {
                      $q->where('title', 'like', "%{$search}%");
                  });
        }

        // get() এর পরিবর্তে paginate() ব্যবহার করা হলো ফ্রন্টএন্ডের সাথে মিল রাখার জন্য
        $project_expenses = $query->latest()->paginate($perPage)->withQueryString(); 
        
        $projects = Project::where('status', '!=', 'completed')->select('id', 'title')->get();
        $categories = ExpenseCategory::select('id', 'name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();
        $vendors = Vendor::select('id', 'name', 'company_name')->get(); // ভেন্ডর ডেটা

        return Inertia::render('Admin/ProjectExpenses/Index', compact('project_expenses', 'projects', 'categories', 'accounts', 'vendors'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => [
                'required',
                Rule::exists('projects', 'id')->where(function ($query) {
                    $query->where('status', '!=', 'completed'); 
                }),
            ],
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id|required_if:paid_amount,>,0',
            'title' => 'required|string|max:255',
            'vendor_id' => 'nullable|exists:vendors,id', // vendor_name এর বদলে vendor_id
            'total_bill' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'description' => 'nullable|string'
        ]);

        $due_amount = $request->total_bill - $request->paid_amount;
        $validated['due_amount'] = $due_amount > 0 ? $due_amount : 0;
        
        if ($validated['due_amount'] <= 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($request->paid_amount > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = 'due';
        }

        DB::transaction(function () use ($validated, $request) {
            $projectExpense = ProjectExpense::create($validated);

            if ($request->paid_amount > 0 && $request->account_id) {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $request->paid_amount);

                $projectExpense->transaction()->create([
                    'account_id' => $account->id,
                    'type' => 'debit',
                    'amount' => $request->paid_amount,
                    'transaction_date' => $request->date,
                    'description' => 'Project Vendor Bill Paid: ' . $request->title,
                ]);
            }
        });

        return back()->with('success', 'Project Expense created successfully.');
    }

    public function update(Request $request, $id)
    {
        $projectExpense = ProjectExpense::findOrFail($id);

        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id|required_if:paid_amount,>,0',
            'title' => 'required|string|max:255',
            'vendor_id' => 'nullable|exists:vendors,id', // vendor_name এর বদলে vendor_id
            'total_bill' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'description' => 'nullable|string'
        ]);

        $due_amount = $request->total_bill - $request->paid_amount;
        $validated['due_amount'] = $due_amount > 0 ? $due_amount : 0;
        
        if ($validated['due_amount'] <= 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($request->paid_amount > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = 'due';
        }

        DB::transaction(function () use ($validated, $request, $projectExpense) {
            if ($projectExpense->account_id != $request->account_id || $projectExpense->paid_amount != $request->paid_amount) {
                
                if ($projectExpense->paid_amount > 0 && $projectExpense->account_id) {
                    $oldAccount = Account::find($projectExpense->account_id);
                    if ($oldAccount) {
                        $oldAccount->increment('current_balance', $projectExpense->paid_amount);
                    }
                }

                if ($request->paid_amount > 0) {
                    $newAccount = Account::find($request->account_id);
                    if ($newAccount) {
                        $newAccount->decrement('current_balance', $request->paid_amount);
                    }

                    if ($projectExpense->transaction) {
                        $projectExpense->transaction()->update([
                            'account_id' => $request->account_id,
                            'amount' => $request->paid_amount,
                            'transaction_date' => $request->date,
                        ]);
                    } else {
                        $projectExpense->transaction()->create([
                            'account_id' => $request->account_id,
                            'type' => 'debit',
                            'amount' => $request->paid_amount,
                            'transaction_date' => $request->date,
                            'description' => 'Project Vendor Bill Paid: ' . $request->title,
                        ]);
                    }
                } else {
                    if ($projectExpense->transaction) {
                        $projectExpense->transaction()->delete();
                    }
                }
            }

            $projectExpense->update($validated);
        });

        return back()->with('success', 'Project Expense updated successfully.');
    }

    public function destroy($id)
    {
        $projectExpense = ProjectExpense::findOrFail($id);

        DB::transaction(function () use ($projectExpense) {
            if ($projectExpense->paid_amount > 0 && $projectExpense->account_id) {
                $account = Account::find($projectExpense->account_id);
                if ($account) {
                    $account->increment('current_balance', $projectExpense->paid_amount);
                }
            }

            if ($projectExpense->transaction) {
                $projectExpense->transaction()->delete();
            }

            $projectExpense->delete();
        });

        return back()->with('success', 'Project Expense deleted successfully.');
    }

    public function vendorDuesReport(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        // Update vendor_name to use vendor relationship
        $query = ProjectExpense::with('vendor')
            ->select('vendor_id', DB::raw('SUM(due_amount) as total_due'))
            ->where('due_amount', '>', 0)
            ->whereNotNull('vendor_id')
            ->groupBy('vendor_id');

        if ($search) {
            $query->whereHas('vendor', function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        $vendorDues = $query->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', compact('vendorDues'));
    }
}