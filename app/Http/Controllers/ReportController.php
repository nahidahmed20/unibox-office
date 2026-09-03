<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountTransaction;
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
use App\Models\VendorPayment;
use App\Models\Investment;
use App\Models\InvestmentPayment;
use App\Models\ClientAdvance;
use App\Models\Advance;
use App\Models\Asset;
use Carbon\Carbon;

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
            ])->get()->map(fn ($client) => [
                'name' => $client->name,
                'company' => $client->company_name,
                'invoiced' => (float) $client->invoiced,
                'paid' => (float) $client->paid + (float) $client->legacy_advance,
                'due' => max((float) $client->invoiced - (float) $client->paid - (float) $client->legacy_advance, 0),
            ])->filter(fn ($row) => $row['due'] > 0)->values();

        $staffAdvances = Advance::with('user:id,name')
            ->select('user_id', DB::raw('SUM(amount) total_given'), DB::raw('SUM(settled_amount) total_used'), DB::raw('SUM(returned_amount) total_returned'))
            ->groupBy('user_id')->get()->map(fn ($row) => [
            'name' => $row->user?->name ?? 'Unknown Staff',
            'given' => (float) $row->total_given,
            'used' => (float) $row->total_used,
            'returned' => (float) $row->total_returned,
            'balance' => max((float) $row->total_given - (float) $row->total_used - (float) $row->total_returned, 0),
        ])->filter(fn ($row) => $row['given'] > 0)->values();

        $summary = [
            'investment_gross' => $investmentGross,
            'investment_returned' => $investmentReturned,
            'investment_balance' => max($investmentGross - $investmentReturned, 0),
            'account_balance' => $accounts->sum('balance'),
            'client_advance' => $clientAdvances->sum('balance'),
            'vendor_advance' => $vendorPositions->sum('advance'),
            'client_due' => $clientDues->sum('due'),
            'vendor_due' => $vendorPositions->sum('due'),
            'asset_value' => (float) Asset::sum('purchase_price'),
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

        return Inertia::render('Admin/Reports/FinancialPosition', compact(
            'summary', 'accounts', 'clientAdvances', 'vendorPositions', 'clientDues', 'staffAdvances', 'alerts'
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
        }

        $clientIds = array_filter(array_column($clientsMap, 'client_id'));
        $overallTotalBilled = 0;
        $overallTotalPaid = 0;

        if (!empty($clientIds)) {
            $invoiceStats = DB::table('invoices')->whereIn('client_id', $clientIds)->whereNull('deleted_at')
                ->select('client_id', DB::raw('COUNT(id) as total_invoices'), DB::raw('SUM(grand_total) as total_billed'));
            $applyPeriod($invoiceStats, 'invoice_date');
            $invoiceStats = $invoiceStats->groupBy('client_id')->get()->keyBy('client_id');

            $paymentStats = DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                ->whereIn('invoices.client_id', $clientIds)->whereNull('invoices.deleted_at')
                ->select('invoices.client_id', DB::raw('SUM(invoice_payments.amount) as total_paid'));
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
            $overallTotalBilled = array_sum(array_column($clientsMap, 'total_billed'));
            $overallTotalPaid = array_sum(array_column($clientsMap, 'total_paid'));
        }

        $monthlyData = [];
        $overallTotalBudget = 0;
        $overallTotalProjectExpense = 0;

        foreach ($projectsData as $p) {
            $month = $p->start_date ? date('F Y', strtotime($p->start_date)) : 'No Date Provided';
            $sortKey = $p->start_date ? date('Y-m', strtotime($p->start_date)) : '0000-00';

            if (!isset($monthlyData[$month])) {
                $monthlyData[$month] = ['month' => $month, 'sort_key' => $sortKey, 'projects' => [], 'month_budget' => 0, 'month_expense' => 0, 'month_profit' => 0];
            }
            $monthlyData[$month]['projects'][] = ['title' => $p->title, 'client' => $p->client_name, 'budget' => (float)$p->budget, 'expense' => (float)$p->total_expense, 'profit' => (float)$p->budget - (float)$p->total_expense, 'status' => $p->status];
            $monthlyData[$month]['month_budget'] += (float)$p->budget;
            $monthlyData[$month]['month_expense'] += (float)$p->total_expense;
            $monthlyData[$month]['month_profit'] += ((float)$p->budget - (float)$p->total_expense);

            $overallTotalBudget += (float)$p->budget;
            $overallTotalProjectExpense += (float)$p->total_expense;
        }

        usort($monthlyData, function($a, $b) { return strcmp($b['sort_key'], $a['sort_key']); });

        // 🟢 NEW: Get Salaries and General Expenses for true Net Profit
        $expenseQuery = DB::table('expenses');
        $revenueQuery = DB::table('invoices')->whereNull('deleted_at');
        $receivedQuery = DB::table('invoice_payments');
        $projectCostQuery = DB::table('project_expenses');
        $financeCostQuery = DB::table('investment_payments');
        $applyPeriod($expenseQuery, 'date');
        $applyPeriod($revenueQuery, 'invoice_date');
        $applyPeriod($receivedQuery, 'payment_date');
        $applyPeriod($projectCostQuery, 'date');
        $applyPeriod($financeCostQuery, 'payment_date');

        $overallTotalBilled = (float) $revenueQuery->sum('grand_total');
        $overallTotalPaid = (float) $receivedQuery->sum('amount');
        $overallTotalProjectExpense = (float) $projectCostQuery->sum('total_bill');
        // Salary is an expense in the month it is earned, even when some or all of
        // it remains unpaid. Payments affect cash and salary due, not profit twice.
        $salaryMonth = function ($salary) {
            $value = trim((string) ($salary->month_year ?? ''));
            if (preg_match('/^(0?[1-9]|1[0-2])[-\/]([0-9]{4})$/', $value, $match)) {
                return Carbon::create((int) $match[2], (int) $match[1], 1)->startOfMonth();
            }
            if (preg_match('/^([0-9]{4})[-\/](0?[1-9]|1[0-2])$/', $value, $match)) {
                return Carbon::create((int) $match[1], (int) $match[2], 1)->startOfMonth();
            }
            $fallback = $salary->payment_date ?? $salary->created_at ?? null;
            if (preg_match('/^(0?[1-9]|1[0-2])$/', $value, $match) && $fallback) {
                return Carbon::create((int) Carbon::parse($fallback)->year, (int) $match[1], 1)->startOfMonth();
            }
            if (preg_match('/^([A-Za-z]+)[-\/]([0-9]{2}|[0-9]{4})$/', $value, $match)) {
                try {
                    $format = strlen($match[2]) === 2 ? '!F-y' : '!F-Y';
                    return Carbon::createFromFormat($format, $match[1] . '-' . $match[2])->startOfMonth();
                } catch (\Throwable $exception) {
                    // Continue to the reliable record-date fallback below.
                }
            }
            return $fallback ? Carbon::parse($fallback)->startOfMonth() : null;
        };

        $salaryRows = DB::table('salaries')->get(['month_year', 'net_pay', 'payment_date', 'created_at'])->filter(function ($salary) use ($request, $salaryMonth) {
            $monthDate = $salaryMonth($salary);
            if (!$monthDate) return false;
            if ($request->filled('month')) return $monthDate->format('Y-m') === $request->month;
            if ($request->filled('year') && !$request->filled('start_date') && !$request->filled('end_date')) return (int) $monthDate->year === (int) $request->year;
            if ($request->filled('start_date') && $monthDate->copy()->endOfMonth()->lt(Carbon::parse($request->start_date))) return false;
            if ($request->filled('end_date') && $monthDate->gt(Carbon::parse($request->end_date))) return false;
            return true;
        });
        $totalSalaryPaid = (float) $salaryRows->sum('net_pay');
        $totalOfficeExpense = (float) $expenseQuery->sum('amount');
        $totalFinanceCost = (float) $financeCostQuery->sum('profit_amount');

        // 🟢 True Net Profit Calculation: (Total Billed/Revenue) - (Project Costs + Salary + Office Expenses)
        $trueNetProfit = $overallTotalBilled - ($overallTotalProjectExpense + $totalSalaryPaid + $totalOfficeExpense + $totalFinanceCost);

        $monthlyProfitLoss = collect();
        $addMonthly = function ($rows, string $dateColumn, string $amountColumn, string $bucket) use (&$monthlyProfitLoss) {
            foreach ($rows as $row) {
                $key = Carbon::parse($row->{$dateColumn})->format('Y-m');
                if (!$monthlyProfitLoss->has($key)) {
                    $monthlyProfitLoss->put($key, ['key' => $key, 'month' => Carbon::parse($row->{$dateColumn})->format('F Y'), 'revenue' => 0, 'received' => 0, 'project_cost' => 0, 'office_expense' => 0, 'salary_expense' => 0, 'finance_cost' => 0]);
                }
                $item = $monthlyProfitLoss->get($key);
                $item[$bucket] += (float) $row->{$amountColumn};
                $monthlyProfitLoss->put($key, $item);
            }
        };
        $addMonthly((clone $revenueQuery)->get(['invoice_date', 'grand_total']), 'invoice_date', 'grand_total', 'revenue');
        $addMonthly((clone $receivedQuery)->get(['payment_date', 'amount']), 'payment_date', 'amount', 'received');
        $addMonthly((clone $projectCostQuery)->get(['date', 'total_bill']), 'date', 'total_bill', 'project_cost');
        $addMonthly((clone $expenseQuery)->get(['date', 'amount']), 'date', 'amount', 'office_expense');
        $addMonthly((clone $financeCostQuery)->get(['payment_date', 'profit_amount']), 'payment_date', 'profit_amount', 'finance_cost');
        foreach ($salaryRows as $salary) {
            $date = $salaryMonth($salary);
            if ($date) $addMonthly([(object) ['date' => $date->toDateString(), 'amount' => $salary->net_pay]], 'date', 'amount', 'salary_expense');
        }
        $monthlyProfitLoss = $monthlyProfitLoss->map(function ($row) {
            $row['total_expense'] = $row['project_cost'] + $row['office_expense'] + $row['salary_expense'] + $row['finance_cost'];
            $row['profit_loss'] = $row['revenue'] - $row['total_expense'];
            return $row;
        })->sortByDesc('key')->values();

        $summary = [
            'total_revenue' => $overallTotalBilled, // Gross Revenue
            'total_received' => $overallTotalPaid,
            'total_project_cost' => $overallTotalProjectExpense,
            'total_salary_expense' => $totalSalaryPaid,
            'total_office_expense' => $totalOfficeExpense,
            'total_finance_cost' => $totalFinanceCost,
            'gross_profit' => $overallTotalBilled - $overallTotalProjectExpense,
            'net_profit' => $trueNetProfit,
            'account_balance' => (float) DB::table('accounts')->where('is_active', true)->sum('current_balance'),
            'client_due' => max((float) DB::table('invoices')->whereNull('deleted_at')->sum('grand_total') - (float) DB::table('invoice_payments')->sum('amount') - (float) DB::table('invoices')->whereNull('deleted_at')->sum('advance_used'), 0),
            'vendor_due' => (float) DB::table('project_expenses')->sum('due_amount'),
            'client_advance' => (float) DB::table('client_advances')->selectRaw('COALESCE(SUM(amount - used_amount), 0) balance')->value('balance'),
            'vendor_advance' => (float) DB::table('vendors')->sum('wallet_balance'),
            'staff_advance' => max((float) DB::table('advances')->selectRaw('COALESCE(SUM(amount - settled_amount - returned_amount), 0) balance')->value('balance'), 0),
            'salary_due' => (float) DB::table('salaries')->sum('due_amount'),
        ];

        return Inertia::render('Admin/Reports/FinancialReports', [
            'clientsReport' => array_values($clientsMap),
            'monthlyReport' => $monthlyData,
            'monthlyProfitLoss' => $monthlyProfitLoss,
            'summary' => $summary,
            'filters' => $request->only(['start_date', 'end_date', 'year', 'month'])
        ]);
    }

    public function transactionsReport(Request $request)
    {
        $query = AccountTransaction::with('account:id,name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->filled('source_type')) {
            $query->where('source_type', $request->source_type);
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $perPage = $request->input('per_page', 25);
        if ($perPage === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        }

        $transactions = $query->latest()->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/TransactionsReport', [
            'transactions' => $transactions,
            'accounts'     => Account::select('id', 'name')->get(),
            'filters'      => $request->only('account_id', 'source_type', 'from', 'to', 'search', 'per_page'),
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
                        'debit' => (float) $invoice->grand_total, // ডিসকাউন্ট বাদে অরিজিনাল বিল
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
        // 🟢 Default to Today if no date is selected
        $date = $request->input('date', Carbon::today()->toDateString());
        $parsedDate = Carbon::parse($date);

        $accounts = Account::all();
        $accountSummary = [];

        $totalOpening = 0;
        $totalInflow = 0;
        $totalOutflow = 0;
        $totalClosing = 0;

        // 🟢 Calculate true Opening and Closing balances for the specific date
        foreach ($accounts as $acc) {
            // Inflows and Outflows AFTER the selected date
            $inflowsAfter = Transaction::where('account_id', $acc->id)
                ->whereDate('transaction_date', '>', $date)
                ->where('type', 'credit')->sum('amount');

            $outflowsAfter = Transaction::where('account_id', $acc->id)
                ->whereDate('transaction_date', '>', $date)
                ->where('type', 'debit')->sum('amount');

            // Closing balance at the end of the selected date
            $closingBalance = $acc->current_balance - $inflowsAfter + $outflowsAfter;

            // Inflows and Outflows exactly ON the selected date
            $inflowToday = Transaction::where('account_id', $acc->id)
                ->whereDate('transaction_date', $date)
                ->where('type', 'credit')->sum('amount');

            $outflowToday = Transaction::where('account_id', $acc->id)
                ->whereDate('transaction_date', $date)
                ->where('type', 'debit')->sum('amount');

            // Opening balance at the start of the selected date
            $openingBalance = $closingBalance - $inflowToday + $outflowToday;

            $accountSummary[] = [
                'id' => $acc->id,
                'name' => $acc->name,
                'type' => $acc->type,
                'opening' => $openingBalance,
                'inflow' => $inflowToday,
                'outflow' => $outflowToday,
                'closing' => $closingBalance,
            ];

            $totalOpening += $openingBalance;
            $totalInflow += $inflowToday;
            $totalOutflow += $outflowToday;
            $totalClosing += $closingBalance;
        }

        // 🟢 Detailed Outflow (Where money went today)
        $expenses = Expense::whereDate('date', $date)->get();
        $vendorPayments = VendorPayment::with('vendor')->whereDate('date', $date)->get();
        $salaries = Salary::with('user')->where('status', 'paid')->whereDate('payment_date', $date)->get();

        // 🟢 Detailed Inflow (Where money came from today)
        $invoicePayments = InvoicePayment::with('invoice.client')->whereDate('payment_date', $date)->get();

        // 🟢 All Raw Transactions for the day
        $transactions = Transaction::with('account')->whereDate('transaction_date', $date)->latest('id')->get();

        // 🟢 Current Market Snapshot (As of right now)
        $totalMarketReceivable = DB::table('invoices')->whereNull('deleted_at')->sum('grand_total')
                                 - DB::table('invoice_payments')->sum('amount');
        $totalMarketPayable = DB::table('project_expenses')->sum('due_amount');

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
                'expenses' => $expenses,
                'vendorPayments' => $vendorPayments,
                'salaries' => $salaries,
                'invoicePayments' => $invoicePayments,
                'transactions' => $transactions,
            ],
            'marketSnapshot' => [
                'receivable' => max($totalMarketReceivable, 0),
                'payable' => max($totalMarketPayable, 0),
            ]
        ]);
    }

}
