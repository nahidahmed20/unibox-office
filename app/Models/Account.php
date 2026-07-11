<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $guarded = ['id'];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function advances()
    {
        return $this->hasMany(Advance::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function projectExpenses()
    {
        return $this->hasMany(ProjectExpense::class);
    }
}
