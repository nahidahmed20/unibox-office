<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::with(['project', 'assignee']); 

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                ->orWhere('status', 'like', "%{$searchTerm}%")
                ->orWhereHas('project', function($pq) use ($searchTerm) {
                    $pq->where('title', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('assignee', function($uq) use ($searchTerm) {
                    $uq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); // sanity cap
        }

        $tasks = $query->latest()->paginate($perPage)->withQueryString(); 
        
        // Modal er dropdown er jonno data
        $projects = Project::where('status', '!=', 'completed')->select('id', 'title')->latest()->get();
        $users = User::select('id', 'name')->get();

        return Inertia::render('Admin/Tasks/Index', [
            'tasks' => $tasks,
            'projects' => $projects,
            'users' => $users,
            'filters' => $request->only('search', 'per_page')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id'  => 'required|exists:projects,id',
            'assigned_to' => 'required|exists:users,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'required|in:low,medium,high,urgent',
            'status'      => 'required|in:todo,in_progress,review,done',
            'due_date'    => 'nullable|date',
        ]);

        Task::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'project_id'  => 'required|exists:projects,id',
            'assigned_to' => 'required|exists:users,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'required|in:low,medium,high,urgent',
            'status'      => 'required|in:todo,in_progress,review,done',
            'due_date'    => 'nullable|date',
        ]);

        $task->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $task = Task::findOrFail($id);
        $task->delete();
        return redirect()->back();
    }
}