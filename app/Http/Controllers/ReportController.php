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
use Carbon\Carbon;

class ReportController extends Controller
{
    public function financialPosition()
    {
        $accounts = \App\Models\Account::where('is_active', true)
            ->orderBy('name')->get(['id', 'name', 'current_balance'])
            ->map(fn ($account) => [
                'id' => $account->id,
                'name' => $account->name,
                'balance' => (float) $account->current_balance,
            ]);

        $investmentGross = (float) \App\Models\Investment::sum('amount');
        $investmentReturned = (float) \App\Models\InvestmentPayment::sum('principal_amount');

        // 🟢 Active Investments Details
        $activeInvestments = \App\Models\Investment::withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->map(fn ($inv) => [
                'name' => $inv->investor_name,
                'gross' => (float) $inv->amount,
                'returned' => (float) ($inv->returned_principal ?? 0),
                'balance' => max((float) $inv->amount - (float) ($inv->returned_principal ?? 0), 0),
            ])->filter(fn ($row) => $row['balance'] > 0)->values();

        $clientAdvances = \App\Models\ClientAdvance::with('client:id,name,company_name')
            ->select('client_id', \Illuminate\Support\Facades\DB::raw('SUM(amount) total_received'), \Illuminate\Support\Facades\DB::raw('SUM(used_amount) total_used'))
            ->groupBy('client_id')->get()->map(fn ($row) => [
                'name' => $row->client?->name ?? 'Unknown Client',
                'company' => $row->client?->company_name,
                'received' => (float) $row->total_received,
                'used' => (float) $row->total_used,
                'balance' => max((float) $row->total_received - (float) $row->total_used, 0),
            ])->values();

        $vendorPositions = \App\Models\Vendor::withSum('projectExpenses as project_due', 'due_amount')
            ->orderBy('name')->get()->map(fn ($vendor) => [
                'name' => $vendor->name,
                'company' => $vendor->company_name,
                'advance' => (float) $vendor->wallet_balance,
                'due' => max((float) $vendor->opening_balance + (float) ($vendor->project_due ?? 0), 0),
            ]);

        $clientDues = \App\Models\Client::query()->select('clients.id', 'clients.name', 'clients.company_name')
            ->addSelect([
                'invoiced' => \Illuminate\Support\Facades\DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(grand_total),0)'),
                'legacy_advance' => \Illuminate\Support\Facades\DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(advance_used),0)'),
                'paid' => \Illuminate\Support\Facades\DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')->whereColumn('invoices.client_id', 'clients.id')->whereNull('invoices.deleted_at')->selectRaw('COALESCE(SUM(invoice_payments.amount),0)'),
            ])->get()->map(fn ($client) => [
                'name' => $client->name,
                'company' => $client->company_name,
                'invoiced' => (float) $client->invoiced,
                'paid' => (float) $client->paid + (float) $client->legacy_advance,
                'due' => max((float) $client->invoiced - (float) $client->paid - (float) $client->legacy_advance, 0),
            ])->filter(fn ($row) => $row['due'] > 0)->values();

        $staffAdvances = \App\Models\AdvanceBalance::with('user:id,name')->get()->map(fn ($row) => [
            'name' => $row->user?->name ?? 'Unknown Staff',
            'given' => (float) $row->total_given,
            'used' => (float) $row->total_used,
            'returned' => (float) $row->total_returned,
            'balance' => max((float) $row->total_given - (float) $row->total_used - (float) $row->total_returned, 0),
        ])->filter(fn ($row) => $row['balance'] > 0)->values();

        // 🟢 Unpaid Salaries Details
        $unpaidSalariesDetails = \App\Models\Salary::with('user:id,name')
            ->whereIn('status', ['unpaid', 'partially_paid'])
            ->get()
            ->map(fn ($salary) => [
                'name' => $salary->user?->name ?? 'Unknown Staff',
                'month' => $salary->month_year,
                'due' => (float) $salary->due_amount,
            ])->values();

        $unpaidSalariesTotal = $unpaidSalariesDetails->sum('due');

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
            'asset_value' => (float) \App\Models\Asset::sum('purchase_price'),
            'staff_advance' => $staffAdvances->sum('balance'),
        ];

        $alerts = collect();
        $negativeAccounts = $accounts->filter(fn ($row) => $row['balance'] < 0);
        if ($negativeAccounts->isNotEmpty()) {
            $alerts->push(['level' => 'danger', 'message' => $negativeAccounts->count() . ' account(s) have a negative balance.']);
        }
        $overReturnedInvestments = \App\Models\Investment::withSum('payments as returned_principal', 'principal_amount')->get()
            ->filter(fn ($row) => (float) ($row->returned_principal ?? 0) > (float) $row->amount);
        if ($overReturnedInvestments->isNotEmpty()) {
            $alerts->push(['level' => 'danger', 'message' => $overReturnedInvestments->count() . ' investment(s) have returned principal greater than the original amount.']);
        }
        $vendorConflicts = $vendorPositions->filter(fn ($row) => $row['advance'] > 0 && $row['due'] > 0);
        if ($vendorConflicts->isNotEmpty()) {
            $alerts->push(['level' => 'warning', 'message' => $vendorConflicts->count() . ' vendor(s) have both advance and payable balances; consider adjusting the wallet against due bills.']);
        }

        return \Inertia\Inertia::render('Admin/Reports/FinancialPosition', compact(
            'summary', 'accounts', 'clientAdvances', 'vendorPositions', 'clientDues', 'staffAdvances', 'alerts',
            'unpaidSalariesDetails', 'activeInvestments'
        ));
    }

    public function financialSummary(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'month' => ['nullable', 'date_format:Y-m'],
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

        // VALID INVOICES ONLY
        $validInvoiceIds = \Illuminate\Support\Facades\DB::table('invoices')->whereNull('deleted_at')->pluck('id')->toArray();
        
        $query = \Illuminate\Support\Facades\DB::table('projects')
            ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
            ->leftJoin('project_expenses', 'projects.id', '=', 'project_expenses.project_id')
            ->whereNull('projects.deleted_at')
            ->whereNull('clients.deleted_at');

        $applyPeriod($query, 'projects.start_date');

        $projectsData = $query->select(
                'projects.id', 'projects.client_id', 'projects.title', 'projects.budget', 'projects.start_date', 'projects.status', 'clients.name as client_name',
                \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(project_expenses.total_bill), 0) as total_expense')
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
            $invoiceStats = \Illuminate\Support\Facades\DB::table('invoices')->whereIn('client_id', $clientIds)->whereNull('deleted_at')
                ->whereIn('id', $validInvoiceIds)
                ->select('client_id', \Illuminate\Support\Facades\DB::raw('COUNT(id) as total_invoices'), \Illuminate\Support\Facades\DB::raw('SUM(grand_total) as total_billed'));
            $applyPeriod($invoiceStats, 'invoice_date');
            $invoiceStats = $invoiceStats->groupBy('client_id')->get()->keyBy('client_id');

            $paymentStats = \Illuminate\Support\Facades\DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                ->whereIn('invoices.client_id', $clientIds)->whereNull('invoices.deleted_at')
                ->whereIn('invoices.id', $validInvoiceIds)
                ->select('invoices.client_id', \Illuminate\Support\Facades\DB::raw('SUM(invoice_payments.amount) as total_paid'));

            $applyPeriod($paymentStats, 'invoice_payments.payment_date');
            $paymentStats = $paymentStats->groupBy('invoices.client_id')->get()->keyBy('client_id');

            foreach ($clientsMap as $cName => &$data) {
                $cId = $data['client_id'];
                if ($cId) {
                    $inv = $invoiceStats->get($cId) ?? null;
                    $pay = $paymentStats->get($cId) ?? null;
                    $data['total_invoices'] = $inv ? (int)$inv->total_invoices : 0;
                    $data['total_billed']   = $inv ? (float)$inv->total_billed : 0;
                    $data['total_paid']     = $pay ? (float)$pay->total_paid : 0;
                    $data['total_due']      = $data['total_billed'] - $data['total_paid'];
                }
            }
            unset($data);
        }
        usort($monthlyData, function($a, $b) { return strcmp($b['sort_key'], $a['sort_key']); });

        $revenueQuery = \Illuminate\Support\Facades\DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds);
        $receivedQuery = \Illuminate\Support\Facades\DB::table('invoice_payments')
            ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoices.id', $validInvoiceIds);

        $clientAdvQuery = \Illuminate\Support\Facades\DB::table('client_advances');
        $expenseQuery = \Illuminate\Support\Facades\DB::table('transactions')->where('transactionable_type', \App\Models\Expense::class)->where('type', 'debit');
        $salaryQuery = \Illuminate\Support\Facades\DB::table('transactions')->where('transactionable_type', \App\Models\Salary::class)->where('type', 'debit');
        $bankChargeQuery = \Illuminate\Support\Facades\DB::table('transactions');
        $projectCostQuery = \Illuminate\Support\Facades\DB::table('transactions')->whereIn('transactionable_type', [\App\Models\ProjectExpense::class, \App\Models\VendorPayment::class]);
        $financeCostQuery = \Illuminate\Support\Facades\DB::table('investment_payments');

        // Apply Date Filters
        $applyPeriod($revenueQuery, 'invoice_date');
        $applyPeriod($receivedQuery, 'invoice_payments.payment_date');
        $applyPeriod($clientAdvQuery, 'date');
        $applyPeriod($expenseQuery, 'transaction_date');
        $applyPeriod($salaryQuery, 'transaction_date');
        $applyPeriod($bankChargeQuery, 'transaction_date');
        $applyPeriod($projectCostQuery, 'transaction_date');
        $applyPeriod($financeCostQuery, 'payment_date');

        $overallTotalBilled = (float) $revenueQuery->sum('grand_total');
        $receivedQuery->whereNotNull('invoice_payments.account_id');
        $totalInvoiceReceived = (float) $receivedQuery->sum('invoice_payments.amount');

        $totalClientAdvanceReceived = (float) $clientAdvQuery->sum('amount');
        $totalCashIn = $totalInvoiceReceived + $totalClientAdvanceReceived;

        $totalProjectExpensePaid = (float) (clone $projectCostQuery)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount - bank_charge ELSE -amount + bank_charge END), 0) total")->value('total');
        $totalOfficeExpense = (float) (clone $expenseQuery)->selectRaw('COALESCE(SUM(amount - bank_charge), 0) total')->value('total');
        $totalSalaryPaid = (float) (clone $salaryQuery)->selectRaw('COALESCE(SUM(amount - bank_charge), 0) total')->value('total');
        $totalBankCharges = (float) (clone $bankChargeQuery)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN bank_charge ELSE -bank_charge END), 0) total")->value('total');
        $totalFinanceCost = (float) $financeCostQuery->sum('profit_amount');
        $totalCashOut = $totalProjectExpensePaid + $totalOfficeExpense + $totalSalaryPaid + $totalFinanceCost + $totalBankCharges;

        $netCashFlow = $totalCashIn - $totalCashOut;

        $accrualRevenueQuery = \Illuminate\Support\Facades\DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds);
        $applyPeriod($accrualRevenueQuery, 'invoice_date');
        $accrualRevenue = (float) $accrualRevenueQuery->sum('grand_total');

        $accrualProjectExpQuery = \Illuminate\Support\Facades\DB::table('project_expenses');
        $applyPeriod($accrualProjectExpQuery, 'date');
        $accrualProjectCost = (float) $accrualProjectExpQuery->sum('total_bill'); // Only Actual Bill, not what is paid

        $accrualOfficeExpQuery = \Illuminate\Support\Facades\DB::table('expenses');
        $applyPeriod($accrualOfficeExpQuery, 'date');
        $accrualOfficeCost = (float) $accrualOfficeExpQuery->sum('amount');

        $accrualSalaryQuery = \Illuminate\Support\Facades\DB::table('salaries');
        $applyPeriod($accrualSalaryQuery, 'payment_date');
        $accrualSalaryCost = (float) $accrualSalaryQuery->sum('net_pay');

        $netActualProfit = $accrualRevenue - ($accrualProjectCost + $accrualOfficeCost + $accrualSalaryCost);

        $accountBalance = (float) \Illuminate\Support\Facades\DB::table('accounts')->where('is_active', true)->sum('current_balance');
        $staffAdvance = max((float) \Illuminate\Support\Facades\DB::table('advance_balances')->selectRaw('COALESCE(SUM(total_given - total_used - total_returned), 0) balance')->value('balance'), 0);
        $vendorAdvance = (float) \Illuminate\Support\Facades\DB::table('vendors')->sum('wallet_balance');
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

            'net_cash_flow' => $netCashFlow,
            'accrual_revenue' => $accrualRevenue,
            'accrual_project_cost' => $accrualProjectCost,
            'accrual_office_cost' => $accrualOfficeCost,
            'accrual_salary_cost' => $accrualSalaryCost,
            'net_actual_profit' => $netActualProfit,

            'client_due' => max(
                (float) \Illuminate\Support\Facades\DB::table('invoices')->whereNull('deleted_at')->whereIn('id', $validInvoiceIds)->sum('grand_total')
                - (float) \Illuminate\Support\Facades\DB::table('invoice_payments')->whereIn('invoice_id', $validInvoiceIds)->sum('amount'),
            0),
            'vendor_due' => (float) \Illuminate\Support\Facades\DB::table('project_expenses')->sum('due_amount'),
        ];

        return \Inertia\Inertia::render('Admin/Reports/FinancialReports', [
            'clientsReport' => array_values($clientsMap),
            'monthlyReport' => $monthlyData,
            'summary' => $summary,
            'filters' => $request->only(['start_date', 'end_date', 'year', 'month'])
        ]);
    }


    public function transactionsReport(Request $request)
    {
        $transactionModel = \App\Models\Transaction::class;
        $query = $transactionModel::with('account:id,name');
        $sources = [
            'vendor_payment' => [\App\Models\VendorPayment::class, 'debit'],
            'vendor_payment_void' => [\App\Models\VendorPayment::class, 'credit'],
            'vendor_advance' => [\App\Models\Vendor::class, 'debit'],
            'vendor_refund' => [\App\Models\Vendor::class, 'credit'],
            'salary_payment' => [\App\Models\Salary::class, null],
            'invoice_payment' => [\App\Models\InvoicePayment::class, null],
            'expense' => [\App\Models\Expense::class, null],
            'project_expense' => [\App\Models\ProjectExpense::class, null],
            'asset_purchase' => [\App\Models\Asset::class, null],
            'investment_received' => [\App\Models\Investment::class, null],
            'investment_return' => [\App\Models\InvestmentPayment::class, null],
            'staff_advance' => [\App\Models\Advance::class, null],
            'client_advance' => [\App\Models\ClientAdvance::class, null],
            'manual_adjustment' => [null, null],
        ];
        if (isset($sources[$request->source_type])) {
            [$model, $direction] = $sources[$request->source_type];
            $query->where('transactionable_type', $model);
            if ($direction) $query->where('type', $direction);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhereHasMorph('transactionable', [\App\Models\VendorPayment::class], fn ($payment) => $payment->whereHas('vendor', fn ($vendor) => $vendor->where('name', 'like', "%{$search}%")));
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

        $perPage = \App\Support\Pagination::perPage($request, $query);
        if ($perPage === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        }

        $transactions = $query->latest('transaction_date')->latest('id')->paginate($perPage)->withQueryString();
        $transactions->getCollection()->each(function ($transaction) use ($sources) {
            foreach ($sources as $label => [$model, $direction]) {
                if ($transaction->transactionable_type === $model && (!$direction || $transaction->type === $direction)) {
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
        $summary = [
            'total_billed' => 0,
            'total_paid' => 0,
            'total_advance' => 0,
            'net_due' => 0
        ];
        $clientInfo = null;

        if ($request->filled('client_id')) {
            $clientInfo = Client::with([
                'invoices' => function($query) {
                    $query->whereNull('deleted_at');
                },
                'invoices.items.project',
                'invoices.payments',
                'clientAdvances'
            ])->find($request->client_id);

            if ($clientInfo) {
                $events = collect();

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
                    ]);
                    $summary['total_billed'] += (float) $invoice->grand_total;

                    foreach ($invoice->payments as $payment) {
                        $events->push([
                            'date' => $payment->payment_date ?? $payment->created_at->format('Y-m-d'),
                            'created_at' => $payment->created_at,
                            'type' => 'Payment',
                            'ref' => $invoice->invoice_number ?? 'INV-' . $invoice->id,
                            'description' => $payment->note ? "Payment Received: " . $payment->note : "Payment Received",
                            'debit' => 0,
                            'credit' => (float) $payment->amount,
                        ]);
                        $summary['total_paid'] += (float) $payment->amount;
                    }
                }

                foreach ($clientInfo->clientAdvances as $advance) {
                    $events->push([
                        'date' => $advance->date ?? $advance->created_at->format('Y-m-d'),
                        'created_at' => $advance->created_at,
                        'type' => 'Advance',
                        'ref' => 'ADV-' . $advance->id,
                        'description' => $advance->note ? "Advance Received: " . $advance->note : "Advance payment received",
                        'debit' => 0,
                        'credit' => (float) $advance->amount,
                    ]);
                    $summary['total_advance'] += (float) $advance->amount;
                }

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
                    $ledger[] = $item;
                }

                $summary['net_due'] = $balance;
            }
        }

        return Inertia::render('Admin/Reports/ClientLedger', [
            'clients' => $clients,
            'ledger' => $ledger,
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

        $grandTotalDue = (clone $query)->get()->sum(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid;
            return max($invoiced - $paid, 0);
        });

        $perPage = $request->input('per_page') === 'all' ? 999999 : (int) $request->input('per_page', 10);

        $clientDues = $query->latest('clients.created_at')->paginate($perPage)->through(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid;
            $advance = (float) $client->total_advance;
            $used = (float) $client->total_used;

            $client->total_due = max($invoiced - $paid, 0);
            $client->available_advance = max($advance - $used, 0);

            return $client;
        })->withQueryString();

        return Inertia::render('Admin/Reports/ClientDues', [
            'clientDues' => $clientDues,
            'filters' => $request->only('search', 'per_page'),
            'grandTotalDue' => $grandTotalDue,
        ]);
    }

    public function vendorDuesReport(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        $query = Vendor::select('id', 'name as vendor_name', 'company_name', 'phone', 'wallet_balance')
            ->withSum('projectExpenses as total_due', 'due_amount')
            ->where(function ($q) {
                $q->whereHas('projectExpenses', function ($subQ) {
                    $subQ->where('due_amount', '>', 0);
                })->orWhere('wallet_balance', '>', 0);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $grandTotalDue = ProjectExpense::whereIn('vendor_id', $query->pluck('id'))->sum('due_amount');
        $grandTotalAdvance = clone $query;
        $totalAdvanceAmount = $grandTotalAdvance->sum('wallet_balance');
        $vendorDues = $query->latest('id')->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', [
            'vendorDues' => $vendorDues,
            'grandTotal' => $grandTotalDue,
            'grandTotalAdvance' => $totalAdvanceAmount
        ]);
    }

    public function daybook(Request $request)
    {
        $date = $request->input('date', \Carbon\Carbon::today()->toDateString());
        $parsedDate = \Carbon\Carbon::parse($date);

        $accounts = \App\Models\Account::all();
        $accountSummary = [];

        $totalOpening = 0;
        $totalInflow = 0;
        $totalOutflow = 0;
        $totalClosing = 0;

        $transactionModel = \App\Models\Transaction::class;

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
                \App\Models\Advance::class => ['user'],
                \App\Models\ClientAdvance::class => ['client'],
                \App\Models\VendorPayment::class => ['vendor'],
                \App\Models\ProjectExpense::class => ['vendor', 'project'],
                \App\Models\Salary::class => ['user'],
                \App\Models\InvoicePayment::class => ['invoice.client'],
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
                    case 'ProjectExpense':
                        $trx->party_name = $trx->transactionable->payee_name ?: ($trx->transactionable->vendor->name ?? 'General Payee');
                        $trx->party_type = $trx->transactionable->vendor_id ? 'Vendor' : 'Payee';
                        $trx->context_label = 'Project / Office Expense';
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
                    default:
                        $trx->context_label = $type;
                        break;
                }
            }
            return $trx;
        });

        $inflows = $transactions->where('type', 'credit')->values();
        $outflows = $transactions->where('type', 'debit')->values();

        $totalMarketReceivable = \Illuminate\Support\Facades\DB::table('invoices')->whereNull('deleted_at')->sum('grand_total')
                                 - \Illuminate\Support\Facades\DB::table('invoice_payments')->sum('amount');
        $totalMarketPayable = \Illuminate\Support\Facades\DB::table('project_expenses')->sum('due_amount');

        return \Inertia\Inertia::render('Admin/Reports/Daybook', [
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
}
