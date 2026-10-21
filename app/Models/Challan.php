<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Challan extends Model {
    protected $guarded = ['id'];
    public function client() { return $this->belongsTo(Client::class); }
    public function items() { return $this->hasMany(ChallanItem::class); }
}
