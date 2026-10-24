<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Client;
use App\Models\InvoicePayment;
use App\Models\ProjectExpense;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Expense;
use App\Models\Salary;
use App\Models\Transaction;
use App\Models\Investment;
use App\Models\InvestmentPayment;
use App\Models\ClientAdvance;
use App\Models\AdvanceBalance;
use App\Models\VendorPayment;
use App\Models\Asset;
use App\Models\Advance;
use Carbon\Carbon;
use App\Support\Pagination;

class ReportController extends Controller
{
    public function financialPosition()
    {
        $accounts = Account::where('is_active', true)
            ->orderBy('name')->get(['id', 'name', 'current_balance'])
            ->map(fn ($account) => [
                'id' => $account->id,
                'name' => $account->name,
                'balance' => (float) $account->current_balance,
            ]);

        $investmentGross = (float) Investment::sum('amount');
        $investmentReturned = (float) InvestmentPayment::sum('principal_amount');

        // 🟢 Active Investments Details
        $activeInvestments = Investment::with('investor:id,name')
            ->withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->map(fn ($inv) => [
                'name' => $inv->investor?->name ?? $inv->investor_name ?? 'Unknown Investor',
                'gross' => (float) $inv->amount,
                'returned' => (float) ($inv->returned_principal ?? 0),
                'balance' => max((float) $inv->amount - (float) ($inv->returned_principal ?? 0), 0),
            ])->filter(fn ($row) => $row['balance'] > 0)->values();

        $clientAdvances = ClientAdvance::with('client:id,name,company_name')
            ->select('client_id', DB::raw('SUM(amount) total_received'), DB::raw('SUM(used_amount) total_used'))
            ->groupBy('client_id')->get()->map(fn ($row) => [
                'name' => $row->client?->name ?? 'Unknown Client',
                'company' => $row->client?->company_name,
                'received' => (float) $row->total_received,
                'used' => (float) $row->total_used,
                'balance' => max((float) $row->total_received - (float) $row->total_used, 0),
            ])->values();

        $vendorPositions = Vendor::withSum('projectExpenses as project_due', 'due_amount')
            ->orderBy('name')->get()->map(fn ($vendor) => [
                'name' => $vendor->name,
                'company' => $vendor->company_name,
                'advance' => (float) $vendor->wallet_balance,
                'due' => max((float) $vendor->opening_balance + (float) ($vendor->project_due ?? 0), 0),
            ]);

        $clientDues = Client::query()->select('clients.id', 'clients.name', 'clients.company_name')
            ->addSelect([
                'invoiced' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(grand_total),0)'),
                'legacy_advance' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(advance_used),0)'),
                'paid' => DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')->whereColumn('invoices.client_id', 'clients.id')->whereNull('invoices.deleted_at')->selectRaw('COALESCE(SUM(invoice_payments.amount),0)'),
                'advance' => DB::table('client_advances')->whereColumn('client_id', 'clients.id')->selectRaw('COALESCE(SUM(amount - used_amount),0)'),
            ])->get()->map(function ($client) {
                $invoiced = (float) $client->invoiced;
                $paid = (float) $client->paid + (float) $client->legacy_advance;
                $invDue = max($invoiced - $paid, 0);
                $advance = (float) $client->advance;
                $netDue = max($invDue - $advance, 0);
                return [
                    'name' => $client->name,
                    'company' => $client->company_name,
                    'invoiced' => $invoiced,
                    'paid' => $paid,
                    'invoice_due' => $invDue,
                    'advance' => $advance,
                    'net_due' => $netDue,
                    'due' => $netDue,
                ];
            })->filter(fn ($row) => $row['due'] > 0)->values();

        $staffAdvances = AdvanceBalance::with('user:id,name')->get()->map(fn ($row) => [
            'name' => $row->user?->name ?? 'Unknown Staff',
            'given' => (float) $row->total_given,
            'used' => (float) $row->total_used,
            'returned' => (float) $row->total_returned,
            'balance' => max((float) $row->total_given - (float) $row->total_used - (float) $row->total_returned, 0),
        ])->filter(fn ($row) => $row['balance'] > 0)->values();

        // 🟢 Unpaid Salaries Details
        $unpaidSalariesDetails = Salary::with('user:id,name')
            ->whereIn('status', ['unpaid', 'partially_paid'])
            ->get()
            ->map(fn ($salary) => [
                'name' => $salary->user?->name ?? 'Unknown Staff',
                'month' => $salary->month_year,
                'due' => (float) $salary->due_amount,
            ])->values();

        $unpaidSalariesTotal = $unpaidSalariesDetails->sum('due');

        // 🟢 New: Assets List
        $assetsList = Asset::select('name', 'purchase_price')->orderBy('name')->get()->map(fn($a) => [
            'name' => $a->name,
            'value' => (float) $a->purchase_price
        ]);

        $summary = [
            'investment_gross' => $investmentGross,
            'investment_returned' => $investmentReturned,
            'investment_balance' => max($investmentGross - $investmentReturned, 0),
            'account_balance' => $accounts->sum('balance'),
            'client_advance' => $clientAdvances->sum('balance'),
            'vendor_advance' => $vendorPositions->sum('advance'),
            'client_due' => $clientDues->sum('due'),
            'vendor_due' => $vendorPositions->sum('due'),
            'unpaid_salaries' => (float) $unpaidSalariesTotal,
            'asset_value' => (float) $assetsList->sum('value'),
            'staff_advance' => $staffAdvances->sum('balance'),
        ];

        $alerts = collect();
        $negativeAccounts = $accounts->filter(fn ($row) => $row['balance'] < 0);
        if ($negativeAccounts->isNotEmpty()) {
            $alerts->push(['level' => 'danger', 'message' => $negativeAccounts->count() . ' account(s) have a negative balance.']);
        }
        $overReturnedInvestments = Investment::withSum('payments as returned_principal', 'principal_amount')->get()
            ->filter(fn ($row) => (float) ($row->returned_principal ?? 0) > (float) $row->amount);
        if ($overReturnedInvestments->isNotEmpty()) {
            $alerts->push(['level' => 'danger', 'message' => $overReturnedInvestments->count() . ' investment(s) have returned principal greater than the original amount.']);
        }
        $vendorConflicts = $vendorPositions->filter(fn ($row) => $row['advance'] > 0 && $row['due'] > 0);
        if ($vendorConflicts->isNotEmpty()) {
            $alerts->push(['level' => 'warning', 'message' => $vendorConflicts->count() . ' vendor(s) have both advance and payable balances; consider adjusting the wallet against due bills.']);
        }

        $clientConflicts = $clientDues->filter(fn ($row) => $row['advance'] > 0 && $row['invoice_due'] > 0);
        if ($clientConflicts->isNotEmpty()) {
            $alerts->push(['level' => 'warning', 'message' => $clientConflicts->count() . ' client(s) have both invoice due and unadjusted advance in hand (Net Due: ৳' . number_format($clientConflicts->sum('net_due'), 2) . '). Advance can be adjusted against their invoices.']);
        }

        return Inertia::render('Admin/Reports/FinancialPosition', compact(
            'summary', 'accounts', 'clientAdvances', 'vendorPositions', 'clientDues', 'staffAdvances', 'alerts',
            'unpaidSalariesDetails', 'activeInvestments', 'assetsList' // Added assetsList
        ));
    }

    public function masterSummary(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // 1. Account Balances
        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')->get();

        // 2. Receivables from Clients (Client Net Dues)
        $clientDues = Client::query()->select('clients.id', 'clients.name')
            ->addSelect([
                'invoiced' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(grand_total),0)'),
                'legacy_advance' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(advance_used),0)'),
                'paid' => DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')->whereColumn('invoices.client_id', 'clients.id')->whereNull('invoices.deleted_at')->selectRaw('COALESCE(SUM(invoice_payments.amount),0)'),
                'advance' => DB::table('client_advances')->whereColumn('client_id', 'clients.id')->selectRaw('COALESCE(SUM(amount - used_amount),0)'),
            ])->get()->map(function ($client) {
                $invDue = max((float) $client->invoiced - (float) $client->paid - (float) $client->legacy_advance, 0);
                $advance = (float) $client->advance;
                $netDue = max($invDue - $advance, 0);
                return [
                    'id' => $client->id,
                    'name' => $client->name,
                    'invoice_due' => $invDue,
                    'advance' => $advance,
                    'due' => $netDue,
                ];
            })->filter(fn ($row) => $row['due'] > 0)->values();

        // 3. Payables to Vendors (Vendor Dues)
        $vendorDues = Vendor::withSum('projectExpenses as project_due', 'due_amount')
            ->orderBy('name')->get()->map(function ($vendor) {
                $due = max((float) $vendor->opening_balance + (float) ($vendor->project_due ?? 0), 0);
                return [
                    'id' => $vendor->id,
                    'name' => $vendor->name,
                    'due' => $due,
                ];
            })->filter(fn ($row) => $row['due'] > 0)->values();

        // 4. Advances Received from Clients
        $clientAdvances = ClientAdvance::with('client:id,name')
            ->select('client_id', DB::raw('SUM(amount) total_received'), DB::raw('SUM(used_amount) total_used'))
            ->groupBy('client_id')->get()->map(function ($row) {
                $balance = max((float) $row->total_received - (float) $row->total_used, 0);
                return [
                    'name' => $row->client?->name ?? 'Unknown Client',
                    'balance' => $balance,
                ];
            })->filter(fn ($row) => $row['balance'] > 0)->values();

        // 5. Advances Given to Vendors
        $vendorAdvances = Vendor::where('wallet_balance', '>', 0)
            ->select('id', 'name', 'wallet_balance as balance')
            ->orderBy('name')->get();

        // 6. Advances Given to Staff
        $staffAdvances = AdvanceBalance::with('user:id,name')->get()->map(function ($row) {
            $balance = max((float) $row->total_given - (float) $row->total_used - (float) $row->total_returned, 0);
            return [
                'name' => $row->user?->name ?? 'Unknown Staff',
                'balance' => $balance,
            ];
        })->filter(fn ($row) => $row['balance'] > 0)->values();

        // Query filters for date range (P&L items)
        $dateFilter = function ($query, $column) use ($startDate, $endDate) {
            if ($startDate) $query->whereDate($column, '>=', $startDate);
            if ($endDate) $query->whereDate($column, '<=', $endDate);
            return $query;
        };

        // 7. Total Project Expenses
        $projectExpenseQuery = DB::table('project_expenses');
        $dateFilter($projectExpenseQuery, 'date');
        $projectExpensesTotal = $projectExpenseQuery->sum('total_bill');

        // 8. Total Project Value (Invoices)
        $invoiceQuery = DB::table('invoices')->whereNull('deleted_at');
        $dateFilter($invoiceQuery, 'invoice_date');
        $projectValueTotal = $invoiceQuery->sum('grand_total');

        // 9. Total Office Expenses
        $officeExpenseQuery = DB::table('expenses')->where(function ($q) {
            $q->where('type', 'office')->orWhereNull('type');
        });
        $dateFilter($officeExpenseQuery, 'date');
        $officeExpensesTotal = $officeExpenseQuery->sum('amount');

        // 9b. Total Sample Expenses
        $sampleExpenseQuery = DB::table('expenses')->where('type', 'sample');
        $dateFilter($sampleExpenseQuery, 'date');
        $sampleExpensesTotal = $sampleExpenseQuery->sum('amount');

        // 10. Total Payroll
        $salaryQuery = DB::table('salaries');
        if ($startDate) $salaryQuery->where(function ($q) use ($startDate) { $q->whereDate('payment_date', '>=', $startDate)->orWhere(function ($q2) use ($startDate) { $q2->whereNull('payment_date')->whereDate('created_at', '>=', $startDate); }); });
        if ($endDate) $salaryQuery->where(function ($q) use ($endDate) { $q->whereDate('payment_date', '<=', $endDate)->orWhere(function ($q2) use ($endDate) { $q2->whereNull('payment_date')->whereDate('created_at', '<=', $endDate); }); });

        $payrollTotal = $salaryQuery->sum('net_pay');

        return Inertia::render('Admin/Reports/MasterSummary', [
            'filters' => $request->only('start_date', 'end_date'),
            'accounts' => $accounts,
            'clientDues' => $clientDues,
            'vendorDues' => $vendorDues,
            'clientAdvances' => $clientAdvances,
            'vendorAdvances' => $vendorAdvances,
            'staffAdvances' => $staffAdvances,
            'projectExpensesTotal' => $projectExpensesTotal,
            'projectValueTotal' => $projectValueTotal,
            'officeExpensesTotal' => $officeExpensesTotal,
            'sampleExpensesTotal' => $sampleExpensesTotal,
            'payrollTotal' => $payrollTotal,
        ]);
    }

    public function financialSummary(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date'   => ['nullable', 'date', 'after_or_equal:start_date'],
            'year'       => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'month'      => ['nullable', 'date_format:Y-m'],
        ]);

        $applyPeriod = function ($query, string $column) use ($request) {
            if ($request->filled('month')) {
                [$year, $month] = explode('-', $request->month);
                return $query->whereYear($column, $year)->whereMonth($column, $month);
            }
            if ($request->filled('start_date')) $query->whereDate($column, '>=', $request->start_date);
            if ($request->filled('end_date')) $query->whereDate($column, '<=', $request->end_date);
            if ($request->filled('year') && !$request->filled('start_date') && !$request->filled('end_date')) $query->whereYear($column, $request->year);
            return $query;
        };

        $validInvoiceIds = DB::table('invoices')->whereNull('deleted_at')->pluck('id')->toArray();

        // 🟢 FIX: Reverted leftJoin because project_expenses table doesn't have deleted_at column
        $query = DB::table('projects')
            ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
            ->leftJoin('project_expenses', 'projects.id', '=', 'project_expenses.project_id')
            ->whereNull('projects.deleted_at')
            ->whereNull('clients.deleted_at');

        $applyPeriod($query, 'projects.start_date');

        $projectsData = $query->select(
                'projects.id', 'projects.client_id', 'projects.title', 'projects.budget', 'projects.start_date', 'projects.status', 'clients.name as client_name',
                DB::raw('COALESCE(SUM(project_expenses.total_bill), 0) as total_expense')
            )->groupBy('projects.id', 'projects.client_id', 'projects.title', 'projects.budget', 'projects.start_date', 'projects.status', 'clients.name')
            ->orderBy('projects.start_date', 'desc')->get();

        $clientsMap = [];
        $monthlyData = [];
        foreach ($projectsData as $p) {
            $cName = $p->client_name ?? 'Unknown Client';
            if (!isset($clientsMap[$cName])) {
                $clientsMap[$cName] = [
                    'client_id' => $p->client_id, 'client_name' => $cName, 'total_projects' => 0, 'total_budget' => 0, 'total_expense' => 0, 'total_invoices' => 0, 'total_billed' => 0, 'total_paid' => 0, 'total_due' => 0,
                ];
            }
            $clientsMap[$cName]['total_projects'] += 1;
            $clientsMap[$cName]['total_budget'] += (float)$p->budget;
            $clientsMap[$cName]['total_expense'] += (float)$p->total_expense;

            $month = $p->start_date ? date('F Y', strtotime($p->start_date)) : 'No Date Provided';
            $sortKey = $p->start_date ? date('Y-m', strtotime($p->start_date)) : '0000-00';

            if (!isset($monthlyData[$month])) {
                $monthlyData[$month] = ['month' => $month, 'sort_key' => $sortKey, 'projects' => [], 'month_budget' => 0, 'month_expense' => 0, 'month_profit' => 0];
            }
            $monthlyData[$month]['projects'][] = ['title' => $p->title, 'client' => $p->client_name, 'budget' => (float)$p->budget, 'expense' => (float)$p->total_expense, 'profit' => (float)$p->budget - (float)$p->total_expense, 'status' => $p->status];
            $monthlyData[$month]['month_budget'] += (float)$p->budget;
            $monthlyData[$month]['month_expense'] += (float)$p->total_expense;
            $monthlyData[$month]['month_profit'] += ((float)$p->budget - (float)$p->total_expense);
        }

        $clientIds = array_filter(array_column($clientsMap, 'client_id'));
        if (!empty($clientIds)) {
            $invoiceBaseQuery = DB::table('invoices')->whereIn('client_id', $clientIds)->whereNull('deleted_at');
            $applyPeriod($invoiceBaseQuery, 'invoice_date');

            $filteredInvoiceIds = (clone $invoiceBaseQuery)->pluck('id')->toArray();

            if (!empty($filteredInvoiceIds)) {
                $invoiceStats = DB::table('invoices')->whereIn('id', $filteredInvoiceIds)
                    ->select('client_id', DB::raw('COUNT(id) as total_invoices'), DB::raw('SUM(grand_total) as total_billed'))
                    ->groupBy('client_id')->get()->keyBy('client_id');

                $paymentStats = DB::table('invoice_payments')
                    ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                    ->whereIn('invoice_payments.invoice_id', $filteredInvoiceIds)
                    ->select('invoices.client_id', DB::raw('SUM(invoice_payments.amount) as total_paid'))
                    ->groupBy('invoices.client_id')->get()->keyBy('client_id');

                $legacyAdvanceStats = DB::table('invoices')->whereIn('id', $filteredInvoiceIds)
                    ->select('client_id', DB::raw('SUM(advance_used) as total_legacy_advance'))
                    ->groupBy('client_id')->get()->keyBy('client_id');

                foreach ($clientsMap as $cName => &$data) {
                    $cId = $data['client_id'];
                    if ($cId) {
                        $inv = $invoiceStats->get($cId) ?? null;
                        $pay = $paymentStats->get($cId) ?? null;
                        $legacy = $legacyAdvanceStats->get($cId) ?? null;
                        $data['total_invoices'] = $inv ? (int)$inv->total_invoices : 0;
                        $data['total_billed']   = $inv ? (float)$inv->total_billed : 0;
                        $data['total_paid']     = ($pay ? (float)$pay->total_paid : 0)
                            + ($legacy ? (float) $legacy->total_legacy_advance : 0);
                        $data['total_due']      = $data['total_billed'] - $data['total_paid'];
                    }
                }
                unset($data);
            }
        }

        usort($monthlyData, function($a, $b) { return strcmp($b['sort_key'], $a['sort_key']); });

        $revenueQuery = DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds);
        $receivedQuery = DB::table('invoice_payments')
            ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoices.id', $validInvoiceIds);

        $clientAdvQuery = DB::table('client_advances');
        $expenseQuery = DB::table('transactions')->where('transactionable_type', \App\Models\Expense::class)->where('type', 'debit');
        $salaryQuery = DB::table('transactions')->where('transactionable_type', \App\Models\Salary::class)->where('type', 'debit');
        $cashFlowQuery = DB::table('transactions');
        $projectCostQuery = DB::table('transactions')->whereIn('transactionable_type', [\App\Models\ProjectExpense::class, \App\Models\VendorPayment::class]);

        $applyPeriod($revenueQuery, 'invoice_date');
        $applyPeriod($receivedQuery, 'invoice_payments.payment_date');
        $applyPeriod($clientAdvQuery, 'date');
        $applyPeriod($expenseQuery, 'transaction_date');
        $applyPeriod($salaryQuery, 'transaction_date');
        $applyPeriod($cashFlowQuery, 'transaction_date');
        $applyPeriod($projectCostQuery, 'transaction_date');

        $receivedQuery->whereNotNull('invoice_payments.account_id')->where('invoice_payments.method', '!=', 'Client Advance');
        $totalInvoiceReceived = (float) $receivedQuery->sum('invoice_payments.amount');

        $totalClientAdvanceReceived = (float) $clientAdvQuery->sum('amount');
        $cashInQuery = (clone $cashFlowQuery)->where('type', 'credit')
            ->where(function ($query) {
                $query->whereNull('description')->orWhere('description', 'not like', '% (In)');
            })
            ->where(function ($query) {
                $query->whereNull('description')->orWhere('description', '!=', 'Opening Balance');
            });
        $cashOutQuery = (clone $cashFlowQuery)->where('type', 'debit')
            ->where(function ($query) {
                $query->whereNull('description')->orWhere('description', '!=', 'Opening Balance');
            })
            ->selectRaw("COALESCE(SUM(CASE WHEN description LIKE '% (Out)' THEN COALESCE(bank_charge, 0) ELSE amount END), 0) as total");
        $totalCashIn = (float) $cashInQuery->sum('amount');
        $totalCashOut = (float) $cashOutQuery->value('total');

        // 🟢 FIX: Handled NULL bank_charge properly in mathematical additions
        $totalProjectExpensePaid = (float) (clone $projectCostQuery)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount - COALESCE(bank_charge, 0) ELSE -amount + COALESCE(bank_charge, 0) END), 0) as total")->value('total');
        $totalOfficeExpense = (float) (clone $expenseQuery)->selectRaw('COALESCE(SUM(amount - COALESCE(bank_charge, 0)), 0) as total')->value('total');
        $totalSalaryPaid = (float) (clone $salaryQuery)->selectRaw('COALESCE(SUM(amount - COALESCE(bank_charge, 0)), 0) as total')->value('total');
        $totalBankCharges = (float) (clone $cashFlowQuery)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN COALESCE(bank_charge, 0) ELSE -COALESCE(bank_charge, 0) END), 0) as total")->value('total');
        $netCashFlow = $totalCashIn - $totalCashOut;

        $accrualRevenueQuery = DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds);
        $applyPeriod($accrualRevenueQuery, 'invoice_date');
        $accrualRevenue = (float) $accrualRevenueQuery->sum('grand_total');

        // 🟢 FIX: Removed whereNull('deleted_at') from tables that don't support soft deletes
        $accrualProjectExpQuery = DB::table('project_expenses');
        $applyPeriod($accrualProjectExpQuery, 'date');
        $accrualProjectCost = (float) $accrualProjectExpQuery->sum('total_bill');

        $accrualOfficeExpQuery = DB::table('expenses')->where(function ($q) {
            $q->where('type', 'office')->orWhereNull('type');
        });
        $applyPeriod($accrualOfficeExpQuery, 'date');
        $accrualOfficeCost = (float) $accrualOfficeExpQuery->sum('amount');

        $accrualSampleExpQuery = DB::table('expenses')->where('type', 'sample');
        $applyPeriod($accrualSampleExpQuery, 'date');
        $accrualSampleCost = (float) $accrualSampleExpQuery->sum('amount');

        $accrualSalaryQuery = DB::table('salaries');
        $applyPeriod($accrualSalaryQuery, 'payment_date');
        $accrualSalaryCost = (float) $accrualSalaryQuery->sum('net_pay');

        $netActualProfit = $accrualRevenue - ($accrualProjectCost + $accrualOfficeCost + $accrualSampleCost + $accrualSalaryCost);

        $accountBalance = (float) DB::table('accounts')->where('is_active', true)->sum('current_balance');
        $staffAdvance = max((float) DB::table('advance_balances')->selectRaw('COALESCE(SUM(total_given - total_used - total_returned), 0) balance')->value('balance'), 0);
        $vendorAdvance = (float) DB::table('vendors')->sum('wallet_balance');
        $totalLiquidFunds = $accountBalance + $staffAdvance + $vendorAdvance;

        $summary = [
            'total_liquid_funds' => $totalLiquidFunds,
            'account_balance' => $accountBalance,
            'staff_advance' => $staffAdvance,
            'vendor_advance' => $vendorAdvance,

            'total_cash_in' => $totalCashIn,
            'total_invoice_received' => $totalInvoiceReceived,
            'total_client_advance' => $totalClientAdvanceReceived,

            'total_cash_out' => $totalCashOut,
            'total_project_paid' => $totalProjectExpensePaid,
            'total_office_expense' => $totalOfficeExpense,
            'total_salary_paid' => $totalSalaryPaid,
            'total_bank_charges' => $totalBankCharges,

            'net_cash_flow' => $netCashFlow,
            'accrual_revenue' => $accrualRevenue,
            'accrual_project_cost' => $accrualProjectCost,
            'accrual_office_cost' => $accrualOfficeCost,
            'accrual_sample_cost' => $accrualSampleCost,
            'accrual_salary_cost' => $accrualSalaryCost,
            'net_actual_profit' => $netActualProfit,

            'client_due' => max(
                (float) DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds)->sum('grand_total')
                - (float) DB::table('invoice_payments')->whereIn('invoice_id', $validInvoiceIds)->sum('amount')
                - (float) DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds)->sum('advance_used'),
            0),
            'vendor_due' => (float) DB::table('project_expenses')->sum('due_amount') + (float) DB::table('vendors')->sum('opening_balance'),
        ];

        return Inertia::render('Admin/Reports/FinancialReports', [
            'clientsReport' => array_values($clientsMap),
            'monthlyReport' => $monthlyData,
            'summary' => $summary,
            'filters' => $request->only(['start_date', 'end_date', 'year', 'month'])
        ]);
    }


    public function transactionsReport(Request $request)
    {
        $transactionModel = Transaction::class;
        $query = $transactionModel::with('account:id,name');
        $sources = [
            'vendor_payment' => [VendorPayment::class, 'debit'],
            'vendor_payment_void' => [VendorPayment::class, 'credit'],
            'vendor_advance' => [Vendor::class, 'debit'],
            'vendor_refund' => [Vendor::class, 'credit'],
            'salary_payment' => [Salary::class, null],
            'invoice_payment' => [InvoicePayment::class, null],
            'expense' => [Expense::class, null],
            'sample_expense' => [Expense::class, null],
            'project_expense' => [ProjectExpense::class, null],
            'asset_purchase' => [Asset::class, null],
            'investment_received' => [Investment::class, null],
            'investment_return' => [InvestmentPayment::class, null],
            'staff_advance' => [Advance::class, null],
            'client_advance' => [ClientAdvance::class, null],
            'manual_adjustment' => [null, null],
        ];
        if (isset($sources[$request->source_type])) {
            [$model, $direction] = $sources[$request->source_type];
            $query->where('transactionable_type', $model);
            if ($request->source_type === 'sample_expense') {
                $query->whereHasMorph('transactionable', [Expense::class], fn ($q) => $q->where('type', 'sample'));
            } elseif ($request->source_type === 'expense') {
                $query->whereHasMorph('transactionable', [Expense::class], fn ($q) => $q->where(fn($sq) => $sq->where('type', 'office')->orWhereNull('type')));
            }
            if ($direction) $query->where('type', $direction);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhereHasMorph('transactionable', [VendorPayment::class], fn ($payment) => $payment->whereHas('vendor', fn ($vendor) => $vendor->where('name', 'like', "%{$search}%")));
            });
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->filled('from')) {
            $query->whereDate('transaction_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('transaction_date', '<=', $request->to);
        }

        $perPage = Pagination::perPage($request, $query);
        if ($perPage === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        }

        $transactions = $query->with('transactionable')->latest('transaction_date')->latest('id')->paginate($perPage)->withQueryString();
        $transactions->getCollection()->each(function ($transaction) use ($sources) {
            foreach ($sources as $label => [$model, $direction]) {
                if ($transaction->transactionable_type === $model && (!$direction || $transaction->type === $direction)) {
                    if ($model === Expense::class) {
                        $label = ($transaction->transactionable?->type ?? 'office') === 'sample' ? 'sample_expense' : 'expense';
                    }
                    $transaction->setAttribute('source_type', $label);
                    break;
                }
            }
        });

        return Inertia::render('Admin/Reports/TransactionsReport', [
            'transactions' => $transactions,
            'accounts'     => Account::select('id', 'name')->get(),
            'filters'      => $request->only('account_id', 'from', 'to', 'search', 'per_page', 'source_type'),
        ]);
    }

    public function clientLedger(Request $request)
    {
        $clients = Client::select('id', 'name', 'phone', 'company_name')->orderBy('name')->get();

        $ledger = [];
        $dateWisePayments = [];
        $summary = [
            'total_billed' => 0,
            'total_paid' => 0,
            'total_advance' => 0,
            'gross_advance' => 0,
            'advance_used' => 0,
            'net_due' => 0
        ];
        $clientInfo = null;

        if ($request->filled('client_id')) {
            $clientInfo = Client::with([
                'invoices' => function($query) {
                    $query->whereNull('deleted_at');
                },
                'invoices.items.project',
                'invoices.payments.account',
                'clientAdvances.account'
            ])->find($request->client_id);

            if ($clientInfo) {
                $events = collect();
                $paymentByDate = [];
                $grossAdvance = 0;
                $usedAdvance = 0;

                foreach ($clientInfo->invoices as $invoice) {
                    $itemNames = collect($invoice->items)->map(function($item) {
                        return $item->project ? $item->project->title : $item->item_name;
                    })->filter()->implode(', ');

                    $desc = "Invoice Generated";
                    if (!empty($itemNames)) {
                        $desc .= " (" . mb_strimwidth($itemNames, 0, 60, '...') . ")";
                    }

                    $events->push([
                        'date' => $invoice->invoice_date ?? $invoice->created_at->format('Y-m-d'),
                        'created_at' => $invoice->created_at,
                        'type' => 'Invoice',
                        'ref' => $invoice->invoice_number ?? 'INV-' . $invoice->id,
                        'description' => $desc,
                        'debit' => (float) $invoice->grand_total,
                        'credit' => 0,
                        'adjusted' => 0,
                    ]);
                    $summary['total_billed'] += (float) $invoice->grand_total;

                    $legacyAdvance = (float) ($invoice->getRawOriginal('advance_used') ?? 0);
                    if ($legacyAdvance > 0) {
                        $advanceDate = $invoice->invoice_date ?? $invoice->created_at->format('Y-m-d');
                        $invRef = $invoice->invoice_number ?? 'INV-' . $invoice->id;
                        $summary['total_paid'] += $legacyAdvance;
                        $events->push([
                            'date' => $advanceDate,
                            'created_at' => $invoice->created_at,
                            'type' => 'Payment',
                            'ref' => $invRef,
                            'method' => 'Invoice Advance',
                            'description' => "Legacy invoice advance applied to {$invRef}",
                            'debit' => 0,
                            'credit' => $legacyAdvance,
                            'adjusted' => 0,
                        ]);

                        if (!isset($paymentByDate[$advanceDate])) {
                            $paymentByDate[$advanceDate] = [
                                'date' => $advanceDate,
                                'total_amount' => 0,
                                'cash_bank_amount' => 0,
                                'advance_adjusted_amount' => 0,
                                'items' => [],
                                'methods' => [],
                                'notes' => [],
                            ];
                        }
                        $paymentByDate[$advanceDate]['total_amount'] += $legacyAdvance;
                        $paymentByDate[$advanceDate]['cash_bank_amount'] += $legacyAdvance;
                        $paymentByDate[$advanceDate]['items'][] = [
                            'type' => 'Invoice Advance',
                            'ref' => $invRef,
                            'amount' => $legacyAdvance,
                            'method' => 'Invoice Advance',
                            'note' => null,
                        ];
                        if (!in_array('Invoice Advance', $paymentByDate[$advanceDate]['methods'])) {
                            $paymentByDate[$advanceDate]['methods'][] = 'Invoice Advance';
                        }
                    }

                    foreach ($invoice->payments as $payment) {
                        $payDate = $payment->payment_date ?? $payment->created_at->format('Y-m-d');
                        $invRef = $invoice->invoice_number ?? 'INV-' . $invoice->id;
                        $isAdvanceAdjust = $payment->method === 'Client Advance';
                        $methodLabel = $isAdvanceAdjust
                            ? 'Client Advance'
                            : ($payment->account?->name ?? $payment->method ?? 'Cash/Bank');

                        $amt = (float) $payment->amount;
                        $summary['total_paid'] += $amt;

                        if ($isAdvanceAdjust) {
                            // Internal adjustment from Client Advance wallet (already credited when advance was received)
                            $events->push([
                                'date' => $payDate,
                                'created_at' => $payment->created_at,
                                'type' => 'Advance Adjust',
                                'ref' => $invRef,
                                'method' => $methodLabel,
                                'description' => "Advance Adjusted against {$invRef}" . ($payment->note ? " ({$payment->note})" : ""),
                                'debit' => 0,
                                'credit' => 0,
                                'adjusted' => $amt,
                            ]);
                        } else {
                            $events->push([
                                'date' => $payDate,
                                'created_at' => $payment->created_at,
                                'type' => 'Payment',
                                'ref' => $invRef,
                                'method' => $methodLabel,
                                'description' => $payment->note ? "Payment Received: " . $payment->note : "Payment Received ({$methodLabel})",
                                'debit' => 0,
                                'credit' => $amt,
                                'adjusted' => 0,
                            ]);

                            if (!isset($paymentByDate[$payDate])) {
                                $paymentByDate[$payDate] = [
                                    'date' => $payDate,
                                    'total_amount' => 0,
                                    'cash_bank_amount' => 0,
                                    'advance_adjusted_amount' => 0,
                                    'items' => [],
                                    'methods' => [],
                                    'notes' => [],
                                ];
                            }
                            $paymentByDate[$payDate]['total_amount'] += $amt;
                            $paymentByDate[$payDate]['cash_bank_amount'] += $amt;
                            $paymentByDate[$payDate]['items'][] = [
                                'type' => 'Invoice',
                                'ref' => $invRef,
                                'amount' => $amt,
                                'method' => $methodLabel,
                                'note' => $payment->note,
                            ];
                            if (!in_array($methodLabel, $paymentByDate[$payDate]['methods'])) {
                                $paymentByDate[$payDate]['methods'][] = $methodLabel;
                            }
                            if ($payment->note && !in_array($payment->note, $paymentByDate[$payDate]['notes'])) {
                                $paymentByDate[$payDate]['notes'][] = $payment->note;
                            }
                        }
                    }
                }

                foreach ($clientInfo->clientAdvances as $advance) {
                    $advDate = $advance->date ?? $advance->created_at->format('Y-m-d');
                    $advRef = 'ADV-' . $advance->id;
                    $advMethod = $advance->account?->name ?? 'Advance Wallet';
                    $advAmt = (float) $advance->amount;
                    $advUsed = (float) ($advance->used_amount ?? 0);

                    $grossAdvance += $advAmt;
                    $usedAdvance += $advUsed;

                    $events->push([
                        'date' => $advDate,
                        'created_at' => $advance->created_at,
                        'type' => 'Advance',
                        'ref' => $advRef,
                        'method' => $advMethod,
                        'description' => $advance->note ? "Advance Received: " . $advance->note : "Advance payment received",
                        'debit' => 0,
                        'credit' => $advAmt,
                        'adjusted' => 0,
                    ]);

                    if (!isset($paymentByDate[$advDate])) {
                        $paymentByDate[$advDate] = [
                            'date' => $advDate,
                            'total_amount' => 0,
                            'cash_bank_amount' => 0,
                            'advance_adjusted_amount' => 0,
                            'items' => [],
                            'methods' => [],
                            'notes' => [],
                        ];
                    }
                    $paymentByDate[$advDate]['total_amount'] += $advAmt;
                    $paymentByDate[$advDate]['cash_bank_amount'] += $advAmt;
                    $paymentByDate[$advDate]['items'][] = [
                        'type' => 'Advance',
                        'ref' => $advRef,
                        'amount' => $advAmt,
                        'method' => $advMethod,
                        'note' => $advance->note,
                    ];
                    if (!in_array($advMethod, $paymentByDate[$advDate]['methods'])) {
                        $paymentByDate[$advDate]['methods'][] = $advMethod;
                    }
                    if ($advance->note && !in_array($advance->note, $paymentByDate[$advDate]['notes'])) {
                        $paymentByDate[$advDate]['notes'][] = $advance->note;
                    }
                }

                $summary['gross_advance'] = $grossAdvance;
                $summary['advance_used'] = $usedAdvance;
                $summary['total_advance'] = max(0, $grossAdvance - $usedAdvance);

                $sorted = $events->sort(function ($a, $b) {
                    $dateA = strtotime($a['date']);
                    $dateB = strtotime($b['date']);
                    if ($dateA === $dateB) {
                        return strtotime($a['created_at']) <=> strtotime($b['created_at']);
                    }
                    return $dateA <=> $dateB;
                })->values()->all();

                $balance = 0;
                foreach ($sorted as $item) {
                    $balance += $item['debit'];
                    $balance -= $item['credit'];
                    $item['balance'] = $balance;
                    $item['date_group'] = ($item['credit'] > 0 && isset($paymentByDate[$item['date']]))
                        ? $paymentByDate[$item['date']]
                        : null;
                    $ledger[] = $item;
                }

                $summary['net_due'] = $balance;

                // Sort date-wise payments chronologically (newest to oldest)
                krsort($paymentByDate);
                $dateWisePayments = array_values($paymentByDate);
            }
        }

        return Inertia::render('Admin/Reports/ClientLedger', [
            'clients' => $clients,
            'ledger' => $ledger,
            'dateWisePayments' => $dateWisePayments,
            'summary' => $summary,
            'clientInfo' => $clientInfo,
            'filters' => $request->only(['client_id'])
        ]);
    }

    public function clientDuesReport(Request $request)
    {
        $query = Client::query()
            ->select('clients.id', 'clients.name', 'clients.company_name', 'clients.phone', 'clients.email')
            ->addSelect([
                'total_invoiced' => DB::table('invoices')
                    ->whereColumn('client_id', 'clients.id')
                    ->whereNull('deleted_at')
                    ->selectRaw('COALESCE(SUM(grand_total), 0)'),

                'total_paid' => DB::table('invoice_payments')
                    ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                    ->whereColumn('invoices.client_id', 'clients.id')
                    ->whereNull('invoices.deleted_at')
                    ->selectRaw('COALESCE(SUM(invoice_payments.amount), 0)'),

                'legacy_advance' => DB::table('invoices')
                    ->whereColumn('client_id', 'clients.id')
                    ->whereNull('deleted_at')
                    ->selectRaw('COALESCE(SUM(advance_used), 0)'),

                'total_advance' => DB::table('client_advances')
                    ->whereColumn('client_id', 'clients.id')
                    ->selectRaw('COALESCE(SUM(amount), 0)'),

                'total_used' => DB::table('client_advances')
                    ->whereColumn('client_id', 'clients.id')
                    ->selectRaw('COALESCE(SUM(used_amount), 0)')
            ]);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('company_name', 'like', "%{$searchTerm}%")
                ->orWhere('phone', 'like', "%{$searchTerm}%")
                ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }

        // Grand Totals Calculation
        $allClients = (clone $query)->get();

        $grandTotalInvoiceDue = $allClients->sum(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid + (float) $client->legacy_advance;
            return max($invoiced - $paid, 0);
        });

        $grandTotalAdvance = $allClients->sum(function ($client) {
            $advance = (float) $client->total_advance;
            $used = (float) $client->total_used;
            return max($advance - $used, 0);
        });

        $grandTotalNetDue = $allClients->sum(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid + (float) $client->legacy_advance;
            $advance = (float) $client->total_advance;
            $used = (float) $client->total_used;
            $invDue = max($invoiced - $paid, 0);
            $availAdv = max($advance - $used, 0);
            return max($invDue - $availAdv, 0);
        });

        $perPage = Pagination::perPage($request, $query);

        $clientDues = $query->latest('clients.created_at')->paginate($perPage)->through(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid + (float) $client->legacy_advance;
            $advance = (float) $client->total_advance;
            $used = (float) $client->total_used;

            $invoiceDue = max($invoiced - $paid, 0);
            $availableAdvance = max($advance - $used, 0);
            $netDue = max($invoiceDue - $availableAdvance, 0);
            $advanceSurplus = max($availableAdvance - $invoiceDue, 0);

            return [
                'id' => $client->id,
                'name' => $client->name,
                'company_name' => $client->company_name,
                'phone' => $client->phone,
                'email' => $client->email,
                'total_invoiced' => $invoiced,
                'total_paid' => $paid,
                'total_advance' => $advance,
                'total_used' => $used,
                'invoice_due' => $invoiceDue,
                'total_due' => $invoiceDue, // keeps backward compatibility
                'available_advance' => $availableAdvance,
                'net_due' => $netDue,
                'advance_surplus' => $advanceSurplus,
            ];
        })->withQueryString();

        return Inertia::render('Admin/Reports/ClientDues', [
            'clientDues' => $clientDues,
            'filters' => $request->only('search', 'per_page'),
            'grandTotalDue' => $grandTotalNetDue, // The true net market receivable
            'grandTotalInvoiceDue' => $grandTotalInvoiceDue,
            'grandTotalAdvance' => $grandTotalAdvance,
            'grandTotalNetDue' => $grandTotalNetDue,
        ]);
    }

    public function vendorPaymentsReport(Request $request)
    {
        $rawPerPage = $request->input('per_page', 20);
        $search = $request->input('search');

        $vouchers = DB::table('vendor_payments')
            ->join('vendors', 'vendors.id', '=', 'vendor_payments.vendor_id')
            ->select(
                'vendor_payments.id',
                'vendors.name as vendor_name',
                'vendor_payments.date',
                'vendor_payments.pay_amount as amount',
                'vendor_payments.adjustment_amount as discount',
                DB::raw("'Voucher' as type")
            )
            ->where('vendor_payments.status', 'completed');

        if ($search) {
            $vouchers->where('vendors.name', 'like', "%{$search}%");
        }

        $direct = DB::table('project_expenses')
            ->join('vendors', 'vendors.id', '=', 'project_expenses.vendor_id')
            ->leftJoin('vendor_payment_details', 'vendor_payment_details.project_expense_id', '=', 'project_expenses.id')
            ->leftJoin('vendor_payments', function($join) {
                $join->on('vendor_payments.id', '=', 'vendor_payment_details.vendor_payment_id')
                     ->where('vendor_payments.status', '=', 'completed');
            })
            ->select(
                'project_expenses.id',
                'vendors.name as vendor_name',
                'project_expenses.date',
                DB::raw('(project_expenses.paid_amount - COALESCE(SUM(CASE WHEN vendor_payments.status = \'completed\' THEN vendor_payment_details.amount ELSE 0 END), 0)) as amount'),
                DB::raw('0 as discount'),
                DB::raw("'Direct Bill' as type")
            )
            ->whereNotNull('project_expenses.vendor_id')
            ->where('project_expenses.paid_amount', '>', 0)
            ->groupBy('project_expenses.id', 'vendors.name', 'project_expenses.date', 'project_expenses.paid_amount')
            ->havingRaw('(project_expenses.paid_amount - COALESCE(SUM(CASE WHEN vendor_payments.status = \'completed\' THEN vendor_payment_details.amount ELSE 0 END), 0)) > 0');

        if ($search) {
            $direct->where('vendors.name', 'like', "%{$search}%");
        }

        $query = $vouchers->union($direct)->orderBy('date', 'desc');

        // Execute query and paginate manually since union pagination can sometimes be tricky
        $page = \Illuminate\Pagination\Paginator::resolveCurrentPage() ?: 1;
        $items = $query->get();
        $perPage = $rawPerPage === 'all' ? max($items->count(), 1) : max((int) $rawPerPage, 1);

        $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            ['path' => \Illuminate\Pagination\Paginator::resolveCurrentPath()]
        );

        return Inertia::render('Admin/Reports/VendorPayments', [
            'payments' => $paginator,
            'filters'  => $request->only(['search', 'per_page'])
        ]);
    }

    public function vendorDuesReport(Request $request)
    {
        $rawPerPage = $request->input('per_page', 25);
        $perPage = $rawPerPage === 'all' ? 999999 : max((int) $rawPerPage, 1);
        $search = $request->input('search');

        $query = Vendor::select('id', 'name as vendor_name', 'company_name', 'phone', 'wallet_balance', 'opening_balance')
            ->withSum('projectExpenses as project_due', 'due_amount')
            ->where(function ($q) {
                $q->whereHas('projectExpenses', function ($subQ) {
                    $subQ->where('due_amount', '>', 0);
                })->orWhere('wallet_balance', '>', 0)->orWhere('opening_balance', '>', 0);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $vendorIds = (clone $query)->pluck('id');
        $grandTotalDue = (float) ProjectExpense::whereIn('vendor_id', $vendorIds)->sum('due_amount') + (float) (clone $query)->sum('opening_balance');
        $totalAdvanceAmount = (float) (clone $query)->sum('wallet_balance');
        $grandTotalNetDue = (clone $query)->get()->sum(function ($vendor) {
            $grossDue = max((float) $vendor->opening_balance + (float) ($vendor->project_due ?? 0), 0);
            return max($grossDue - (float) $vendor->wallet_balance, 0);
        });

        $vendorDues = $query->latest('id')->paginate($perPage)->through(function ($v) {
            $v->append(['total_due', 'net_due']);
            $v->net_due = $v->net_due;
            return $v;
        })->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', [
            'vendorDues' => $vendorDues,
            'grandTotal' => $grandTotalDue,
            'grandTotalAdvance' => $totalAdvanceAmount,
            'grandTotalNetDue' => $grandTotalNetDue,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function daybook(Request $request)
    {
        $date = $request->input('date', Carbon::today()->toDateString());
        $parsedDate = Carbon::parse($date);

        $accounts = Account::all();
        $accountSummary = [];

        $totalOpening = 0;
        $totalInflow = 0;
        $totalOutflow = 0;
        $totalClosing = 0;

        $transactionModel = Transaction::class;

        foreach ($accounts as $acc) {
            $inflowsAfter = $transactionModel::where('account_id', $acc->id)
                ->whereDate('transaction_date', '>', $date)
                ->where('type', 'credit')->sum('amount');

            $outflowsAfter = $transactionModel::where('account_id', $acc->id)
                ->whereDate('transaction_date', '>', $date)
                ->where('type', 'debit')->sum('amount');

            $closingBalance = $acc->current_balance - $inflowsAfter + $outflowsAfter;

            $inflowToday = $transactionModel::where('account_id', $acc->id)
                ->whereDate('transaction_date', $date)
                ->where('type', 'credit')->sum('amount');

            $outflowToday = $transactionModel::where('account_id', $acc->id)
                ->whereDate('transaction_date', $date)
                ->where('type', 'debit')->sum('amount');

            $openingBalance = $closingBalance - $inflowToday + $outflowToday;

            $accountSummary[] = [
                'id' => $acc->id,
                'name' => $acc->name,
                'type' => $acc->type,
                'opening' => $openingBalance,
                'inflow' => $inflowToday,
                'outflow' => $outflowToday,
                'closing' => $closingBalance,
                'current_balance' => $acc->current_balance,
            ];

            $totalOpening += $openingBalance;
            $totalInflow += $inflowToday;
            $totalOutflow += $outflowToday;
            $totalClosing += $closingBalance;
        }

        $transactions = $transactionModel::with('account')
            ->whereDate('transaction_date', $date)
            ->latest('id')
            ->get();

        try {
            $transactions->loadMorph('transactionable', [
                Advance::class => ['user'],
                ClientAdvance::class => ['client'],
                VendorPayment::class => ['vendor'],
                Vendor::class => [],
                ProjectExpense::class => ['vendor', 'project'],
                Expense::class => ['vendor', 'category', 'client'],
                Salary::class => ['user'],
                InvoicePayment::class => ['invoice.client'],
                Investment::class => ['investor'],
                InvestmentPayment::class => ['investor'],
                Asset::class => ['assignee'],
            ]);
        } catch (\Exception $e) {}

        $transactions->transform(function ($trx) {
            $trx->party_name = null;
            $trx->party_type = null;
            $trx->context_label = 'Manual Entry / Fund Transfer';

            if ($trx->transactionable) {
                $type = class_basename($trx->transactionable_type);
                switch ($type) {
                    case 'Advance':
                        $trx->party_name = $trx->transactionable->user->name ?? 'Unknown Employee';
                        $trx->party_type = 'Employee';
                        $trx->context_label = 'Staff Advance';
                        break;
                    case 'ClientAdvance':
                        $trx->party_name = $trx->transactionable->client->name ?? 'Unknown Client';
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Client Advance';
                        break;
                    case 'VendorPayment':
                    case 'VendorLedger':
                        $trx->party_name = $trx->transactionable->vendor->name ?? 'Unknown Vendor';
                        $trx->party_type = 'Vendor';
                        $trx->context_label = 'Vendor Bill / Advance';
                        break;
                    case 'Vendor':
                        $trx->party_name = $trx->transactionable->name ?? 'Unknown Vendor';
                        $trx->party_type = 'Vendor';
                        $trx->context_label = $trx->type === 'credit' ? 'Vendor Refund' : 'Vendor Advance';
                        break;
                    case 'ProjectExpense':
                        $trx->party_name = $trx->transactionable->payee_name ?: ($trx->transactionable->vendor->name ?? 'General Payee');
                        $trx->party_type = $trx->transactionable->vendor_id ? 'Vendor' : 'Payee';
                        $trx->context_label = 'Project Expense';
                        break;
                    case 'Expense':
                        $isSample = ($trx->transactionable->type ?? 'office') === 'sample';
                        $trx->party_name = $trx->transactionable->client->name ?? ($trx->transactionable->vendor->name ?? ($trx->transactionable->category->name ?? ($isSample ? 'Sample Expense' : 'Office Expense')));
                        $trx->party_type = $trx->transactionable->client_id ? 'Client' : ($trx->transactionable->vendor_id ? 'Vendor' : ($isSample ? 'Sample' : 'Expense'));
                        $trx->context_label = $isSample ? 'Sample Expense' : 'Office Expense';
                        break;
                    case 'Salary':
                        $trx->party_name = $trx->transactionable->user->name ?? 'Unknown Employee';
                        $trx->party_type = 'Employee';
                        $trx->context_label = 'Salary Payment';
                        break;
                    case 'InvoicePayment':
                        $trx->party_name = $trx->transactionable->invoice->client->name ?? 'Unknown Client';
                        $trx->party_type = 'Client';
                        $trx->context_label = 'Invoice Collection';
                        break;
                    case 'Investment':
                        $trx->party_name = $trx->transactionable->investor->name ?? 'Investor';
                        $trx->party_type = 'Investor';
                        $trx->context_label = 'Investment Received';
                        break;
                    case 'InvestmentPayment':
                        $trx->party_name = $trx->transactionable->investor->name ?? 'Investor';
                        $trx->party_type = 'Investor';
                        $trx->context_label = 'Investment Return / Profit';
                        break;
                    case 'Asset':
                        $trx->party_name = $trx->transactionable->name ?? 'Asset';
                        $trx->party_type = 'Asset';
                        $trx->context_label = 'Asset Purchase';
                        break;
                    default:
                        $trx->context_label = $type;
                        break;
                }
            }
            return $trx;
        });

        $inflows = $transactions->where('type', 'credit')->values();
        $outflows = $transactions->where('type', 'debit')->values();

        $validInvoiceIds = DB::table('invoices')->whereNull('deleted_at')->pluck('id');
        $totalMarketReceivable = DB::table('invoices')->whereNull('deleted_at')->sum('grand_total')
                                 - DB::table('invoice_payments')->whereIn('invoice_id', $validInvoiceIds)->sum('amount')
                                 - DB::table('invoices')->whereNull('deleted_at')->sum('advance_used');
        $totalMarketPayable = DB::table('project_expenses')->sum('due_amount') + DB::table('vendors')->sum('opening_balance');

        return Inertia::render('Admin/Reports/Daybook', [
            'selectedDate' => $date,
            'formattedDate' => $parsedDate->format('l, jS F Y'),
            'summary' => [
                'opening' => $totalOpening,
                'inflow'  => $totalInflow,
                'outflow' => $totalOutflow,
                'closing' => $totalClosing,
            ],
            'accountSummary' => $accountSummary,
            'details' => [
                'transactions' => $transactions,
                'inflows'      => $inflows,
                'outflows'     => $outflows,
            ],
            'marketSnapshot' => [
                'receivable' => max($totalMarketReceivable, 0),
                'payable' => max($totalMarketPayable, 0),
            ]
        ]);
    }

    /**
     * Monthly balance report: Opening balance at month start, total in/out during the month, and closing balance at month end.
     *
     * Same method as the Daybook: start from each account's live current_balance and
     * walk backwards through transactions, so the latest month's closing always equals
     * the real account balance shown elsewhere in the system.
     */
    public function monthlyBalance(Request $request)
    {
        $today = Carbon::today();
        $year = (int) $request->input('year', $today->year);
        $accountId = $request->filled('account_id') ? (int) $request->input('account_id') : null;

        $yearStart = Carbon::create($year, 1, 1)->toDateString();
        $yearEnd = Carbon::create($year, 12, 31)->toDateString();

        $scoped = fn () => Transaction::query()
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId));

        $sumSql = "COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credit,
                   COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as debit";

        // Live balance right now (all accounts, or the selected one)
        $liveBalance = (float) Account::query()
            ->when($accountId, fn ($q) => $q->whereKey($accountId))
            ->sum('current_balance');

        // Everything dated after the selected year, to roll back to the year-end balance
        $after = $scoped()
            ->whereDate('transaction_date', '>', $yearEnd)
            ->selectRaw($sumSql)
            ->first();

        // Per-day totals inside the year (portable across databases), bucketed into months below
        $daily = $scoped()
            ->whereBetween('transaction_date', [$yearStart, $yearEnd])
            ->selectRaw("transaction_date, COUNT(*) as trx_count, {$sumSql}")
            ->groupBy('transaction_date')
            ->get();

        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[$m] = ['credit' => 0.0, 'debit' => 0.0, 'count' => 0];
        }
        foreach ($daily as $row) {
            $m = Carbon::parse($row->transaction_date)->month;
            $months[$m]['credit'] += (float) $row->credit;
            $months[$m]['debit'] += (float) $row->debit;
            $months[$m]['count'] += (int) $row->trx_count;
        }

        // Walk backwards from the year-end closing balance
        $closing = $liveBalance - (float) $after->credit + (float) $after->debit;
        $rows = [];
        for ($m = 12; $m >= 1; $m--) {
            $opening = $closing - $months[$m]['credit'] + $months[$m]['debit'];
            $monthStart = Carbon::create($year, $m, 1);

            $rows[$m] = [
                'month'      => $m,
                'label'      => $monthStart->format('F Y'),
                'start_date' => $monthStart->toDateString(),
                'end_date'   => $monthStart->copy()->endOfMonth()->toDateString(),
                'opening'    => round($opening, 2),
                'deposit'    => round($months[$m]['credit'], 2),
                'withdraw'   => round($months[$m]['debit'], 2),
                'closing'    => round($closing, 2),
                'count'      => $months[$m]['count'],
            ];
            $closing = $opening;
        }
        $yearOpening = round($closing, 2);
        ksort($rows);

        // Don't show future months of the current year (unless they already have entries)
        $lastMonth = $year < $today->year ? 12 : ($year === $today->year ? $today->month : 0);
        foreach ($rows as $m => $r) {
            if ($r['count'] > 0) {
                $lastMonth = max($lastMonth, $m);
            }
        }
        $rows = array_filter($rows, fn ($r) => $r['month'] <= $lastMonth);

        // Hide empty months before the first ever entry
        $isEmpty = fn ($r) => $r['count'] === 0 && abs($r['opening']) < 0.005 && abs($r['closing']) < 0.005;
        while (!empty($rows) && $isEmpty(reset($rows))) {
            array_shift($rows);
        }
        $rows = array_values($rows);

        $summary = [
            'opening'  => !empty($rows) ? $rows[0]['opening'] : $yearOpening,
            'deposit'  => round(array_sum(array_column($rows, 'deposit')), 2),
            'withdraw' => round(array_sum(array_column($rows, 'withdraw')), 2),
            'closing'  => !empty($rows) ? end($rows)['closing'] : $yearOpening,
        ];

        $firstDate = Transaction::min('transaction_date');
        $lastDate = Transaction::max('transaction_date');
        $minYear = $firstDate ? Carbon::parse($firstDate)->year : $today->year;
        $maxYear = max($today->year, $lastDate ? Carbon::parse($lastDate)->year : $today->year);

        return Inertia::render('Admin/Reports/MonthlyBalance', [
            'rows'     => $rows,
            'summary'  => $summary,
            'years'    => range($maxYear, min($minYear, $maxYear)),
            'accounts' => Account::orderBy('name')->get(['id', 'name', 'type', 'is_active']),
            'filters'  => [
                'year'       => $year,
                'account_id' => $accountId,
            ],
        ]);
    }

    /**
     * Dedicated Vendor Ledger Report with Date-wise Payment Summary
     */
    public function vendorLedger(Request $request)
    {
        $vendors = Vendor::select('id', 'name', 'phone', 'company_name', 'wallet_balance', 'opening_balance')
            ->orderBy('name')
            ->get();

        $ledger = [];
        $dateWisePayments = [];
        $summary = [
            'total_billed' => 0,
            'opening_balance' => 0,
            'total_paid' => 0,
            'total_discount' => 0,
            'wallet_balance' => 0,
            'net_due' => 0,
        ];
        $vendorInfo = null;

        if ($request->filled('vendor_id')) {
            $vendorInfo = Vendor::find($request->vendor_id);

            if ($vendorInfo) {
                $summary['wallet_balance'] = (float) ($vendorInfo->wallet_balance ?? 0);
                $summary['opening_balance'] = (float) ($vendorInfo->opening_balance ?? 0);

                $bills = ProjectExpense::with(['project.client', 'category'])
                    ->where('vendor_id', $vendorInfo->id)
                    ->get();

                $payments = VendorPayment::with(['account', 'details.expense.project'])
                    ->where('vendor_id', $vendorInfo->id)
                    ->where('status', 'completed')
                    ->get();

                $events = collect();
                $paymentByDate = [];

                if ($summary['opening_balance'] > 0) {
                    $events->push([
                        'date' => $vendorInfo->created_at ? $vendorInfo->created_at->format('Y-m-d') : date('Y-m-d'),
                        'sort_time' => '0000-00-00 00:00:00',
                        'type' => 'Opening Balance',
                        'ref' => 'OPENING',
                        'method' => 'Opening',
                        'description' => 'Opening Balance',
                        'debit' => $summary['opening_balance'],
                        'credit' => 0,
                        'discount' => 0,
                    ]);
                    $summary['total_billed'] += $summary['opening_balance'];
                }

                foreach ($bills as $bill) {
                    $billDate = $bill->date ?: ($bill->created_at ? $bill->created_at->format('Y-m-d') : date('Y-m-d'));
                    $billAmt = (float) $bill->total_bill;
                    $summary['total_billed'] += $billAmt;

                    $projectTitle = $bill->project?->title ? " ({$bill->project->title})" : '';
                    $events->push([
                        'date' => $billDate,
                        'sort_time' => $bill->created_at ? $bill->created_at->toDateTimeString() : ($billDate . ' 00:00:00'),
                        'type' => 'Bill',
                        'ref' => 'BILL-' . $bill->id,
                        'method' => $bill->category?->name ?? 'Project Bill',
                        'description' => $bill->title . $projectTitle,
                        'debit' => $billAmt,
                        'credit' => 0,
                        'discount' => 0,
                    ]);

                    $voucherSettled = \App\Models\VendorPaymentDetail::where('project_expense_id', $bill->id)
                        ->whereHas('payment', fn($q) => $q->where('status', 'completed'))
                        ->sum('amount');

                    $directPaid = max(0, (float) $bill->paid_amount - (float) $voucherSettled);

                    if ($directPaid > 0) {
                        if ($bill->advance_user_id) {
                            $sourceName = 'Staff Advance (' . (\App\Models\User::find($bill->advance_user_id)?->name ?? 'Staff') . ')';
                        } elseif ($bill->account_id) {
                            $sourceName = Account::find($bill->account_id)?->name ?? 'Bank/Cash';
                        } else {
                            $sourceName = 'Vendor Advance (Wallet)';
                        }

                        $summary['total_paid'] += $directPaid;

                        $events->push([
                            'date' => $billDate,
                            'sort_time' => $bill->created_at ? $bill->created_at->copy()->addSecond()->toDateTimeString() : ($billDate . ' 00:00:01'),
                            'type' => 'Direct Pay',
                            'ref' => 'BILL-' . $bill->id,
                            'method' => $sourceName,
                            'description' => "Direct payment at bill entry: " . $bill->title . $projectTitle,
                            'debit' => 0,
                            'credit' => $directPaid,
                            'discount' => 0,
                        ]);

                        if (!isset($paymentByDate[$billDate])) {
                            $paymentByDate[$billDate] = [
                                'date' => $billDate,
                                'total_amount' => 0,
                                'total_discount' => 0,
                                'items' => [],
                                'methods' => [],
                            ];
                        }
                        $paymentByDate[$billDate]['total_amount'] += $directPaid;
                        $paymentByDate[$billDate]['items'][] = [
                            'type' => 'Direct Bill',
                            'ref' => 'BILL-' . $bill->id,
                            'title' => $bill->title . $projectTitle,
                            'amount' => $directPaid,
                            'discount' => 0,
                            'method' => $sourceName,
                        ];
                        if (!in_array($sourceName, $paymentByDate[$billDate]['methods'])) {
                            $paymentByDate[$billDate]['methods'][] = $sourceName;
                        }
                    }
                }

                foreach ($payments as $p) {
                    $payDate = $p->date ?: ($p->created_at ? $p->created_at->format('Y-m-d') : date('Y-m-d'));
                    if ($p->payment_source === 'wallet') {
                        $sourceLabel = 'Vendor Advance (Wallet)';
                    } elseif ($p->payment_source === 'advance') {
                        $sourceLabel = 'Staff Advance';
                    } else {
                        $sourceLabel = $p->account?->name ?? 'Bank/Cash';
                    }

                    $billTitles = $p->details->map(fn($d) => $d->expense?->title)->filter()->implode(', ');
                    $payAmt = (float) $p->pay_amount;
                    $discAmt = (float) $p->adjustment_amount;

                    $summary['total_paid'] += $payAmt;
                    $summary['total_discount'] += $discAmt;

                    $events->push([
                        'date' => $payDate,
                        'sort_time' => $p->created_at ? $p->created_at->toDateTimeString() : ($payDate . ' 23:59:59'),
                        'type' => 'Voucher Pay',
                        'ref' => 'VP-' . $p->id,
                        'method' => $sourceLabel,
                        'description' => "Voucher Payment" . ($billTitles ? " ({$billTitles})" : ""),
                        'debit' => 0,
                        'credit' => $payAmt,
                        'discount' => $discAmt,
                    ]);

                    if (!isset($paymentByDate[$payDate])) {
                        $paymentByDate[$payDate] = [
                            'date' => $payDate,
                            'total_amount' => 0,
                            'total_discount' => 0,
                            'items' => [],
                            'methods' => [],
                        ];
                    }
                    $paymentByDate[$payDate]['total_amount'] += $payAmt;
                    $paymentByDate[$payDate]['total_discount'] += $discAmt;
                    $paymentByDate[$payDate]['items'][] = [
                        'type' => 'Voucher',
                        'ref' => 'VP-' . $p->id,
                        'title' => $billTitles ?: 'Due Bill Payment',
                        'amount' => $payAmt,
                        'discount' => $discAmt,
                        'method' => $sourceLabel,
                    ];
                    if (!in_array($sourceLabel, $paymentByDate[$payDate]['methods'])) {
                        $paymentByDate[$payDate]['methods'][] = $sourceLabel;
                    }
                }

                $sorted = $events->sort(function ($a, $b) {
                    if ($a['type'] === 'Opening Balance') return -1;
                    if ($b['type'] === 'Opening Balance') return 1;
                    $cmp = strcmp($a['date'], $b['date']);
                    return $cmp !== 0 ? $cmp : strcmp($a['sort_time'], $b['sort_time']);
                })->values()->all();

                $balance = 0;
                foreach ($sorted as $item) {
                    $balance += $item['debit'] - $item['credit'] - $item['discount'];
                    $item['balance'] = $balance;
                    $item['date_group'] = ($item['credit'] > 0 && isset($paymentByDate[$item['date']]))
                        ? $paymentByDate[$item['date']]
                        : null;
                    $ledger[] = $item;
                }

                $summary['gross_due'] = max(0, $balance);
                $summary['net_due'] = max(0, $balance - $summary['wallet_balance']);

                krsort($paymentByDate);
                $dateWisePayments = array_values($paymentByDate);
            }
        }

        return Inertia::render('Admin/Reports/VendorLedger', [
            'vendors' => $vendors,
            'ledger' => $ledger,
            'dateWisePayments' => $dateWisePayments,
            'summary' => $summary,
            'vendorInfo' => $vendorInfo,
            'filters' => $request->only(['vendor_id']),
        ]);
    }

    /**
     * Project-wise Profit & Loss Report
     */
    public function projectProfitLoss(Request $request)
    {
        $search = $request->input('search');
        $clientId = $request->input('client_id');
        $status = $request->input('status');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $projectsQuery = \App\Models\Project::with(['client:id,name,company_name'])
            ->whereNull('deleted_at');

        if ($search) {
            $projectsQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%"));
            });
        }

        if ($clientId) {
            $projectsQuery->where('client_id', $clientId);
        }

        if ($status) {
            $projectsQuery->where('status', $status);
        }

        if ($startDate) {
            $projectsQuery->whereDate('start_date', '>=', $startDate);
        }

        if ($endDate) {
            $projectsQuery->whereDate('start_date', '<=', $endDate);
        }

        $projects = $projectsQuery->latest('id')->get();
        $projectIds = $projects->pluck('id')->toArray();

        // Expense aggregations per project
        $expensesByProject = DB::table('project_expenses')
            ->whereIn('project_id', $projectIds)
            ->select(
                'project_id',
                DB::raw('COALESCE(SUM(total_bill), 0) as total_expense'),
                DB::raw('COALESCE(SUM(paid_amount), 0) as paid_expense'),
                DB::raw('COALESCE(SUM(due_amount), 0) as due_expense'),
                DB::raw('COUNT(id) as expense_count')
            )
            ->groupBy('project_id')
            ->get()
            ->keyBy('project_id');

        // Invoice & Payment aggregations per project via invoice_items
        $invoiceItems = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoice_items.project_id', $projectIds)
            ->select(
                'invoice_items.project_id',
                'invoice_items.total as item_total',
                'invoices.id as invoice_id',
                'invoices.invoice_number',
                'invoices.sub_total',
                'invoices.grand_total',
                'invoices.advance_used'
            )
            ->get();

        $invoiceIds = $invoiceItems->pluck('invoice_id')->unique()->toArray();
        $invoicePaymentsMap = DB::table('invoice_payments')
            ->whereIn('invoice_id', $invoiceIds)
            ->select('invoice_id', DB::raw('COALESCE(SUM(amount), 0) as paid'))
            ->groupBy('invoice_id')
            ->pluck('paid', 'invoice_id');

        $billingByProject = [];
        foreach ($invoiceItems as $row) {
            $pid = $row->project_id;
            if (!isset($billingByProject[$pid])) {
                $billingByProject[$pid] = [
                    'invoiced' => 0,
                    'collected' => 0,
                    'invoices' => [],
                ];
            }
            $subTotal = (float) $row->sub_total;
            $grandTotal = (float) $row->grand_total;
            $itemTotal = (float) $row->item_total;
            $invPaid = (float) ($invoicePaymentsMap[$row->invoice_id] ?? 0);

            $ratio = $subTotal > 0 ? ($itemTotal / $subTotal) : 1;
            $effectiveBilled = round($grandTotal * $ratio, 2);
            $effectiveCollected = round(min($invPaid + (float) $row->advance_used, $grandTotal) * $ratio, 2);

            $billingByProject[$pid]['invoiced'] += $effectiveBilled;
            $billingByProject[$pid]['collected'] += $effectiveCollected;
            if (!in_array($row->invoice_number, $billingByProject[$pid]['invoices'])) {
                $billingByProject[$pid]['invoices'][] = $row->invoice_number;
            }
        }

        $rows = [];
        $summary = [
            'total_projects' => $projects->count(),
            'total_budget' => 0,
            'total_invoiced' => 0,
            'total_collected' => 0,
            'total_receivable' => 0,
            'total_expense' => 0,
            'total_expense_paid' => 0,
            'total_expense_due' => 0,
            'net_profit' => 0,
            'cash_profit' => 0,
        ];

        foreach ($projects as $project) {
            $budget = (float) ($project->budget ?? 0);
            $billInfo = $billingByProject[$project->id] ?? ['invoiced' => 0, 'collected' => 0, 'invoices' => []];
            $expInfo = $expensesByProject->get($project->id);

            $invoiced = (float) $billInfo['invoiced'];
            $collected = (float) $billInfo['collected'];
            $receivable = max(0, $invoiced - $collected);

            $totalExpense = $expInfo ? (float) $expInfo->total_expense : 0;
            $paidExpense = $expInfo ? (float) $expInfo->paid_expense : 0;
            $dueExpense = $expInfo ? (float) $expInfo->due_expense : 0;
            $expenseCount = $expInfo ? (int) $expInfo->expense_count : 0;

            // Revenue base: use invoiced amount if billed, otherwise budget for projected profit
            $revenueBase = $invoiced > 0 ? $invoiced : $budget;
            $netProfit = $revenueBase - $totalExpense;
            $cashProfit = $collected - $paidExpense;
            $margin = $revenueBase > 0 ? round(($netProfit / $revenueBase) * 100, 1) : 0;

            $summary['total_budget'] += $budget;
            $summary['total_invoiced'] += $invoiced;
            $summary['total_collected'] += $collected;
            $summary['total_receivable'] += $receivable;
            $summary['total_expense'] += $totalExpense;
            $summary['total_expense_paid'] += $paidExpense;
            $summary['total_expense_due'] += $dueExpense;
            $summary['net_profit'] += $netProfit;
            $summary['cash_profit'] += $cashProfit;

            $rows[] = [
                'id' => $project->id,
                'title' => $project->title,
                'client_name' => $project->client?->name ?? 'Unknown Client',
                'company_name' => $project->client?->company_name,
                'start_date' => $project->start_date ? Carbon::parse($project->start_date)->format('Y-m-d') : null,
                'status' => $project->status,
                'budget' => $budget,
                'invoiced' => $invoiced,
                'is_billed' => $invoiced > 0,
                'invoices' => $billInfo['invoices'],
                'collected' => $collected,
                'receivable' => $receivable,
                'total_expense' => $totalExpense,
                'paid_expense' => $paidExpense,
                'due_expense' => $dueExpense,
                'expense_count' => $expenseCount,
                'net_profit' => $netProfit,
                'cash_profit' => $cashProfit,
                'margin' => $margin,
            ];
        }

        $revenueTotal = $summary['total_invoiced'] > 0 ? $summary['total_invoiced'] : $summary['total_budget'];
        $summary['overall_margin'] = $revenueTotal > 0 ? round(($summary['net_profit'] / $revenueTotal) * 100, 1) : 0;

        return Inertia::render('Admin/Reports/ProjectProfitLoss', [
            'projects' => $rows,
            'summary' => $summary,
            'clients' => Client::select('id', 'name', 'company_name')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'client_id', 'status', 'start_date', 'end_date']),
        ]);
    }

    /**
     * Expense Category Breakdown & Dues Aging Analysis Report (30/60/90+ Days)
     */
    public function expenseAnalysis(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $officeQuery = DB::table('expenses')
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->where(function ($q) {
                $q->where('expenses.type', 'office')->orWhereNull('expenses.type');
            });

        $sampleQuery = DB::table('expenses')
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->where('expenses.type', 'sample');

        $projectQuery = DB::table('project_expenses')
            ->leftJoin('expense_categories', 'project_expenses.expense_category_id', '=', 'expense_categories.id');

        if ($startDate) {
            $officeQuery->whereDate('expenses.date', '>=', $startDate);
            $sampleQuery->whereDate('expenses.date', '>=', $startDate);
            $projectQuery->whereDate('project_expenses.date', '>=', $startDate);
        }
        if ($endDate) {
            $officeQuery->whereDate('expenses.date', '<=', $endDate);
            $sampleQuery->whereDate('expenses.date', '<=', $endDate);
            $projectQuery->whereDate('project_expenses.date', '<=', $endDate);
        }

        $officeByCategory = $officeQuery
            ->select(
                DB::raw("COALESCE(expense_categories.name, 'Uncategorized / General Expense') as category_name"),
                DB::raw('COALESCE(SUM(expenses.amount), 0) as office_total'),
                DB::raw('COUNT(expenses.id) as office_count')
            )
            ->groupBy('category_name')
            ->get()
            ->keyBy('category_name');

        $sampleByCategory = $sampleQuery
            ->select(
                DB::raw("COALESCE(expense_categories.name, 'Uncategorized / Sample Expense') as category_name"),
                DB::raw('COALESCE(SUM(expenses.amount), 0) as sample_total'),
                DB::raw('COUNT(expenses.id) as sample_count')
            )
            ->groupBy('category_name')
            ->get()
            ->keyBy('category_name');

        $projectByCategory = $projectQuery
            ->select(
                DB::raw("COALESCE(expense_categories.name, 'Uncategorized / Project Expense') as category_name"),
                DB::raw('COALESCE(SUM(project_expenses.total_bill), 0) as project_total'),
                DB::raw('COUNT(project_expenses.id) as project_count')
            )
            ->groupBy('category_name')
            ->get()
            ->keyBy('category_name');

        $allCategories = $officeByCategory->keys()
            ->merge($projectByCategory->keys())
            ->merge($sampleByCategory->keys())
            ->unique();

        $categoryRows = [];
        $grandOffice = 0;
        $grandProject = 0;
        $grandSample = 0;

        foreach ($allCategories as $catName) {
            $off = $officeByCategory->get($catName);
            $proj = $projectByCategory->get($catName);
            $samp = $sampleByCategory->get($catName);

            $offAmt = $off ? (float) $off->office_total : 0;
            $projAmt = $proj ? (float) $proj->project_total : 0;
            $sampAmt = $samp ? (float) $samp->sample_total : 0;
            $totalAmt = $offAmt + $projAmt + $sampAmt;
            $count = ($off ? (int) $off->office_count : 0) + ($proj ? (int) $proj->project_count : 0) + ($samp ? (int) $samp->sample_count : 0);

            $grandOffice += $offAmt;
            $grandProject += $projAmt;
            $grandSample += $sampAmt;

            $categoryRows[] = [
                'category' => $catName,
                'office_amount' => $offAmt,
                'sample_amount' => $sampAmt,
                'project_amount' => $projAmt,
                'total_amount' => $totalAmt,
                'entries_count' => $count,
            ];
        }

        $grandTotalExpense = $grandOffice + $grandProject + $grandSample;
        usort($categoryRows, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        foreach ($categoryRows as &$row) {
            $row['percentage'] = $grandTotalExpense > 0 ? round(($row['total_amount'] / $grandTotalExpense) * 100, 1) : 0;
        }
        unset($row);

        // 2. Receivable Aging (Overdue / Unpaid Invoices)
        $today = Carbon::today();
        $invoices = DB::table('invoices')
            ->join('clients', 'invoices.client_id', '=', 'clients.id')
            ->leftJoin('invoice_payments', 'invoices.id', '=', 'invoice_payments.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->whereNull('clients.deleted_at')
            ->select(
                'invoices.id',
                'invoices.invoice_number',
                'invoices.invoice_date',
                'invoices.due_date',
                'invoices.grand_total',
                'invoices.advance_used',
                'clients.id as client_id',
                'clients.name as client_name',
                'clients.company_name',
                'clients.phone as client_phone',
                DB::raw('COALESCE(SUM(invoice_payments.amount), 0) as paid_amount')
            )
            ->groupBy(
                'invoices.id',
                'invoices.invoice_number',
                'invoices.invoice_date',
                'invoices.due_date',
                'invoices.grand_total',
                'invoices.advance_used',
                'clients.id',
                'clients.name',
                'clients.company_name',
                'clients.phone'
            )
            ->get();

        $receivableAging = [];
        $receivableBuckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, '90_plus' => 0, 'total' => 0];

        foreach ($invoices as $inv) {
            $due = round((float) $inv->grand_total - (float) $inv->paid_amount - (float) $inv->advance_used, 2);
            if ($due <= 0) continue;

            $refDate = $inv->due_date ? Carbon::parse($inv->due_date) : Carbon::parse($inv->invoice_date ?? $today);
            $daysOld = max(0, (int) $refDate->diffInDays($today, false));

            if ($daysOld <= 30) {
                $bucket = '0-30 Days';
                $receivableBuckets['0_30'] += $due;
            } elseif ($daysOld <= 60) {
                $bucket = '31-60 Days';
                $receivableBuckets['31_60'] += $due;
            } elseif ($daysOld <= 90) {
                $bucket = '61-90 Days';
                $receivableBuckets['61_90'] += $due;
            } else {
                $bucket = '90+ Days';
                $receivableBuckets['90_plus'] += $due;
            }
            $receivableBuckets['total'] += $due;

            $receivableAging[] = [
                'id' => $inv->id,
                'ref' => $inv->invoice_number,
                'party_name' => $inv->client_name,
                'company_name' => $inv->company_name,
                'phone' => $inv->client_phone,
                'date' => $inv->invoice_date,
                'due_date' => $inv->due_date,
                'days_old' => $daysOld,
                'bucket' => $bucket,
                'total_bill' => (float) $inv->grand_total,
                'paid' => (float) $inv->paid_amount + (float) $inv->advance_used,
                'due' => $due,
            ];
        }
        usort($receivableAging, fn($a, $b) => $b['days_old'] <=> $a['days_old']);

        // 3. Payable Aging (Unpaid Vendor Bills)
        $vendorBills = DB::table('project_expenses')
            ->join('vendors', 'project_expenses.vendor_id', '=', 'vendors.id')
            ->leftJoin('projects', 'project_expenses.project_id', '=', 'projects.id')
            ->where('project_expenses.due_amount', '>', 0)
            ->select(
                'project_expenses.id',
                'project_expenses.title',
                'project_expenses.date',
                'project_expenses.total_bill',
                'project_expenses.paid_amount',
                'project_expenses.due_amount',
                'vendors.id as vendor_id',
                'vendors.name as vendor_name',
                'vendors.company_name',
                'vendors.phone as vendor_phone',
                'projects.title as project_title'
            )
            ->get();

        $payableAging = [];
        $payableBuckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, '90_plus' => 0, 'total' => 0];

        foreach ($vendorBills as $bill) {
            $due = round((float) $bill->due_amount, 2);
            if ($due <= 0) continue;

            $refDate = $bill->date ? Carbon::parse($bill->date) : $today;
            $daysOld = max(0, (int) $refDate->diffInDays($today, false));

            if ($daysOld <= 30) {
                $bucket = '0-30 Days';
                $payableBuckets['0_30'] += $due;
            } elseif ($daysOld <= 60) {
                $bucket = '31-60 Days';
                $payableBuckets['31_60'] += $due;
            } elseif ($daysOld <= 90) {
                $bucket = '61-90 Days';
                $payableBuckets['61_90'] += $due;
            } else {
                $bucket = '90+ Days';
                $payableBuckets['90_plus'] += $due;
            }
            $payableBuckets['total'] += $due;

            $payableAging[] = [
                'id' => $bill->id,
                'ref' => 'BILL-' . $bill->id,
                'title' => $bill->title,
                'project' => $bill->project_title,
                'party_name' => $bill->vendor_name,
                'company_name' => $bill->company_name,
                'phone' => $bill->vendor_phone,
                'date' => $bill->date,
                'days_old' => $daysOld,
                'bucket' => $bucket,
                'total_bill' => (float) $bill->total_bill,
                'paid' => (float) $bill->paid_amount,
                'due' => $due,
            ];
        }
        usort($payableAging, fn($a, $b) => $b['days_old'] <=> $a['days_old']);

        return Inertia::render('Admin/Reports/ExpenseAnalysis', [
            'categoryRows' => $categoryRows,
            'expenseSummary' => [
                'office_total' => $grandOffice,
                'sample_total' => $grandSample,
                'project_total' => $grandProject,
                'grand_total' => $grandTotalExpense,
            ],
            'receivableAging' => $receivableAging,
            'receivableBuckets' => $receivableBuckets,
            'payableAging' => $payableAging,
            'payableBuckets' => $payableBuckets,
            'filters' => $request->only(['start_date', 'end_date']),
        ]);
    }
}
