<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Account;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoicePaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = InvoicePayment::with(['invoice.client', 'account']);

        // Keyword Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('invoice', fn($invoice) => $invoice->where('invoice_number', 'like', "%{$search}%"))
                ->orWhereHas('invoice.client', fn($client) => $client->where('name', 'like', "%{$search}%"))
                ->orWhereHas('account', fn($account) => $account->where('account_name', 'like', "%{$search}%"))
                ->orWhere('payment_method', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        // Client-wise filter
        if ($request->filled('client_id')) {
            $query->whereHas('invoice', fn($q) => $q->where('client_id', $request->client_id));
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        // Year filter
        if ($request->filled('year')) {
            $query->whereYear('payment_date', $request->year);
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', $request->date_to);
        }

        $totalAmount = (clone $query)->sum('amount');
        $totalCount  = (clone $query)->count();

        if ($request->input('per_page') === 'all') {
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000);
        }

        $payments = $query->latest()->paginate($perPage)->withQueryString();

        $invoices = Invoice::with('client')
            ->withSum('payments', 'amount')
            ->where('status', '!=', 'paid')
            ->latest()
            ->get()
            ->map(function ($invoice) {
                $paid = $invoice->payments_sum_amount ?? 0;
                $invoice->due_amount = max($invoice->grand_total - $paid, 0);
                return $invoice;
            });

        $accounts = Account::where('is_active', true)->latest()->get();
        $clients  = Client::select('id', 'name')->orderBy('name')->get();

        $years = InvoicePayment::selectRaw('DISTINCT YEAR(payment_date) as year')
            ->orderByDesc('year')
            ->pluck('year');

        return Inertia::render('Admin/InvoicePayments/Index', [
            'payments' => $payments,
            'invoices' => $invoices,
            'accounts' => $accounts,
            'clients' => $clients,
            'years' => $years,
            'totalAmount' => $totalAmount,
            'filters' => [
                'search'    => $request->search,
                'per_page'  => $request->input('per_page', 10),
                'client_id' => $request->client_id,
                'account_id'=> $request->account_id,
                'year'      => $request->year,
                'date_from' => $request->date_from,
                'date_to'   => $request->date_to,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_id'      => 'required|exists:invoices,id',
            'account_id'      => 'required|exists:accounts,id',
            'amount'          => 'required|numeric|min:1',
            'discount_amount' => 'nullable|numeric|min:0', 
            'payment_date'    => 'required|date',
            'note'            => 'nullable|string'
        ]);

        DB::transaction(function () use ($validated, $request) {
            $invoice = Invoice::findOrFail($request->invoice_id);

            if (!empty($validated['discount_amount']) && $validated['discount_amount'] > 0) {
                $invoice->discount = ($invoice->discount ?? 0) + $validated['discount_amount'];
                $invoice->grand_total = max(0, $invoice->grand_total - $validated['discount_amount']);
                $invoice->save();
            }

            $payment = InvoicePayment::create([
                'invoice_id'   => $request->invoice_id,
                'account_id'   => $request->account_id,
                'amount'       => $request->amount,
                'payment_date' => $request->payment_date,
                'note'         => $request->note
            ]);

            $account = Account::findOrFail($request->account_id);
            $account->increment('current_balance', $request->amount);

            $payment->transaction()->create([
                'account_id'       => $account->id,
                'type'             => 'credit',
                'amount'           => $request->amount,
                'transaction_date' => $request->payment_date,
                'description'      => 'Invoice Payment Received. Invoice ID: ' . $request->invoice_id,
            ]);

            $this->updateInvoiceStatus($request->invoice_id);
        });

        return back()->with('success', 'Payment added successfully.');
    }

    public function update(Request $request, $id)
    {
        $payment = InvoicePayment::findOrFail($id);

        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'account_id' => 'required|exists:accounts,id',
            'amount'     => 'required|numeric|min:1',
            'payment_date'=> 'required|date',
            'note'       => 'nullable|string'
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            $oldAccount = Account::find($payment->account_id);
            if ($oldAccount) {
                $oldAccount->decrement('current_balance', $payment->amount);
            }

            $newAccount = Account::find($request->account_id);
            if ($newAccount) {
                $newAccount->increment('current_balance', $request->amount);
            }

            if ($payment->transaction) {
                $payment->transaction()->update([
                    'account_id'       => $request->account_id,
                    'amount'           => $request->amount,
                    'transaction_date' => $request->payment_date,
                ]);
            }

            $oldInvoiceId = $payment->invoice_id;
            $payment->update($validated);

            $this->updateInvoiceStatus($oldInvoiceId);
            if ($oldInvoiceId != $request->invoice_id) {
                $this->updateInvoiceStatus($request->invoice_id);
            }
        });

        return back()->with('success', 'Payment updated successfully.');
    }

    public function destroy($id)
    {
        $payment = InvoicePayment::findOrFail($id);

        DB::transaction(function () use ($payment) {
            $account = Account::find($payment->account_id);
            if ($account) {
                $account->decrement('current_balance', $payment->amount);
            }

            if ($payment->transaction) {
                $payment->transaction()->delete();
            }

            $invoiceId = $payment->invoice_id;
            $payment->delete();

            $this->updateInvoiceStatus($invoiceId);
        });

        return back()->with('success', 'Payment deleted successfully.');
    }

    private function updateInvoiceStatus($invoiceId)
    {
        $invoice = Invoice::withSum('payments', 'amount')->findOrFail($invoiceId);
        $totalPaid = $invoice->payments_sum_amount ?? 0;

        if ($totalPaid >= $invoice->grand_total) {
            $invoice->update(['status' => 'paid']);
        } else if ($totalPaid > 0) {
            $invoice->update(['status' => 'partially_paid']);
        } else {
            $invoice->update(['status' => 'unpaid']);
        }
    }
}