<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $guarded = ['id'];

    public function projectExpenses()
    {
        return $this->hasMany(ProjectExpense::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function getTotalDueAttribute()
    {
        if (array_key_exists('project_due', $this->attributes)) {
            $dueFromProjects = (float) $this->attributes['project_due'];
        } elseif (array_key_exists('total_due', $this->attributes)) {
            $dueFromProjects = (float) $this->attributes['total_due'];
        } else {
            $dueFromProjects = (float) $this->projectExpenses()->sum('due_amount');
        }

        return (float) $this->opening_balance + $dueFromProjects;
    }

    public function getNetDueAttribute()
    {
        return max((float) $this->total_due - (float) $this->wallet_balance, 0);
    }

    public function ledgers()
    {
        return $this->hasMany(VendorLedger::class);
    }

    public function payments()
    {
        return $this->hasMany(VendorPayment::class)->latest('date')->latest('id');
    }
}
