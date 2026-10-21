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

        $advances = Advance::where('user_id', $userId)
            ->orderBy('date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $availableTotal = round($advances->sum(fn ($a) => max($a->amount - $a->settled_amount - $a->returned_amount, 0)), 2);

        if ($availableTotal < $amount) {
            throw ValidationException::withMessages([
                'advance_deduction' => 'Insufficient employee advance balance. Available: ৳' . number_format($availableTotal, 2)
            ]);
        }

        $remaining = $amount;
        foreach ($advances as $advance) {
            $available = round($advance->amount - $advance->settled_amount - $advance->returned_amount, 2);
            $take = min($remaining, max($available, 0));
            if ($take <= 0) continue;
            $advance->settled_amount = round($advance->settled_amount + $take, 2);
            $advance->status = $available <= $take ? 'settled' : 'unsettled';
            $advance->save();
            AdvanceSettlement::create([
                'advance_id' => $advance->id,
                'settleable_type' => $owner->getMorphClass(),
                'settleable_id' => $owner->id,
                'amount' => $take,
            ]);
            $remaining = round($remaining - $take, 2);
            if ($remaining <= 0) break;
        }

        if ($remaining > 0) {
            throw ValidationException::withMessages(['advance_deduction' => 'Advance records do not match the available balance.']);
        }

        AdvanceBalance::syncForUser($userId);
    }

    public function refund(Model $owner): bool
    {
        $entries = AdvanceSettlement::where('settleable_type', $owner->getMorphClass())
            ->where('settleable_id', $owner->id)->lockForUpdate()->get();
        $affectedUsers = [];
        foreach ($entries as $entry) {
            $advance = Advance::whereKey($entry->advance_id)->lockForUpdate()->firstOrFail();
            if (round($advance->settled_amount, 2) < round($entry->amount, 2)) {
                throw ValidationException::withMessages(['error' => 'Advance settlement history must be reconciled before reversing this payment.']);
            }
            $advance->settled_amount = round($advance->settled_amount - $entry->amount, 2);
            $advance->status = $advance->settled_amount + $advance->returned_amount >= $advance->amount ? 'settled' : 'unsettled';
            $advance->save();
            $affectedUsers[$advance->user_id] = true;
            $entry->delete();
        }
        foreach (array_keys($affectedUsers) as $uid) {
            AdvanceBalance::syncForUser((int) $uid);
        }
        return $entries->isNotEmpty();
    }
}
