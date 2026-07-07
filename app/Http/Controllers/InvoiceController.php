<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectExpense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'project']);

        // Search Logic
        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('invoice_number', 'like', "%{$searchTerm}%")
                ->orWhereHas('client', function ($cq) use ($searchTerm) {
                    $cq->where('name', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('project', function ($pq) use ($searchTerm) {
                    $pq->where('title', 'like', "%{$searchTerm}%");
                });
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 10);

        $invoices = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        // Dropdown Data
        $clients = Client::select('id', 'name')
            ->latest()
            ->get();

        $projects = Project::select('id', 'title')
            ->latest()
            ->get();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'clients' => $clients,
            'projects' => $projects,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'      => 'required|exists:clients,id',
            'project_id'     => 'nullable|exists:projects,id',
            'invoice_number' => 'required|string|unique:invoices,invoice_number',
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date',
            'sub_total'      => 'required|numeric|min:0',
            'tax'            => 'nullable|numeric|min:0',
            'discount'       => 'nullable|numeric|min:0',
            'grand_total'    => 'required|numeric|min:0',
            'status'         => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'          => 'nullable|string',
        ]);

        Invoice::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'client_id'      => 'required|exists:clients,id',
            'project_id'     => 'nullable|exists:projects,id',
            'invoice_number' => 'required|string|unique:invoices,invoice_number,' . $invoice->id,
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date',
            'sub_total'      => 'required|numeric|min:0',
            'tax'            => 'nullable|numeric|min:0',
            'discount'       => 'nullable|numeric|min:0',
            'grand_total'    => 'required|numeric|min:0',
            'status'         => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'          => 'nullable|string',
        ]);

        $invoice->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->delete();
        return redirect()->back();
    }

    public function print($id)
    {
        $invoice = Invoice::with('client')->findOrFail($id);
        
        return inertia('Admin/Invoices/Print', [
            'invoice' => $invoice
        ]);
    }

    public function clientDuesReport(Request $request)
    {
        $allClients = Client::with(['invoices' => fn($q) => $q->withSum('payments', 'amount')])->get();
        
        $processedClients = $allClients->map(function($client) {
            $client->total_due = $client->invoices->sum(fn($i) => $i->grand_total - ($i->payments_sum_amount ?? 0));
            return $client;
        })->filter(fn($c) => $c->total_due > 0)->values();

        $perPage = $request->input('per_page', 10);
        $currentPage = \Illuminate\Pagination\LengthAwarePaginator::resolveCurrentPage();
        $items = $processedClients->forPage($currentPage, $perPage);
        
        $paginatedClients = new \Illuminate\Pagination\LengthAwarePaginator(
            $items, $processedClients->count(), $perPage, $currentPage, 
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('Admin/Reports/ClientDues', [
            'clientsWithDues' => $paginatedClients, 
            'grandTotal' => $processedClients->sum('total_due') 
        ]);
    }

    
}