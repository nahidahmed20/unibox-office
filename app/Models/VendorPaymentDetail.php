<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorPaymentDetail extends Model
{
    protected $guarded = ['id'];
    public function payment() { return $this->belongsTo(VendorPayment::class); }
    public function expense() { return $this->belongsTo(ProjectExpense::class); }
}
