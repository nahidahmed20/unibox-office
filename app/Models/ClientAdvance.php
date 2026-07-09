<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientAdvance extends Model
{
    protected $guarded = [];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function getAvailableAmountAttribute()
    {
        return $this->amount - $this->used_amount;
    }
}