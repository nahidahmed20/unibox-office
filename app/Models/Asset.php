<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model {
    protected $guarded = [];
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
}
