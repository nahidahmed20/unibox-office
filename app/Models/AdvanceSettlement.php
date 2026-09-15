<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdvanceSettlement extends Model
{
    protected $guarded = ['id'];

    public function advance() { return $this->belongsTo(Advance::class); }
    public function settleable() { return $this->morphTo(); }
}
