<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$expense = App\Models\ProjectExpense::find(54);
echo "Advance User ID: " . $expense->advance_user_id . "\n";
echo "Account ID: " . $expense->account_id . "\n";
echo "Direct Pay? (Wait, maybe paid_amount in DB was 81545 originally)\n";
