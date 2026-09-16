<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Salary;
use App\Models\User;
use App\Models\AdvanceBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Support\Pagination;
use Illuminate\Validation\ValidationException;

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

        $totals = [];
        foreach (['net_pay', 'paid_amount', 'due_amount'] as $column) $totals[$column] = (float) (clone $query)->sum($column);
        $perPage = Pagination::perPage($request, $query);
        $salaries = $query->latest()->paginate($perPage)->withQueryString();

        $users = User::select('id', 'name')
            ->with(['employeeProfile' => function ($q) {
                $q->select('user_id', 'basic_salary');
            }])
            ->orderBy('name')
            ->get();

        $balances = AdvanceBalance::all()->keyBy('user_id');
        $users->each(fn ($user) => $user->setAttribute('advance_balance', round($balances->get($user->id)?->balance ?? 0, 2)));

        $accounts = Account::where('is_active', true)->get();

        return Inertia::render('Admin/Salaries/Index', [
            'salaries' => $salaries,
            'totals' => $totals,
            'users'    => $users,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'           => 'required|exists:users,id',
            'month_year'        => 'required|string',
            'basic_salary'      => 'nullable|numeric|decimal:0,2|min:0',
            'allowances'        => 'nullable|numeric|decimal:0,2|min:0',
            'bonus'             => 'nullable|numeric|decimal:0,2|min:0',
            'deductions'        => 'nullable|numeric|decimal:0,2|min:0',
            'advance_deduction' => 'nullable|numeric|decimal:0,2|min:0',
            'status'            => 'required|in:unpaid,paid',
            'payment_date'      => 'nullable|date',
            'payments'          => 'exclude_if:status,unpaid|nullable|array',
            'payments.*.account_id' => 'exclude_if:status,unpaid|required_with:payments|exists:accounts,id',
            'payments.*.amount'     => 'exclude_if:status,unpaid|required_with:payments|numeric|decimal:0,2|min:0',
        ]);

        $net_pay = ($validated['basic_salary'] ?? 0) + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0) - ($validated['advance_deduction'] ?? 0);
        $net_pay = round($net_pay, 2);

        if ($net_pay < 0) throw ValidationException::withMessages(['deductions' => 'Deductions cannot exceed gross salary.']);

        $requestedTotal = collect($validated['payments'] ?? [])->sum(fn ($payment) => (float) ($payment['amount'] ?? 0));
        if ($requestedTotal > $net_pay) {
            return back()->withErrors(['payments' => 'Salary payments cannot exceed net pay.']);
        }

        DB::transaction(function () use ($validated, $net_pay, $request) {
            $salary = Salary::create([
                'user_id'      => $validated['user_id'],
                'month_year'   => $validated['month_year'],
                'basic_salary' => $validated['basic_salary'] ?? 0,
                'allowances'   => $validated['allowances'] ?? 0,
                'bonus'        => $validated['bonus'] ?? 0,
                'deductions'   => $validated['deductions'] ?? 0,
                'advance_deduction' => $validated['advance_deduction'] ?? 0,
                'net_pay'      => $net_pay,
                'paid_amount'  => 0,
                'due_amount'   => $net_pay,
                'status'       => 'unpaid',
                'payment_date' => $validated['payment_date'] ?? null,
            ]);

            $total_paid = 0;

            if ($validated['status'] === 'paid' && $request->has('payments')) {
                foreach ($validated['payments'] ?? [] as $payment) {
                    if ($payment['amount'] > 0) {
                        if (empty($payment['account_id'])) throw ValidationException::withMessages(['payments' => 'Select an account for each payment.']);

                        $salaryAmount = round((float) $payment['amount'], 2);

                        $account = Account::whereKey($payment['account_id'])->lockForUpdate()->firstOrFail();
                        if ((float) $account->current_balance < $salaryAmount) {
                            throw ValidationException::withMessages(['payments' => "Insufficient balance in {$account->name}."]);
                        }
                        $account->decrement('current_balance', $salaryAmount);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $salaryAmount,
                            'transaction_date' => $validated['payment_date'] ?? now(),
                            'description'      => "Salary Payment: " . $salary->month_year,
                        ]);

                        $total_paid += $salaryAmount;
                    }
                }
            }

            app(\App\Services\AdvanceSettlementService::class)->consume($salary, $salary->user_id, (float) ($validated['advance_deduction'] ?? 0));

            $salary->paid_amount = $total_paid;
            $salary->due_amount = $net_pay - $total_paid;

            // 🟢 MAGIC: Always save as 'paid' or 'unpaid' in Database
            $salary->status = $salary->due_amount <= 0 ? 'paid' : 'unpaid';
            $salary->save();
        });

        return redirect()->back()->with('success', 'Salary processed successfully.');
    }

    public function update(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);

        $validated = $request->validate([
            'user_id'           => 'required|exists:users,id',
            'month_year'        => 'required|string',
            'basic_salary'      => 'nullable|numeric|decimal:0,2|min:0',
            'allowances'        => 'nullable|numeric|decimal:0,2|min:0',
            'bonus'             => 'nullable|numeric|decimal:0,2|min:0',
            'deductions'        => 'nullable|numeric|decimal:0,2|min:0',
            'advance_deduction' => 'nullable|numeric|decimal:0,2|min:0',
            'status'            => 'required|in:unpaid,paid',
            'payment_date'      => 'nullable|date',
            'payments'          => 'exclude_if:status,unpaid|nullable|array',
            'payments.*.account_id' => 'exclude_if:status,unpaid|required_with:payments|exists:accounts,id',
            'payments.*.amount'     => 'exclude_if:status,unpaid|required_with:payments|numeric|decimal:0,2|min:0',
        ]);

        $net_pay = ($validated['basic_salary'] ?? 0) + ($validated['allowances'] ?? 0) + ($validated['bonus'] ?? 0) - ($validated['deductions'] ?? 0) - ($validated['advance_deduction'] ?? 0);
        $net_pay = round($net_pay, 2);
        if ($net_pay < 0) throw ValidationException::withMessages(['deductions' => 'Deductions cannot exceed gross salary.']);

        $requestedTotal = collect($validated['payments'] ?? [])->sum(fn ($payment) => (float) ($payment['amount'] ?? 0));
        if ($requestedTotal > $net_pay) {
            return back()->withErrors(['payments' => 'Salary payments cannot exceed net pay.']);
        }

        DB::transaction(function () use ($salary, $validated, $net_pay, $request) {
            $salary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();
            app(\App\Services\AdvanceSettlementService::class)->refund($salary);

            foreach ($salary->transactions as $txn) {
                $account = Account::find($txn->account_id);
                if ($account) {
                    $account->increment('current_balance', $txn->amount);
                }
                $txn->delete();
            }

            $total_paid = 0;

            if ($validated['status'] === 'paid' && $request->has('payments')) {
                foreach ($validated['payments'] ?? [] as $payment) {
                    if ($payment['amount'] > 0) {
                        if (empty($payment['account_id'])) throw ValidationException::withMessages(['payments' => 'Select an account for each payment.']);

                        $salaryAmount = round((float) $payment['amount'], 2);

                        $account = Account::whereKey($payment['account_id'])->lockForUpdate()->firstOrFail();
                        if ((float) $account->current_balance < $salaryAmount) {
                            throw ValidationException::withMessages(['payments' => "Insufficient balance in {$account->name}."]);
                        }
                        $account->decrement('current_balance', $salaryAmount);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $salaryAmount,
                            'transaction_date' => $validated['payment_date'] ?? now(),
                            'description'      => "Salary Payment Updated: " . $salary->month_year
                        ]);

                        $total_paid += $salaryAmount;
                    }
                }
            }

            $salary->update([
                'user_id'           => $validated['user_id'],
                'month_year'        => $validated['month_year'],
                'basic_salary'      => $validated['basic_salary'] ?? 0,
                'allowances'        => $validated['allowances'] ?? 0,
                'bonus'             => $validated['bonus'] ?? 0,
                'deductions'        => $validated['deductions'] ?? 0,
                'advance_deduction' => $validated['advance_deduction'] ?? 0,
                'net_pay'           => $net_pay,
                'paid_amount'       => $total_paid,
                'due_amount'        => $net_pay - $total_paid,
                'status'            => ($net_pay - $total_paid) <= 0 ? 'paid' : 'unpaid',
                'payment_date'      => $validated['payment_date'] ?? null,
            ]);
            app(\App\Services\AdvanceSettlementService::class)->consume($salary, $salary->user_id, (float) ($validated['advance_deduction'] ?? 0));
        });

        return redirect()->back()->with('success', 'Salary updated successfully.');
    }

    public function addPayment(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount'     => 'required|numeric|decimal:0,2|min:1|max:' . $salary->due_amount,
            'date'       => 'required|date',
            'note'       => 'nullable|string'
        ]);

        DB::transaction(function () use ($salary, $validated) {
            $salary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();
            if (round($validated['amount'], 2) > round($salary->due_amount, 2)) throw ValidationException::withMessages(['amount' => 'Payment cannot exceed salary due.']);

            $salaryAmount = round((float) $validated['amount'], 2);

            $account = Account::whereKey($validated['account_id'])->lockForUpdate()->firstOrFail();
            if ((float) $account->current_balance < $salaryAmount) {
                throw ValidationException::withMessages(['account_id' => 'Selected account has insufficient balance.']);
            }
            $account->decrement('current_balance', $salaryAmount);

            $salary->transactions()->create([
                'account_id'       => $account->id,
                'type'             => 'debit',
                'amount'           => $salaryAmount,
                'transaction_date' => $validated['date'],
                'description'      => "Salary Installment Paid for " . $salary->month_year . " - " . ($validated['note'] ?? ''),
            ]);

            $salary->paid_amount += $salaryAmount;
            $salary->due_amount -= $salaryAmount;

            // 🟢 MAGIC: Always save as 'paid' or 'unpaid' in Database
            $salary->status = $salary->due_amount <= 0 ? 'paid' : 'unpaid';
            $salary->save();
        });

        return redirect()->back()->with('success', 'Payment installment added successfully.');
    }

    public function destroy(string $id)
    {
        $salary = Salary::findOrFail($id);

        DB::transaction(function () use ($salary) {
            $salary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();

            app(\App\Services\AdvanceSettlementService::class)->refund($salary);

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
