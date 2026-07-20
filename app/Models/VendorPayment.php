<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorPayment extends Model
{
    protected $guarded = ['id'];
    public function details() { return $this->hasMany(VendorPaymentDetail::class); }
    public function vendor()  { return $this->belongsTo(Vendor::class); }
    public function account() { return $this->belongsTo(Account::class); }
}
