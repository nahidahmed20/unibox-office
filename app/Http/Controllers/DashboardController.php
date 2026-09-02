<?php

namespace App\Http\Controllers;

use App\Models\{Account, Invoice, InvoicePayment, ProjectExpense, Expense, Investment, EmployeeProfile, Attendance, Project, Client, Task, Leave, Requisition, Notice, Transaction, Salary, Vendor}; // 🟢 Vendor Model Add kora hoyeche
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $totalInvoiced = Invoice::sum('grand_total');
        $totalPaid = InvoicePayment::sum('amount');
        $totalClientDue = max($totalInvoiced - $totalPaid, 0);

        // Salaries Data
        $monthlySalaryPaid = Salary::where('status', 'paid')
            ->whereMonth('payment_date', now()->month)
            ->whereYear('payment_date', now()->year)
            ->sum('net_pay');

        $unpaidSalaries = Salary::where('status', 'unpaid')->sum('net_pay');

        // General Expenses Data
        $monthlyExpenses = Expense::whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->sum('amount');

        // Advances & Assets Data
        $clientAdvance = DB::table('client_advances')->selectRaw('COALESCE(SUM(amount - used_amount), 0) as balance')->value('balance');
        $employeeAdvance = DB::table('advances')->selectRaw('COALESCE(SUM(amount - settled_amount - returned_amount), 0) as balance')->value('balance');
        $totalAssets = DB::table('assets')->sum('purchase_price');

        // 🟢 FIXED: Vendor Advance (Vendor Wallet Balance)
        $vendorAdvance = Vendor::sum('wallet_balance');

        // 🟢 FIXED: Total Investment (Total In - Total Returned)
        $actualInvestmentBalance = Investment::withSum('payments as returned_principal', 'principal_amount')
            ->get()
            ->sum(fn ($investment) => max(
                (float) $investment->amount - (float) ($investment->returned_principal ?? 0),
                0
            ));


        // Vendor & Project Expenses Data
        $vendorPaid = ProjectExpense::whereNotNull('vendor_id')->sum('paid_amount');
        $vendorDue = ProjectExpense::whereNotNull('vendor_id')->sum('due_amount');

        $monthlyProjectExpense = ProjectExpense::whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->sum('total_bill');

        // Available Balance Logic
        $totalAccountBalance = Account::where('is_active', true)->sum('current_balance');
        $availableBalance = $totalAccountBalance + $clientAdvance; // Cash/Bank + Client Advance

        $stats = [
            'totalBalance' => $totalAccountBalance,
            'cashBalance' => Account::where('type', 'cash')->where('is_active', true)->sum('current_balance'),
            'bankBalance' => Account::whereIn('type', ['bank', 'mobile_banking'])->where('is_active', true)->sum('current_balance'),

            // Stats Added to array
            'clientAdvance' => $clientAdvance,
            'availableBalance' => $availableBalance,
            'employeeAdvance' => $employeeAdvance,
            'vendorAdvance' => $vendorAdvance, // 🟢 Vendor Advance Added
            'totalAssets' => $totalAssets,
            'totalInvestment' => $actualInvestmentBalance, // 🟢 Actual Investment Added

            'vendorPaid' => $vendorPaid,
            'vendorDue' => $vendorDue,
            'monthlyProjectExpense' => $monthlyProjectExpense,

            'totalClientDue' => $totalClientDue,
            'totalProjectDue' => ProjectExpense::sum('due_amount'),
            'monthlyRevenue' => InvoicePayment::whereMonth('payment_date', now()->month)->whereYear('payment_date', now()->year)->sum('amount'),
            'monthlyExpensesOnly' => $monthlyExpenses,
            'monthlySalaryPaid' => $monthlySalaryPaid,
            'unpaidSalaries' => $unpaidSalaries,

            'totalEmployees' => EmployeeProfile::count(),
            'presentToday' => Attendance::whereDate('date', today())->where('status', 'present')->count(),
            'activeProjects' => Project::where('status', 'in_progress')->count(),
            'totalClients' => Client::count(),
            'unpaidInvoices' => Invoice::whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->count(),
            'pendingTasks' => Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'pendingLeaves' => Leave::where('status', 'pending')->count(),
            'pendingRequisitions' => Requisition::where('status', 'pending')->count(),
        ];

        // Pending Receivables
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
