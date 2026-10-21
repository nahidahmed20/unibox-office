<?php

namespace App\Console\Commands;

use App\Models\{Asset, Investment, InvestmentPayment, Transaction};
use App\Observers\AccountMovementObserver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RestoreAccountMovementTransactions extends Command
{
    protected $signature = 'app:restore-account-transactions {--apply : Insert missing records without changing balances}';
    protected $description = 'Audit and restore missing asset and investment transactions';

    public function handle(): int
    {
        $missing = collect();
        foreach ([Asset::class, Investment::class, InvestmentPayment::class] as $model) {
            $amount = $model === Asset::class ? 'purchase_price' : ($model === Investment::class ? 'amount' : 'total_amount');
            foreach ($model::whereNotNull('account_id')->where($amount, '>', 0)->get() as $source) {
                if (!Transaction::where('transactionable_type', $source->getMorphClass())->where('transactionable_id', $source->id)->exists()) $missing->push($source);
            }
        }
        $this->table(['Source', 'ID'], $missing->map(fn ($s) => [class_basename($s), $s->id])->all());
        if (!$this->option('apply') || $missing->isEmpty()) {
            $this->info($missing->count().' missing transaction(s).');
            return self::SUCCESS;
        }
        $path = storage_path('app/transaction-backups/'.now()->format('Ymd-His').'.json');
        if (!is_dir(dirname($path))) mkdir(dirname($path), 0755, true);
        $backup = ['accounts' => DB::table('accounts')->get(), 'transactions' => DB::table('transactions')->get(), 'sources' => $missing];
        if (file_put_contents($path, json_encode($backup, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)) === false) throw new \RuntimeException('Backup failed.');
        DB::transaction(function () use ($missing) {
            $before = DB::table('accounts')->orderBy('id')->lockForUpdate()->get()->toJson();
            foreach ($missing as $source) {
                $source = $source->newQuery()->whereKey($source->id)->lockForUpdate()->firstOrFail();
                if (!Transaction::where('transactionable_type', $source->getMorphClass())->where('transactionable_id', $source->id)->exists()) {
                    app(AccountMovementObserver::class)->saved($source);
                }
            }
            if ($before !== DB::table('accounts')->orderBy('id')->get()->toJson()) throw new \RuntimeException('Account balances changed unexpectedly.');
        });
        $this->info('Restored '.$missing->count().' transactions; account records unchanged. Backup: '.$path);
        return self::SUCCESS;
    }
}
