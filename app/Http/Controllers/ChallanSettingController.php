<?php

namespace App\Http\Controllers;

use App\Models\ChallanSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ChallanSettingController extends Controller
{
    public function index()
    {
        $settings = ChallanSetting::first() ?? new ChallanSetting();
        return Inertia::render('Admin/ChallanSettings/Index', ['settings' => $settings]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'prefix' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'company_address' => 'nullable|string',
            'company_phone' => 'nullable|string|max:50',
            'company_email' => 'nullable|email|max:100',
            'terms_conditions' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048',
            'authorized_signature' => 'nullable|image|mimes:png,png,jpg,svg|max:2048',
        ]);

        $settings = ChallanSetting::first() ?? new ChallanSetting();

        if ($request->hasFile('logo')) {
            if ($settings->logo) Storage::disk('public')->delete($settings->logo);
            $validated['logo'] = $request->file('logo')->store('challan_settings', 'public');
        }

        if ($request->hasFile('authorized_signature')) {
            if ($settings->authorized_signature) Storage::disk('public')->delete($settings->authorized_signature);
            $validated['authorized_signature'] = $request->file('authorized_signature')->store('challan_settings', 'public');
        }

        if (!$settings->exists) {
            ChallanSetting::create($validated);
        } else {
            $settings->update($validated);
        }

        return redirect()->back()->with('success', 'Challan settings updated successfully.');
    }
}
