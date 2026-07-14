<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Office Rent & Utilities',
                'description' => 'Monthly office rent, electricity, water, gas, and internet bills.',
            ],
            [
                'name' => 'Salaries & Wages',
                'description' => 'Regular employee salaries, part-time wages, and daily labor costs.',
            ],
            [
                'name' => 'Software & Cloud Services',
                'description' => 'Domain, hosting, AWS/VPS, GitHub, SaaS tools, and software subscriptions.',
            ],
            [
                'name' => 'Project Raw Materials',
                'description' => 'Any direct material or digital asset purchased specifically for a client project.',
            ],
            [
                'name' => 'Marketing & Advertising',
                'description' => 'Facebook ads, Google ads, SEO tools, branding, and promotional materials.',
            ],
            [
                'name' => 'Travel & Conveyance',
                'description' => 'Transport costs for client meetings, site visits, and daily office errands.',
            ],
            [
                'name' => 'Client Entertainment',
                'description' => 'Tea, coffee, snacks, or lunch/dinner costs during client meetings or office visits.',
            ],
            [
                'name' => 'Hardware & IT Setup',
                'description' => 'Purchasing laptops, monitors, routers, cables, and other physical IT equipment.',
            ],
            [
                'name' => 'Office Stationery',
                'description' => 'Printing, paper, pens, whiteboards, and other daily desk supplies.',
            ],
            [
                'name' => 'Maintenance & Repairs',
                'description' => 'AC servicing, cleaning, plumbing, computer repairs, and general office maintenance.',
            ],
            [
                'name' => 'Legal & Professional Fees',
                'description' => 'Trade license renewal, tax, audit fees, and legal consultancy charges.',
            ],
            [
                'name' => 'Miscellaneous',
                'description' => 'Sudden, small, or uncategorized miscellaneous expenses.',
            ],
        ];

        foreach ($categories as $category) {
            DB::table('expense_categories')->insert([
                'name' => $category['name'],
                'slug' => Str::slug($category['name']),
                'description' => $category['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}