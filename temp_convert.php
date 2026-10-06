<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ProjectExpense;
use App\Models\VendorPayment;
use App\Models\VendorPaymentDetail;
use App\Models\VendorLedger;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

DB::beginTransaction();
try {
    $directs = [
        ['expense_id' => 10, 'amount' => 1420.00, 'date' => '2026-07-04'],
        ['expense_id' => 222, 'amount' => 2030.00, 'date' => '2026-08-13']
    ];

    foreach($directs as $d) {
        $expense = ProjectExpense::find($d['expense_id']);
        if (!$expense || $expense->vendor_id != 7) continue;

        // Create Voucher
        $voucher = VendorPayment::create([
            'vendor_id' => 7,
            'date' => $d['date'],
            'voucher_number' => 'VP-' . date('Ymd', strtotime($d['date'])) . '-' . rand(100,999),
            'pay_amount' => $d['amount'],
            'adjustment_amount' => 0,
            'payment_method' => 'cash',
            'account_id' => $expense->account_id ?? 1,
            'note' => 'System Auto-Converted Direct Payment from Expense #' . $expense->id,
            'status' => 'completed',
            'logged_by' => 1
        ]);

        // Link Voucher to Expense
        VendorPaymentDetail::create([
            'vendor_payment_id' => $voucher->id,
            'project_expense_id' => $expense->id,
            'amount' => $d['amount']
        ]);

        // Ledger Entry for Payment
        VendorLedger::create([
            'vendor_id' => 7,
            'date' => $d['date'],
            'type' => 'payment',
            'amount' => $d['amount'],
            'description' => 'Payment against Voucher ' . $voucher->voucher_number,
            'reference_id' => $voucher->id,
            'vendor_payment_id' => $voucher->id
        ]);
        
        // We DON'T need to change $expense->paid_amount because the voucher detail now accounts for it.
        // Wait, if we create a new voucher and transaction, we are duplicating the cash out!
        // Because the original Project Expense already created a Transaction!
        // We need to think carefully about the Transaction table.
    }
    
    // DB::commit();
    echo "Dry run completed. Check logic.\n";
} catch (\Exception $e) {
    DB::rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}

