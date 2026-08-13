<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class InvestmentPayment extends Model {
    protected $guarded = [];

    public function investor() {
        return $this->belongsTo(Investor::class);
    }

    public function investment() {
        return $this->belongsTo(Investment::class);
    }

    public function account() {
        return $this->belongsTo(Account::class);
    }
}