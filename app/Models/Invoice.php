<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model {
    protected $guarded = [];
    public function client() { return $this->belongsTo(Client::class); }
    public function project() { return $this->belongsTo(Project::class); }
    public function items() { return $this->hasMany(InvoiceItem::class); }
    public function payments()
    {
        return $this->hasMany(InvoicePayment::class, 'invoice_id');
    }
    public function getAdvanceUsedAttribute()
    {
        return $this->payments()->where('method', 'Client Advance')->sum('amount') ?? 0;
    }

}
