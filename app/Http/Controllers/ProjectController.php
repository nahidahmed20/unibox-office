<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::with(['client', 'projectManager', 'items']);

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

        $query->when($request->filled('client_id'), fn($q) => $q->where('client_id', $request->client_id));
        $query->when($request->filled('status'), fn($q) => $q->where('status', $request->status));

        if ($request->input('per_page') === 'all') {
            $totalCount = clone $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
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
            'client_id'          => 'required|exists:clients,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'title'              => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'deadline'           => 'required|date',
            'status'             => 'required|in:planning,in_progress,completed,on_hold',
            'priority'           => 'nullable|in:low,medium,high,urgent',
            'progress'           => 'nullable|integer|min:0|max:100',
            'repo_link'          => 'nullable|url|max:255',
            'live_url'           => 'nullable|url|max:255',
            'items'              => 'required|array|min:1',
            'items.*.item_name'  => 'required|string|max:255',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_type'  => 'required|string|max:50',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        if ($validated['status'] === 'completed') {
            $validated['progress'] = 100;
        }

        DB::transaction(function () use ($validated) {
            $projectData = collect($validated)->except(['items'])->toArray();
            $projectData['budget'] = collect($validated['items'])->sum('total');

            $project = Project::create($projectData);
            $project->items()->createMany($validated['items']);
        });

        return redirect()->route('admin.projects.index')->with('success', 'Project successfully created with items.');
    }

    public function edit($id)
    {
        $project = Project::with('items')->findOrFail($id);
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
            'start_date'         => 'nullable|date',
            'deadline'           => 'required|date',
            'status'             => 'required|in:planning,in_progress,completed,on_hold',
            'priority'           => 'nullable|in:low,medium,high,urgent',
            'progress'           => 'nullable|integer|min:0|max:100',
            'repo_link'          => 'nullable|url|max:255',
            'live_url'           => 'nullable|url|max:255',
            'items'              => 'required|array|min:1',
            'items.*.item_name'  => 'required|string|max:255',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_type'  => 'required|string|max:50',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        if ($validated['status'] === 'completed') {
            $validated['progress'] = 100;
        }

        DB::transaction(function () use ($project, $validated) {
            $projectData = collect($validated)->except(['items'])->toArray();
            $projectData['budget'] = collect($validated['items'])->sum('total');

            $project->update($projectData);

            $project->items()->delete();
            $project->items()->createMany($validated['items']);
        });

        return redirect()->route('admin.projects.index')->with('success', 'Project updated successfully.');
    }

    public function updateStatus(Request $request, string $id)
    {
        $project = Project::findOrFail($id);
        $isSuperAdmin = auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin');

        if($project->status === 'completed' && !$isSuperAdmin) {
            return back()->withErrors(['status' => 'Only Super Admin can change the status of a completed project.']);
        }

        $validated = $request->validate([
            'status' => 'required|in:planning,in_progress,completed,on_hold',
        ]);

        if ($validated['status'] === 'completed') {
            $validated['progress'] = 100;
        } elseif ($validated['status'] === 'planning') {
            $validated['progress'] = 0;
        } elseif ($project->status === 'completed' && in_array($validated['status'], ['in_progress', 'on_hold'])) {
            $validated['progress'] = 90;
        }

        $project->update($validated);

        return back()->with('success', 'Project status updated.');
    }

    public function destroy(string $id)
    {
        $project = Project::findOrFail($id);
        $isSuperAdmin = auth()->user()->hasRole('Super Admin') || auth()->user()->hasRole('super-admin');

        $hasInvoice = DB::table('invoice_items')->where('project_id', $id)->exists();

        if ($hasInvoice) {
            return redirect()->back()->with('error', 'This project cannot be deleted because an invoice has already been generated for it.');
        }

        if ($project->status === 'completed' && !$isSuperAdmin) {
            abort(403, 'Completed projects can only be deleted by Super Admin.');
        }

        $project->delete();

        return redirect()->back()->with('success', 'Project deleted successfully.');
    }
}
