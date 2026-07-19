<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Models\Account;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class InvestmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Investment::with('account'); 

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('investor_name', 'like', '%' . $searchTerm . '%')
                ->orWhere('purpose', 'like', '%' . $searchTerm . '%')
                ->orWhere('investment_date', 'like', '%' . $searchTerm . '%');
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); // sanity cap
        }

        $investments = $query->latest()->paginate($perPage)->withQueryString();
        
        $accounts = Account::where('is_active', true)->get(['id', 'name','current_balance']);

        return Inertia::render('Admin/Investments/Index', [
            'investments' => $investments,
            'accounts' => $accounts, 
            'filters' => $request->only(['search', 'per_page']) 
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'investor_name' => 'required|string|max:255',
            'investment_date' => 'required|date',
            'purpose' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            Investment::create($validated);

            $account = Account::findOrFail($validated['account_id']);
            $account->increment('current_balance', $validated['amount']);
        });

        return redirect()->back();
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'investor_name' => 'required|string|max:255',
            'investment_date' => 'required|date',
            'purpose' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $id) {
            $investment = Investment::findOrFail($id);
            if ($investment->account_id) {
                $oldAccount = Account::find($investment->account_id);
                if ($oldAccount) {
                    $oldAccount->decrement('current_balance', $investment->amount);
                }
            }

            $newAccount = Account::findOrFail($validated['account_id']);
            $newAccount->increment('current_balance', $validated['amount']);

            $investment->update($validated);
        });

        return redirect()->back();
    }
    
    public function destroy($id)
    {
        DB::transaction(function () use ($id) {
            $investment = Investment::findOrFail($id);

            if ($investment->account_id) {
                $account = Account::find($investment->account_id);
                if ($account) {
                    $account->decrement('current_balance', $investment->amount);
                }
            }

            $investment->delete();
        });
        return redirect()->back();
    }
}