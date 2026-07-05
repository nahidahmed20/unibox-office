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

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('type', 'like', "%{$searchTerm}%")
                  ->orWhereHas('user', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        return Inertia::render('Admin/Leaves/Index', [
            'leaves'  => $query->latest()->get(),
            'users'   => User::select('id', 'name')->get(),
            'filters' => $request->only('search')
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