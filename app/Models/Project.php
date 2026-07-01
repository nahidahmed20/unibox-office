<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model {
    protected $guarded = [];
    public function client() { return $this->belongsTo(Client::class); }
    public function tasks() { return $this->hasMany(Task::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
}