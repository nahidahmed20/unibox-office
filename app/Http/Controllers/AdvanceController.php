<?php

namespace App\Http\Controllers;

use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\Account;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AdvanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Advance::query()->with(['account', 'user']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('user', function ($q2) use ($searchTerm) {
                    $q2->where('name', 'like', "%{$searchTerm}%");
                })->orWhere('purpose', 'like', "%{$searchTerm}%");
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $advances = $query->latest()->paginate($perPage)->withQueryString();

        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();
        $employees = User::whereHas('employeeProfile')->select('id', 'name')->get();

        return Inertia::render('Admin/Advances/Index', [
            'advances'   => $advances,
            'filters'    => $request->only('search', 'per_page'),
            'accounts'   => $accounts,
            'employees'  => $employees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'user_id'    => 'required|exists:users,id',
            'amount'     => 'required|numeric|min:1',
            'date'       => 'required|date',
            'purpose'    => 'nullable|string|max:255',
            'status'     => 'required|in:unsettled,settled',
            'notes'      => 'nullable|string',
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $account = Account::findOrFail($validated['account_id']);
                if ($account->current_balance < $validated['amount']) {
                    throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                }

                $account->current_balance -= $validated['amount'];
                $account->save();

                $validated['logged_by'] = auth()->id();
                $validated['settled_amount'] = 0;
                $validated['returned_amount'] = 0;

                Advance::create($validated);

                // --- Pooled balance sync ---
                $balance = AdvanceBalance::firstOrCreate(['user_id' => $validated['user_id']]);
                $balance->increment('total_given', $validated['amount']);
            });

            return redirect()->back()->with('success', 'Advance logged successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, string $id)
    {
        $advance = Advance::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'user_id'    => 'required|exists:users,id',
            'amount'     => 'required|numeric|min:1',
            'date'       => 'required|date',
            'purpose'    => 'nullable|string|max:255',
            'status'     => 'required|in:unsettled,settled',
            'notes'      => 'nullable|string',
        ]);

        try {
            DB::transaction(function () use ($advance, $validated) {

                // --- Account balance adjustment ---
                if ($advance->account_id != $validated['account_id']) {
                    $oldAccount = Account::findOrFail($advance->account_id);
                    $oldAccount->current_balance += $advance->amount;
                    $oldAccount->save();

                    $newAccount = Account::findOrFail($validated['account_id']);
                    if ($newAccount->current_balance < $validated['amount']) {
                        throw new \Exception('নতুন অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                    $newAccount->current_balance -= $validated['amount'];
                    $newAccount->save();
                } elseif ($advance->amount != $validated['amount']) {
                    $account = Account::findOrFail($advance->account_id);
                    $difference = $validated['amount'] - $advance->amount;

                    if ($difference > 0 && $account->current_balance < $difference) {
                        throw new \Exception('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
                    }
                    $account->current_balance -= $difference;
                    $account->save();
                }

                // --- Pooled balance (per-employee) sync ---
                $oldUserId = $advance->user_id;
                $newUserId = $validated['user_id'];
                $oldAmount = (float) $advance->amount;
                $newAmount = (float) $validated['amount'];
                $settled   = (float) $advance->settled_amount;
                $returned  = (float) $advance->returned_amount;

                if ($oldUserId != $newUserId) {
                    $oldBalance = AdvanceBalance::where('user_id', $oldUserId)->first();
                    if ($oldBalance) {
                        $oldBalance->decrement('total_given', $oldAmount);
                        $oldBalance->decrement('total_used', $settled);
                        $oldBalance->decrement('total_returned', $returned);
                    }

                    $newBalance = AdvanceBalance::firstOrCreate(['user_id' => $newUserId]);
                    $newBalance->increment('total_given', $newAmount);
                    $newBalance->increment('total_used', $settled);
                    $newBalance->increment('total_returned', $returned);
                } elseif ($oldAmount != $newAmount) {
                    $balance = AdvanceBalance::where('user_id', $oldUserId)->first();
                    if ($balance) {
                        $balance->increment('total_given', $newAmount - $oldAmount);
                    }
                }

                $advance->update($validated);
            });

            return redirect()->back()->with('success', 'Advance updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function returnMoney(Request $request, string $id)
    {
        $advance = Advance::findOrFail($id);

        $validated = $request->validate([
            'return_amount' => 'required|numeric|min:1',
        ]);

        try {
            DB::transaction(function () use ($advance, $validated) {
                $advance->returned_amount += $validated['return_amount'];

                if (($advance->settled_amount + $advance->returned_amount) >= $advance->amount) {
                    $advance->status = 'settled';
                }
                $advance->save();

                $account = Account::find($advance->account_id);
                if ($account) {
                    $account->current_balance += $validated['return_amount'];
                    $account->save();
                }

                // --- Pooled balance sync ---
                AdvanceBalance::where('user_id', $advance->user_id)
                    ->increment('total_returned', $validated['return_amount']);
            });

            return redirect()->back()->with('success', 'Money returned to account successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy(string $id)
    {
        $advance = Advance::findOrFail($id);
        if ((float) $advance->settled_amount > 0) {
            return redirect()->back()->withErrors([
                'error' => 'এই Advance থেকে ইতিমধ্যে ' . number_format($advance->settled_amount, 2) . ' টাকা প্রজেক্ট এক্সপেন্সে খরচ হয়ে গেছে। এই রেকর্ড ডিলিট করলে হিসাব গণ্ডগোল হবে। আগে সংশ্লিষ্ট এক্সপেন্স এন্ট্রিগুলো ঠিক করুন বা মুছুন, তারপর এই advance ডিলিট করুন।'
            ]);
        }

        try {
            DB::transaction(function () use ($advance) {
                $returned = (float) ($advance->returned_amount ?? 0);
                $refund_amount = (float) $advance->amount - $returned;

                if ($refund_amount > 0 && $advance->account_id) {
                    $account = Account::find($advance->account_id);
                    if ($account) {
                        $account->current_balance += $refund_amount;
                        $account->save();
                    }
                }

                $balance = AdvanceBalance::where('user_id', $advance->user_id)->first();
                if ($balance) {
                    $balance->decrement('total_given', $advance->amount);
                    $balance->decrement('total_returned', $returned);
                }

                $advance->delete();
            });

            return redirect()->back()->with('success', 'Advance deleted and full amount refunded to account.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function employeeLedger($userId)
    {
        $employee = User::with('employeeProfile')
            ->withSum('advances', 'amount')
            ->withSum('advances', 'settled_amount')
            ->withSum('advances', 'returned_amount')
            ->findOrFail($userId);

        $advancesHistory = Advance::where('user_id', $userId)->latest()->get();

        $totalAdvance = $employee->advances_sum_amount ?? 0;
        $totalSettled = $employee->advances_sum_settled_amount ?? 0;
        $totalReturned = $employee->advances_sum_returned_amount ?? 0;

        $currentDue = $totalAdvance - ($totalSettled + $totalReturned);

        return Inertia::render('Admin/Advances/Ledger', [
            'employee' => $employee,
            'advancesHistory' => $advancesHistory,
            'summary' => [
                'total_advance'  => $totalAdvance,
                'total_settled'  => $totalSettled,
                'total_returned' => $totalReturned,
                'current_due'    => $currentDue,
            ],
        ]);
    }
}