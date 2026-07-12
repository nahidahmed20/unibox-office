<?php

namespace App\Http\Controllers;

use App\Models\ClientAdvance;
use App\Models\Client;
use App\Models\Account;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientAdvanceController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        $clientWithAdvances = Client::whereHas('clientAdvances')
            ->with(['clientAdvances' => function($q) {
                $q->with('account')->latest('date'); 
            }])
            ->withSum('clientAdvances as total_amount', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->when($search, function ($query, $search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->paginate($perPage)
            ->withQueryString() 
            ->through(function ($client) {
                $client->available_balance = ($client->total_amount ?? 0) - ($client->total_used ?? 0);
                return $client;
            });

        $clients = Client::select('id', 'name', 'company_name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();

        return Inertia::render('Admin/ClientAdvances/Index', [
            'clientWithAdvances' => $clientWithAdvances,
            'clients' => $clients,
            'accounts' => $accounts
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            ClientAdvance::create([
                'client_id' => $validated['client_id'],
                'account_id' => $validated['account_id'],
                'amount' => $validated['amount'],
                'used_amount' => 0,
                'date' => $validated['date'],
                'note' => $validated['note'],
            ]);

            $account = Account::findOrFail($validated['account_id']);
            $account->increment('current_balance', $validated['amount']);
        });

        return redirect()->back();
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'note' => 'nullable|string'
        ]);

        try {
            DB::transaction(function () use ($request, $id) {
                $advance = ClientAdvance::findOrFail($id);

                if ($advance->used_amount > 0) {
                    throw ValidationException::withMessages(['amount' => 'Cannot edit! This amount is already used in billing.']);
                }

                $oldAmount = $advance->amount;
                $oldAccountId = $advance->account_id;
                $newAmount = $request->amount;
                $newAccountId = $request->account_id;

                if ($oldAccountId == $newAccountId) {
                    $difference = $newAmount - $oldAmount;
                    if ($difference != 0) {
                        $account = Account::findOrFail($newAccountId);
                        $account->current_balance += $difference;
                        $account->save();
                    }
                } else {
                    $oldAccount = Account::findOrFail($oldAccountId);
                    $oldAccount->current_balance -= $oldAmount;
                    $oldAccount->save();
                    $newAccount = Account::findOrFail($newAccountId);
                    $newAccount->current_balance += $newAmount;
                    $newAccount->save();
                }
                $advance->update([
                    'client_id' => $request->client_id,
                    'account_id' => $newAccountId,
                    'amount' => $newAmount,
                    'date' => $request->date,
                    'note' => $request->note,
                ]);
            });

            return redirect()->back()->with('success', 'Advance updated successfully.');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Delete an existing advance.
     */
    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $advance = ClientAdvance::findOrFail($id);
                if ($advance->used_amount > 0) {
                    throw ValidationException::withMessages(['error' => 'Cannot delete! Already used in an invoice.']);
                }
                $account = Account::findOrFail($advance->account_id);
                $account->current_balance -= $advance->amount;
                $account->save();
                $advance->delete();
            });

            return redirect()->back()->with('success', 'Advance deleted successfully.');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}