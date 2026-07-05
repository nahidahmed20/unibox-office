<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::with('client'); // Relation load kora holo

        // Live Search Logic
        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('status', 'like', "%{$searchTerm}%")
                  ->orWhereHas('client', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        $projects = $query->latest()->get(); 
        
        // Modal e client select korar jonno clients der list pathano holo
        $clients = Client::select('id', 'name')->latest()->get();

        return Inertia::render('Admin/Projects/Index', [
            'projects' => $projects,
            'clients' => $clients,
            'filters' => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'   => 'required|exists:clients,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'nullable|date',
            'deadline'    => 'required|date',
            'budget'      => 'nullable|numeric',
            'status'      => 'required|in:planning,in_progress,completed,on_hold',
        ]);

        Project::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'client_id'   => 'required|exists:clients,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'nullable|date',
            'deadline'    => 'required|date',
            'budget'      => 'nullable|numeric',
            'status'      => 'required|in:planning,in_progress,completed,on_hold',
        ]);

        $project->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $project = Project::findOrFail($id);
        $project->delete();
        return redirect()->back();
    }
}