<?php

namespace App\Console\Commands;

use App\Models\{Account, Advance, AdvanceBalance, Salary, Transaction, Vendor};
use Illuminate\Console\Command;

class AuditPaymentBalances extends Command
{
    protected $signature = 'finance:audit-balances {--repair-legacy-salaries : Fill missing paid totals only for paid salaries whose transactions exactly equal net pay}';
    protected $description = 'Compare saved balances with payment records without changing financial data';

    public function handle(): int
    {
        if ($this->option('repair-legacy-salaries')) {
            $repaired = 0;
            \Illuminate\Support\Facades\DB::transaction(function () use (&$repaired) {
                foreach (Salary::where('status', 'paid')->where('paid_amount', 0)->where('due_amount', 0)->where('net_pay', '>', 0)->lockForUpdate()->get() as $salary) {
                    $paid = round($salary->transactions()->where('type', 'debit')->sum('amount') - $salary->transactions()->where('type', 'debit')->sum('bank_charge'), 2);
                    if ($paid === round((float) $salary->net_pay, 2)) {
                        $salary->update(['paid_amount' => $paid]);
                        $repaired++;
                    }
                }
            });
            $this->info("Repaired {$repaired} legacy salary paid total(s) verified against transactions. Account balances were unchanged.");
        }
        $differences = [];
        $compare = function ($type, $id, $saved, $calculated) use (&$differences) {
            if (abs(round($saved, 2) - round($calculated, 2)) > 0.009) {
                $differences[] = [$type, $id, number_format($saved, 2, '.', ''), number_format($calculated, 2, '.', '')];
            }
        };
        foreach (Account::all() as $account) {
            $transactions = Transaction::where('account_id', $account->id);
            $credits = (float) (clone $transactions)->where('type', 'credit')->sum('amount');
            $debits = (float) (clone $transactions)->where('type', 'debit')->sum('amount');
            $openingRecorded = (float) (clone $transactions)->where('type', 'credit')->where('description', 'Opening Balance')->sum('amount');
            $compare('Account', $account->id, $account->current_balance, $account->opening_balance + $credits - $debits - $openingRecorded);
        }
        foreach (AdvanceBalance::all() as $balance) {
            $records = Advance::where('user_id', $balance->user_id);
            $compare('Staff given', $balance->user_id, $balance->total_given, (clone $records)->sum('amount'));
            $compare('Staff used', $balance->user_id, $balance->total_used, (clone $records)->sum('settled_amount'));
            $compare('Staff returned', $balance->user_id, $balance->total_returned, (clone $records)->sum('returned_amount'));
        }
        foreach (Vendor::all() as $vendor) {
            $compare('Vendor wallet', $vendor->id, $vendor->wallet_balance,
                $vendor->ledgers()->where('type', 'credit')->sum('amount') - $vendor->ledgers()->where('type', 'debit')->sum('amount'));
        }
        foreach (Salary::all() as $salary) {
            $compare('Salary due', $salary->id, $salary->due_amount, $salary->net_pay - $salary->paid_amount);
            $compare('Salary paid', $salary->id, $salary->paid_amount,
                $salary->transactions()->where('type', 'debit')->sum('amount') - $salary->transactions()->where('type', 'debit')->sum('bank_charge'));
        }
        if ($differences) {
            $this->table(['Record', 'ID', 'Saved', 'From records'], $differences);
            $this->warn(count($differences).' difference(s). Missing legacy transactions or opening entries need review; no balances were changed.');
            return self::FAILURE;
        }
        $this->info('All checked balances match their records. No data was changed.');
        return self::SUCCESS;
    }
}
