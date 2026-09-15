<?php

namespace App\Http\Controllers;

use App\Models\{Account, Invoice, InvoicePayment, ProjectExpense, Expense, Investment, InvestmentPayment, EmployeeProfile, Attendance, Project, Client, Task, Leave, Requisition, Notice, Transaction, Salary, Vendor, ClientAdvance, AdvanceBalance, VendorPayment, Asset};
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
        $totalPaid = InvoicePayment::whereIn('invoice_id', $validInvoiceIds)->sum('amount');
        $totalClientDue = max($totalInvoiced - $totalPaid, 0);

        $clientAdvance = max((float) ClientAdvance::sum('amount') - (float) ClientAdvance::sum('used_amount'), 0);
        $employeeAdvance = max((float) AdvanceBalance::selectRaw('COALESCE(SUM(total_given - total_used - total_returned), 0) as balance')->value('balance'), 0);
        $vendorAdvance = Vendor::sum('wallet_balance');
        $totalAssets = Asset::sum('purchase_price');

        $vendorDue = ProjectExpense::sum('due_amount') + Vendor::sum('opening_balance');
        $vendorPaid = ProjectExpense::sum('paid_amount');

        $actualInvestmentBalance = Investment::withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->sum(fn ($investment) => max((float) $investment->amount - (float) ($investment->returned_principal ?? 0), 0));

        // 3. Receivables & Payables
        $totalReceivables = $totalClientDue + $employeeAdvance + $vendorAdvance;
        $totalPayables = $vendorDue + $clientAdvance + $actualInvestmentBalance;

        // 4. Monthly Operational Data
        $monthlyRevenue = Invoice::whereIn('id', $validInvoiceIds)
            ->whereMonth('invoice_date', $currentMonth)
            ->whereYear('invoice_date', $currentYear)
            ->whereNull('deleted_at')
            ->sum('grand_total');

        $monthlySalaryPaid = Transaction::where('transactionable_type', Salary::class)->where('type', 'debit')
            ->whereMonth('transaction_date', $currentMonth)
            ->whereYear('transaction_date', $currentYear)
            ->selectRaw('COALESCE(SUM(amount - bank_charge), 0) total')->value('total');

        $unpaidSalaries = Salary::whereIn('status', ['unpaid', 'partially_paid'])->sum('due_amount');


        $totalPayables += $unpaidSalaries;

        $monthlyExpenses = Expense::whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('amount');

        $monthlyProjectCostPaid = (float) Transaction::whereIn('transactionable_type', [ProjectExpense::class, VendorPayment::class])->whereMonth('transaction_date', $currentMonth)->whereYear('transaction_date', $currentYear)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount - bank_charge ELSE -amount + bank_charge END), 0) total")->value('total');

        $monthlyCashIn = InvoicePayment::whereNotNull('account_id')->whereIn('invoice_id', $validInvoiceIds)->whereMonth('payment_date', $currentMonth)->whereYear('payment_date', $currentYear)->sum('amount')
                       + ClientAdvance::whereMonth('date', $currentMonth)->whereYear('date', $currentYear)->sum('amount');

        $monthlyBankCharges = (float) Transaction::whereMonth('transaction_date', $currentMonth)->whereYear('transaction_date', $currentYear)->selectRaw("COALESCE(SUM(CASE WHEN type = 'debit' THEN bank_charge ELSE -bank_charge END), 0) total")->value('total');
        $officeCashPaid = (float) Transaction::where('transactionable_type', Expense::class)->where('type', 'debit')->whereMonth('transaction_date', $currentMonth)->whereYear('transaction_date', $currentYear)->selectRaw('COALESCE(SUM(amount - bank_charge), 0) total')->value('total');
        $monthlyFinanceCost = InvestmentPayment::whereMonth('payment_date', $currentMonth)->whereYear('payment_date', $currentYear)->sum('profit_amount');
        $monthlyCashOut = $monthlyProjectCostPaid + $officeCashPaid + $monthlySalaryPaid + $monthlyBankCharges + $monthlyFinanceCost;

        $totalAccountBalance = Account::where('is_active', true)->sum('current_balance');
        $availableBalance = $totalAccountBalance;

        $totalCompanyAssets = $totalAccountBalance + $totalAssets + $totalReceivables;
        $overallNetWorth = $totalCompanyAssets - $totalPayables;

        $stats = [
            'overallNetWorth' => $overallNetWorth,

            // 🟢 NEW: Revenue Data passed to frontend
            'totalBilledRevenue' => $totalInvoiced, // বকেয়া সহ ইনকাম
            'totalCollectedRevenue' => $totalPaid,  // বকেয়া বাদে ইনকাম

            'totalReceivables' => $totalReceivables,
            'totalPayables' => $totalPayables,
            'totalClientDue' => $totalClientDue,

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
                $paid = $invoice->payments_sum_amount ?? 0;
                $invoice->due_amount = max($invoice->grand_total - $paid, 0);

                $projectNames = collect($invoice->items)->map(function($item) {
                    return $item->project ? $item->project->title : $item->item_name;
                })->filter()->implode(', ');

                $invoice->work_details = $projectNames ?: 'General Billing';
                return $invoice;
            });

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'recentPendingInvoices' => $recentPendingInvoices,
            'recentNotices' => Notice::where('is_active', true)->latest()->take(4)->get(),
            'recentTasks' => Task::whereIn('status', ['todo', 'in_progress'])->latest()->take(5)->get(),
            'recentTransactions' => Transaction::with('account:id,name')->latest('transaction_date')->latest('id')->take(6)->get(),
        ]);
    }
}
