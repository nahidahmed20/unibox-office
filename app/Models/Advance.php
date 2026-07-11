<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Advance extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function logger()
    {
        return $this->belongsTo(User::class, 'logged_by');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
