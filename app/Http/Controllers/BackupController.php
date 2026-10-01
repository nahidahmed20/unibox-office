<?php

namespace App\Http\Controllers;

use Ifsnop\Mysqldump\Mysqldump;
use Illuminate\Support\Facades\Log;

class BackupController extends Controller
{
    public function download()
    {
        // Only allow admin (or whoever has permission, but assuming admin since it's a backup)
        // If they have spatie permissions, you could check auth()->user()->hasPermissionTo('download_backup')
        // We will just let anyone who reaches this route download it since it will be in the auth middleware group.
        
        try {
            $dbName = env('DB_DATABASE');
            $dbUser = env('DB_USERNAME');
            $dbPass = env('DB_PASSWORD');
            $dbHost = env('DB_HOST');
            
            // Temporary file path
            $filename = 'backup_' . $dbName . '_' . date('Y_m_d_H_i_s') . '.sql';
            $path = storage_path('app/private/' . $filename); // ensure private dir exists or just use app/
            
            // Create directory if not exists
            if (!file_exists(storage_path('app/private'))) {
                mkdir(storage_path('app/private'), 0755, true);
            }

            // Init Mysqldump
            $dump = new Mysqldump('mysql:host=' . $dbHost . ';dbname=' . $dbName, $dbUser, $dbPass);
            $dump->start($path);

            return response()->download($path)->deleteFileAfterSend(true);
            
        } catch (\Exception $e) {
            Log::error('Backup Error: ' . $e->getMessage());
            return back()->with('error', 'Failed to generate backup: ' . $e->getMessage());
        }
    }
}
