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

        if ($request->has('search') && $request->search != '') {
            $query->where('item_name', 'like', "%{$request->search}%");
        }

        return Inertia::render('Admin/Requisitions/Index', [
            'requisitions' => $query->latest()->get(),
            'users' => collect(User::select('id', 'name')->get()),
            'filters' => $request->only('search')
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