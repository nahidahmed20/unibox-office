import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

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
            params.per_page = perPage;

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
                        body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
                        p { text-align: center; color: #64748b; margin-bottom: 30px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 15px; }
                        th, td { padding: 14px 18px; border: 1px solid #e2e8f0; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
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
        setData({ id: '', name: '', type: 'cash', opening_balance: '', current_balance: 0, account_number: '', is_active: 1 });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (acc) => {
        clearErrors();
        setData({ id: acc.id, name: acc.name || '', type: acc.type || 'cash', account_number: acc.account_number || '', opening_balance: acc.opening_balance || '', is_active: acc.is_active !== undefined ? acc.is_active : 1 });
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
                .custom-table-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 animate-fade-in-up">

                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-building-columns"></i> Financial Management
                        </div>
                        <h1 className="text-[28px] sm:text-[34px] font-black text-slate-900 tracking-tight leading-none">Accounts & Balances</h1>
                        <p className="text-[14.5px] font-medium text-slate-500 mt-2.5 max-w-lg">
                            Manage all company cash, bank accounts, advances and view real-time balances seamlessly.
                        </p>
                    </div>
                </div>

                {/* --- 🟢 5 EXECUTIVE FINANCIAL SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 xl:gap-5">
                    {/* 1. Bank & Cash Balance */}
                    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-400/10 blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
                        <div>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-building-columns text-[17px]"></i>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-blue-100/70 text-blue-700 border border-blue-200/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>Liquid
                                </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Bank &amp; Cash Bal.</p>
                            <h3 className="text-[22px] sm:text-[24px] xl:text-[26px] font-black text-slate-900 tracking-tight tabular-nums flex items-center">
                                <Taka className="text-[17px] text-blue-600 mr-0.5" />{Number(summary.total_balance || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="mt-4 pt-3 border-t border-blue-100/70 flex items-center justify-between text-[11.5px] text-slate-500 font-semibold">
                            <span>Active accounts</span>
                            <span className="font-bold text-blue-700">{accList.filter(a => a.is_active).length} Active</span>
                        </div>
                    </div>

                    {/* 2. Employee Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white p-5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
                        <div>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-user-tie text-[17px]"></i>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-100/70 text-emerald-700 border border-emerald-200/60">
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> Disbursed
                                </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Emp. Advance</p>
                            <h3 className="text-[22px] sm:text-[24px] xl:text-[26px] font-black text-slate-900 tracking-tight tabular-nums flex items-center">
                                <Taka className="text-[17px] text-emerald-600 mr-0.5" />{Number(summary.employee_advance || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="mt-4 pt-3 border-t border-emerald-100/70 flex items-center justify-between text-[11.5px] text-slate-500 font-semibold">
                            <span>Pending cut</span>
                            <span className="font-bold text-emerald-700">Staff Due</span>
                        </div>
                    </div>

                    {/* 3. Vendor Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/70 via-white to-white p-5 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-purple-400/10 blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
                        <div>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-truck-field text-[17px]"></i>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-purple-100/70 text-purple-700 border border-purple-200/60">
                                    Prepaid
                                </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Vendor Wallets</p>
                            <h3 className={`text-[22px] sm:text-[24px] xl:text-[26px] font-black tracking-tight tabular-nums flex items-center ${summary.vendor_advance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {summary.vendor_advance < 0 ? '-' : ''}<Taka className="text-[17px] text-purple-600 mr-0.5" />{Math.abs(summary.vendor_advance || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="mt-4 pt-3 border-t border-purple-100/70 flex items-center justify-between text-[11.5px] text-slate-500 font-semibold">
                            <span>Supplier credits</span>
                            <span className="font-bold text-purple-700">Advance Paid</span>
                        </div>
                    </div>

                    {/* 4. Client Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/70 via-white to-white p-5 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
                        <div>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-hand-holding-dollar text-[17px]"></i>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-100/70 text-amber-800 border border-amber-200/60">
                                    <i className="fa-solid fa-arrow-down-left-and-up-right-to-center text-[9px]"></i> Received
                                </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Client Advance</p>
                            <h3 className="text-[22px] sm:text-[24px] xl:text-[26px] font-black text-slate-900 tracking-tight tabular-nums flex items-center">
                                <Taka className="text-[17px] text-amber-600 mr-0.5" />{Number(summary.client_advance || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="mt-4 pt-3 border-t border-amber-100/70 flex items-center justify-between text-[11.5px] text-slate-500 font-semibold">
                            <span>Unadjusted funds</span>
                            <span className="font-bold text-amber-800">Deposits Held</span>
                        </div>
                    </div>

                    {/* 5. Total Assets */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100/70 via-white to-white p-5 shadow-sm hover:shadow-xl hover:shadow-slate-500/10 hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-slate-400/10 blur-2xl group-hover:bg-slate-500/20 transition-all pointer-events-none"></div>
                        <div>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/25 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-wallet text-[17px]"></i>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-slate-200/70 text-slate-800 border border-slate-300/60">
                                    Fixed Assets
                                </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Company Assets</p>
                            <h3 className="text-[22px] sm:text-[24px] xl:text-[26px] font-black text-slate-900 tracking-tight tabular-nums flex items-center">
                                <Taka className="text-[17px] text-slate-700 mr-0.5" />{Number(summary.total_assets || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11.5px] text-slate-500 font-semibold">
                            <span>Office equipment</span>
                            <span className="font-bold text-slate-800">Total Value</span>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Data Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 px-6 py-5 gap-4 bg-white">
                        <div className="text-[17px] font-black text-slate-800 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm">
                                <i className="fa-solid fa-list-ul text-[16px]"></i>
                            </div>
                            Account Directory
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-all hover:bg-slate-50 shadow-sm hover:shadow active:scale-95">
                                <i className="fas fa-copy"></i> Copy
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:text-emerald-600 transition-all hover:bg-slate-50 shadow-sm hover:shadow active:scale-95">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm hover:shadow active:scale-95">
                                <i className="fas fa-print"></i> Print
                            </button>
                            {(isSuperAdmin || hasPermission('create_account')) && (
                                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95 ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> New Account
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-slate-600">
                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <span className="bg-slate-50 px-4 py-2 text-[12.5px] font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2 text-[13.5px] font-semibold text-slate-700 outline-none cursor-pointer border-none focus:ring-0 w-[110px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search account..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-[13.5px] font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-white/90 backdrop-blur-md border-b-2 border-slate-200 sticky top-0 z-10 text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">SL</th>
                                    <th className="px-6 py-4">Account Info</th>
                                    <th className="px-6 py-4">Account Type</th>
                                    <th className="px-6 py-4 text-right">Opening Balance</th>
                                    <th className="px-6 py-4 text-right">Current Balance</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    {isSuperAdmin && <th className="px-6 py-4 text-center no-print w-32">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="text-[14px] text-slate-700 divide-y divide-slate-100">
                                {accList.length > 0 ? (
                                    accList.map((acc, index) => (
                                        <tr key={acc.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-6 py-4 text-slate-400 font-medium text-center tabular-nums">
                                                {accounts.from ? accounts.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-[15px] group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        {acc.type === 'cash' && <i className="fa-solid fa-money-bill-wave text-emerald-500"></i>}
                                                        {acc.type === 'bank' && <i className="fa-solid fa-building-columns text-blue-500"></i>}
                                                        {acc.type === 'mobile_banking' && <i className="fa-solid fa-mobile-screen text-purple-500"></i>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-[14.5px]">{acc.name}</div>
                                                        {acc.account_number && (
                                                            <div className="text-[12px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                                A/C: <span className="tracking-wide text-slate-600">{acc.account_number}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider
                                                    ${acc.type === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : ''}
                                                    ${acc.type === 'bank' ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''}
                                                    ${acc.type === 'mobile_banking' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ''}
                                                `}>
                                                    {acc.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right group-hover:bg-slate-50/50 transition-colors">
                                                <span className="font-semibold text-slate-600 tabular-nums inline-flex items-center justify-end">
                                                    <Taka className="text-[12px] text-slate-400" />{parseFloat(acc.opening_balance).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-slate-50/30 group-hover:bg-slate-50/80 transition-colors border-x border-slate-50">
                                                <span className={`font-black text-[15px] tabular-nums inline-flex items-center justify-end ${acc.current_balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                    <Taka className={`text-[13px] ${acc.current_balance < 0 ? 'text-rose-500' : 'text-slate-400'}`} />{parseFloat(acc.current_balance).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider
                                                    ${acc.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                                                `}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {acc.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>

                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-center no-print">
                                                    <div className="flex items-center justify-center gap-2  transition-opacity duration-200">
                                                        {hasPermission('view_account') && (
                                                            <button onClick={() => openEditModal(acc)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all hover:shadow-sm" title="Edit Account">
                                                                <i className="fa-regular fa-pen-to-square text-[14px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_account') && (
                                                            <button onClick={() => handleDelete(acc.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-all hover:shadow-sm" title="Delete Account">
                                                                <i className="fa-regular fa-trash-can text-[14px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? "7" : "6"} className="px-6 py-28 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                                                    <i className="fa-regular fa-folder-open text-2xl text-slate-300"></i>
                                                </div>
                                                <p className="text-[16px] font-bold text-slate-700">No accounts found.</p>
                                                <p className="text-[13.5px] font-medium text-slate-500 mt-1">Add a new account to start tracking balances.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {accounts.links && accounts.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-slate-500">
                                Showing <span className="font-bold text-slate-800">{accounts.from || 0}</span> to <span className="font-bold text-slate-800">{accounts.to || 0}</span> of <span className="font-bold text-slate-800">{accounts.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {accounts.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[34px] items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all
                                            ${link.active
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                : link.url
                                                    ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                                                    : 'bg-transparent text-slate-300 pointer-events-none'
                                            }
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[11px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[11px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 EXECUTIVE CREATE / EDIT ACCOUNT MODAL --- */}
            {showModal && isSuperAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-5 md:p-8 overflow-y-auto">
                    <div className="w-full max-w-2xl lg:max-w-3xl bg-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/30 animate-[scaleIn_0.2s_ease-out]">

                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-building-columns'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-vault"></i> Account Management
                                        </div>
                                        <h3 className="text-[19px] sm:text-[23px] font-black text-white tracking-tight leading-tight">
                                            {editMode ? "Modify Account Details" : "Register New Account"}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-medium text-slate-400 mt-0.5">
                                            {editMode ? "Update bank credentials or status for this account" : "Add a new cash, bank, or mobile wallet account to office treasury"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0"
                                >
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-5 sm:p-7 md:p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50 flex-1">

                                {/* Section 1: Account Core Details */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">1</div>
                                        <h4 className="text-[13px] font-black uppercase tracking-wider text-slate-800">Account Credentials</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Account Name <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fa-solid fa-building-columns absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={e => setData('name', e.target.value)}
                                                    placeholder="e.g. Main Cash Drawer, City Bank Principal, bKash Merchant"
                                                    required
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Account Type <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <CustomSelect
                                                    value={data.type}
                                                    onChange={e => setData('type', e.target.value)}
                                                    className="w-full appearance-none bg-white rounded-xl border border-slate-300 px-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 cursor-pointer shadow-xs"
                                                    required
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="cash">💵 Cash in Hand</option>
                                                    <option value="bank">🏦 Commercial Bank Account</option>
                                                    <option value="mobile_banking">📱 Mobile Banking (bKash/Nagad/Rocket)</option>
                                                </CustomSelect>
                                            </div>
                                            {errors.type && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.type}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                A/C Number <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fa-solid fa-hashtag absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.account_number}
                                                    onChange={e => setData('account_number', e.target.value)}
                                                    placeholder="e.g. 1502401004221 or 017xxxxxxxx"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.account_number && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.account_number}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Financial Opening Balance & Status */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">2</div>
                                        <h4 className="text-[13px] font-black uppercase tracking-wider text-slate-800">Financial Balances & Status</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Opening Balance (৳)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[15px]">৳</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={data.opening_balance}
                                                    onChange={e => setData('opening_balance', e.target.value)}
                                                    disabled={editMode && !isSuperAdmin}
                                                    placeholder="0.00"
                                                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[14.5px] font-bold tabular-nums outline-none transition-all shadow-xs ${editMode && !isSuperAdmin ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10'}`}
                                                />
                                            </div>
                                            {editMode && !isSuperAdmin && (
                                                <p className="text-amber-600 text-[11.5px] font-bold mt-1.5 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                                                    <i className="fa-solid fa-lock text-[10px]"></i> Opening balance is locked to maintain ledger integrity.
                                                </p>
                                            )}
                                            {errors.opening_balance && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.opening_balance}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Account Status
                                            </label>
                                            <div className="relative">
                                                <CustomSelect
                                                    value={data.is_active}
                                                    onChange={e => setData('is_active', e.target.value)}
                                                    className="w-full appearance-none bg-white rounded-xl border border-slate-300 px-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 cursor-pointer shadow-xs"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value={1}>✅ Active (Available for transactions)</option>
                                                    <option value={0}>❌ Inactive (Hidden from selection)</option>
                                                </CustomSelect>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* HELPER ADVISORY NOTE */}
                                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
                                    <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm shadow-sm mt-0.5">
                                        <i className="fa-solid fa-shield-halved"></i>
                                    </div>
                                    <div className="text-[12px] font-medium text-indigo-950 leading-relaxed">
                                        <p className="font-bold text-indigo-900 text-[12.5px] mb-0.5">Treasury & Transaction Integrity</p>
                                        This account will be instantly integrated with Invoices, Client Advances, Vendor Settlements, Salaries, and Expense payments. All credits and debits maintain double-entry audit history.
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 md:px-8 py-4 border-t border-slate-300 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-2xl sm:rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[13.5px] font-black text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-70 flex items-center gap-2"
                                >
                                    {processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin text-sm"></i> Saving…</>
                                    ) : (
                                        <><i className="fa-solid fa-check text-sm"></i> {editMode ? "Update Account" : "Register Account"}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
