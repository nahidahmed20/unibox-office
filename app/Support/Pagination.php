<?php

namespace App\Support;

use Illuminate\Http\Request;

class Pagination
{
    public static function perPage(Request $request, $query, int $default = 25): int
    {
        if ($request->input('per_page') === 'all') return max((clone $query)->count(), 1);
        $value = filter_var($request->input('per_page', $default), FILTER_VALIDATE_INT);
        return $value === false || $value < 1 ? $default : min($value, 100000);
    }
}
