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
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        if (!empty($validated['purchase_price']) && $validated['purchase_price'] > 0 && empty($validated['account_id'])) {
            return back()
                ->withErrors(['account_id' => 'Please select an account to deduct the purchase cost from.'])
                ->withInput();
        }

        DB::transaction(function () use ($validated) {
            $price = (float) ($validated['purchase_price'] ?? 0);
            $account = null;

            if (!empty($validated['account_id']) && $price > 0) {
                $account = Account::where('id', $validated['account_id'])->lockForUpdate()->firstOrFail();
                if ((float) $account->current_balance < $price) {
                    throw ValidationException::withMessages([
                        'account_id' => "Insufficient balance in {$account->name}.",
                    ]);
                }
            }

            $asset = Asset::create($validated);

            if ($account && $price > 0) {
                $account->decrement('current_balance', $price);
                Transaction::create([
                    'account_id'           => $account->id,
                    'type'                 => 'debit',
                    'amount'               => $price,
                    'transaction_date'     => $validated['purchase_date'] ?: now()->toDateString(),
                    'description'          => "Asset Purchase: {$asset->name} ({$asset->asset_code})",
                    'transactionable_id'   => $asset->id,
                    'transactionable_type' => Asset::class,
                ]);
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
            'assigned_to'    => 'nullable|exists:users,id',
            'assigned_date'  => 'nullable|date',
            'condition'      => 'required|in:new,good,damaged,under_repair',
        ]);

        if (!empty($validated['purchase_price']) && $validated['purchase_price'] > 0 && empty($validated['account_id'])) {
            return back()
                ->withErrors(['account_id' => 'Please select an account to deduct the purchase cost from.'])
                ->withInput();
        }

        DB::transaction(function () use ($asset, $validated) {
            $asset = Asset::with('transaction')->lockForUpdate()->findOrFail($asset->id);
            $oldAccountId = $asset->account_id;
            $oldPrice     = (float) ($asset->purchase_price ?? 0);

            if ($oldAccountId && $oldPrice > 0) {
                $oldAccount = Account::where('id', $oldAccountId)->lockForUpdate()->first();
                if ($oldAccount) {
                    $oldAccount->increment('current_balance', $oldPrice);
                }
            }

            $newAccountId = $validated['account_id'] ?? null;
            $newPrice     = (float) ($validated['purchase_price'] ?? 0);

            if ($newAccountId && $newPrice > 0) {
                $newAccount = Account::where('id', $newAccountId)->lockForUpdate()->firstOrFail();
                if ((float) $newAccount->current_balance < $newPrice) {
                    throw ValidationException::withMessages([
                        'account_id' => "Insufficient balance in {$newAccount->name}.",
                    ]);
                }
                $newAccount->decrement('current_balance', $newPrice);
            }

            $asset->update($validated);

            if ($newAccountId && $newPrice > 0) {
                $trxData = [
                    'account_id'       => $newAccountId,
                    'type'             => 'debit',
                    'amount'           => $newPrice,
                    'transaction_date' => $validated['purchase_date'] ?: ($asset->created_at?->toDateString() ?? now()->toDateString()),
                    'description'      => "Asset Purchase: {$asset->name} ({$asset->asset_code})",
                ];
                if ($asset->transaction) {
                    $asset->transaction->update($trxData);
                } else {
                    $asset->transaction()->create($trxData);
                }
            } else {
                $asset->transaction?->delete();
            }
        });

        return redirect()->back()->with('success', 'Asset updated successfully.');
    }

    public function destroy(string $id)
    {
        $asset = Asset::with('transaction')->findOrFail($id);

        DB::transaction(function () use ($asset) {
            if ($asset->account_id && $asset->purchase_price > 0) {
                $account = Account::where('id', $asset->account_id)->lockForUpdate()->first();
                if ($account) {
                    $account->increment('current_balance', $asset->purchase_price);
                }
            }

            $asset->transaction?->delete();
            $asset->delete();
        });

        return redirect()->back()->with('success', 'Asset deleted and balance restored.');
    }
}