import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], totals = null }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Toolbar Filters
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const queryVal = new URLSearchParams(window.location.search).get("per_page");
        return queryVal === "all" ? "all" : (Number(queryVal) || 10);
    });
    const [projectFilter, setProjectFilter] = useState(() => new URLSearchParams(window.location.search).get('project_id') || '');
    const [projectFilterSearch, setProjectFilterSearch] = useState("");
    const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);

    const isFirstRender = useRef(true);
    const filterRef = useRef(null);

    const [yearFilter, setYearFilter] = useState(() => new URLSearchParams(window.location.search).get('year') || '');
    const [dateFrom, setDateFrom] = useState(() => new URLSearchParams(window.location.search).get('date_from') || '');
    const [dateTo, setDateTo] = useState(() => new URLSearchParams(window.location.search).get('date_to') || '');
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) setShowProjectFilterDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            if (projectFilter) params.project_id = projectFilter;
            if (yearFilter) params.year = yearFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(route('admin.project-expenses.index'), params, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage, projectFilter, yearFilter, dateFrom, dateTo]);

    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList.map((e) => `${e.date}\t${e.title}\t${e.vendor?.name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`).join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Project,Expense Title,Vendor,Account/Source,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.title || ''}","${e.title}","${e.vendor?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'Wallet')}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const openViewModal = (expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this record?',
            text: "Paid amount will be refunded to your account/advance balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.project-expenses.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed and balance restored.", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const handleMoveToWallet = (exp) => {
        Swal.fire({
            title: 'Move to Vendor Wallet?',
            text: `This will remove the expense from the project and move BDT ${exp.paid_amount} to ${exp.vendor.name}'s Wallet.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.project-expenses.move-to-wallet', exp.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Moved!", text: "Amount added to Vendor Wallet.", timer: 1500, showConfirmButton: false }),
                    onError: (errors) => Swal.fire("Error", errors.error || "Something went wrong.", "error")
                });
            }
        });
    };

    const getPaymentStatusBadge = (status) => {
        if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
        if (status === 'partial') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    };

    const totalBilled = totals ? totals.total_bill : expList.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalPaid = totals ? totals.paid_amount : expList.reduce((sum, item) => sum + parseFloat(item.paid_amount || 0), 0);
    const totalDue = totals ? totals.due_amount : expList.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);
    const filteredProject = projectFilter ? projects.find(p => p.id == projectFilter) : null;
    const filteredProjectTitle = filteredProject ? `${filteredProject.title} (${filteredProject.client?.name || 'No Client'})` : null;

    return (
        <AdminLayout>
            <Head title="Project Expenses & Payables" />

            <div className="flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Project Accounts Payable</h1>
                        <p className="text-[14px] text-gray-500 mt-1">
                            {filteredProjectTitle ? <>Showing totals for <strong className="text-[var(--accent)]">{filteredProjectTitle}</strong></> : "Manage vendor bills and track project costs."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">Total Billed</span>
                            <span className="text-[16px] font-bold">BDT {totalBilled.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">Total Paid</span>
                            <span className="text-[16px] font-bold">BDT {totalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-0.5">Total Due</span>
                            <span className="text-[16px] font-bold">BDT {totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <h2 className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-wallet text-[var(--accent)]"></i> Vendor Bills & Project Cost
                        </h2>
                        {hasPermission('create_project_expenses') && (
                            <Link href={route('admin.project-expenses.create')} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630]">
                                <i className="fa-solid fa-plus"></i> Log Bill/Expense
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-gray-600">
                            {/* ... Show Entries, Years, Dates Dropdowns (Same as before) ... */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[140px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
                                    <option value="all">All Entries</option>
                                </select>
                            </div>
                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
                            
                            {/* Date Filter */}
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-calendar text-[var(--accent)]"></i>
                                <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); if (e.target.value) { setDateFrom(""); setDateTo(""); } }} className="w-[100px] rounded-md border border-gray-300 bg-white px-3 py-1.5 outline-none focus:border-[var(--accent)]">
                                    <option value="">All Years</option>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none" />
                                <span>–</span>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none" />
                                {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-red-500"><i className="fa-solid fa-xmark"></i></button>}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50"><i className="fas fa-file-excel text-emerald-500"></i> CSV</button>
                            </div>
                            <div className="relative w-full sm:w-[220px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input type="text" placeholder="Search title or vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none focus:border-[var(--accent)]" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Project & Details</th>
                                    <th className="px-6 py-4">Vendor / Payee</th>
                                    <th className="px-6 py-4 text-right">Total Bill</th>
                                    <th className="px-6 py-4 text-right">Paid</th>
                                    <th className="px-6 py-4 text-right">Due</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => {
                                        const badgeClass = getPaymentStatusBadge(exp.payment_status);
                                        return (
                                            <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-gray-500">{project_expenses.from ? project_expenses.from + index : index + 1}</td>
                                                <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{exp.project?.title || 'N/A'}</div>
                                                    <div className="text-[12px] text-gray-500 mt-0.5">{exp.title}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-800">{exp.vendor?.name || '-'}</div>
                                                    <div className="text-[11.5px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                        {exp.account_id ? <><i className="fa-solid fa-building-columns text-blue-500"></i> {exp.account?.name}</> : exp.advance_user_id ? <><i className="fa-solid fa-hand-holding-dollar text-emerald-500"></i> Advance</> : exp.paid_amount > 0 ? <><i className="fa-solid fa-wallet text-purple-500"></i> Vendor Wallet</> : 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-gray-900">{parseFloat(exp.total_bill).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{parseFloat(exp.paid_amount).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-rose-600">{parseFloat(exp.due_amount).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>{exp.payment_status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                            <button onClick={() => handleMoveToWallet(exp)} className="flex h-7 w-7 items-center justify-center rounded bg-purple-100 text-purple-600 hover:bg-purple-200" title="Move to Vendor Wallet"><i className="fa-solid fa-money-bill-transfer text-[12px]"></i></button>
                                                        )}
                                                        {hasPermission('view_project_expense') && (
                                                            <button onClick={() => openViewModal(exp)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="View"><i className="fa-regular fa-eye text-[12px]"></i></button>
                                                        )}
                                                        {hasPermission('edit_project_expense') && (
                                                            <Link href={route('admin.project-expenses.edit', exp.id)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200" title="Edit"><i className="fa-regular fa-pen-to-square text-[12px]"></i></Link>
                                                        )}
                                                        {hasPermission('delete_project_expense') && (
                                                            <button onClick={() => handleDelete(exp.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100" title="Delete"><i className="fa-regular fa-trash-can text-[12px]"></i></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                            <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-3"></i>
                                            <p>No project expenses found matching your criteria.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">Showing {project_expenses.from || 0} to {project_expenses.to || 0} of {project_expenses.total || 0} entries</div>
                            <div className="flex gap-1">
                                {project_expenses.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- WIDE & MODERN VIEW MODAL (SHOW) --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col relative my-auto animate-[fadeIn_0.3s_ease-out]">
                        
                        {/* Status Ribbon Ribbon */}
                        <div className={`absolute top-6 -left-2 px-4 py-1.5 text-white text-[12px] font-black tracking-widest uppercase rounded-r-lg shadow-md ${selectedExpense.payment_status === 'paid' ? 'bg-emerald-500' : selectedExpense.payment_status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                            {selectedExpense.payment_status}
                        </div>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-3xl pl-32">
                            <div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Expense Details</h3>
                                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Reference ID: #{String(selectedExpense.id).padStart(6, '0')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <i className="fa-solid fa-print"></i> Print
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-8">
                            
                            {/* Top Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Project</span>
                                    <div className="text-[16px] font-bold text-gray-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-folder text-indigo-500 mt-1"></i> 
                                        <span className="leading-tight">{selectedExpense.project?.title || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Vendor / Payee</span>
                                    <div className="text-[16px] font-bold text-gray-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-user-tie text-blue-500 mt-1"></i> 
                                        <span className="leading-tight">{selectedExpense.vendor?.name || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Expense Title</span>
                                    <div className="text-[15px] font-semibold text-gray-800 leading-tight">
                                        {selectedExpense.title}
                                    </div>
                                    <div className="mt-2 text-[12px] text-gray-500 flex items-center gap-1.5">
                                        <i className="fa-regular fa-calendar-days text-gray-400"></i> {selectedExpense.date}
                                    </div>
                                </div>
                            </div>

                            {/* Financials Row */}
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                {/* Left: Source & Notes */}
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Payment Source</h4>
                                        <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm rounded-xl p-4">
                                            {selectedExpense.account_id ? (
                                                <><div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><i className="fa-solid fa-building-columns"></i></div><div><p className="text-[14px] font-bold text-gray-900">{selectedExpense.account?.name}</p><p className="text-[12px] text-gray-500">Bank / Cash Box</p></div></>
                                            ) : selectedExpense.advance_user_id ? (
                                                <><div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-hand-holding-dollar"></i></div><div><p className="text-[14px] font-bold text-gray-900">{selectedExpense.advance_user?.name}</p><p className="text-[12px] text-gray-500">Advance Balance</p></div></>
                                            ) : selectedExpense.paid_amount > 0 ? (
                                                <><div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><i className="fa-solid fa-wallet"></i></div><div><p className="text-[14px] font-bold text-gray-900">Vendor Wallet</p><p className="text-[12px] text-gray-500">Deducted from wallet</p></div></>
                                            ) : (
                                                <><div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><i className="fa-solid fa-ban"></i></div><div><p className="text-[14px] font-bold text-gray-900">Unpaid / N/A</p></div></>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Remarks / Description</h4>
                                        <div className="bg-gray-50 p-4 rounded-xl text-[14px] text-gray-700 leading-relaxed min-h-[100px] border border-gray-100">
                                            {selectedExpense.description || <span className="text-gray-400 italic">No remarks provided for this transaction.</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Amount Summary Box */}
                                <div className="w-full md:w-[320px] shrink-0 bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                    {/* Decoration */}
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
                                    
                                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-6">Amount Summary</h4>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[14px] text-gray-300">Total Billed</span>
                                            <span className="text-[18px] font-bold text-white">৳{parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[14px] text-emerald-400">Total Paid</span>
                                            <span className="text-[18px] font-bold text-emerald-400">৳{parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-700/50">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[14px] text-rose-300 font-medium">Due Balance</span>
                                            <span className="text-[26px] font-black text-rose-400">৳{parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}