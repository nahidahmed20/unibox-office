<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Client::query();

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('company_name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
                ->orWhere('phone', 'like', "%{$request->search}%");
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); // sanity cap
        }

        $clients = $query->latest()->paginate($perPage)->withQueryString(); 

        return Inertia::render('Admin/Clients/Index', [
            'clients' => $clients
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        // Modal use korchi, tai ei method dorkar nei
    }

    /**
     * Store a newly created resource in storage.
     */
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

        return redirect()->back(); // Inertia auto response handle korbe
    }

    /**
     * Display the specified resource.
     */
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

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        // Modal use korchi, tai ei method dorkar nei
    }

    /**
     * Update the specified resource in storage.
     */
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

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return redirect()->back();
    }
}