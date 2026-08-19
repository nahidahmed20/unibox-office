<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceSetting extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'show_logo' => 'boolean',
        'show_watermark' => 'boolean',
        'show_client_info' => 'boolean',
        'show_invoice_meta' => 'boolean',
        'show_notes' => 'boolean',
        'show_bank_info' => 'boolean',
        'show_signature' => 'boolean',
        'show_seal' => 'boolean',
        'show_footer' => 'boolean',
    ];
}
