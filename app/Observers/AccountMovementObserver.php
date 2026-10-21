<?php

namespace App\Observers;

use App\Models\{Asset, Investment, InvestmentPayment, Transaction};
use Illuminate\Database\Eloquent\Model;

/** Keeps the transaction list in sync; account balances are handled by the source controllers. */
class AccountMovementObserver
{
    public function saved(Model $source): void
    {
        $amount = match (true) {
            $source instanceof Asset => $source->purchase_price,
            $source instanceof Investment => $source->amount,
            $source instanceof InvestmentPayment => $source->total_amount,
        };
        $key = ['transactionable_type' => $source->getMorphClass(), 'transactionable_id' => $source->id];
        if (!$source->account_id || $amount <= 0) {
            Transaction::where($key)->delete();
            return;
        }
        $date = $source instanceof Asset ? $source->purchase_date : ($source instanceof Investment ? $source->date : $source->payment_date);
        $description = $source instanceof Asset ? 'Asset purchase: '.$source->name
            : ($source instanceof Investment ? 'Investment/Loan received from ' : 'Investment principal/profit returned to ').$source->investor?->name;
        Transaction::updateOrCreate($key, [
            'account_id' => $source->account_id, 'type' => $source instanceof Investment ? 'credit' : 'debit',
            'amount' => $amount, 'bank_charge' => 0,
            'transaction_date' => $date ?: $source->created_at->toDateString(), 'description' => $description,
        ]);
    }

    public function deleted(Model $source): void
    {
        Transaction::where('transactionable_type', $source->getMorphClass())->where('transactionable_id', $source->id)->delete();
    }
}
