<?php

namespace App\Http\Controllers;

use App\Models\ClientAdvance;
use App\Models\Client;
use App\Models\Account;
use App\Models\Transaction; 
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientAdvanceController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');

        $baseQuery = Client::whereHas('clientAdvances')
            ->with(['clientAdvances' => function ($q) {
                $q->with('account')->latest('date');
            }])
            ->withMax('clientAdvances', 'date')
            ->withSum('clientAdvances as total_amount', 'amount')
            ->withSum('clientAdvances as total_used', 'used_amount')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('client_advances_max_date')
            ->orderByDesc('id');

        if ($request->input('per_page') === 'all') {
            $totalCount = $baseQuery->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $baseQuery);
        }

        $clientWithAdvances = $baseQuery
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($client) {
                $client->available_balance = max(
                    (float) ($client->total_amount ?? 0) - (float) ($client->total_used ?? 0),
                    0
                );
                return $client;
            });
        $advanceIds = $clientWithAdvances->getCollection()->flatMap(fn ($client) => $client->clientAdvances->pluck('id'))->all();
        $depositTransactions = Transaction::where('transactionable_type', ClientAdvance::class)
            ->whereIn('transactionable_id', $advanceIds)->where('type', 'credit')->orderBy('id')->get()->groupBy('transactionable_id');
        $clientWithAdvances->getCollection()->each(function ($client) use ($depositTransactions) {
            $client->clientAdvances->each(function ($advance) use ($depositTransactions) {
                $advance->account_payments = ($depositTransactions[$advance->id] ?? collect())->map(fn ($transaction) => [
                    'account_id' => $transaction->account_id,
                    'amount' => (float) $transaction->amount,
                ])->values();
            });
        });

        $advanceTotalsQuery = ClientAdvance::whereHas('client', function ($q) use ($search) {
            if ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
                });
            }
        });

        $totalReceived = (clone $advanceTotalsQuery)->sum('amount');
        $totalUsed = (clone $advanceTotalsQuery)->sum('used_amount');

        $clients = Client::select('id', 'name', 'company_name')->get();
        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();

        return Inertia::render('Admin/ClientAdvances/Index', [
            'clientWithAdvances' => $clientWithAdvances,
            'clients' => $clients,
            'accounts' => $accounts,
            'totalReceived' => $totalReceived,
            'totalUsed' => $totalUsed,
            'totalAvailable' => max($totalReceived - $totalUsed, 0),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'account_id' => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'note' => 'nullable|string',
        ]);
        $allocations = app(\App\Services\AccountAllocationService::class)->fromRequest($validated, (float) $validated['amount']);
        $validated['account_id'] = $allocations[0]['account_id'];
        unset($validated['account_payments']);

        DB::transaction(function () use ($validated, $allocations) {
            $advance = ClientAdvance::create([
                'client_id' => $validated['client_id'],
                'account_id' => $validated['account_id'],
                'amount' => $validated['amount'],
                'used_amount' => 0,
                'date' => $validated['date'],
                'note' => $validated['note'] ?? null,
            ]);

            app(\App\Services\AccountAllocationService::class)->replace(
                $advance, $allocations, 'credit', $validated['date'],
                'Client Advance Received. ' . (!empty($validated['note']) ? ' Note: ' . $validated['note'] : '')
            );
        });

        return redirect()->back()->with('success', 'Advance logged successfully.');
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'account_id' => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'note' => 'nullable|string'
        ]);
        $allocations = app(\App\Services\AccountAllocationService::class)->fromRequest($request->all(), (float) $request->amount);
        $request->merge(['account_id' => $allocations[0]['account_id']]);

        try {
            DB::transaction(function () use ($request, $id, $allocations) {
                $advance = ClientAdvance::findOrFail($id);

                if ($advance->used_amount > 0) {
                    throw ValidationException::withMessages(['amount' => 'Cannot edit! This amount is already used in billing.']);
                }

                $newAmount = $request->amount;
                $service = app(\App\Services\AccountAllocationService::class);
                if ($service->reverse($advance, 'credit') === 0 && $advance->account_id) {
                    Account::whereKey($advance->account_id)->decrement('current_balance', (float) $advance->amount);
                }

                $advance->update([
                    'client_id' => $request->client_id,
                    'account_id' => $request->account_id,
                    'amount' => $newAmount,
                    'date' => $request->date,
                    'note' => $request->note,
                ]);

                $service->replace($advance, $allocations, 'credit', $request->date,
                    'Client Advance Received. ' . ($request->note ? ' Note: ' . $request->note : ''));
            });

            return redirect()->back()->with('success', 'Advance updated successfully.');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $advance = ClientAdvance::findOrFail($id);

                if ($advance->used_amount > 0) {
                    throw ValidationException::withMessages(['error' => 'Cannot delete! Already used in an invoice.']);
                }

                $service = app(\App\Services\AccountAllocationService::class);
                if ($service->reverse($advance, 'credit') === 0 && $advance->account_id) {
                    Account::whereKey($advance->account_id)->decrement('current_balance', (float) $advance->amount);
                }

                $advance->delete();
            });

            return redirect()->back()->with('success', 'Advance deleted successfully.');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
