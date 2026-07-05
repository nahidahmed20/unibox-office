<?php

namespace App\Http\Controllers;

use App\Models\Designation;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DesignationController extends Controller
{
    public function index(Request $request)
    {
        $query = Designation::with('department');

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('name', 'like', "%{$searchTerm}%")
                  ->orWhereHas('department', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        return Inertia::render('Admin/Designations/Index', [
            'designations' => $query->latest()->get(),
            'departments'  => Department::where('is_active', true)->select('id', 'name')->get(),
            'filters'      => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'name'          => 'required|string|max:255',
        ]);

        Designation::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $designation = Designation::findOrFail($id);

        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'name'          => 'required|string|max:255',
        ]);

        $designation->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Designation::findOrFail($id)->delete();
        return redirect()->back();
    }
}