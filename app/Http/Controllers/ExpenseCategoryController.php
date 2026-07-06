<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseCategory::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $categories = $query
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/ExpenseCategories/Index', [
            'categories' => $categories,
            'filters' => $request->only('search'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories,name',
            'description' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        ExpenseCategory::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $category = ExpenseCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories,name,' . $category->id,
            'description' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $category->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $category = ExpenseCategory::findOrFail($id);
        $category->delete();
        return redirect()->back();
    }
}