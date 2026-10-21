<?php

namespace Tests\Feature;

use App\Models\{Account, Asset, Transaction, User, Vendor, VendorPayment, Investment, InvestmentPayment, Investor};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransactionVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_reads_vendor_transactions_and_filters_by_payment_date_and_source(): void
    {
        $this->withoutVite();
        $this->actingAs(User::factory()->create());
        $account = Account::create(['name' => 'Bank', 'type' => 'bank', 'current_balance' => 1000]);
        $vendor = Vendor::create(['name' => 'Searchable Printer']);
        $payment = VendorPayment::create(['vendor_id' => $vendor->id, 'account_id' => $account->id, 'payment_source' => 'account', 'pay_amount' => 100, 'date' => '2026-08-01', 'created_by' => auth()->id()]);
        $tx = Transaction::create(['account_id' => $account->id, 'type' => 'debit', 'amount' => 100, 'transaction_date' => '2026-08-01', 'description' => 'Bill settled', 'transactionable_type' => VendorPayment::class, 'transactionable_id' => $payment->id]);
        $this->get(route('admin.account.transactions', ['search' => 'Searchable Printer', 'source_type' => 'vendor_payment', 'from' => '2026-08-01', 'to' => '2026-08-01']))->assertOk()->assertInertia(fn (Assert $page) => $page->component('Admin/Reports/TransactionsReport')->has('transactions.data', 1)->where('transactions.data.0.id', $tx->id)->where('transactions.data.0.source_type', 'vendor_payment'));
        $this->get(route('admin.account.transactions', ['source_type' => 'expense']))->assertOk()->assertInertia(fn (Assert $page) => $page->has('transactions.data', 0));
    }

    public function test_asset_transaction_tracks_create_edit_delete_and_balance_once(): void
    {
        $this->actingAs(User::factory()->create());
        $account = Account::create(['name' => 'Bank', 'type' => 'bank', 'current_balance' => 1000]);
        $data = ['name' => 'Printer', 'asset_code' => 'PR-1', 'condition' => 'new', 'purchase_price' => 100, 'purchase_date' => '2026-08-01', 'account_id' => $account->id];
        $this->post(route('admin.assets.store'), $data)->assertSessionHasNoErrors();
        $asset = Asset::firstOrFail();
        $this->assertEquals(900, $account->fresh()->current_balance);
        $this->assertDatabaseHas('transactions', ['transactionable_type' => Asset::class, 'transactionable_id' => $asset->id, 'amount' => 100]);
        $this->put(route('admin.assets.update', $asset), array_replace($data, ['purchase_price' => 200]))->assertSessionHasNoErrors();
        $this->assertEquals(800, $account->fresh()->current_balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertEquals(200, Transaction::first()->amount);
        $this->delete(route('admin.assets.destroy', $asset))->assertSessionHasNoErrors();
        $this->assertEquals(1000, $account->fresh()->current_balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_investment_sync_and_repair_are_repeatable_and_do_not_change_balance(): void
    {
        $account = Account::create(['name' => 'Bank', 'type' => 'bank', 'current_balance' => 1000]);
        $investor = Investor::create(['name' => 'Partner', 'type' => 'partner']);
        $investment = Investment::create(['investor_id' => $investor->id, 'account_id' => $account->id, 'investment_type' => 'equity', 'amount' => 500, 'date' => '2026-08-01', 'status' => 'active']);
        InvestmentPayment::create(['investor_id' => $investor->id, 'investment_id' => $investment->id, 'account_id' => $account->id, 'principal_amount' => 50, 'profit_amount' => 10, 'total_amount' => 60, 'payment_date' => '2026-08-02']);
        $this->assertDatabaseHas('transactions', ['type' => 'debit', 'amount' => 60]);
        $investment->update(['amount' => 600]);
        $this->assertDatabaseCount('transactions', 2);
        $this->assertDatabaseHas('transactions', ['type' => 'credit', 'amount' => 600]);
        Transaction::query()->delete();
        $this->artisan('app:restore-account-transactions')->assertSuccessful();
        $this->assertDatabaseCount('transactions', 0);
        $this->artisan('app:restore-account-transactions', ['--apply' => true])->assertSuccessful();
        $this->artisan('app:restore-account-transactions', ['--apply' => true])->assertSuccessful();
        $this->assertDatabaseCount('transactions', 2);
        $this->assertEquals(1000, $account->fresh()->current_balance);
    }
}
