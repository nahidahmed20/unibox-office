<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\User;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = trim($request->input('q', ''));

        if (empty($query) || strlen($query) < 2) {
            return response()->json([]);
        }

        $results = [];

        $projects = Project::where('title', 'like', "%{$query}%")
            ->select('id', 'title', 'status')
            ->take(4)
            ->get();
        foreach ($projects as $item) {
            $results[] = [
                'category' => 'Projects',
                'title'    => $item->title,
                'subtitle' => 'Status: ' . ucfirst($item->status),
                'url'      => route('admin.projects.index', ['search' => $item->title]),
                'icon'     => 'fa-solid fa-rocket text-indigo-500',
            ];
        }

        $clients = Client::where('name', 'like', "%{$query}%")
            ->orWhere('company_name', 'like', "%{$query}%")
            ->select('id', 'name', 'company_name')
            ->take(4)
            ->get();
        foreach ($clients as $item) {
            $results[] = [
                'category' => 'Clients',
                'title'    => $item->name,
                'subtitle' => $item->company_name ?: 'Individual Client',
                'url'      => route('admin.clients.index', ['search' => $item->name]),
                'icon'     => 'fa-solid fa-users-line text-blue-500',
            ];
        }

        $invoices = Invoice::where('invoice_number', 'like', "%{$query}%")
            ->select('id', 'invoice_number', 'grand_total', 'status')
            ->take(4)
            ->get();
        foreach ($invoices as $item) {
            $results[] = [
                'category' => 'Invoices',
                'title'    => 'Invoice #' . $item->invoice_number,
                'subtitle' => 'Amount: ৳' . number_format($item->grand_total, 2) . ' (' . ucfirst($item->status) . ')',
                'url'      => route('admin.invoices.index', ['search' => $item->invoice_number]),
                'icon'     => 'fa-solid fa-file-invoice text-emerald-500',
            ];
        }

        $tasks = Task::where('title', 'like', "%{$query}%")
            ->select('id', 'title', 'priority')
            ->take(4)
            ->get();
        foreach ($tasks as $item) {
            $results[] = [
                'category' => 'Tasks',
                'title'    => $item->title,
                'subtitle' => 'Priority: ' . ucfirst($item->priority),
                'url'      => route('admin.tasks.index', ['search' => $item->title]),
                'icon'     => 'fa-solid fa-list-check text-amber-500',
            ];
        }

        $employees = User::where('name', 'like', "%{$query}%")
            ->whereHas('employeeProfile')
            ->select('id', 'name', 'email')
            ->take(4)
            ->get();
        foreach ($employees as $item) {
            $results[] = [
                'category' => 'Employees',
                'title'    => $item->name,
                'subtitle' => $item->email,
                'url'      => route('admin.employees.index', ['search' => $item->name]),
                'icon'     => 'fa-solid fa-id-badge text-purple-500',
            ];
        }

        return response()->json($results);
    }
}
