<?php

namespace App\Http\Controllers;

use App\Models\{Account, Client, ClientAdvance, Invoice, InvoicePayment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoicePaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = InvoicePayment::with(['invoice.client', 'invoice.items.project', 'account', 'advanceAllocations.clientAdvance']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q
                ->whereHas('invoice', fn ($i) => $i->where('invoice_number', 'like', "%{$search}%"))
                ->orWhereHas('invoice.client', fn ($c) => $c->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%"))
                ->orWhereHas('account', fn ($a) => $a->where('name', 'like', "%{$search}%"))
                ->orWhere('method', 'like', "%{$search}%")->orWhere('note', 'like', "%{$search}%")
                ->orWhereHas('invoice.items.project', fn ($p) => $p->where('title', 'like', "%{$search}%")));
        }
        if ($request->filled('client_id')) $query->whereHas('invoice', fn ($q) => $q->where('client_id', $request->client_id));
        if ($request->filled('account_id')) $query->where('account_id', $request->account_id);
        if ($request->filled('year')) $query->whereYear('payment_date', $request->year);
        if ($request->filled('date_from')) $query->whereDate('payment_date', '>=', $request->date_from);
        if ($request->filled('date_to')) $query->whereDate('payment_date', '<=', $request->date_to);

        // 🟢 ALREADY HAS EXACT TOTAL
        $totalAmount = (clone $query)->sum('amount');
        $thisMonthReceived = (clone $query)->whereMonth('payment_date', now()->month)->whereYear('payment_date', now()->year)->sum('amount');

        $count = (clone $query)->count();
        $perPage = $request->input('per_page') === 'all' ? max($count, 1) : min((int) $request->input('per_page', 10), 100000);
        $payments = $query->orderByDesc('payment_date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        $invoices = Invoice::with('client')->withSum('payments', 'amount')->where('status', '!=', 'paid')->latest()->get()->map(function ($invoice) {
            $legacy = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
            $invoice->due_amount = max((float) $invoice->grand_total - $legacy - (float) ($invoice->payments_sum_amount ?? 0), 0);
            $invoice->available_advance = (float) ClientAdvance::where('client_id', $invoice->client_id)->selectRaw('COALESCE(SUM(amount-used_amount),0) balance')->value('balance');
            return $invoice;
        });

        return Inertia::render('Admin/InvoicePayments/Index', [
            'payments' => $payments,
            'invoices' => $invoices,
            'accounts' => Account::where('is_active', true)->latest()->get(),
            'clients' => Client::select('id', 'name', 'company_name')->orderBy('name')->get(),
            'years' => InvoicePayment::selectRaw('DISTINCT YEAR(payment_date) year')->orderByDesc('year')->pluck('year'),
            'totalAmount' => $totalAmount, // 🟢 Passed to React
            'thisMonthReceived' => $thisMonthReceived,
            'filters' => $request->only(['search', 'per_page', 'client_id', 'account_id', 'year', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id' => 'required|exists:invoices,id', 'advance_amount' => 'nullable|numeric|min:0',
            'account_payments' => 'nullable|array', 'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|min:0.01', 'discount_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'required|date', 'note' => 'nullable|string',
        ]);
        $invoice = Invoice::withSum('payments', 'amount')->findOrFail($data['invoice_id']);
        $legacy = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
        $due = max(0, (float) $invoice->grand_total - $legacy - (float) ($invoice->payments_sum_amount ?? 0));
        $discount = (float) ($data['discount_amount'] ?? 0);
        $advanceAmount = (float) ($data['advance_amount'] ?? 0);
        $accountTotal = collect($data['account_payments'] ?? [])->sum(fn ($row) => (float) $row['amount']);
        $total = $advanceAmount + $accountTotal;
        if ($total <= 0) return back()->withErrors(['advance_amount' => 'Advance or at least one account payment is required.']);
        if ($total > max(0, $due - $discount)) return back()->withErrors(['advance_amount' => 'Total payment cannot exceed the invoice due.']);
        $available = (float) ClientAdvance::where('client_id', $invoice->client_id)->selectRaw('COALESCE(SUM(amount-used_amount),0) balance')->value('balance');
        if ($advanceAmount > $available) return back()->withErrors(['advance_amount' => "Client has only {$available} TK advance available."]);

        DB::transaction(function () use ($data, $invoice, $advanceAmount) {
            $createdPayments = collect();
            if (!empty($data['discount_amount'])) {
                $invoice->increment('discount', $data['discount_amount']);
                $invoice->decrement('grand_total', min($data['discount_amount'], $invoice->grand_total));
            }
            if ($advanceAmount > 0) {
                $payment = InvoicePayment::create(['invoice_id' => $invoice->id, 'account_id' => null, 'method' => 'Client Advance', 'amount' => $advanceAmount, 'payment_date' => $data['payment_date'], 'note' => $data['note'] ?? null]);
                $createdPayments->push($payment);
                $remaining = $advanceAmount;
                $advances = ClientAdvance::where('client_id', $invoice->client_id)->whereColumn('used_amount', '<', 'amount')->orderBy('date')->orderBy('id')->lockForUpdate()->get();
                foreach ($advances as $advance) {
                    if ($remaining <= 0) break;
                    $take = min($remaining, (float) $advance->amount - (float) $advance->used_amount);
                    $advance->increment('used_amount', $take);
                    $advance->update(['is_settled' => (float) $advance->fresh()->used_amount >= (float) $advance->amount]);
                    $payment->advanceAllocations()->create(['client_advance_id' => $advance->id, 'amount' => $take]);
                    $remaining -= $take;
                }
            }
            foreach ($data['account_payments'] ?? [] as $row) {
                $payment = InvoicePayment::create(['invoice_id' => $invoice->id, 'account_id' => $row['account_id'], 'method' => 'Account', 'amount' => $row['amount'], 'payment_date' => $data['payment_date'], 'note' => $data['note'] ?? null]);
                $createdPayments->push($payment);
                $account = Account::findOrFail($row['account_id']);
                $account->increment('current_balance', $row['amount']);
                $payment->transaction()->create(['account_id' => $account->id, 'type' => 'credit', 'amount' => $row['amount'], 'transaction_date' => $data['payment_date'], 'description' => 'Invoice Payment Received. Invoice ID: '.$invoice->id]);
            }
            if (!empty($data['discount_amount']) && $createdPayments->isNotEmpty()) {
                $createdPayments->first()->update(['discount_amount' => $data['discount_amount']]);
            }
            $this->updateInvoiceStatus($invoice->id);
        });
        return back()->with('success', 'Payment added successfully.');
    }

    public function update(Request $request, $id)
    {
        $payment = InvoicePayment::findOrFail($id);
        if ($payment->method === 'Client Advance') return back()->withErrors(['error' => 'Delete this payment to restore the advance, then enter it again.']);
        $data = $request->validate(['invoice_id' => 'required|exists:invoices,id', 'account_id' => 'required|exists:accounts,id', 'amount' => 'required|numeric|min:0.01', 'payment_date' => 'required|date', 'note' => 'nullable|string']);
        $targetInvoice = Invoice::withSum('payments', 'amount')->findOrFail($data['invoice_id']);
        $paidWithoutCurrent = (float) ($targetInvoice->payments_sum_amount ?? 0)
            - ($payment->invoice_id == $targetInvoice->id ? (float) $payment->amount : 0);
        $legacyAdvance = (float) ($targetInvoice->getRawOriginal('advance_used') ?? 0);
        $availableDue = max((float) $targetInvoice->grand_total - $legacyAdvance - $paidWithoutCurrent, 0);
        if ((float) $data['amount'] > $availableDue) {
            return back()->withErrors(['amount' => "Payment cannot exceed invoice due ({$availableDue} TK)."]);
        }
        DB::transaction(function () use ($data, $payment) {
            Account::find($payment->account_id)?->decrement('current_balance', $payment->amount);
            Account::findOrFail($data['account_id'])->increment('current_balance', $data['amount']);
            $payment->transaction?->update(['account_id' => $data['account_id'], 'amount' => $data['amount'], 'transaction_date' => $data['payment_date']]);
            $oldInvoice = $payment->invoice_id; $payment->update($data);
            $this->updateInvoiceStatus($oldInvoice);
            if ($oldInvoice != $data['invoice_id']) $this->updateInvoiceStatus($data['invoice_id']);
        });
        return back()->with('success', 'Payment updated successfully.');
    }

    public function destroy($id)
    {
        $payment = InvoicePayment::with('advanceAllocations.clientAdvance')->findOrFail($id);
        DB::transaction(function () use ($payment) {
            if ($payment->method === 'Client Advance') {
                foreach ($payment->advanceAllocations as $allocation) {
                    $allocation->clientAdvance->decrement('used_amount', $allocation->amount);
                    $allocation->clientAdvance->update(['is_settled' => false]);
                }
            } else Account::find($payment->account_id)?->decrement('current_balance', $payment->amount);
            $payment->transaction?->delete();
            $invoiceId = $payment->invoice_id; $payment->delete(); $this->updateInvoiceStatus($invoiceId);
            if ((float) $payment->discount_amount > 0) {
                $invoice = Invoice::findOrFail($invoiceId);
                $invoice->decrement('discount', min((float) $payment->discount_amount, (float) $invoice->discount));
                $invoice->increment('grand_total', $payment->discount_amount);
                $this->updateInvoiceStatus($invoiceId);
            }
        });
        return back()->with('success', 'Payment deleted successfully.');
    }

    private function updateInvoiceStatus($invoiceId): void
    {
        $invoice = Invoice::withSum('payments', 'amount')->findOrFail($invoiceId);
        $settled = (float) ($invoice->payments_sum_amount ?? 0) + (float) ($invoice->getRawOriginal('advance_used') ?? 0);
        $invoice->update(['status' => $settled >= $invoice->grand_total ? 'paid' : ($settled > 0 ? 'partially_paid' : 'unpaid')]);
    }
}
