<?php

namespace App\Console\Commands;

use App\Services\FinanceReconciliation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileFinance extends Command
{
    protected $signature = 'finance:reconcile {--apply : Apply source-supported repairs with a private backup} {--rebuild-accounts : Recompute book balances from corrected records; does not verify bank balances}';
    protected $description = 'Preview or apply evidence-based financial repairs, preserving unresolved discrepancies';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $report = DB::transaction(function () use ($apply) {
            $tables = [];
            foreach (FinanceReconciliation::TABLES as $table) {
                $query = DB::table($table)->orderBy('id');
                if ($apply) $query->lockForUpdate();
                $tables[$table] = $query->get()->map(fn ($r) => (array) $r)->all();
            }
            $plan = (new FinanceReconciliation($tables))->plan((bool) $this->option('rebuild-accounts'));
            if (!$apply || !$plan['changes']) return $plan;
            if ($this->option('rebuild-accounts') && $plan['issues']) {
                $plan['blocked'] = true;
                return $plan;
            }

            $directory = storage_path('app/private/reconciliation');
            if (!is_dir($directory) && !mkdir($directory, 0700, true)) throw new \RuntimeException('Cannot create backup directory.');
            $path = $directory.'/repair-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';
            $json = json_encode(['created_at' => now()->toIso8601String(), 'tables' => $tables, 'plan' => $plan], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
            if (file_put_contents($path, $json, LOCK_EX) !== strlen($json)) throw new \RuntimeException('Backup failed; no changes applied.');
            foreach ($plan['changes'] as $change) {
                if ($change['before'] === null) DB::table($change['table'])->insert($change['values']);
                elseif ($change['values'] === null) DB::table($change['table'])->where('id', $change['id'])->delete();
                else DB::table($change['table'])->where('id', $change['id'])->update($change['values']);
            }
            $plan['backup'] = $path;
            return $plan;
        });

        $this->table(['Account', 'Name', 'Saved before', 'Corrected records'], array_map(fn ($a) => array_values($a), $report['accounts']));
        $this->table(['Table', 'ID', 'Action', 'Reason'], array_map(fn ($c) => [
            $c['table'], $c['id'] ?? 'new', $c['before'] === null ? 'insert' : ($c['values'] === null ? 'remove duplicate' : 'update'), $c['reason'],
        ], $report['changes']));
        if (!empty($report['blocked'])) $this->error('No changes applied: resolve the evidence gaps before rebuilding account balances. Run without --rebuild-accounts to apply only source-supported repairs.');
        else $this->info(count($report['changes']).($apply ? ' repair(s) applied.' : ' proposed repair(s); no data changed.'));
        if (isset($report['backup'])) $this->info('Backup and repair plan: '.$report['backup']);
        foreach ($report['issues'] as $issue) $this->warn($issue);
        if ($report['issues']) $this->warn('Unresolved evidence gaps remain. Matching book balances does not certify real bank/cash balances.');

        return $report['issues'] ? self::FAILURE : self::SUCCESS;
    }
}
