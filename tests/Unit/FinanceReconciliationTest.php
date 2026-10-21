<?php

namespace Tests\Unit;

use App\Services\FinanceReconciliation;
use Tests\TestCase;

class FinanceReconciliationTest extends TestCase
{
    private function fixture(): array
    {
        return [
            'accounts' => [['id' => 1, 'name' => 'Bank', 'opening_balance' => '2000.00', 'current_balance' => '1000.00']],
            'project_expenses' => [['id' => 1, 'payment_amount' => null, 'advance_user_id' => null, 'paid_amount' => '1000.00', 'title' => 'Bill']],
            'transactions' => [
                ['id' => 1, 'account_id' => 1, 'transactionable_type' => 'App\\Models\\ProjectExpense', 'transactionable_id' => 1, 'amount' => '1000.00', 'bank_charge' => '0.00', 'type' => 'debit', 'description' => 'Project Expense (Auto Synced): Bill', 'created_at' => '2026-08-29 07:00:00'],
                ['id' => 2, 'account_id' => 1, 'transactionable_type' => 'App\\Models\\VendorPayment', 'transactionable_id' => 1, 'amount' => '600.00', 'bank_charge' => '0.00', 'type' => 'debit', 'description' => 'Vendor payment', 'created_at' => '2026-08-20 07:00:00'],
            ],
            'vendor_payments' => [['id' => 1, 'status' => 'completed', 'created_at' => '2026-08-20 07:00:00']],
            'vendor_payment_details' => [['id' => 1, 'project_expense_id' => 1, 'vendor_payment_id' => 1, 'amount' => '600.00']],
        ];
    }

    public function test_only_pre_sync_allocations_are_removed_and_original_cash_is_preserved(): void
    {
        $plan = (new FinanceReconciliation($this->fixture()))->plan(true);
        $this->assertSame('400.00', $plan['changes'][0]['values']['amount']);
        $this->assertSame('1000.00', $plan['accounts'][0]['from_records']);
        $this->assertCount(1, $plan['changes']);
        $this->assertSame([], $plan['issues']);
    }

    public function test_payment_after_sync_is_not_a_duplicate(): void
    {
        $data = $this->fixture();
        $data['transactions'][0]['amount'] = '400.00';
        $data['vendor_payments'][0]['created_at'] = '2026-09-01 07:00:00';
        $this->assertSame([], (new FinanceReconciliation($data))->plan()['changes']);
    }

    public function test_ambiguous_history_is_flagged_not_changed(): void
    {
        $data = $this->fixture();
        $data['project_expenses'][0]['paid_amount'] = '1200.00';
        $plan = (new FinanceReconciliation($data))->plan();
        $this->assertSame([], $plan['changes']);
        $this->assertStringContainsString('ambiguous', $plan['issues'][0]);
    }

    public function test_rebuild_uses_opening_once_and_never_invents_cash_to_hide_negative_balances(): void
    {
        $data = $this->fixture();
        $data['accounts'][0]['opening_balance'] = '100.00';
        $data['transactions'][] = ['id' => 3, 'account_id' => 1, 'transactionable_type' => null, 'transactionable_id' => null, 'amount' => '100.00', 'type' => 'credit', 'description' => 'Opening Balance'];
        $plan = (new FinanceReconciliation($data))->plan(true);
        $this->assertSame('-900.00', $plan['accounts'][0]['from_records']);
        $this->assertSame('-900.00', $plan['changes'][1]['values']['current_balance']);
        $this->assertStringContainsString('negative', implode(' ', $plan['issues']));
        $this->assertEmpty(array_filter($plan['changes'], fn ($c) => $c['before'] === null));
    }

    public function test_missing_refund_does_not_assume_money_was_returned_to_original_account(): void
    {
        $data = ['advances' => [['id' => 1, 'user_id' => 3, 'amount' => '100.00', 'settled_amount' => '60.00', 'returned_amount' => '40.00']]];
        $plan = (new FinanceReconciliation($data))->plan();
        $this->assertCount(1, $plan['changes']);
        $this->assertSame('advance_balances', $plan['changes'][0]['table']);
        $this->assertStringContainsString('Original receiving account/date required', $plan['issues'][0]);
    }

    public function test_legacy_client_advance_is_allocated_without_a_second_cash_receipt(): void
    {
        $data = [
            'invoices' => [['id' => 1, 'client_id' => 2]],
            'invoice_payments' => [['id' => 1, 'invoice_id' => 1, 'account_id' => 3, 'method' => 'Client Advance', 'amount' => '90.00', 'payment_date' => '2026-08-01', 'created_at' => '2026-08-01 10:00:00']],
            'client_advances' => [['id' => 1, 'client_id' => 2, 'account_id' => 3, 'amount' => '100.00', 'used_amount' => '90.00', 'date' => '2026-07-01']],
        ];
        $plan = (new FinanceReconciliation($data))->plan();
        $this->assertCount(2, $plan['changes']);
        $this->assertSame('invoice_payment_advance_allocations', $plan['changes'][0]['table']);
        $this->assertSame(['account_id' => null], $plan['changes'][1]['values']);
        $this->assertSame([], $plan['issues']);
        $data['client_advances'][] = array_replace($data['client_advances'][0], ['id' => 2]);
        $ambiguous = (new FinanceReconciliation($data))->plan();
        $this->assertSame([], $ambiguous['changes']);
        $this->assertCount(1, $ambiguous['issues']);
    }
}
