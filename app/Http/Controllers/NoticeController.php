<?php

namespace App\Http\Controllers;

use App\Models\Notice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NoticeController extends Controller
{
    public function index(Request $request)
    {
        $query = Notice::with('creator');

        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                ->orWhereHas('creator', function ($cq) use ($searchTerm) {
                    $cq->where('name', 'like', "%{$searchTerm}%");
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

        $notices = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Notices/Index', [
            'notices' => $notices,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['is_active'] = $request->boolean('is_active');

        Notice::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $notice = Notice::findOrFail($id);
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active');
        $notice->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Notice::findOrFail($id)->delete();
        return redirect()->back();
    }
}