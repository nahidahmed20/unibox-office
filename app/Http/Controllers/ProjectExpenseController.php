<?php

namespace App\Http\Controllers;

use App\Models\ProjectExpense;
use App\Models\Project;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;


class ProjectExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = ProjectExpense::with(['project', 'category', 'logger']);

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('vendor_name', 'like', "%{$searchTerm}%") 
                  ->orWhereHas('project', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%"); 
                  });
        }

        return Inertia::render('Admin/ProjectExpenses/Index', [
            'project_expenses' => $query->latest()->get(), 
            'projects'   => Project::select('id', 'title')->get(), 
            'categories' => ExpenseCategory::select('id', 'name')->get(),
            'filters'    => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id'          => 'required|exists:projects,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'title'               => 'required|string|max:255',
            'vendor_name'         => 'nullable|string|max:255', 
            'total_bill'          => 'required|numeric|min:0',  
            'paid_amount'         => 'required|numeric|min:0',  
            'date'                => 'required|date',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        $validated['due_amount'] = $validated['total_bill'] - $validated['paid_amount'];
        $validated['amount'] = $validated['paid_amount']; 
        $validated['logged_by'] = auth()->id();

        if ($validated['due_amount'] <= 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($validated['paid_amount'] > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = 'due';
        }

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('expenses/projects', 'public');
        }

        ProjectExpense::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $expense = ProjectExpense::findOrFail($id);

        $validated = $request->validate([
            'project_id'          => 'required|exists:projects,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'title'               => 'required|string|max:255',
            'vendor_name'         => 'nullable|string|max:255', 
            'total_bill'          => 'required|numeric|min:0',  
            'paid_amount'         => 'required|numeric|min:0', 
            'date'                => 'required|date',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        $validated['due_amount'] = $validated['total_bill'] - $validated['paid_amount'];
        $validated['amount'] = $validated['paid_amount']; 

        if ($validated['due_amount'] <= 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($validated['paid_amount'] > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = 'due';
        }

        if ($request->hasFile('attachment')) {
            if ($expense->attachment) Storage::disk('public')->delete($expense->attachment);
            $validated['attachment'] = $request->file('attachment')->store('expenses/projects', 'public');
        }

        $expense->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $expense = ProjectExpense::findOrFail($id);
        if ($expense->attachment) Storage::disk('public')->delete($expense->attachment);
        $expense->delete();
        return redirect()->back();
    }
}