<?php

namespace App\Services;

/** Builds an inspectable repair plan; it never writes to the database itself. */
class FinanceReconciliation
{
    public const TABLES = [
        'accounts', 'transactions', 'account_transactions', 'project_expenses',
        'vendor_payments', 'vendor_payment_details', 'vendor_ledgers', 'vendors',
        'assets', 'investments', 'investment_payments', 'advances', 'advance_balances',
        'advance_settlements', 'salaries', 'expenses', 'invoices', 'invoice_payments',
        'client_advances', 'invoice_payment_advance_allocations',
    ];

    private array $data;
    private array $changes = [];
    private array $issues = [];
    private int $temporaryId = -1;

    public function __construct(array $tables)
    {
        foreach (self::TABLES as $table) {
            $this->data[$table] = array_column($tables[$table] ?? [], null, 'id');
        }
    }

    public function plan(bool $rebuildAccounts = false): array
    {
        $this->repairSyncedExpenses();
        $this->restoreSourceMovements();
        $this->repairSalaryTotals();
        $this->repairStaffSummaries();
        $this->repairClientAdvancePayments();
        $accounts = $this->accountBalances($rebuildAccounts);

        return ['changes' => $this->changes, 'issues' => $this->issues, 'accounts' => $accounts];
    }

    private function cents($value): int
    {
        return (int) round((float) ($value ?? 0) * 100);
    }

    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    private function movements(string $model, int $id): array
    {
        return array_values(array_filter($this->data['transactions'], fn ($t) =>
            $t['transactionable_type'] === 'App\\Models\\'.$model && (int) $t['transactionable_id'] === $id));
    }

    private function change(string $table, int $id, ?array $values, string $reason): void
    {
        $before = $this->data[$table][$id];
        if ($values !== null) {
            $different = false;
            foreach ($values as $key => $value) {
                $old = $before[$key] ?? null;
                $same = is_numeric($old) && is_numeric($value)
                    ? $this->cents($old) === $this->cents($value)
                    : $old === $value;
                if (!$same) $different = true;
            }
            if (!$different) return;
        }
        $this->changes[] = ['table' => $table, 'id' => $id, 'before' => $before, 'values' => $values, 'reason' => $reason];
        if ($values === null) unset($this->data[$table][$id]);
        else $this->data[$table][$id] = array_replace($before, $values);
    }

    private function insert(string $table, array $values, string $reason): void
    {
        $this->changes[] = ['table' => $table, 'id' => null, 'before' => null, 'values' => $values, 'reason' => $reason];
        $id = $this->temporaryId--;
        $this->data[$table][$id] = ['id' => $id] + $values;
    }

    private function repairSyncedExpenses(): void
    {
        foreach ($this->data['transactions'] as $t) {
            if ($t['transactionable_type'] !== 'App\\Models\\ProjectExpense'
                || $t['type'] !== 'debit' || !str_starts_with($t['description'] ?? '', 'Project Expense (Auto Synced):')) continue;
            $expense = $this->data['project_expenses'][$t['transactionable_id']] ?? null;
            if (!$expense || $expense['payment_amount'] !== null || $expense['advance_user_id']
                || count($this->movements('ProjectExpense', $expense['id'])) !== 1) continue;

            $included = 0;
            $later = 0;
            $paymentIds = [];
            foreach ($this->data['vendor_payment_details'] as $detail) {
                if ($detail['project_expense_id'] !== $expense['id']) continue;
                $payment = $this->data['vendor_payments'][$detail['vendor_payment_id']] ?? null;
                if (!$payment || $payment['status'] !== 'completed') continue;
                if ($payment['created_at'] <= $t['created_at']) {
                    $included += $this->cents($detail['amount']);
                    $paymentIds[] = $payment['id'];
                } else $later += $this->cents($detail['amount']);
            }
            if (!$included) continue;
            // Only correct the known cumulative-paid sync bug when the historical
            // amount is reproducible. A later allocation must never be subtracted.
            if ($this->cents($expense['paid_amount']) - $later !== $this->cents($t['amount'])
                || $included > $this->cents($t['amount']) || $this->cents($t['bank_charge']) !== 0) {
                $this->issues[] = "Transaction {$t['id']}: synced expense history is ambiguous; unchanged.";
                continue;
            }
            $amount = $this->cents($t['amount']) - $included;
            $reason = 'Remove settlement already represented by vendor payments '.implode(', ', array_unique($paymentIds)).'; these allocations predate the sync. Account balances are rebuilt separately.';
            $this->change('transactions', $t['id'], $amount === 0 ? null : [
                'amount' => $this->money($amount),
                'description' => 'Project Expense (Reconciled original payment): '.$expense['title'],
            ], $reason);
        }
    }

    private function restoreSourceMovements(): void
    {
        foreach ([['assets', 'Asset', 'purchase_price', 'purchase_date', 'debit'],
            ['investments', 'Investment', 'amount', 'date', 'credit'],
            ['investment_payments', 'InvestmentPayment', 'total_amount', 'payment_date', 'debit']] as [$table, $model, $column, $date, $type]) {
            foreach ($this->data[$table] as $row) {
                if (!$row['account_id'] || $this->cents($row[$column]) <= 0 || $this->movements($model, $row['id'])) continue;
                $this->insert('transactions', [
                    'account_id' => $row['account_id'], 'type' => $type, 'amount' => $row[$column], 'bank_charge' => '0.00',
                    'transactionable_type' => 'App\\Models\\'.$model, 'transactionable_id' => $row['id'],
                    'transaction_date' => $row[$date] ?: substr($row['created_at'], 0, 10), 'reference_number' => null,
                    'description' => "Restored {$model} #{$row['id']} from original source record",
                    'created_at' => $row['created_at'], 'updated_at' => now()->toDateTimeString(),
                ], "Restore missing {$model} movement; do not apply the payment again.");
            }
        }
    }

    private function repairSalaryTotals(): void
    {
        foreach ($this->data['salaries'] as $salary) {
            $paid = 0;
            foreach ($this->movements('Salary', $salary['id']) as $t) {
                $paid += ($t['type'] === 'debit' ? 1 : -1) * ($this->cents($t['amount']) - $this->cents($t['bank_charge']));
            }
            $net = $this->cents($salary['net_pay']);
            if ($paid < 0 || $paid > $net) {
                $this->issues[] = "Salary {$salary['id']}: transactions exceed net salary; unchanged.";
                continue;
            }
            // Only fill the documented legacy default, not overwrite conflicting history.
            if ($salary['status'] === 'paid' && $this->cents($salary['paid_amount']) === 0 && $paid === $net) {
                $this->change('salaries', $salary['id'], ['paid_amount' => $this->money($paid), 'due_amount' => '0.00'], 'Fill legacy salary total verified against linked payments.');
            }
        }
    }

    private function repairStaffSummaries(): void
    {
        $totals = [];
        foreach ($this->data['advances'] as $advance) {
            $user = $advance['user_id'];
            $totals[$user] ??= ['total_given' => 0, 'total_used' => 0, 'total_returned' => 0];
            foreach (['total_given' => 'amount', 'total_used' => 'settled_amount', 'total_returned' => 'returned_amount'] as $target => $source) {
                $totals[$user][$target] += $this->cents($advance[$source]);
            }
            $returned = 0;
            foreach ($this->movements('Advance', $advance['id']) as $t) if ($t['type'] === 'credit') $returned += $this->cents($t['amount']);
            if ($returned !== $this->cents($advance['returned_amount'])) {
                $this->issues[] = "Advance {$advance['id']}: returned {$advance['returned_amount']}, recorded refund {$this->money($returned)}. Original receiving account/date required; no refund invented.";
            }
        }
        foreach ($totals as $user => $values) {
            $values = array_map(fn ($v) => $this->money($v), $values);
            $existing = array_values(array_filter($this->data['advance_balances'], fn ($r) => $r['user_id'] === $user));
            if (count($existing) === 1) $this->change('advance_balances', $existing[0]['id'], $values, 'Rebuild staff summary from original advances; preserve individual settlements and returns.');
            elseif (!$existing) $this->insert('advance_balances', ['user_id' => $user] + $values, 'Restore missing staff summary.');
            else $this->issues[] = "Staff {$user}: multiple summary records; unchanged.";
        }
    }

    private function repairClientAdvancePayments(): void
    {
        foreach ($this->data['invoice_payments'] as $payment) {
            if ($payment['method'] !== 'Client Advance') continue;
            $allocated = 0;
            foreach ($this->data['invoice_payment_advance_allocations'] as $a) {
                if ($a['invoice_payment_id'] === $payment['id']) $allocated += $this->cents($a['amount']);
            }
            if ($allocated === 0 && $this->cents($payment['amount']) > 0) {
                $invoice = $this->data['invoices'][$payment['invoice_id']] ?? null;
                $matches = [];
                foreach ($this->data['client_advances'] as $advance) {
                    if (!$invoice || $advance['client_id'] !== $invoice['client_id'] || $advance['account_id'] !== $payment['account_id']
                        || $advance['date'] > $payment['payment_date']) continue;
                    $used = 0;
                    foreach ($this->data['invoice_payment_advance_allocations'] as $a) if ($a['client_advance_id'] === $advance['id']) $used += $this->cents($a['amount']);
                    if ($this->cents($advance['used_amount']) - $used === $this->cents($payment['amount'])) $matches[] = $advance;
                }
                if (count($matches) === 1) {
                    $this->insert('invoice_payment_advance_allocations', [
                        'invoice_payment_id' => $payment['id'], 'client_advance_id' => $matches[0]['id'], 'amount' => $payment['amount'],
                        'created_at' => $payment['created_at'], 'updated_at' => now()->toDateTimeString(),
                    ], 'Restore exact, unique legacy client advance allocation; used balance is unchanged.');
                    $allocated = $this->cents($payment['amount']);
                }
            }
            if ($allocated !== $this->cents($payment['amount'])) {
                $this->issues[] = "Invoice payment {$payment['id']}: advance allocation cannot be uniquely reconstructed.";
            }
            if ($payment['account_id'] !== null && !$this->movements('InvoicePayment', $payment['id']) && $allocated === $this->cents($payment['amount'])) {
                $this->change('invoice_payments', $payment['id'], ['account_id' => null], 'An advance settlement is not a second account receipt; original account is retained on the allocated advance.');
            }
        }
    }

    private function accountBalances(bool $rebuild): array
    {
        $result = [];
        foreach ($this->data['accounts'] as $account) {
            $balance = $this->cents($account['opening_balance']);
            $openings = [];
            foreach ($this->data['transactions'] as $t) {
                if ($t['account_id'] !== $account['id']) continue;
                if ($t['description'] === 'Opening Balance' && $t['type'] === 'credit') $openings[] = $t;
                else $balance += ($t['type'] === 'credit' ? 1 : -1) * $this->cents($t['amount']);
            }
            if (count($openings) === 1 && $this->cents($openings[0]['amount']) !== $this->cents($account['opening_balance'])) {
                $this->issues[] = "Account {$account['id']}: opening balance {$account['opening_balance']} differs from opening transaction {$openings[0]['amount']}; verify original statement.";
            }
            if (count($openings) > 1) $this->issues[] = "Account {$account['id']}: multiple opening transactions; statement required.";
            $result[] = ['id' => $account['id'], 'name' => $account['name'], 'saved' => $account['current_balance'], 'from_records' => $this->money($balance)];
            // A computed balance is a book balance, not confirmation of money held at a bank.
            if ($rebuild) $this->change('accounts', $account['id'], ['current_balance' => $this->money($balance)], 'Rebuild book balance = configured opening + corrected credits - corrected debits; no balancing transaction invented.');
            if ($balance < 0) $this->issues[] = "Account {$account['id']}: recorded book balance is negative ({$this->money($balance)}); missing history or overdraft needs statement verification.";
        }
        return $result;
    }
}
