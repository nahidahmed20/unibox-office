<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Investor extends Model {
    protected $guarded = [];

    public function investments() {
        return $this->hasMany(Investment::class);
    }

    public function payments() {
        return $this->hasMany(InvestmentPayment::class);
    }
}
