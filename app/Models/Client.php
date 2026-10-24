<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model {
    protected $guarded = [];
    
    protected $appends = ['total_invoiced', 'total_paid', 'total_due', 'advance_balance', 'net_due', 'advance_surplus'];

    // Relationships
    public function projects() { return $this->hasMany(Project::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function clientAdvances() { return $this->hasMany(ClientAdvance::class); }

    public function getTotalInvoicedAttribute()
    {
        if (array_key_exists('total_invoiced', $this->attributes)) {
            return (float) $this->attributes['total_invoiced'];
        }
        return (float) ($this->invoices()->whereNull('deleted_at')->sum('grand_total') ?? 0);
    }

    public function getTotalPaidAttribute()
    {
        if (array_key_exists('total_paid', $this->attributes)) {
            return (float) $this->attributes['total_paid'];
        }
        $payments = InvoicePayment::whereHas('invoice', function($q) {
            $q->where('client_id', $this->id)->whereNull('deleted_at');
        })->sum('amount');
        $legacyAdvances = $this->invoices()->whereNull('deleted_at')->sum('advance_used');

        return (float) $payments + (float) $legacyAdvances;
    }

    public function getAdvanceBalanceAttribute()
    {
        if (array_key_exists('advance_balance', $this->attributes)) {
            return (float) $this->attributes['advance_balance'];
        }
        return max(0, (float) $this->clientAdvances()
            ->selectRaw('COALESCE(SUM(amount - used_amount), 0) AS balance')->value('balance'));
    }

    // 4. Current Gross Due (Invoices Billed - Directly Paid)
    public function getTotalDueAttribute()
    {
        if (array_key_exists('total_due', $this->attributes)) {
            return (float) $this->attributes['total_due'];
        }
        $totalBilled = $this->total_invoiced;
        $totalPaid = $this->total_paid;

        return max(0, $totalBilled - $totalPaid);
    }

    // 5. True Net Due (Invoice Due - Available Advance in Hand)
    public function getNetDueAttribute()
    {
        if (array_key_exists('net_due', $this->attributes)) {
            return (float) $this->attributes['net_due'];
        }
        return max(0, $this->total_due - $this->advance_balance);
    }

    // 6. Advance Surplus (When Client Advance > Invoice Due)
    public function getAdvanceSurplusAttribute()
    {
        if (array_key_exists('advance_surplus', $this->attributes)) {
            return (float) $this->attributes['advance_surplus'];
        }
        return max(0, $this->advance_balance - $this->total_due);
    }

    public function getFinancialSummaryAttribute()
    {
        return [
            'total_invoiced' => $this->total_invoiced,
            'total_paid' => $this->total_paid,
            'total_due' => $this->total_due,
            'invoice_due' => $this->total_due,
            'advance_balance' => $this->advance_balance,
            'net_due' => $this->net_due,
            'advance_surplus' => $this->advance_surplus,
        ];
    }

    public function getProjectStatsAttribute()
    {
        return [
            'total' => $this->projects()->count(),
            'completed' => $this->projects()->where('status', 'completed')->count(),
            'in_progress' => $this->projects()->where('status', 'in_progress')->count(),
        ];
    }
}
