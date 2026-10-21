<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AuditDatabaseSchema extends Command
{
    protected $signature = 'app:audit-schema';
    protected $description = 'Compare database tables and columns with migrations using an isolated in-memory reference database';

    public function handle(): int
    {
        $liveConnection = DB::getDefaultConnection();
        $live = $this->columns($liveConnection);
        $referenceConnection = 'schema_audit_reference';
        config(["database.connections.{$referenceConnection}" => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
        ]]);

        try {
            DB::setDefaultConnection($referenceConnection);
            Schema::clearResolvedInstance('db.schema');
            $result = Artisan::call('migrate', ['--database' => $referenceConnection, '--force' => true]);
            if ($result !== 0) {
                $this->error(Artisan::output());
                return self::FAILURE;
            }
            $reference = $this->columns($referenceConnection);
        } finally {
            DB::setDefaultConnection($liveConnection);
            Schema::clearResolvedInstance('db.schema');
            DB::purge($referenceConnection);
        }

        $missing = [];
        foreach ($reference as $table => $columns) {
            if (!isset($live[$table])) {
                $missing[] = [$table, '(entire table)'];
                continue;
            }
            foreach (array_diff($columns, $live[$table]) as $column) $missing[] = [$table, $column];
        }
        if ($missing) {
            $this->table(['Table', 'Missing'], $missing);
            $this->warn(count($missing).' missing table/column entry(s). Existing database data was not changed.');
            return self::FAILURE;
        }
        $this->info(count($reference).' migration-defined tables checked: no missing tables or columns. Existing data was not changed.');
        return self::SUCCESS;
    }

    private function columns(string $connection): array
    {
        $database = DB::connection($connection);
        $schema = $database->getSchemaBuilder();
        $schemaName = $database->getDriverName() === 'sqlite' ? 'main' : $database->getDatabaseName();
        $result = [];
        foreach ($schema->getTableListing($schemaName, false) as $table) {
            $result[$table] = $schema->getColumnListing($table);
        }
        return $result;
    }
}
