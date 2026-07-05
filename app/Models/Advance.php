<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Advance extends Model
{
    use HasFactory;

    protected $fillable = [
        'given_to', 'amount', 'date', 'purpose', 'status', 'notes', 'logged_by'
    ];
}
