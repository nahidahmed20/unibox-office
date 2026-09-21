<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // ==========================================
            // 1. PROJECT & PRODUCTION COSTS (Direct Costs)
            // ==========================================
            [
                'name' => 'Raw Materials & Consumables',
                'aliases' => ['Project Materials & Consumables', 'Project Raw Materials'],
                'description' => 'Direct materials for projects: paper, art card, board, PVC, ribbon, tape, glue, ink, etc.',
            ],
            [
                'name' => 'Printing & Press Charges',
                'aliases' => ['Printing Services', 'Printing Bill'],
                'description' => 'Offset, digital, screen, and UV printing bills for project productions.',
            ],
            [
                'name' => 'Pre-press & Plates',
                'aliases' => ['Printing Plates & Prepress', 'Plate'],
                'description' => 'Printing plates, CTP, positives, film, and design prepress charges.',
            ],
            [
                'name' => 'Post-press & Finishing',
                'aliases' => ['Binding, Folding & Pasting', 'Lamination, Spot & Finishing', 'Paper & Die Cutting'],
                'description' => 'Die-cutting, folding, pasting, binding, lamination, spot UV, and foil stamping charges.',
            ],
            [
                'name' => 'Corporate Gifts & Souvenirs',
                'aliases' => ['Gift & Promotional Items'],
                'description' => 'Products sourced for clients: pens, crests, mugs, watches, umbrellas, T-shirts, medals, etc.',
            ],
            [
                'name' => 'Packaging & Bags',
                'description' => 'Master cartons, product inner boxes, shopping bags, poly bags, and protective bubble wraps.',
            ],
            [
                'name' => 'Interior & Event Setup',
                'description' => 'Materials for interior or event projects: plywood, acrylic, hardware, banners, festoons, and event management costs.',
            ],
            [
                'name' => 'Project Labour & Installation',
                'description' => 'Daily labor, van loaders, mechanics, fabrication, and installation workers hired specifically for a project.',
            ],
            [
                'name' => 'Freight, Courier & Delivery',
                'aliases' => ['Courier & Delivery', 'Courier Service'],
                'description' => 'Pathao, RedX, courier, truck, or pickup fares specifically for delivering finished goods to clients or bringing heavy raw materials.',
            ],

            // ==========================================
            // 2. OFFICE & ADMIN EXPENSES (OPEX)
            // ==========================================
            [
                'name' => 'Salaries & Wages',
                'aliases' => ['Salaries & Staff Benefits', 'Salaries'],
                'description' => 'Regular monthly salaries, allowances, and bonuses for core office staff.',
            ],
            [
                'name' => 'Office Rent & Utilities',
                'description' => 'Monthly office/factory rent, electricity, WASA, gas, and office internet/Wi-Fi bills.',
            ],
            [
                'name' => 'Staff Meals & Refreshments',
                'aliases' => ['Staff Lunch & Meals', 'Tea, Snacks & Refreshments', 'Lunch', 'Snacks'],
                'description' => 'Daily staff lunch, tea, coffee, drinking water, and snacks during office hours or overtime.',
            ],
            [
                'name' => 'Local Conveyance & Travel',
                'aliases' => ['Travel & Site Visits', 'Local Transport & Fuel', 'Travel & Conveyance', 'Conveyance'],
                'description' => 'Rickshaw, bus, or bike fuel for daily office errands, material sourcing, and routine client visits.',
            ],
            [
                'name' => 'Client Meetings & Hospitality',
                'aliases' => ['Client Entertainment'],
                'description' => 'Food, restaurant bills, and hospitality strictly for entertaining clients or guests.',
            ],
            [
                'name' => 'Marketing & Advertising',
                'description' => 'Facebook boosting, Google ads, PR, and promotional materials for your own company (Unibox).',
            ],
            [
                'name' => 'Software, Domain & Hosting',
                'aliases' => ['Software & Cloud Services'],
                'description' => 'Adobe CC, domain renewals, website hosting, ERP software, and online business tools.',
            ],
            [
                'name' => 'Hardware, Equipment & Tools',
                'aliases' => ['Computer, Equipment & Accessories', 'Hardware & IT Setup'],
                'description' => 'Computers, printers, mouse, cables, small tools, and office equipment (non-capitalized).',
            ],
            [
                'name' => 'Office Stationery & Supplies',
                'aliases' => ['Office Stationery'],
                'description' => 'Internal office needs: printer paper, pens, calculators, handwash, tissues, and cleaning items.',
            ],
            [
                'name' => 'Maintenance & Repairs',
                'description' => 'AC servicing, computer repairs, machinery servicing, plumbing, and general office fix-ups.',
            ],
            [
                'name' => 'Mobile & Communication',
                'aliases' => ['Internal Bill'],
                'description' => 'Office mobile phone recharges, minute bundles, and mobile data purchases.',
            ],

            // ==========================================
            // 3. FINANCIAL & LEGAL EXPENSES
            // ==========================================
            [
                'name' => 'Licenses, Tax & Legal Fees',
                'aliases' => ['Legal & Professional Fees'],
                'description' => 'Trade license renewals, VAT/Tax consultant fees, audit fees, and legal documentation costs.',
            ],
            [
                'name' => 'Bank & Transaction Charges',
                'description' => 'Bank account maintenance fees, chequebook fees, and bKash/Nagad merchant charge deductions.',
            ],
            [
                'name' => 'Miscellaneous',
                'description' => 'Small exceptional expenses that do not fit anywhere else. Must include a clear note.',
            ],
        ];

        DB::transaction(function () use ($categories) {
            foreach ($categories as $category) {
                $names = array_merge([$category['name']], $category['aliases'] ?? []);
                $slugs = array_map(fn ($name) => Str::slug($name), $names);

                // Get all matching categories (old ones that we need to merge)
                $matches = DB::table('expense_categories')
                    ->where(function ($query) use ($names, $slugs) {
                        $query->whereIn('name', $names)->orWhereIn('slug', $slugs);
                    })
                    ->orderBy('id', 'asc') // Keep the oldest one as the primary
                    ->lockForUpdate()
                    ->get();

                $values = [
                    'name' => $category['name'],
                    'slug' => Str::slug($category['name']),
                    'description' => $category['description']
                ];

                if ($matches->count() > 0) {
                    $primary = $matches->first();

                    // If there are duplicate categories, we merge them safely
                    if ($matches->count() > 1) {
                        $duplicateIds = $matches->slice(1)->pluck('id')->toArray();

                        // Move existing expenses from duplicate categories to the primary category
                        if (Schema::hasTable('expenses')) {
                            DB::table('expenses')->whereIn('expense_category_id', $duplicateIds)->update(['expense_category_id' => $primary->id]);
                        }
                        if (Schema::hasTable('project_expenses')) {
                            DB::table('project_expenses')->whereIn('expense_category_id', $duplicateIds)->update(['expense_category_id' => $primary->id]);
                        }

                        // Now delete the duplicates
                        DB::table('expense_categories')->whereIn('id', $duplicateIds)->delete();
                    }

                    // Update the primary category with the new optimized name
                    if ($primary->name !== $values['name'] || $primary->slug !== $values['slug'] || $primary->description !== $values['description']) {
                        DB::table('expense_categories')->where('id', $primary->id)->update($values + ['updated_at' => now()]);
                    }
                } else {
                    // Create new category if it doesn't exist at all
                    DB::table('expense_categories')->insert($values + ['created_at' => now(), 'updated_at' => now()]);
                }
            }
        });
    }
}
