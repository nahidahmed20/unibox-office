<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$vendorId = 7;
$billIds = DB::table('project_expenses')->where('vendor_id', $vendorId)->pluck('id');

echo "=== TRANSACTIONS linked to vendor 7 bills (ProjectExpense) ===\n";
$tx = DB::table('transactions')->where('transactionable_type', 'App\\Models\\ProjectExpense')->whereIn('transactionable_id', $billIds)->orderBy('transaction_date')->get();
$sum = 0;
foreach ($tx as $t) {
    $sum += $t->type === 'debit' ? $t->amount - $t->bank_charge : -($t->amount - $t->bank_charge);
    echo "TX#$t->id | $t->transaction_date | $t->type | $t->amount | acc:$t->account_id | bill:$t->transactionable_id | $t->description\n";
}
echo "Net: $sum\n";

echo "\n=== TRANSACTIONS linked to vendor 7 payments (VendorPayment) ===\n";
$vpIds = DB::table('vendor_payments')->where('vendor_id', $vendorId)->pluck('id');
$tx2 = DB::table('transactions')->where('transactionable_type', 'App\\Models\\VendorPayment')->whereIn('transactionable_id', $vpIds)->orderBy('transaction_date')->get();
foreach ($tx2 as $t) {
    echo "TX#$t->id | $t->transaction_date | $t->type | $t->amount | acc:$t->account_id | vp:$t->transactionable_id\n";
}

echo "\n=== TRANSACTIONS linked to Vendor model directly ===\n";
$tx3 = DB::table('transactions')->where('transactionable_type', 'App\\Models\\Vendor')->where('transactionable_id', $vendorId)->orderBy('transaction_date')->get();
foreach ($tx3 as $t) {
    echo "TX#$t->id | $t->transaction_date | $t->type | $t->amount | acc:$t->account_id | $t->description\n";
}

echo "\n=== BILLS: paid_amount vs voucher-settled vs bill tx ===\n";
foreach (DB::table('project_expenses')->where('vendor_id', $vendorId)->orderBy('date')->get() as $b) {
    $v = DB::table('vendor_payment_details as d')->join('vendor_payments as p', 'p.id', '=', 'd.vendor_payment_id')
        ->where('p.status', 'completed')->where('d.project_expense_id', $b->id)->sum('d.amount');
    $t = DB::table('transactions')->where('transactionable_type', 'App\\Models\\ProjectExpense')->where('transactionable_id', $b->id)
        ->selectRaw("COALESCE(SUM(CASE WHEN type='debit' THEN amount-bank_charge ELSE -(amount-bank_charge) END),0) s")->value('s');
    echo "Bill#$b->id | $b->date | total:$b->total_bill | paid:$b->paid_amount | voucher:$v | billTx:$t | adv_user:$b->advance_user_id | acc:$b->account_id | pay_amt:$b->payment_amount\n";
}
