<?php

namespace App\Http\Controllers;

use App\Models\Salary;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class SalaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Salary::with('user');

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('month_year', 'like', "%{$searchTerm}%")
                  ->orWhereHas('user', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        $salaries = $query->latest()->get(); 
        $users = User::select('id', 'name')->get();

        return Inertia::render('Admin/Salaries/Index', [
            'salaries' => $salaries,
            'users'    => $users,
            'filters'  => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'month_year'     => [
                'required', 'string',
                Rule::unique('salaries')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user_id);
                })
            ],
            'basic_salary'   => 'required|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'bonus'          => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'status'         => 'required|in:paid,unpaid',
            'payment_date'   => 'nullable|date',
            'payment_method' => 'nullable|string',
        ]);

        // Auto calculation in backend
        $validated['net_pay'] = $validated['basic_salary'] + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0);

        Salary::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);

        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'month_year'     => [
                'required', 'string',
                Rule::unique('salaries')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user_id);
                })->ignore($salary->id)
            ],
            'basic_salary'   => 'required|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'bonus'          => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'status'         => 'required|in:paid,unpaid',
            'payment_date'   => 'nullable|date',
            'payment_method' => 'nullable|string',
        ]);

        $validated['net_pay'] = $validated['basic_salary'] + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0);

        $salary->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Salary::findOrFail($id)->delete();
        return redirect()->back();
    }
}