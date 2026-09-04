<?php

namespace App\Http\Controllers;

use App\Models\{Account, Invoice, InvoicePayment, ProjectExpense, Expense, Investment, InvestmentPayment, EmployeeProfile, Attendance, Project, Client, Task, Leave, Requisition, Notice, Transaction, Salary, Vendor, ClientAdvance, Advance, VendorPayment, Asset};
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $currentMonth = now()->month;
        $currentYear = now()->year;

        // ==========================================
        // 1. TOTAL COMPANY FUNDS (কোম্পানির মোট নিজস্ব টাকা)
        // ==========================================
        $cashBalance = Account::where('type', 'cash')->where('is_active', true)->sum('current_balance');
        $bankBalance = Account::whereIn('type', ['bank', 'mobile_banking'])->where('is_active', true)->sum('current_balance');
        $totalAccountBalance = $cashBalance + $bankBalance;

        // স্টাফদের কাছে পড়ে থাকা অ্যাডভান্স (সম্পদ)
        $employeeAdvance = Advance::where('status', 'unsettled')->get()->sum(function ($adv) {
            return max((float) $adv->amount - (float) $adv->settled_amount - (float) $adv->returned_amount, 0);
        });

        // ভেন্ডরদের ওয়ালেটে থাকা অ্যাডভান্স (সম্পদ)
        $vendorAdvance = Vendor::sum('wallet_balance');

        // কোম্পানির গ্র্যান্ড টোটাল ক্যাশ ফান্ড
        $totalCompanyFunds = $totalAccountBalance + $employeeAdvance + $vendorAdvance;


        // ==========================================
        // 2. MONTHLY PERFORMANCE (STRICTLY CASH FLOW BASIS)
        // ==========================================

        // --- Income (Cash In - Payment Date অনুযায়ী) ---
        $monthlyInvoiceIncome = InvoicePayment::whereMonth('payment_date', $currentMonth)
            ->whereYear('payment_date', $currentYear)
            ->sum('amount');

        $monthlyClientAdvance = ClientAdvance::whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('amount');

        $monthlyTotalIncome = $monthlyInvoiceIncome + $monthlyClientAdvance;

        // --- Expenses (Cash Out - Payment Date অনুযায়ী) ---
        $monthlyGeneralExpense = Expense::whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('amount');

        $monthlySalaryPaid = Salary::where('status', 'paid')
            ->whereMonth('payment_date', $currentMonth)
            ->whereYear('payment_date', $currentYear)
            ->sum('net_pay');

        // 🟢 FIXED: Project Expenses (Only actual cash paid this month)
        $directProjectPaid = ProjectExpense::whereNotNull('account_id')
            ->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('paid_amount');

        $vendorBillPaid = VendorPayment::whereNotNull('account_id')
            ->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->sum('pay_amount');

        $monthlyProjectCostPaid = $directProjectPaid + $vendorBillPaid;

        $monthlyTotalExpense = $monthlyGeneralExpense + $monthlySalaryPaid + $monthlyProjectCostPaid;

        // --- Net Cash Flow (মান্থলি লাভ/ক্ষতি) ---
        $monthlyNetProfit = $monthlyTotalIncome - $monthlyTotalExpense;


        // ==========================================
        // 3. RECEIVABLES & PAYABLES (পাওনা ও দেনা)
        // ==========================================
        $totalInvoiced = Invoice::sum('grand_total');
        $totalPaid = InvoicePayment::sum('amount');
        $totalClientDue = max($totalInvoiced - $totalPaid, 0);

        $vendorDue = ProjectExpense::whereNotNull('vendor_id')->sum('due_amount');

        $clientAdvanceLiability = ClientAdvance::sum('amount') - ClientAdvance::sum('used_amount');


        // ==========================================
        // 4. OTHER ASSETS & INVESTMENTS
        // ==========================================
        $totalAssets = DB::table('assets')->sum('purchase_price');
        $actualInvestmentBalance = Investment::withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->sum(fn ($investment) => max((float) $investment->amount - (float) ($investment->returned_principal ?? 0), 0));

        $unpaidSalaries = Salary::where('status', 'unpaid')->sum('net_pay');


        // Prepare stats array
        $stats = [
            // Fund Balances
            'totalCompanyFunds' => $totalCompanyFunds,
            'totalAccountBalance' => $totalAccountBalance,
            'cashBalance' => $cashBalance,
            'bankBalance' => $bankBalance,
            'employeeAdvance' => $employeeAdvance,
            'vendorAdvance' => $vendorAdvance,

            // Monthly Review (Cash Flow)
            'monthlyTotalIncome' => $monthlyTotalIncome,
            'monthlyInvoiceIncome' => $monthlyInvoiceIncome,
            'monthlyClientAdvance' => $monthlyClientAdvance,

            'monthlyTotalExpense' => $monthlyTotalExpense,
            'monthlyGeneralExpense' => $monthlyGeneralExpense,
            'monthlySalaryPaid' => $monthlySalaryPaid,
            'monthlyProjectExpense' => $monthlyProjectCostPaid, // Passing Cash Out value

            'monthlyNetProfit' => $monthlyNetProfit,

            // Dues & Liabilities
            'totalClientDue' => $totalClientDue,
            'vendorDue' => $vendorDue,
            'clientAdvanceLiability' => max($clientAdvanceLiability, 0),
            'unpaidSalaries' => $unpaidSalaries,

            // Assets & Investments
            'totalAssets' => $totalAssets,
            'totalInvestment' => $actualInvestmentBalance,

            // Operational Stats
            'monthlyRevenue' => Invoice::whereMonth('invoice_date', $currentMonth)->whereYear('invoice_date', $currentYear)->sum('grand_total'), // Billed this month
            'totalEmployees' => EmployeeProfile::count(),
            'presentToday' => Attendance::whereDate('date', today())->where('status', 'present')->count(),
            'activeProjects' => Project::where('status', 'in_progress')->count(),
            'totalClients' => Client::count(),
            'unpaidInvoices' => Invoice::whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->count(),
            'pendingTasks' => Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'pendingLeaves' => Leave::where('status', 'pending')->count(),
            'pendingRequisitions' => Requisition::where('status', 'pending')->count(),
        ];

        // Recent Pending Invoices
        $recentPendingInvoices = Invoice::with(['client:id,name,company_name', 'items.project:id,title'])
            ->withSum('payments', 'amount')
            ->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])
            ->latest('due_date')
            ->take(6)
            ->get()
            ->map(function ($invoice) {
                $paid = $invoice->payments_sum_amount ?? 0;
                $invoice->due_amount = max($invoice->grand_total - $paid, 0);

                $projectNames = collect($invoice->items)->map(function($item) {
                    return $item->project ? $item->project->title : $item->item_name;
                });

                $invoice->work_details = $projectNames->filter()->implode(', ') ?: 'General Billing';
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
