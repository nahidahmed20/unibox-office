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
    const [perPage, setPerPage] = useState(filters.per_page || 25);
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
            if (perPage !== 25) params.per_page = perPage;

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
        navigator.clipboard.writeText("Account Name\tType\tAccount No.\tOpening Bal.\tCurrent Bal.\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
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

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Accounts & Balances Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>Accounts & Balances Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
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
            id: '', name: '', type: 'cash', opening_balance: '', current_balance: 0, account_number: '', is_active: 1
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (acc) => {
        clearErrors();
        setData({
            id: acc.id, name: acc.name || '', type: acc.type || 'cash', account_number: acc.account_number || '', opening_balance: acc.opening_balance || '', is_active: acc.is_active !== undefined ? acc.is_active : 1
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
            cancelButtonColor: '#64748b',
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
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Financial Management
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Accounts & Balances</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Manage all company cash, bank accounts, advances and view real-time balances.
                        </p>
                    </div>
                </div>

                {/* --- 🟢 5 PREMIUM FINANCIAL SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    {/* 1. Bank & Cash Balance */}
                    <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex flex-col gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md shadow-blue-200">
                                <i className="fa-solid fa-building-columns text-[18px]"></i>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase font-bold text-blue-600 tracking-wider">Bank & Cash Bal.</span>
                                <div className="text-[22px] font-black text-blue-900 tabular-nums tracking-tight mt-0.5">
                                    ৳ {Number(summary.total_balance || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Employee Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex flex-col gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200">
                                <i className="fa-solid fa-user-tie text-[18px]"></i>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase font-bold text-emerald-600 tracking-wider">Emp. Advance (Given)</span>
                                <div className="text-[22px] font-black text-emerald-900 tabular-nums tracking-tight mt-0.5">
                                    ৳ {Number(summary.employee_advance || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Vendor Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-purple-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex flex-col gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-200">
                                <i className="fa-solid fa-truck-field text-[18px]"></i>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase font-bold text-purple-600 tracking-wider">Vendor Adv. (Given)</span>
                                <div className={`text-[22px] font-black tabular-nums tracking-tight mt-0.5 ${summary.vendor_advance >= 0 ? 'text-purple-900' : 'text-rose-600'}`}>
                                    {summary.vendor_advance < 0 ? '-' : ''}৳ {Math.abs(summary.vendor_advance || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Client Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-amber-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex flex-col gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200">
                                <i className="fa-solid fa-hand-holding-dollar text-[18px]"></i>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase font-bold text-amber-600 tracking-wider">Client Adv. (Received)</span>
                                <div className="text-[22px] font-black text-amber-900 tabular-nums tracking-tight mt-0.5">
                                    ৳ {Number(summary.client_advance || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Total Assets */}
                    <div className="relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-teal-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex flex-col gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md shadow-teal-200">
                                <i className="fa-solid fa-couch text-[18px]"></i>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase font-bold text-teal-600 tracking-wider">Company Assets</span>
                                <div className="text-[22px] font-black text-teal-900 tabular-nums tracking-tight mt-0.5">
                                    ৳ {Number(summary.total_assets || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Data Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-vault text-[14px]"></i>
                            </div>
                            Account Directory
                        </div>
                        {(isSuperAdmin || hasPermission('create_account')) && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Add New Account
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* 🟢 Premium Show Rows Dropdown (No Double Icon) */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select 
                                        value={perPage} 
                                        onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search account..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Account Info</th>
                                    <th className="px-6 py-4.5">Account Type</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/30">Opening Balance</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/30 border-r border-gray-100">Current Balance</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    {isSuperAdmin && <th className="px-6 py-4.5 text-center no-print w-32">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {accList.length > 0 ? (
                                    accList.map((acc, index) => (
                                        <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400">
                                                {accounts.from ? accounts.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 text-[14px] shadow-sm">
                                                        {acc.type === 'cash' && <i className="fa-solid fa-money-bill-wave text-emerald-500"></i>}
                                                        {acc.type === 'bank' && <i className="fa-solid fa-building-columns text-blue-500"></i>}
                                                        {acc.type === 'mobile_banking' && <i className="fa-solid fa-mobile-screen text-purple-500"></i>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[14.5px]">{acc.name}</div>
                                                        {acc.account_number && (
                                                            <div className="text-[12px] font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                                                                <i className="fa-solid fa-hashtag opacity-60"></i> A/C: {acc.account_number}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                                    ${acc.type === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                    ${acc.type === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                    ${acc.type === 'mobile_banking' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                                `}>
                                                    {acc.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-blue-50/10 group-hover:bg-blue-50/30 transition-colors">
                                                <span className="font-bold text-gray-600 tabular-nums">
                                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[11.5px] mr-1 opacity-60"></i>
                                                    {parseFloat(acc.opening_balance).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors border-r border-gray-100">
                                                <span className={`font-black text-[15.5px] tabular-nums ${acc.current_balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[13px] mr-1 opacity-80"></i>
                                                    {parseFloat(acc.current_balance).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                                                    ${acc.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                                                `}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {acc.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>

                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-center no-print">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {hasPermission('view_account') && (
                                                            <button onClick={() => openEditModal(acc)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Account">
                                                                <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_account') && (
                                                            <button onClick={() => handleDelete(acc.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Account">
                                                                <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? "7" : "6"} className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-vault text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No accounts found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Add a new account to start tracking balances.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {accounts.links && accounts.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing {accounts.from || 0} to {accounts.to || 0} of {accounts.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {accounts.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : link.url
                                                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'
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

            {/* --- 🟢 STUNNING CREATE / EDIT FORM MODAL --- */}
            {showModal && isSuperAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-indigo-600"></i> Modify Account</>
                                ) : (
                                    <><i className="fa-solid fa-vault text-indigo-600"></i> Register New Account</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {/* Section 1: Account Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Account Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <i className="fa-solid fa-building-columns absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                placeholder="e.g. Main Cash, DBBL Bank"
                                                required
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                            />
                                        </div>
                                        {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Account Type <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                value={data.type}
                                                onChange={e => setData('type', e.target.value)}
                                                className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                                                required
                                            >
                                                <option value="cash">💵 Cash Account</option>
                                                <option value="bank">🏦 Bank Account</option>
                                                <option value="mobile_banking">📱 Mobile Banking</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">A/C Number <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                                        <div className="relative">
                                            <i className="fa-solid fa-hashtag absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.account_number}
                                                onChange={e => setData('account_number', e.target.value)}
                                                placeholder="If bank/mobile"
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Financials & Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Opening Balance</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-[14px]">৳</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.opening_balance}
                                                onChange={e => setData('opening_balance', e.target.value)}
                                                disabled={editMode && !isSuperAdmin}
                                                placeholder="0.00"
                                                className={`w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 text-[15px] font-black outline-none transition-shadow ${editMode && !isSuperAdmin ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                                            />
                                        </div>
                                        {editMode && !isSuperAdmin && (
                                            <p className="text-amber-600 text-[11px] font-bold mt-2 flex items-center gap-1">
                                                <i className="fa-solid fa-lock"></i> Opening balance is locked.
                                            </p>
                                        )}
                                        {errors.opening_balance && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.opening_balance}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Account Status</label>
                                        <div className="relative">
                                            <select
                                                value={data.is_active}
                                                onChange={e => setData('is_active', e.target.value)}
                                                className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                            >
                                                <option value={1}>✅ Active</option>
                                                <option value={0}>❌ Inactive</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
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
