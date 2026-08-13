<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Client;
use App\Models\InvoicePayment;
use App\Models\ProjectExpense;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function financialSummary(Request $request)
    {
        $query = DB::table('projects')
            ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
            ->leftJoin('project_expenses', 'projects.id', '=', 'project_expenses.project_id')
            ->whereNull('projects.deleted_at') 
            ->whereNull('clients.deleted_at'); 

        if ($request->filled('start_date')) {
            $query->whereDate('projects.start_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('projects.start_date', '<=', $request->end_date);
        }
        if ($request->filled('year') && !$request->filled('start_date') && !$request->filled('end_date')) {
            $query->whereYear('projects.start_date', $request->year);
        }

        $projectsData = $query->select(
                'projects.id',
                'projects.client_id', 
                'projects.title',
                'projects.budget',
                'projects.start_date',
                'projects.status',
                'clients.name as client_name',
                DB::raw('COALESCE(SUM(project_expenses.total_bill), 0) as total_expense'),
                DB::raw('COALESCE(SUM(project_expenses.paid_amount), 0) as vendor_paid'),
                DB::raw('COALESCE(SUM(project_expenses.due_amount), 0) as vendor_due')
            )
            ->groupBy('projects.id', 'projects.client_id', 'projects.title', 'projects.budget', 'projects.start_date', 'projects.status', 'clients.name')
            ->orderBy('projects.start_date', 'desc')
            ->get();

        $clientsMap = [];
        $overallTotalBudget = 0;
        $overallTotalExpense = 0;

        foreach ($projectsData as $p) {
            $cName = $p->client_name ?? 'Unknown Client';
            if (!isset($clientsMap[$cName])) {
                $clientsMap[$cName] = [
                    'client_id' => $p->client_id, 
                    'client_name' => $cName,
                    'total_projects' => 0,
                    'total_budget' => 0,
                    'total_expense' => 0,
                    'vendor_paid' => 0,
                    'vendor_due' => 0,
                    'total_invoices' => 0,
                    'total_billed' => 0,
                    'total_paid' => 0,
                    'total_due' => 0,
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

        $clientIds = array_filter(array_column($clientsMap, 'client_id'));

        if (!empty($clientIds)) {
            $invoiceStats = DB::table('invoices')
                ->whereIn('client_id', $clientIds)
                ->whereNull('deleted_at')
                ->select(
                    'client_id',
                    DB::raw('COUNT(id) as total_invoices'),
                    DB::raw('SUM(grand_total) as total_billed')
                )
                ->groupBy('client_id')
                ->get()
                ->keyBy('client_id');

            $paymentStats = DB::table('invoice_payments')
                ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                ->whereIn('invoices.client_id', $clientIds)
                ->whereNull('invoices.deleted_at')
                ->select(
                    'invoices.client_id',
                    DB::raw('SUM(invoice_payments.amount) as total_paid')
                )
                ->groupBy('invoices.client_id')
                ->get()
                ->keyBy('client_id');

            foreach ($clientsMap as $cName => &$data) {
                $cId = $data['client_id'];
                if ($cId) {
                    $inv = $invoiceStats->get($cId) ?? null;
                    $pay = $paymentStats->get($cId) ?? null;

                    $data['total_invoices'] = $inv ? (int)$inv->total_invoices : 0;
                    $data['total_billed']   = $inv ? (float)$inv->total_billed : 0;
                    $data['total_paid']     = $pay ? (float)$pay->total_paid : 0;
                    $data['total_due']      = $data['total_billed'] - $data['total_paid'];
                }
            }
            unset($data);
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

        $overallTotalBilled = array_sum(array_column($clientsMap, 'total_billed'));
        $overallTotalPaid = array_sum(array_column($clientsMap, 'total_paid'));

        $summary = [
            'total_receivable' => $overallTotalBudget,
            'total_cost' => $overallTotalExpense,
            'net_profit' => $overallTotalBudget - $overallTotalExpense,
            'total_invoiced' => $overallTotalBilled,
            'total_received' => $overallTotalPaid,
        ];

        return Inertia::render('Admin/Reports/FinancialReports', [
            'clientsReport' => $clientsData,
            'monthlyReport' => $monthlyData,
            'summary' => $summary,
            'filters' => $request->only(['start_date', 'end_date', 'year'])
        ]);
    }

    public function transactionsReport(Request $request)
    {
        $query = AccountTransaction::with('account:id,name');

        if ($request->account_id) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->source_type) {
            $query->where('source_type', $request->source_type);
        }
        if ($request->from) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->to) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $transactions = $query->latest()->paginate(50)->withQueryString();

        return Inertia::render('Admin/Reports/TransactionsReport', [
            'transactions' => $transactions,
            'accounts'     => Account::select('id', 'name')->get(),
            'filters'      => $request->only('account_id', 'source_type', 'from', 'to'),
        ]);
    }

    public function clientLedger(Request $request)
    {
        $clients = Client::select('id', 'name', 'phone', 'company_name')->orderBy('name')->get();
        
        $ledger = [];
        $summary = [
            'total_billed' => 0, 
            'total_paid' => 0, 
            'total_advance' => 0, 
            'net_due' => 0
        ];
        $clientInfo = null;

        if ($request->filled('client_id')) {
            $clientInfo = Client::with([
                'projects' => function($q) {
                    $q->where('status', 'completed'); 
                }, 
                'invoices.payments', 
                'clientAdvances'
            ])->find($request->client_id);

            if ($clientInfo) {
                $events = collect();

                foreach ($clientInfo->projects as $project) {
                    $budget = (float) ($project->budget ?? $project->amount ?? 0); 

                    $events->push([
                        'date' => $project->deadline ?? $project->updated_at->format('Y-m-d'),
                        'type' => 'Project',
                        'ref' => 'PRJ-' . $project->id,
                        'description' => "Project Completed: " . $project->title,
                        'debit' => $budget,
                        'credit' => 0,
                    ]);
                    $summary['total_billed'] += $budget;
                }

                foreach ($clientInfo->invoices as $invoice) {
                    $events->push([
                        'date' => $invoice->invoice_date ?? $invoice->created_at->format('Y-m-d'),
                        'type' => 'Invoice',
                        'ref' => $invoice->invoice_number ?? 'INV-' . $invoice->id,
                        'description' => "Invoice Generated",
                        'debit' => (float) $invoice->grand_total,
                        'credit' => 0,
                    ]);
                    $summary['total_billed'] += (float) $invoice->grand_total;
                    
                    foreach ($invoice->payments as $payment) {
                        $events->push([
                            'date' => $payment->payment_date ?? $payment->created_at->format('Y-m-d'),
                            'type' => 'Payment',
                            'ref' => $invoice->invoice_number ?? 'INV-' . $invoice->id,
                            'description' => $payment->note ?? "Payment received for invoice",
                            'debit' => 0,
                            'credit' => (float) $payment->amount,
                        ]);
                        $summary['total_paid'] += (float) $payment->amount;
                    }
                }

                foreach ($clientInfo->clientAdvances as $advance) {
                    $events->push([
                        'date' => $advance->date ?? $advance->created_at->format('Y-m-d'),
                        'type' => 'Advance',
                        'ref' => 'ADV-' . $advance->id,
                        'description' => $advance->note ?? "Advance payment received",
                        'debit' => 0,
                        'credit' => (float) $advance->amount,
                    ]);
                    $summary['total_advance'] += (float) $advance->amount;
                }

                $sorted = $events->sortBy(function ($event) {
                    return strtotime($event['date']);
                })->values()->all();

                $balance = 0; 
                foreach ($sorted as $item) {
                    $balance += $item['debit'];   
                    $balance -= $item['credit'];  
                    
                    $item['balance'] = $balance;
                    $ledger[] = $item;
                }
                
                $summary['net_due'] = $balance;
            }
        }

        return Inertia::render('Admin/Reports/ClientLedger', [
            'clients' => $clients,
            'ledger' => $ledger,
            'summary' => $summary,
            'clientInfo' => $clientInfo,
            'filters' => $request->only(['client_id'])
        ]);
    }

    public function clientDuesReport(Request $request)
    {
        $query = Client::query()
            ->select('clients.id', 'clients.name', 'clients.company_name', 'clients.phone', 'clients.email')
            ->addSelect([
                'total_invoiced' => DB::table('invoices')
                    ->whereColumn('client_id', 'clients.id')
                    ->whereNull('deleted_at') 
                    ->selectRaw('COALESCE(SUM(grand_total), 0)'),
                    
                'total_paid' => DB::table('invoice_payments')
                    ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                    ->whereColumn('invoices.client_id', 'clients.id')
                    ->whereNull('invoices.deleted_at')
                    ->selectRaw('COALESCE(SUM(invoice_payments.amount), 0)'),
                    
                'total_advance' => DB::table('client_advances')
                    ->whereColumn('client_id', 'clients.id')
                    ->selectRaw('COALESCE(SUM(amount), 0)'),
                    
                'total_used' => DB::table('client_advances')
                    ->whereColumn('client_id', 'clients.id')
                    ->selectRaw('COALESCE(SUM(used_amount), 0)')
            ]);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('company_name', 'like', "%{$searchTerm}%")
                ->orWhere('phone', 'like', "%{$searchTerm}%")
                ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }

        $grandTotalDue = (clone $query)->get()->sum(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid;
            return max($invoiced - $paid, 0);
        });

        $perPage = $request->input('per_page') === 'all' ? 999999 : (int) $request->input('per_page', 10);

        $clientDues = $query->latest('clients.created_at')->paginate($perPage)->through(function ($client) {
            $invoiced = (float) $client->total_invoiced;
            $paid = (float) $client->total_paid;
            $advance = (float) $client->total_advance;
            $used = (float) $client->total_used;
            
            $client->total_due = max($invoiced - $paid, 0);
            $client->available_advance = max($advance - $used, 0);
            
            return $client;
        })->withQueryString();

        return Inertia::render('Admin/Reports/ClientDues', [
            'clientDues' => $clientDues,
            'filters' => $request->only('search', 'per_page'),
            'grandTotalDue' => $grandTotalDue,   
        ]);
    }

    public function vendorDuesReport(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');

        $query = Vendor::select('id', 'name as vendor_name', 'company_name', 'phone', 'wallet_balance')
            ->withSum('projectExpenses as total_due', 'due_amount')
            ->where(function ($q) {
                $q->whereHas('projectExpenses', function ($subQ) {
                    $subQ->where('due_amount', '>', 0);
                })->orWhere('wallet_balance', '>', 0);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $grandTotalDue = ProjectExpense::whereIn('vendor_id', $query->pluck('id'))->sum('due_amount');
        $grandTotalAdvance = clone $query;
        $totalAdvanceAmount = $grandTotalAdvance->sum('wallet_balance');
        $vendorDues = $query->latest('id')->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Reports/VendorDues', [
            'vendorDues' => $vendorDues,
            'grandTotal' => $grandTotalDue, 
            'grandTotalAdvance' => $totalAdvanceAmount 
        ]);
    }

}