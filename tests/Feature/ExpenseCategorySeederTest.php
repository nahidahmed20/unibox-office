<?php

namespace Tests\Feature;

use Database\Seeders\ExpenseCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExpenseCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_preserves_legacy_links_and_custom_categories_and_is_repeatable(): void
    {
        $id = DB::table('expense_categories')->insertGetId(['name' => 'Printing Bill', 'slug' => 'printing-bill']);
        DB::table('expense_categories')->insert(['name' => 'Custom Cost', 'slug' => 'custom-cost']);
        DB::table('expenses')->insert([
            'title' => 'Existing printing expense', 'expense_category_id' => $id,
            'amount' => 1600, 'bank_charge' => 10, 'date' => '2026-09-11', 'logged_by' => 1,
        ]);
        $expenses = DB::table('expenses')->get()->toJson();

        $this->seed(ExpenseCategorySeeder::class);
        $this->assertDatabaseHas('expense_categories', ['id' => $id, 'name' => 'Printing Services']);
        $this->assertDatabaseHas('expense_categories', ['name' => 'Custom Cost']);
        $this->assertDatabaseCount('expense_categories', 29);
        $this->assertSame($expenses, DB::table('expenses')->get()->toJson());

        $categories = DB::table('expense_categories')->orderBy('id')->get()->toJson();
        $this->travel(1)->hours();
        $this->seed(ExpenseCategorySeeder::class);
        $this->assertSame($categories, DB::table('expense_categories')->orderBy('id')->get()->toJson());
    }

    public function test_conflicting_legacy_categories_roll_back_without_merging(): void
    {
        DB::table('expense_categories')->insert([
            ['name' => 'Salaries', 'slug' => 'salaries'],
            ['name' => 'Salaries & Wages', 'slug' => 'salaries-wages'],
        ]);
        $before = DB::table('expense_categories')->orderBy('id')->get()->toJson();
        try {
            $this->seed(ExpenseCategorySeeder::class);
            $this->fail('Conflicting categories must not be silently merged.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Multiple existing categories match', $exception->getMessage());
        }
        $this->assertSame($before, DB::table('expense_categories')->orderBy('id')->get()->toJson());
    }
}
