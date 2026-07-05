<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model {
    protected $guarded = [];
    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    // Je user expense ta entry koreche
    public function logger()
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
