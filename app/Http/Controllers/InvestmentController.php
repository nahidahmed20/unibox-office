<?php
namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Investor;
use App\Models\InvestmentPayment;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvestmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Investment::with(['account', 'investor'])
            ->withSum('payments as returned_principal', 'principal_amount')
            ->withSum('payments as returned_profit', 'profit_amount'); 

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->whereHas('investor', function($iq) use ($searchTerm) {
                    $iq->where('name', 'like', '%' . $searchTerm . '%');
                })
                ->orWhere('purpose', 'like', '%' . $searchTerm . '%');
            });
        }

        $totalAmount = (clone $query)->sum('amount');
        $totalReturned = InvestmentPayment::whereIn('investment_id', (clone $query)->pluck('id'))->sum('principal_amount');
        $totalProfitPaid = InvestmentPayment::whereIn('investment_id', (clone $query)->pluck('id'))->sum('profit_amount');
        $totalCount = (clone $query)->count();

        $perPage = $request->input('per_page') === 'all' ? ($totalCount > 0 ? $totalCount : 1) : \App\Support\Pagination::perPage($request, $query);

        $investments = $query->latest()->paginate($perPage)->through(function ($inv) {
            $inv->due_amount = max($inv->amount - ($inv->returned_principal ?? 0), 0);
            return $inv;
        })->withQueryString();
        $investmentIds = $investments->pluck('id');
        $investmentTransactions = Transaction::where('transactionable_type', Investment::class)
            ->whereIn('transactionable_id', $investmentIds)->where('type', 'credit')->orderBy('id')->get()->groupBy('transactionable_id');
        $investments->getCollection()->each(function ($investment) use ($investmentTransactions) {
            $investment->account_payments = ($investmentTransactions[$investment->id] ?? collect())->map(fn ($transaction) => [
                'account_id' => $transaction->account_id,
                'amount' => (float) $transaction->amount,
            ])->values();
        });
        
        $accounts = Account::where('is_active', true)->get(['id', 'name', 'current_balance']);
        $existingInvestors = Investor::select('name', 'phone', 'type')->get(); // For Auto-suggest

        return Inertia::render('Admin/Investments/Index', [
            'investments' => $investments,
            'accounts' => $accounts, 
            'existingInvestors' => $existingInvestors,
            'filters' => $request->only(['search', 'per_page']),
            'totalAmount' => $totalAmount,
            'totalReturned' => $totalReturned,
            'totalProfitPaid' => $totalProfitPaid,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'investor_name'   => 'required|string|max:255',
            'investor_phone'  => 'nullable|string|max:20',
            'investor_type'   => 'required|in:owner,partner,lender',
            'investment_type' => 'required|in:equity,loan',
            'account_id'      => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'amount'          => 'required|numeric|min:1',
            'date'            => 'required|date',
            'purpose'         => 'nullable|string|max:255',
            'note'            => 'nullable|string',
        ]);
        $allocations = app(\App\Services\AccountAllocationService::class)->fromRequest($validated, (float) $validated['amount']);
        $validated['account_id'] = $allocations[0]['account_id'];
        unset($validated['account_payments']);

        DB::transaction(function () use ($validated, $allocations) {
            $investor = Investor::firstOrCreate(
                ['name' => $validated['investor_name']],
                ['phone' => $validated['investor_phone'], 'type' => $validated['investor_type']]
            );

            $investment = new Investment([
                'investor_id'     => $investor->id,
                'account_id'      => $validated['account_id'],
                'investment_type' => $validated['investment_type'],
                'amount'          => $validated['amount'],
                'date'            => $validated['date'],
                'purpose'         => $validated['purpose'],
                'note'            => $validated['note'],
                'status'          => 'active',
            ]);
            \App\Observers\AccountMovementObserver::suppress($investment);
            $investment->save();
            app(\App\Services\AccountAllocationService::class)->replace(
                $investment, $allocations, 'credit', $validated['date'],
                'Investment/Loan received from ' . $investor->name . ($validated['purpose'] ? " ({$validated['purpose']})" : '')
            );
        });

        return redirect()->back()->with('success', 'Investment logged successfully.');
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'investor_name'   => 'required|string|max:255',
            'investor_phone'  => 'nullable|string|max:20',
            'investor_type'   => 'required|in:owner,partner,lender',
            'investment_type' => 'required|in:equity,loan',
            'account_id'      => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'amount'          => 'required|numeric|min:1',
            'date'            => 'required|date',
            'purpose'         => 'nullable|string|max:255',
            'note'            => 'nullable|string',
        ]);
        $allocations = app(\App\Services\AccountAllocationService::class)->fromRequest($validated, (float) $validated['amount']);
        $validated['account_id'] = $allocations[0]['account_id'];
        unset($validated['account_payments']);

        DB::transaction(function () use ($validated, $id, $allocations) {
            $investment = Investment::lockForUpdate()->findOrFail($id);
            $returnedPrincipal = (float) InvestmentPayment::where('investment_id', $investment->id)->sum('principal_amount');
            if ((float) $validated['amount'] < $returnedPrincipal) {
                throw ValidationException::withMessages([
                    'amount' => "Investment amount cannot be less than returned principal ({$returnedPrincipal} TK).",
                ]);
            }

            $service = app(\App\Services\AccountAllocationService::class);
            $credits = Transaction::where('transactionable_type', $investment->getMorphClass())
                ->where('transactionable_id', $investment->id)->where('type', 'credit')->lockForUpdate()->get();
            if ($credits->isNotEmpty() && abs((float) $credits->sum('amount') - (float) $investment->amount) < 0.001) {
                $service->reverse($investment, 'credit');
            } elseif ((float) $investment->amount > 0 && $investment->account_id) {
                Account::whereKey($investment->account_id)->lockForUpdate()->decrement('current_balance', $investment->amount);
                $credits->each->delete();
            }

            $investor = Investor::firstOrCreate(
                ['name' => $validated['investor_name']],
                ['phone' => $validated['investor_phone'], 'type' => $validated['investor_type']]
            );

            \App\Observers\AccountMovementObserver::suppress($investment);
            $investment->update([
                'investor_id'     => $investor->id,
                'account_id'      => $validated['account_id'],
                'investment_type' => $validated['investment_type'],
                'amount'          => $validated['amount'],
                'date'            => $validated['date'],
                'purpose'         => $validated['purpose'],
                'note'            => $validated['note'],
                'status'          => (float)$validated['amount'] <= $returnedPrincipal ? 'fully_paid' : 'active',
            ]);

            $service->replace(
                $investment, $allocations, 'credit', $validated['date'],
                'Investment/Loan received from ' . $investor->name . ($validated['purpose'] ? " ({$validated['purpose']})" : '')
            );
        });

        return redirect()->back()->with('success', 'Investment updated successfully.');
    }
    
    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $investment = Investment::with(['payments', 'transaction'])->lockForUpdate()->findOrFail($id);

                if ($investment->payments->count() > 0) {
                    throw new \Exception("Cannot delete! Money has already been partially or fully returned.");
                }

                $service = app(\App\Services\AccountAllocationService::class);
                $credits = Transaction::where('transactionable_type', $investment->getMorphClass())
                    ->where('transactionable_id', $investment->id)->where('type', 'credit')->lockForUpdate()->get();
                if ($credits->isNotEmpty() && abs((float) $credits->sum('amount') - (float) $investment->amount) < 0.001) {
                    $service->reverse($investment, 'credit');
                } elseif ($investment->account_id && $investment->amount > 0) {
                    $account = Account::lockForUpdate()->find($investment->account_id);
                    if ($account && (float) $account->current_balance < (float) $investment->amount) {
                        throw new \Exception("Insufficient account balance to reverse this investment.");
                    }
                    $account?->decrement('current_balance', $investment->amount);
                    $credits->each->delete();
                }

                $investment->delete();
            });
            return redirect()->back()->with('success', 'Record deleted completely.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function returnMoney(Request $request, $id)
    {
        $validated = $request->validate([
            'account_id'       => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'principal_amount' => 'required|numeric|min:0',
            'profit_amount'    => 'required|numeric|min:0',
            'payment_date'     => 'required|date',
            'note'             => 'nullable|string',
        ]);
        $totalPayable = (float) $validated['principal_amount'] + (float) $validated['profit_amount'];
        $allocations = app(\App\Services\AccountAllocationService::class)->fromRequest($validated, $totalPayable);
        $validated['account_id'] = $allocations[0]['account_id'];

        DB::transaction(function () use ($validated, $id, $allocations) {
            $investment = Investment::with('investor')->lockForUpdate()->findOrFail($id);
            $returnedPrincipal = (float) InvestmentPayment::where('investment_id', $id)->sum('principal_amount');
            $duePrincipal = max((float) $investment->amount - $returnedPrincipal, 0);
            $principal = (float) $validated['principal_amount'];
            $profit = (float) $validated['profit_amount'];
            $totalPayable = $principal + $profit;

            if ($totalPayable <= 0) {
                throw ValidationException::withMessages(['principal_amount' => 'Principal or profit amount is required.']);
            }
            if ($principal > $duePrincipal) {
                throw ValidationException::withMessages(['principal_amount' => "Principal return cannot exceed due principal ({$duePrincipal} TK)."]);
            }

            $payment = new InvestmentPayment([
                'investor_id'      => $investment->investor_id,
                'investment_id'    => $investment->id,
                'account_id'       => $validated['account_id'],
                'principal_amount' => $validated['principal_amount'],
                'profit_amount'    => $validated['profit_amount'],
                'total_amount'     => $totalPayable,
                'payment_date'     => $validated['payment_date'],
                'note'             => $validated['note'],
            ]);
            \App\Observers\AccountMovementObserver::suppress($payment);
            $payment->save();

            $totalPrincipalPaid = InvestmentPayment::where('investment_id', $id)->sum('principal_amount');
            if ($totalPrincipalPaid >= $investment->amount) {
                \App\Observers\AccountMovementObserver::suppress($investment);
                $investment->update(['status' => 'fully_paid']);
            }

            app(\App\Services\AccountAllocationService::class)->replace(
                $payment, $allocations, 'debit', $validated['payment_date'],
                'Investment Return/Profit paid to ' . ($investment->investor?->name ?? 'Investor') . ($validated['note'] ? " ({$validated['note']})" : '')
            );
        });

        return redirect()->back()->with('success', 'Payment processed successfully.');
    }
}
