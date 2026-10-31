<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    /**
     * Each route is allowed when the user has at least one permission listed.
     * Super Admin is handled explicitly so this works independently of Gate setup.
     */
    private const RESOURCE_PERMISSIONS = [
        'admin.accounts' => [
            'view' => ['view_account', 'manage_accounts', 'view_finance'],
            'create' => ['create_account', 'manage_accounts'],
            'edit' => ['edit_account', 'manage_accounts'],
            'delete' => ['delete_account', 'manage_accounts'],
        ],
        'admin.advances' => [
            'view' => ['view_advance', 'view_client_advance', 'view_finance'],
            'create' => ['create_advance'], 'edit' => ['edit_advance'], 'delete' => ['delete_advance'],
        ],
        'admin.assets' => [
            'view' => ['view_asset', 'view_office'],
            'create' => ['create_asset', 'manage_assets'], 'edit' => ['edit_asset', 'manage_assets'], 'delete' => ['delete_asset', 'manage_assets'],
        ],
        'admin.attendances' => [
            'view' => ['view_attendance', 'view_hr'],
            'create' => ['create_attendance', 'manage_attendance'], 'edit' => ['edit_attendance', 'manage_attendance'], 'delete' => ['delete_attendance', 'manage_attendance'],
        ],
        'admin.challans' => [
            'view' => ['view_challan', 'view_office'],
            'create' => ['create_challan', 'manage_challans'], 'edit' => ['edit_challan', 'manage_challans'], 'delete' => ['delete_challan', 'manage_challans'],
        ],
        'admin.client-advances' => [
            'view' => ['view_client_advance', 'view_client_advances', 'view_finance'],
            'create' => ['create_client_advance'], 'edit' => ['edit_client_advance'], 'delete' => ['delete_client_advance'],
        ],
        'admin.clients' => [
            'view' => ['view_clients', 'view_crm'],
            'create' => ['create_client'], 'edit' => ['edit_client'], 'delete' => ['delete_client'],
        ],
        'admin.departments' => [
            'view' => ['view_department', 'view_hr'],
            'create' => ['create_department', 'manage_employees'], 'edit' => ['edit_department', 'manage_employees'], 'delete' => ['delete_department', 'manage_employees'],
        ],
        'admin.designations' => [
            'view' => ['view_designation', 'view_hr'],
            'create' => ['create_designation', 'manage_employees'], 'edit' => ['edit_designation', 'manage_employees'], 'delete' => ['delete_designation', 'manage_employees'],
        ],
        'admin.employees' => [
            'view' => ['view_employee', 'view_hr'],
            'create' => ['create_employee', 'manage_employees'], 'edit' => ['edit_employee', 'manage_employees'], 'delete' => ['delete_employee', 'manage_employees'],
        ],
        'admin.expense-categories' => [
            'view' => ['view_expence_category', 'view_finance'],
            'create' => ['create_expence_category'], 'edit' => ['edit_expence_category'], 'delete' => ['delete_expence_category'],
        ],
        'admin.expenses' => [
            'view' => ['view_expense', 'view_expence', 'view_expenses', 'view_finance'],
            'create' => ['create_expense'], 'edit' => ['edit_expense', 'edit_expence'], 'delete' => ['delete_expense', 'delete_expence'],
        ],
        'admin.investments' => [
            'view' => ['view_investment', 'manage_investments', 'view_finance'],
            'create' => ['create_investment', 'manage_investments'], 'edit' => ['edit_investment', 'manage_investments'], 'delete' => ['delete_investment', 'manage_investments'],
        ],
        'admin.invoices' => [
            'view' => ['view_invoices', 'view_finance'],
            'create' => ['create_invoice'], 'edit' => ['edit_invoice'], 'delete' => ['delete_invoice'],
        ],
        'invoice-payments' => [
            'view' => ['view_payments', 'view_receive_payment', 'view_finance'],
            'create' => ['create_receive_payment', 'create_payment'], 'edit' => ['edit_receive_payment', 'edit_payment'], 'delete' => ['delete_receive_payment', 'delete_payment'],
        ],
        'admin.leaves' => [
            'view' => ['view_leave', 'view_hr'],
            'create' => ['create_leave', 'manage_leaves'], 'edit' => ['edit_leave', 'manage_leaves'], 'delete' => ['delete_leave', 'manage_leaves'],
        ],
        'admin.notices' => [
            'view' => ['view_notice', 'view_office'],
            'create' => ['create_notice', 'manage_notices'], 'edit' => ['edit_notice', 'manage_notices'], 'delete' => ['delete_notice', 'manage_notices'],
        ],
        'admin.permissions' => [
            'view' => ['view_permission', 'manage_permissions'], 'create' => ['create_permission', 'manage_permissions'],
            'edit' => ['edit_permission', 'manage_permissions'], 'delete' => ['delete_permission', 'manage_permissions'],
        ],
        'admin.project-expenses' => [
            'view' => ['view_project_expense', 'view_project_expenses', 'view_finance'],
            'create' => ['create_project_expense', 'create_project_expenses'], 'edit' => ['edit_project_expense'], 'delete' => ['delete_project_expense'],
        ],
        'admin.projects' => [
            'view' => ['view_project', 'view_crm'],
            'create' => ['create_project'], 'edit' => ['edit_project'], 'delete' => ['delete_project'],
        ],
        'admin.requisitions' => [
            'view' => ['view_requisition', 'view_office'],
            'create' => ['create_requisition', 'manage_requisitions'], 'edit' => ['edit_requisition', 'manage_requisitions'], 'delete' => ['delete_requisition', 'manage_requisitions'],
        ],
        'admin.roles' => [
            'view' => ['view_role', 'manage_roles'], 'create' => ['create_role', 'manage_roles'],
            'edit' => ['edit_role', 'manage_roles'], 'delete' => ['delete_role', 'manage_roles'],
        ],
        'admin.salaries' => [
            'view' => ['view_salary', 'view_hr'],
            'create' => ['create_salary', 'manage_salaries'], 'edit' => ['edit_salary', 'manage_salaries'], 'delete' => ['delete_salary', 'manage_salaries'],
        ],
        'admin.sample-expenses' => [
            'view' => ['view_expense', 'view_expenses', 'view_finance'],
            'create' => ['create_expense'], 'edit' => ['edit_expense'], 'delete' => ['delete_expense'],
        ],
        'admin.tasks' => [
            'view' => ['view_tasks', 'view_crm'],
            'create' => ['create_task'], 'edit' => ['edit_task'], 'delete' => ['delete_task'],
        ],
        'admin.transactions' => [
            'view' => ['view_transaction', 'manage_transactions', 'view_finance'],
            'create' => ['create_transaction', 'manage_transactions'], 'edit' => ['edit_transaction', 'manage_transactions'], 'delete' => ['delete_transaction', 'manage_transactions'],
        ],
        'admin.users' => [
            'view' => ['view_users'], 'create' => ['create_user'], 'edit' => ['edit_user'], 'delete' => ['delete_user'],
        ],
        'admin.vendors' => [
            'view' => ['view_vendors', 'view_crm'],
            'create' => ['create_vendor'], 'edit' => ['edit_vendor'], 'delete' => ['delete_vendor'],
        ],
        'admin.useful-links' => [
            'view' => ['view_office'], 'create' => ['manage_useful_links'], 'edit' => ['manage_useful_links'], 'delete' => ['manage_useful_links'],
        ],
    ];

    private const SPECIAL_PERMISSIONS = [
        'admin.projects.update-status' => ['edit_project'],
        'admin.challans.print' => ['view_challan', 'view_office'],
        'admin.vendors.payments.bank-charge' => ['edit_vendor'],
        'admin.vendors.payments.void' => ['delete_vendor_payment', 'edit_vendor'],
        'admin.vendors.payments.index' => ['view_pay_vendor', 'view_vendors'],
        'admin.vendors.pay' => ['view_pay_vendor'],
        'admin.vendors.add-advance' => ['add_advance_vendor'],
        'admin.vendors.receive-refund' => ['return_advance_vendor'],
        'admin.invoices.apply-advance' => ['edit_invoice'],
        'admin.invoices.print' => ['view_invoices'],
        'admin.investments.return' => ['edit_investment', 'manage_investments'],
        'admin.advances.returnMoney' => ['return_advance'],
        'admin.advances.employeeLedger' => ['view_advance', 'view_client_advance'],
        'admin.salaries.add-payment' => ['create_salary', 'manage_salaries'],
        'salaries.pay' => ['create_salary', 'manage_salaries'],
        'admin.transactions.transfer' => ['create_transaction', 'manage_transactions'],
        'admin.project-expenses.move-to-wallet' => ['edit_project_expense'],
        'admin.sample-expenses.update-status' => ['edit_expense'],
        'admin.useful-links.toggle-pin' => ['manage_useful_links'],
        'admin.invoice-settings.index' => ['view_settings'],
        'admin.invoice-settings.update' => ['manage_invoice_settings'],
        'admin.challan-settings.index' => ['view_settings'],
        'admin.challan-settings.update' => ['manage_challan_settings'],
        'admin.reports.master' => ['view_report', 'view_finance'],
        'admin.reports.financial' => ['view_report', 'view_finance'],
        'admin.reports.position' => ['view_report', 'view_finance'],
        'admin.reports.client-ledger' => ['view_report', 'view_finance'],
        'admin.reports.vendor-ledger' => ['view_report', 'view_finance'],
        'admin.reports.project-profit' => ['view_report', 'view_finance'],
        'admin.reports.expense-analysis' => ['view_report', 'view_finance'],
        'admin.reports.daybook' => ['view_report', 'view_finance'],
        'admin.reports.monthly-balance' => ['view_report', 'view_finance'],
        'admin.client-dues' => ['view_report', 'view_finance'],
        'admin.vendor-dues' => ['view_report', 'view_finance'],
        'admin.vendor-payments' => ['view_report', 'view_finance'],
        'admin.account.transactions' => ['view_report', 'view_finance'],
        'admin.users.export.excel' => ['view_users'],
        'admin.global-search' => ['view_crm', 'view_finance', 'view_hr', 'view_office', 'view_report'],
        'dashboard' => ['view_dashboard'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if ($user->hasAnyRole(['Super Admin', 'super-admin'])) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();
        $required = $routeName ? $this->requiredPermissions($routeName) : null;
        if ($required === null) {
            abort(403);
        }

        $granted = $user->getAllPermissions()->pluck('name')->all();
        if (array_intersect($required, $granted)) {
            return $next($request);
        }

        abort(403);
    }

    private function requiredPermissions(string $routeName): ?array
    {
        if (isset(self::SPECIAL_PERMISSIONS[$routeName])) {
            return self::SPECIAL_PERMISSIONS[$routeName];
        }

        foreach (self::RESOURCE_PERMISSIONS as $prefix => $permissions) {
            if (!str_starts_with($routeName, $prefix . '.')) {
                continue;
            }

            $action = substr($routeName, strlen($prefix) + 1);
            $type = match ($action) {
                'index', 'show' => 'view',
                'create', 'store' => 'create',
                'edit', 'update' => 'edit',
                'destroy' => 'delete',
                default => null,
            };

            return $type ? ($permissions[$type] ?? null) : null;
        }

        if (str_starts_with($routeName, 'admin.reports.')) {
            return ['view_report', 'view_finance'];
        }

        return null;
    }
}
