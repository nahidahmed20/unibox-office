<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model {
    protected $guarded = [];
    
    protected $appends = ['total_invoiced', 'total_paid', 'total_due', 'advance_balance'];

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
        return (float) (InvoicePayment::whereHas('invoice', function($q) {
            $q->where('client_id', $this->id)->whereNull('deleted_at');
        })->sum('amount') ?? 0);
    }

    public function getAdvanceBalanceAttribute()
    {
        if (array_key_exists('advance_balance', $this->attributes)) {
            return (float) $this->attributes['advance_balance'];
        }
        return max(0, (float) $this->clientAdvances()
            ->selectRaw('COALESCE(SUM(amount - used_amount), 0) AS balance')->value('balance'));
    }

    // ৪. Current Due (মোট বকেয়া)
    public function getTotalDueAttribute()
    {
        if (array_key_exists('total_due', $this->attributes)) {
            return (float) $this->attributes['total_due'];
        }
        $totalBilled = $this->total_invoiced;
        $totalPaid = $this->total_paid;
        $advanceUsed = (float) ($this->invoices()->whereNull('deleted_at')->sum('advance_used') ?? 0);

        $due = $totalBilled - ($totalPaid + $advanceUsed);
        
        return $due > 0 ? $due : 0;
    }

    public function getFinancialSummaryAttribute()
    {
        return [
            'total_invoiced' => $this->total_invoiced,
            'total_paid' => $this->total_paid,
            'total_due' => $this->total_due,
            'advance_balance' => $this->advance_balance,
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
