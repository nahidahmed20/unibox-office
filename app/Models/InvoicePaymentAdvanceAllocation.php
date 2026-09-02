<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoicePaymentAdvanceAllocation extends Model
{
    protected $guarded = ['id'];

    public function payment()
    {
        return $this->belongsTo(InvoicePayment::class, 'invoice_payment_id');
    }

    public function clientAdvance()
    {
        return $this->belongsTo(ClientAdvance::class);
    }
}
