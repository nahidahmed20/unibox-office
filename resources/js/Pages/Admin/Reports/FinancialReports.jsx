import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function FinancialReports({ clientsReport = [], monthlyReport = [], summary = {}, filters = {} }) {
    /* STREAMING_CHUNK: State Management */
    const [activeTab, setActiveTab] = useState('client');
    const [searchClient, setSearchClient] = useState('');
    const [searchMonth, setSearchMonth] = useState('');

    // Date Filters State
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [filterYear, setFilterYear] = useState(filters.year || '');
    
    const isFirstRender = useRef(true);

    // Get unique years for the dropdown (from 2020 up to current year + 2)
    const currentYear = new Date().getFullYear();
    const years = Array.from(new Array(10), (val, index) => currentYear - 5 + index).sort((a, b) => b - a);

    /* STREAMING_CHUNK: Filtering & Reload Logic */
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (filterYear) params.year = filterYear;

            router.get(route('admin.reports.financial'), params, { preserveState: true, replace: true });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [startDate, endDate, filterYear]);

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setFilterYear('');
    };

    /* STREAMING_CHUNK: Export Helpers */
    const handlePrint = (elementId, title) => {
        const tableContent = document.getElementById(elementId);
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <p>Date Generated: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        link.click();
    };

    const exportClientCSV = () => {
        if (!filteredClients.length) return Swal.fire("Empty!", "No data to export", "warning");
        let headers = "Client Name,Total Projects,Project Value (Receivable),Total Cost (Expenses),Cost Paid,Cost Due,Est. Profit\n";
        let rows = filteredClients.map(c => {
            const profit = c.total_budget - c.total_expense;
            return `"${c.client_name}","${c.total_projects}","${c.total_budget}","${c.total_expense}","${c.vendor_paid}","${c.vendor_due}","${profit}"`;
        }).join("\n");
        downloadCSV(headers + rows, `Client_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const exportMonthlyCSV = () => {
        if (!filteredMonths.length) return Swal.fire("Empty!", "No data to export", "warning");
        let headers = "Month,Project Name,Client,Budget,Cost (Expenses),Est. Profit,Status\n";
        let rows = [];
        filteredMonths.forEach(m => {
            m.projects.forEach(p => {
                rows.push(`"${m.month}","${p.title}","${p.client}","${p.budget}","${p.expense}","${p.profit}","${p.status}"`);
            });
            // Month Summary Row
            rows.push(`"Summary for ${m.month}",,, "${m.month_budget}","${m.month_expense}","${m.month_profit}",""`);
        });
        downloadCSV(headers + rows.join("\n"), `Monthly_Projects_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const filteredClients = clientsReport.filter(c => c.client_name.toLowerCase().includes(searchClient.toLowerCase()));
    const filteredMonths = monthlyReport.filter(m => m.month.toLowerCase().includes(searchMonth.toLowerCase()));

    return (
        <AdminLayout>
            <Head title="Financial & Project Reports"/>
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* STREAMING_CHUNK: Header & Date Filters */}
                <div className="page-header" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Business Financial Reports</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Analyze client profitability, monthly expenses, and net profit margins.</p>
                    </div>

                    <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Year:</label>
                            <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setStartDate(''); setEndDate(''); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#f8fafc' }}>
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Date Range:</label>
                            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterYear(''); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }} />
                            <span style={{ color: '#94a3b8' }}>to</span>
                            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterYear(''); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }} />
                        </div>
                        {(startDate || endDate || filterYear) && (
                            <button onClick={resetFilters} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* STREAMING_CHUNK: Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Project Value (Receivable)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', marginTop: '8px' }}>BDT {summary.total_receivable?.toLocaleString('en-IN')}</div>
                    </div>
                    
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Project Cost (Expenses)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', marginTop: '8px' }}>BDT {summary.total_cost?.toLocaleString('en-IN')}</div>
                    </div>

                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Estimated Net Profit</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: summary.net_profit >= 0 ? '#15803d' : '#dc2626', marginTop: '8px' }}>
                            BDT {summary.net_profit?.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* STREAMING_CHUNK: Tabs Navigation */}
                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <button 
                            onClick={() => setActiveTab('client')}
                            style={{ padding: '16px 24px', fontWeight: '600', fontSize: '0.95rem', border: 'none', background: activeTab === 'client' ? '#fff' : 'transparent', color: activeTab === 'client' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'client' ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <i className="fa-solid fa-users" style={{ marginRight: '8px' }}></i> Client-Wise Summary
                        </button>
                        <button 
                            onClick={() => setActiveTab('monthly')}
                            style={{ padding: '16px 24px', fontWeight: '600', fontSize: '0.95rem', border: 'none', background: activeTab === 'monthly' ? '#fff' : 'transparent', color: activeTab === 'monthly' ? '#2563eb' : '#64748b', borderBottom: activeTab === 'monthly' ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <i className="fa-regular fa-calendar-days" style={{ marginRight: '8px' }}></i> Monthly Project Details
                        </button>
                    </div>

                    {/* STREAMING_CHUNK: Client-Wise Report Section */}
                    {activeTab === 'client' && (
                        <div>
                            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', flexWrap: 'wrap', gap: '10px' }}>
                                <div className="search-box" style={{ position: "relative" }}>
                                    <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                                    <input type="text" placeholder="Search Client..." value={searchClient} onChange={(e) => setSearchClient(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={exportClientCSV} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#16a34a", fontWeight: '600' }}>
                                        <i className="fas fa-file-excel"></i> Excel / CSV
                                    </button>
                                    <button onClick={() => handlePrint('client-report-table', 'Client-Wise Profitability Report')} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: '600' }}>
                                        <i className="fas fa-print"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table id="client-report-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead>
                                        <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0", borderTop: "1px solid #e2e8f0" }}>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Client Name</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>Total Projects</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Project Value (Receivable)</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Total Cost (Expenses)</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Cost Paid</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Cost Due</th>
                                            <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Est. Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map((client, index) => {
                                                const profit = client.total_budget - client.total_expense;
                                                return (
                                                    <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                        <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>{client.client_name}</td>
                                                        <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>{client.total_projects}</span>
                                                        </td>
                                                        <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "600", color: "#3b82f6" }}>{client.total_budget.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "600", color: "#ef4444" }}>{client.total_expense.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "16px 24px", textAlign: "right", color: "#16a34a" }}>{client.vendor_paid.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "16px 24px", textAlign: "right", color: "#dc2626" }}>{client.vendor_due.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "700", color: profit >= 0 ? "#15803d" : "#dc2626" }}>
                                                            {profit > 0 ? '+' : ''}{profit.toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No clients found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STREAMING_CHUNK: Monthly Project Report Section */}
                    {activeTab === 'monthly' && (
                        <div>
                            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', flexWrap: 'wrap', gap: '10px' }}>
                                <div className="search-box" style={{ position: "relative" }}>
                                    <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                                    <input type="text" placeholder="Search Month (e.g. July 2026)..." value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={exportMonthlyCSV} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#16a34a", fontWeight: '600' }}>
                                        <i className="fas fa-file-excel"></i> Excel / CSV
                                    </button>
                                    <button onClick={() => handlePrint('monthly-report-table', 'Monthly Projects Report')} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: '600' }}>
                                        <i className="fas fa-print"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table id="monthly-report-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    {filteredMonths.length > 0 ? (
                                        filteredMonths.map((data, index) => (
                                            <React.Fragment key="{index}">
                                                <thead>
                                                    <tr style={{ background: "#1e293b" }}>
                                                        <th colSpan="5" style={{ padding: "12px 24px", fontSize: "0.9rem", fontWeight: "700", color: "#fff", textTransform: "uppercase" }}>
                                                            <i className="fa-regular fa-calendar" style={{ marginRight: '8px' }}></i> {data.month}
                                                        </th>
                                                    </tr>
                                                    <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                                        <th style={{ padding: "10px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Project Name</th>
                                                        <th style={{ padding: "10px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Client</th>
                                                        <th style={{ padding: "10px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Budget</th>
                                                        <th style={{ padding: "10px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Cost (Expenses)</th>
                                                        <th style={{ padding: "10px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Est. Profit</th>
                                                    </tr>
                                                </thead>
                                                <tbody style={{ color: "#334155", fontSize: "0.9rem" }}>
                                                    {data.projects.map((proj, pIdx) => (
                                                        <tr key={pIdx} style={{ borderBottom: "1px solid #f8fafc" }}>
                                                            <td style={{ padding: "12px 24px", fontWeight: "600", color: "#0f172a" }}>
                                                                {proj.title}
                                                                {proj.status === 'completed' && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px' }}>Completed</span>}
                                                            </td>
                                                            <td style={{ padding: "12px 24px", color: "#475569" }}>{proj.client}</td>
                                                            <td style={{ padding: "12px 24px", textAlign: "right", color: "#3b82f6" }}>{proj.budget.toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: "12px 24px", textAlign: "right", color: "#ef4444" }}>{proj.expense.toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: "12px 24px", textAlign: "right", fontWeight: "600", color: proj.profit >= 0 ? "#15803d" : "#dc2626" }}>
                                                                {proj.profit.toLocaleString('en-IN')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                                        <td colSpan="2" style={{ padding: "12px 24px", textAlign: "right", fontWeight: "700", color: "#1e293b", textTransform: "uppercase", fontSize: "0.8rem" }}>Summary for {data.month}:</td>
                                                        <td style={{ padding: "12px 24px", textAlign: "right", fontWeight: "700", color: "#1e293b" }}>{data.month_budget.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "12px 24px", textAlign: "right", fontWeight: "700", color: "#1e293b" }}>{data.month_expense.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: "12px 24px", textAlign: "right", fontWeight: "700", color: data.month_profit >= 0 ? "#15803d" : "#dc2626", borderTop: "2px solid #1e293b" }}>
                                                            {data.month_profit.toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tbody><tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No monthly records found.</td></tr></tbody>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}