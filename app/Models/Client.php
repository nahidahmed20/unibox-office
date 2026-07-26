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
        return $this->invoices()->sum('grand_total') ?? 0;
    }

    public function getTotalPaidAttribute()
    {
        return InvoicePayment::whereHas('invoice', function($q) {
            $q->where('client_id', $this->id);
        })->sum('amount') ?? 0;
    }

    public function getAdvanceBalanceAttribute()
    {
        return $this->clientAdvances()->where('is_settled', false)->sum('amount') ?? 0;
    }

    // ৪. Current Due (মোট বকেয়া)
    public function getTotalDueAttribute()
    {
        $totalBilled = $this->total_invoiced;
        $totalPaid = $this->total_paid;
        
        $advanceUsed = $this->invoices()->sum('advance_used') ?? 0;

        $due = $totalBilled - ($totalPaid + $advanceUsed);
        
        return $due > 0 ? $due : 0;
    }
}