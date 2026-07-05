<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Requisition extends Model {
    protected $guarded = [];
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Je user approve koreche
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
