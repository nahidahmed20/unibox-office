<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;
foreach (['vendor_payments','expenses','project_expenses','invoice_payments','advances','client_advances','salaries','investments','assets'] as $table) {
 if (!DB::getSchemaBuilder()->hasTable($table)) continue;
 echo $table.' columns: '.implode(',', DB::getSchemaBuilder()->getColumnListing($table)).PHP_EOL;
}
foreach (['vendor_payments'=>'VendorPayment','expenses'=>'Expense','project_expenses'=>'ProjectExpense','invoice_payments'=>'InvoicePayment','advances'=>'Advance','client_advances'=>'ClientAdvance','investments'=>'Investment','assets'=>'Asset'] as $table=>$model) {
 $rows=DB::table($table)->whereNotNull('account_id')->whereNotExists(function($q)use($table,$model){$q->selectRaw('1')->from('transactions')->whereColumn('transactionable_id', $table.'.id')->where('transactionable_type','App\\Models\\'.$model);})->get();
 echo 'Missing '.$table.': '.$rows->toJson().PHP_EOL;
}
echo 'Transaction types: '.DB::table('transactions')->selectRaw('transactionable_type, count(*) as count')->groupBy('transactionable_type')->get()->toJson().PHP_EOL;
