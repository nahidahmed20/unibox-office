<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncOldTransactions extends Command
{
    protected $signature = 'sync:old-transactions';
    protected $description = 'Sync recorded vendor account payments; flag project expenses for review';

    public function handle(): int
    {
        // paid_amount is cumulative: it includes wallet settlements and later vendor
        // payments. It is not evidence of a separate withdrawal from this account.
        $this->warn('Project expense transactions cannot be reconstructed from paid_amount. Review original account movements before restoring missing entries.');
        return $this->call('sync:old-vendor-payments');
    }
}
