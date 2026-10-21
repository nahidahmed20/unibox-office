<?php

namespace Tests\Feature;

use Database\Seeders\ExpenseCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExpenseCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_preserves_custom_categories_and_is_repeatable(): void
    {
        DB::table('expense_categories')->insert(['name' => 'Custom Cost', 'slug' => 'custom-cost']);

        $this->seed(ExpenseCategorySeeder::class);
        $this->assertDatabaseHas('expense_categories', ['name' => 'Shop & Office Rent']);
        $this->assertDatabaseHas('expense_categories', ['name' => 'Custom Cost']);
        $this->assertDatabaseCount('expense_categories', 28);

        $categories = DB::table('expense_categories')->orderBy('id')->get()->toJson();
        $this->travel(1)->hours();
        $this->seed(ExpenseCategorySeeder::class);
        $this->assertSame($categories, DB::table('expense_categories')->orderBy('id')->get()->toJson());
    }
}
