<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index() {
        return Inertia::render('Admin/Roles/Index', [
            'roles' => Role::with('permissions')->latest()->get(),
            'permissions' => Permission::all()
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required|unique:roles,name',
            'permissions' => 'array'
        ]);

        $role = Role::create(['name' => $request->name]);
        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }
        return redirect()->back()->with('status', 'Role created successfully.');
    }

    public function update(Request $request, Role $role) {
        $request->validate([
            'name' => 'required|unique:roles,name,'.$role->id,
            'permissions' => 'array'
        ]);

        $role->update(['name' => $request->name]);
        $role->syncPermissions($request->permissions ?? []);
        return redirect()->back()->with('status', 'Role updated successfully.');
    }

    public function destroy(Role $role) {
        if ($role->name === 'Super Admin') {
            return redirect()->back()->with('error', 'Super Admin role cannot be deleted.');
        }
        $role->delete();
        return redirect()->back()->with('status', 'Role deleted successfully.');
    }
}