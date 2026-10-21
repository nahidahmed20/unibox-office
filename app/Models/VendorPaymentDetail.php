<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorPaymentDetail extends Model
{
    protected $guarded = ['id'];
    public function payment() { return $this->belongsTo(VendorPayment::class, 'vendor_payment_id'); }
    public function expense() { return $this->belongsTo(ProjectExpense::class, 'project_expense_id'); }
}
