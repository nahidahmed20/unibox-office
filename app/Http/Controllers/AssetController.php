<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Account;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with(['assignee', 'account']);

        // Search Logic
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

        // Pagination
        $perPage = $request->input('per_page', 10);

        $assets = $query
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get();

        $accounts = Account::where('is_active', true)
            ->select('id', 'name', 'current_balance')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Assets/Index', [
            'assets'   => $assets,
            'users'    => $users,
            'accounts' => $accounts,
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
            $asset = Asset::create($validated);

            if (!empty($validated['account_id']) && !empty($validated['purchase_price']) && $validated['purchase_price'] > 0) {
                $account = Account::where('id', $validated['account_id'])->lockForUpdate()->first();
                if ($account) {
                    $account->decrement('current_balance', $validated['purchase_price']);
                }
            }
        });

        return redirect()->back();
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
            $oldAccountId = $asset->account_id;
            $oldPrice     = (float) ($asset->purchase_price ?? 0);

            if ($oldAccountId && $oldPrice > 0) {
                $oldAccount = Account::where('id', $oldAccountId)->lockForUpdate()->first();
                if ($oldAccount) {
                    $oldAccount->increment('current_balance', $oldPrice);
                }
            }

            $asset->update($validated);

            $newAccountId = $validated['account_id'] ?? null;
            $newPrice     = (float) ($validated['purchase_price'] ?? 0);

            if ($newAccountId && $newPrice > 0) {
                $newAccount = Account::where('id', $newAccountId)->lockForUpdate()->first();
                if ($newAccount) {
                    $newAccount->decrement('current_balance', $newPrice);
                }
            }
        });

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $asset = Asset::findOrFail($id);

        DB::transaction(function () use ($asset) {
            if ($asset->account_id && $asset->purchase_price > 0) {
                $account = Account::where('id', $asset->account_id)->lockForUpdate()->first();
                if ($account) {
                    $account->increment('current_balance', $asset->purchase_price);
                }
            }

            $asset->delete();
        });

        return redirect()->back();
    }
}