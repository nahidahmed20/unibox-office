<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('email', 'like', "%{$searchTerm}%")
                ->orWhereHas('roles', function ($rq) use ($searchTerm) {
                    $rq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $users = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $roles = Role::select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Users/Index', [
            'users'   => $users,
            'roles'   => $roles,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'roles' => 'required|array'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->syncRoles($request->roles);
        return redirect()->back()->with('status', 'User created successfully.');
    }

    public function update(Request $request, User $user) {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$user->id,
            'roles' => 'required|array'
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
        ]);

        if ($request->filled('password')) {
            $request->validate(['password' => 'string|min:8']);
            $user->update(['password' => Hash::make($request->password)]);
        }

        $user->syncRoles($request->roles);
        return redirect()->back()->with('status', 'User updated successfully.');
    }

    public function destroy(User $user) {
        if ($user->hasRole('Super Admin') && User::role('Super Admin')->count() <= 1) {
            return redirect()->back()->with('error', 'The only Super Admin cannot be deleted.');
        }
        $user->delete();
        return redirect()->back()->with('status', 'User deleted successfully.');
    }
}