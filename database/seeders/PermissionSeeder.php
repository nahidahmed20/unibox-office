<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view_crm', 'create_project', 'edit_project', 'delete_project',
            'view_clients', 'create_client', 'edit_client', 'delete_client',
            'view_vendors', 'create_vendor', 'edit_vendor', 'delete_vendor',
            'view_tasks', 'create_task', 'edit_task', 'delete_task',
            'view_project_expenses', 'create_project_expense', 'edit_project_expense', 'delete_project_expense',
            'view_hr', 'manage_employees', 'manage_attendance', 'manage_leaves', 'manage_salaries',
            'view_finance', 'manage_accounts', 'manage_transactions', 'manage_investments',
            'view_invoices', 'create_invoice', 'edit_invoice', 'delete_invoice',
            'view_payments', 'create_payment', 'edit_payment', 'delete_payment',
            'view_client_advances', 'create_client_advance',
            'view_expenses', 'create_expense', 'edit_expense', 'delete_expense',
            'view_office', 'manage_assets', 'manage_requisitions', 'manage_notices',
            'view_settings', 'view_users', 'create_user', 'edit_user', 'delete_user',
            'manage_roles', 'manage_permissions',
            'view_dashboard', 'view_report',
            'view_project', 'view_vendor', 'view_task', 'view_project_expense', 'view_pay_vendor',
            'create_project_expenses',
            'view_account', 'create_account', 'delete_account',
            'view_advance', 'create_advance', 'edit_advance', 'delete_advance', 'return_advance',
            'view_asset', 'create_asset', 'edit_asset', 'delete_asset',
            'view_attendance', 'create_attendance', 'edit_attendance', 'delete_attendance',
            'view_challan', 'create_challan', 'edit_challan', 'delete_challan', 'manage_challans',
            'edit_client_advance', 'delete_client_advance', 'print_client_advance',
            'view_department', 'create_department', 'edit_department', 'delete_department',
            'view_designation', 'create_designation', 'edit_designation', 'delete_designation',
            'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
            'view_expence_category', 'create_expence_category', 'edit_expence_category', 'delete_expence_category',
            'view_expense', 'view_expence', 'view_expences', 'edit_expence', 'delete_expence',
            'view_investment', 'create_investment', 'edit_investment', 'delete_investment',
            'view_receive_payment', 'create_receive_payment', 'edit_receive_payment', 'delete_receive_payment',
            'delete_vendor_payment', 'add_advance_vendor', 'return_advance_vendor',
            'view_leave', 'create_leave', 'edit_leave', 'delete_leave',
            'view_notice', 'create_notice', 'edit_notice', 'delete_notice',
            'view_permission', 'create_permission', 'edit_permission', 'delete_permission',
            'view_requisition', 'create_requisition', 'edit_requisition', 'delete_requisition',
            'view_role', 'create_role', 'edit_role', 'delete_role',
            'view_salary', 'create_salary', 'edit_salary', 'delete_salary',
            'create_transaction', 'view_transaction', 'edit_transaction', 'delete_transaction',
            'manage_useful_links', 'manage_invoice_settings', 'manage_challan_settings'
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
