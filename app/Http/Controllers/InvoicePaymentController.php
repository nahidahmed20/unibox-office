<?php

namespace App\Http\Controllers;

use App\Models\{Account, Client, ClientAdvance, Invoice, InvoicePayment};
use App\Services\AccountAllocationService;
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

        $totalAmount = (clone $query)->sum('amount');
        $thisMonthReceived = (clone $query)->whereMonth('payment_date', now()->month)->whereYear('payment_date', now()->year)->sum('amount');

        $count = (clone $query)->count();
        $perPage = $request->input('per_page') === 'all' ? max($count, 1) : \App\Support\Pagination::perPage($request, $query);
        $payments = $query->orderByDesc('payment_date')->orderByDesc('id')->paginate($perPage)->withQueryString();
        $paymentIds = $payments->pluck('id');
        $accountTransactions = \App\Models\Transaction::where('transactionable_type', InvoicePayment::class)
            ->whereIn('transactionable_id', $paymentIds)->where('type', 'credit')->orderBy('id')->get()->groupBy('transactionable_id');
        $payments->getCollection()->transform(function (InvoicePayment $payment) use ($accountTransactions) {
            $payment->account_payments = ($accountTransactions[$payment->id] ?? collect())->map(fn ($transaction) => [
                'account_id' => $transaction->account_id,
                'amount' => (float) $transaction->amount,
            ])->values();
            return $payment;
        });

        $invoices = Invoice::with('client')->withSum('payments', 'amount')->where('status', '!=', 'paid')->latest()->get()->map(function ($invoice) {
            $legacy = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
            $invoice->due_amount = max((float) $invoice->grand_total - $legacy - (float) ($invoice->payments_sum_amount ?? 0), 0);
            return $invoice;
        });

        // Add advances to clients
        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get()->map(function($client) {
            $client->advance_balance = max(
                (float) ClientAdvance::where('client_id', $client->id)->selectRaw('COALESCE(SUM(amount-used_amount),0) balance')->value('balance'),
                0
            );
            return $client;
        });

        return Inertia::render('Admin/InvoicePayments/Index', [
            'payments' => $payments,
            'invoices' => $invoices,
            'accounts' => Account::where('is_active', true)->latest()->get(),
            'clients' => $clients,
            'years' => InvoicePayment::select('payment_date')->distinct()->pluck('payment_date')
                ->map(fn ($date) => (int) substr($date, 0, 4))->unique()->sortDesc()->values(),
            'totalAmount' => $totalAmount,
            'thisMonthReceived' => $thisMonthReceived,
            'filters' => $request->only(['search', 'per_page', 'client_id', 'account_id', 'year', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request)
    {
        // Filter out empty account payment rows
        $cleanedAccountPayments = collect($request->account_payments)
            ->filter(fn($a) => !empty($a['account_id']) && (float)($a['amount'] ?? 0) > 0)
            ->values()
            ->toArray();
        $request->merge(['account_payments' => $cleanedAccountPayments]);

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'invoices' => 'required|array|min:1',
            'invoices.*.id' => 'required|distinct|exists:invoices,id',
            'invoices.*.pay_amount' => 'required|numeric|min:0',
            'invoices.*.discount' => 'nullable|numeric|min:0',
            'advance_amount' => 'nullable|numeric|min:0',
            'account_payments' => 'nullable|array',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'note' => 'nullable|string',
        ]);

        $invoicesToPay = collect($request->invoices)->filter(fn($i) => (float)$i['pay_amount'] > 0 || (float)($i['discount'] ?? 0) > 0);
        if ($invoicesToPay->isEmpty()) return back()->withErrors(['invoices' => 'You must select and allocate payment or discount to at least one invoice.']);

        $totalPayRequested = round($invoicesToPay->sum('pay_amount'), 2);
        $totalAdvance = round((float) ($request->advance_amount ?? 0), 2);
        $totalAccount = round(collect($request->account_payments)->sum('amount'), 2);
        $totalGiven = $totalAdvance + $totalAccount;

        if (abs($totalPayRequested - $totalGiven) > 0.01) {
            return back()->withErrors(['amount_mismatch' => "Payment sources total ({$totalGiven} TK) must match the total payable invoice amount ({$totalPayRequested} TK)."]);
        }
        if (collect($request->account_payments)->isNotEmpty()
            && Account::whereIn('id', collect($request->account_payments)->pluck('account_id'))->where('is_active', true)->count() !== collect($request->account_payments)->count()) {
            return back()->withErrors(['account_payments' => 'Every selected account must be active.']);
        }

        $availableAdvance = (float) ClientAdvance::where('client_id', $request->client_id)->selectRaw('COALESCE(SUM(amount-used_amount),0) balance')->value('balance');
        if ($totalAdvance > $availableAdvance) return back()->withErrors(['advance_amount' => "Client only has {$availableAdvance} TK advance available."]);

        DB::transaction(function () use ($request, $invoicesToPay, $totalAdvance) {
            $advanceRemaining = $totalAdvance;
            $accountsRemaining = collect($request->account_payments)->map(fn($a) => (object) ['id' => $a['account_id'], 'amount' => (float)$a['amount']]);

            $invoiceIds = $invoicesToPay->pluck('id');
            $lockedInvoices = Invoice::whereIn('id', $invoiceIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $paidByInvoice = InvoicePayment::whereIn('invoice_id', $invoiceIds)
                ->selectRaw('invoice_id, COALESCE(SUM(amount), 0) as paid_amount')
                ->groupBy('invoice_id')
                ->pluck('paid_amount', 'invoice_id');

            foreach ($invoicesToPay as $invData) {
                $invoice = $lockedInvoices->get($invData['id']);
                if (!$invoice || (int) $invoice->client_id !== (int) $request->client_id) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'invoices' => 'Every invoice must belong to the selected client.',
                    ]);
                }

                $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
                $currentDue = max(
                    (float) $invoice->grand_total
                    - (float) ($paidByInvoice[$invoice->id] ?? 0)
                    - $legacyAdvance,
                    0
                );
                $discount = round((float) ($invData['discount'] ?? 0), 2);
                $payAmount = round((float) $invData['pay_amount'], 2);
                if ($discount > $currentDue || $payAmount > $currentDue - $discount) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'invoices' => "Payment and discount cannot exceed the remaining due for invoice {$invoice->invoice_number}.",
                    ]);
                }
            }

            $advances = collect();
            if ($advanceRemaining > 0) {
                $advances = ClientAdvance::where('client_id', $request->client_id)->whereColumn('used_amount', '<', 'amount')->orderBy('date')->orderBy('id')->lockForUpdate()->get();
                $lockedAvailableAdvance = $advances->sum(fn ($advance) => max((float) $advance->amount - (float) $advance->used_amount, 0));
                if ($lockedAvailableAdvance + 0.001 < $advanceRemaining) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'advance_amount' => 'Client advance balance changed while processing this payment. Please refresh and try again.',
                    ]);
                }
            }

            foreach ($invoicesToPay as $invData) {
                $invoice = $lockedInvoices->get($invData['id']);
                $payAmount = round((float) $invData['pay_amount'], 2);
                $discount = round((float) ($invData['discount'] ?? 0), 2);

                if ($discount > 0) {
                    $invoice->increment('discount', $discount);
                    $invoice->decrement('grand_total', min($discount, $invoice->grand_total));
                }

                if ($discount > 0 && $payAmount == 0) {
                     InvoicePayment::create([
                        'invoice_id' => $invoice->id, 'account_id' => null, 'method' => 'Discount Only',
                        'amount' => 0, 'payment_date' => $request->payment_date,
                        'note' => $request->filled('note') ? 'Discount: ' . $request->note : 'Special Discount Applied',
                        'discount_amount' => $discount,
                    ]);
                }

                while ($payAmount > 0.001) {
                    if ($advanceRemaining > 0.001) {
                        $take = min($payAmount, $advanceRemaining);
                        $payment = InvoicePayment::create([
                            'invoice_id' => $invoice->id, 'account_id' => null, 'method' => 'Client Advance',
                            'amount' => $take, 'payment_date' => $request->payment_date, 'note' => $request->note,
                            'discount_amount' => $payAmount == round((float) $invData['pay_amount'], 2) ? $discount : 0,
                        ]);
                        $advanceRemaining -= $take;
                        $payAmount -= $take;

                        $takeFromAdvances = $take;
                        foreach ($advances as $adv) {
                            if ($takeFromAdvances <= 0) break;
                            $availableHere = (float)$adv->amount - (float)$adv->used_amount;
                            if ($availableHere <= 0) continue;
                            $deduct = min($takeFromAdvances, $availableHere);
                            $adv->increment('used_amount', $deduct);
                            $adv->update(['is_settled' => (float)$adv->fresh()->used_amount >= (float)$adv->amount]);
                            $payment->advanceAllocations()->create(['client_advance_id' => $adv->id, 'amount' => $deduct]);
                            $takeFromAdvances -= $deduct;
                        }
                        if ($takeFromAdvances > 0.001) {
                            throw \Illuminate\Validation\ValidationException::withMessages([
                                'advance_amount' => 'The selected client advance could not be fully allocated. Please refresh and try again.',
                            ]);
                        }
                    } else {
                        $acc = $accountsRemaining->firstWhere('amount', '>', 0.001);
                        if (!$acc) break;
                        $take = min($payAmount, $acc->amount);
                        $payment = InvoicePayment::create([
                            'invoice_id' => $invoice->id, 'account_id' => $acc->id, 'method' => 'Account',
                            'amount' => $take, 'payment_date' => $request->payment_date, 'note' => $request->note,
                            'discount_amount' => $payAmount == round((float) $invData['pay_amount'], 2) ? $discount : 0,
                        ]);
                        $acc->amount -= $take;
                        $payAmount -= $take;

                        $dbAcc = Account::findOrFail($acc->id);
                        $dbAcc->increment('current_balance', $take);
                        $payment->transaction()->create([
                            'account_id' => $dbAcc->id, 'type' => 'credit', 'amount' => $take,
                            'transaction_date' => $request->payment_date, 'description' => 'Invoice Payment Received. Ref: '.$invoice->invoice_number
                        ]);
                    }
                }

                $this->updateInvoiceStatus($invoice->id);
            }
        });

        return back()->with('success', 'Payment applied successfully.');
    }

    public function update(Request $request, $id)
    {
        $payment = InvoicePayment::findOrFail($id);
        if ($payment->method === 'Client Advance' || $payment->method === 'Discount Only') {
            return back()->withErrors(['error' => 'Delete this specialized payment to restore it, then enter it again.']);
        }
        $data = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'account_id' => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'amount' => 'required|numeric|decimal:0,2|min:0.01',
            'payment_date' => 'required|date',
            'note' => 'nullable|string',
        ]);
        $allocations = app(AccountAllocationService::class)->fromRequest($data, (float) $data['amount']);
        $data['account_id'] = $allocations[0]['account_id'];
        $targetInvoice = Invoice::withSum('payments', 'amount')->findOrFail($data['invoice_id']);
        $paidWithoutCurrent = (float) ($targetInvoice->payments_sum_amount ?? 0) - ($payment->invoice_id == $targetInvoice->id ? (float) $payment->amount : 0);
        $legacyAdvance = (float) ($targetInvoice->getRawOriginal('advance_used') ?? 0);
        $availableDue = max((float) $targetInvoice->grand_total - $legacyAdvance - $paidWithoutCurrent, 0);

        if ((float) $data['amount'] > $availableDue) return back()->withErrors(['amount' => "Payment cannot exceed invoice due ({$availableDue} TK)."]);

        DB::transaction(function () use ($data, $payment, $allocations) {
            $oldInvoice = $payment->invoice_id;
            $service = app(AccountAllocationService::class);
            if ($service->reverse($payment, 'credit') === 0 && $payment->account_id) {
                Account::find($payment->account_id)?->decrement('current_balance', $payment->amount);
            }
            $payment->update(collect($data)->except('account_payments')->toArray());
            $service->replace($payment, $allocations, 'credit', $data['payment_date'], 'Invoice Payment Received. Ref: '.$payment->invoice->invoice_number);
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
                if ($payment->advanceAllocations->isNotEmpty()) {
                    foreach ($payment->advanceAllocations as $allocation) {
                        $allocation->clientAdvance->decrement('used_amount', $allocation->amount);
                        $allocation->clientAdvance->update(['is_settled' => false]);
                    }
                } else {
                    $this->restoreClientAdvance($payment->invoice->client_id, (float) $payment->amount);
                }
            } else if($payment->method === 'Account') {
                $service = app(AccountAllocationService::class);
                if ($service->reverse($payment, 'credit') === 0 && $payment->account_id) {
                    Account::find($payment->account_id)?->decrement('current_balance', $payment->amount);
                }
            }
            if ($payment->method !== 'Account') {
                $payment->transaction?->delete();
            }
            $invoiceId = $payment->invoice_id; $payment->delete();

            if ((float) $payment->discount_amount > 0) {
                $invoice = Invoice::findOrFail($invoiceId);
                $invoice->decrement('discount', min((float) $payment->discount_amount, (float) $invoice->discount));
                $invoice->increment('grand_total', $payment->discount_amount);
            }
            $this->updateInvoiceStatus($invoiceId);
        });
        return back()->with('success', 'Payment reversed successfully.');
    }

    private function updateInvoiceStatus($invoiceId): void
    {
        $invoice = Invoice::withSum('payments', 'amount')->findOrFail($invoiceId);
        $settled = (float) ($invoice->payments_sum_amount ?? 0) + (float) ($invoice->getRawOriginal('advance_used') ?? 0);
        $invoice->update(['status' => $settled >= $invoice->grand_total ? 'paid' : ($settled > 0.01 ? 'partially_paid' : 'unpaid')]);
    }

    private function restoreClientAdvance(int $clientId, float $amount): void
    {
        $remaining = $amount;
        $advances = ClientAdvance::where('client_id', $clientId)
            ->where('used_amount', '>', 0)
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->get();

        foreach ($advances as $advance) {
            if ($remaining <= 0) break;
            $restored = min($remaining, (float) $advance->used_amount);
            $advance->decrement('used_amount', $restored);
            $advance->update(['is_settled' => false]);
            $remaining -= $restored;
        }

        if ($remaining > 0.009) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'advance' => 'The original client advance balance cannot be fully restored.',
            ]);
        }
    }
}