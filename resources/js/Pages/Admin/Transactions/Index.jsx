import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const StatCard = ({ label, value, icon, gradient, textColor, iconColor, ringColor }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-lg border border-white/10 group`}>
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/10 opacity-40 transition-transform duration-500 group-hover:scale-110 blur-xl"></div>
        <div className="relative z-10 flex items-center gap-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md text-[20px] shadow-sm border border-white/20 ${iconColor}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <p className={`text-[11.5px] font-bold uppercase tracking-widest mb-0.5 ${textColor}`}>{label}</p>
                <h3 className="text-[26px] font-black tracking-tight tabular-nums text-white leading-none">{value}</h3>
            </div>
        </div>
    </div>
);

export default function Index({ 
    transactions = { data: [], links: [] }, 
    accounts = [], 
    clients = [],
    vendors = [],
    users = [],
    projects = [],
    totalCredit = 0, 
    totalDebit = 0, 
    netBalance = 0, 
    filters = {} 
}) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [partyType, setPartyType] = useState(filters.party_type || '');
    const [clientId, setClientId] = useState(filters.client_id || '');
    const [vendorId, setVendorId] = useState(filters.vendor_id || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [projectId, setProjectId] = useState(filters.project_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [perPage, setPerPage] = useState(() => filters.per_page === 'all' ? 'all' : (Number(filters.per_page) || 25));
    const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'date_wise'
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(
        Boolean(filters.client_id || filters.vendor_id || filters.user_id || filters.project_id || filters.date_from || filters.date_to)
    );

    const isFirstRender = useRef(true);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', type: 'credit', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const { data: transferData, setData: setTransferData, post: postTransfer, processing: transferProcessing, reset: resetTransfer, errors: transferErrors, clearErrors: clearTransferErrors } = useForm({
        from_account_id: '', to_account_id: '', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const applyFilters = (overrides = {}) => {
        router.get(
            route("admin.transactions.index"),
            {
                search: overrides.search ?? searchTerm,
                per_page: overrides.per_page ?? perPage,
                account_id: overrides.account_id ?? accountId,
                type: overrides.type ?? typeFilter,
                party_type: overrides.party_type !== undefined ? overrides.party_type : partyType,
                client_id: overrides.client_id !== undefined ? overrides.client_id : clientId,
                vendor_id: overrides.vendor_id !== undefined ? overrides.vendor_id : vendorId,
                user_id: overrides.user_id !== undefined ? overrides.user_id : userId,
                project_id: overrides.project_id !== undefined ? overrides.project_id : projectId,
                date_from: overrides.date_from !== undefined ? overrides.date_from : dateFrom,
                date_to: overrides.date_to !== undefined ? overrides.date_to : dateTo,
                page: 1,
            },
            { preserveState: true, replace: true, preserveScroll: true }
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
        if (field === 'party_type') setPartyType(value);
        if (field === 'client_id') setClientId(value);
        if (field === 'vendor_id') setVendorId(value);
        if (field === 'user_id') setUserId(value);
        if (field === 'project_id') setProjectId(value);
        if (field === 'date_from') setDateFrom(value);
        if (field === 'date_to') setDateTo(value);

        applyFilters({ [field]: value });
    };

    const handleDatePreset = (preset) => {
        const today = new Date();
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let from = '';
        let to = '';

        if (preset === 'today') {
            from = formatDate(today);
            to = formatDate(today);
        } else if (preset === 'yesterday') {
            const y = new Date();
            y.setDate(today.getDate() - 1);
            from = formatDate(y);
            to = formatDate(y);
        } else if (preset === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            from = formatDate(firstDay);
            to = formatDate(today);
        } else if (preset === 'last_month') {
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            from = formatDate(firstDayLastMonth);
            to = formatDate(lastDayLastMonth);
        } else if (preset === 'this_year') {
            const firstDayYear = new Date(today.getFullYear(), 0, 1);
            from = formatDate(firstDayYear);
            to = formatDate(today);
        } else if (preset === 'all') {
            from = '';
            to = '';
        }

        setDateFrom(from);
        setDateTo(to);
        applyFilters({ date_from: from, date_to: to });
    };

    const clearAllFilters = () => {
        setSearchTerm(""); 
        setAccountId(""); 
        setTypeFilter(""); 
        setPartyType("");
        setClientId("");
        setVendorId("");
        setUserId("");
        setProjectId("");
        setDateFrom(""); 
        setDateTo("");
        router.get(route("admin.transactions.index"), { per_page: perPage }, { preserveState: true, replace: true });
    };

    const activeFilterCount = [
        searchTerm, 
        accountId, 
        typeFilter, 
        partyType, 
        clientId, 
        vendorId, 
        userId, 
        projectId, 
        dateFrom, 
        dateTo
    ].filter(Boolean).length;

    const getPartyMeta = (trx) => {
        switch(trx.party_type) {
            case 'Client':
                return {
                    icon: 'fa-solid fa-user-tie',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    partyLabel: 'Client / ক্লায়েন্ট'
                };
            case 'Vendor':
                return {
                    icon: 'fa-solid fa-truck-ramp-box',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200',
                    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
                    partyLabel: 'Vendor / ভেন্ডর'
                };
            case 'Employee':
                return {
                    icon: 'fa-solid fa-user-gear',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                    partyLabel: 'Staff / কর্মচারী'
                };
            case 'Expense':
            case 'Expense Category':
            case 'Payee':
                return {
                    icon: 'fa-solid fa-receipt',
                    bg: 'bg-rose-50 text-rose-700 border-rose-200',
                    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
                    partyLabel: 'Expense / খরচ'
                };
            case 'Transfer':
                return {
                    icon: 'fa-solid fa-right-left',
                    bg: 'bg-sky-50 text-sky-700 border-sky-200',
                    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
                    partyLabel: 'Transfer / ট্রান্সফার'
                };
            case 'Investor':
                return {
                    icon: 'fa-solid fa-hand-holding-dollar',
                    bg: 'bg-teal-50 text-teal-700 border-teal-200',
                    badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
                    partyLabel: 'Investor / বিনিয়োগকারী'
                };
            default:
                return {
                    icon: 'fa-solid fa-pen-nib',
                    bg: 'bg-slate-50 text-slate-700 border-slate-200',
                    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
                    partyLabel: 'Direct / ম্যানুয়াল'
                };
        }
    };

    const trxList = transactions.data || [];

    const handleViewModeSwitch = (mode) => {
        setViewMode(mode);
        if (mode === 'date_wise' && perPage !== 'all') {
            setPerPage('all');
            applyFilters({ per_page: 'all' });
        }
    };

    const { dailyPartyMap, dateWiseGroups } = useMemo(() => {
        const map = {};
        const groups = [];
        (transactions.data || []).forEach((trx) => {
            const key = `${trx.transaction_date}__${trx.party_type || 'Manual'}__${trx.party_name || 'Direct Entry'}__${trx.type}`;
            if (!map[key]) {
                map[key] = {
                    key,
                    transaction_date: trx.transaction_date,
                    party_name: trx.party_name || 'Direct Entry',
                    party_company: trx.party_company || null,
                    party_type: trx.party_type || 'Manual',
                    type: trx.type,
                    total_amount: 0,
                    items: [],
                    accounts: new Set(),
                    contexts: new Set(),
                    projects: new Set(),
                    representative: trx,
                };
                groups.push(map[key]);
            }
            const g = map[key];
            g.total_amount += Number(trx.amount || 0);
            g.items.push(trx);
            if (trx.account?.name) g.accounts.add(trx.account.name);
            if (trx.context_label) g.contexts.add(trx.context_label);
            if (trx.project_name) g.projects.add(trx.project_name);
        });
        return { dailyPartyMap: map, dateWiseGroups: groups };
    }, [transactions.data]);

    const handleCopy = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        if (viewMode === 'date_wise') {
            const text = dateWiseGroups.map((g) => `${g.transaction_date}\t${Array.from(g.accounts).join(', ') || "N/A"}\t${g.party_name}\t${g.items.length} Entries\t${g.type?.toUpperCase()}\t${g.total_amount}`).join("\n");
            navigator.clipboard.writeText("Date\tAccount\tParty/Context\tEntries\tType\tTotal Amount\n" + text);
        } else {
            const text = trxList.map((t) => `${t.transaction_date}\t${t.account?.name || "N/A"}\t${t.party_name || 'Manual'}\t${t.description}\t${t.type?.toUpperCase()}\t${t.amount}`).join("\n");
            navigator.clipboard.writeText("Date\tAccount\tParty/Context\tDescription\tType\tAmount\n" + text);
        }
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to export", "warning");
        if (viewMode === 'date_wise') {
            const headers = ["Date,Account,Party,Company,Breakdown,Type,Total Amount\n"];
            const rows = dateWiseGroups.map(g => {
                const breakdown = g.items.map(i => `${i.invoice_number || i.context_label}: ${i.amount}`).join(' | ');
                return `"${g.transaction_date}","${Array.from(g.accounts).join(', ')}","${g.party_name}","${g.party_company || ''}","${breakdown}","${g.type}","${g.total_amount}"`;
            });
            const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `DateWise_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
            link.click();
            return;
        }
        const headers = ["Date,Account,Party Context,Description,Reference,Type,Amount\n"];
        const rows = trxList.map(t => `"${t.transaction_date}","${t.account?.name || ''}","${t.party_name || 'Manual Entry'} (${t.context_label || ''})","${t.description}","${t.reference_number || ''}","${t.type}","${t.amount}"`);
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
        setData({ id: '', account_id: '', type: 'credit', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().slice(0, 10), reference_number: '', description: '' });
        setEditMode(false); setShowModal(true);
    };

    const openTransferModal = () => {
        clearTransferErrors(); resetTransfer(); setShowTransferModal(true);
    };

    const openEditModal = (trx) => {
        clearErrors();
        setData({ id: trx.id, account_id: trx.account_id || '', type: trx.type || 'credit', amount: Number(trx.amount || 0) - Number(trx.bank_charge || 0), bank_charge: trx.bank_charge || 0, transaction_date: trx.transaction_date || '', description: trx.description || '', reference_number: trx.reference_number || '' });
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
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This will reverse the amount in your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.transactions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({
                        icon: "success",
                        title: "Deleted!",
                        text: "Transaction removed and balance restored.",
                        timer: 1500,
                        showConfirmButton: false
                    }),
                    onError: (err) => Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: err.error || "Cannot delete system-generated transactions."
                    })
                });
            }
        });
    };

    const inputClass = "w-full rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-[13.5px] font-bold text-slate-900 outline-none transition-shadow focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";
    const inputClassFilter = "w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-bold text-slate-800 outline-none transition hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";

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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-book-open"></i> Financial Ledger
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Transactions Directory</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Monitor all cash inflows, outflows, and bank transfers across accounts.</p>
                    </div>
                </div>

                {/* 🟢 Premium Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard
                        label="Total Deposit (In)"
                        value={<><Taka className="text-[18px] mr-1 text-emerald-200" />{parseFloat(totalCredit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-down-to-bracket"
                        gradient="from-emerald-600 to-teal-700"
                        textColor="text-emerald-200"
                        iconColor="text-emerald-100"
                    />
                    <StatCard
                        label="Total Withdrawal (Out)"
                        value={<><Taka className="text-[18px] mr-1 text-rose-200" />{parseFloat(totalDebit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-right-from-bracket"
                        gradient="from-rose-500 to-red-600"
                        textColor="text-rose-200"
                        iconColor="text-rose-100"
                    />
                    <StatCard
                        label="Net Balance"
                        value={<>{netBalance < 0 ? '-' : ''}<Taka className={`text-[18px] mr-1 ${netBalance >= 0 ? 'text-indigo-200' : 'text-white'}`} />{Math.abs(parseFloat(netBalance || 0)).toLocaleString('en-IN')}</>}
                        icon="fa-scale-balanced"
                        gradient={netBalance >= 0 ? "from-indigo-600 to-blue-700" : "from-slate-700 to-slate-900"}
                        textColor={netBalance >= 0 ? "text-indigo-200" : "text-slate-300"}
                        iconColor={netBalance >= 0 ? "text-indigo-100" : "text-slate-100"}
                    />
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
                                <i className="fa-solid fa-money-bill-transfer text-[15px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[16px] font-black text-slate-900 leading-tight">
                                    {viewMode === 'date_wise' ? 'তারিখ অনুযায়ী মোট লেনদেন (Date-wise Summary)' : 'All Transactions'}
                                </h2>
                                <p className="text-[12px] text-slate-500 font-bold mt-0.5">
                                    {viewMode === 'date_wise'
                                        ? `${dateWiseGroups.length} date-wise party summaries (from ${trxList.length} records)`
                                        : `${transactions.total ?? trxList.length} total records`}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* 🟢 View Mode Toggle: Detailed vs Date-wise Total */}
                            <div className="inline-flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-300 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => handleViewModeSwitch('detailed')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                        viewMode === 'detailed'
                                            ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="fa-solid fa-list-ul text-[11px]"></i>
                                    <span>বিস্তারিত (All Entries)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleViewModeSwitch('date_wise')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                        viewMode === 'date_wise'
                                            ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="fa-solid fa-calendar-check text-[11px]"></i>
                                    <span>তারিখ অনুযায়ী মোট (Date-wise)</span>
                                </button>
                            </div>

                            {hasPermission('create_transaction') && (
                                <>
                                    <button onClick={openTransferModal} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-purple-700 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                        <i className="fa-solid fa-right-left"></i> Transfer Funds
                                    </button>
                                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                        <i className="fa-solid fa-plus"></i> Manual Entry
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 🟢 Party Category Filter Tabs */}
                    <div className="flex items-center gap-2 px-6 pt-4 pb-3 border-b border-slate-200 bg-slate-50/70 overflow-x-auto no-scrollbar">
                        <span className="text-[11.5px] font-black uppercase tracking-wider text-slate-500 mr-1 shrink-0 flex items-center gap-1.5">
                            <i className="fa-solid fa-filter text-indigo-500"></i> পক্ষ / ফিল্টার:
                        </span>
                        {[
                            { id: '', label: 'All Transactions', bn: 'সকল লেনদেন', icon: 'fa-list-check' },
                            { id: 'client', label: 'Clients', bn: 'ক্লায়েন্ট (টাকা প্রাপ্তি)', icon: 'fa-user-tie' },
                            { id: 'vendor', label: 'Vendors', bn: 'ভেন্ডর (টাকা প্রদান)', icon: 'fa-truck-ramp-box' },
                            { id: 'employee', label: 'Staff & Salary', bn: 'স্টাফ ও বেতন', icon: 'fa-users-gear' },
                            { id: 'expense', label: 'Office & Projects', bn: 'অফিস ও প্রজেক্ট খরচ', icon: 'fa-receipt' },
                            { id: 'transfer', label: 'Transfers', bn: 'ফান্ড ট্রান্সফার', icon: 'fa-right-left' },
                            { id: 'investor', label: 'Investors', bn: 'বিনিয়োগ', icon: 'fa-hand-holding-dollar' },
                        ].map((cat) => {
                            const isActive = (partyType === cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleFilterChange('party_type', cat.id)}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all shrink-0 border shadow-xs ${
                                        isActive
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-md ring-2 ring-indigo-600/20'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                                    }`}
                                >
                                    <i className={`fa-solid ${cat.icon} text-[12px] ${isActive ? 'text-white' : 'text-slate-400'}`}></i>
                                    <span>{cat.bn}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 🟢 Premium Toolbar 1: Show Rows & Export & Search */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Premium SVG Show Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all z-20">
                                <span className="bg-slate-100 px-4 py-2.5 text-[12.5px] font-black text-slate-600 border-r border-slate-300 uppercase tracking-widest">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
                                        handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none cursor-pointer border-none focus:ring-0 w-[120px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>

                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-sm"><i className="fas fa-print text-slate-500"></i> Print</button>

                            {/* Toggle Advanced Filters Button */}
                            <button
                                type="button"
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-bold border transition-all shadow-sm ${
                                    showAdvancedFilters || (clientId || vendorId || userId || projectId || dateFrom || dateTo)
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-indigo-100'
                                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <i className="fa-solid fa-sliders text-[12px]"></i>
                                <span>ফিল্টার অপশন</span>
                                {(clientId || vendorId || userId || projectId || dateFrom || dateTo) ? (
                                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                                ) : (
                                    <i className={`fa-solid fa-chevron-${showAdvancedFilters ? 'up' : 'down'} text-[10px] opacity-60 ml-0.5`}></i>
                                )}
                            </button>
                        </div>

                        {/* 🟢 Fast Search and Main Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 items-center w-full lg:w-auto">
                            <div className="relative w-full lg:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search party, ref, desc, inv..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className={`${inputClassFilter}`} 
                                />
                                {searchTerm && (
                                    <button onClick={() => { setSearchTerm(''); applyFilters({ search: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <i className="fa-solid fa-xmark text-[12px]"></i>
                                    </button>
                                )}
                            </div>

                            <div className="relative w-full lg:w-[160px]">
                                <CustomSelect value={accountId} onChange={(e) => handleFilterChange('account_id', e.target.value)}>
                                    <option value="">All Accounts</option>
                                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </CustomSelect>
                            </div>

                            <div className="relative w-full lg:w-[150px]">
                                <CustomSelect value={typeFilter} onChange={(e) => handleFilterChange('type', e.target.value)}>
                                    <option value="">All Types (সব)</option>
                                    <option value="credit">Deposit (In / জমা)</option>
                                    <option value="debit">Withdrawal (Out / খরচ)</option>
                                </CustomSelect>
                            </div>

                            {activeFilterCount > 0 && (
                                <button onClick={clearAllFilters} className="w-full lg:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 shadow-sm transition-colors whitespace-nowrap">
                                    <i className="fa-solid fa-rotate-left"></i> Reset ({activeFilterCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 🟢 Advanced Entity & Date Filter Drawer */}
                    {showAdvancedFilters && (
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <div className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <i className="fa-solid fa-filter-circle-dollar text-indigo-600"></i> নির্দিষ্ট ব্যক্তি / প্রতিষ্ঠান / প্রজেক্ট অনুযায়ী ফিল্টার করুন
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 lowercase">select specific party, staff, project or custom date</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {/* Client Filter */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-solid fa-user-tie text-emerald-600 mr-1"></i> নির্দিষ্ট ক্লায়েন্ট
                                    </label>
                                    <CustomSelect value={clientId} onChange={(e) => handleFilterChange('client_id', e.target.value)} placeholder="All Clients">
                                        <option value="">All Clients</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ''}</option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                {/* Vendor Filter */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-solid fa-truck-ramp-box text-amber-600 mr-1"></i> নির্দিষ্ট ভেন্ডর
                                    </label>
                                    <CustomSelect value={vendorId} onChange={(e) => handleFilterChange('vendor_id', e.target.value)} placeholder="All Vendors">
                                        <option value="">All Vendors</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}{v.company_name ? ` (${v.company_name})` : ''}</option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                {/* Staff / User Filter */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-solid fa-user-gear text-indigo-600 mr-1"></i> স্টাফ / কর্মচারী
                                    </label>
                                    <CustomSelect value={userId} onChange={(e) => handleFilterChange('user_id', e.target.value)} placeholder="All Staff">
                                        <option value="">All Staff</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                {/* Project Filter */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-regular fa-folder-open text-blue-600 mr-1"></i> প্রজেক্ট
                                    </label>
                                    <CustomSelect value={projectId} onChange={(e) => handleFilterChange('project_id', e.target.value)} placeholder="All Projects">
                                        <option value="">All Projects</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                {/* Date From */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-regular fa-calendar text-slate-500 mr-1"></i> শুরু তারিখ
                                    </label>
                                    <input 
                                        type="date" 
                                        value={dateFrom} 
                                        onChange={(e) => handleFilterChange('date_from', e.target.value)} 
                                        className={`${inputClass} !py-2 !text-[12.5px]`} 
                                    />
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                                        <i className="fa-regular fa-calendar-check text-slate-500 mr-1"></i> শেষ তারিখ
                                    </label>
                                    <input 
                                        type="date" 
                                        value={dateTo} 
                                        onChange={(e) => handleFilterChange('date_to', e.target.value)} 
                                        className={`${inputClass} !py-2 !text-[12.5px]`} 
                                    />
                                </div>
                            </div>

                            {/* Quick Date Presets Row */}
                            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                                        <i className="fa-regular fa-calendar-days text-slate-400"></i> দ্রুত তারিখ নির্বাচন:
                                    </span>
                                    {[
                                        { id: 'today', label: 'আজ' },
                                        { id: 'yesterday', label: 'গতকাল' },
                                        { id: 'this_month', label: 'চলতি মাস' },
                                        { id: 'last_month', label: 'গত মাস' },
                                        { id: 'this_year', label: 'এই বছর' },
                                        { id: 'all', label: 'সব সময়' },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleDatePreset(p.id)}
                                            className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors shadow-xs"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>

                                {(clientId || vendorId || userId || projectId || dateFrom || dateTo) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setClientId(''); setVendorId(''); setUserId(''); setProjectId(''); setDateFrom(''); setDateTo('');
                                            applyFilters({ client_id: '', vendor_id: '', user_id: '', project_id: '', date_from: '', date_to: '' });
                                        }}
                                        className="text-[11.5px] font-black text-rose-600 hover:text-rose-800 flex items-center gap-1"
                                    >
                                        <i className="fa-solid fa-xmark"></i> এই ফিল্টার মুছুন
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 🟢 Active Filter Badges */}
                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-2 px-6 py-2 bg-indigo-50/40 border-b border-indigo-100 flex-wrap text-[11.5px]">
                            <span className="font-black text-indigo-900 uppercase tracking-wider text-[10.5px]">Active Filters:</span>
                            {partyType && (
                                <span className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Party: {partyType}
                                    <button onClick={() => handleFilterChange('party_type', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {searchTerm && (
                                <span className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Search: "{searchTerm}"
                                    <button onClick={() => { setSearchTerm(''); applyFilters({ search: '' }); }} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {accountId && (
                                <span className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Account: {accounts.find(a => String(a.id) === String(accountId))?.name}
                                    <button onClick={() => handleFilterChange('account_id', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {typeFilter && (
                                <span className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Type: {typeFilter === 'credit' ? 'Deposit' : 'Withdrawal'}
                                    <button onClick={() => handleFilterChange('type', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {clientId && (
                                <span className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Client: {clients.find(c => String(c.id) === String(clientId))?.name}
                                    <button onClick={() => handleFilterChange('client_id', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {vendorId && (
                                <span className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-800 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Vendor: {vendors.find(v => String(v.id) === String(vendorId))?.name}
                                    <button onClick={() => handleFilterChange('vendor_id', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {userId && (
                                <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Staff: {users.find(u => String(u.id) === String(userId))?.name}
                                    <button onClick={() => handleFilterChange('user_id', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {projectId && (
                                <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Project: {projects.find(p => String(p.id) === String(projectId))?.title}
                                    <button onClick={() => handleFilterChange('project_id', '')} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            {(dateFrom || dateTo) && (
                                <span className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-700 font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Date: {dateFrom || '...'} to {dateTo || '...'}
                                    <button onClick={() => { setDateFrom(''); setDateTo(''); applyFilters({ date_from: '', date_to: '' }); }} className="hover:text-red-600 ml-1 font-black">×</button>
                                </span>
                            )}
                            <button onClick={clearAllFilters} className="text-rose-600 font-black hover:underline ml-auto text-[11px]">
                                Clear All
                            </button>
                        </div>
                    )}

                    {/* 🟢 Helper Banner when Date-wise Summary Mode is Active */}
                    {viewMode === 'date_wise' && (
                        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between flex-wrap gap-2 text-[12.5px] font-bold text-emerald-900">
                            <span className="flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-emerald-600 text-[14px]"></i>
                                <span>
                                    <strong>তারিখ অনুযায়ী মোট হিসাব (Date-wise Summary):</strong> একই তারিখে কোনো ক্লায়েন্ট বা ভেন্ডরের একাধিক ইনভয়েস/বিলের লেনদেন (যেমন: ৩০০০ + ৪০০০ + ৫০০০ = ১২,০০০ টাকা) এখানে একত্রে যোগ করে দেখানো হচ্ছে।
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setViewMode('detailed')}
                                className="text-[11.5px] font-black text-emerald-700 bg-white border border-emerald-300 px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
                            >
                                আলাদা আলাদা এন্ট্রি দেখুন →
                            </button>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10 text-[11.5px] font-black uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">SL</th>
                                    <th className="px-6 py-4 w-32">Date (তারিখ)</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4 w-[24%]">Context / Party (কার মাধ্যমে / কার জন্য)</th>
                                    <th className="px-6 py-4 w-[25%]">
                                        {viewMode === 'date_wise' ? 'Invoices / Breakdown (কোন কোন বিলে কত টাকা)' : 'Description & Ref'}
                                    </th>
                                    <th className="px-6 py-4 text-center">Type</th>
                                    <th className="px-6 py-4 text-right">
                                        {viewMode === 'date_wise' ? 'ঐ তারিখে মোট (Total on Date)' : 'Amount (In/Out)'}
                                    </th>
                                    <th className="px-6 py-4 text-center no-print w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {viewMode === 'date_wise' ? (
                                    dateWiseGroups.length > 0 ? (
                                        dateWiseGroups.map((group, index) => {
                                            const meta = getPartyMeta(group.representative);
                                            const accountNames = Array.from(group.accounts);
                                            return (
                                                <tr key={group.key} className="hover:bg-emerald-50/30 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-slate-500 text-center tabular-nums">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 shadow-sm px-3 py-1.5 rounded-lg w-max text-[12.5px] font-black text-slate-800">
                                                            <i className="fa-regular fa-calendar-check text-[12px] text-indigo-600"></i>
                                                            {group.transaction_date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm shrink-0">
                                                                <i className="fa-solid fa-building-columns text-[13px]"></i>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-indigo-700 text-[13.5px]">
                                                                    {accountNames.length > 0 ? accountNames.join(', ') : 'N/A'}
                                                                </span>
                                                                <span className="text-[11px] font-bold text-slate-500">
                                                                    {group.items.length} {group.items.length > 1 ? 'transactions combined' : 'transaction'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${meta.bg}`}>
                                                                <i className={`${meta.icon} text-[14px]`}></i>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[14px] font-black text-slate-900 leading-snug truncate max-w-[220px]" title={group.party_name}>
                                                                        {group.party_name}
                                                                    </span>
                                                                    {group.party_type && (
                                                                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow-2xs ${meta.badgeBg}`}>
                                                                            {group.party_type}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {group.party_company && (
                                                                    <span className="text-[11.5px] font-bold text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                                        <i className="fa-regular fa-building text-[10px] text-slate-400"></i>
                                                                        {group.party_company}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                                    {Array.from(group.contexts).map((ctx, i) => (
                                                                        <span key={i} className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                                                                            {ctx}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-normal min-w-[280px]">
                                                        {group.items.length > 1 ? (
                                                            <div className="space-y-1.5">
                                                                <div className="text-[11.5px] font-black text-indigo-800 flex items-center gap-1.5">
                                                                    <i className="fa-solid fa-layer-group text-indigo-600 text-[11px]"></i>
                                                                    <span>একসাথে {group.items.length}টি ইনভয়েস / খাতে পেমেন্ট:</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {group.items.map((item) => (
                                                                        <span
                                                                            key={item.id}
                                                                            className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg text-[11.5px] font-bold shadow-2xs"
                                                                        >
                                                                            <span className="text-indigo-700 font-black">
                                                                                {item.invoice_number || item.reference_number || item.context_label}:
                                                                            </span>
                                                                            <span className="font-black text-slate-900">
                                                                                ৳{parseFloat(item.amount).toLocaleString('en-IN')}
                                                                            </span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="text-slate-800 font-bold leading-snug">{group.items[0].description}</div>
                                                                {(group.items[0].invoice_number || group.items[0].reference_number) && (
                                                                    <div className="text-[10.5px] font-black text-slate-500 mt-1 flex items-center gap-1 bg-white border border-slate-300 w-max px-2 py-0.5 rounded shadow-2xs uppercase">
                                                                        <i className="fa-solid fa-hashtag text-[9px] opacity-70"></i>
                                                                        {group.items[0].invoice_number || group.items[0].reference_number}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap border shadow-sm ${group.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                                            {group.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right whitespace-nowrap tabular-nums ${group.type === 'credit' ? 'text-emerald-700 bg-emerald-50/40 border-l border-emerald-100' : 'text-rose-700 bg-rose-50/40 border-l border-rose-100'}`}>
                                                        <div className="font-black text-[16.5px]">
                                                            {group.type === 'credit' ? '+' : '-'} <Taka className="text-[14px] ml-0.5" /> {parseFloat(group.total_amount).toLocaleString('en-IN')}
                                                        </div>
                                                        {group.items.length > 1 && (
                                                            <div className="mt-1">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${group.type === 'credit' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                                                                    <i className="fa-solid fa-check-double text-[9px]"></i> {group.items.length}টি বিল একত্রে
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center no-print">
                                                        <button
                                                            type="button"
                                                            onClick={() => openViewModal({
                                                                ...group.representative,
                                                                amount: group.total_amount,
                                                                is_group_view: true,
                                                                group_summary: group
                                                            })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 font-bold text-[12px] transition-colors shadow-sm"
                                                            title="বিস্তারিত রিসিপ্ট দেখুন"
                                                        >
                                                            <i className="fa-regular fa-eye text-[12px]"></i> বিস্তারিত
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-24 text-center text-slate-500">
                                                <p className="text-[16px] font-black text-slate-800">No transactions found.</p>
                                            </td>
                                        </tr>
                                    )
                                ) : trxList.length > 0 ? (
                                    trxList.map((trx, index) => {
                                        const groupKey = `${trx.transaction_date}__${trx.party_type || 'Manual'}__${trx.party_name || 'Direct Entry'}__${trx.type}`;
                                        const group = dailyPartyMap[groupKey];
                                        return (
                                        <tr key={trx.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-500 text-center tabular-nums">
                                                {transactions.from ? transactions.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-2.5 py-1.5 rounded-lg w-max text-[12px]"><i className="fa-regular fa-calendar text-[11px] text-slate-400"></i>{trx.transaction_date}</div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm shrink-0">
                                                        <i className="fa-solid fa-building-columns text-[13px]"></i>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-indigo-700 text-[14px]">
                                                            {trx.account?.name || <span className="text-slate-400 italic">Deleted Account</span>}
                                                        </span>
                                                        {trx.account && (
                                                            <span className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1 bg-slate-100 w-max px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                                                                <i className="fa-solid fa-wallet text-slate-400 text-[10px]"></i> Bal: 
                                                                <Taka className="text-[10px] ml-0.5" /> 
                                                                {parseFloat(trx.account.current_balance || 0).toLocaleString('en-IN')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 🟢 Context / Related Party Column */}
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const meta = getPartyMeta(trx);
                                                    return (
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${meta.bg}`}>
                                                                <i className={`${meta.icon} text-[14px]`}></i>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[13.5px] font-black text-slate-900 leading-snug truncate max-w-[220px]" title={trx.party_name}>
                                                                        {trx.party_name || "Direct Entry"}
                                                                    </span>
                                                                    {trx.party_type && (
                                                                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow-2xs ${meta.badgeBg}`}>
                                                                            {trx.party_type}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {trx.party_company && (
                                                                    <span className="text-[11.5px] font-bold text-slate-500 truncate flex items-center gap-1 mt-0.5" title={trx.party_company}>
                                                                        <i className="fa-regular fa-building text-[10px] text-slate-400"></i>
                                                                        {trx.party_company}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                                    {trx.context_label && (
                                                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                                                                            {trx.context_label}
                                                                        </span>
                                                                    )}
                                                                    {trx.project_name && (
                                                                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1" title={trx.project_name}>
                                                                            <i className="fa-regular fa-folder-open text-[9.5px]"></i> {trx.project_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-slate-800 font-bold whitespace-normal leading-snug">{trx.description}</div>
                                                {trx.reference_number && (
                                                    <div className="text-[10.5px] font-black text-slate-500 mt-1.5 flex items-center gap-1 bg-white border border-slate-300 w-max px-2.5 py-1 rounded-md shadow-sm uppercase tracking-widest">
                                                        <i className="fa-solid fa-hashtag text-[10px] opacity-70"></i> Ref: {trx.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap border shadow-sm ${trx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                                    {trx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[15px] whitespace-nowrap tabular-nums transition-colors ${trx.type === 'credit' ? 'text-emerald-700 bg-emerald-50/30 border-l border-emerald-100' : 'text-rose-700 bg-rose-50/30 border-l border-rose-100'}`}>
                                                <div>
                                                    {trx.type === 'credit' ? '+' : '-'} <Taka className="text-[13px] ml-0.5" /> {parseFloat(trx.amount).toLocaleString('en-IN')}
                                                </div>
                                                {group && group.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openViewModal({ ...trx, group_summary: group })}
                                                        className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-colors shadow-2xs ${
                                                            trx.type === 'credit'
                                                                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                                                : 'bg-rose-100/90 text-rose-800 border-rose-300 hover:bg-rose-200'
                                                        }`}
                                                        title="ঐ তারিখে এই ক্লায়েন্ট/পক্ষের মোট লেনদেনের বিস্তারিত দেখুন"
                                                    >
                                                        <i className="fa-solid fa-layer-group text-[9px]"></i>
                                                        ঐ তারিখে মোট: ৳{parseFloat(group.total_amount).toLocaleString('en-IN')} ({group.items.length}টি)
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    {hasPermission('view_transaction') && (
                                                        <button onClick={() => openViewModal({ ...trx, group_summary: group })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {!trx.transactionable_id ? (
                                                        <>
                                                            {hasPermission('edit_transaction') && (
                                                                <button onClick={() => openEditModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors shadow-sm" title="Edit">
                                                                    <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                </button>
                                                            )}
                                                            {hasPermission('delete_transaction') && (
                                                                <button onClick={() => handleDelete(trx.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-sm" title="Delete">
                                                                    <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 cursor-not-allowed shadow-sm" title="System generated transaction">
                                                            System
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm border border-slate-200">
                                                    <i className="fa-solid fa-money-bill-transfer text-2xl"></i>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800">No transactions found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your filters or record a new entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-300 bg-slate-100 px-6 py-4 no-print">
                            <div className="text-[13.5px] text-slate-600 font-bold">
                                Showing <strong className="text-slate-900 font-black">{transactions.from || 0}</strong> to <strong className="text-slate-900 font-black">{transactions.to || 0}</strong> of <strong className="text-slate-900 font-black">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-1.5 text-[13px] font-black transition-all shadow-sm
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400' : 'border-slate-200 bg-slate-50 text-slate-400 pointer-events-none'}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-purple-300 text-[10px] font-black uppercase tracking-widest mb-1.5 border border-white/10 shadow-sm">
                                    <i className="fa-solid fa-right-left"></i> Bank / Cash
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">Transfer Funds</h3>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors bg-white/5 border border-white/10 shadow-sm relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">
                                {transferErrors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg"></i> {transferErrors.error}
                                    </div>
                                )}

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md relative">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">From Account (Source) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <CustomSelect
                                                    value={transferData.from_account_id}
                                                    onChange={(e) => setTransferData('from_account_id', e.target.value)}
                                                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                                    style={{ backgroundImage: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select source account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </CustomSelect>
                                            </div>
                                            {transferErrors.from_account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.from_account_id}</p>}
                                        </div>

                                        <div className="flex justify-center -my-7 relative z-10 pointer-events-none">
                                            <div className="bg-purple-100 text-purple-600 h-10 w-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                                                <i className="fa-solid fa-arrow-down text-[15px]"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">To Account (Destination) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <CustomSelect
                                                    value={transferData.to_account_id}
                                                    onChange={(e) => setTransferData('to_account_id', e.target.value)}
                                                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                                    style={{ backgroundImage: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select destination account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </CustomSelect>
                                            </div>
                                            {transferErrors.to_account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.to_account_id}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Transfer Amount <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={transferData.amount}
                                                onChange={e => setTransferData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-slate-400 pl-10 pr-4 py-3 text-[16px] font-black text-purple-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 shadow-sm transition-all bg-purple-50/50"
                                                placeholder="0.00" required
                                            />
                                        </div>
                                        {transferErrors.amount && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.amount}</p>}
                                        <label className="block text-[12.5px] font-bold mt-3 text-slate-700">Bank charge (extra)<input type="number" min="0" step="0.01" value={transferData.bank_charge} onChange={e => setTransferData('bank_charge', e.target.value)} className={`${inputClass} mt-2`} /></label>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Date <span className="text-red-600">*</span></label>
                                        <input
                                            type="date"
                                            value={transferData.transaction_date}
                                            onChange={e => setTransferData('transaction_date', e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Description / Notes</label>
                                    <input
                                        type="text"
                                        value={transferData.description}
                                        onChange={e => setTransferData('description', e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. Bank to Cash transfer for petty expenses"
                                    />
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={transferProcessing} className="rounded-xl bg-purple-600 px-10 py-3.5 text-[14px] font-bold text-white hover:bg-purple-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1">
                                    {transferProcessing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> Complete Transfer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 MANUAL ENTRY FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-sm">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">
                                    {editMode ? "Edit Transaction" : "Manual Transaction Entry"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors bg-white/5 shadow-sm relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Select Account <span className="text-red-600">*</span></label>
                                    <div className="relative">
                                        <CustomSelect
                                            value={data.account_id}
                                            onChange={(e) => setData('account_id', e.target.value)}
                                            className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                            style={{ backgroundImage: 'none' }}
                                            required
                                        >
                                            <option value="">Choose an account...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                        </CustomSelect>
                                    </div>
                                    {errors.account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Transaction Type <span className="text-red-600">*</span></label>
                                        <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setData(prev => ({...prev, type: 'credit', bank_charge: 0}))}
                                                className={`flex-1 py-2 text-[14px] font-black rounded-lg transition-all border ${data.type === 'credit' ? 'bg-white text-emerald-700 shadow-sm border-emerald-200' : 'text-slate-500 hover:text-slate-700 border-transparent'}`}
                                            >
                                                Deposit (In)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'debit')}
                                                className={`flex-1 py-2 text-[14px] font-black rounded-lg transition-all border ${data.type === 'debit' ? 'bg-white text-rose-700 shadow-sm border-rose-200' : 'text-slate-500 hover:text-slate-700 border-transparent'}`}
                                            >
                                                Withdrawal (Out)
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[12px] font-black uppercase tracking-widest mb-2 ${data.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>Amount <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className={`absolute left-4 top-1/2 -translate-y-1/2 text-[16px] ${data.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[16px] font-black outline-none transition-all shadow-sm
                                                    ${data.type === 'credit' ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20' : 'bg-rose-50/50 border-rose-300 text-rose-800 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20'}
                                                `}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {data.type === 'debit' && <label className="block text-[13px] font-bold mt-3 text-slate-700">Bank charge (extra)<input type="number" min="0" step="0.01" value={data.bank_charge} onChange={e => setData('bank_charge', e.target.value)} className={`${inputClass} mt-2`} /><span className="block text-xs mt-2 text-slate-500">Total account debit: {(Number(data.amount || 0) + Number(data.bank_charge || 0)).toFixed(2)}</span></label>}
                                        {errors.amount && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.amount}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Date <span className="text-red-600">*</span></label>
                                        <input
                                            type="date"
                                            value={data.transaction_date}
                                            onChange={e => setData('transaction_date', e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Reference No <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={data.reference_number}
                                            onChange={e => setData('reference_number', e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Check #, Trx ID"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Description / Reason <span className="text-red-600">*</span></label>
                                        <input
                                            type="text"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Added capital, Bank charge"
                                            required
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-10 py-3.5 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> {editMode ? "Update Entry" : "Save Entry"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-gray-50 rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="relative bg-slate-900 px-8 py-6 shrink-0 overflow-hidden border-b border-slate-700">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 opacity-50 translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[20px] font-black text-white flex items-center gap-2.5">
                                    <i className="fa-solid fa-receipt text-indigo-400 text-xl"></i> Transaction Receipt
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white hover:bg-white/10 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-5 overflow-y-auto custom-table-scroll bg-slate-50">
                            {/* Amount Banner */}
                            <div className={`text-center py-7 bg-white rounded-3xl border ${selectedTrx.type === 'credit' ? 'border-emerald-300' : 'border-rose-300'} shadow-md relative overflow-hidden`}>
                                <div className={`absolute top-0 left-0 w-full h-2 ${selectedTrx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                                <span className={`inline-block mb-2.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border shadow-sm ${selectedTrx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / Cash In (জমা)' : 'Withdrawal / Cash Out (খরচ)'}
                                </span>

                                <div className={`text-[38px] font-black tabular-nums tracking-tight leading-none ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<Taka className="text-[24px] mr-1" />{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* 🟢 Party Identification Card */}
                            {(() => {
                                const meta = getPartyMeta(selectedTrx);
                                return (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md">
                                        <div className="flex items-start gap-4">
                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${meta.bg}`}>
                                                <i className={`${meta.icon} text-[18px]`}></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                                    Party Information (কার সাথে লেনদেন)
                                                </span>
                                                <h4 className="text-[17px] font-black text-slate-900 truncate">
                                                    {selectedTrx.party_name || "Direct Entry"}
                                                </h4>
                                                {selectedTrx.party_company && (
                                                    <p className="text-[12.5px] font-bold text-slate-600 flex items-center gap-1.5 mt-0.5">
                                                        <i className="fa-regular fa-building text-[11px] text-slate-400"></i>
                                                        {selectedTrx.party_company}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                                    {selectedTrx.party_type && (
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border shadow-2xs ${meta.badgeBg}`}>
                                                            {meta.partyLabel}
                                                        </span>
                                                    )}
                                                    {selectedTrx.context_label && (
                                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded shadow-2xs">
                                                            {selectedTrx.context_label}
                                                        </span>
                                                    )}
                                                    {selectedTrx.project_name && (
                                                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                                                            <i className="fa-regular fa-folder-open text-[10px]"></i> Project: {selectedTrx.project_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 🟢 Date-wise Combined Payment Breakdown (if multiple entries on same date) */}
                            {selectedTrx.group_summary && selectedTrx.group_summary.items.length > 1 && (
                                <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-300 shadow-sm">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-200">
                                        <span className="text-[11.5px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                            <i className="fa-solid fa-layer-group text-emerald-600"></i>
                                            ঐ তারিখে মোট লেনদেনের হিসাব ({selectedTrx.group_summary.items.length}টি এন্ট্রি)
                                        </span>
                                        <span className="text-[14px] font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                                            মোট: ৳{selectedTrx.group_summary.total_amount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-table-scroll">
                                        {selectedTrx.group_summary.items.map((item, i) => (
                                            <div key={item.id || i} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200/80 text-[12.5px]">
                                                <div className="font-bold text-slate-700 truncate pr-3 flex items-center gap-1.5">
                                                    <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <span className="truncate">{item.invoice_number || item.description}</span>
                                                </div>
                                                <span className="font-black text-slate-900 tabular-nums shrink-0">
                                                    ৳{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Account & Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-solid fa-building-columns mr-1 text-slate-300"></i> Account</span>
                                    <div className="font-black text-slate-900 text-[14.5px]">
                                        {selectedTrx.account?.name || "N/A"}
                                    </div>
                                    {selectedTrx.account && (
                                        <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                                            Current Bal: ৳{parseFloat(selectedTrx.account.current_balance || 0).toLocaleString('en-IN')}
                                        </span>
                                    )}
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-slate-300"></i> Transaction Date</span>
                                    <div className="font-black text-slate-900 text-[14.5px]">
                                        {selectedTrx.transaction_date}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md col-span-2">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-solid fa-align-left mr-1 text-slate-300"></i> Description & Notes</span>
                                    <div className="text-slate-800 font-bold text-[14.5px] leading-relaxed">{selectedTrx.description}</div>
                                </div>
                                {selectedTrx.reference_number && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md col-span-2 flex justify-between items-center">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Reference Number</span>
                                        <div className="font-black text-slate-900 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[13.5px]">
                                            <i className="fa-solid fa-hashtag text-slate-400"></i> {selectedTrx.reference_number}
                                        </div>
                                    </div>
                                )}
                                {Number(selectedTrx.bank_charge || 0) > 0 && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md col-span-2 flex justify-between items-center">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-rose-500">Bank Charge</span>
                                        <div className="font-black text-rose-700 text-[14px]">
                                            ৳{parseFloat(selectedTrx.bank_charge).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 px-8 py-3.5 text-[14px] font-bold text-white hover:bg-black shadow-md transition-colors w-full sm:w-auto">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
