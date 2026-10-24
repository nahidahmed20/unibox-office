<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientAdvance;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Project;
use App\Models\InvoiceSetting;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with([
            'client' => function ($q) {
                $q->select('id', 'name', 'company_name', 'phone')
                  ->withSum('clientAdvances as total_advance', 'amount')
                  ->withSum('clientAdvances as total_used', 'used_amount');
            },
            'items.project',
            'payments'
        ])->withSum('payments', 'amount')
            ->withSum(['payments as advance_payment_amount' => function ($query) {
                $query->where('method', 'Client Advance');
            }], 'amount');

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

        $allFiltered = clone $query;
        $invoicesList = $allFiltered->get();

        $totals = [
            'grand_total' => $invoicesList->sum('grand_total'),
            'paid_amount' => $invoicesList->sum(function ($inv) {
                return (float) $inv->payments_sum_amount + (float) ($inv->getRawOriginal('advance_used') ?? 0);
            }),
            'due_amount'  => $invoicesList->sum(function ($inv) {
                return max(
                    (float) $inv->grand_total
                    - (float) $inv->payments_sum_amount
                    - (float) ($inv->getRawOriginal('advance_used') ?? 0),
                    0
                );
            })
        ];

        $perPage = $request->input('per_page') === 'all' ? ($query->count() > 0 ? $query->count() : 1) : \App\Support\Pagination::perPage($request, $query);
        $invoices = $query->orderByDesc('invoice_date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        $invoices->getCollection()->transform(function ($invoice) {
            $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
            $invoice->legacy_advance_used = $legacyAdvance;
            $invoice->advance_used = $legacyAdvance + (float) $invoice->advance_payment_amount;
            $invoice->paid_amount = (float) $invoice->payments_sum_amount + $legacyAdvance;
            $invoice->due_amount = max((float) $invoice->grand_total - (float) $invoice->paid_amount, 0);
            if ($invoice->client) {
                $invoice->client->available_advance = max(0, (float)($invoice->client->total_advance ?? 0) - (float)($invoice->client->total_used ?? 0));
            }
            return $invoice;
        });

        $clients = Client::select('id', 'name', 'company_name')
            ->withSum('clientAdvances as total_advance', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->orderBy('name')->get()->map(function ($client) {
                $client->available_advance = max(0, (float)($client->total_advance ?? 0) - (float)($client->total_used ?? 0));
                return $client;
            });
        $yearExpression = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y', invoice_date)"
            : 'YEAR(invoice_date)';
        $years = Invoice::selectRaw("DISTINCT {$yearExpression} as year")->orderByDesc('year')->pluck('year');

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
            'totals'   => $totals,
            'uninvoicedProjects' => $uninvoicedProjects,
            'filters'  => $request->only([
                'invoice_number',
                'client_id',
                'status',
                'project_name',
                'year',
                'date_from',
                'date_to',
                'per_page'
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

        $projects = Project::with('items')
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
            'items.*.description' => 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_type'  => 'nullable|string',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            $invoiceData['advance_used'] = 0;

            $invoice = Invoice::create($invoiceData);

            $hasUnitType = $this->ensureUnitTypeColumnExists();
            $allowedFields = ['project_id', 'item_name', 'description', 'quantity', 'unit_price', 'total'];
            if ($hasUnitType) {
                $allowedFields[] = 'unit_type';
            }

            $invoiceItemsData = collect($validated['items'])->map(function ($item) use ($allowedFields) {
                return collect($item)->only($allowedFields)->toArray();
            })->toArray();
            $invoice->items()->createMany($invoiceItemsData);

            $this->syncProjectItemsAndBudgets($validated['items']);

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

        $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
        $advancePaymentAmount = (float) InvoicePayment::where('invoice_id', $invoice->id)->where('method', 'Client Advance')->sum('amount');
        $invoice->advance_used = $legacyAdvance + $advancePaymentAmount;
        $invoice->legacy_advance_used = $legacyAdvance;
        $invoice->cash_paid = max((float) $invoice->payments_sum_amount - $advancePaymentAmount, 0);

        $clients = Client::select('id', 'name', 'company_name')
            ->withSum('clientAdvances as total_advance', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->get()
            ->map(function ($client) {
                $client->available_advance = ($client->total_advance ?? 0) - ($client->total_used ?? 0);
                return $client;
            });

        $invoicedProjectIds = DB::table('invoice_items')->whereNotNull('project_id')->where('invoice_id', '!=', $id)->pluck('project_id')->toArray();

        $projects = Project::with('items')
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
            'items.*.description' => 'nullable|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_type'  => 'nullable|string',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($invoice, $validated) {
            $this->reverseAdvancePayments($invoice);

            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            $invoiceData['advance_used'] = 0;
            $invoice->update($invoiceData);

            $hasUnitType = $this->ensureUnitTypeColumnExists();
            $allowedFields = ['project_id', 'item_name', 'description', 'quantity', 'unit_price', 'total'];
            if ($hasUnitType) {
                $allowedFields[] = 'unit_type';
            }

            $invoice->items()->delete();
            $invoiceItemsData = collect($validated['items'])->map(function ($item) use ($allowedFields) {
                return collect($item)->only($allowedFields)->toArray();
            })->toArray();
            $invoice->items()->createMany($invoiceItemsData);

            $this->syncProjectItemsAndBudgets($validated['items']);

            $this->applyClientAdvance($invoice, $validated['client_id'], (float) ($validated['use_advance_amount'] ?? 0));

            $totalPaid = (float) InvoicePayment::where('invoice_id', $invoice->id)->sum('amount');
            $invoice->update(['status' => $totalPaid >= $invoice->grand_total ? 'paid' : ($totalPaid > 0 ? 'partially_paid' : 'unpaid')]);
        });

        return redirect()->route('admin.invoices.index')->with('success', 'Invoice updated successfully.');
    }

    private function syncProjectItemsAndBudgets(array $items): void
    {
        $groupedByProject = collect($items)->whereNotNull('project_id')->groupBy('project_id');

        foreach ($groupedByProject as $projectId => $projectItems) {
            $project = Project::find($projectId);

            if ($project) {
                $project->items()->delete();

                $insertData = $projectItems->map(function ($item) {
                    return [
                        'item_name'   => $item['item_name'],
                        'description' => $item['description'] ?? null,
                        'quantity'    => $item['quantity'],
                        'unit_type'   => $item['unit_type'] ?? 'piece',
                        'unit_price'  => $item['unit_price'],
                        'total'       => $item['total'],
                    ];
                })->toArray();

                $project->items()->createMany($insertData);

                $project->update(['budget' => collect($projectItems)->sum('total')]);
            }
        }
    }

    public function destroy(string $id)
    {
        $invoice = Invoice::with(['payments.transaction', 'payments.advanceAllocations.clientAdvance'])->findOrFail($id);

        if ($invoice->payments->count() > 0) {
            return redirect()->back()->with('error', 'This invoice cannot be deleted because payment has already been received for it. Please delete the payments first.');
        }

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
        $remainingDue = max(
            (float) $invoice->grand_total
            - (float) $invoice->payments()->sum('amount')
            - (float) ($invoice->getRawOriginal('advance_used') ?? 0),
            0
        );
        if ($amount > $remainingDue) {
            throw \Illuminate\Validation\ValidationException::withMessages(['use_advance_amount' => 'Advance cannot exceed the remaining invoice due.']);
        }

        $advances = ClientAdvance::where('client_id', $clientId)->whereColumn('used_amount', '<', 'amount')
            ->orderBy('date')->orderBy('id')->lockForUpdate()->get();

        $available = $advances->sum(fn($advance) => (float) $advance->amount - (float) $advance->used_amount);
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

        $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
        if ($legacyAdvance > 0) {
            $this->restoreClientAdvance($invoice->client_id, $legacyAdvance);
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

    protected function ensureUnitTypeColumnExists(): bool
    {
        if (!Schema::hasColumn('invoice_items', 'unit_type')) {
            try {
                Schema::table('invoice_items', function (Blueprint $table) {
                    $table->string('unit_type', 50)->nullable()->default('piece')->after('quantity');
                });
                return true;
            } catch (\Throwable $e) {
                return false;
            }
        }
        return true;
    }

    public function print($id)
    {
        $invoice = Invoice::with(['client', 'items.project', 'payments'])->findOrFail($id);

        // Ensure computed advance_used (raw column + 'Client Advance' payments) is serialized
        $invoice->setAttribute('advance_used', $invoice->advance_used);

        // Money already received for this invoice (bank/cash etc.). Client-advance payments are
        // excluded here because they're already included in advance_used ("Advance Adjusted").
        $invoice->setAttribute(
            'cash_paid',
            round((float) $invoice->payments->where('method', '!=', 'Client Advance')->sum('amount'), 2)
        );

        $settings = InvoiceSetting::first();

        return inertia('Admin/Invoices/Print', [
            'invoice' => $invoice,
            'dbSettings' => $settings
        ]);
    }

    public function quickApplyAdvance(Invoice $invoice)
    {
        $due = max(
            (float) $invoice->grand_total
            - (float) $invoice->payments()->sum('amount')
            - (float) ($invoice->getRawOriginal('advance_used') ?? 0),
            0
        );
        if ($due <= 0) {
            return back()->with('error', 'This invoice has no outstanding due.');
        }

        $available = (float) ClientAdvance::where('client_id', $invoice->client_id)
            ->selectRaw('COALESCE(SUM(amount - used_amount), 0) AS balance')
            ->value('balance');

        if ($available <= 0) {
            return back()->with('error', 'This client has no available advance in hand.');
        }

        $adjustAmount = min($due, $available);

        DB::transaction(function () use ($invoice, $adjustAmount) {
            $this->applyClientAdvance($invoice, $invoice->client_id, $adjustAmount);

            $totalPaid = (float) InvoicePayment::where('invoice_id', $invoice->id)->sum('amount')
                + (float) ($invoice->getRawOriginal('advance_used') ?? 0);
            $invoice->update([
                'status' => $totalPaid >= $invoice->grand_total ? 'paid' : ($totalPaid > 0 ? 'partially_paid' : 'unpaid')
            ]);
        });

        return back()->with('success', "৳" . number_format($adjustAmount, 2) . " successfully adjusted from client advance.");
    }
}