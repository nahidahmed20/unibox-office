<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model {
    protected $guarded = [];
    public function designations() { return $this->hasMany(Designation::class); }
    public function users() { return $this->hasMany(User::class); }
}
