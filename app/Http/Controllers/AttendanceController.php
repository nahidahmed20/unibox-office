<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('user');

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('date', 'like', "%{$searchTerm}%")
                  ->orWhereHas('user', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        $attendances = $query->orderBy('date', 'desc')->get(); 
        $users = User::select('id', 'name')->get();

        return Inertia::render('Admin/Attendances/Index', [
            'attendances' => $attendances,
            'users'       => $users,
            'filters'     => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'   => 'required|exists:users,id',
            'date'      => [
                'required', 'date',
                // Ek dine ekjon user er ektai entry thakbe
                Rule::unique('attendances')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user_id);
                })
            ],
            'check_in'  => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i|after:check_in',
            'status'    => 'required|in:present,absent,late,half_day,on_leave,holiday',
        ], [
            'date.unique' => 'This employee already has an attendance record for this date.'
        ]);

        Attendance::create($validated);
        return redirect()->back(); 
    }

    public function update(Request $request, string $id)
    {
        $attendance = Attendance::findOrFail($id);

        $validated = $request->validate([
            'user_id'   => 'required|exists:users,id',
            'date'      => [
                'required', 'date',
                Rule::unique('attendances')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user_id);
                })->ignore($attendance->id)
            ],
            'check_in'  => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i|after:check_in',
            'status'    => 'required|in:present,absent,late,half_day,on_leave,holiday',
        ], [
            'date.unique' => 'This employee already has an attendance record for this date.'
        ]);

        $attendance->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Attendance::findOrFail($id)->delete();
        return redirect()->back();
    }
}