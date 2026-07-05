<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $guarded = [];

    public function department() { return $this->belongsTo(Department::class); }
    public function designation() { return $this->belongsTo(Designation::class); }
    public function profile() { return $this->hasOne(EmployeeProfile::class); }
    public function attendances() { return $this->hasMany(Attendance::class); }
    public function leaveAllocations() { return $this->hasMany(LeaveAllocation::class); }
    public function leaves() { return $this->hasMany(Leave::class); }
    public function salaries() { return $this->hasMany(Salary::class); }
    public function tasks() { return $this->hasMany(Task::class, 'assigned_to'); }
    public function requisitions() { return $this->hasMany(Requisition::class); }
    public function assets() { return $this->hasMany(Asset::class, 'assigned_to'); }
    public function notices()
    {
        return $this->hasMany(Notice::class, 'created_by');
    }
    public function expenses()
    {
        return $this->hasMany(Expense::class, 'logged_by');
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
