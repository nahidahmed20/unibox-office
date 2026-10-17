<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdvanceBalance extends Model
{
    protected $fillable = ['user_id', 'total_given', 'total_used', 'total_returned'];
    protected $casts = ['total_given' => 'decimal:2', 'total_used' => 'decimal:2', 'total_returned' => 'decimal:2'];

    public function user() { return $this->belongsTo(User::class); }

    public function getBalanceAttribute()
    {
        return $this->total_given - $this->total_used - $this->total_returned;
    }

    /**
     * Reconcile and synchronize AdvanceBalance directly from advances table for a specific user.
     */
    public static function syncForUser(int $userId): self
    {
        $balance = self::firstOrCreate(['user_id' => $userId]);
        $balance->total_given = round((float) Advance::where('user_id', $userId)->sum('amount'), 2);
        $balance->total_used = round((float) Advance::where('user_id', $userId)->sum('settled_amount'), 2);
        $balance->total_returned = round((float) Advance::where('user_id', $userId)->sum('returned_amount'), 2);
        $balance->save();
        return $balance;
    }

    /**
     * Reconcile all users having advances.
     */
    public static function syncAll(): void
    {
        $userIds = Advance::distinct()->pluck('user_id')->filter()->unique();
        foreach ($userIds as $userId) {
            self::syncForUser((int) $userId);
        }
    }
}