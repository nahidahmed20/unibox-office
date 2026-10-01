import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select'; // 🟢 Added React Select Import
import CustomSelect from '@/Components/CustomSelect';

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], vendors = [], totals = null, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [clientFilter, setClientFilter] = useState(filters.client_id || '');
    const [projectFilter, setProjectFilter] = useState(filters.project_id || '');
    const [vendorFilter, setVendorFilter] = useState(filters.vendor_id || '');
    const [perPage, setPerPage] = useState(filters.per_page === "all" ? "all" : (Number(filters.per_page) || 25));

    const isFirstRender = useRef(true);

    const [yearFilter, setYearFilter] = useState(filters.year || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    const uniqueClients = useMemo(() => {
        const clientsMap = new Map();
        projects.forEach(p => {
            if (p.client) clientsMap.set(p.client.id, p.client);
        });
        return Array.from(clientsMap.values());
    }, [projects]);

    const filteredProjectsList = useMemo(() => {
        if (!clientFilter) return projects;
        return projects.filter(p => p.client_id == clientFilter);
    }, [projects, clientFilter]);

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (clientFilter) params.client_id = clientFilter;
            if (projectFilter) params.project_id = projectFilter;
            if (vendorFilter) params.vendor_id = vendorFilter;
            params.per_page = perPage;
            if (yearFilter) params.year = yearFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(route('admin.project-expenses.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, clientFilter, projectFilter, vendorFilter, perPage, yearFilter, dateFrom, dateTo]);

    // 🟢 UPDATED: React Select Handler
    const handleClientChange = (selectedOption) => {
        setClientFilter(selectedOption ? selectedOption.value : '');
        setProjectFilter('');
    };

    const clearAllFilters = () => {
        setSearchTerm("");
        setClientFilter("");
        setProjectFilter("");
        setVendorFilter("");
        setYearFilter("");
        setDateFrom("");
        setDateTo("");
        setPerPage(25);
    };

    // 🟢 ADDED: Custom Styles for React Select
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "42px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid #6366f1" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
            fontSize: "13px",
            fontWeight: "bold",
            color: "#374151",
            backgroundColor: "#fff",
            cursor: "pointer",
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "13px",
            fontWeight: "bold",
            backgroundColor: state.isSelected ? "#4f46e5" : state.isFocused ? "#f3f4f6" : "#fff",
            color: state.isSelected ? "#fff" : "#374151",
            cursor: "pointer",
        }),
        singleValue: (provided) => ({ ...provided, color: "#374151" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontWeight: "normal" }),
        menu: (provided) => ({
            ...provided,
            zIndex: 50,
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        })
    };

    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList.map((e) => `${e.date}\t${e.project?.client?.name || 'N/A'}\t${e.title}\t${e.payee_name || e.vendor?.name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`).join("\n");
        navigator.clipboard.writeText("Date\tClient\tTitle\tVendor\tTotal Bill\tPaid\tStatus\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Client,Project,Expense Title,Vendor,Account/Source,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.client?.name || ''}","${e.project?.title || ''}","${e.title}","${e.payee_name || e.vendor?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'Wallet')}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
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
            text: "Paid amount will be automatically refunded to your account.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.project-expenses.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed successfully.", timer: 1500, showConfirmButton: false }),

                    onError: (err) => {
                        const errorMessage = err.error || Object.values(err)[0] || "Something went wrong! Cannot delete this record.";
                        Swal.fire({
                            icon: "error",
                            title: "Action Failed",
                            text: errorMessage,
                            confirmButtonColor: "#ef4444"
                        });
                    }
                });
            }
        });
    };

    const handleMoveToWallet = (exp) => {
        Swal.fire({
            title: 'Move to Vendor Wallet?',
            text: `This will remove the expense from the project and move ৳${exp.paid_amount} to ${exp.vendor.name}'s Wallet.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Move'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.project-expenses.move-to-wallet', exp.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Moved!", text: "Amount added to Vendor Wallet.", timer: 1500, showConfirmButton: false }),

                    onError: (err) => {
                        const errorMessage = err.error || Object.values(err)[0] || "Something went wrong while moving to wallet.";
                        Swal.fire({
                            icon: "error",
                            title: "Action Failed",
                            text: errorMessage,
                            confirmButtonColor: "#ef4444"
                        });
                    }
                });
            }
        });
    };

    const totalBilled = totals ? totals.total_bill : expList.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalPaid = totals ? totals.paid_amount : expList.reduce((sum, item) => sum + parseFloat(item.paid_amount || 0), 0);
    const totalDue = totals ? totals.due_amount : expList.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);

    const filteredProject = projectFilter ? projects.find(p => p.id == projectFilter) : null;
    const filteredProjectTitle = filteredProject ? `${filteredProject.title} (${filteredProject.client?.name || 'No Client'})` : null;

    return (
        <AdminLayout>
            <Head title="Project Accounts Payable" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12">

                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Supply Chain & Billing
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Accounts Payable</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            {filteredProjectTitle ? <>Showing totals for <strong className="text-indigo-600 font-bold">{filteredProjectTitle}</strong></> : "Manage vendor bills, log project expenses, and track your payables."}
                        </p>
                    </div>
                </div>

                {/* 🟢 Redesigned Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
                                <i className="fa-solid fa-file-invoice text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Billed</p>
                                <h3 className="text-[26px] font-black text-gray-900 m-0 tracking-tight tabular-nums">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
                                <i className="fa-solid fa-check-double text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-emerald-600/90">Total Paid</p>
                                <h3 className="text-[26px] font-black text-emerald-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-200">
                                <i className="fa-solid fa-clock-rotate-left text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-rose-600/90">Total Due (Payables)</p>
                                <h3 className="text-[26px] font-black text-rose-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-wallet text-[14px]"></i>
                            </div>
                            Vendor Bills & Expenses
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            {hasPermission('create_project_expenses') && (
                                <Link href={route('admin.project-expenses.create')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md ml-2">
                                    <i className="fa-solid fa-plus"></i> Log New Bill
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* 🟢 STUNNING ADVANCED FILTER BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5 bg-white border-b border-gray-100">

                        {/* 1. Client Filter (Searchable) */}
                        <div className="relative z-40">
                            <Select
                                options={uniqueClients.map(client => ({ 
                                    value: client.id, 
                                    label: `${client.name} ${client.company_name ? `(${client.company_name})` : ''}` 
                                }))}
                                value={clientFilter ? { 
                                    value: clientFilter, 
                                    label: uniqueClients.find(c => c.id == clientFilter)?.name + (uniqueClients.find(c => c.id == clientFilter)?.company_name ? ` (${uniqueClients.find(c => c.id == clientFilter)?.company_name})` : '') 
                                } : null}
                                onChange={handleClientChange}
                                isClearable
                                placeholder="All Clients..."
                                styles={customSelectStyles}
                            />
                        </div>

                        {/* 2. Project Filter (Searchable) */}
                        <div className="relative z-30">
                            <Select
                                options={filteredProjectsList.map(p => ({ 
                                    value: p.id, 
                                    label: p.title 
                                }))}
                                value={projectFilter ? { 
                                    value: projectFilter, 
                                    label: filteredProjectsList.find(p => p.id == projectFilter)?.title 
                                } : null}
                                onChange={(opt) => setProjectFilter(opt ? opt.value : '')}
                                isClearable
                                placeholder="All Projects..."
                                styles={customSelectStyles}
                                isDisabled={!clientFilter && filteredProjectsList.length === 0}
                            />
                        </div>

                        {/* 3. Vendor Filter (Searchable) */}
                        <div className="relative z-20">
                            <Select
                                options={vendors.map(v => ({ 
                                    value: v.id, 
                                    label: `${v.name} ${v.company_name ? `(${v.company_name})` : ''}` 
                                }))}
                                value={vendorFilter ? { 
                                    value: vendorFilter, 
                                    label: vendors.find(v => v.id == vendorFilter)?.name + (vendors.find(v => v.id == vendorFilter)?.company_name ? ` (${vendors.find(v => v.id == vendorFilter)?.company_name})` : '') 
                                } : null}
                                onChange={(opt) => setVendorFilter(opt ? opt.value : '')}
                                isClearable
                                placeholder="All Vendors..."
                                styles={customSelectStyles}
                            />
                        </div>

                        {/* 4. Text Search */}
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search bills or payee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-[42px] rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] font-bold text-gray-800 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Secondary Filters (Show Rows, Date Range, Clear) */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">

                        {/* 🟢 Premium SHOW ENTRIES Dropdown */}
                        <div className="relative w-full sm:w-[130px]">
                            <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                            >
                                <option value={10}>10 Rows</option>
                                <option value={25}>25 Rows</option>
                                <option value={50}>50 Rows</option>
                                <option value={100}>100 Rows</option>
                                <option value="all">All Rows</option>
                            </select>
                        </div>

                        {/* 🟢 Premium Year Filter */}
                        <div className="relative w-full sm:w-[130px]">
                            <CustomSelect
                                value={yearFilter}
                                onChange={(e) => { setYearFilter(e.target.value); if (e.target.value) { setDateFrom(""); setDateTo(""); } }}
                                className="appearance-none w-full bg-white border border-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                            >
                                <option value="">All Years</option>
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </CustomSelect>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                <i className="fa-solid fa-calendar text-[11px]"></i>
                            </div>
                        </div>

                        <span className="hidden lg:block text-gray-300 mx-1">|</span>

                        {/* 🟢 Unified Date Range Picker */}
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-auto">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setYearFilter(''); }}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-gray-700 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                            <span className="text-gray-400 font-bold">-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setYearFilter(''); }}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-gray-700 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                        </div>

                        {/* 🟢 Premium Reset Button */}
                        {(dateFrom || dateTo || yearFilter || clientFilter || projectFilter || vendorFilter || searchTerm || perPage !== 25) && (
                            <button onClick={clearAllFilters} className="h-[42px] px-4 rounded-xl border border-rose-200 bg-rose-50 text-[12.5px] font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-300 shadow-sm flex items-center justify-center gap-1.5 sm:ml-auto whitespace-nowrap">
                                <i className="fa-solid fa-rotate-left"></i> Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-gray-50 text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12 text-center">SL</th>
                                    <th className="px-6 py-4.5">Date</th>
                                    <th className="px-6 py-4.5 w-[25%]">Project & Expense</th>
                                    <th className="px-6 py-4.5">Vendor / Payee</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/40 border-l border-gray-100">Total Bill</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/40">Paid Amount</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/40 border-r border-gray-100">Due Amount</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center no-print w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-gray-400 text-center">
                                                {project_expenses.from ? project_expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-[12px] font-bold shadow-sm">
                                                    <i className="fa-regular fa-calendar text-[10px]"></i> {exp.date}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-gray-900 text-[14.5px] mb-1">
                                                    {exp.project?.title || <span className="text-gray-400 italic">No Project Assigned</span>}
                                                </div>
                                                {exp.project?.client && (
                                                    <div className="text-[11.5px] font-bold text-indigo-600 mb-1" title="Client Name">
                                                        <i className="fa-regular fa-building mr-1 opacity-75"></i>
                                                        {exp.project.client.name} {exp.project.client.company_name ? `(${exp.project.client.company_name})` : ''}
                                                    </div>
                                                )}
                                                <div className="text-[12px] font-medium text-gray-500 truncate max-w-[250px]" title={exp.title}>• {exp.title}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 flex items-center gap-2 mb-1.5">
                                                    <i className="fa-solid fa-user-tie text-[12px] text-gray-400"></i> {exp.payee_name || exp.vendor?.name || <span className="italic text-gray-400 font-medium">Payee not recorded</span>}
                                                </div>
                                                <div className="text-[11.5px] font-bold text-gray-500 flex items-center gap-1.5">
                                                    {exp.account_id ? <><i className="fa-solid fa-building-columns text-blue-500"></i> {exp.account?.name}</>
                                                    : exp.advance_user_id ? <><i className="fa-solid fa-hand-holding-dollar text-emerald-500"></i> Employee Advance</>
                                                    : exp.paid_amount > 0 ? <><i className="fa-solid fa-wallet text-purple-500"></i> Vendor Wallet</>
                                                    : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors border-l border-gray-50">
                                                <span className="font-black text-blue-700 text-[15px] tabular-nums">
                                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1.5 opacity-70"></i>
                                                    {parseFloat(exp.total_bill).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                                {parseFloat(exp.paid_amount) > 0 ? (
                                                    <span className="font-black text-emerald-600 text-[15px] tabular-nums">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1.5 opacity-70"></i>
                                                        {parseFloat(exp.paid_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-gray-300 font-bold">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors border-r border-gray-50">
                                                {parseFloat(exp.due_amount) > 0 ? (
                                                    <span className="font-black text-rose-600 text-[15px] tabular-nums">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1.5 opacity-80"></i>
                                                        {parseFloat(exp.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-gray-300 font-bold">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border shadow-sm
                                                    ${exp.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : exp.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'}
                                                `}>
                                                    {exp.payment_status}
                                                </span>
                                            </td>
                                            {/* 🟢 FIXED: REMOVED HOVER CLASSES SO BUTTONS ALWAYS SHOW */}
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                        <button onClick={() => handleMoveToWallet(exp)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-purple-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 flex items-center justify-center transition-all shadow-sm" title="Move to Vendor Wallet">
                                                            <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('view_project_expense') && (
                                                        <button onClick={() => openViewModal(exp)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_project_expense') && (
                                                        <Link href={route('admin.project-expenses.edit', exp.id)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 flex items-center justify-center transition-all shadow-sm" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_project_expense') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-all shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-24 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-50 border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-gray-300">
                                                    <i className="fa-solid fa-file-invoice text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-extrabold text-gray-700">No matching expenses found</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try resetting your filters or log a new bill.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                            <div className="text-[13px] font-semibold text-gray-500">
                                {project_expenses.total > 0 && <>Showing <span className="font-bold text-gray-900">{project_expenses.from || 0}</span> to <span className="font-bold text-gray-900">{project_expenses.to || 0}</span> of <span className="font-bold text-gray-900">{project_expenses.total || 0}</span> records</>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {project_expenses.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition-all
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : link.url
                                                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                                    : 'border-gray-100 bg-transparent text-gray-300 pointer-events-none'
                                            }
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-gray-50 rounded-2xl shadow-2xl flex flex-col relative my-auto animate-[scaleIn_0.2s_ease-out] overflow-hidden border border-gray-700/20">

                        <div className={`absolute top-6 left-0 px-5 py-2 text-white text-[11px] font-black tracking-widest uppercase rounded-r-xl shadow-lg z-20
                            ${selectedExpense.payment_status === 'paid' ? 'bg-emerald-500' : selectedExpense.payment_status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                            {selectedExpense.payment_status}
                        </div>

                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white pl-32 shrink-0">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Expense Receipt</h3>
                                <p className="text-[13px] text-gray-500 font-bold mt-1">Reference ID: #{String(selectedExpense.id).padStart(6, '0')}</p>
                            </div>
                            <div className="flex items-center gap-3 relative z-20">
                                <button className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <i className="fa-solid fa-print text-gray-500"></i> Print
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll bg-gray-50">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Project & Client</span>
                                    <div className="text-[15px] font-extrabold text-gray-900 flex flex-col gap-1.5">
                                        <div className="flex items-start gap-2.5">
                                            <i className="fa-solid fa-folder text-indigo-500 mt-1"></i>
                                            <span className="leading-tight">{selectedExpense.project?.title || "N/A"}</span>
                                        </div>
                                        {selectedExpense.project?.client && (
                                            <div className="flex items-start gap-2.5 text-[12.5px] text-gray-500 font-bold">
                                                <i className="fa-regular fa-building mt-0.5 opacity-70"></i>
                                                <span>{selectedExpense.project.client.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Vendor / Payee</span>
                                    <div className="text-[15px] font-extrabold text-gray-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-user-tie text-blue-500 mt-0.5"></i>
                                        <span className="leading-tight">{selectedExpense.payee_name || selectedExpense.vendor?.name || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Expense Date</span>
                                    <div className="text-[15px] font-extrabold text-gray-800 flex items-start gap-2.5">
                                        <i className="fa-regular fa-calendar-days text-rose-500 mt-0.5"></i>
                                        {selectedExpense.date}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-gray-900 mb-3 border-b border-gray-100 pb-2">Expense Title</h4>
                                        <div className="text-[15px] font-black text-indigo-800 bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100">
                                            {selectedExpense.title}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-gray-900 mb-3 border-b border-gray-100 pb-2">Payment Source</h4>
                                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            {selectedExpense.account_id ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><i className="fa-solid fa-building-columns text-[18px]"></i></div><div><p className="text-[14.5px] font-black text-gray-900">{selectedExpense.account?.name}</p><p className="text-[12px] font-bold text-gray-500 mt-0.5">Paid from Bank / Cash</p></div></>
                                            ) : selectedExpense.advance_user_id ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-hand-holding-dollar text-[18px]"></i></div><div><p className="text-[14.5px] font-black text-gray-900">{selectedExpense.advance_user?.name}</p><p className="text-[12px] font-bold text-gray-500 mt-0.5">Paid from Employee Advance</p></div></>
                                            ) : selectedExpense.paid_amount > 0 ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600"><i className="fa-solid fa-wallet text-[18px]"></i></div><div><p className="text-[14.5px] font-black text-gray-900">Vendor Wallet</p><p className="text-[12px] font-bold text-gray-500 mt-0.5">Deducted from vendor balance</p></div></>
                                            ) : (
                                                <><div className="h-12 w-12 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-500"><i className="fa-solid fa-ban text-[18px]"></i></div><div><p className="text-[14.5px] font-black text-gray-900">Unpaid / N/A</p></div></>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-gray-900 mb-3 border-b border-gray-100 pb-2">Remarks / Description</h4>
                                        <div className="bg-gray-50 p-5 rounded-xl text-[14px] font-medium text-gray-700 leading-relaxed min-h-[100px] border border-gray-200">
                                            {selectedExpense.description || <span className="text-gray-400 italic">No remarks provided for this transaction.</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-[340px] shrink-0 bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-gray-700">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

                                    <div>
                                        <h4 className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-800 pb-3">Amount Summary</h4>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] font-bold text-gray-300">Total Billed</span>
                                                <span className="text-[18px] font-black text-white tabular-nums">৳ {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] font-bold text-emerald-400">Total Paid</span>
                                                <span className="text-[18px] font-black text-emerald-400 tabular-nums">৳ {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-800 mt-8">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[13.5px] text-rose-400 font-extrabold uppercase tracking-wider">Due Balance</span>
                                            <span className="text-[28px] font-black text-rose-500 tabular-nums tracking-tight">৳ {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</span>
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