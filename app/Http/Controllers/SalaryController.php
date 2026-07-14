<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Salary;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Salary::with(['user', 'transactions.account']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('month_year', 'like', "%{$searchTerm}%")
                ->orWhereHas('user', function ($uq) use ($searchTerm) {
                    $uq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        if ($request->filled('month')) {
            $parts = explode('-', $request->month);
            if (count($parts) === 2) {
                $formattedMonth = $parts[1] . '-' . $parts[0]; 
                $query->where('month_year', $formattedMonth);
            }
        }

        $perPage = $request->input('per_page', 25);
        $salaries = $query->latest()->paginate($perPage)->withQueryString();
        
        $users = User::select('id', 'name')->orderBy('name')->get();
        $accounts = Account::where('is_active', true)->get();

        return Inertia::render('Admin/Salaries/Index', [
            'salaries' => $salaries,
            'users'    => $users,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'month_year'     => 'required|string',
            'basic_salary'   => 'required|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'bonus'          => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'net_pay'        => 'required|numeric',
            'status'         => 'required|in:unpaid,paid',
            'payment_method' => 'nullable|string',
            'payment_date'   => 'nullable|date',
            'account_id'     => 'required_if:status,paid|exists:accounts,id',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $salary = Salary::create($validated);

            if ($salary->status === 'paid') {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $salary->net_pay);

                $salary->transactions()->create([
                    'account_id'       => $account->id,
                    'type'             => 'debit',
                    'amount'           => $salary->net_pay,
                    'transaction_date' => $salary->payment_date ?? now(),
                    'description'      => "Salary Payment: " . $salary->month_year,
                ]);
            }
        });

        return redirect()->route('admin.salaries.index')->with('success', 'Salary processed.');
    }

    public function update(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);
        
        $validated = $request->validate([
            'user_id'      => 'required|exists:users,id',
            'basic_salary' => 'required|numeric|min:0',
            'allowances'   => 'nullable|numeric|min:0',
            'bonus'        => 'nullable|numeric|min:0',
            'deductions'   => 'nullable|numeric|min:0',
            'status'       => 'required|in:paid,unpaid',
            'account_id'   => 'required_if:status,paid|exists:accounts,id',
        ]);

        $validated['net_pay'] = $validated['basic_salary'] + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0);

        DB::transaction(function () use ($salary, $validated, $request) {
            if ($salary->status === 'unpaid' && $validated['status'] === 'paid') {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $validated['net_pay']);
                
                $salary->transactions()->create([
                    'account_id' => $account->id, 'type' => 'debit', 'amount' => $validated['net_pay'],
                    'transaction_date' => now(), 'description' => "Salary Payment: " . $salary->month_year
                ]);
            } 
            elseif ($salary->status === 'paid' && $validated['status'] === 'unpaid') {
                $lastTransaction = $salary->transactions()->latest()->first();
                if ($lastTransaction) {
                    $account = Account::find($lastTransaction->account_id);
                    $account->increment('current_balance', $salary->net_pay);
                    $salary->transactions()->delete(); 
                }
            }
            elseif ($salary->status === 'paid' && $validated['status'] === 'paid') {
                $diff = $validated['net_pay'] - $salary->net_pay;
                if ($diff != 0) {
                    $lastTransaction = $salary->transactions()->latest()->first();
                    $account = Account::find($lastTransaction->account_id);
                    $account->decrement('current_balance', $diff);
                    $lastTransaction->update(['amount' => $validated['net_pay']]);
                }
            }

            $salary->update($validated);
        });

        return redirect()->back()->with('success', 'Salary updated.');
    }

    public function destroy(string $id)
    {
        $salary = Salary::findOrFail($id);

        DB::transaction(function () use ($salary) {
            if ($salary->status === 'paid') {
                $lastTransaction = $salary->transactions()->latest()->first();
                if ($lastTransaction) {
                    $account = Account::find($lastTransaction->account_id);
                    $account->increment('current_balance', $salary->net_pay);
                }
            }
            $salary->delete();
        });

        return redirect()->back()->with('success', 'Salary deleted.');
    }
}