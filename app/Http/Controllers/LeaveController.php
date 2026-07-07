<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeaveController extends Controller
{
    public function index(Request $request)
    {
        $query = Leave::with(['user', 'approver']);

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('type', 'like', "%{$searchTerm}%")
                ->orWhereHas('user', function ($uq) use ($searchTerm) {
                    $uq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $leaves = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $users = User::select('id', 'name')->get();

        return Inertia::render('Admin/Leaves/Index', [
            'leaves'  => $leaves,
            'users'   => $users,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'    => 'required|exists:users,id',
            'type'       => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'total_days' => 'required|integer|min:1',
            'reason'     => 'nullable|string',
            'status'     => 'required|in:pending,approved,rejected',
        ]);

        if (in_array($validated['status'], ['approved', 'rejected'])) {
            $validated['approved_by'] = auth()->id();
        }

        Leave::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $leave = Leave::findOrFail($id);

        $validated = $request->validate([
            'user_id'    => 'required|exists:users,id',
            'type'       => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'total_days' => 'required|integer|min:1',
            'reason'     => 'nullable|string',
            'status'     => 'required|in:pending,approved,rejected',
        ]);

        if ($validated['status'] != 'pending' && $leave->status == 'pending') {
            $validated['approved_by'] = auth()->id();
        }

        $leave->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Leave::findOrFail($id)->delete();
        return redirect()->back();
    }
}