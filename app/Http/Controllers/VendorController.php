<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VendorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $query = Vendor::query();

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('company_name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
        }

        // with() দিয়ে total_due attribute অ্যাপেন্ড করার দরকার নেই, এটা আমরা মডেলেই করেছি। 
        // তবে আমরা চাইলে get() বা paginate() এর পর collection এ map করে দিতে পারি।
        $vendors = $query->latest()->paginate($perPage)->withQueryString();

        // পেজিনেট করা ডেটায় অ্যাপেন্ড করার জন্য
        $vendors->getCollection()->transform(function ($vendor) {
            $vendor->append('total_due');
            return $vendor;
        });

        return Inertia::render('Admin/Vendors/Index', [
            'vendors' => $vendors
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
        ]);

        Vendor::create($validated);

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Vendor $vendor)
    {
        $vendor->append('total_due');
        $vendor->load(['projectExpenses' => function($q) {
            $q->latest()->take(10)->with('project');
        }]);

        return Inertia::render('Admin/Vendors/Show', [
            'vendor' => $vendor
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
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

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->delete();

        return redirect()->back();
    }
}