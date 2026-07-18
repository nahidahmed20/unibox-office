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
        $query = Project::with('client'); 

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('status', 'like', "%{$searchTerm}%")
                  ->orWhereHas('client', function($cq) use ($searchTerm) {
                      $cq->where('name', 'like', "%{$searchTerm}%");
                  });
            });
        }

        $query->when($request->filled('client_id'), function($q) use ($request) {
            $q->where('client_id', $request->client_id);
        });

        $query->when($request->filled('status'), function($q) use ($request) {
            $q->where('status', $request->status);
        });

        $perPage = $request->get('per_page', 10);
        $projects = $query->latest()->paginate($perPage)->withQueryString(); 

        $clients = Client::select('id', 'name', 'company_name')->latest()->get();
        $isSuperAdmin = auth()->check() && auth()->user()->role === 'Super Admin';

        return Inertia::render('Admin/Projects/Index', [
            'projects' => $projects,
            'clients' => $clients,
            'filters' => $request->only('search', 'client_id', 'status', 'per_page'),
            'is_super_admin' => $isSuperAdmin 
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
        return redirect()->back()->with('success', 'Project created successfully.'); 
    }

    public function update(Request $request, string $id)
    {
        $project = Project::findOrFail($id);

        if ($project->status === 'completed' && auth()->user()->role !== 'Super Admin') {
            abort(403, 'Completed projects can only be modified by Super Admin.');
        }

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
        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function updateStatus(Request $request, string $id)
    {
        $project = Project::findOrFail($id);

        if ($project->status === 'completed' && auth()->user()->role !== 'Super Admin') {
            return back()->withErrors(['status' => 'Only Super Admin can change the status of a completed project.']);
        }

        $validated = $request->validate([
            'status' => 'required|in:planning,in_progress,completed,on_hold',
        ]);

        $project->update($validated);
        return back()->with('success', 'Project status updated.');
    }

    public function destroy(string $id)
    {
        $project = Project::findOrFail($id);

        if ($project->status === 'completed' && auth()->user()->role !== 'Super Admin') {
            abort(403, 'Completed projects can only be deleted by Super Admin.');
        }

        $project->delete();
        return redirect()->back()->with('success', 'Project deleted successfully.');
    }
}