<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::query();

        if ($request->has('search') && $request->search != '') {
            $query->where('name', 'like', "%{$request->search}%");
        }

        return Inertia::render('Admin/Departments/Index', [
            'departments' => $query->latest()->get(),
            'filters'     => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:255|unique:departments,name',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        Department::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name'      => 'required|string|max:255|unique:departments,name,' . $department->id,
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active');

        $department->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Department::findOrFail($id)->delete();
        return redirect()->back();
    }
}