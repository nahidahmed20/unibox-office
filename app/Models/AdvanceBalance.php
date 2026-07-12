<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdvanceBalance extends Model
{
    protected $fillable = ['user_id', 'total_given', 'total_used', 'total_returned'];
    protected $casts = ['total_given' => 'decimal:2', 'total_used' => 'decimal:2', 'total_returned' => 'decimal:2'];

    public function user() { return $this->belongsTo(User::class); }

    public function getBalanceAttribute()
    {
        return $this->total_given - $this->total_used - $this->total_returned;
    }
}