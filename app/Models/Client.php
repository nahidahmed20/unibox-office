<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model {
    protected $guarded = [];
    public function projects() { return $this->hasMany(Project::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function clientAdvances()
    {
        return $this->hasMany(ClientAdvance::class);
    }


    public function getFinancialSummaryAttribute()
    {
        $totalBilled = $this->invoices()->sum('grand_total');
        
        $totalInvoicePaid = InvoicePayment::whereHas('invoice', function($q) {
            $q->where('client_id', $this->id);
        })->sum('amount');

        $unsettledAdvance = $this->clientAdvances()->where('is_settled', false)->sum('amount');

        $totalPaid = $totalInvoicePaid + $unsettledAdvance;

        return [
            'total_billed' => $totalBilled,
            'total_paid' => $totalPaid,
            'current_due' => $totalBilled - $totalPaid
        ];
    }
}
