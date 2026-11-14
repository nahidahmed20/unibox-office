<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class AccountAllocationService
{
    public function normalize(array $rows, float $expectedAmount, bool $allowCharges = false): array
    {
        $rows = array_values(array_filter($rows, fn ($row) => !empty($row['account_id']) || !empty($row['amount'])));
        if ($expectedAmount <= 0 || $rows === []) {
            throw ValidationException::withMessages(['account_payments' => 'Add at least one account allocation.']);
        }

        $ids = [];
        $total = 0.0;
        $normalized = [];
        foreach ($rows as $index => $row) {
            $accountId = (int) ($row['account_id'] ?? 0);
            $amount = round((float) ($row['amount'] ?? 0), 2);
            $charge = round((float) ($row['bank_charge'] ?? 0), 2);
            if ($accountId < 1 || $amount <= 0 || $charge < 0 || (!$allowCharges && $charge > 0)) {
                throw ValidationException::withMessages(["account_payments.{$index}" => 'Each allocation must have a valid account and positive amount.']);
            }
            if (in_array($accountId, $ids, true)) {
                throw ValidationException::withMessages(["account_payments.{$index}.account_id" => 'Choose each account only once.']);
            }
            $ids[] = $accountId;
            $total += $amount;
            $normalized[] = ['account_id' => $accountId, 'amount' => $amount, 'bank_charge' => $charge];
        }

        if (abs(round($total, 2) - round($expectedAmount, 2)) > 0.001) {
            throw ValidationException::withMessages(['account_payments' => 'Account allocations must equal the payment amount.']);
        }

        $accounts = Account::whereIn('id', $ids)->where('is_active', true)->get()->keyBy('id');
        if ($accounts->count() !== count($ids)) {
            throw ValidationException::withMessages(['account_payments' => 'Every selected account must be active.']);
        }

        return $normalized;
    }

    public function fromRequest(array $data, float $expectedAmount, bool $allowCharges = false): array
    {
        if (isset($data['account_payments']) && is_array($data['account_payments'])) {
            return $this->normalize($data['account_payments'], $expectedAmount, $allowCharges);
        }
        if (empty($data['account_id'])) {
            throw ValidationException::withMessages(['account_id' => 'Select an account or add account allocations.']);
        }
        return $this->normalize([[
            'account_id' => $data['account_id'],
            'amount' => $expectedAmount,
            'bank_charge' => $data['bank_charge'] ?? 0,
        ]], $expectedAmount, $allowCharges);
    }

    public function replace(Model $source, array $allocations, string $type, string $date, string $description): void
    {
        $this->reverse($source, $type);
        foreach ($allocations as $allocation) {
            $account = Account::whereKey($allocation['account_id'])->lockForUpdate()->firstOrFail();
            $amount = round((float) $allocation['amount'], 2);
            $charge = round((float) ($allocation['bank_charge'] ?? 0), 2);
            $movement = $amount + ($type === 'debit' ? $charge : 0);

            if ($type === 'debit') {
                if ((float) $account->current_balance < $movement) {
                    throw ValidationException::withMessages(['account_payments' => "Insufficient balance in {$account->name}."]);
                }
                $account->decrement('current_balance', $movement);
            } else {
                $account->increment('current_balance', $amount);
            }

            Transaction::create([
                'account_id' => $account->id,
                'type' => $type,
                'amount' => $movement,
                'bank_charge' => $charge,
                'transaction_date' => $date,
                'description' => $description,
                'transactionable_id' => $source->getKey(),
                'transactionable_type' => $source->getMorphClass(),
            ]);
        }
    }

    public function reverse(Model $source, ?string $type = null): int
    {
        $transactions = Transaction::where('transactionable_type', $source->getMorphClass())
            ->where('transactionable_id', $source->getKey())
            ->when($type, fn ($query) => $query->where('type', $type))
            ->lockForUpdate()
            ->get();

        foreach ($transactions as $transaction) {
            $account = Account::whereKey($transaction->account_id)->lockForUpdate()->first();
            if ($account) {
                if ($transaction->type === 'debit') {
                    $account->increment('current_balance', $transaction->amount);
                } else {
                    if ((float) $account->current_balance < (float) $transaction->amount) {
                        throw ValidationException::withMessages([
                            'account_payments' => "Insufficient balance in {$account->name} to reverse this payment.",
                        ]);
                    }
                    $account->decrement('current_balance', $transaction->amount);
                }
            }
            $transaction->delete();
        }

        return $transactions->count();
    }

    public function rowsFor(Model $source, ?string $type = null): array
    {
        return Transaction::where('transactionable_type', $source->getMorphClass())
            ->where('transactionable_id', $source->getKey())
            ->whereIn('type', ['debit', 'credit'])
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderBy('id')
            ->get()
            ->map(fn (Transaction $transaction) => [
                'account_id' => $transaction->account_id,
                'amount' => round((float) $transaction->amount - (float) ($transaction->type === 'debit' ? $transaction->bank_charge : 0), 2),
                'bank_charge' => (float) $transaction->bank_charge,
            ])
            ->all();
    }
}
