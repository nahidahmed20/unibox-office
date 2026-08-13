import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ accounts = { data: [], links: [] }, summary = {}, filters = {} }) {
    
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '',
        type: 'cash',
        account_number: '',
        opening_balance: '',
        is_active: 1
    });

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(
                route('admin.accounts.index'), 
                params, 
                { preserveState: true, replace: true, preserveScroll: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const accList = accounts.data || [];

    const handleCopy = () => {
        if (!accList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = accList
            .map((a) => `${a.name}\t${a.type}\t${a.account_number || "N/A"}\t${a.opening_balance}\t${a.current_balance}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!accList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Account Name,Type,A/C Number,Opening Balance,Current Balance,Status\n"];
        const rows = accList.map(a => `"${a.name}","${a.type}","${a.account_number || ''}","${a.opening_balance}","${a.current_balance}","${a.is_active ? 'Active' : 'Inactive'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Accounts_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Accounts & Balances Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>Accounts & Balances Report</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Submits ---
    const openCreateModal = () => {
        clearErrors(); 
        setData({
            id: '',
            name: '',
            type: 'cash', 
            opening_balance: 0, 
            current_balance: 0, 
            account_number: '',
            is_active: 1    
        });
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (acc) => {
        clearErrors(); 
        setData({
            id: acc.id, 
            name: acc.name || '',
            type: acc.type || 'cash',
            account_number: acc.account_number || '',
            opening_balance: acc.opening_balance || '',
            is_active: acc.is_active !== undefined ? acc.is_active : 1
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.accounts.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.accounts.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this account?',
            text: "You can only delete accounts with no transactions.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.accounts.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Account removed successfully.", timer: 1500, showConfirmButton: false }),
                    onError: () => Swal.fire({ icon: "error", title: "Error!", text: "Cannot delete account with existing transactions.", confirmButtonColor: '#3b82f6' })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Accounts & Balances" />
            
            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Accounts & Financial Overview</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage cash, bank accounts, advances and company assets.</p>
                    </div>
                </div>

                {/* --- 5 PREMIUM FINANCIAL SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    {/* 1. Bank & Cash Balance */}
                    <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-building-columns text-blue-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-blue-600 tracking-wider">Bank & Cash Bal.</span>
                        <div className="text-[22px] font-extrabold text-blue-900 z-10">
                            TK. {Number(summary.total_balance || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* 2. Employee Advance */}
                    <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-user-tie text-emerald-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-emerald-600 tracking-wider">Emp. Advance (Given)</span>
                        <div className="text-[22px] font-extrabold text-emerald-900 z-10">
                            TK. {Number(summary.employee_advance || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* 3. Vendor Advance */}
                    <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-purple-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-truck-field text-purple-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-purple-600 tracking-wider">Vendor Adv. (Given)</span>
                        <div className={`text-[22px] font-extrabold z-10 ${summary.vendor_advance >= 0 ? 'text-purple-900' : 'text-red-600'}`}>
                            {summary.vendor_advance < 0 ? '-' : ''}TK. {Math.abs(summary.vendor_advance || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* 4. Client Advance */}
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-hand-holding-dollar text-amber-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-amber-600 tracking-wider">Client Adv. (Received)</span>
                        <div className="text-[22px] font-extrabold text-amber-900 z-10">
                            TK. {Number(summary.client_advance || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* 5. Total Assets */}
                    <div className="bg-white p-5 rounded-xl border border-teal-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-teal-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-couch text-teal-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-teal-600 tracking-wider">Company Assets</span>
                        <div className="text-[22px] font-extrabold text-teal-900 z-10">
                            TK. {Number(summary.total_assets || 0).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-vault text-[var(--accent)]"></i> Account List
                        </div>
                        {(isSuperAdmin || hasPermission('create_account')) && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Add Account
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[100px] appearance-none bg-white rounded-md border border-gray-300 px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search account..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Account Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">A/C Number</th>
                                    <th className="px-6 py-4 text-right">Opening Bal.</th>
                                    <th className="px-6 py-4 text-right">Current Bal.</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    {isSuperAdmin && (
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {accList.length > 0 ? (
                                    accList.map((acc, index) => (
                                        <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {accounts.from ? accounts.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900 text-[14.5px]">{acc.name}</td>
                                            <td className="px-6 py-4 capitalize">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border
                                                    ${acc.type === 'cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                                    ${acc.type === 'bank' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                                                    ${acc.type === 'mobile_banking' ? 'bg-purple-50 text-purple-600 border-purple-200' : ''}
                                                `}>
                                                    {acc.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                {acc.account_number ? (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 tracking-wider">{acc.account_number}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500 font-medium">
                                                {parseFloat(acc.opening_balance).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-extrabold text-[15px] px-3 py-1.5 rounded-lg border inline-block min-w-[100px] text-center shadow-sm ${acc.current_balance < 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                                                    TK. {parseFloat(acc.current_balance).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border
                                                    ${acc.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}
                                                `}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    {acc.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            
                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_account') && (
                                                            <button onClick={() => openEditModal(acc)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Account">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_account') && (
                                                            <button onClick={() => handleDelete(acc.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Account">
                                                                <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? "8" : "7"} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-vault text-4xl text-gray-300 mb-3"></i>
                                                <p>No accounts found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination & Total Balance Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                        {/* Total Balance Bottom Summary */}
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 shadow-sm">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-800"><i className="fa-solid fa-coins mr-1"></i> Net Cash & Bank:</span>
                            <span className="text-[16px] font-extrabold">TK. {Number(summary.total_balance || 0).toLocaleString('en-IN')}</span>
                        </div>

                        {/* Pagination Links */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {accounts.total > 0 && (
                                <div className="text-[13px] text-gray-500 text-center sm:text-right">
                                    Showing {accounts.from || 0} to {accounts.to || 0} of {accounts.total || 0} entries
                                </div>
                            )}

                            {accounts.links && accounts.links.length > 3 && (
                                <div className="flex flex-wrap items-center gap-1">
                                    {accounts.links.map((link, index) => (
                                        <Link 
                                            key={index} 
                                            href={link.url || "#"} 
                                            className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                                ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                            `}
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL (IMPROVED UI) --- */}
            {showModal && isSuperAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-[var(--accent)]"></i> Modify Account Details</>
                                ) : (
                                    <><i className="fa-solid fa-vault text-[var(--accent)]"></i> Setup New Account</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                                
                                {/* Section 1: Account Info */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-building-columns text-gray-400"></i> Account Information
                                    </h4>
                                    
                                    <div className="flex flex-col gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Account Name <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={data.name} 
                                                onChange={e => setData('name', e.target.value)} 
                                                placeholder="e.g. Main Cash, DBBL Bank" 
                                                required 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Account Type <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <select 
                                                        value={data.type} 
                                                        onChange={e => setData('type', e.target.value)} 
                                                        className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer" 
                                                        required
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="bank">Bank Account</option>
                                                        <option value="mobile_banking">Mobile Banking</option>
                                                    </select>
                                                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">A/C Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                                                <input 
                                                    type="text" 
                                                    value={data.account_number} 
                                                    onChange={e => setData('account_number', e.target.value)} 
                                                    placeholder="If bank/mobile" 
                                                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Financials & Status */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-sliders text-gray-400"></i> Balance & Status
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Opening Balance</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-[13px]">TK.</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={data.opening_balance} 
                                                    onChange={e => setData('opening_balance', e.target.value)} 
                                                    disabled={editMode && !isSuperAdmin} 
                                                    placeholder="0.00" 
                                                    className={`w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] font-semibold outline-none transition-shadow ${editMode && !isSuperAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50'}`} 
                                                />
                                            </div>
                                            {editMode && !isSuperAdmin && (
                                                <p className="text-amber-600 text-[11px] mt-1.5 flex items-center gap-1">
                                                    <i className="fa-solid fa-lock"></i> Opening balance is locked.
                                                </p>
                                            )}
                                            {errors.opening_balance && <p className="text-red-500 text-[12px] mt-1">{errors.opening_balance}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Account Status</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.is_active} 
                                                    onChange={e => setData('is_active', e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                                >
                                                    <option value={1}>Active</option>
                                                    <option value={0}>Inactive</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2 shadow-sm">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Account" : "Confirm Account"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}