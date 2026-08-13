<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::with(['client', 'projectManager']); 

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('status', 'like', "%{$searchTerm}%")
                  ->orWhereHas('client', function($cq) use ($searchTerm) {
                      $cq->where('name', 'like', "%{$searchTerm}%")
                         ->orWhere('company_name', 'like', "%{$searchTerm}%"); 
                  });
            });
        }

        $query->when($request->filled('client_id'), function($q) use ($request) {
            $q->where('client_id', $request->client_id);
        });

        $query->when($request->filled('status'), function($q) use ($request) {
            $q->where('status', $request->status);
        });

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->get('per_page', 10), 100000); 
        }

        $projects = $query->latest('created_at')->paginate($perPage)->withQueryString(); 

        $clients = Client::select('id', 'name', 'company_name')->latest()->get();
        $managers = User::select('id', 'name')->latest()->get(); 
        
        $isSuperAdmin = auth()->check() && (auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin'));

        return Inertia::render('Admin/Projects/Index', [
            'projects'       => $projects,
            'clients'        => $clients,
            'managers'       => $managers,
            'filters'        => $request->only('search', 'client_id', 'status', 'per_page'),
            'is_super_admin' => $isSuperAdmin 
        ]);
    }

    public function create()
    {
        $clients = Client::select('id', 'name', 'company_name')->latest()->get();
        $managers = User::select('id', 'name')->latest()->get(); 

        return Inertia::render('Admin/Projects/Create', [
            'clients'  => $clients,
            'managers' => $managers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'                  => 'required|exists:clients,id',
            'project_manager_id'         => 'nullable|exists:users,id',
            'projects'                   => 'required|array|min:1',
            'projects.*.title'           => 'required|string|max:255',
            'projects.*.description'     => 'nullable|string',
            'projects.*.quantity'        => 'nullable|numeric|min:0',
            'projects.*.unit_type'       => 'nullable|string|max:50',
            'projects.*.start_date'      => 'nullable|date',
            'projects.*.deadline'        => 'required|date',
            'projects.*.budget'          => 'nullable|numeric|min:0',
            'projects.*.status'          => 'required|in:planning,in_progress,completed,on_hold',
            'projects.*.priority'        => 'nullable|in:low,medium,high,urgent',
            'projects.*.progress'        => 'nullable|integer|min:0|max:100',
            'projects.*.repo_link'       => 'nullable|url|max:255',
            'projects.*.live_url'        => 'nullable|url|max:255',
        ]);

        foreach ($request->projects as $projectItem) {
            $projectItem['client_id'] = $request->client_id;
            $projectItem['project_manager_id'] = $request->project_manager_id;
            $projectItem['priority'] = $projectItem['priority'] ?? 'medium';
            $projectItem['progress'] = $projectItem['progress'] ?? 0;

            Project::create($projectItem);
        }
        
        return redirect()->route('admin.projects.index')->with('success', count($request->projects) . ' Projects created successfully.'); 
    }

    public function edit($id)
    {
        $project = Project::findOrFail($id);
        $clients = Client::select('id', 'name', 'company_name')->latest()->get();
        $managers = User::select('id', 'name')->latest()->get(); 

        return Inertia::render('Admin/Projects/Edit', [
            'project'  => $project,
            'clients'  => $clients,
            'managers' => $managers,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $project = Project::findOrFail($id);
        $isSuperAdmin = auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin');
        
        if($project->status === 'completed' && !$isSuperAdmin) {
            abort(403, 'Completed projects can only be modified by Super Admin.');
        }

        $validated = $request->validate([
            'client_id'          => 'required|exists:clients,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'title'              => 'required|string|max:255',
            'description'        => 'nullable|string',
            'quantity'           => 'nullable|numeric|min:0',
            'unit_type'          => 'nullable|string|max:50',
            'start_date'         => 'nullable|date',
            'deadline'           => 'required|date',
            'budget'             => 'nullable|numeric|min:0',
            'status'             => 'required|in:planning,in_progress,completed,on_hold',
            'priority'           => 'nullable|in:low,medium,high,urgent',
            'progress'           => 'nullable|integer|min:0|max:100',
            'repo_link'          => 'nullable|url|max:255',
            'live_url'           => 'nullable|url|max:255',
        ]);

        $project->update($validated);
        
        return redirect()->route('admin.projects.index')->with('success', 'Project updated successfully.');
    }

    public function updateStatus(Request $request, string $id)
    {
        $project = Project::findOrFail($id);
        $isSuperAdmin = auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin');

        if($project->status === 'completed' && !$isSuperAdmin) {
            return back()->withErrors([
                'status' => 'Only Super Admin can change the status of a completed project.'
            ]);
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
        $isSuperAdmin = auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin');

        if ($project->status === 'completed' && !$isSuperAdmin) {
            abort(403, 'Completed projects can only be deleted by Super Admin.');
        }

        $project->delete(); 
        
        return redirect()->back()->with('success', 'Project deleted successfully.');
    }
}