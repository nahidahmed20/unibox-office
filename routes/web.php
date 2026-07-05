<?php

use App\Http\Controllers\AdvanceController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DesignationController;
use App\Http\Controllers\EmployeeProfileController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\NoticeController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectExpenseController;
use App\Http\Controllers\RequisitionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard', [
        'stats' => [
            'totalEmployees' => \App\Models\EmployeeProfile::count(),
            'presentToday' => \App\Models\Attendance::whereDate('date', today())->where('status', 'present')->count(),
            'activeProjects' => \App\Models\Project::where('status', 'in_progress')->count(),
            'pendingTasks' => \App\Models\Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'unpaidInvoices' => \App\Models\Invoice::whereIn('status', ['unpaid', 'overdue'])->count(),
            'totalRevenue' => \App\Models\Invoice::where('status', 'paid')->sum('grand_total'),
            'monthlyExpenses' => \App\Models\Expense::whereMonth('date', now()->month)->sum('amount'),
            'pendingLeaves' => \App\Models\Leave::where('status', 'pending')->count(),
            'pendingRequisitions' => \App\Models\Requisition::where('status', 'pending')->count(),
            
            'totalInvestment' => \App\Models\Investment::sum('amount'), 
            'totalClients' => \App\Models\Client::count(),
        ],
        'recentNotices' => \App\Models\Notice::where('is_active', true)->latest()->take(3)->get(),
        'recentTasks' => \App\Models\Task::whereIn('status', ['todo', 'in_progress'])->latest()->take(4)->get(),
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Access Control Routes
    Route::resource('permissions', PermissionController::class)->names('admin.permissions');
    Route::resource('roles', RoleController::class)->names('admin.roles');
    Route::resource('users', UserController::class)->names('admin.users');
    Route::get('admin/users/export/excel', [UserController::class, 'exportExcel'])->name('admin.users.export.excel');

    // 1. CRM & Projects
    Route::resource('clients', ClientController::class)->names('admin.clients');
    Route::resource('projects', ProjectController::class)->names('admin.projects');
    Route::resource('tasks', TaskController::class)->names('admin.tasks');

    // 2. Finance & Accounts
    Route::resource('invoices', InvoiceController::class)->names('admin.invoices');
    Route::resource('expenses', ExpenseController::class)->names('admin.expenses');
    Route::resource('project-expenses', ProjectExpenseController::class)->names('admin.project-expenses');
    Route::resource('expense-categories', ExpenseCategoryController::class)->names('admin.expense-categories');

    Route::resource('investments', InvestmentController::class)->names('admin.investments');
    Route::resource('advances', AdvanceController::class)->names('admin.advances');

    // web.php
    Route::get('/admin/invoices/{id}/print', [InvoiceController::class, 'print'])->name('admin.invoices.print');

    // 3. Office Administration
    Route::resource('assets', AssetController::class)->names('admin.assets');
    Route::resource('requisitions', RequisitionController::class)->names('admin.requisitions');
    Route::resource('notices', NoticeController::class)->names('admin.notices');

    Route::resource('departments', DepartmentController::class)->names('admin.departments');
    Route::resource('designations', DesignationController::class)->names('admin.designations');
    Route::resource('employees', EmployeeProfileController::class)->names('admin.employees');
    Route::resource('attendances', AttendanceController::class)->names('admin.attendances');
    Route::resource('salaries', SalaryController::class)->names('admin.salaries');
    Route::resource('leaves', LeaveController::class)->names('admin.leaves');

});

require __DIR__.'/auth.php';