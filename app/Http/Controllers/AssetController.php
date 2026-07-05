<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with('assignee');

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('asset_code', 'like', "%{$searchTerm}%")
                  ->orWhereHas('assignee', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        $assets = $query->latest()->get(); 
        $users = User::select('id', 'name')->get();

        return Inertia::render('Admin/Assets/Index', [
            'assets' => $assets,
            'users'  => $users,
            'filters' => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'asset_code'     => 'required|string|unique:assets,asset_code',
            'serial_number'  => 'nullable|string',
            'purchase_date'  => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        Asset::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $asset = Asset::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'asset_code'     => 'required|string|unique:assets,asset_code,' . $asset->id,
            'serial_number'  => 'nullable|string',
            'purchase_date'  => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        $asset->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Asset::findOrFail($id)->delete();
        return redirect()->back();
    }
}