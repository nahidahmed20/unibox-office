<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChallanItem extends Model {
    protected $guarded = ['id'];
    public function challan() { return $this->belongsTo(Challan::class); }
    public function project() { return $this->belongsTo(Project::class); }
}
