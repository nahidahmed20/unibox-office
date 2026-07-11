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

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function transaction()
    {
        return $this->morphOne(Transaction::class, 'transactionable');
    }

    public function expenseCategory()
    {
        return $this->belongsTo(ExpenseCategory::class);
    }
    
}
