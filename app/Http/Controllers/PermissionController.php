<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Inertia\Inertia;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        $query = Permission::query();

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%");
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $permissions = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Permissions/Index', [
            'permissions' => $permissions,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request) {
        $request->validate(['name' => 'required|unique:permissions,name']);
        Permission::create(['name' => $request->name]);
        return redirect()->back()->with('status', 'Permission created successfully.');
    }

    public function update(Request $request, Permission $permission) {
        $request->validate(['name' => 'required|unique:permissions,name,'.$permission->id]);
        $permission->update(['name' => $request->name]);
        return redirect()->back()->with('status', 'Permission updated successfully.');
    }

    public function destroy(Permission $permission) {
        $permission->delete();
        return redirect()->back()->with('status', 'Permission deleted successfully.');
    }
}