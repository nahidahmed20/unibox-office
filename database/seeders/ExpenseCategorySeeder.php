<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Shop & Office Rent', 'slug' => 'shop-office-rent', 'desc' => 'দোকান ও অফিস ভাড়া'],
            ['name' => 'Salaries & Staff Benefits', 'slug' => 'salaries-staff-benefits', 'desc' => 'কর্মচারী মাসিক বেতন, বোনাস ও ভাতা'],
            ['name' => 'Software & Cloud Services', 'slug' => 'software-cloud-services', 'desc' => 'সফটওয়্যার, ডোমেন ও হোস্টিং'],
            ['name' => 'Raw Materials & Project Supplies', 'slug' => 'raw-materials-project-supplies', 'desc' => 'সাধারণ প্রজেক্ট মালামাল ও মেটেরিয়ালস'],
            ['name' => 'Marketing & Online Promotion', 'slug' => 'marketing-online-promotion', 'desc' => 'ফেসবুক বুস্টিং, বিজ্ঞাপন ও প্রমোশন'],
            ['name' => 'Shop & Office Interior', 'slug' => 'shop-office-interior', 'desc' => 'দোকান/অফিস ইন্টেরিয়র, ডেকোরেশন, কাঠবোর্ড ও মিস্ত্রি বিল'],
            ['name' => 'Client Hospitality & Entertainment', 'slug' => 'client-hospitality-entertainment', 'desc' => 'ক্লায়েন্ট মিটিং, আপ্যায়ন ও ডিনার'],
            ['name' => 'Maintenance, Hardware & Tools', 'slug' => 'maintenance-hardware-tools', 'desc' => 'দোকান মেরামত, হার্ডওয়্যার, সাটার লক, ড্রয়ার, ফ্যান, টুলস'],
            ['name' => 'Office Stationery & Cleaning Supplies', 'slug' => 'office-stationery-cleaning-supplies', 'desc' => 'অফিস স্টেশনারি, কলম, খাতা, টিস্যু, হ্যান্ডওয়াশ, রুম স্প্রে'],
            ['name' => 'Machine Servicing & Technical Repair', 'slug' => 'machine-servicing-technical-repair', 'desc' => 'মেশিনারি সার্ভিসিং, প্রিন্টার ও কম্পিউটার মেরামত'],
            ['name' => 'Licenses, Tax & Legal Fees', 'slug' => 'licenses-tax-legal-fees', 'desc' => 'ট্রেড লাইসেন্স নবায়ন, ভ্যাট ও সরকারি ফি'],
            ['name' => 'Miscellaneous / Other Expenses', 'slug' => 'miscellaneous-other-expenses', 'desc' => 'বিবিধ ও অন্যান্য অনাকাঙ্ক্ষিত খরচ'],
            ['name' => 'Printing Bill (Offset & Digital)', 'slug' => 'printing-bill-offset-digital', 'desc' => 'অফসেট ও ডিজিটাল প্রিন্টিং বিল, কালার প্রিন্ট'],
            ['name' => 'Lunch / Daily Meals', 'slug' => 'lunch-daily-meals', 'desc' => 'কর্মচারীদের নিয়মিত দুপুরের খাবার বিল'],
            ['name' => 'Conveyance & Bike Fuel', 'slug' => 'conveyance-bike-fuel', 'desc' => 'যাতায়াত, রিকশা ভাড়া, বাইক তেল/অকটেন ও সার্ভিসিং'],
            ['name' => 'Snacks, Tea & Refreshment', 'slug' => 'snacks-tea-refreshment', 'desc' => 'চা, নাস্তা, কফি, বিস্কুট, দুধ, চিনি ও রিফ্রেশমেন্ট'],
            ['name' => 'Cutting & Die-Cutting', 'slug' => 'cutting-die-cutting', 'desc' => 'কাটিং, ডাই-কাটিং, ক্রিস ও পারফরেশন বিল'],
            ['name' => 'Utilities, Internet & Mobile Bill', 'slug' => 'utilities-internet-mobile-bill', 'desc' => 'বিদ্যুৎ বিল, ইন্টারনেট বিল ও মোবাইল রিচার্জ'],
            ['name' => 'Courier, Delivery & Transport', 'slug' => 'courier-delivery-transport', 'desc' => 'কুরিয়ার সার্ভিস, পার্সেল, ভ্যান ভাড়া ও মালামাল পরিবহন'],
            ['name' => 'Plate & CTP / Positive', 'slug' => 'plate-ctp-positive', 'desc' => 'প্রিন্টিং প্লেট, পজিটিভ ও সিটিপি বিল'],
            ['name' => 'Paper & Board', 'slug' => 'paper-board', 'desc' => 'আর্ট পেপার, আর্ট কার্ড, বোর্ড, ডুপ্লেক্স ও কাগজ মালামাল'],
            ['name' => 'Lamination & Spot UV', 'slug' => 'lamination-spot-uv', 'desc' => 'লেমিনেটিং (ম্যাট/গ্লস), স্পট ইউভি ও ফয়েল প্রিন্ট'],
            ['name' => 'Binding & Pasting', 'slug' => 'binding-pasting', 'desc' => 'বই বাইন্ডিং, প্যাড বাইন্ডিং, খাম পেস্টিং ও ফোল্ডিং'],
            ['name' => 'Crest, Trophy & Corporate Gifts', 'slug' => 'crest-trophy-corporate-gifts', 'desc' => 'ক্রেস্ট, মেডেল, মগ, ছাতা, টি-শার্ট, প্রিন্টসহ কলম ও গিফট আইটেম'],
            ['name' => 'Packaging, Cartons & Bags', 'slug' => 'packaging-cartons-bags', 'desc' => 'কার্টুন, শপিং ব্যাগ, পলি ব্যাগ, বস্তা ও প্যাকিং টেপ'],
            ['name' => 'Banner, Festoon & Signage', 'slug' => 'banner-festoon-signage', 'desc' => 'পিভিসি ব্যানার, ফেস্টুন ফ্রেম, স্টিকার, এক্রিলিক শিট ও সাইনবোর্ড'],
            ['name' => 'Bank Charges & Cashout Fees', 'slug' => 'bank-charges-cashout-fees', 'desc' => 'ব্যাংক অ্যাকাউন্ট ফি, কার্ড ফি, এসএমএস ও বিকাশ ক্যাশআউট চার্জ'],
        ];

        DB::transaction(function () use ($categories) {
            foreach ($categories as $cat) {
                $existing = DB::table('expense_categories')->where('slug', $cat['slug'])->first();
                if ($existing) {
                    if ($existing->name !== $cat['name'] || $existing->description !== $cat['desc']) {
                        DB::table('expense_categories')->where('id', $existing->id)->update([
                            'name' => $cat['name'],
                            'description' => $cat['desc'],
                            'updated_at' => now(),
                        ]);
                    }
                } else {
                    DB::table('expense_categories')->insert([
                        'name' => $cat['name'],
                        'slug' => $cat['slug'],
                        'description' => $cat['desc'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }
}
