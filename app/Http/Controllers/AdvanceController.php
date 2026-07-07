<?php

namespace App\Http\Controllers;

use App\Models\Advance;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdvanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Advance::query();

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('given_to', 'like', "%{$searchTerm}%")
                ->orWhere('purpose', 'like', "%{$searchTerm}%");
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $advances = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Advances/Index', [
            'advances' => $advances,
            'filters'  => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'given_to' => 'required|string|max:255',
            'amount'   => 'required|numeric|min:1',
            'date'     => 'required|date',
            'purpose'  => 'nullable|string|max:255',
            'status'   => 'required|in:unsettled,settled',
            'notes'    => 'nullable|string',
        ]);

        $validated['logged_by'] = auth()->id();
        Advance::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $advance = Advance::findOrFail($id);

        $validated = $request->validate([
            'given_to' => 'required|string|max:255',
            'amount'   => 'required|numeric|min:1',
            'date'     => 'required|date',
            'purpose'  => 'nullable|string|max:255',
            'status'   => 'required|in:unsettled,settled',
            'notes'    => 'nullable|string',
        ]);

        $advance->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Advance::findOrFail($id)->delete();
        return redirect()->back();
    }
}