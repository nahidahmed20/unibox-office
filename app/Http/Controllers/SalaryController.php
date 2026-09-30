<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Salary;
use App\Models\User;
use App\Models\AdvanceBalance;
use App\Models\Advance;
use App\Models\AdvanceSettlement; // 🟢 Added this model
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

        $employeeBalances = User::select('id')
            ->has('advances')
            ->withSum('advances', 'amount')
            ->withSum('advances', 'settled_amount')
            ->withSum('advances', 'returned_amount')
            ->get()
            ->keyBy('id');

        $users->each(function ($user) use ($employeeBalances) {
            if ($employeeBalances->has($user->id)) {
                $emp = $employeeBalances->get($user->id);
                $given = (float)($emp->advances_sum_amount ?? 0);
                $settled = (float)($emp->advances_sum_settled_amount ?? 0);
                $returned = (float)($emp->advances_sum_returned_amount ?? 0);
                $user->setAttribute('advance_balance', round($given - ($settled + $returned), 2));
            } else {
                $user->setAttribute('advance_balance', 0);
            }
        });

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
            'status'            => 'required|in:unpaid,paid,partially_paid',
            'payment_date'      => 'nullable|date',
            'payments'          => 'exclude_if:status,unpaid|nullable|array',
            'payments.*.account_id' => 'exclude_if:status,unpaid|nullable|exists:accounts,id',
            'payments.*.bank_charge' => 'exclude_if:status,unpaid|nullable|numeric|decimal:0,2|min:0',
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

            if ($validated['status'] !== 'unpaid' && $request->has('payments')) {
                foreach ($validated['payments'] ?? [] as $payment) {
                    if ($payment['amount'] > 0) {
                        if (empty($payment['account_id'])) throw ValidationException::withMessages(['payments' => 'Select an account for each payment.']);

                        $salaryAmount = round((float) $payment['amount'], 2);
                        $charge = round((float) ($payment['bank_charge'] ?? 0), 2);

                        $account = Account::whereKey($payment['account_id'])->lockForUpdate()->firstOrFail();
                        if ((float) $account->current_balance < $salaryAmount + $charge) {
                            throw ValidationException::withMessages(['payments' => "Insufficient balance in {$account->name}."]);
                        }
                        $account->decrement('current_balance', $salaryAmount + $charge);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $salaryAmount + $charge,
                            'bank_charge'      => $charge,
                            'transaction_date' => $validated['payment_date'] ?? now(),
                            'description'      => "Salary Payment: " . $salary->month_year,
                        ]);

                        $total_paid += $salaryAmount;
                    }
                }
            }

            $advanceAmount = (float) ($validated['advance_deduction'] ?? 0);
            if ($advanceAmount > 0) {
                // 🟢 Passed $salary to create Settlement record
                $this->consumeAdvance($salary->user_id, $advanceAmount, $salary);
            }

            $salary->paid_amount = $total_paid;
            $salary->due_amount = $net_pay - $total_paid;
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
            'status'            => 'required|in:unpaid,paid,partially_paid',
            'payment_date'      => 'nullable|date',
            'payments'          => 'exclude_if:status,unpaid|nullable|array',
            'payments.*.account_id' => 'exclude_if:status,unpaid|nullable|exists:accounts,id',
            'payments.*.bank_charge' => 'exclude_if:status,unpaid|nullable|numeric|decimal:0,2|min:0',
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
            
            if ($salary->advance_deduction > 0) {
                // 🟢 Passed $salary to reverse Settlement record
                $this->refundAdvance($salary->user_id, $salary->advance_deduction, $salary);
            }

            foreach ($salary->transactions as $txn) {
                $account = Account::find($txn->account_id);
                if ($account) {
                    $account->increment('current_balance', $txn->amount);
                }
                $txn->delete();
            }

            $total_paid = 0;

            if ($validated['status'] !== 'unpaid' && $request->has('payments')) {
                foreach ($validated['payments'] ?? [] as $payment) {
                    if ($payment['amount'] > 0) {
                        if (empty($payment['account_id'])) throw ValidationException::withMessages(['payments' => 'Select an account for each payment.']);

                        $salaryAmount = round((float) $payment['amount'], 2);
                        $charge = round((float) ($payment['bank_charge'] ?? 0), 2);

                        $account = Account::whereKey($payment['account_id'])->lockForUpdate()->firstOrFail();
                        if ((float) $account->current_balance < $salaryAmount + $charge) {
                            throw ValidationException::withMessages(['payments' => "Insufficient balance in {$account->name}."]);
                        }
                        $account->decrement('current_balance', $salaryAmount + $charge);

                        $salary->transactions()->create([
                            'account_id'       => $account->id,
                            'type'             => 'debit',
                            'amount'           => $salaryAmount + $charge,
                            'bank_charge'      => $charge,
                            'transaction_date' => $validated['payment_date'] ?? now(),
                            'description'      => "Salary Payment Updated: " . $salary->month_year
                        ]);

                        $total_paid += $salaryAmount;
                    }
                }
            }

            $newAdvanceAmount = (float) ($validated['advance_deduction'] ?? 0);
            if ($newAdvanceAmount > 0) {
                // 🟢 Passed $salary to create Settlement record
                $this->consumeAdvance($validated['user_id'], $newAdvanceAmount, $salary);
            }

            $salary->update([
                'user_id'           => $validated['user_id'],
                'month_year'        => $validated['month_year'],
                'basic_salary'      => $validated['basic_salary'] ?? 0,
                'allowances'        => $validated['allowances'] ?? 0,
                'bonus'             => $validated['bonus'] ?? 0,
                'deductions'        => $validated['deductions'] ?? 0,
                'advance_deduction' => $newAdvanceAmount,
                'net_pay'           => $net_pay,
                'paid_amount'       => $total_paid,
                'due_amount'        => $net_pay - $total_paid,
                'status'            => ($net_pay - $total_paid) <= 0 ? 'paid' : 'unpaid',
                'payment_date'      => $validated['payment_date'] ?? null,
            ]);
        });

        return redirect()->back()->with('success', 'Salary updated successfully.');
    }

    public function addPayment(Request $request, string $id)
    {
        $salary = Salary::findOrFail($id);

        $validated = $request->validate([
            'date'       => 'required|date',
            'note'       => 'nullable|string',
            'advance_deduction' => 'nullable|numeric|decimal:0,2|min:0',
            'payments'   => 'nullable|array',
            'payments.*.account_id' => 'required_with:payments|exists:accounts,id',
            'payments.*.amount'     => 'required_with:payments|numeric|decimal:0,2|min:1',
            'payments.*.bank_charge'=> 'nullable|numeric|decimal:0,2|min:0',
        ]);

        DB::transaction(function () use ($salary, $validated) {
            $salary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();

            $totalBankPaymentAmount = collect($validated['payments'] ?? [])->sum('amount');
            $advanceCutAmount = (float) ($validated['advance_deduction'] ?? 0);
            
            $totalPaymentAmount = $totalBankPaymentAmount + $advanceCutAmount;

            if ($totalPaymentAmount <= 0) {
                throw ValidationException::withMessages(['payments' => 'Please provide a payment amount or advance deduction.']);
            }

            if (round($totalPaymentAmount, 2) > round($salary->due_amount, 2)) {
                throw ValidationException::withMessages(['payments' => 'Total payment splits and advance deduction cannot exceed the remaining due amount.']);
            }

            if ($advanceCutAmount > 0) {
                // 🟢 Passed $salary to create Settlement record
                $this->consumeAdvance($salary->user_id, $advanceCutAmount, $salary);
                $salary->advance_deduction += $advanceCutAmount;
                $salary->paid_amount += $advanceCutAmount;
                $salary->due_amount -= $advanceCutAmount;
            }

            if (!empty($validated['payments'])) {
                foreach ($validated['payments'] as $payment) {
                    if (empty($payment['account_id'])) throw ValidationException::withMessages(['payments' => 'Select an account for each payment.']);
                    
                    $salaryAmount = round((float) $payment['amount'], 2);
                    $charge = round((float) ($payment['bank_charge'] ?? 0), 2);

                    $account = Account::whereKey($payment['account_id'])->lockForUpdate()->firstOrFail();
                    if ((float) $account->current_balance < $salaryAmount + $charge) {
                        throw ValidationException::withMessages(['payments' => "Insufficient balance in {$account->name}."]);
                    }
                    $account->decrement('current_balance', $salaryAmount + $charge);

                    $salary->transactions()->create([
                        'account_id'       => $account->id,
                        'type'             => 'debit',
                        'amount'           => $salaryAmount + $charge,
                        'bank_charge'      => $charge,
                        'transaction_date' => $validated['date'],
                        'description'      => "Salary Installment Paid for " . $salary->month_year . " - " . ($validated['note'] ?? ''),
                    ]);

                    $salary->paid_amount += $salaryAmount;
                    $salary->due_amount -= $salaryAmount;
                }
            }

            $salary->status = $salary->due_amount <= 0 ? 'paid' : 'unpaid';
            $salary->save();
        });

        return redirect()->back()->with('success', 'Due Payment processed successfully.');
    }

    public function destroy(string $id)
    {
        $salary = Salary::findOrFail($id);

        DB::transaction(function () use ($salary) {
            $salary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();

            if ($salary->advance_deduction > 0) {
                // 🟢 Passed $salary to reverse Settlement record
                $this->refundAdvance($salary->user_id, $salary->advance_deduction, $salary);
            }

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

    // 🟢 Updated to accept $settleable and create AdvanceSettlement
    private function consumeAdvance(int $userId, float $amount, $settleable): void
    {
        $remaining = $amount;
        $advances = Advance::where('user_id', $userId)
            ->where('status', 'unsettled')
            ->whereRaw('(amount - settled_amount - returned_amount) > 0')
            ->orderBy('date')
            ->lockForUpdate()
            ->get();

        foreach ($advances as $advance) {
            if ($remaining <= 0) break;

            $available = (float) $advance->amount - (float) $advance->settled_amount - (float) $advance->returned_amount;
            $deduct = min($available, $remaining);

            $advance->settled_amount += $deduct;
            if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                $advance->status = 'settled';
            }
            $advance->save();

            // 🟢 Create Settlement Record for Ledger
            AdvanceSettlement::create([
                'advance_id'      => $advance->id,
                'settleable_type' => get_class($settleable),
                'settleable_id'   => $settleable->id,
                'amount'          => $deduct,
            ]);

            $remaining -= $deduct;
        }

        if ($remaining > 0.009) {
            throw new \Exception('কর্মীর পর্যাপ্ত অ্যাডভান্স ব্যালেন্স নেই!');
        }

        AdvanceBalance::where('user_id', $userId)->increment('total_used', $amount);
    }

    // 🟢 Updated to accept $settleable and delete AdvanceSettlement
    private function refundAdvance(int $userId, float $amount, $settleable): void
    {
        $remaining = $amount;
        $advances = Advance::where('user_id', $userId)
            ->where('settled_amount', '>', 0)
            ->orderBy('date', 'desc')
            ->lockForUpdate()
            ->get();

        foreach ($advances as $advance) {
            if ($remaining <= 0) break;

            $refundable = min((float) $advance->settled_amount, $remaining);
            $advance->settled_amount -= $refundable;

            if ($advance->status === 'settled' && ($advance->settled_amount + $advance->returned_amount) < $advance->amount) {
                $advance->status = 'unsettled';
            }
            $advance->save();

            $remaining -= $refundable;
        }

        if ($remaining > 0.009) {
            throw new \Exception('Advance history cannot be safely reversed.');
        }

        AdvanceBalance::where('user_id', $userId)->decrement('total_used', $amount);

        // 🟢 Remove Settlement Record from Ledger
        AdvanceSettlement::where('settleable_type', get_class($settleable))
            ->where('settleable_id', $settleable->id)
            ->delete();
    }
}