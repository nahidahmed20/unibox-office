<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvestmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Investment::query();

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('investor_name', 'like', '%' . $searchTerm . '%')
                  ->orWhere('purpose', 'like', '%' . $searchTerm . '%')
                  ->orWhere('investment_date', 'like', '%' . $searchTerm . '%');
        }

        $investments = $query->latest()->get();
        
        return Inertia::render('Admin/Investments/Index', [
            'investments' => $investments,
            'filters' => $request->only('search') 
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'investor_name' => 'required|string|max:255',
            'investment_date' => 'required|date',
            'purpose' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        Investment::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'investor_name' => 'required|string|max:255',
            'investment_date' => 'required|date',
            'purpose' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $investment = Investment::findOrFail($id);
        $investment->update($validated);

        return redirect()->back();
    }
    
    public function destroy($id)
    {
        $investment = Investment::findOrFail($id);
        $investment->delete();
        return redirect()->back();
    }
}