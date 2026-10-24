<?php

namespace App\Http\Controllers;

use App\Models\{Account, Invoice, ProjectExpense, Expense, Investment, EmployeeProfile, Attendance, Project, Client, Task, Leave, Requisition, Notice, Transaction, Salary, Vendor, ClientAdvance, AdvanceBalance, VendorPayment, Asset};
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $currentMonth = now()->month;
        $currentYear = now()->year;

        // 1. Valid Invoices Only
        $validInvoiceIds = DB::table('invoices')->whereNull('deleted_at')->pluck('id')->toArray();

        // 2. Market Dues & Advances
        $totalInvoiced = Invoice::whereIn('id', $validInvoiceIds)->whereNull('deleted_at')->sum('grand_total');
        $totalPaid = DB::table('invoice_payments')->whereIn('invoice_id', $validInvoiceIds)->sum('amount')
            + Invoice::whereIn('id', $validInvoiceIds)->whereNull('deleted_at')->sum('advance_used');
        $clientAdvance = max((float) ClientAdvance::sum('amount') - (float) ClientAdvance::sum('used_amount'), 0);

        $clientBalances = Client::query()
            ->addSelect([
                'inv_total' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(grand_total), 0)'),
                'payment_sum' => DB::table('invoice_payments')->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')->whereColumn('invoices.client_id', 'clients.id')->whereNull('invoices.deleted_at')->selectRaw('COALESCE(SUM(invoice_payments.amount), 0)'),
                'legacy_advance_sum' => DB::table('invoices')->whereColumn('client_id', 'clients.id')->whereNull('deleted_at')->selectRaw('COALESCE(SUM(advance_used), 0)'),
                'adv_bal' => DB::table('client_advances')->whereColumn('client_id', 'clients.id')->selectRaw('COALESCE(SUM(amount - used_amount), 0)'),
            ])->get();

        $totalClientDue = $clientBalances->sum(function ($client) {
            $paid = (float) $client->payment_sum + (float) $client->legacy_advance_sum;
            return max((float) $client->inv_total - $paid, 0);
        });
        $netClientDue = $clientBalances->sum(function ($c) {
                $paid = (float) $c->payment_sum + (float) $c->legacy_advance_sum;
                $due = max((float) $c->inv_total - $paid, 0);
                $adv = max((float) $c->adv_bal, 0);
                return max($due - $adv, 0);
            });

        $employeeAdvance = max((float) AdvanceBalance::selectRaw('COALESCE(SUM(total_given - total_used - total_returned), 0) as balance')->value('balance'), 0);
        $vendorAdvance = Vendor::sum('wallet_balance');
        $totalAssets = Asset::sum('purchase_price');

        $vendorDue = ProjectExpense::sum('due_amount') + Vendor::sum('opening_balance');
        $vendorPaid = ProjectExpense::sum('paid_amount');

        $actualInvestmentBalance = Investment::withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->sum(fn($investment) => max((float) $investment->amount - (float) ($investment->returned_principal ?? 0), 0));

        $unpaidSalaries = Salary::whereIn('status', ['unpaid', 'partially_paid'])->sum('due_amount');

        // 3. Receivables & Market Payables (Vendors and Market Liabilities)
        // Keep gross invoice receivables here; unused client advances are already a separate payable.
        $totalReceivables = $totalClientDue + $employeeAdvance + $vendorAdvance;
        $totalPayables = $vendorDue + $clientAdvance + $unpaidSalaries;

        // 4. Monthly Operational Data
        $monthlyRevenue = Invoice::whereIn('id', $validInvoiceIds)
            ->whereMonth('invoice_date', $currentMonth)
            ->whereYear('invoice_date', $currentYear)
            ->whereNull('deleted_at')
            ->sum('grand_total');

        $monthlySalaryPaid = (float) Transaction::where('transactionable_type', Salary::class)->where('type', 'debit')
            ->whereMonth('transaction_date', $currentMonth)
            ->whereYear('transaction_date', $currentYear)
            ->selectRaw('COALESCE(SUM(amount - COALESCE(bank_charge, 0)), 0) total')->value('total');


        $monthlyOfficeExpenses = (float) Expense::office()->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('amount');

        $monthlySampleExpenses = (float) Expense::sample()->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('amount');

        $monthlyExpenses = $monthlyOfficeExpenses + $monthlySampleExpenses;

        $monthlyProjectCostPaid = (float) Transaction::whereIn('transactionable_type', [ProjectExpense::class, VendorPayment::class])->whereMonth('transaction_date', $currentMonth)->whereYear('transaction_date', $currentYear)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount - COALESCE(bank_charge, 0) ELSE -amount + COALESCE(bank_charge, 0) END), 0) total")->value('total');

        $monthlyCashIn = (float) Transaction::where('type', 'credit')
            ->whereMonth('transaction_date', $currentMonth)
            ->whereYear('transaction_date', $currentYear)
            ->sum('amount');

        $monthlyCashOut = (float) Transaction::where('type', 'debit')
            ->whereMonth('transaction_date', $currentMonth)
            ->whereYear('transaction_date', $currentYear)
            ->sum('amount');

        $totalAccountBalance = Account::where('is_active', true)->sum('current_balance');
        $availableBalance = $totalAccountBalance;

        $totalCompanyAssets = $totalAccountBalance + $totalAssets + $totalReceivables;
        $overallNetWorth = $totalCompanyAssets - $totalPayables;

        $stats = [
            'overallNetWorth' => $overallNetWorth,
            'netWorthAfterInvestment' => $overallNetWorth - $actualInvestmentBalance,

            // 🟢 NEW: Revenue Data passed to frontend
            'totalBilledRevenue' => $totalInvoiced, // Billed revenue including dues
            'totalCollectedRevenue' => $totalPaid,  // Collected revenue excluding dues

            'totalReceivables' => $totalReceivables,
            'totalPayables' => $totalPayables,
            'totalClientDue' => $totalClientDue,
            'netClientDue' => $netClientDue,

            'totalBalance' => $totalAccountBalance,
            'cashBalance' => Account::where('type', 'cash')->where('is_active', true)->sum('current_balance'),
            'bankBalance' => Account::whereIn('type', ['bank', 'mobile_banking'])->where('is_active', true)->sum('current_balance'),

            'clientAdvance' => $clientAdvance,
            'availableBalance' => $availableBalance,
            'employeeAdvance' => $employeeAdvance,
            'vendorAdvance' => $vendorAdvance,
            'totalAssets' => $totalAssets,
            'totalInvestment' => $actualInvestmentBalance,

            'vendorPaid' => $vendorPaid,
            'vendorDue' => $vendorDue,

            'monthlyCashIn' => $monthlyCashIn,
            'monthlyCashOut' => $monthlyCashOut,
            'monthlyProjectExpense' => $monthlyProjectCostPaid,

            'totalProjectDue' => ProjectExpense::sum('due_amount'),

            'monthlyRevenue' => $monthlyRevenue,
            'monthlyExpensesOnly' => $monthlyExpenses,
            'monthlyOfficeExpenses' => $monthlyOfficeExpenses,
            'monthlySampleExpenses' => $monthlySampleExpenses,
            'totalSampleCount' => Expense::sample()->count(),
            'pendingSampleCount' => Expense::sample()->whereIn('sample_status', ['pending', 'in_progress'])->count(),
            'monthlySalaryPaid' => $monthlySalaryPaid,
            'unpaidSalaries' => $unpaidSalaries,

            'totalEmployees' => EmployeeProfile::count(),
            'presentToday' => Attendance::whereDate('date', today())->where('status', 'present')->count(),
            'activeProjects' => Project::where('status', 'in_progress')->count(),
            'totalClients' => Client::count(),
            'unpaidInvoices' => Invoice::whereIn('id', $validInvoiceIds)->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->count(),
            'pendingTasks' => Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'pendingLeaves' => Leave::where('status', 'pending')->count(),
            'pendingRequisitions' => Requisition::where('status', 'pending')->count(),
        ];

        $recentPendingInvoices = Invoice::with(['client:id,name,company_name', 'items.project:id,title'])
            ->withSum('payments', 'amount')
            ->whereIn('id', $validInvoiceIds)
            ->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])
            ->latest('due_date')
            ->take(6)
            ->get()
            ->map(function ($invoice) {
                $paid = ($invoice->payments_sum_amount ?? 0) + (float) ($invoice->getRawOriginal('advance_used') ?? 0);
                $invoice->due_amount = max($invoice->grand_total - $paid, 0);

                $projectNames = collect($invoice->items)->map(function ($item) {
                    return $item->project ? $item->project->title : $item->item_name;
                })->filter()->implode(', ');

                $invoice->work_details = $projectNames ?: 'General Billing';
                return $invoice;
            });

        // 5. Live Accounts List
        $accountsList = Account::where('is_active', true)
            ->orderByDesc('current_balance')
            ->get(['id', 'name', 'type', 'account_number', 'current_balance']);

        // 6. Today's Cashflow Pulse
        $todayStr = Carbon::today()->toDateString();
        $todayCashIn = (float) Transaction::whereDate('transaction_date', $todayStr)->where('type', 'credit')->sum('amount');
        $todayCashOut = (float) Transaction::whereDate('transaction_date', $todayStr)->where('type', 'debit')->sum('amount');
        $todayTrxCount = (int) Transaction::whereDate('transaction_date', $todayStr)->count();

        $todayStats = [
            'cash_in' => $todayCashIn,
            'cash_out' => $todayCashOut,
            'net_flow' => $todayCashIn - $todayCashOut,
            'trx_count' => $todayTrxCount,
        ];

        // 7. 6-Month Cashflow Trend
        $sixMonthTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $mDate = Carbon::now()->subMonths($i);
            $mStart = $mDate->copy()->startOfMonth()->toDateString();
            $mEnd = $mDate->copy()->endOfMonth()->toDateString();

            $mRow = Transaction::whereBetween('transaction_date', [$mStart, $mEnd])
                ->selectRaw("COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as cash_in, COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as cash_out")
                ->first();

            $sixMonthTrend[] = [
                'label' => $mDate->format('M Y'),
                'short_label' => $mDate->format('M'),
                'cash_in' => (float) ($mRow->cash_in ?? 0),
                'cash_out' => (float) ($mRow->cash_out ?? 0),
            ];
        }

        // 8. Top Vendor Dues
        $topVendorDues = Vendor::select('id', 'name', 'company_name', 'phone', 'wallet_balance', 'opening_balance')
            ->withSum('projectExpenses as project_due', 'due_amount')
            ->get()
            ->map(function ($v) {
                $v->total_due = max((float) $v->opening_balance + (float) ($v->project_due ?? 0), 0);
                return $v;
            })
            ->filter(fn($v) => $v->total_due > 0)
            ->sortByDesc('total_due')
            ->take(6)
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'accountsList' => $accountsList,
            'todayStats' => $todayStats,
            'sixMonthTrend' => $sixMonthTrend,
            'topVendorDues' => $topVendorDues,
            'recentPendingInvoices' => $recentPendingInvoices,
            'recentNotices' => Notice::where('is_active', true)->latest()->take(4)->get(),
            'recentTasks' => Task::whereIn('status', ['todo', 'in_progress'])->latest()->take(5)->get(),
            'recentTransactions' => Transaction::with('account:id,name')->latest('transaction_date')->latest('id')->take(6)->get(),
        ]);
    }
}
