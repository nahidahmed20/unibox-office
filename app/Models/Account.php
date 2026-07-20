<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $guarded = ['id'];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function advances()
    {
        return $this->hasMany(Advance::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function projectExpenses()
    {
        return $this->hasMany(ProjectExpense::class);
    }

    // app/Models/Account.php

    public function debit($amount, $transactionable = null, $referenceNumber = null, $description = null, $date = null)
    {
        $this->decrement('current_balance', $amount);
        $this->refresh();

        return $this->transactions()->create([
            'type'                 => 'debit',
            'amount'               => $amount,
            'transactionable_type' => $transactionable ? get_class($transactionable) : null,
            'transactionable_id'   => $transactionable?->id,
            'transaction_date'     => $date ?? now()->toDateString(),
            'reference_number'     => $referenceNumber,
            'description'          => $description,
        ]);
    }

    public function credit($amount, $transactionable = null, $referenceNumber = null, $description = null, $date = null)
    {
        $this->increment('current_balance', $amount);
        $this->refresh();

        return $this->transactions()->create([
            'type'                 => 'credit',
            'amount'               => $amount,
            'transactionable_type' => $transactionable ? get_class($transactionable) : null,
            'transactionable_id'   => $transactionable?->id,
            'transaction_date'     => $date ?? now()->toDateString(),
            'reference_number'     => $referenceNumber,
            'description'          => $description,
        ]);
    }
}
