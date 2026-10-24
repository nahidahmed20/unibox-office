<?php

namespace Tests\Feature;

use App\Models\{Account, Advance, AdvanceBalance, Client, ClientAdvance, Expense, ExpenseCategory, Invoice, InvoicePayment, Project, ProjectExpense, Salary, Transaction, User, Vendor, VendorLedger, VendorPayment, VendorPaymentDetail};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PaymentAccountingTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;
    private Account $account;
    private Project $project;
    private ExpenseCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->staff = User::factory()->create();
        $this->actingAs($this->staff);
        $this->account = Account::create(['name' => 'Main Bank', 'type' => 'bank', 'current_balance' => 10000]);
        $client = Client::create(['name' => 'Client Alpha', 'company_name' => 'Alpha Company']);
        $this->project = Project::create(['client_id' => $client->id, 'title' => 'Exhibition Booth', 'deadline' => '2026-12-31']);
        $this->category = ExpenseCategory::create(['name' => 'Printing', 'slug' => 'printing']);
    }

    private function advance(float $amount = 500): Advance
    {
        $advance = Advance::create(['user_id' => $this->staff->id, 'amount' => $amount, 'date' => '2026-08-01']);
        AdvanceBalance::firstOrCreate(['user_id' => $this->staff->id])->increment('total_given', $amount);
        return $advance;
    }

    private function expenseData(array $overrides = []): array
    {
        return array_replace([
            'project_id' => $this->project->id, 'expense_category_id' => $this->category->id,
            'title' => 'Printing bill', 'payee_name' => 'Karim Printer', 'total_bill' => 1000,
            'paid_amount' => 1000, 'date' => '2026-09-01', 'pay_type' => 'account',
            'account_id' => $this->account->id, 'bank_charge' => 10,
        ], $overrides);
    }

    private function salaryData(array $overrides = []): array
    {
        return array_replace([
            'user_id' => $this->staff->id, 'month_year' => '09-2026', 'basic_salary' => 1000,
            'advance_deduction' => 300, 'status' => 'paid', 'payment_date' => '2026-09-01',
            'payments' => [['account_id' => $this->account->id, 'amount' => 700, 'bank_charge' => 10]],
        ], $overrides);
    }

    public function test_client_advance_and_legacy_invoice_advance_are_included_in_all_client_balances(): void
    {
        $client = Client::create(['name' => 'Advance Client']);
        $invoice = Invoice::create([
            'client_id' => $client->id,
            'invoice_number' => 'INV-ADV-001',
            'invoice_date' => '2026-09-01',
            'due_date' => '2026-09-30',
            'sub_total' => 1000,
            'grand_total' => 1000,
            'advance_used' => 200,
            'status' => 'partially_paid',
        ]);
        ClientAdvance::create([
            'client_id' => $client->id,
            'account_id' => $this->account->id,
            'amount' => 300,
            'used_amount' => 100,
            'date' => '2026-08-01',
        ]);
        InvoicePayment::create([
            'invoice_id' => $invoice->id,
            'account_id' => null,
            'method' => 'Client Advance',
            'amount' => 100,
            'payment_date' => '2026-09-02',
        ]);
        InvoicePayment::create([
            'invoice_id' => $invoice->id,
            'account_id' => null,
            'method' => 'Cash',
            'amount' => 250,
            'payment_date' => '2026-09-03',
        ]);

        $this->get(route('admin.clients.index', ['search' => 'Advance Client']))->assertInertia(fn (Assert $p) => $p
            ->where('clients.data.0.total_paid', 550)
            ->where('clients.data.0.invoice_due', 450)
            ->where('clients.data.0.advance_balance', 200)
            ->where('clients.data.0.net_due', 250)
            ->etc());

        $this->get(route('admin.client-dues', ['search' => 'Advance Client']))->assertInertia(fn (Assert $p) => $p
            ->where('clientDues.data.0.total_paid', 550)
            ->where('clientDues.data.0.invoice_due', 450)
            ->where('clientDues.data.0.available_advance', 200)
            ->where('clientDues.data.0.net_due', 250)
            ->where('grandTotalNetDue', 250)
            ->etc());

        $this->get(route('admin.clients.show', $client))->assertInertia(fn (Assert $p) => $p
            ->where('client.financial_summary.total_paid', 550)
            ->where('client.financial_summary.invoice_due', 450)
            ->where('client.financial_summary.advance_balance', 200)
            ->where('client.financial_summary.net_due', 250)
            ->where('client.invoices.0.paid_amount', 550)
            ->where('client.invoices.0.due_amount', 450)
            ->etc());

        $this->get(route('admin.invoices.index'))->assertInertia(fn (Assert $p) => $p
            ->where('invoices.data.0.paid_amount', 550)
            ->where('invoices.data.0.legacy_advance_used', 200)
            ->where('invoices.data.0.advance_used', 300)
            ->where('invoices.data.0.due_amount', 450)
            ->where('totals.paid_amount', 550)
            ->where('totals.due_amount', 450)
            ->etc());

        $this->get(route('admin.invoices.edit', $invoice))->assertInertia(fn (Assert $p) => $p
            ->where('invoice.advance_used', 300)
            ->where('invoice.cash_paid', 250)
            ->etc());

        $this->get(route('admin.reports.client-ledger', ['client_id' => $client->id]))->assertInertia(fn (Assert $p) => $p
            ->where('summary.total_paid', 550)
            ->where('summary.total_advance', 200)
            ->where('summary.net_due', 250)
            ->etc());

        ClientAdvance::create([
            'client_id' => $client->id,
            'account_id' => $this->account->id,
            'amount' => 500,
            'used_amount' => 0,
            'date' => '2026-08-02',
        ]);
        $this->post(route('admin.invoices.apply-advance', $invoice))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('invoice_payments', [
            'invoice_id' => $invoice->id,
            'method' => 'Client Advance',
            'amount' => 450,
        ]);
        $this->assertEquals('paid', $invoice->fresh()->status);
    }

    public function test_invoice_payment_endpoint_rejects_cross_client_and_overdue_allocations(): void
    {
        $client = Client::create(['name' => 'Payment Boundary Client']);
        $invoice = Invoice::create([
            'client_id' => $client->id,
            'invoice_number' => 'INV-PAY-BOUNDARY',
            'invoice_date' => '2026-09-01',
            'due_date' => '2026-09-30',
            'sub_total' => 1000,
            'grand_total' => 1000,
            'advance_used' => 200,
            'status' => 'partially_paid',
        ]);

        $this->post(route('invoice-payments.store'), [
            'client_id' => $client->id,
            'invoices' => [['id' => $invoice->id, 'pay_amount' => 801, 'discount' => 0]],
            'advance_amount' => 0,
            'account_payments' => [['account_id' => $this->account->id, 'amount' => 801]],
            'payment_date' => '2026-09-10',
        ])->assertSessionHasErrors('invoices');
        $this->assertDatabaseCount('invoice_payments', 0);
        $this->assertEquals(10000, $this->account->fresh()->current_balance);

        $otherClient = Client::create(['name' => 'Different Payment Client']);
        $otherInvoice = Invoice::create([
            'client_id' => $otherClient->id,
            'invoice_number' => 'INV-PAY-OTHER',
            'invoice_date' => '2026-09-01',
            'due_date' => '2026-09-30',
            'sub_total' => 100,
            'grand_total' => 100,
            'advance_used' => 0,
            'status' => 'unpaid',
        ]);
        $this->post(route('invoice-payments.store'), [
            'client_id' => $client->id,
            'invoices' => [['id' => $otherInvoice->id, 'pay_amount' => 100, 'discount' => 0]],
            'advance_amount' => 0,
            'account_payments' => [['account_id' => $this->account->id, 'amount' => 100]],
            'payment_date' => '2026-09-10',
        ])->assertSessionHasErrors('invoices');
        $this->assertDatabaseCount('invoice_payments', 0);
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_deleting_legacy_client_advance_payment_restores_advance_balance(): void
    {
        $client = Client::create(['name' => 'Legacy Advance Refund Client']);
        $advance = ClientAdvance::create([
            'client_id' => $client->id,
            'account_id' => $this->account->id,
            'amount' => 300,
            'used_amount' => 100,
            'date' => '2026-08-01',
        ]);
        $invoice = Invoice::create([
            'client_id' => $client->id,
            'invoice_number' => 'INV-LEGACY-REFUND',
            'invoice_date' => '2026-09-01',
            'due_date' => '2026-09-30',
            'sub_total' => 100,
            'grand_total' => 100,
            'advance_used' => 0,
            'status' => 'paid',
        ]);
        $payment = InvoicePayment::create([
            'invoice_id' => $invoice->id,
            'account_id' => null,
            'method' => 'Client Advance',
            'amount' => 100,
            'payment_date' => '2026-09-02',
        ]);

        $this->delete(route('invoice-payments.destroy', $payment))->assertSessionHasNoErrors();
        $this->assertEquals(0, $advance->fresh()->used_amount);
        $this->assertDatabaseMissing('invoice_payments', ['id' => $payment->id]);
        $this->assertEquals('unpaid', $invoice->fresh()->status);
    }

    public function test_vendor_net_payable_subtracts_only_remaining_wallet_advance_in_all_summaries(): void
    {
        $vendor = Vendor::create(['name' => 'Advance Vendor', 'opening_balance' => 100, 'wallet_balance' => 400]);
        $this->post(route('admin.project-expenses.store'), $this->expenseData([
            'vendor_id' => $vendor->id,
            'paid_amount' => 0,
            'bank_charge' => 0,
        ]))->assertSessionHasNoErrors();

        $this->get(route('admin.vendors.index'))->assertInertia(fn (Assert $p) => $p
            ->where('vendors.data.0.total_due', 1100)
            ->where('vendors.data.0.net_due', 700)
            ->etc());

        $this->get(route('admin.vendors.show', $vendor))->assertInertia(fn (Assert $p) => $p
            ->where('vendor.total_due', 1100)
            ->where('vendor.net_due', 700)
            ->where('stats.netDue', 700)
            ->etc());

        $this->get(route('admin.vendor-dues'))->assertInertia(fn (Assert $p) => $p
            ->where('vendorDues.data.0.total_due', 1100)
            ->where('vendorDues.data.0.net_due', 700)
            ->where('grandTotalNetDue', 700)
            ->etc());

        $this->get(route('admin.reports.vendor-ledger', ['vendor_id' => $vendor->id]))->assertInertia(fn (Assert $p) => $p
            ->where('summary.gross_due', 1100)
            ->where('summary.wallet_balance', 400)
            ->where('summary.net_due', 700)
            ->etc());
    }

    public function test_dashboard_does_not_double_count_client_advances_and_uses_all_account_cash_movements(): void
    {
        $client = Client::create(['name' => 'Dashboard Client']);
        Invoice::create([
            'client_id' => $client->id,
            'invoice_number' => 'INV-DASH-001',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'sub_total' => 1000,
            'grand_total' => 1000,
            'advance_used' => 0,
            'status' => 'unpaid',
        ]);
        ClientAdvance::create([
            'client_id' => $client->id,
            'account_id' => $this->account->id,
            'amount' => 500,
            'used_amount' => 0,
            'date' => now()->toDateString(),
        ]);
        Transaction::create([
            'account_id' => $this->account->id,
            'type' => 'credit',
            'amount' => 123,
            'transaction_date' => now()->toDateString(),
            'description' => 'Other cash receipt',
        ]);
        Transaction::create([
            'account_id' => $this->account->id,
            'type' => 'debit',
            'amount' => 47,
            'transaction_date' => now()->toDateString(),
            'description' => 'Other cash payment',
        ]);

        $this->get(route('dashboard'))->assertInertia(fn (Assert $p) => $p
            ->where('stats.totalClientDue', 1000)
            ->where('stats.netClientDue', 500)
            ->where('stats.totalReceivables', 1000)
            ->where('stats.totalPayables', 500)
            ->where('stats.overallNetWorth', 10500)
            ->where('stats.monthlyCashIn', 123)
            ->where('stats.monthlyCashOut', 47)
            ->etc());
    }

    public function test_salary_deducts_advance_and_reverses_exact_entries_when_edited_and_deleted(): void
    {
        $advance = $this->advance();
        $this->post(route('admin.salaries.store'), $this->salaryData())->assertSessionHasNoErrors();
        $salary = Salary::firstOrFail();
        $this->assertEquals(700, $salary->net_pay);
        $this->assertEquals(9290, $this->account->fresh()->current_balance);
        $this->assertEquals(300, $advance->fresh()->settled_amount);
        $this->assertEquals(200, AdvanceBalance::first()->balance);
        $this->put(route('admin.salaries.update', $salary), $this->salaryData())->assertSessionHasNoErrors();
        $this->assertEquals(9290, $this->account->fresh()->current_balance);
        $this->assertEquals(300, $advance->fresh()->settled_amount);
        $this->delete(route('admin.salaries.destroy', $salary))->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
        $this->assertEquals(0, $advance->fresh()->settled_amount);
        $this->assertEquals(500, AdvanceBalance::first()->balance);
    }

    public function test_invalid_salary_advance_rolls_back_account_payment(): void
    {
        $this->advance(100);
        $this->post(route('admin.salaries.store'), $this->salaryData())->assertSessionHasErrors('advance_deduction');
        $this->assertDatabaseCount('salaries', 0);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_unpaid_salary_allows_blank_payment_rows_and_all_pagination_has_global_totals(): void
    {
        for ($i = 0; $i < 26; $i++) {
            $this->post(route('admin.salaries.store'), $this->salaryData([
                'advance_deduction' => 0, 'status' => 'unpaid',
                'payments' => [['account_id' => '', 'amount' => '', 'bank_charge' => '']],
            ]))->assertSessionHasNoErrors();
        }
        $this->get(route('admin.salaries.index'))->assertInertia(fn (Assert $p) => $p
            ->has('salaries.data', 25)->where('salaries.total', 26)->where('totals.net_pay', 26000)->etc());
        $this->get(route('admin.salaries.index', ['per_page' => 'all']))->assertInertia(fn (Assert $p) => $p->has('salaries.data', 26)->etc());
        $this->get(route('admin.salaries.index', ['per_page' => 0]))->assertOk();
    }

    public function test_project_payee_can_exist_without_vendor_and_bank_charge_is_additional(): void
    {
        $this->post(route('admin.project-expenses.store'), $this->expenseData())->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->assertNull($expense->vendor_id);
        $this->assertSame('Karim Printer', $expense->payee_name);
        $this->assertEquals(1000, $expense->paid_amount);
        $this->assertEquals(0, $expense->due_amount);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertEquals(1010, Transaction::first()->amount);
        $this->put(route('admin.project-expenses.update', $expense), $this->expenseData())->assertSessionHasNoErrors();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->delete(route('admin.project-expenses.destroy', $expense))->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_expense_search_includes_client_company_project_payee_category_and_account(): void
    {
        $this->post(route('admin.project-expenses.store'), $this->expenseData())->assertSessionHasNoErrors();
        foreach (['Client Alpha', 'Alpha Company', 'Exhibition', 'Karim', 'Printing', 'Main Bank'] as $search) {
            $this->get(route('admin.project-expenses.index', ['search' => $search]))->assertInertia(fn (Assert $p) => $p->has('project_expenses.data', 1)->etc());
        }
        $this->get(route('admin.project-expenses.index', ['search' => 'missing']))->assertInertia(fn (Assert $p) => $p->has('project_expenses.data', 0)->etc());
    }

    public function test_advance_overpayment_is_fully_restored_and_does_not_touch_salary_settlement(): void
    {
        $advance = $this->advance(1500);
        $this->post(route('admin.salaries.store'), $this->salaryData())->assertSessionHasNoErrors();
        $vendor = Vendor::create(['name' => 'Printer']);
        $data = $this->expenseData(['vendor_id' => $vendor->id, 'total_bill' => 500, 'paid_amount' => 700, 'bank_charge' => 0, 'pay_type' => 'advance', 'account_id' => null, 'advance_user_id' => $this->staff->id]);
        $this->post(route('admin.project-expenses.store'), $data)->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->assertEquals(200, $vendor->fresh()->wallet_balance);
        $this->assertEquals(1000, $advance->fresh()->settled_amount);
        $this->get(route('admin.project-expenses.edit', $expense))->assertInertia(fn (Assert $p) => $p->where('expense.paid_amount', 700)->etc());
        $this->delete(route('admin.project-expenses.destroy', $expense))->assertSessionHasNoErrors();
        $this->assertEquals(0, $vendor->fresh()->wallet_balance);
        $this->assertEquals(300, $advance->fresh()->settled_amount);
        $this->assertEquals(1200, AdvanceBalance::first()->balance);
    }

    public function test_vendor_advance_date_charge_and_undo_use_the_linked_transaction(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.vendors.add-advance', $vendor), ['account_id' => $this->account->id, 'amount' => 1000, 'bank_charge' => 10, 'date' => '2026-08-10'])->assertSessionHasNoErrors();
        $this->assertEquals(1000, $vendor->fresh()->wallet_balance);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertDatabaseHas('vendor_ledgers', ['date' => '2026-08-10', 'transaction_id' => Transaction::first()->id]);
        $this->assertDatabaseHas('transactions', ['transaction_date' => '2026-08-10', 'bank_charge' => 10]);
        $this->post(route('admin.vendors.add-advance', $vendor), ['undo_last' => true])->assertSessionHasNoErrors();
        $this->assertEquals(0, $vendor->fresh()->wallet_balance);
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_vendor_wallet_settlement_and_void_never_withdraw_the_same_money_twice(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.vendors.add-advance', $vendor), ['account_id' => $this->account->id, 'amount' => 1000, 'bank_charge' => 10, 'date' => '2026-08-10'])->assertSessionHasNoErrors();
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $data = ['project_expense_ids' => [$expense->id], 'payment_source' => 'wallet', 'pay_amount' => 600, 'date' => '2026-09-10'];
        $this->post(route('admin.vendors.pay', $vendor), $data)->assertSessionHasNoErrors();
        $payment = VendorPayment::firstOrFail();
        $this->assertEquals(400, $vendor->fresh()->wallet_balance);
        $this->assertEquals(400, $expense->fresh()->due_amount);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertNull($payment->account_id);
        $this->assertDatabaseHas('vendor_ledgers', ['vendor_id' => $vendor->id, 'type' => 'debit', 'amount' => 600, 'date' => '2026-09-10']);
        $this->post(route('admin.vendors.pay', $vendor), $data)->assertSessionHasErrors('error');
        $this->assertDatabaseCount('vendor_payments', 1);
        $this->post(route('admin.vendors.payments.void', $payment), ['void_reason' => 'Wrong bill'])->assertSessionHasNoErrors();
        $this->assertEquals(1000, $vendor->fresh()->wallet_balance);
        $this->assertEquals(1000, $expense->fresh()->due_amount);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->post(route('admin.vendors.payments.void', $payment), ['void_reason' => 'Repeated'])->assertSessionHasErrors('error');
        $this->assertEquals(1000, $vendor->fresh()->wallet_balance);
    }

    public function test_wallet_cannot_exceed_bill_or_balance_or_include_bank_charges(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.vendors.add-advance', $vendor), ['account_id' => $this->account->id, 'amount' => 1500, 'date' => '2026-08-10'])->assertSessionHasNoErrors();
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        foreach ([[1200, 0], [1600, 0], [500, 10]] as [$amount, $charge]) {
            $this->post(route('admin.vendors.pay', $vendor), ['project_expense_ids' => [$expense->id], 'payment_source' => 'wallet', 'pay_amount' => $amount, 'bank_charge' => $charge, 'date' => '2026-09-10'])->assertSessionHasErrors('error');
        }
        $this->assertEquals(1000, $expense->fresh()->due_amount);
        $this->assertEquals(1500, $vendor->fresh()->wallet_balance);
        $this->assertEquals(8500, $this->account->fresh()->current_balance);
        $this->assertDatabaseCount('vendor_payments', 0);
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_legacy_sync_does_not_create_a_second_withdrawal_for_a_settled_bill(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->post(route('admin.vendors.pay', $vendor), ['project_expense_ids' => [$expense->id], 'payment_source' => 'account', 'account_id' => $this->account->id, 'pay_amount' => 1000, 'bank_charge' => 10, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        // Legacy bills may retain an account even though a later payment settled them.
        $expense->update(['account_id' => $this->account->id]);
        $this->artisan('sync:old-transactions')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 1);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        Transaction::query()->delete();
        $this->artisan('sync:old-vendor-payments')->assertSuccessful();
        $this->artisan('sync:old-vendor-payments')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('transactions', ['amount' => 1010, 'bank_charge' => 10]);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
    }

    public function test_reconciliation_preview_apply_and_repeat_are_safe(): void
    {
        $this->account->update(['opening_balance' => 10000]);
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->post(route('admin.vendors.pay', $vendor), ['project_expense_ids' => [$expense->id], 'payment_source' => 'account', 'account_id' => $this->account->id, 'pay_amount' => 1000, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        $expense->update(['payment_amount' => null]);
        $duplicate = Transaction::create(['account_id' => $this->account->id, 'type' => 'debit', 'amount' => 1000, 'bank_charge' => 0, 'transactionable_type' => ProjectExpense::class, 'transactionable_id' => $expense->id, 'transaction_date' => '2026-09-10', 'description' => 'Project Expense (Auto Synced): Bill']);
        $this->account->update(['current_balance' => 8000]);
        $this->artisan('finance:reconcile', ['--rebuild-accounts' => true])->assertSuccessful();
        $this->assertDatabaseHas('transactions', ['id' => $duplicate->id]);
        $this->assertEquals(8000, $this->account->fresh()->current_balance);
        $this->artisan('finance:reconcile', ['--apply' => true, '--rebuild-accounts' => true])->assertSuccessful();
        $this->assertDatabaseMissing('transactions', ['id' => $duplicate->id]);
        $this->assertEquals(9000, $this->account->fresh()->current_balance);
        $this->artisan('finance:reconcile', ['--apply' => true, '--rebuild-accounts' => true])->expectsOutput('0 repair(s) applied.')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_reconciliation_will_not_rebuild_accounts_with_unresolved_refund_history(): void
    {
        $this->account->update(['opening_balance' => 10000, 'current_balance' => 9000]);
        Advance::create(['user_id' => $this->staff->id, 'account_id' => $this->account->id, 'amount' => 1000, 'returned_amount' => 100, 'date' => '2026-09-01']);
        $this->artisan('finance:reconcile', ['--apply' => true, '--rebuild-accounts' => true])->assertFailed();
        $this->assertEquals(9000, $this->account->fresh()->current_balance);
        $this->assertDatabaseCount('advance_balances', 0);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_vendor_bulk_payment_charge_void_and_expense_edit_guard(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->post(route('admin.vendors.pay', $vendor), ['project_expense_ids' => [$expense->id], 'payment_source' => 'account', 'account_id' => $this->account->id, 'pay_amount' => 1000, 'bank_charge' => 10, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        foreach ([[2000, 7990, 0, 1000], [1000, 8990, 0, 0], [500, 9490, 500, 0], [1000, 8990, 0, 0]] as [$amount, $balance, $due, $wallet]) {
            $this->patch(route('admin.vendors.payments.bank-charge', VendorPayment::firstOrFail()), ['pay_amount' => $amount, 'bank_charge' => 10])->assertSessionHasNoErrors();
            $this->assertEquals($balance, $this->account->fresh()->current_balance);
            $this->assertEquals($due, $expense->fresh()->due_amount);
            $this->assertEquals($wallet, $vendor->fresh()->wallet_balance);
        }
        $this->assertEquals(0, $expense->fresh()->due_amount);
        $this->delete(route('admin.project-expenses.destroy', $expense))->assertSessionHasErrors('error');
        $payment = VendorPayment::firstOrFail();
        $this->post(route('admin.vendors.payments.void', $payment), ['void_reason' => 'Correction'])->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
        $this->assertEquals(1000, $expense->fresh()->due_amount);
        $this->post(route('admin.vendors.payments.void', $payment), ['void_reason' => 'Again'])->assertSessionHasErrors('error');
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_vendor_bank_charge_can_be_corrected_without_changing_bill_settlement(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id, 'paid_amount' => 0, 'bank_charge' => 0]))->assertSessionHasNoErrors();
        $expense = ProjectExpense::firstOrFail();
        $this->post(route('admin.vendors.pay', $vendor), ['project_expense_ids' => [$expense->id], 'payment_source' => 'account', 'account_id' => $this->account->id, 'pay_amount' => 1000, 'bank_charge' => 0, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        $payment = VendorPayment::firstOrFail();
        $url = route('admin.vendors.payments.bank-charge', $payment);
        foreach ([10, 10, 5, 0, 10] as $charge) {
            $this->patch($url, ['bank_charge' => $charge])->assertSessionHasNoErrors();
            $this->assertEquals(9000 - $charge, $this->account->fresh()->current_balance);
            $this->assertEquals($charge, $payment->fresh()->bank_charge);
            $this->assertEquals(1000 + $charge, Transaction::where('transactionable_type', VendorPayment::class)->firstOrFail()->amount);
            $this->assertEquals(0, $expense->fresh()->due_amount);
        }
        $this->patch($url, ['bank_charge' => 10000])->assertSessionHasErrors('bank_charge');
        $this->patch($url, ['bank_charge' => -1])->assertSessionHasErrors('bank_charge');
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->post(route('admin.vendors.payments.void', $payment), ['void_reason' => 'Correction'])->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
        $this->patch($url, ['bank_charge' => 20])->assertSessionHasErrors('bank_charge');
    }

    public function test_insufficient_balance_including_charge_rolls_back_expense(): void
    {
        $this->account->update(['current_balance' => 1000]);
        $this->post(route('admin.project-expenses.store'), $this->expenseData())->assertSessionHasErrors('error');
        $this->assertDatabaseCount('project_expenses', 0);
        $this->assertEquals(1000, $this->account->fresh()->current_balance);
    }

    public function test_manual_outgoing_payment_fee_survives_edit_and_delete(): void
    {
        $data = ['account_id' => $this->account->id, 'type' => 'debit', 'amount' => 1000, 'bank_charge' => 10, 'transaction_date' => '2026-09-10', 'description' => 'Payment to client'];
        $this->post(route('admin.transactions.store'), $data)->assertSessionHasNoErrors();
        $transaction = Transaction::firstOrFail();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->put(route('admin.transactions.update', $transaction), $data)->assertSessionHasNoErrors();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->delete(route('admin.transactions.destroy', $transaction))->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_office_expense_fee_and_refund(): void
    {
        $this->post(route('admin.expenses.store'), ['title' => 'Office supplies', 'expense_category_id' => $this->category->id, 'pay_type' => 'account', 'account_id' => $this->account->id, 'amount' => 1000, 'bank_charge' => 10, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->delete(route('admin.expenses.destroy', Expense::firstOrFail()))->assertSessionHasNoErrors();
        $this->assertEquals(10000, $this->account->fresh()->current_balance);
    }

    public function test_report_includes_partial_salary_payments_on_actual_payment_date_and_bank_charges(): void
    {
        $this->post(route('admin.salaries.store'), $this->salaryData([
            'advance_deduction' => 0, 'status' => 'partially_paid', 'payment_date' => '2026-08-10',
            'payments' => [['account_id' => $this->account->id, 'amount' => 400, 'bank_charge' => 5]],
        ]))->assertSessionHasNoErrors();
        $salary = Salary::firstOrFail();
        $this->post(route('salaries.pay', $salary), ['account_id' => $this->account->id, 'amount' => 200, 'bank_charge' => 2, 'date' => '2026-09-10'])->assertSessionHasNoErrors();
        $this->get(route('admin.reports.financial', ['month' => '2026-09']))->assertInertia(fn (Assert $p) => $p
            ->where('summary.total_salary_paid', 200)->where('summary.total_bank_charges', 2)
            ->where('summary.total_cash_out', 202)->etc());
    }

    public function test_financial_report_cash_flow_includes_account_movements_but_excludes_opening_balances_and_transfers(): void
    {
        $date = now()->toDateString();
        Transaction::create(['account_id' => $this->account->id, 'type' => 'credit', 'amount' => 123, 'transaction_date' => $date, 'description' => 'Investment received']);
        Transaction::create(['account_id' => $this->account->id, 'type' => 'debit', 'amount' => 77, 'transaction_date' => $date, 'description' => 'Manual payment']);
        Transaction::create(['account_id' => $this->account->id, 'type' => 'credit', 'amount' => 500, 'transaction_date' => $date, 'description' => 'Opening Balance']);
        Transaction::create(['account_id' => $this->account->id, 'type' => 'debit', 'amount' => 52, 'bank_charge' => 2, 'transaction_date' => $date, 'description' => 'Fund transfer to Cash (Out)']);
        Transaction::create(['account_id' => $this->account->id, 'type' => 'credit', 'amount' => 50, 'transaction_date' => $date, 'description' => 'Fund transfer from Bank (In)']);
        $investor = \App\Models\Investor::create(['name' => 'Test Investor']);
        $investment = \App\Models\Investment::create([
            'investor_id' => $investor->id,
            'account_id' => $this->account->id,
            'investment_type' => 'loan',
            'amount' => 500,
            'date' => $date,
        ]);
        $investmentPayment = \App\Models\InvestmentPayment::create([
            'investor_id' => $investor->id,
            'investment_id' => $investment->id,
            'account_id' => $this->account->id,
            'principal_amount' => 50,
            'profit_amount' => 50,
            'total_amount' => 100,
            'payment_date' => $date,
        ]);
        $this->assertDatabaseHas('transactions', [
            'transactionable_id' => $investmentPayment->id,
            'transactionable_type' => \App\Models\InvestmentPayment::class,
            'type' => 'debit',
            'amount' => 100,
            'transaction_date' => $date,
        ]);

        $this->get(route('admin.reports.financial', ['start_date' => $date, 'end_date' => $date]))
            ->assertInertia(fn (Assert $p) => $p
                ->where('summary.total_cash_in', 623)
                ->where('summary.total_cash_out', 179)
                ->where('summary.net_cash_flow', 444)
                ->etc());
    }

    public function test_receivable_aging_uses_due_date_instead_of_invoice_date(): void
    {
        $invoice = Invoice::create([
            'client_id' => $this->project->client_id,
            'invoice_number' => 'INV-AGING-001',
            'invoice_date' => now()->subDays(100)->toDateString(),
            'due_date' => now()->subDays(10)->toDateString(),
            'sub_total' => 1000,
            'grand_total' => 1000,
        ]);

        $this->get(route('admin.reports.expense-analysis'))->assertInertia(fn (Assert $p) => $p
            ->where('receivableAging.0.ref', $invoice->invoice_number)
            ->where('receivableAging.0.days_old', 10)
            ->where('receivableAging.0.bucket', '0-30 Days')
            ->where('receivableAging.0.due_date', $invoice->due_date)
            ->etc());
    }

    public function test_vendor_payment_report_does_not_subtract_voided_voucher_details_from_direct_payments(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $bill = ProjectExpense::create([
            'project_id' => $this->project->id,
            'expense_category_id' => $this->category->id,
            'title' => 'Partially paid bill',
            'vendor_id' => $vendor->id,
            'total_bill' => 100,
            'paid_amount' => 20,
            'due_amount' => 80,
            'payment_status' => 'partial',
            'date' => now()->toDateString(),
            'logged_by' => $this->staff->id,
        ]);
        $voidedPayment = VendorPayment::create([
            'vendor_id' => $vendor->id,
            'payment_source' => 'account',
            'account_id' => $this->account->id,
            'pay_amount' => 50,
            'date' => now()->toDateString(),
            'status' => 'voided',
        ]);
        VendorPaymentDetail::create([
            'vendor_payment_id' => $voidedPayment->id,
            'project_expense_id' => $bill->id,
            'amount' => 50,
        ]);

        $this->get(route('admin.vendor-payments', ['per_page' => 'all']))->assertInertia(fn (Assert $p) => $p
            ->where('payments.data.0.type', 'Direct Bill')
            ->where('payments.data.0.amount', 20)
            ->etc());
    }

    public function test_account_summary_vendor_advance_has_correct_sign(): void
    {
        Vendor::create(['name' => 'Printer', 'wallet_balance' => 1000]);
        $this->get(route('admin.accounts.index'))->assertInertia(fn (Assert $p) => $p->where('summary.vendor_advance', 1000)->etc());
    }

    public function test_project_and_vendor_pagination_defaults_and_all_preserve_search(): void
    {
        for ($i = 0; $i < 26; $i++) Vendor::create(['name' => 'Printer '.$i]);
        for ($i = 0; $i < 26; $i++) {
            Project::create([
                'client_id' => $this->project->client_id,
                'title' => 'Pagination Project '.$i,
                'deadline' => '2026-12-31',
            ]);
        }
        $this->get(route('admin.vendors.index'))->assertInertia(fn (Assert $p) => $p->has('vendors.data', 25)->etc());
        $this->get(route('admin.vendors.index', ['per_page' => 'all', 'search' => 'Printer']))->assertInertia(fn (Assert $p) => $p->has('vendors.data', 26)->etc());
        $this->get(route('admin.projects.index', ['per_page' => 0]))->assertInertia(fn (Assert $p) => $p->where('projects.per_page', 25)->etc());
        $this->get(route('admin.projects.index', ['per_page' => 'all', 'search' => 'Pagination Project']))
            ->assertInertia(fn (Assert $p) => $p->has('projects.data', 26)->etc());
    }

    public function test_salary_can_be_fully_settled_by_advance_without_bank_payment(): void
    {
        $this->advance(1000);
        $this->post(route('admin.salaries.store'), $this->salaryData([
            'advance_deduction' => 1000,
            'payments' => [['account_id' => '', 'amount' => 0, 'bank_charge' => 0]],
        ]))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('salaries', ['net_pay' => 0, 'due_amount' => 0, 'status' => 'paid']);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertEquals(0, AdvanceBalance::first()->balance);
    }

    public function test_converting_an_expense_to_vendor_advance_does_not_withdraw_twice(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.project-expenses.store'), $this->expenseData(['vendor_id' => $vendor->id]))->assertSessionHasNoErrors();
        $this->post(route('admin.project-expenses.move-to-wallet', ProjectExpense::firstOrFail()))->assertSessionHasNoErrors();
        $this->assertDatabaseCount('project_expenses', 0);
        $this->assertEquals(1000, $vendor->fresh()->wallet_balance);
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertDatabaseHas('transactions', ['transactionable_type' => Vendor::class, 'transactionable_id' => $vendor->id, 'amount' => 1010]);
    }

    public function test_legacy_salary_repair_only_changes_totals_supported_by_transactions(): void
    {
        $this->post(route('admin.salaries.store'), $this->salaryData(['advance_deduction' => 0, 'payments' => [['account_id' => $this->account->id, 'amount' => 1000]]]))->assertSessionHasNoErrors();
        $salary = Salary::firstOrFail();
        $salary->update(['paid_amount' => 0]);
        $this->artisan('finance:audit-balances', ['--repair-legacy-salaries' => true])->run();
        $this->assertEquals(1000, $salary->fresh()->paid_amount);
        $this->assertEquals(9000, $this->account->fresh()->current_balance);
        $salary->refresh()->update(['paid_amount' => 0, 'net_pay' => 1200]);
        $this->artisan('finance:audit-balances', ['--repair-legacy-salaries' => true])->run();
        $this->assertEquals(0, $salary->fresh()->paid_amount);
    }

    public function test_bank_transfer_fee_is_debited_only_from_source(): void
    {
        $destination = Account::create(['name' => 'Cash', 'type' => 'cash', 'current_balance' => 0]);
        $this->post(route('admin.transactions.transfer'), ['from_account_id' => $this->account->id, 'to_account_id' => $destination->id, 'amount' => 1000, 'bank_charge' => 10, 'transaction_date' => '2026-09-10'])->assertSessionHasNoErrors();
        $this->assertEquals(8990, $this->account->fresh()->current_balance);
        $this->assertEquals(1000, $destination->fresh()->current_balance);
        $this->assertDatabaseHas('transactions', ['account_id' => $this->account->id, 'amount' => 1010, 'bank_charge' => 10]);
        $this->assertDatabaseHas('transactions', ['account_id' => $destination->id, 'amount' => 1000, 'bank_charge' => 0]);
    }

    public function test_invoice_payment_clients_show_only_their_unused_advance_before_selecting_invoice(): void
    {
        $client = Client::findOrFail($this->project->client_id);
        $other = Client::create(['name' => 'Other Client']);
        foreach ([[$client, 1000, 400], [$client, 200, 200], [$other, 5000, 0]] as [$owner, $amount, $used]) {
            \App\Models\ClientAdvance::create(['client_id' => $owner->id, 'account_id' => $this->account->id, 'amount' => $amount, 'used_amount' => $used, 'date' => '2026-09-10', 'is_settled' => $amount === $used]);
        }
        $this->assertEquals(600, $client->fresh()->advance_balance);
        $this->get(route('invoice-payments.index'))->assertInertia(fn (Assert $p) => $p
            ->where('clients.0.id', $client->id)->where('clients.0.advance_balance', 600)
            ->where('clients.1.id', $other->id)->where('clients.1.advance_balance', 5000)
            ->has('invoices', 0)->etc());
    }

    public function test_vendor_payment_and_refund_keep_their_separate_selected_dates(): void
    {
        $vendor = Vendor::create(['name' => 'Printer']);
        $this->post(route('admin.vendors.add-advance', $vendor), ['account_id' => $this->account->id, 'amount' => 1000, 'date' => '2026-09-13'])->assertSessionHasNoErrors();
        $this->post(route('admin.vendors.receive-refund', $vendor), ['account_id' => $this->account->id, 'amount' => 400, 'date' => '2026-09-15'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('transactions', ['type' => 'debit', 'transaction_date' => '2026-09-13', 'amount' => 1000]);
        $this->assertDatabaseHas('transactions', ['type' => 'credit', 'transaction_date' => '2026-09-15', 'amount' => 400]);
        $this->assertDatabaseHas('vendor_ledgers', ['vendor_id' => $vendor->id, 'type' => 'credit', 'date' => '2026-09-13']);
        $this->assertDatabaseHas('vendor_ledgers', ['vendor_id' => $vendor->id, 'type' => 'debit', 'date' => '2026-09-15']);
        $this->assertEquals(600, $vendor->fresh()->wallet_balance);
    }
}
