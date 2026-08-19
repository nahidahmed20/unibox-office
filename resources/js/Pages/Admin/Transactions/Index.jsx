import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

// 🟢 Premium Stat Card Component
const StatCard = ({ label, value, icon, gradient, textColor }) => (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className={`absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${gradient}`}></div>
        <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                <h3 className={`text-[24px] font-black tracking-tight tabular-nums mt-0.5 ${textColor}`}>{value}</h3>
            </div>
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${gradient}`}>
                <i className={`fa-solid ${icon} text-[22px]`}></i>
            </div>
        </div>
    </div>
);

export default function Index({ transactions = { data: [], links: [] }, accounts = [], totalCredit = 0, totalDebit = 0, netBalance = 0, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [perPage, setPerPage] = useState(() => Number(filters.per_page) || 25);

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', type: 'credit', amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const { data: transferData, setData: setTransferData, post: postTransfer, processing: transferProcessing, reset: resetTransfer, errors: transferErrors, clearErrors: clearTransferErrors } = useForm({
        from_account_id: '', to_account_id: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const applyFilters = (overrides = {}) => {
        router.get(
            route("admin.transactions.index"),
            {
                search: overrides.search ?? searchTerm,
                per_page: overrides.per_page ?? perPage,
                account_id: overrides.account_id ?? accountId,
                type: overrides.type ?? typeFilter,
                date_from: overrides.date_from ?? dateFrom,
                date_to: overrides.date_to ?? dateTo,
                page: 1,
            },
            { preserveState: true, replace: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => applyFilters(), 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, dateFrom, dateTo]);

    const handleFilterChange = (field, value) => {
        if (field === 'per_page') setPerPage(value);
        if (field === 'account_id') setAccountId(value);
        if (field === 'type') setTypeFilter(value);

        if (field === 'date_from') setDateFrom(value);
        if (field === 'date_to') setDateTo(value);

        applyFilters({ [field]: value });
    };

    const clearAllFilters = () => {
        setSearchTerm(""); setAccountId(""); setTypeFilter(""); setDateFrom(""); setDateTo("");
        router.get(route("admin.transactions.index"), { per_page: perPage }, { preserveState: true, replace: true });
    };

    const trxList = transactions.data || [];

    const handleCopy = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = trxList.map((t) => `${t.transaction_date}\t${t.account?.name || "N/A"}\t${t.description}\t${t.type?.toUpperCase()}\t${t.amount}`).join("\n");
        navigator.clipboard.writeText("Date\tAccount\tDescription\tType\tAmount\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Description,Reference,Type,Amount\n"];
        const rows = trxList.map(t => `"${t.transaction_date}","${t.account?.name || ''}","${t.description}","${t.reference_number || ''}","${t.type}","${t.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction Ledger Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Transaction Ledger</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', account_id: '', type: 'credit', amount: '', transaction_date: new Date().toISOString().slice(0, 10), reference_number: '', description: '' });
        setEditMode(false); setShowModal(true);
    };

    const openTransferModal = () => {
        clearTransferErrors(); resetTransfer(); setShowTransferModal(true);
    };

    const openEditModal = (trx) => {
        clearErrors();
        setData({ id: trx.id, account_id: trx.account_id || '', type: trx.type || 'credit', amount: trx.amount || '', transaction_date: trx.transaction_date || '', description: trx.description || '', reference_number: trx.reference_number || '' });
        setEditMode(true); setShowModal(true);
    };

    const openViewModal = (trx) => { setSelectedTrx(trx); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        const action = editMode ? put : post;
        const routeName = editMode ? 'admin.transactions.update' : 'admin.transactions.store';
        const param = editMode ? data.id : null;

        action(route(routeName, param), {
            onSuccess: () => {
                setShowModal(false); reset();
                Swal.fire({ icon: "success", title: editMode ? "Updated Successfully!" : "Logged Successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => { if(err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        if (!transferData.from_account_id || !transferData.to_account_id) return Swal.fire("Required", "Please select both accounts.", "warning");
        if (transferData.from_account_id === transferData.to_account_id) return Swal.fire("Error", "Accounts cannot be the same.", "error");

        postTransfer(route('admin.transactions.transfer'), {
            onSuccess: () => {
                setShowTransferModal(false); resetTransfer();
                Swal.fire({ icon: "success", title: "Transferred Successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => { if(err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Transaction?', text: "This will reverse the amount in your account balance.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete It' }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.transactions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Transaction removed and balance restored.", timer: 1500, showConfirmButton: false }),
                    onError: (err) => Swal.fire({ icon: "error", title: "Error!", text: err.error || "Cannot delete system-generated transactions." })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Transactions Ledger" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Financial Ledger
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Transactions Directory</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Monitor all cash inflows, outflows, and bank transfers.</p>
                    </div>
                </div>

                {/* 🟢 Premium Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard
                        label="Total Deposit (In)"
                        value={<><Taka className="text-[20px]" />{parseFloat(totalCredit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-down-to-bracket"
                        gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        textColor="text-emerald-700"
                    />
                    <StatCard
                        label="Total Withdrawal (Out)"
                        value={<><Taka className="text-[20px]" />{parseFloat(totalDebit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-right-from-bracket"
                        gradient="bg-gradient-to-br from-rose-500 to-red-600"
                        textColor="text-rose-700"
                    />
                    <StatCard
                        label="Net Balance"
                        value={<>{netBalance < 0 ? '-' : ''}<Taka className="text-[20px]" />{Math.abs(parseFloat(netBalance || 0)).toLocaleString('en-IN')}</>}
                        icon="fa-scale-balanced"
                        gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                        textColor={netBalance >= 0 ? "text-indigo-700" : "text-rose-600"}
                    />
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-money-bill-transfer text-[14px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">All Transactions</h2>
                                <p className="text-[12px] text-gray-400 font-medium">{transactions.total ?? trxList.length} total records</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {hasPermission('create_transaction') && (
                                <>
                                    <button onClick={openTransferModal} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-purple-700 shadow-sm hover:shadow-md">
                                        <i className="fa-solid fa-right-left"></i> Transfer Funds
                                    </button>
                                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                        <i className="fa-solid fa-plus"></i> Manual Entry
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 🟢 Premium Toolbar 1: Show Rows & Export */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Premium SVG Show Dropdown */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all z-20">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select
                                        value={perPage}
                                        onChange={(e) => handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block"></div>

                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                        </div>
                    </div>

                    {/* 🟢 Premium Toolbar 2: Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 px-6 py-4 bg-gray-50/50 border-b border-gray-100 items-center">

                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input type="text" placeholder="Search ref, desc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all bg-white" />
                        </div>

                        <div className="relative">
                            <select value={accountId} onChange={(e) => handleFilterChange('account_id', e.target.value)} className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-medium text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                <option value="">All Accounts</option>
                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none"></i>
                        </div>

                        <div className="relative">
                            <select value={typeFilter} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-medium text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                <option value="">All Types</option>
                                <option value="credit">Deposit (In)</option>
                                <option value="debit">Withdrawal (Out)</option>
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none"></i>
                        </div>

                        {/* 🟢 REDESIGNED: Date From */}
                        <div className="relative pt-2 sm:pt-0">
                            <span className="absolute left-3 top-[-8px] z-10 bg-white px-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider rounded">From</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-medium text-gray-600 outline-none cursor-pointer focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
                            />
                        </div>

                        {/* 🟢 REDESIGNED: Date To */}
                        <div className="relative pt-2 sm:pt-0">
                            <span className="absolute left-3 top-[-8px] z-10 bg-white px-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider rounded">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-medium text-gray-600 outline-none cursor-pointer focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
                            />
                        </div>

                        {(searchTerm || accountId || typeFilter || dateFrom || dateTo) && (
                            <div className="flex justify-end lg:col-span-1 pt-2 sm:pt-0">
                                <button onClick={clearAllFilters} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 transition-colors shadow-sm">
                                    <i className="fa-solid fa-xmark"></i> Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] border-b-2 border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Date</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Account</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[35%]">Description & Ref</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Type</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Amount (In/Out)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {trxList.length > 0 ? (
                                    trxList.map((trx, index) => (
                                        <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                {transactions.from ? transactions.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-600 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar text-[11px] text-gray-400"></i>{trx.transaction_date}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-indigo-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-500 border border-indigo-100">
                                                        <i className="fa-solid fa-building-columns text-[10px]"></i>
                                                    </div>
                                                    {trx.account?.name || <span className="text-gray-400 italic">Deleted Account</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 font-bold whitespace-normal leading-snug">{trx.description}</div>
                                                {trx.reference_number && (
                                                    <div className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1 bg-gray-100 border border-gray-200/60 w-max px-2 py-0.5 rounded-md">
                                                        <i className="fa-solid fa-hashtag text-[9px] opacity-70"></i> Ref: {trx.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${trx.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                                    {trx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[15px] whitespace-nowrap tabular-nums group-hover:opacity-100 transition-colors ${trx.type === 'credit' ? 'text-emerald-700 bg-emerald-50/20 group-hover:bg-emerald-50/50' : 'text-rose-700 bg-rose-50/20 group-hover:bg-rose-50/50'}`}>
                                                {trx.type === 'credit' ? '+' : '-'} <Taka className="text-[13px] ml-0.5" /> {parseFloat(trx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_transaction') && (
                                                        <button onClick={() => openViewModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {!trx.transactionable_id ? (
                                                        <>
                                                            {hasPermission('edit_transaction') && (
                                                                <button onClick={() => openEditModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                                    <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                </button>
                                                            )}
                                                            {hasPermission('delete_transaction') && (
                                                                <button onClick={() => handleDelete(trx.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm" title="Delete">
                                                                    <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-gray-200 cursor-not-allowed shadow-sm" title="System generated transaction">
                                                            System
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-money-bill-transfer text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No transactions found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or record a new entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-[#f6f6f7] px-6 py-4 no-print">
                            <div className="text-[13px] text-gray-500 font-medium">
                                Showing <strong className="text-gray-700">{transactions.from || 0}</strong> to <strong className="text-gray-700">{transactions.to || 0}</strong> of <strong className="text-gray-700">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-lg border px-2.5 py-1.5 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-transparent text-gray-400 pointer-events-none'}
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

            {/* --- 🟢 FUND TRANSFER MODAL --- */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-purple-100">
                                    <i className="fa-solid fa-right-left"></i> Bank / Cash
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Transfer Funds</h3>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                {transferErrors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i> {transferErrors.error}
                                    </div>
                                )}

                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">From Account (Source) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select
                                                    value={transferData.from_account_id}
                                                    onChange={(e) => setTransferData('from_account_id', e.target.value)}
                                                    className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 cursor-pointer shadow-sm"
                                                    required
                                                >
                                                    <option value="">Select source account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px] pointer-events-none"></i>
                                            </div>
                                            {transferErrors.from_account_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{transferErrors.from_account_id}</p>}
                                        </div>

                                        <div className="flex justify-center -my-6 relative z-10 pointer-events-none">
                                            <div className="bg-purple-100 text-purple-600 h-10 w-10 rounded-full flex items-center justify-center border-4 border-gray-50 shadow-sm">
                                                <i className="fa-solid fa-arrow-down text-[14px]"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">To Account (Destination) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select
                                                    value={transferData.to_account_id}
                                                    onChange={(e) => setTransferData('to_account_id', e.target.value)}
                                                    className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 cursor-pointer shadow-sm"
                                                    required
                                                >
                                                    <option value="">Select destination account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px] pointer-events-none"></i>
                                            </div>
                                            {transferErrors.to_account_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{transferErrors.to_account_id}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Transfer Amount <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={transferData.amount}
                                                onChange={e => setTransferData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[16px] font-black text-purple-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-sm transition-all"
                                                placeholder="0.00" required
                                            />
                                        </div>
                                        {transferErrors.amount && <p className="text-red-500 text-[11px] font-bold mt-1.5">{transferErrors.amount}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={transferData.transaction_date}
                                            onChange={e => setTransferData('transaction_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 cursor-pointer shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description / Notes</label>
                                    <input
                                        type="text"
                                        value={transferData.description}
                                        onChange={e => setTransferData('description', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-sm"
                                        placeholder="e.g. Bank to Cash transfer for petty expenses"
                                    />
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={transferProcessing} className="rounded-xl bg-purple-600 px-8 py-2.5 text-[14px] font-bold text-white hover:bg-purple-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2">
                                    {transferProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Complete Transfer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 MANUAL ENTRY FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-indigo-100">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Edit Transaction" : "Manual Transaction Entry"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Account <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            value={data.account_id}
                                            onChange={(e) => setData('account_id', e.target.value)}
                                            className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 cursor-pointer shadow-sm"
                                            required
                                        >
                                            <option value="">Choose an account...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px] pointer-events-none"></i>
                                    </div>
                                    {errors.account_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Transaction Type <span className="text-red-500">*</span></label>
                                        <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200/60">
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'credit')}
                                                className={`flex-1 py-2 text-[13.5px] font-extrabold rounded-lg transition-all ${data.type === 'credit' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Deposit (In)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'debit')}
                                                className={`flex-1 py-2 text-[13.5px] font-extrabold rounded-lg transition-all ${data.type === 'debit' ? 'bg-white text-rose-600 shadow-sm border border-rose-100' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Withdrawal (Out)
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[12px] font-bold uppercase tracking-wider mb-2 ${data.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>Amount <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Taka className={`absolute left-4 top-1/2 -translate-y-1/2 text-[16px] ${data.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[16px] font-black outline-none transition-all shadow-sm
                                                    ${data.type === 'credit' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10' : 'bg-rose-50 border-rose-200 text-rose-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'}
                                                `}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {errors.amount && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.amount}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={data.transaction_date}
                                            onChange={e => setData('transaction_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 cursor-pointer shadow-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Reference No <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={data.reference_number}
                                            onChange={e => setData('reference_number', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 shadow-sm"
                                            placeholder="e.g. Check #, Trx ID"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description / Reason <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 shadow-sm"
                                        placeholder="e.g. Added capital, Bank charge"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-[var(--accent)] px-8 py-2.5 text-[14px] font-bold text-white hover:bg-[#b08630] shadow-md disabled:opacity-70 transition-all flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Entry" : "Save Entry"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-5 translate-x-10 -translate-y-10"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[18px] font-extrabold text-white flex items-center gap-2">
                                    <i className="fa-solid fa-receipt text-indigo-400"></i> Transaction Receipt
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${selectedTrx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                                <span className={`inline-block mb-3 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${selectedTrx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / Cash In' : 'Withdrawal / Cash Out'}
                                </span>

                                <div className={`text-[36px] font-black tabular-nums tracking-tight ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<Taka className="text-[24px]" />{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Account</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                                        <i className="fa-solid fa-building-columns text-indigo-400"></i> {selectedTrx.account?.name || "N/A"}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Transaction Date</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                                        <i className="fa-regular fa-calendar-days text-indigo-400"></i> {selectedTrx.transaction_date}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm col-span-2">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Description & Notes</span>
                                    <div className="text-gray-800 font-bold text-[15px]">{selectedTrx.description}</div>
                                </div>
                                {selectedTrx.reference_number && (
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 col-span-2 flex justify-between items-center">
                                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Reference Number</span>
                                        <div className="font-bold text-gray-900 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                            <i className="fa-solid fa-hashtag text-gray-400"></i> {selectedTrx.reference_number}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white hover:bg-gray-800 shadow-md transition-colors">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
