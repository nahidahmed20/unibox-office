<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Investment extends Model {
    protected $guarded = [];

    public function investor() {
        return $this->belongsTo(Investor::class);
    }

    public function account() {
        return $this->belongsTo(Account::class);
    }

    public function payments() {
        return $this->hasMany(InvestmentPayment::class);
    }
}