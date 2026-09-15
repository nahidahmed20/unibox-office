<?php

namespace App\Services;

use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\AdvanceSettlement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class AdvanceSettlementService
{
    // Call inside the payment's database transaction so all balances roll back together.
    public function consume(Model $owner, int $userId, float $amount): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) return;
        $balance = AdvanceBalance::where('user_id', $userId)->lockForUpdate()->first();
        if (!$balance || round($balance->balance, 2) < $amount) {
            throw ValidationException::withMessages(['advance_deduction' => 'Insufficient employee advance balance.']);
        }
        $remaining = $amount;
        foreach (Advance::where('user_id', $userId)->orderBy('date')->orderBy('id')->lockForUpdate()->get() as $advance) {
            $available = round($advance->amount - $advance->settled_amount - $advance->returned_amount, 2);
            $take = min($remaining, max($available, 0));
            if ($take <= 0) continue;
            $advance->settled_amount = round($advance->settled_amount + $take, 2);
            $advance->status = $available <= $take ? 'settled' : 'unsettled';
            $advance->save();
            AdvanceSettlement::create([
                'advance_id' => $advance->id, 'settleable_type' => $owner->getMorphClass(),
                'settleable_id' => $owner->id, 'amount' => $take,
            ]);
            $remaining = round($remaining - $take, 2);
            if ($remaining <= 0) break;
        }
        if ($remaining > 0) throw ValidationException::withMessages(['advance_deduction' => 'Advance records do not match the available balance.']);
        $balance->increment('total_used', $amount);
    }

    public function refund(Model $owner): bool
    {
        $entries = AdvanceSettlement::where('settleable_type', $owner->getMorphClass())
            ->where('settleable_id', $owner->id)->lockForUpdate()->get();
        foreach ($entries as $entry) {
            $advance = Advance::whereKey($entry->advance_id)->lockForUpdate()->firstOrFail();
            if (round($advance->settled_amount, 2) < round($entry->amount, 2)) {
                throw ValidationException::withMessages(['error' => 'Advance settlement history must be reconciled before reversing this payment.']);
            }
            $advance->settled_amount = round($advance->settled_amount - $entry->amount, 2);
            $advance->status = $advance->settled_amount + $advance->returned_amount >= $advance->amount ? 'settled' : 'unsettled';
            $advance->save();
            AdvanceBalance::where('user_id', $advance->user_id)->decrement('total_used', $entry->amount);
            $entry->delete();
        }
        return $entries->isNotEmpty();
    }
}
