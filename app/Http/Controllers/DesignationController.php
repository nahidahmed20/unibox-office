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

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhereHas('department', function ($dq) use ($searchTerm) {
                    $dq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $designations = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $departments = Department::where('is_active', true)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Designations/Index', [
            'designations' => $designations,
            'departments'  => $departments,
            'filters'      => $request->only('search', 'per_page'),
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