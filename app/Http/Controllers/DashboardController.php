<?php

namespace App\Http\Controllers;

use App\Models\{Account, Invoice, InvoicePayment, ProjectExpense, Expense, Investment, EmployeeProfile, Attendance, Project, Client, Task, Leave, Requisition, Notice, Transaction};
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $totalInvoiced = Invoice::sum('grand_total');
        $totalPaid = InvoicePayment::sum('amount');
        $totalClientDue = $totalInvoiced - $totalPaid;

        $stats = [
            'totalBalance' => Account::where('is_active', true)->sum('current_balance'),
            'cashBalance' => Account::where('type', 'cash')->where('is_active', true)->sum('current_balance'),
            'bankBalance' => Account::whereIn('type', ['bank', 'mobile_banking'])->where('is_active', true)->sum('current_balance'),
            'totalClientDue' => $totalClientDue > 0 ? $totalClientDue : 0,
            'totalProjectDue' => ProjectExpense::sum('due_amount'),
            'totalRevenue' => Invoice::where('status', 'paid')->sum('grand_total'),
            'monthlyRevenue' => Invoice::where('status', 'paid')->whereMonth('created_at', now()->month)->sum('grand_total'),
            'monthlyExpenses' => Expense::whereMonth('date', now()->month)->sum('amount'),
            'totalInvestment' => Investment::sum('amount'),
            'totalEmployees' => EmployeeProfile::count(),
            'presentToday' => Attendance::whereDate('date', today())->where('status', 'present')->count(),
            'activeProjects' => Project::where('status', 'in_progress')->count(),
            'totalClients' => Client::count(),
            'unpaidInvoices' => Invoice::whereIn('status', ['unpaid', 'overdue'])->count(),
            'pendingTasks' => Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'pendingLeaves' => Leave::where('status', 'pending')->count(),
            'pendingRequisitions' => Requisition::where('status', 'pending')->count(),
        ];

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'recentNotices' => Notice::where('is_active', true)->latest()->take(3)->get(),
            'recentTasks' => Task::whereIn('status', ['todo', 'in_progress'])->latest()->take(4)->get(),
            'recentTransactions' => Transaction::with('account')->latest('transaction_date')->latest('id')->take(5)->get(),
        ]);
    }
}