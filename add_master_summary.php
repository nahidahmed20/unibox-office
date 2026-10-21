<?php
$content = file_get_contents('h:/Aamar Project/unibox-office/app/Http/Controllers/ReportController.php');

$method = <<<EOT
    public function masterSummary(Request \$request)
    {
        \$startDate = \$request->input('start_date');
        \$endDate = \$request->input('end_date');

        // 1. Account Balances
        \$accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')->get();

        // 2. Receivables from Clients (Client Dues)
        \$clientDues = Client::query()->select('clients.id', 'clients.name')
            ->addSelect([
                'invoiced' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(grand_total),0)'),
                'legacy_advance' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(advance_used),0)'),
                'paid' => DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')->whereColumn('invoices.client_id', 'clients.id')->whereNull('invoices.deleted_at')->selectRaw('COALESCE(SUM(invoice_payments.amount),0)'),
            ])->get()->map(function (\$client) {
                \$due = max((float) \$client->invoiced - (float) \$client->paid - (float) \$client->legacy_advance, 0);
                return [
                    'id' => \$client->id,
                    'name' => \$client->name,
                    'due' => \$due,
                ];
            })->filter(fn (\$row) => \$row['due'] > 0)->values();

        // 3. Payables to Vendors (Vendor Dues)
        \$vendorDues = Vendor::withSum('projectExpenses as project_due', 'due_amount')
            ->orderBy('name')->get()->map(function (\$vendor) {
                \$due = max((float) \$vendor->opening_balance + (float) (\$vendor->project_due ?? 0), 0);
                return [
                    'id' => \$vendor->id,
                    'name' => \$vendor->name,
                    'due' => \$due,
                ];
            })->filter(fn (\$row) => \$row['due'] > 0)->values();

        // 4. Advances Received from Clients
        \$clientAdvances = ClientAdvance::with('client:id,name')
            ->select('client_id', DB::raw('SUM(amount) total_received'), DB::raw('SUM(used_amount) total_used'))
            ->groupBy('client_id')->get()->map(function (\$row) {
                \$balance = max((float) \$row->total_received - (float) \$row->total_used, 0);
                return [
                    'name' => \$row->client?->name ?? 'Unknown Client',
                    'balance' => \$balance,
                ];
            })->filter(fn (\$row) => \$row['balance'] > 0)->values();

        // 5. Advances Given to Vendors
        \$vendorAdvances = Vendor::where('wallet_balance', '>', 0)
            ->select('id', 'name', 'wallet_balance as balance')
            ->orderBy('name')->get();

        // 6. Advances Given to Staff
        \$staffAdvances = AdvanceBalance::with('user:id,name')->get()->map(function (\$row) {
            \$balance = max((float) \$row->total_given - (float) \$row->total_used - (float) \$row->total_returned, 0);
            return [
                'name' => \$row->user?->name ?? 'Unknown Staff',
                'balance' => \$balance,
            ];
        })->filter(fn (\$row) => \$row['balance'] > 0)->values();

        // Query filters for date range (P&L items)
        \$dateFilter = function (\$query, \$column) use (\$startDate, \$endDate) {
            if (\$startDate) \$query->whereDate(\$column, '>=', \$startDate);
            if (\$endDate) \$query->whereDate(\$column, '<=', \$endDate);
            return \$query;
        };

        // 7. Total Project Expenses
        \$projectExpenseQuery = DB::table('project_expenses');
        \$dateFilter(\$projectExpenseQuery, 'expense_date');
        \$projectExpensesTotal = \$projectExpenseQuery->sum('total_bill');

        // 8. Total Project Value (Invoices)
        \$invoiceQuery = DB::table('invoices')->whereNull('deleted_at');
        \$dateFilter(\$invoiceQuery, 'invoice_date');
        \$projectValueTotal = \$invoiceQuery->sum('grand_total');

        // 9. Total Office Expenses
        \$officeExpenseQuery = DB::table('expenses');
        \$dateFilter(\$officeExpenseQuery, 'date');
        \$officeExpensesTotal = \$officeExpenseQuery->sum('amount');

        // 10. Total Payroll
        \$salaryQuery = DB::table('salaries');
        if (\$startDate) \$salaryQuery->whereDate('payment_date', '>=', \$startDate)->orWhereDate('created_at', '>=', \$startDate);
        if (\$endDate) \$salaryQuery->whereDate('payment_date', '<=', \$endDate)->orWhereDate('created_at', '<=', \$endDate);
        // Better filter:
        \$salaryQuery = DB::table('salaries');
        if (\$startDate) \$salaryQuery->where(function (\$q) use (\$startDate) { \$q->whereDate('payment_date', '>=', \$startDate)->orWhere(function (\$q2) use (\$startDate) { \$q2->whereNull('payment_date')->whereDate('created_at', '>=', \$startDate); }); });
        if (\$endDate) \$salaryQuery->where(function (\$q) use (\$endDate) { \$q->whereDate('payment_date', '<=', \$endDate)->orWhere(function (\$q2) use (\$endDate) { \$q2->whereNull('payment_date')->whereDate('created_at', '<=', \$endDate); }); });

        \$payrollTotal = \$salaryQuery->sum('net_pay');

        return Inertia::render('Admin/Reports/MasterSummary', [
            'filters' => \$request->only('start_date', 'end_date'),
            'accounts' => \$accounts,
            'clientDues' => \$clientDues,
            'vendorDues' => \$vendorDues,
            'clientAdvances' => \$clientAdvances,
            'vendorAdvances' => \$vendorAdvances,
            'staffAdvances' => \$staffAdvances,
            'projectExpensesTotal' => \$projectExpensesTotal,
            'projectValueTotal' => \$projectValueTotal,
            'officeExpensesTotal' => \$officeExpensesTotal,
            'payrollTotal' => \$payrollTotal,
        ]);
    }

    public function financialSummary(Request \$request)
EOT;

$content = str_replace('    public function financialSummary(Request $request)', $method, $content);
file_put_contents('h:/Aamar Project/unibox-office/app/Http/Controllers/ReportController.php', $content);
echo "Added masterSummary method.\n";

