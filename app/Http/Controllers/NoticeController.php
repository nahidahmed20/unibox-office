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

        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'like', "%{$request->search}%");
        }

        return Inertia::render('Admin/Notices/Index', [
            'notices' => $query->latest()->get(),
            'filters' => $request->only('search')
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