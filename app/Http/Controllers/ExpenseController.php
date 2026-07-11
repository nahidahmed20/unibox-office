<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Account;
use App\Models\Advance;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category', 'account', 'logger']);

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhereHas('category', function ($cq) use ($searchTerm) {
                      $cq->where('name', 'like', "%{$searchTerm}%");
                  })
                  ->orWhereHas('account', function ($aq) use ($searchTerm) {
                      $aq->where('name', 'like', "%{$searchTerm}%");
                  })
                  ->orWhereHas('logger', function ($lq) use ($searchTerm) {
                      $lq->where('name', 'like', "%{$searchTerm}%");
                  });
            });
        }

        $perPage = $request->input('per_page', 10);
        if ($perPage === 'all') {
            $perPage = $query->count() ?: 10;
        }

        $expenses = $query->latest()->paginate($perPage)->withQueryString();

        // Dropdown Data
        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')->get();

        // NOTE: Advance no longer has a `given_to` column — it's tied to a user via `user_id`.
        $advances = Advance::with('user:id,name')
            ->where('status', 'unsettled')
            ->select('id', 'user_id', 'amount', 'settled_amount', 'returned_amount')
            ->get()
            ->sortBy('user.name')
            ->values();

        return Inertia::render('Admin/Expenses/Index', [
            'expenses' => $expenses,
            'categories' => $categories,
            'accounts' => $accounts,
            'advances' => $advances,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id',
            'advance_id' => 'nullable|exists:advances,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        if (empty($validated['account_id']) && empty($validated['advance_id'])) {
            return back()->withErrors(['error' => 'Please select either an Account or an Advance as the payment source.']);
        }

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses', 'public');
        }

        $validated['user_id'] = auth()->id();

        try {
            DB::transaction(function () use ($validated) {
                $advance = null;
                $account = null;

                // Validate the payment source BEFORE writing anything
                if (!empty($validated['advance_id'])) {
                    $advance = Advance::findOrFail($validated['advance_id']);
                    $availableDue = $advance->amount - $advance->settled_amount - $advance->returned_amount;

                    if ($validated['amount'] > $availableDue) {
                        throw new \Exception('Amount exceeds the available advance balance!');
                    }
                } elseif (!empty($validated['account_id'])) {
                    $account = Account::findOrFail($validated['account_id']);

                    if ($account->current_balance < $validated['amount']) {
                        throw new \Exception('Selected account does not have sufficient balance!');
                    }
                }

                $expense = Expense::create($validated);

                if ($advance) {
                    $advance->settled_amount += $validated['amount'];
                    if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                        $advance->status = 'settled';
                    }
                    $advance->save();
                } elseif ($account) {
                    $account->decrement('current_balance', $validated['amount']);

                    $expense->transaction()->create([
                        'account_id' => $account->id,
                        'type' => 'debit',
                        'amount' => $validated['amount'],
                        'transaction_date' => $validated['date'],
                        'description' => 'Office Expense: ' . $validated['title'],
                    ]);
                }
            });

            return back()->with('success', 'Expense logged successfully.');
        } catch (\Exception $e) {
            // Clean up the uploaded file since the transaction never went through
            if (!empty($validated['attachment'])) {
                Storage::disk('public')->delete($validated['attachment']);
            }
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'account_id' => 'nullable|exists:accounts,id',
            'advance_id' => 'nullable|exists:advances,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        if (empty($validated['account_id']) && empty($validated['advance_id'])) {
            return back()->withErrors(['error' => 'Please select either an Account or an Advance as the payment source.']);
        }

        $oldAttachment = $expense->attachment;
        $newAttachmentPath = null;

        if ($request->hasFile('attachment')) {
            $newAttachmentPath = $request->file('attachment')->store('expenses', 'public');
            $validated['attachment'] = $newAttachmentPath;
        }

        try {
            DB::transaction(function () use ($validated, $expense) {

                // Step 1: reverse whatever the old payment did
                if ($expense->advance_id) {
                    $oldAdvance = Advance::find($expense->advance_id);
                    if ($oldAdvance) {
                        $oldAdvance->settled_amount -= $expense->amount;
                        if (($oldAdvance->settled_amount + $oldAdvance->returned_amount) < $oldAdvance->amount) {
                            $oldAdvance->status = 'unsettled';
                        }
                        $oldAdvance->save();
                    }
                } elseif ($expense->account_id) {
                    $oldAccount = Account::find($expense->account_id);
                    if ($oldAccount) {
                        $oldAccount->increment('current_balance', $expense->amount);
                    }
                    if ($expense->transaction) {
                        $expense->transaction()->delete();
                    }
                }

                // Step 2: validate and apply the new payment
                if (!empty($validated['advance_id'])) {
                    $newAdvance = Advance::findOrFail($validated['advance_id']);
                    $availableDue = $newAdvance->amount - $newAdvance->settled_amount - $newAdvance->returned_amount;

                    if ($validated['amount'] > $availableDue) {
                        throw new \Exception('Amount exceeds the available advance balance!');
                    }

                    $newAdvance->settled_amount += $validated['amount'];
                    if (($newAdvance->settled_amount + $newAdvance->returned_amount) >= $newAdvance->amount) {
                        $newAdvance->status = 'settled';
                    }
                    $newAdvance->save();
                } elseif (!empty($validated['account_id'])) {
                    $newAccount = Account::findOrFail($validated['account_id']);

                    if ($newAccount->current_balance < $validated['amount']) {
                        throw new \Exception('Selected account does not have sufficient balance!');
                    }

                    $newAccount->decrement('current_balance', $validated['amount']);

                    $expense->transaction()->create([
                        'account_id' => $newAccount->id,
                        'type' => 'debit',
                        'amount' => $validated['amount'],
                        'transaction_date' => $validated['date'],
                        'description' => 'Office Expense: ' . $validated['title'],
                    ]);
                }

                $validated['account_id'] = !empty($validated['account_id']) ? $validated['account_id'] : null;
                $validated['advance_id'] = !empty($validated['advance_id']) ? $validated['advance_id'] : null;

                $expense->update($validated);
            });

            // Only remove the old file once the new record has actually saved
            if ($newAttachmentPath && $oldAttachment) {
                Storage::disk('public')->delete($oldAttachment);
            }

            return back()->with('success', 'Expense updated successfully.');
        } catch (\Exception $e) {
            // Roll back the newly uploaded file since the transaction never went through
            if ($newAttachmentPath) {
                Storage::disk('public')->delete($newAttachmentPath);
            }
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);

        try {
            DB::transaction(function () use ($expense) {
                if ($expense->advance_id) {
                    $advance = Advance::find($expense->advance_id);
                    if ($advance) {
                        $advance->settled_amount -= $expense->amount;
                        if (($advance->settled_amount + $advance->returned_amount) < $advance->amount) {
                            $advance->status = 'unsettled';
                        }
                        $advance->save();
                    }
                } elseif ($expense->account_id) {
                    $account = Account::find($expense->account_id);
                    if ($account) {
                        $account->increment('current_balance', $expense->amount);
                    }
                    if ($expense->transaction) {
                        $expense->transaction()->delete();
                    }
                }

                if ($expense->attachment) {
                    Storage::disk('public')->delete($expense->attachment);
                }

                $expense->delete();
            });

            return back()->with('success', 'Expense deleted and amount restored.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
