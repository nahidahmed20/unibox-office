<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with(['assignee', 'account']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('asset_code', 'like', "%{$searchTerm}%")
                ->orWhereHas('assignee', function ($aq) use ($searchTerm) {
                    $aq->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = \App\Support\Pagination::perPage($request, $query);
        }

        $assets = $query->latest()->paginate($perPage)->withQueryString();
        $assetIds = $assets->pluck('id');
        $assetTransactions = Transaction::where('transactionable_type', Asset::class)
            ->whereIn('transactionable_id', $assetIds)->where('type', 'debit')->orderBy('id')->get()->groupBy('transactionable_id');
        $assets->getCollection()->each(function ($asset) use ($assetTransactions) {
            $asset->account_payments = ($assetTransactions[$asset->id] ?? collect())->map(fn ($transaction) => [
                'account_id' => $transaction->account_id,
                'amount' => (float) $transaction->amount,
            ])->values();
        });

        $users = User::select('id', 'name')->orderBy('name')->get();

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        // 🟢 NEW: Added Statistics for Summary Cards
        $stats = [
            'total_assets' => Asset::count(),
            'total_value' => Asset::sum('purchase_price'),
            'assigned_assets' => Asset::whereNotNull('assigned_to')->count(),
            'damaged_repair' => Asset::whereIn('condition', ['damaged', 'under_repair'])->count(),
        ];

        return Inertia::render('Admin/Assets/Index', [
            'assets'   => $assets,
            'users'    => $users,
            'accounts' => $accounts,
            'stats'    => $stats, // 🟢 Sending stats to frontend
            'filters'  => $request->only('search', 'per_page'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'asset_code'     => 'required|string|unique:assets,asset_code',
            'serial_number'  => 'nullable|string',
            'purchase_date'  => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'account_id'     => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        $allocations = (float) ($validated['purchase_price'] ?? 0) > 0
            ? app(\App\Services\AccountAllocationService::class)->fromRequest($validated, (float) $validated['purchase_price'])
            : [];
        if ($allocations !== []) $validated['account_id'] = $allocations[0]['account_id'];
        unset($validated['account_payments']);

        DB::transaction(function () use ($validated, $allocations) {
            $price = (float) ($validated['purchase_price'] ?? 0);
            $asset = new Asset($validated);
            \App\Observers\AccountMovementObserver::suppress($asset);
            $asset->save();
            if ($price > 0) {
                app(\App\Services\AccountAllocationService::class)->replace(
                    $asset, $allocations, 'debit', $validated['purchase_date'] ?: now()->toDateString(),
                    "Asset Purchase: {$asset->name} ({$asset->asset_code})"
                );
            }
        });

        return redirect()->back()->with('success', 'Asset created successfully.');
    }

    public function update(Request $request, string $id)
    {
        $asset = Asset::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'asset_code'     => 'required|string|unique:assets,asset_code,' . $asset->id,
            'serial_number'  => 'nullable|string',
            'purchase_date'  => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'account_id'     => 'nullable|exists:accounts,id',
            'account_payments' => 'nullable|array|min:1',
            'account_payments.*.account_id' => 'required|distinct|exists:accounts,id',
            'account_payments.*.amount' => 'required|numeric|decimal:0,2|min:0.01',
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        $allocations = (float) ($validated['purchase_price'] ?? 0) > 0
            ? app(\App\Services\AccountAllocationService::class)->fromRequest($validated, (float) $validated['purchase_price'])
            : [];
        if ($allocations !== []) $validated['account_id'] = $allocations[0]['account_id'];
        unset($validated['account_payments']);

        DB::transaction(function () use ($asset, $validated, $allocations) {
            $asset = Asset::with('transaction')->lockForUpdate()->findOrFail($asset->id);
            $oldPrice = (float) ($asset->purchase_price ?? 0);
            $debits = Transaction::where('transactionable_type', $asset->getMorphClass())
                ->where('transactionable_id', $asset->id)->where('type', 'debit')->lockForUpdate()->get();
            if ($debits->isNotEmpty() && abs((float) $debits->sum('amount') - $oldPrice) < 0.001) {
                app(\App\Services\AccountAllocationService::class)->reverse($asset, 'debit');
            } elseif ($oldPrice > 0 && $asset->account_id) {
                Account::whereKey($asset->account_id)->lockForUpdate()->increment('current_balance', $oldPrice);
                $debits->each->delete();
            }

            $newPrice     = (float) ($validated['purchase_price'] ?? 0);
            \App\Observers\AccountMovementObserver::suppress($asset);
            $asset->update($validated);
            if ($newPrice > 0) {
                app(\App\Services\AccountAllocationService::class)->replace(
                    $asset, $allocations, 'debit', $validated['purchase_date'] ?: ($asset->created_at?->toDateString() ?? now()->toDateString()),
                    "Asset Purchase: {$asset->name} ({$asset->asset_code})"
                );
            }
        });

        return redirect()->back()->with('success', 'Asset updated successfully.');
    }

    public function destroy(string $id)
    {
        $asset = Asset::findOrFail($id);

        DB::transaction(function () use ($asset) {
            $debits = Transaction::where('transactionable_type', $asset->getMorphClass())
                ->where('transactionable_id', $asset->id)->where('type', 'debit')->lockForUpdate()->get();
            if ($debits->isNotEmpty() && abs((float) $debits->sum('amount') - (float) $asset->purchase_price) < 0.001) {
                app(\App\Services\AccountAllocationService::class)->reverse($asset, 'debit');
            } elseif ($asset->account_id && $asset->purchase_price > 0) {
                Account::whereKey($asset->account_id)->lockForUpdate()->increment('current_balance', $asset->purchase_price);
                $debits->each->delete();
            }

            $asset->delete();
        });

        return redirect()->back()->with('success', 'Asset deleted and balance restored.');
    }
}