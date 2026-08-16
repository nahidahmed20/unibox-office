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
        
        $users = User::select('id', 'name')
            ->with(['employeeProfile' => function ($q) {
                $q->select('user_id', 'basic_salary');
            }])
            ->orderBy('name')
            ->get();
            
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
            'status'         => 'required|in:unpaid,paid,partially_paid',
            'payment_date'   => 'nullable|date',
            'payments'       => 'nullable|array',
            'payments.*.account_id' => 'required_with:payments|exists:accounts,id',
            'payments.*.amount'     => 'required_with:payments|numeric|min:0',
        ]);

        $net_pay = ($validated['basic_salary'] ?? 0) + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0);

        DB::transaction(function () use ($validated, $net_pay, $request) {
            $salary = Salary::create([
                'user_id'      => $validated['user_id'],
                'month_year'   => $validated['month_year'],
                'basic_salary' => $validated['basic_salary'] ?? 0,
                'allowances'   => $validated['allowances'] ?? 0,
                'bonus'        => $validated['bonus'] ?? 0,
                'deductions'   => $validated['deductions'] ?? 0,
                'net_pay'      => $net_pay,
                'paid_amount'  => 0,
                'due_amount'   => $net_pay,
                'status'       => 'unpaid',
                'payment_date' => $validated['payment_date'],
            ]);

            $total_paid = 0;

            if (in_array($validated['status'], ['paid', 'partially_paid']) && $request->has('payments')) {
                foreach ($request->payments as $payment) {
                    if ($payment['amount'] > 0) {
                        $account = Account::findOrFail($payment['account_id']);
                        $account->decrement('current_balance', $payment['amount']);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $payment['amount'],
                            'transaction_date' => $validated['payment_date'] ?? now(),
                            'description'      => "Salary Payment: " . $salary->month_year,
                        ]);

                        $total_paid += $payment['amount'];
                    }
                }
            }

            $salary->paid_amount = $total_paid;
            $salary->due_amount = $net_pay - $total_paid;
            $salary->status = $salary->due_amount <= 0 ? 'paid' : ($salary->paid_amount > 0 ? 'partially_paid' : 'unpaid');
            $salary->save();
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
            'status'         => 'required|in:unpaid,paid,partially_paid',
            'payment_date'   => 'nullable|date',
            'payments'       => 'nullable|array',
            'payments.*.account_id' => 'required_with:payments|exists:accounts,id',
            'payments.*.amount'     => 'required_with:payments|numeric|min:0',
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

            $total_paid = 0;

            // 🟢 Create New Transactions based on updated form
            if (in_array($validated['status'], ['paid', 'partially_paid']) && $request->has('payments')) {
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

                        $total_paid += $payment['amount'];
                    }
                }
            }

            $salary->update([
                'user_id'      => $validated['user_id'],
                'month_year'   => $validated['month_year'],
                'basic_salary' => $validated['basic_salary'] ?? 0,
                'allowances'   => $validated['allowances'] ?? 0,
                'bonus'        => $validated['bonus'] ?? 0,
                'deductions'   => $validated['deductions'] ?? 0,
                'net_pay'      => $net_pay,
                'paid_amount'  => $total_paid,
                'due_amount'   => $net_pay - $total_paid,
                'status'       => ($net_pay - $total_paid) <= 0 ? 'paid' : ($total_paid > 0 ? 'partially_paid' : 'unpaid'),
                'payment_date' => $validated['payment_date'],
            ]);
        });

        return redirect()->back()->with('success', 'Salary updated successfully.');
    }

    // 🟢 Keep this method for adding FUTURE payments to an existing payslip
    public function addPayment(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);
        
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount'     => 'required|numeric|min:1|max:' . $salary->due_amount,
            'date'       => 'required|date',
            'note'       => 'nullable|string'
        ]);

        DB::transaction(function () use ($salary, $validated) {
            $account = Account::findOrFail($validated['account_id']);
            $account->decrement('current_balance', $validated['amount']);

            $salary->transactions()->create([
                'account_id'       => $account->id,
                'type'             => 'debit',
                'amount'           => $validated['amount'],
                'transaction_date' => $validated['date'],
                'description'      => "Salary Installment Paid for " . $salary->month_year . " - " . ($validated['note'] ?? ''),
            ]);

            $salary->paid_amount += $validated['amount'];
            $salary->due_amount -= $validated['amount'];
            $salary->status = $salary->due_amount <= 0 ? 'paid' : 'partially_paid';
            $salary->save();
        });

        return redirect()->back()->with('success', 'Payment installment added successfully.');
    }

    public function destroy(string $id)
    {
        $salary = Salary::findOrFail($id);

        DB::transaction(function () use ($salary) {
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