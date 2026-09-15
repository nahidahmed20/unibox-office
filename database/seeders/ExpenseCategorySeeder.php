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
                'description' => 'Office/shop rent, electricity, water, gas and office internet bills.',
            ],
            [
                'name' => 'Salaries & Staff Benefits',
                'aliases' => ['Salaries & Wages', 'Salaries'],
                'description' => 'Staff wages, allowances and benefits. Do not repeat salary payments already recorded in Payroll; project labour belongs under Project Labour & Installation.',
            ],
            [
                'name' => 'Software, Domain & Hosting',
                'aliases' => ['Software & Cloud Services'],
                'description' => 'Design software, subscriptions, domains, website hosting and online business tools.',
            ],
            [
                'name' => 'Project Materials & Consumables',
                'aliases' => ['Project Raw Materials'],
                'description' => 'Project paper, card, board, PVC, ribbon, tape, glue and other production materials. Use the specific service categories for printing, cutting, binding and finishing.',
            ],
            [
                'name' => 'Marketing & Advertising',
                'description' => 'Facebook boosting, paid advertisements and promotion of Unibox. Client printing and promotional products belong under their production categories.',
            ],
            [
                'name' => 'Travel & Site Visits',
                'aliases' => ['Travel & Conveyance'],
                'description' => 'Travel for client meetings, project site visits and out-of-town work. Routine local errands and bike fuel belong under Local Transport & Fuel.',
            ],
            [
                'name' => 'Client Meetings & Hospitality',
                'aliases' => ['Client Entertainment'],
                'description' => 'Food, refreshments and hospitality specifically for client meetings and client visits.',
            ],
            [
                'name' => 'Computer, Equipment & Accessories',
                'aliases' => ['Hardware & IT Setup'],
                'description' => 'Computer accessories, cables, batteries, routers, small equipment and tools. Do not duplicate equipment purchases already recorded in Assets.',
            ],
            [
                'name' => 'Office Stationery & Supplies',
                'aliases' => ['Office Stationery'],
                'description' => 'Office paper, pens, calculators, stamps, tissues, handwash, cleaning supplies and other routine office supplies; excludes client project materials.',
            ],
            [
                'name' => 'Maintenance & Repairs',
                'description' => 'Chair/furniture repairs, AC servicing, equipment servicing, plumbing and office maintenance. Rent and bank fees have separate categories.',
            ],
            [
                'name' => 'Licenses, Tax & Professional Fees',
                'aliases' => ['Legal & Professional Fees'],
                'description' => 'Trade license annual fees, renewals, tax, audit, accounting and legal consultancy fees.',
            ],
            [
                'name' => 'Miscellaneous',
                'description' => 'Small exceptional expenses that do not fit another category. Include a clear explanation in the expense notes.',
            ],
            [
                'name' => 'Printing Services',
                'aliases' => ['Printing Bill'],
                'description' => 'Offset, digital, colour, UV and screen printing for books, annual reports, magazines, visiting cards, pads, certificates, leaflets, envelopes, ID cards and banners.',
            ],
            [
                'name' => 'Staff Lunch & Meals',
                'aliases' => ['Lunch'],
                'description' => 'Staff lunch, dinner and meals during office or project work. Hospitality specifically for clients has a separate category.',
            ],
            [
                'name' => 'Local Transport & Fuel',
                'aliases' => ['Conveyance'],
                'description' => 'Rickshaw, van, local transport, material collection, office errands, bike fuel and oil. Courier service charges have a separate category.',
            ],
            [
                'name' => 'Tea, Snacks & Refreshments',
                'aliases' => ['Snacks'],
                'description' => 'Staff tea, coffee, milk, sugar, drinking water, biscuits, fruit and light snacks for office or project work.',
            ],
            [
                'name' => 'Paper & Die Cutting',
                'aliases' => ['Cutting'],
                'description' => 'Paper, card, cover and leaflet cutting, die cutting and trimming charges.',
            ],
            [
                'name' => 'Mobile & Communication',
                'aliases' => ['Internal Bill'],
                'description' => 'Business mobile recharge, call minutes, mobile data and communication bills.',
            ],
            [
                'name' => 'Courier & Delivery',
                'aliases' => ['Courier Service'],
                'description' => 'Courier charges, parcel receiving/sending and delivery service bills for project products and office items.',
            ],
            [
                'name' => 'Printing Plates & Prepress',
                'aliases' => ['Plate'],
                'description' => 'Printing plates, positives, film, plate preparation and other prepress charges.',
            ],
            [
                'name' => 'Binding, Folding & Pasting',
                'description' => 'Book, notebook, pad and bag binding; glue binding, folding, creasing, perforation and envelope pasting/making charges.',
            ],
            [
                'name' => 'Lamination, Spot & Finishing',
                'description' => 'Matte/gloss lamination, spot UV, coating and finishing of covers, cards, notebooks and bags.',
            ],
            [
                'name' => 'Gift & Promotional Items',
                'description' => 'Client gift products such as pens, keyrings, crests, medals, mugs, watches, umbrellas, T-shirts, jerseys and nameplates, including bundled branding costs.',
            ],
            [
                'name' => 'Interior & Event Setup',
                'description' => 'Interior decoration and event setup materials/services: plywood, boards, carpet, curtains, PVC displays, banners, festoons and event management.',
            ],
            [
                'name' => 'Packaging & Bags',
                'description' => 'Cartons, product boxes, shopping bags, poly bags, sacks and protective packaging materials.',
            ],
            [
                'name' => 'Bank & Transaction Charges',
                'description' => 'Standalone bank, card, SMS, transfer and transaction fees. Do not enter a fee again here if it was already recorded in a payment Bank charge field.',
            ],
            [
                'name' => 'Samples & Prototypes',
                'description' => 'Company samples, demonstration products, trial prints, sample medals and prototypes prepared before a production order.',
            ],
            [
                'name' => 'Project Labour & Installation',
                'description' => 'Project-specific mechanic, fabrication, installation, fitting, assembly and temporary labour charges; excludes regular staff payroll.',
            ],
        ];

        DB::transaction(function () use ($categories) {
            foreach ($categories as $category) {
                $names = array_merge([$category['name']], $category['aliases'] ?? []);
                $slugs = array_map(fn ($name) => Str::slug($name), $names);
                $matches = DB::table('expense_categories')->where(function ($query) use ($names, $slugs) {
                    $query->whereIn('name', $names)->orWhereIn('slug', $slugs);
                })->lockForUpdate()->get();

                if ($matches->count() > 1) {
                    throw new \RuntimeException("Multiple existing categories match {$category['name']}. Review them before merging linked expenses.");
                }

                $values = ['name' => $category['name'], 'slug' => Str::slug($category['name']), 'description' => $category['description']];
                $existing = $matches->first();
                if ($existing) {
                    // Preserve IDs and existing expense links. Re-running the seeder is a no-op if already current.
                    if ($existing->name !== $values['name'] || $existing->slug !== $values['slug'] || $existing->description !== $values['description']) {
                        DB::table('expense_categories')->where('id', $existing->id)->update($values + ['updated_at' => now()]);
                    }
                } else {
                    DB::table('expense_categories')->insert($values + ['created_at' => now(), 'updated_at' => now()]);
                }
            }
        });
    }
}
