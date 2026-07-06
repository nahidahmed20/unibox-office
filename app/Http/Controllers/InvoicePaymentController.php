<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoicePaymentController extends Controller
{
    public function index()
    {
        $payments = InvoicePayment::with(['invoice.client', 'account'])->latest()->get();
        $invoices = Invoice::with('client')->where('status', '!=', 'paid')->get();
        $accounts = Account::where('is_active', true)->get();

        return Inertia::render('Admin/InvoicePayments/Index', compact('payments', 'invoices', 'accounts'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'note' => 'nullable|string'
        ]);

        DB::transaction(function () use ($validated, $request) {
            $payment = InvoicePayment::create($validated);

            $account = Account::findOrFail($request->account_id);
            $account->increment('current_balance', $request->amount);

            $payment->transaction()->create([
                'account_id' => $account->id,
                'type' => 'credit',
                'amount' => $request->amount,
                'transaction_date' => $request->payment_date,
                'description' => 'Invoice Payment Received. Invoice ID: ' . $request->invoice_id,
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
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'note' => 'nullable|string'
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
                    'account_id' => $request->account_id,
                    'amount' => $request->amount,
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