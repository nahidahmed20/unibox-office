<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientAdvance;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Project;
use App\Models\InvoiceSetting;
use App\Models\ProjectExpense;
use App\Models\Vendor;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'items.project', 'payments'])->withSum('payments', 'amount');

        // 🟢 Separate Filters Logic
        if ($request->filled('invoice_number')) {
            $query->where('invoice_number', 'like', "%{$request->invoice_number}%");
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('project_name')) {
            $query->whereHas('items', function ($q) use ($request) {
                $q->where('item_name', 'like', "%{$request->project_name}%")
                  ->orWhereHas('project', function ($pq) use ($request) {
                      $pq->where('title', 'like', "%{$request->project_name}%");
                  });
            });
        }

        if ($request->filled('year')) {
            $query->whereYear('invoice_date', $request->year);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('invoice_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('invoice_date', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page') === 'all' ? ($query->count() > 0 ? $query->count() : 1) : min((int) $request->input('per_page', 10), 100000);

        $invoices = $query->orderByDesc('invoice_date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get();
        $years = Invoice::selectRaw('DISTINCT YEAR(invoice_date) as year')->orderByDesc('year')->pluck('year');

        $invoicedProjectIds = DB::table('invoice_items')->whereNotNull('project_id')->pluck('project_id')->toArray();
        $uninvoicedProjects = Project::with('client:id,name,company_name')
            ->select('id', 'title', 'client_id', 'budget', 'created_at')
            ->whereNotIn('id', $invoicedProjectIds)
            ->latest()
            ->get();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'clients'  => $clients,
            'years'    => $years,
            'uninvoicedProjects' => $uninvoicedProjects,
            'filters'  => $request->only([
                'invoice_number', 'client_id', 'status', 'project_name', 'year', 'date_from', 'date_to', 'per_page'
            ]),
        ]);
    }

    public function create()
    {
        $clients = Client::select('id', 'name', 'company_name')
            ->withSum('clientAdvances as total_advance', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->get()
            ->map(function ($client) {
                $client->available_advance = ($client->total_advance ?? 0) - ($client->total_used ?? 0);
                return $client;
            });

        $invoicedProjectIds = DB::table('invoice_items')->whereNotNull('project_id')->pluck('project_id')->toArray();

        $projects = Project::select('id', 'title', 'client_id', 'budget', 'quantity', 'unit_type', 'description', 'created_at')
                    ->whereNotIn('id', $invoicedProjectIds)
                    ->latest()->get();

        return Inertia::render('Admin/Invoices/Create', [
            'clients' => $clients,
            'projects' => $projects,
            'nextInvoiceNumber' => $this->generateNextInvoiceNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'          => 'required|exists:clients,id',
            'invoice_number'     => 'required|string|unique:invoices,invoice_number',
            'invoice_date'       => 'required|date',
            'due_date'           => 'required|date',
            'sub_total'          => 'required|numeric|min:0',
            'tax'                => 'nullable|numeric',
            'discount'           => 'nullable|numeric|min:0',
            'grand_total'        => 'required|numeric|min:0',
            'status'             => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'              => 'nullable|string',
            'use_advance_amount' => 'nullable|numeric|min:0',
            'items'              => 'required|array|min:1',
            'items.*.project_id' => 'nullable|exists:projects,id',
            'items.*.item_name'  => 'required|string',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            $invoiceData['advance_used'] = 0;

            $invoice = Invoice::create($invoiceData);
            $invoice->items()->createMany($validated['items']);

            $this->applyClientAdvance($invoice, $validated['client_id'], (float) ($validated['use_advance_amount'] ?? 0));

            $totalPaid = InvoicePayment::where('invoice_id', $invoice->id)->sum('amount');
            if ($totalPaid >= $invoice->grand_total) {
                $invoice->update(['status' => 'paid']);
            } elseif ($totalPaid > 0) {
                $invoice->update(['status' => 'partially_paid']);
            }
        });

        return redirect()->route('admin.invoices.index')->with('success', 'Invoice generated successfully.');
    }

    public function edit(string $id)
    {
        $invoice = Invoice::with(['items.project', 'client'])->withSum('payments', 'amount')->findOrFail($id);

        $clients = Client::select('id', 'name', 'company_name')->withSum('clientAdvances as total_advance', 'amount')->withSum('clientAdvances as total_used', 'used_amount')->get()->map(function ($client) {
            $client->available_advance = ($client->total_advance ?? 0) - ($client->total_used ?? 0);
            return $client;
        });

        $invoicedProjectIds = DB::table('invoice_items')->whereNotNull('project_id')->where('invoice_id', '!=', $id)->pluck('project_id')->toArray();
        $projects = Project::select('id', 'title', 'client_id', 'budget', 'quantity', 'unit_type', 'description', 'created_at')
                    ->whereNotIn('id', $invoicedProjectIds)
                    ->latest()->get();

        return Inertia::render('Admin/Invoices/Edit', [
            'invoice' => $invoice,
            'clients' => $clients,
            'projects' => $projects,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'client_id'          => 'required|exists:clients,id',
            'invoice_number'     => 'required|string|unique:invoices,invoice_number,' . $invoice->id,
            'invoice_date'       => 'required|date',
            'due_date'           => 'required|date',
            'sub_total'          => 'required|numeric|min:0',
            'tax'                => 'nullable|numeric',
            'discount'           => 'nullable|numeric|min:0',
            'grand_total'        => 'required|numeric|min:0',
            'use_advance_amount' => 'nullable|numeric|min:0',
            'status'             => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.project_id' => 'nullable|exists:projects,id',
            'items.*.item_name'  => 'required|string',
            'items.*.description'=> 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($invoice, $validated) {
            $this->reverseAdvancePayments($invoice);

            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            $invoiceData['advance_used'] = 0;
            $invoice->update($invoiceData);

            $invoice->items()->delete();
            $invoice->items()->createMany($validated['items']);

            $this->applyClientAdvance($invoice, $validated['client_id'], (float) ($validated['use_advance_amount'] ?? 0));
            $totalPaid = (float) InvoicePayment::where('invoice_id', $invoice->id)->sum('amount');
            $invoice->update(['status' => $totalPaid >= $invoice->grand_total ? 'paid' : ($totalPaid > 0 ? 'partially_paid' : 'unpaid')]);
        });

        return redirect()->route('admin.invoices.index')->with('success', 'Invoice updated successfully.');
    }

    public function destroy(string $id)
    {
        $invoice = Invoice::with(['payments.transaction', 'payments.advanceAllocations.clientAdvance'])->findOrFail($id);

        DB::transaction(function () use ($invoice) {
            foreach ($invoice->payments as $payment) {
                if ($payment->method === 'Client Advance') {
                    if ($payment->advanceAllocations->isNotEmpty()) {
                        foreach ($payment->advanceAllocations as $allocation) {
                            $advance = $allocation->clientAdvance;
                            $advance->decrement('used_amount', $allocation->amount);
                            $advance->update(['is_settled' => false]);
                        }
                    } else {
                        $this->restoreClientAdvance($invoice->client_id, (float) $payment->amount);
                    }
                } elseif ($payment->account_id) {
                    Account::whereKey($payment->account_id)->increment('current_balance', $payment->amount);
                    $payment->transaction?->delete();
                }
            }

            $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
            if ($legacyAdvance > 0) {
                $this->restoreClientAdvance($invoice->client_id, $legacyAdvance);
            }

            $invoice->payments()->delete();
            $invoice->items()->delete();
            $invoice->delete();
        });

        return redirect()->back()->with('success', 'Invoice deleted successfully.');
    }

    private function restoreClientAdvance(int $clientId, float $refundAmount): void
    {
        $advances = ClientAdvance::where('client_id', $clientId)
            ->where('used_amount', '>', 0)->orderByDesc('date')->orderByDesc('id')->lockForUpdate()->get();
        foreach ($advances as $advance) {
            if ($refundAmount <= 0) break;
            $restore = min($refundAmount, (float) $advance->used_amount);
            if ($restore > 0) {
                $advance->decrement('used_amount', $restore);
                $advance->update(['is_settled' => false]);
                $refundAmount -= $restore;
            }
        }
    }

    private function applyClientAdvance(Invoice $invoice, int $clientId, float $amount): void
    {
        if ($amount <= 0) return;
        if ($amount > (float) $invoice->grand_total) {
            throw \Illuminate\Validation\ValidationException::withMessages(['use_advance_amount' => 'Advance cannot exceed invoice total.']);
        }

        $advances = ClientAdvance::where('client_id', $clientId)->whereColumn('used_amount', '<', 'amount')
            ->orderBy('date')->orderBy('id')->lockForUpdate()->get();
        $available = $advances->sum(fn ($advance) => (float) $advance->amount - (float) $advance->used_amount);
        if ($amount > $available) {
            throw \Illuminate\Validation\ValidationException::withMessages(['use_advance_amount' => "Only {$available} TK client advance is available."]);
        }

        $payment = InvoicePayment::create(['invoice_id' => $invoice->id, 'account_id' => null, 'method' => 'Client Advance', 'amount' => $amount, 'payment_date' => $invoice->invoice_date, 'note' => 'Adjusted from Client Advance.']);
        $remaining = $amount;
        foreach ($advances as $advance) {
            if ($remaining <= 0) break;
            $take = min($remaining, (float) $advance->amount - (float) $advance->used_amount);
            $advance->increment('used_amount', $take);
            $advance->update(['is_settled' => (float) $advance->fresh()->used_amount >= (float) $advance->amount]);
            $payment->advanceAllocations()->create(['client_advance_id' => $advance->id, 'amount' => $take]);
            $remaining -= $take;
        }
    }

    private function reverseAdvancePayments(Invoice $invoice): void
    {
        $payments = $invoice->payments()->where('method', 'Client Advance')->with('advanceAllocations.clientAdvance')->get();
        foreach ($payments as $payment) {
            if ($payment->advanceAllocations->isNotEmpty()) {
                foreach ($payment->advanceAllocations as $allocation) {
                    $allocation->clientAdvance->decrement('used_amount', $allocation->amount);
                    $allocation->clientAdvance->update(['is_settled' => false]);
                }
            } else {
                $this->restoreClientAdvance($invoice->client_id, (float) $payment->amount);
            }
            $payment->delete();
        }
        if ($payments->isEmpty() && (float) ($invoice->getRawOriginal('advance_used') ?? 0) > 0) {
            $this->restoreClientAdvance($invoice->client_id, (float) $invoice->getRawOriginal('advance_used'));
        }
        $invoice->update(['advance_used' => 0]);
    }

    private function generateNextInvoiceNumber()
    {
        $prefix = 'INV-' . date('Y') . '-';
        $lastInvoice = Invoice::where('invoice_number', 'like', "{$prefix}%")->orderBy('id', 'desc')->first();
        if (!$lastInvoice) {
            return $prefix . '001';
        }
        $lastNumber = (int) str_replace($prefix, '', $lastInvoice->invoice_number);
        $nextNumber = $lastNumber + 1;
        return $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public function print($id)
    {
        $invoice = Invoice::with(['client', 'items.project'])->findOrFail($id);

        $settings = InvoiceSetting::first();

        return inertia('Admin/Invoices/Print', [
            'invoice' => $invoice,
            'dbSettings' => $settings
        ]);
    }


}
