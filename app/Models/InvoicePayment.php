<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Transaction;

class InvoicePayment extends Model
{
    protected $fillable = ['invoice_id', 'account_id', 'amount', 'payment_date', 'note'];

    // Ei relation-ti jog korun
    public function transaction()
    {
        return $this->morphOne(Transaction::class, 'transactionable');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}