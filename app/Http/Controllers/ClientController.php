<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query()
            ->select('clients.*')
            ->addSelect([
                'total_invoiced' => DB::table('invoices')
                    ->whereColumn('client_id', 'clients.id')
                    ->whereNull('deleted_at') 
                    ->selectRaw('COALESCE(SUM(grand_total), 0)'),
                    
                'total_paid' => DB::table('invoice_payments')
                    ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                    ->whereColumn('invoices.client_id', 'clients.id')
                    ->whereNull('invoices.deleted_at')
                    ->selectRaw('COALESCE(SUM(invoice_payments.amount), 0)'),
                    
                'advance_balance' => DB::table('client_advances')
                    ->whereColumn('client_id', 'clients.id')
                    ->selectRaw('COALESCE(SUM(amount), 0)')
            ]);

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('company_name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $clients = $query->latest('clients.created_at')->paginate($perPage)->withQueryString(); 

        $clients->getCollection()->transform(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid;
            
            $client->total_invoiced = $invoiced;
            $client->total_paid = $paid;
            $client->advance_balance = (float) $client->advance_balance;
            
            // Calculate Due
            $client->net_due = max(0, $invoiced - $paid);
            
            return $client;
        });

        return Inertia::render('Admin/Clients/Index', [
            'clients' => $clients
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email'        => 'nullable|email|unique:clients,email',
            'phone'        => 'nullable|string|max:20',
            'address'      => 'nullable|string',
            'website'      => 'nullable|url|max:255',
        ]);

        Client::create($validated);

        return redirect()->back();
    }

    public function show(Client $client)
    {
        $client->append(['financial_summary', 'project_stats']);
        
        $client->load(['projects' => function($q) {
            $q->latest()->take(5);
        }, 'invoices.items']);

        return inertia('Admin/Clients/Show', [
            'client' => $client
        ]);
    }

    public function update(Request $request, string $id)
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email'        => 'nullable|email|unique:clients,email,' . $client->id,
            'phone'        => 'nullable|string|max:20',
            'address'      => 'nullable|string',
            'website'      => 'nullable|url|max:255',
        ]);

        $client->update($validated);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return redirect()->back();
    }
}