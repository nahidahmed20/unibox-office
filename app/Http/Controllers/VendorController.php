<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Advance;
use App\Models\AdvanceBalance;
use App\Models\ProjectExpense;
use App\Models\Vendor;
use App\Models\VendorLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VendorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Vendor::with(['projectExpenses' => function($q) {
            $q->where('due_amount', '>', 0)->select('id', 'vendor_id', 'title', 'total_bill', 'paid_amount', 'due_amount');
        }]);

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('company_name', 'like', "%{$request->search}%")
                ->orWhere('phone', 'like', "%{$request->search}%");
        }

        if ($request->input('per_page') === 'all') {
            $totalCount = $query->count();
            $perPage = $totalCount > 0 ? $totalCount : 1;
        } else {
            $perPage = min((int) $request->input('per_page', 10), 100000); 
        }

        $vendors = $query->latest()->paginate($perPage)->withQueryString();
        $vendors->getCollection()->transform(function ($vendor) {
            $vendor->append('total_due');
            return $vendor;
        });

        $accounts = Account::where('is_active', true)->select('id', 'name', 'current_balance')->get();

        $advances = AdvanceBalance::with('user:id,name')
            ->get()
            ->map(function($balance) {
                $balance->available_balance = $balance->total_given - ($balance->total_used + $balance->total_returned);
                return $balance;
            })
            ->filter(function($balance) {
                return $balance->available_balance > 0; 
            })
            ->values();

        return Inertia::render('Admin/Vendors/Index', [
            'vendors' => $vendors,
            'accounts' => $accounts,
            'advances' => $advances,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function payVendor(Request $request, Vendor $vendor)
    {
        $request->validate([
            'project_expense_id' => 'required|exists:project_expenses,id',
            'payment_source'     => 'required|in:account,advance',
            'account_id'         => 'required_if:payment_source,account',
            'advance_user_id'    => 'required_if:payment_source,advance',
            'pay_amount'         => 'required|numeric|min:1',
            'discount_amount'    => 'nullable|numeric|min:0',
            'date'               => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            $expense = ProjectExpense::where('vendor_id', $vendor->id)
                                     ->where('id', $request->project_expense_id)
                                     ->firstOrFail();

            $payAmount = $request->pay_amount;
            $discountAmount = $request->discount_amount ?? 0;

            if ($discountAmount > 0) {
                $expense->total_bill -= $discountAmount;
            }

            $expense->paid_amount += $payAmount;
            $expense->due_amount = $expense->total_bill - $expense->paid_amount;

            if ($expense->due_amount <= 0) {
                $expense->payment_status = 'paid';
                $expense->due_amount = 0; 
            } else {
                $expense->payment_status = 'partial';
            }

            if ($request->payment_source === 'account') {
                $account = Account::findOrFail($request->account_id);
                $account->decrement('current_balance', $payAmount);
                $expense->account_id = $account->id;
            } else {
                $userId = $request->advance_user_id;
                
                $advanceBalance = AdvanceBalance::where('user_id', $userId)->firstOrFail();
                $advanceBalance->increment('total_used', $payAmount);
                
                $remainingPay = $payAmount;
                
                $unsettledAdvances = Advance::where('user_id', $userId)
                                            ->where('status', 'unsettled')
                                            ->orderBy('date', 'asc') 
                                            ->get();

                foreach ($unsettledAdvances as $adv) {
                    if ($remainingPay <= 0) break; 

                    $availableInThisAdv = $adv->amount - ($adv->settled_amount + $adv->returned_amount);

                    if ($availableInThisAdv > 0) {
                        if ($remainingPay >= $availableInThisAdv) {
                            $adv->settled_amount += $availableInThisAdv;
                            $adv->status = 'settled'; 
                            $adv->save();
                            
                            $remainingPay -= $availableInThisAdv; 
                        } else {
                            $adv->settled_amount += $remainingPay;
                            $adv->save();
                            
                            $remainingPay = 0; 
                        }
                    }
                }
                
                $expense->advance_user_id = $userId;
                $expense->advance_id = null; 
            }

            $expense->save();

            DB::commit();

            return redirect()->back();

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে: ' . $e->getMessage()]);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
        ]);

        $vendor = Vendor::create($validated);
        if ($request->wantsJson()) {
            return response()->json([
                'vendor' => $vendor->only(['id', 'name', 'company_name']),
            ]);
        }

        return redirect()->back();
    }


    public function update(Request $request, string $id)
    {
        $vendor = Vendor::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
        ]);

        $vendor->update($validated);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->delete();

        return redirect()->back();
    }

    public function addAdvance(Request $request, $id)
    {
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'description' => 'nullable|string'
        ]);

        DB::transaction(function () use ($request, $id) {
            $vendor = Vendor::findOrFail($id);
            $account = Account::findOrFail($request->account_id);

            if ($account->current_balance < $request->amount) {
                throw new \Exception("অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!");
            }

            $account->decrement('current_balance', $request->amount);

            $vendor->increment('wallet_balance', $request->amount);

            VendorLedger::create([
                'vendor_id' => $vendor->id,
                'type' => 'credit',
                'amount' => $request->amount,
                'description' => "Advance given from {$account->name}. " . $request->description
            ]);
        });

        return redirect()->back()->with('success', 'Advance added to Vendor Wallet successfully.');
    }

    public function receiveRefund(Request $request, $id)
    {
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:1',
            'description' => 'nullable|string'
        ]);

        DB::transaction(function () use ($request, $id) {
            $vendor = Vendor::findOrFail($id);
            $account = Account::findOrFail($request->account_id);

            if ($vendor->wallet_balance < $request->amount) {
                throw new \Exception("ভেন্ডরের ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!");
            }

            $vendor->decrement('wallet_balance', $request->amount);

            $account->increment('current_balance', $request->amount);

            VendorLedger::create([
                'vendor_id' => $vendor->id,
                'type' => 'debit',
                'amount' => $request->amount,
                'description' => "Refund received to {$account->name}. " . $request->description
            ]);
        });

        return redirect()->back()->with('success', 'Refund received successfully.');
    }

}
