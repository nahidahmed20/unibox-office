<?php

namespace App\Http\Controllers;

use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RequisitionController extends Controller
{
    public function index(Request $request)
    {
        $query = Requisition::with(['user', 'approver']);

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('item_name', 'like', "%{$searchTerm}%")
                ->orWhereHas('user', function ($uq) use ($searchTerm) {
                    $uq->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('approver', function ($aq) use ($searchTerm) {
                    $aq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Pagination
        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $requisitions = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Requisitions/Index', [
            'requisitions' => $requisitions,
            'users' => $users,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'estimated_cost' => 'nullable|numeric|min:0',
            'reason' => 'required|string',
            'status' => 'required|in:pending,approved,rejected,purchased',
        ]);

        if (in_array($validated['status'], ['approved', 'rejected', 'purchased'])) {
            $validated['approved_by'] = auth()->id();
        }

        Requisition::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $req = Requisition::findOrFail($id);
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'estimated_cost' => 'nullable|numeric|min:0',
            'reason' => 'required|string',
            'status' => 'required|in:pending,approved,rejected,purchased',
        ]);

        if ($validated['status'] != 'pending' && $req->status == 'pending') {
            $validated['approved_by'] = auth()->id();
        }

        $req->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Requisition::findOrFail($id)->delete();
        return redirect()->back();
    }
}