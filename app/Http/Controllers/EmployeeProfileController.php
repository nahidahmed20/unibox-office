<?php

namespace App\Http\Controllers;

use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\Department;
use App\Models\Designation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeProfileController extends Controller
{
    public function index(Request $request)
    {
        $query = EmployeeProfile::with(['user', 'department', 'designation']);

        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where('employee_id_code', 'like', "%{$searchTerm}%")
                  ->orWhereHas('user', function($q) use ($searchTerm) {
                      $q->where('name', 'like', "%{$searchTerm}%");
                  });
        }

        return Inertia::render('Admin/Employees/Index', [
            'employees'    => $query->latest()->get(),
            'users'        => User::select('id', 'name')->get(),
            'departments'  => Department::select('id', 'name')->get(),
            'designations' => Designation::select('id', 'name', 'department_id')->get(),
            'filters'      => $request->only('search')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'                 => 'required|exists:users,id|unique:employee_profiles,user_id',
            'department_id'           => 'nullable|exists:departments,id',
            'designation_id'          => 'nullable|exists:designations,id',
            'employee_id_code'        => 'required|string|unique:employee_profiles,employee_id_code',
            'nid_number'              => 'nullable|string',
            'gender'                  => 'required|in:male,female,other',
            'joining_date'            => 'required|date',
            'basic_salary'            => 'required|numeric|min:0',
            'bank_name'               => 'nullable|string',
            'bank_account_no'         => 'nullable|string',
            'emergency_contact_name'  => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'blood_group'             => 'nullable|string',
            'present_address'         => 'nullable|string',
        ]);

        EmployeeProfile::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $employee = EmployeeProfile::findOrFail($id);

        $validated = $request->validate([
            'user_id'                 => 'required|exists:users,id|unique:employee_profiles,user_id,' . $employee->id,
            'department_id'           => 'nullable|exists:departments,id',
            'designation_id'          => 'nullable|exists:designations,id',
            'employee_id_code'        => 'required|string|unique:employee_profiles,employee_id_code,' . $employee->id,
            'nid_number'              => 'nullable|string',
            'gender'                  => 'required|in:male,female,other',
            'joining_date'            => 'required|date',
            'basic_salary'            => 'required|numeric|min:0',
            'bank_name'               => 'nullable|string',
            'bank_account_no'         => 'nullable|string',
            'emergency_contact_name'  => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'blood_group'             => 'nullable|string',
            'present_address'         => 'nullable|string',
        ]);

        $employee->update($validated);
        return redirect()->back();
    }

    public function destroy(string $id)
    {
        EmployeeProfile::findOrFail($id)->delete();
        return redirect()->back();
    }
}