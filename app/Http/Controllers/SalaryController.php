<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Salary;
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
            'basic_salary'   => 'nullable|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'bonus'          => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'net_pay'        => 'required|numeric',
            'status'         => 'required|in:unpaid,paid',
            'payment_date'   => 'nullable|date',
            'payments'       => 'required_if:status,paid|array|min:1',
            'payments.*.account_id' => 'required_if:status,paid|exists:accounts,id',
            'payments.*.amount'     => 'required_if:status,paid|numeric|min:0',
        ]);

        // 🟢 Null values handling to avoid DB errors
        $salaryData = [
            'user_id' => $validated['user_id'],
            'month_year' => $validated['month_year'],
            'basic_salary' => $validated['basic_salary'] ?? 0,
            'allowances' => $validated['allowances'] ?? 0,
            'bonus' => $validated['bonus'] ?? 0,
            'deductions' => $validated['deductions'] ?? 0,
            'net_pay' => $validated['net_pay'],
            'status' => $validated['status'],
            'payment_date' => $validated['payment_date'],
        ];

        DB::transaction(function () use ($salaryData, $request) {
            $salary = Salary::create($salaryData);

            if ($salary->status === 'paid' && $request->has('payments')) {
                foreach ($request->payments as $payment) {
                    if ($payment['amount'] > 0) {
                        $account = Account::findOrFail($payment['account_id']);
                        $account->decrement('current_balance', $payment['amount']);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $payment['amount'],
                            'transaction_date' => $salary->payment_date ?? now(),
                            'description'      => "Salary Split Payment: " . $salary->month_year,
                        ]);
                    }
                }
            }
        });

        return redirect()->back()->with('success', 'Salary processed successfully.');
    }

    public function update(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);
        
        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'month_year'     => 'required|string',
            'basic_salary'   => 'nullable|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'bonus'          => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'status'         => 'required|in:paid,unpaid',
            'payment_date'   => 'nullable|date',
            'payments'       => 'required_if:status,paid|array',
            'payments.*.account_id' => 'required_if:status,paid|exists:accounts,id',
            'payments.*.amount'     => 'required_if:status,paid|numeric|min:0',
        ]);

        $net_pay = ($validated['basic_salary'] ?? 0) + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0);

        DB::transaction(function () use ($salary, $validated, $net_pay, $request) {
            // 🟢 Reverse Old Transactions safely
            foreach ($salary->transactions as $txn) {
                $account = Account::find($txn->account_id);
                if ($account) {
                    $account->increment('current_balance', $txn->amount);
                }
                $txn->delete();
            }

            // 🟢 Create New Transactions if paid
            if ($validated['status'] === 'paid' && $request->has('payments')) {
                foreach ($request->payments as $payment) {
                    if ($payment['amount'] > 0) {
                        $account = Account::findOrFail($payment['account_id']);
                        $account->decrement('current_balance', $payment['amount']);
                        
                        $salary->transactions()->create([
                            'account_id' => $account->id, 
                            'type' => 'debit', 
                            'amount' => $payment['amount'],
                            'transaction_date' => $validated['payment_date'] ?? now(), 
                            'description' => "Salary Payment Updated: " . $salary->month_year
                        ]);
                    }
                }
            }

            $salary->update([
                'user_id' => $validated['user_id'],
                'month_year' => $validated['month_year'],
                'basic_salary' => $validated['basic_salary'] ?? 0,
                'allowances' => $validated['allowances'] ?? 0,
                'bonus' => $validated['bonus'] ?? 0,
                'deductions' => $validated['deductions'] ?? 0,
                'net_pay' => $net_pay,
                'status' => $validated['status'],
                'payment_date' => $validated['payment_date'],
            ]);
        });

        return redirect()->back()->with('success', 'Salary updated successfully.');
    }

    public function destroy(string $id)
    {
        $salary = Salary::findOrFail($id);

        DB::transaction(function () use ($salary) {
            // Reverse all split transactions
            foreach ($salary->transactions as $txn) {
                $account = Account::find($txn->account_id);
                if ($account) {
                    $account->increment('current_balance', $txn->amount);
                }
                $txn->delete();
            }
            $salary->delete();
        });

        return redirect()->back()->with('success', 'Salary deleted successfully.');
    }
}