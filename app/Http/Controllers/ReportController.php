<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function financialSummary(Request $request)
    {
        $query = DB::table('projects')
            ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
            ->leftJoin('project_expenses', 'projects.id', '=', 'project_expenses.project_id');

        if ($request->filled('start_date')) {
            $query->whereDate('projects.start_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('projects.start_date', '<=', $request->end_date);
        }
        if ($request->filled('year')) {
            $query->whereYear('projects.start_date', $request->year);
        }

        $projectsData = $query->select(
                'projects.id',
                'projects.title',
                'projects.budget',
                'projects.start_date',
                'projects.status',
                'clients.name as client_name',
                DB::raw('COALESCE(SUM(project_expenses.total_bill), 0) as total_expense'),
                DB::raw('COALESCE(SUM(project_expenses.paid_amount), 0) as vendor_paid'),
                DB::raw('COALESCE(SUM(project_expenses.due_amount), 0) as vendor_due')
            )
            ->groupBy('projects.id', 'projects.title', 'projects.budget', 'projects.start_date', 'projects.status', 'clients.name')
            ->orderBy('projects.start_date', 'desc')
            ->get();

        $clientsMap = [];
        $overallTotalBudget = 0;
        $overallTotalExpense = 0;

        foreach ($projectsData as $p) {
            $cName = $p->client_name ?? 'Unknown Client';
            if (!isset($clientsMap[$cName])) {
                $clientsMap[$cName] = [
                    'client_name' => $cName,
                    'total_projects' => 0,
                    'total_budget' => 0,
                    'total_expense' => 0,
                    'vendor_paid' => 0,
                    'vendor_due' => 0,
                ];
            }
            $clientsMap[$cName]['total_projects'] += 1;
            $clientsMap[$cName]['total_budget'] += (float)$p->budget;
            $clientsMap[$cName]['total_expense'] += (float)$p->total_expense;
            $clientsMap[$cName]['vendor_paid'] += (float)$p->vendor_paid;
            $clientsMap[$cName]['vendor_due'] += (float)$p->vendor_due;

            $overallTotalBudget += (float)$p->budget;
            $overallTotalExpense += (float)$p->total_expense;
        }
        $clientsData = array_values($clientsMap);

        $monthlyData = [];
        foreach ($projectsData as $p) {
            $month = $p->start_date ? date('F Y', strtotime($p->start_date)) : 'No Date Provided';
            $sortKey = $p->start_date ? date('Y-m', strtotime($p->start_date)) : '0000-00';
            
            if (!isset($monthlyData[$month])) {
                $monthlyData[$month] = [
                    'month' => $month,
                    'sort_key' => $sortKey,
                    'projects' => [],
                    'month_budget' => 0,
                    'month_expense' => 0,
                    'month_profit' => 0
                ];
            }
            $monthlyData[$month]['projects'][] = [
                'title' => $p->title,
                'client' => $p->client_name,
                'budget' => (float)$p->budget,
                'expense' => (float)$p->total_expense,
                'profit' => (float)$p->budget - (float)$p->total_expense,
                'status' => $p->status
            ];
            $monthlyData[$month]['month_budget'] += (float)$p->budget;
            $monthlyData[$month]['month_expense'] += (float)$p->total_expense;
            $monthlyData[$month]['month_profit'] += ((float)$p->budget - (float)$p->total_expense);
        }

        usort($monthlyData, function($a, $b) {
            return strcmp($b['sort_key'], $a['sort_key']);
        });

        $summary = [
            'total_receivable' => $overallTotalBudget,
            'total_cost' => $overallTotalExpense,
            'net_profit' => $overallTotalBudget - $overallTotalExpense
        ];

        return Inertia::render('Admin/Reports/FinancialReports', [
            'clientsReport' => $clientsData,
            'monthlyReport' => $monthlyData,
            'summary' => $summary,
            'filters' => $request->only(['start_date', 'end_date', 'year'])
        ]);
    }
}