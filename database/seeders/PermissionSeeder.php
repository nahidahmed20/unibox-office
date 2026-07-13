<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

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
            'manage_roles', 'manage_permissions'
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    }
}