<?php
namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Investor;
use App\Models\InvestmentPayment;
use App\Models\Account;
use App\Models\AccountTransaction;
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

        $perPage = $request->input('per_page') === 'all' ? ($totalCount > 0 ? $totalCount : 1) : min((int) $request->input('per_page', 10), 100000);

        $investments = $query->latest()->paginate($perPage)->through(function ($inv) {
            $inv->due_amount = max($inv->amount - ($inv->returned_principal ?? 0), 0);
            return $inv;
        })->withQueryString();
        
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
            'account_id'      => 'required|exists:accounts,id',
            'amount'          => 'required|numeric|min:1',
            'date'            => 'required|date',
            'purpose'         => 'nullable|string|max:255',
            'note'            => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            $investor = Investor::firstOrCreate(
                ['name' => $validated['investor_name']],
                ['phone' => $validated['investor_phone'], 'type' => $validated['investor_type']]
            );

            $investment = Investment::create([
                'investor_id'     => $investor->id,
                'account_id'      => $validated['account_id'],
                'investment_type' => $validated['investment_type'],
                'amount'          => $validated['amount'],
                'date'            => $validated['date'],
                'purpose'         => $validated['purpose'],
                'note'            => $validated['note'],
                'status'          => 'active',
            ]);

            $account = Account::findOrFail($validated['account_id']);
            $account->increment('current_balance', $validated['amount']);

            AccountTransaction::create([
                'account_id'    => $account->id,
                'type'          => 'credit',
                'amount'        => $validated['amount'],
                'balance_after' => $account->current_balance,
                'source_type'   => 'investment_received',
                'source_id'     => $investment->id,
                'note'          => 'Investment/Loan received from ' . $investor->name,
                'created_by'    => auth()->id(),
            ]);
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
            'account_id'      => 'required|exists:accounts,id',
            'amount'          => 'required|numeric|min:1',
            'date'            => 'required|date',
            'purpose'         => 'nullable|string|max:255',
            'note'            => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $id) {
            $investment = Investment::findOrFail($id);
            $returnedPrincipal = (float) InvestmentPayment::where('investment_id', $investment->id)->sum('principal_amount');
            if ((float) $validated['amount'] < $returnedPrincipal) {
                throw ValidationException::withMessages([
                    'amount' => "Investment amount cannot be less than returned principal ({$returnedPrincipal} TK).",
                ]);
            }

            if ($investment->account_id != $validated['account_id'] || $investment->amount != $validated['amount']) {
                
                $oldAccount = Account::find($investment->account_id);
                if ($oldAccount) {
                    $oldAccount->decrement('current_balance', $investment->amount);
                }

                $newAccount = Account::findOrFail($validated['account_id']);
                $newAccount->increment('current_balance', $validated['amount']);
                
                AccountTransaction::create([
                    'account_id'    => $newAccount->id,
                    'type'          => 'credit',
                    'amount'        => $validated['amount'],
                    'balance_after' => $newAccount->current_balance,
                    'source_type'   => 'investment_received_edited',
                    'source_id'     => $investment->id,
                    'note'          => 'Investment updated from ' . $validated['investor_name'],
                    'created_by'    => auth()->id(),
                ]);
            }

            $investor = Investor::firstOrCreate(
                ['name' => $validated['investor_name']],
                ['phone' => $validated['investor_phone'], 'type' => $validated['investor_type']]
            );

            $investment->update([
                'investor_id'     => $investor->id,
                'account_id'      => $validated['account_id'],
                'investment_type' => $validated['investment_type'],
                'amount'          => $validated['amount'],
                'date'            => $validated['date'],
                'purpose'         => $validated['purpose'],
                'note'            => $validated['note'],
            ]);
        });

        return redirect()->back()->with('success', 'Investment updated successfully.');
    }
    
    public function destroy($id)
    {
        DB::transaction(function () use ($id) {
            $investment = Investment::with('payments')->findOrFail($id);

            if ($investment->payments->count() > 0) {
                throw new \Exception("Cannot delete! Money has already been partially or fully returned.");
            }

            $account = Account::find($investment->account_id);
            if ($account) {
                $account->decrement('current_balance', $investment->amount);
            }
            
            $investment->delete();
        });
        return redirect()->back()->with('success', 'Record deleted completely.');
    }

    public function returnMoney(Request $request, $id)
    {
        $validated = $request->validate([
            'account_id'       => 'required|exists:accounts,id',
            'principal_amount' => 'required|numeric|min:0',
            'profit_amount'    => 'required|numeric|min:0',
            'payment_date'     => 'required|date',
            'note'             => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $id) {
            $investment = Investment::lockForUpdate()->findOrFail($id);
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

            $account = Account::lockForUpdate()->findOrFail($validated['account_id']);
            if ((float) $account->current_balance < $totalPayable) {
                throw ValidationException::withMessages(['account_id' => 'Selected account has insufficient balance.']);
            }

            $payment = InvestmentPayment::create([
                'investor_id'      => $investment->investor_id,
                'investment_id'    => $investment->id,
                'account_id'       => $validated['account_id'],
                'principal_amount' => $validated['principal_amount'],
                'profit_amount'    => $validated['profit_amount'],
                'total_amount'     => $totalPayable,
                'payment_date'     => $validated['payment_date'],
                'note'             => $validated['note'],
            ]);

            $totalPrincipalPaid = InvestmentPayment::where('investment_id', $id)->sum('principal_amount');
            if ($totalPrincipalPaid >= $investment->amount) {
                $investment->update(['status' => 'fully_paid']);
            }

            $account->decrement('current_balance', $totalPayable);

            AccountTransaction::create([
                'account_id'    => $account->id,
                'type'          => 'debit',
                'amount'        => $totalPayable,
                'balance_after' => $account->current_balance,
                'source_type'   => 'investment_return',
                'source_id'     => $payment->id,
                'note'          => 'Return/Profit paid to ' . $investment->investor->name,
                'created_by'    => auth()->id(),
            ]);
        });

        return redirect()->back()->with('success', 'Payment processed successfully.');
    }
}
