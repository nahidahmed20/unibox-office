<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Client;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'project']);

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('invoice_number', 'like', "%{$searchTerm}%")
                  ->orWhereHas('client', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        $invoices = $query->latest()->get(); 
        
        $clients = Client::select('id', 'name')->latest()->get();
        $projects = Project::select('id', 'title')->latest()->get();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'clients' => $clients,
            'projects' => $projects,
            'filters' => $request->only('search')
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
}