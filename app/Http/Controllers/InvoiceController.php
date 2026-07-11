<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientAdvance;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\InvoicePayment; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'items.project']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('invoice_number', 'like', "%{$searchTerm}%")
                ->orWhereHas('client', function ($cq) use ($searchTerm) {
                    $cq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        $perPage = $request->input('per_page', 10);
        $invoices = $query->latest()->paginate($perPage)->withQueryString();

        $clients = Client::select('id', 'name', 'company_name')
            ->withSum('clientAdvances as total_advance', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->latest()
            ->get()
            ->map(function ($client) {
                $client->available_advance = ($client->total_advance ?? 0) - ($client->total_used ?? 0);
                return $client;
            });

        $projects = Project::select('id', 'title', 'client_id')->latest()->get();
        $nextInvoiceNumber = $this->generateNextInvoiceNumber();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'clients' => $clients,
            'projects' => $projects,
            'nextInvoiceNumber' => $nextInvoiceNumber,
            'filters' => $request->only('search', 'per_page'),
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
            'tax'                => 'nullable|numeric|min:0',
            'discount'           => 'nullable|numeric|min:0',
            'grand_total'        => 'required|numeric|min:0',
            'status'             => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'              => 'nullable|string',
            'use_advance_amount' => 'nullable|numeric|min:0',
            'items'              => 'required|array|min:1',
            'items.*.project_id' => 'nullable|exists:projects,id',
            'items.*.description'=> 'required|string',
            'items.*.quantity'   => 'required|numeric|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total'      => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            
            $invoiceData['advance_used'] = $validated['use_advance_amount'] ?? 0;
            
            $invoice = Invoice::create($invoiceData);
            $invoice->items()->createMany($validated['items']);

            if (!empty($validated['use_advance_amount']) && $validated['use_advance_amount'] > 0) {
                $deductAmount = $validated['use_advance_amount'];
                
                $advances = ClientAdvance::where('client_id', $validated['client_id'])
                    ->where('is_settled', false)
                    ->orderBy('date', 'asc')
                    ->get();

                foreach ($advances as $advance) {
                    if ($deductAmount <= 0) break;

                    $availableInThisRow = $advance->amount - $advance->used_amount;

                    if ($availableInThisRow >= $deductAmount) {
                        $newUsed = $advance->used_amount + $deductAmount;
                        $advance->update([
                            'used_amount' => $newUsed,
                            'is_settled'  => $newUsed >= $advance->amount
                        ]);

                        InvoicePayment::create([
                            'invoice_id'   => $invoice->id,
                            'account_id'   => $advance->account_id, 
                            'amount'       => $deductAmount,
                            'payment_date' => now(),
                            'method'       => 'Client Advance', 
                            'note'         => 'Adjusted from Client Advance.'
                        ]);
                        $deductAmount = 0;
                    } else {
                        $advance->update([
                            'used_amount' => $advance->amount,
                            'is_settled'  => true
                        ]);

                        InvoicePayment::create([
                            'invoice_id'   => $invoice->id,
                            'account_id'   => $advance->account_id, 
                            'amount'       => $availableInThisRow,
                            'payment_date' => now(),
                            'method'       => 'Client Advance',
                            'note'         => 'Adjusted from Client Advance.'
                        ]);
                        $deductAmount -= $availableInThisRow;
                    }
                }
            }
            
            $totalPaid = InvoicePayment::where('invoice_id', $invoice->id)->sum('amount');
            if ($totalPaid >= $invoice->grand_total) {
                $invoice->update(['status' => 'paid']);
            } elseif ($totalPaid > 0) {
                $invoice->update(['status' => 'partially_paid']);
            }
        });

        return redirect()->back()->with('success', 'Invoice generated successfully.');
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
            'tax'                => 'nullable|numeric|min:0',
            'discount'           => 'nullable|numeric|min:0',
            'grand_total'        => 'required|numeric|min:0',
            'use_advance_amount' => 'nullable|numeric|min:0', 
            'status'             => 'required|in:unpaid,partially_paid,paid,overdue',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
        ]);

        DB::transaction(function () use ($invoice, $validated) {
            $this->rollbackAdvancePayment($invoice);

            $invoiceData = collect($validated)->except(['items', 'use_advance_amount'])->toArray();
            
            $invoiceData['advance_used'] = $validated['use_advance_amount'] ?? 0;
            
            $invoice->update($invoiceData);
            
            $invoice->items()->delete();
            $invoice->items()->createMany($validated['items']);

            if (!empty($validated['use_advance_amount']) && $validated['use_advance_amount'] > 0) {
                $deductAmount = $validated['use_advance_amount'];
                
                $advances = ClientAdvance::where('client_id', $validated['client_id'])
                    ->where('is_settled', false)
                    ->orderBy('id', 'asc') // FIFO method
                    ->get();

                foreach ($advances as $advance) {
                    if ($deductAmount <= 0) break;
                    
                    $availableInThisRow = $advance->amount - $advance->used_amount;
                    
                    if ($availableInThisRow > 0) {
                        $take = min($availableInThisRow, $deductAmount);
                        
                        $advance->increment('used_amount', $take);
                        $advance->update(['is_settled' => ($advance->used_amount >= $advance->amount)]);

                        InvoicePayment::create([
                            'invoice_id'   => $invoice->id,
                            'account_id'   => $advance->account_id,
                            'amount'       => $take,
                            'payment_date' => now(),
                            'method'       => 'Client Advance',
                            'note'         => 'Adjusted from Client Advance.'
                        ]);
                        $deductAmount -= $take;
                    }
                }
                
                $totalPaid = InvoicePayment::where('invoice_id', $invoice->id)->sum('amount');
                $newStatus = ($totalPaid >= $invoice->grand_total) ? 'paid' : 'partially_paid';
                $invoice->update(['status' => $newStatus]);
            } else {
                 $invoice->update(['status' => 'unpaid']);
            }
        });

        return redirect()->back()->with('success', 'Invoice updated successfully.');
    }


    public function destroy(string $id)
    {
        $invoice = Invoice::findOrFail($id);
        
        DB::transaction(function () use ($invoice) {
            $this->rollbackAdvancePayment($invoice);

            $invoice->payments()->delete();
            $invoice->items()->delete(); 
            
            $invoice->delete();
        });
        
        return redirect()->back()->with('success', 'Invoice deleted successfully.');
    }


    private function rollbackAdvancePayment($invoice)
    {
        $advancePayments = InvoicePayment::where('invoice_id', $invoice->id)
            ->where('method', 'Client Advance') 
            ->get();
            
        if ($advancePayments->count() > 0) {
            $refundAmount = $advancePayments->sum('amount');
            
            $advances = ClientAdvance::where('client_id', $invoice->client_id)
                ->where('used_amount', '>', 0)
                ->orderBy('id', 'desc') 
                ->get();
            
            foreach ($advances as $advance) {
                if ($refundAmount <= 0) break;
                
                if ($advance->used_amount >= $refundAmount) {
                    $newUsed = $advance->used_amount - $refundAmount;
                    $advance->update([
                        'used_amount' => $newUsed,
                        'is_settled'  => false 
                    ]);
                    $refundAmount = 0;
                } else {
                    $refundAmount -= $advance->used_amount;
                    $advance->update([
                        'used_amount' => 0,
                        'is_settled'  => false
                    ]);
                }
            }
            
            InvoicePayment::where('invoice_id', $invoice->id)
                ->where('method', 'Client Advance')
                ->delete();
        }
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
        
        return inertia('Admin/Invoices/Print', [
            'invoice' => $invoice
        ]);
    }

    public function clientDuesReport(Request $request)
    {
        $query = Client::select('id', 'name', 'company_name', 'phone', 'email')
            ->withSum('invoices as total_invoiced', 'grand_total')
            ->withSum('clientAdvances as total_advance', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->addSelect([
                'total_paid' => InvoicePayment::selectRaw('COALESCE(SUM(amount), 0)')
                    ->join('invoices', 'invoices.id', '=', 'invoice_payments.invoice_id')
                    ->whereColumn('invoices.client_id', 'clients.id')
            ]);

        // Search Filter
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('company_name', 'like', "%{$searchTerm}%")
                  ->orWhere('phone', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }

        $perPage = $request->input('per_page', 10);

        if ($perPage === 'all') {
            $perPage = 999999; 
        }

        $clientDues = $query->latest()
            ->paginate($perPage)
            ->through(function ($client) {
                $invoiced = $client->total_invoiced ?? 0;
                $paid = $client->total_paid ?? 0;

                $client->total_due = max($invoiced - $paid, 0);
                
                $client->available_advance = ($client->total_advance ?? 0) - ($client->total_used ?? 0);
                
                return $client;
            })
            ->withQueryString();

        return Inertia::render('Admin/Reports/ClientDues', [
            'clientDues' => $clientDues,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }
}