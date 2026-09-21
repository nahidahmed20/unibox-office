<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'item_name',
        'description',
        'quantity',
        'unit_type',
        'unit_price',
        'total',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}