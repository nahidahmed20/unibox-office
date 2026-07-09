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

    public function getTotalDueAttribute()
    {
        $openingBalance = $this->opening_balance;
        $dueFromProjects = $this->projectExpenses()->sum('due_amount');
        return $openingBalance + $dueFromProjects;
    }
}
