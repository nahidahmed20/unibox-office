<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model {
    protected $guarded = [];
    public function logger() { return $this->belongsTo(User::class, 'logged_by'); }
}
