import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

// 🟢 Custom Taka Component
const Taka = ({ className = "text-[16px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-1 opacity-80 ${className}`}>৳</span>
);

// 🟢 Premium Stat Card Component
const StatCard = ({ label, value, icon, gradient, note, noteColor }) => {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md group">
            <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${gradient}`}></div>
            <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                    <h3 className="text-[24px] font-black text-gray-900 tracking-tight tabular-nums mt-0.5">{value}</h3>
                    {note && <p className={`text-[11px] font-bold mt-1 ${noteColor || 'text-gray-400'}`}>{note}</p>}
                </div>
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${gradient}`}>
                    <i className={`fa-solid ${icon} text-[22px]`}></i>
                </div>
            </div>
        </div>
    );
};

/* =========================================
   REUSABLE SEARCHABLE SELECT COMPONENT
========================================= */
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, error, disabled }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) => getLabel(opt).toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-[14px] font-bold outline-none transition-shadow 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 border-gray-200' : 'bg-white hover:bg-gray-50 focus:ring-4'} 
                    ${error ? 'border-red-400 focus:ring-red-500/10' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/10'} 
                    ${selected ? 'text-gray-900' : 'text-gray-500'} shadow-sm
                `}
            >
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input
                            ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..."
                            className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-[13px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 bg-white"
                        />
                    </div>
                    <div className="overflow-y-auto py-1 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] font-medium text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        className={`cursor-pointer px-4 py-2.5 text-[13.5px] transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 font-medium hover:bg-gray-50'}`}
                                    >
                                        {getLabel(opt)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Index({ assets = { data: [], links: [] }, users = [], accounts = [], stats = {}, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => filters.search || new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(filters.per_page) || Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', name: '', asset_code: '', serial_number: '', purchase_date: '', purchase_price: '',
        account_id: '', assigned_to: '', assigned_date: '', condition: 'new'
    });

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;
            router.get(route('admin.assets.index'), params, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const assetList = assets.data || [];

    const handleCopy = () => {
        if (!assetList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = assetList.map((a) => `${a.name}\t${a.asset_code}\t${a.serial_number || '-'}\t${a.assignee?.name || 'Unassigned'}\t${a.purchase_price || '0'}\t${a.condition?.toUpperCase()}`).join("\n");
        navigator.clipboard.writeText("Asset Name\tAsset Code\tSerial\tAssigned To\tPrice\tCondition\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!assetList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Asset Name,Asset Code,Serial Number,Assigned To,Purchase Price,Condition\n"];
        const rows = assetList.map(a => `"${a.name}","${a.asset_code}","${a.serial_number || ''}","${a.assignee?.name || ''}","${a.purchase_price || '0'}","${a.condition}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Asset_Register_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', account_id: '', name: '', asset_code: '', serial_number: '', purchase_date: '', purchase_price: '', assigned_to: '', assigned_date: '', condition: 'new' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (record) => {
        clearErrors();
        setData({ id: record.id, name: record.name || '', asset_code: record.asset_code || '', serial_number: record.serial_number || '', purchase_date: record.purchase_date || '', purchase_price: record.purchase_price || '', account_id: record.account_id || '', assigned_to: record.assigned_to || '', assigned_date: record.assigned_date || '', condition: record.condition || 'new' });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (record) => {
        setSelectedRecord(record);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.assets.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false }); } });
        } else {
            post(route('admin.assets.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: "success", title: "Asset Added Successfully!", timer: 1500, showConfirmButton: false }); } });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: "This asset record will be permanently deleted! If it has a linked purchase cost, that amount will be refunded to the account.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.assets.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "The asset has been deleted.", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    const getConditionStyles = (condition) => {
        const styles = {
            new: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'New' },
            good: { bg: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Good' },
            damaged: { bg: 'bg-rose-50 text-rose-600 border-rose-200', label: 'Damaged' },
            under_repair: { bg: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Under Repair' }
        };
        return styles[condition] || { bg: 'bg-gray-100 text-gray-500 border-gray-200', label: condition };
    };

    return (
        <AdminLayout>
            <Head title="Asset Management" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-table, #printable-table * { visibility: visible; }
                    #printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Administration
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Asset Register</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Track company assets, hardware assignments, and calculate total purchase value.
                        </p>
                    </div>
                </div>

                {/* 🟢 4 PREMIUM SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print">
                    <StatCard
                        label="Total Assets"
                        value={stats.total_assets || 0}
                        icon="fa-boxes-stacked"
                        gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                        note="Total items in company register"
                        noteColor="text-indigo-600"
                    />
                    <StatCard
                        label="Total Asset Value"
                        value={<><Taka /> {(Number(stats.total_value) || 0).toLocaleString('en-IN')}</>}
                        icon="fa-money-bill-trend-up"
                        gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        note="Total cost of purchased assets"
                        noteColor="text-emerald-600"
                    />
                    <StatCard
                        label="Assets In Use"
                        value={stats.assigned_assets || 0}
                        icon="fa-user-check"
                        gradient="bg-gradient-to-br from-blue-400 to-cyan-500"
                        note="Currently assigned to employees"
                        noteColor="text-blue-600"
                    />
                    <StatCard
                        label="Needs Attention"
                        value={stats.damaged_repair || 0}
                        icon="fa-screwdriver-wrench"
                        gradient="bg-gradient-to-br from-rose-500 to-red-600"
                        note="Assets damaged or under repair"
                        noteColor="text-rose-500"
                    />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-desktop text-[14px]"></i>
                            </div>
                            Asset Inventory
                        </div>
                        {hasPermission('create_asset') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                            <i className="fa-solid fa-plus"></i> Add New Asset
                        </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* 🟢 Premium SVG Show Dropdown */}
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

                            <div className="h-6 w-px bg-gray-200 hidden md:block mx-1"></div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button type="button" onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search by name, code or assignee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[25%]">Asset Details</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Assigned To</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Condition</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Purchase Price</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {assetList.length > 0 ? (
                                    assetList.map((record, index) => {
                                        const conditionStyle = getConditionStyles(record.condition);
                                        return (
                                            <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                    {assets.from ? assets.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 text-[16px] shadow-sm group-hover:scale-105 transition-transform border border-gray-200">
                                                            <i className="fa-solid fa-desktop"></i>
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-gray-900 text-[14.5px] truncate max-w-[200px]" title={record.name}>{record.name}</div>
                                                            <div className="text-[11.5px] font-bold text-indigo-500 mt-1 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">Code: {record.asset_code}</div>
                                                            {record.serial_number && <div className="text-[11px] text-gray-500 mt-1 font-medium"><i className="fa-solid fa-barcode text-gray-400"></i> SN: {record.serial_number}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {record.assignee ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-[11px] font-black uppercase shadow-sm">
                                                                {record.assignee.name.charAt(0)}
                                                            </div>
                                                            <div className="font-bold text-gray-900 text-[13.5px]">
                                                                {record.assignee.name}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic font-medium">In Storage / Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${conditionStyle.bg}`}>
                                                        {conditionStyle.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-black text-gray-900 text-[15px] tabular-nums">
                                                        {record.purchase_price ? <><Taka className="text-[13px]"/> {parseFloat(record.purchase_price).toLocaleString('en-IN')}</> : <span className="text-gray-400 text-[12px] font-medium italic">N/A</span>}
                                                    </div>
                                                    {record.purchase_date && <div className="text-[11px] text-gray-500 font-medium mt-1">Purchased: {record.purchase_date}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-right no-print">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_asset') && (
                                                            <button onClick={() => openViewModal(record)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_asset') && (
                                                            <button onClick={() => openEditModal(record)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_asset') && (
                                                            <button onClick={() => handleDelete(record.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete">
                                                                <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                                    <i className="fa-solid fa-boxes-stacked text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No asset records found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or add a new asset.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {assets.links && assets.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4 no-print">
                            <div className="text-[13px] font-medium text-gray-500">
                                {assets.total > 0 && `Showing ${assets.from || 0} to ${assets.to || 0} of ${assets.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {assets.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Premium Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-black opacity-10 -translate-x-5 translate-y-5"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl shadow-lg ring-1 ring-white/30">
                                    <i className="fa-solid fa-desktop"></i>
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white text-indigo-700`}>
                                            Code: {selectedRecord.asset_code}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getConditionStyles(selectedRecord.condition).bg.replace('border-', '')}`}>
                                            {getConditionStyles(selectedRecord.condition).label}
                                        </span>
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">{selectedRecord.name}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-[16px] font-black uppercase shadow-sm">
                                        {selectedRecord.assignee?.name ? selectedRecord.assignee.name.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Assigned Personnel</span>
                                        <div className="font-bold text-gray-900 text-[15px]">{selectedRecord.assignee?.name || <span className="italic text-gray-400">Unassigned / Storage</span>}</div>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-barcode mr-1 text-rose-400"></i> Serial Number</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedRecord.serial_number || "N/A"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-blue-400"></i> Purchase Date</span>
                                    <div className="font-bold text-gray-900 text-[14px]">{selectedRecord.purchase_date || "Not Recorded"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-money-bill-trend-up mr-1 text-emerald-500"></i> Purchase Value</span>
                                    <div className="font-black text-indigo-700 text-[18px] tabular-nums">{selectedRecord.purchase_price ? <><Taka /> {parseFloat(selectedRecord.purchase_price).toLocaleString('en-IN')}</> : "N/A"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm sm:col-span-2 flex justify-between items-center">
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Payment Source Account</span>
                                    <div className="font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2">
                                        <i className="fa-solid fa-building-columns text-gray-400"></i> {selectedRecord.account?.name || "Not specified or paid externally"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 STUNNING CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-boxes-stacked"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Modify Asset Details" : "Register New Company Asset"}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {/* Row 1: Name & Code */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Asset Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                            placeholder="e.g. MacBook Pro M2"
                                            required
                                        />
                                        {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Asset Code <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={data.asset_code}
                                            onChange={e => setData('asset_code', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-indigo-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                            placeholder="e.g. AST-001"
                                            required
                                        />
                                        {errors.asset_code && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.asset_code}</p>}
                                    </div>
                                </div>

                                {/* Row 2: Serial & Condition */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Serial Number <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                                        <div className="relative">
                                            <i className="fa-solid fa-barcode absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.serial_number}
                                                onChange={e => setData('serial_number', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="e.g. C02XG..."
                                            />
                                        </div>
                                        {errors.serial_number && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.serial_number}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Condition <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                value={data.condition}
                                                onChange={e => setData('condition', e.target.value)}
                                                className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                                required
                                            >
                                                <option value="new">✨ New</option>
                                                <option value="good">👍 Good / Working</option>
                                                <option value="damaged">💥 Damaged</option>
                                                <option value="under_repair">🔧 Under Repair</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                        {errors.condition && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.condition}</p>}
                                    </div>
                                </div>

                                {/* Row 3: Financials */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={data.purchase_date}
                                            onChange={e => setData('purchase_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                        />
                                        {errors.purchase_date && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.purchase_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Purchase Price</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-[14px]">৳</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.purchase_price}
                                                onChange={e => setData('purchase_price', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-3 text-[15px] font-black text-blue-700 outline-none transition-shadow focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {errors.purchase_price && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.purchase_price}</p>}
                                    </div>
                                    <div className="md:col-span-2 relative z-[60]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Paid From Account <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                                        <SearchableSelect
                                            options={accounts.map(a => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                            value={data.account_id}
                                            onChange={(val) => setData("account_id", val)}
                                            placeholder="-- Select Payment Source --"
                                            error={errors.account_id}
                                            getValue={(a) => a.value}
                                            getLabel={(a) => a.label}
                                        />
                                        {errors.account_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                        <p className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                                            <i className="fa-solid fa-circle-info"></i> If selected, purchase price will be deducted from this account.
                                        </p>
                                    </div>
                                </div>

                                {/* Row 4: Assignment */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[50]">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Assigned Personnel</label>
                                        <SearchableSelect
                                            options={users}
                                            value={data.assigned_to}
                                            onChange={(val) => setData("assigned_to", val)}
                                            placeholder="-- Select Employee --"
                                            error={errors.assigned_to}
                                            getValue={(u) => u.id}
                                            getLabel={(u) => u.name}
                                        />
                                        {errors.assigned_to && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.assigned_to}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Assignment Date</label>
                                        <input
                                            type="date"
                                            value={data.assigned_date}
                                            onChange={e => setData('assigned_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                        />
                                        {errors.assigned_date && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.assigned_date}</p>}
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Asset" : "Save Asset"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}