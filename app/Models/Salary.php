<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salary extends Model {
    protected $guarded = [];
    public function user() { return $this->belongsTo(User::class); }

    public function transactions()
    {
        return $this->morphMany(\App\Models\Transaction::class, 'transactionable');
    }
}
