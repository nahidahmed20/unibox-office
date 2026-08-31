<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Project;
use App\Models\Challan;
use App\Models\ChallanSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ChallanController extends Controller
{
    public function index(Request $request)
    {
        $query = Challan::with(['client', 'items.project']);

        if ($request->filled('challan_number')) {
            $query->where('challan_number', 'like', "%{$request->challan_number}%");
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->input('per_page') === 'all' ? max($query->count(), 1) : min((int) $request->input('per_page', 10), 100000);
        $challans = $query->orderByDesc('challan_date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get();

        return Inertia::render('Admin/Challans/Index', [
            'challans' => $challans,
            'clients'  => $clients,
            'filters'  => $request->only(['challan_number', 'client_id', 'status', 'per_page']),
        ]);
    }

    public function create()
    {
        $clients = Client::select('id', 'name', 'company_name')->get();
        $projects = Project::select('id', 'title', 'client_id', 'quantity', 'unit_type', 'description')->latest()->get();

        return Inertia::render('Admin/Challans/Create', [
            'clients' => $clients,
            'projects' => $projects,
            'nextChallanNumber' => $this->generateNextChallanNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'          => 'required|exists:clients,id',
            'challan_number'     => 'required|string|unique:challans,challan_number',
            'challan_date'       => 'required|date',
            'status'             => 'required|in:pending,delivered,canceled',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.project_id' => 'nullable|exists:projects,id',
            'items.*.item_name'  => 'required|string',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.total'      => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            $challanData = collect($validated)->except(['items'])->toArray();
            $challan = Challan::create($challanData);
            $challan->items()->createMany($validated['items']);
        });

        return redirect()->route('admin.challans.index')->with('success', 'Challan generated successfully.');
    }

    public function edit(string $id)
    {
        $challan = Challan::with(['items.project', 'client'])->findOrFail($id);
        $clients = Client::select('id', 'name', 'company_name')->get();
        $projects = Project::select('id', 'title', 'client_id', 'quantity', 'unit_type', 'description')->latest()->get();

        return Inertia::render('Admin/Challans/Edit', [
            'challan' => $challan,
            'clients' => $clients,
            'projects' => $projects,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $challan = Challan::findOrFail($id);

        $validated = $request->validate([
            'client_id'          => 'required|exists:clients,id',
            'challan_number'     => 'required|string|unique:challans,challan_number,' . $challan->id,
            'challan_date'       => 'required|date',
            'status'             => 'required|in:pending,delivered,canceled',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.project_id' => 'nullable|exists:projects,id',
            'items.*.item_name'  => 'required|string',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.total'      => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($challan, $validated) {
            $challanData = collect($validated)->except(['items'])->toArray();
            $challan->update($challanData);

            $challan->items()->delete();
            $challan->items()->createMany($validated['items']);
        });

        return redirect()->route('admin.challans.index')->with('success', 'Challan updated successfully.');
    }

    public function destroy(string $id)
    {
        $challan = Challan::findOrFail($id);
        $challan->delete();

        return redirect()->back()->with('success', 'Challan deleted successfully.');
    }

    private function generateNextChallanNumber()
    {
        $setting = ChallanSetting::first();
        $prefix = $setting && $setting->prefix ? $setting->prefix : 'CHL-' . date('Y') . '-';

        $lastChallan = Challan::where('challan_number', 'like', "{$prefix}%")->orderBy('id', 'desc')->first();
        if (!$lastChallan) {
            return $prefix . '001';
        }
        $lastNumber = (int) str_replace($prefix, '', $lastChallan->challan_number);
        $nextNumber = $lastNumber + 1;
        return $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public function print($id)
    {
        $challan = Challan::with(['client', 'items.project'])->findOrFail($id);
        $settings = ChallanSetting::first();

        return inertia('Admin/Challans/Print', [
            'challan' => $challan,
            'dbSettings' => $settings
        ]);
    }
}
