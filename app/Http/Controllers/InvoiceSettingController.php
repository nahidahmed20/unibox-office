<?php

namespace App\Http\Controllers;

use App\Models\InvoiceSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceSettingController extends Controller
{
    public function index()
    {
        $settings = InvoiceSetting::first() ?? new InvoiceSetting();

        return Inertia::render('Admin/InvoiceSettings/Index', [
            'settings' => $settings
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'show_logo' => 'boolean',
            'show_watermark' => 'boolean',
            'show_client_info' => 'boolean',
            'show_invoice_meta' => 'boolean',
            'show_notes' => 'boolean',
            'show_bank_info' => 'boolean',
            'show_signature' => 'boolean',
            'show_seal' => 'boolean',
            'show_footer' => 'boolean',
            'bank_details' => 'nullable|string',
            'footer_text' => 'nullable|string',
        ]);

        $settings = InvoiceSetting::first();

        if ($settings) {
            $settings->update($validated);
        } else {
            InvoiceSetting::create($validated);
        }

        return back()->with('success', 'Invoice settings updated successfully!');
    }
}
