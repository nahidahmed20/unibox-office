import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

// 🟢 Custom Premium Dropdown (Fixes react-select issues perfectly)
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, error, disabled }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setOpen(false); setSearch(""); } }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) => getLabel(opt).toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3.5 text-[14px] font-bold outline-none transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 border-gray-200 text-gray-400' : 'bg-white hover:border-indigo-400'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-sm'} ${selected && !disabled ? 'text-gray-900' : 'text-gray-500'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] left-0 flex max-h-[260px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl z-[99999] animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-gray-100 bg-gray-50 p-3 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search account..." className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                    <div className="overflow-y-auto py-1.5 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-gray-400 font-bold">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-5 py-3 text-[13.5px] font-bold transition-colors border-b border-gray-50 last:border-0 ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-indigo-50'}`}>
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

export default function Index({ vendors = { data: [], links: [] }, accounts = [], advances = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Pay Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedBillIds, setSelectedBillIds] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);

    // Wallet Modal State
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [walletAction, setWalletAction] = useState('deposit');

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || 25);

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', name: '', company_name: '', phone: '', address: '', opening_balance: 0
    });

    const payForm = useForm({
        project_expense_ids: [], payment_source: 'account', account_id: '', advance_user_id: '', adjustment_amount: '', pay_amount: '', bank_charge: '', date: new Date().toISOString().split('T')[0]
    });

    const walletForm = useForm({
        account_id: '', amount: '', profit_amount: '', description: '', bank_charge: '', date: new Date().toISOString().slice(0, 10)
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            params.per_page = perPage;

            router.get(route('admin.vendors.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!vendors.data || !vendors.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = vendors.data
            .map((v) => `${v.name}\t${v.company_name || "N/A"}\t${v.phone || "N/A"}\tDue: ${v.total_due || 0}\tWallet: ${v.wallet_balance || 0}`)
            .join("\n");
        navigator.clipboard.writeText("Name\tCompany\tPhone\tTotal Due\tWallet Balance\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!vendors.data || !vendors.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Vendor Name,Company,Phone,Address,Total Due,Wallet Balance\n"];
        const rows = vendors.data.map(v => `"${v.name}","${v.company_name || ''}","${v.phone || ''}","${v.address || ''}","${v.total_due || 0}","${v.wallet_balance || 0}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Vendors_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`<html><head><title>Vendors Report</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #1e293b; } h2 { text-align: center; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; } table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; } th, td { padding: 10px; border: 1px solid #cbd5e1; font-size: 12.5px; } th { background-color: #f8fafc; color: #475569; } .no-print { display: none !important; }</style></head><body><h2>Vendors Directory Report</h2>${tableContent.outerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const openCreateModal = () => { clearErrors(); setData({ id: '', name: '', company_name: '', phone: '', address: '', opening_balance: 0 }); setEditMode(false); setShowModal(true); };
    const openEditModal = (vendor) => { clearErrors(); setData({ id: vendor?.id || '', name: vendor?.name || '', company_name: vendor?.company_name || '', phone: vendor?.phone || '', address: vendor?.address || '', opening_balance: vendor?.opening_balance || 0 }); setEditMode(true); setShowModal(true); };

    const openPayModal = (vendor) => {
        const dueBills = vendor.project_expenses || vendor.projectExpenses || [];
        if (dueBills.length === 0) return Swal.fire("No Dues", "This vendor has no pending bills.", "info");
        setSelectedVendor(vendor); setSelectedBillIds([]); payForm.reset(); payForm.clearErrors(); setShowPayModal(true);
    };

    const openWalletModal = (vendor, action) => {
        const today = new Date();
        const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedVendor(vendor); setWalletAction(action);
        walletForm.setData({ account_id: '', amount: '', profit_amount: '', description: '', bank_charge: '', date: localDate });
        walletForm.clearErrors(); setShowWalletModal(true);
    };

    const handleUndoAdvance = (vendorId) => {
        Swal.fire({
            title: 'Undo Last Advance?', text: 'আপনি কি নিশ্চিত যে সর্বশেষ দেওয়া অ্যাডভান্সটি বাতিল করবেন?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Undo It', confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.vendors.add-advance', vendorId), { undo_last: true }, {
                    preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Undone!", text: "সর্বশেষ অ্যাডভান্স বাতিল হয়েছে।", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const handleDeleteClick = (vendor) => {
        if (Number(vendor.total_due) > 0 || Number(vendor.wallet_balance) > 0) {
            Swal.fire({ icon: 'error', title: 'Action Denied!', text: 'এই ভেন্ডরের নামে বকেয়া বা ব্যালেন্স থাকায় ডিলিট করা যাবে না।' });
            return;
        }
        Swal.fire({ title: 'Are you sure?', text: 'This vendor will be deleted permanently!', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Delete It', confirmButtonColor: '#ef4444' }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.vendors.destroy', vendor.id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }) });
            }
        });
    };

    const dueBillsList = selectedVendor ? (selectedVendor.project_expenses || selectedVendor.projectExpenses || []) : [];
    const selectedTotalDue = dueBillsList.filter(bill => selectedBillIds.includes(bill.id)).reduce((sum, bill) => sum + Number(bill.due_amount || 0), 0);

    const toggleBillSelect = (billId) => {
        setSelectedBillIds(prev => {
            const nextIds = prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId];
            const newTotalDue = dueBillsList.filter(bill => nextIds.includes(bill.id)).reduce((sum, bill) => sum + Number(bill.due_amount || 0), 0);
            payForm.setData("pay_amount", newTotalDue > 0 ? newTotalDue : '');
            return nextIds;
        });
    };

    const toggleSelectAllBills = () => {
        const nextIds = selectedBillIds.length === dueBillsList.length ? [] : dueBillsList.map(b => b.id);
        setSelectedBillIds(nextIds);
        const newTotalDue = dueBillsList.filter(bill => nextIds.includes(bill.id)).reduce((sum, bill) => sum + Number(bill.due_amount || 0), 0);
        payForm.setData("pay_amount", newTotalDue > 0 ? newTotalDue : '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) put(route('admin.vendors.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: "success", title: "Updated!", timer: 1500, showConfirmButton: false }); } });
        else post(route('admin.vendors.store'), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: "success", title: "Created!", timer: 1500, showConfirmButton: false }); } });
    };

    const handlePaySubmit = (e) => {
        e.preventDefault();
        if (selectedBillIds.length === 0) return Swal.fire("সিলেক্ট করুন", "অন্তত একটা বিল সিলেক্ট করতে হবে।", "warning");

        payForm.transform((formData) => ({ ...formData, project_expense_ids: selectedBillIds }));
        payForm.post(route('admin.vendors.pay', selectedVendor.id), {
            onSuccess: () => { setShowPayModal(false); setSelectedBillIds([]); Swal.fire({ icon: "success", title: "পেমেন্ট সফল হয়েছে!", timer: 1500, showConfirmButton: false }); },
            onError: (err) => { if (err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleWalletSubmit = (e) => {
        e.preventDefault();
        const routeName = walletAction === 'deposit' ? 'admin.vendors.add-advance' : 'admin.vendors.receive-refund';
        walletForm.post(route(routeName, selectedVendor.id), {
            onSuccess: () => { setShowWalletModal(false); Swal.fire({ icon: "success", title: "Wallet Updated!", timer: 1500, showConfirmButton: false }); },
            onError: (err) => { if (err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const listedTotalDue = (vendors.data || []).reduce((acc, curr) => acc + Number(curr.total_due || 0), 0);
    const listedTotalWallet = (vendors.data || []).reduce((acc, curr) => acc + Number(curr.wallet_balance || 0), 0);

    return (
        <AdminLayout>
            <Head title="Vendors Management" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12">
                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Supply Chain
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Vendors & Suppliers</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Manage your vendors, track payables, settle project bills, and maintain wallet balances.
                        </p>
                    </div>
                </div>

                {/* 🟢 Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200"><i className="fa-solid fa-truck-field text-[20px]"></i></div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Vendors Listed</p>
                                <h3 className="text-[26px] font-black text-gray-900 m-0 tracking-tight tabular-nums">{vendors?.total || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-200"><i className="fa-solid fa-hand-holding-dollar text-[20px]"></i></div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-rose-600/90">Total Payable (Due)</p>
                                <h3 className="text-[26px] font-black text-rose-700 m-0 tabular-nums tracking-tight"><Taka className="text-[18px] mr-1.5 opacity-80"/>{listedTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-purple-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-200"><i className="fa-solid fa-wallet text-[20px]"></i></div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-purple-600/90">Vendor Wallets (Adv)</p>
                                <h3 className="text-[26px] font-black text-purple-700 m-0 tabular-nums tracking-tight"><Taka className="text-[18px] mr-1.5 opacity-80"/>{listedTotalWallet.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fa-solid fa-truck-field text-[14px]"></i></div>
                            Vendor Directory
                        </div>
                        {hasPermission('create_vendor') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm"><i className="fa-solid fa-plus"></i> Add New Vendor</button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                            <input type="text" placeholder="Search by name, company, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Vendor Profile</th>
                                    <th className="px-6 py-4.5">Contact & Location</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/40">Total Payables (Due)</th>
                                    <th className="px-6 py-4.5 text-right bg-purple-50/40 border-r border-gray-100">Wallet (Advance)</th>
                                    <th className="px-6 py-4.5 text-center no-print w-64">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {vendors.data && vendors.data.length > 0 ? (
                                    vendors.data.map((vendor, index) => (
                                        <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400">{vendors.from ? vendors.from + index : index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[14px] font-extrabold uppercase shadow-sm">
                                                        {(vendor.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[14.5px]">{vendor.name}</div>
                                                        <div className="text-[12px] font-medium text-gray-500 mt-0.5 flex items-center gap-1.5"><i className="fa-regular fa-building opacity-70"></i>{vendor.company_name || <span className="italic text-gray-400">Individual</span>}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700 font-bold flex items-center gap-2 mb-1.5"><i className="fa-solid fa-phone text-[11px] text-gray-400"></i> {vendor.phone || <span className="text-gray-400 font-normal">-</span>}</div>
                                                <div className="text-[12.5px] text-gray-500 flex items-start gap-2 whitespace-normal max-w-[200px] leading-relaxed">
                                                    <i className="fa-solid fa-location-dot mt-0.5 text-[11px] text-gray-400 shrink-0"></i>{vendor.address ? (vendor.address.length > 30 ? vendor.address.substring(0, 30) + '...' : vendor.address) : <span className="text-gray-400">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors">
                                                {Number(vendor.total_due) > 0 ? (
                                                    <span className="font-black text-[15px] text-rose-600 tabular-nums"><Taka className="text-[13px] mr-1 opacity-80"/>{Number(vendor.total_due).toLocaleString('en-IN')}</span>
                                                ) : <span className="text-gray-300 font-medium">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right bg-purple-50/20 group-hover:bg-purple-50/40 transition-colors border-r border-gray-100">
                                                {Number(vendor.wallet_balance) > 0 ? (
                                                    <span className="inline-flex items-center font-bold text-purple-700 bg-white px-2.5 py-1.5 rounded-lg border border-purple-100 shadow-sm tabular-nums">
                                                        <i className="fa-solid fa-wallet text-[11px] mr-1.5 text-purple-400"></i>{Number(vendor.wallet_balance).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-gray-300 font-medium">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('view_pay_vendor') && <button onClick={() => openPayModal(vendor)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 transition-all shadow-sm" title="Pay Bills"><i className="fa-solid fa-money-bills text-[12.5px]"></i></button>}
                                                    {hasPermission('add_advance_vendor') && (
                                                        <>
                                                            <button onClick={() => openWalletModal(vendor, 'deposit')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white border border-indigo-200 transition-all shadow-sm" title="Add to Wallet"><i className="fa-solid fa-plus text-[12.5px]"></i></button>
                                                            <button onClick={() => handleUndoAdvance(vendor.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-rose-500 hover:text-white border border-gray-200 transition-all shadow-sm" title="Undo Last Advance (ভুল সংশোধন)"><i className="fa-solid fa-rotate-left text-[12.5px]"></i></button>
                                                        </>
                                                    )}
                                                    {hasPermission('return_advance_vendor') && <button onClick={() => openWalletModal(vendor, 'withdraw')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 transition-all shadow-sm" title="Refund from Wallet"><i className="fa-solid fa-minus text-[12.5px]"></i></button>}
                                                    {hasPermission('view_vendors') && <Link href={route('admin.vendors.show', vendor.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-200 transition-all shadow-sm" title="View Full Profile"><i className="fa-regular fa-address-card text-[13px]"></i></Link>}
                                                    {hasPermission('edit_vendor') && <button onClick={() => openEditModal(vendor)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-all shadow-sm" title="Edit Vendor"><i className="fa-regular fa-pen-to-square text-[13px]"></i></button>}
                                                    {hasPermission('delete_vendor') && <button onClick={() => handleDeleteClick(vendor)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 transition-all shadow-sm" title="Delete Vendor"><i className="fa-regular fa-trash-can text-[13px]"></i></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4"><i className="fa-solid fa-truck-slash text-2xl text-gray-400"></i></div>
                                                <p className="text-[15px] font-bold text-gray-700">No vendors found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {vendors.links && vendors.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">{vendors.total > 0 && `Showing ${vendors.from || 0} to ${vendors.to || 0} of ${vendors.total || 0} entries`}</div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {vendors.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}`} preserveState dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                {editMode ? <><i className="fa-regular fa-pen-to-square text-indigo-600"></i> Modify Vendor Details</> : <><i className="fa-solid fa-truck-fast text-indigo-600"></i> Register New Vendor</>}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Vendor Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="e.g. Rahim Miah" required className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                                        </div>
                                        {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Company / Business Name</label>
                                        <div className="relative">
                                            <i className="fa-regular fa-building absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input type="text" value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} placeholder="e.g. Rahim Printing Press" className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
                                        <div className="relative">
                                            <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input type="text" value={data.phone} onChange={(e) => setData("phone", e.target.value)} placeholder="017..." className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Opening Balance (Due)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[14px]">৳</span>
                                            <input type="number" step="0.01" value={data.opening_balance} onChange={(e) => setData("opening_balance", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white" />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Physical Address</label>
                                        <textarea value={data.address} onChange={(e) => setData("address", e.target.value)} placeholder="Enter full address here..." rows="3" className="w-full rounded-xl border border-gray-300 p-4 text-[14px] font-medium text-gray-900 outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100 shadow-sm">Cancel</button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Vendor" : "Save Vendor"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 💎 PAY VENDOR MODAL --- */}
            {showPayModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/70 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-[800px] bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[scaleIn_0.2s_ease-out]">

                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white shrink-0">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 flex items-center gap-2.5">
                                    <div className="h-10 w-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full border border-emerald-200 shadow-inner">
                                        <i className="fa-solid fa-money-check-dollar"></i>
                                    </div>
                                    Settle Vendor Bills
                                </h3>
                                <p className="text-[13px] font-bold text-gray-500 mt-1.5 flex items-center gap-1.5">
                                    <i className="fa-solid fa-truck-field"></i> Vendor: <span className="text-indigo-600">{selectedVendor.name}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-10 w-10 rounded-full flex items-center justify-center transition-colors border border-gray-200 shadow-sm">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handlePaySubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {/* BILLS SELECTION SECTION */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between mb-4 border-b border-gray-100 pb-4 gap-3">
                                        <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                                            <i className="fa-solid fa-list-check text-indigo-500"></i> Select Pending Bills <span className="text-red-500">*</span>
                                        </h4>
                                        <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200 select-none shadow-sm">
                                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer" checked={dueBillsList.length > 0 && selectedBillIds.length === dueBillsList.length} onChange={toggleSelectAllBills} />
                                            Select All Bills
                                        </label>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 max-h-[200px] overflow-y-auto custom-table-scroll">
                                        {dueBillsList.length === 0 ? (
                                            <div className="p-8 text-center text-[13.5px] font-bold text-gray-500 flex flex-col items-center gap-2">
                                                <i className="fa-regular fa-face-smile text-3xl text-gray-300"></i> No pending bills found.
                                            </div>
                                        ) : (
                                            dueBillsList.map(bill => (
                                                <label key={bill.id} className={`flex cursor-pointer items-center justify-between border-b border-gray-200 px-5 py-4 transition-colors last:border-0 select-none ${selectedBillIds.includes(bill.id) ? 'bg-indigo-50/70 border-l-4 border-l-indigo-500' : 'hover:bg-white border-l-4 border-l-transparent'}`}>
                                                    <span className="flex items-center gap-3.5">
                                                        <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer shadow-sm" checked={selectedBillIds.includes(bill.id)} onChange={() => toggleBillSelect(bill.id)} />
                                                        <div>
                                                            <div className="font-extrabold text-gray-800 text-[14.5px]">{bill.title}</div>
                                                            {bill.project && <div className="text-[11.5px] font-bold text-gray-500 mt-0.5"><i className="fa-regular fa-folder-open"></i> {bill.project.title}</div>}
                                                        </div>
                                                    </span>
                                                    <span className="font-black text-rose-600 text-[15px] bg-white px-3 py-1.5 rounded-lg border border-red-100 shadow-sm tabular-nums">
                                                        <Taka className="text-[12px]"/> {Number(bill.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {selectedBillIds.length > 0 && (
                                        <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 p-4 flex items-center justify-between shadow-sm animate-[fadeIn_0.2s_ease-out]">
                                            <span className="flex items-center gap-2 text-[13.5px] font-bold text-indigo-800">
                                                <i className="fa-solid fa-check-double text-indigo-500"></i> {selectedBillIds.length} Bills Selected
                                            </span>
                                            <span className="text-[18px] font-black text-indigo-900 tabular-nums bg-white px-3 py-1 rounded border border-indigo-100 shadow-sm">
                                                Total Due: <Taka className="text-[15px]"/> {selectedTotalDue.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                    {payForm.errors.project_expense_ids && <span className="mt-2 block text-[12px] font-bold text-red-500">{payForm.errors.project_expense_ids}</span>}
                                </div>

                                {/* PAYMENT DETAILS SECTION */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <div className="mb-6 border-b border-gray-100 pb-6">
                                        <label className="block text-[12px] font-black text-gray-500 uppercase tracking-widest mb-3">Payment Source <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'account' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-[1.02]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="radio" name="payment_source" value="account" checked={payForm.data.payment_source === 'account'} onChange={() => { payForm.setData("payment_source", "account"); payForm.setData("advance_user_id", ""); }} className="hidden" />
                                                <i className="fa-solid fa-building-columns text-[24px]"></i>
                                                <span className="text-[13px] font-black uppercase tracking-wider mt-1">Bank / Cash</span>
                                            </label>
                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'advance' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-[1.02]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="radio" name="payment_source" value="advance" checked={payForm.data.payment_source === 'advance'} onChange={() => { payForm.setData("payment_source", "advance"); payForm.setData("account_id", ""); payForm.setData("bank_charge", ""); }} className="hidden" />
                                                <i className="fa-solid fa-user-tie text-[24px]"></i>
                                                <span className="text-[13px] font-black uppercase tracking-wider mt-1 text-center leading-tight">Employee<br/>Advance</span>
                                            </label>
                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'wallet' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm scale-[1.02]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="radio" name="payment_source" value="wallet" checked={payForm.data.payment_source === 'wallet'} onChange={() => payForm.setData({ ...payForm.data, payment_source: 'wallet', account_id: '', advance_user_id: '', bank_charge: '', pay_amount: Math.min(selectedTotalDue, Number(selectedVendor.wallet_balance || 0)) })} className="hidden" />
                                                <i className="fa-solid fa-wallet text-[24px]"></i>
                                                <span className="text-[13px] font-black uppercase tracking-wider mt-1 text-center leading-tight">Vendor<br/>Advance</span>
                                            </label>
                                        </div>
                                        {payForm.errors.payment_source && <p className="text-red-600 text-sm font-bold mt-2">{payForm.errors.payment_source}</p>}
                                    </div>

                                    {/* Dynamic Source Selection */}
                                    <div className="mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        {payForm.data.payment_source === 'wallet' ? (
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-piggy-bank"></i></div>
                                                <div>
                                                    <h4 className="text-[15px] font-black text-purple-900 mb-1">Using Vendor Advance (Wallet)</h4>
                                                    <p className="text-[13px] font-semibold text-purple-700/80 leading-relaxed">No bank debit will occur. Settle bills using the existing advance.</p>
                                                    <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm">
                                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Available Balance:</span>
                                                        <span className="text-[15px] font-black text-purple-700 tabular-nums">৳ {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : payForm.data.payment_source === 'account' ? (
                                            <>
                                                <label className="block text-[12px] font-black text-gray-600 uppercase tracking-widest mb-2.5">Select Deposit Account <span className="text-red-500">*</span></label>
                                                {/* 🟢 SearchableSelect (Fixes react-select clipping/z-index issues completely) */}
                                                <SearchableSelect
                                                    options={accounts}
                                                    value={payForm.data.account_id}
                                                    onChange={(val) => payForm.setData("account_id", val)}
                                                    placeholder="-- Click to search & select account --"
                                                    getValue={(acc) => acc.id}
                                                    getLabel={(acc) => `${acc.name} (Bal: ৳ ${Number(acc.current_balance).toLocaleString('en-IN')})`}
                                                    error={payForm.errors.account_id}
                                                />
                                                {payForm.errors.account_id && <span className="mt-1.5 block text-[12px] font-bold text-red-500">{payForm.errors.account_id}</span>}
                                            </>
                                        ) : (
                                            <>
                                                <label className="block text-[12px] font-black text-gray-600 uppercase tracking-widest mb-2.5">Select Employee (Staff) <span className="text-red-500">*</span></label>
                                                <SearchableSelect
                                                    options={advances}
                                                    value={payForm.data.advance_user_id}
                                                    onChange={(val) => payForm.setData("advance_user_id", val)}
                                                    placeholder="-- Click to search & select employee --"
                                                    getValue={(adv) => adv.user_id}
                                                    getLabel={(adv) => `${adv.user?.name} (Avail: ৳ ${Number(adv.available_balance).toLocaleString('en-IN')})`}
                                                    error={payForm.errors.advance_user_id}
                                                />
                                                {payForm.errors.advance_user_id && <span className="mt-1.5 block text-[12px] font-bold text-red-500">{payForm.errors.advance_user_id}</span>}
                                            </>
                                        )}
                                    </div>

                                    {/* Amounts & Date */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-emerald-600 uppercase tracking-widest mb-2">Pay Amount <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">৳</span>
                                                <input type="number" step="0.01" min="0" value={payForm.data.pay_amount} onChange={e => payForm.setData("pay_amount", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-9 pr-4 py-3.5 text-[16px] font-black text-emerald-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 shadow-sm transition-all" required={!payForm.data.adjustment_amount} />
                                            </div>
                                            {payForm.errors.pay_amount && <span className="mt-1.5 block text-[11.5px] font-bold text-red-500">{payForm.errors.pay_amount}</span>}
                                        </div>
                                        <div>
                                            <label className="block text-[11.5px] font-black text-amber-600 uppercase tracking-widest mb-2">Discount / Adjust</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 font-bold">৳</span>
                                                <input type="number" step="0.01" min="0" value={payForm.data.adjustment_amount} onChange={e => payForm.setData("adjustment_amount", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-amber-300 bg-amber-50/30 pl-9 pr-4 py-3.5 text-[16px] font-bold text-amber-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-sm transition-all" />
                                            </div>
                                            {payForm.errors.adjustment_amount && <span className="mt-1.5 block text-[11.5px] font-bold text-red-500">{payForm.errors.adjustment_amount}</span>}
                                        </div>
                                        <div>
                                            <label className="block text-[11.5px] font-black text-gray-500 uppercase tracking-widest mb-2">Payment Date <span className="text-red-500">*</span></label>
                                            <input type="date" value={payForm.data.date} onChange={e => payForm.setData("date", e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm transition-all" required />
                                        </div>
                                    </div>

                                    {/* Final Summary Banner */}
                                    <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50 flex justify-between items-center shadow-sm">
                                        <span className="font-black text-indigo-800 text-[14.5px] flex items-center gap-2 uppercase tracking-wider">
                                            <i className="fa-solid fa-calculator text-[20px]"></i> Total Settlement:
                                        </span>
                                        <span className="font-black text-indigo-900 text-[24px] bg-white px-4 py-1.5 rounded-xl border border-indigo-200 tabular-nums shadow-sm">
                                            ৳ {(Number(payForm.data.pay_amount || 0) + Number(payForm.data.adjustment_amount || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>

                                    <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-[13px] text-sky-800 flex items-start gap-3 shadow-sm font-semibold">
                                        <i className="fa-solid fa-circle-info mt-0.5 text-sky-600 text-[18px] shrink-0"></i>
                                        <p className="m-0 leading-relaxed">
                                            টাকাটা সিলেক্ট করা বিলগুলোর মধ্যে পুরনো বিল আগে ধরে ক্রমান্বয়ে সেটেল হবে। বকেয়ার চেয়ে বেশি দিলে বাড়তি অংশ স্বয়ংক্রিয়ভাবে ভেন্ডরের ওয়ালেটে জমা (Advance) হয়ে যাবে।
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 md:px-8 py-5 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-4 shrink-0 rounded-b-3xl">
                                {payForm.data.payment_source === 'account' && (
                                    <div className="mr-auto">
                                        <label className="text-[11.5px] font-black uppercase tracking-wider text-rose-500 block mb-1.5">Bank Charge (If Any)</label>
                                        <div className="relative">
                                            <i className="fa-solid fa-building-columns absolute left-3 top-1/2 -translate-y-1/2 text-rose-300 text-[12px]"></i>
                                            <input type="number" min="0" step="0.01" value={payForm.data.bank_charge || ''} onChange={e => payForm.setData('bank_charge', e.target.value)} className="w-32 rounded-lg border-rose-300 bg-white pl-8 pr-3 py-2 text-[13px] font-bold text-rose-700 focus:ring-rose-500 focus:border-rose-500 shadow-sm" placeholder="0.00"/>
                                        </div>
                                    </div>
                                )}
                                <button type="button" onClick={() => setShowPayModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={payForm.processing} className="rounded-xl bg-emerald-600 px-8 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-emerald-700 shadow-md disabled:opacity-70 flex items-center gap-2 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">
                                    {payForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm Payment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 💎 PREMIUM VENDOR WALLET MODAL (Deposit & Withdraw) --- */}
            {showWalletModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className={`flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100 shrink-0 ${walletAction === 'deposit' ? 'bg-gradient-to-r from-indigo-50 to-white' : 'bg-gradient-to-r from-emerald-50 to-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shadow-inner ${walletAction === 'deposit' ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                                    <i className={`fa-solid text-lg sm:text-xl ${walletAction === 'deposit' ? 'fa-wallet' : 'fa-hand-holding-dollar'}`}></i>
                                </div>
                                <div>
                                    <h3 className={`text-[18px] sm:text-[20px] font-black tracking-tight leading-tight ${walletAction === 'deposit' ? 'text-indigo-900' : 'text-emerald-900'}`}>
                                        {walletAction === 'deposit' ? 'Add Advance to Wallet' : 'Refund from Wallet'}
                                    </h3>
                                    <p className="text-[12px] sm:text-[13px] font-medium text-gray-500 mt-0.5">
                                        {walletAction === 'deposit' ? 'Log cash sent to vendor' : 'Log cash received back'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowWalletModal(false)} className="text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-sm">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="px-6 py-4 sm:px-8 sm:py-4 bg-gray-50/80 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 text-[13.5px] sm:text-[14.5px] font-bold text-gray-800">
                                <i className="fa-solid fa-truck-field text-indigo-400 text-lg"></i>
                                <span className="truncate">{selectedVendor.name}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-xl border border-purple-200 shadow-sm w-max">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Balance:</span>
                                <span className="text-[14px] sm:text-[15px] font-black text-purple-800 tabular-nums">৳ {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <form onSubmit={handleWalletSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-5 sm:p-8 overflow-y-auto custom-table-scroll flex flex-col gap-5 sm:gap-6 bg-white">
                                {Object.keys(walletForm.errors).length > 0 && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700 shadow-sm flex items-start gap-2.5">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                        <div>{Object.values(walletForm.errors).join(' ')}</div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                                    <div className="sm:col-span-2 bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            {walletAction === 'deposit' ? 'Date Paid to Vendor' : 'Date Refund Received'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date" required value={walletForm.data.date} onChange={e => walletForm.setData('date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm cursor-pointer"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            {walletAction === 'deposit' ? 'Pay From Account' : 'Receive To Account'} <span className="text-red-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            options={accounts}
                                            value={walletForm.data.account_id}
                                            onChange={(val) => walletForm.setData("account_id", val)}
                                            placeholder="-- Click to search & select account --"
                                            getValue={(acc) => acc.id}
                                            getLabel={(acc) => `${acc.name} (Bal: ৳ ${Number(acc.current_balance).toLocaleString('en-IN')})`}
                                            error={walletForm.errors.account_id}
                                        />
                                        {walletForm.errors.account_id && <span className="mt-1.5 block text-[12px] font-bold text-red-500">{walletForm.errors.account_id}</span>}
                                    </div>

                                    <div>
                                        <label className={`block text-[12px] font-bold uppercase tracking-wider mb-2 ${walletAction === 'deposit' ? 'text-indigo-600' : 'text-emerald-600'}`}>Amount (৳) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <i className={`fa-solid fa-bangladeshi-taka-sign absolute left-4 top-1/2 -translate-y-1/2 text-[15px] ${walletAction === 'deposit' ? 'text-indigo-500' : 'text-emerald-500'}`}></i>
                                            <input type="number" step="0.01" min="1" value={walletForm.data.amount} onChange={e => walletForm.setData("amount", e.target.value)} placeholder="0.00" className={`w-full rounded-xl border pl-10 pr-4 py-3.5 text-[16px] sm:text-[18px] font-black outline-none transition-all shadow-sm ${walletAction === 'deposit' ? 'border-indigo-300 bg-indigo-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-indigo-900' : 'border-emerald-300 bg-emerald-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-900'}`} required />
                                        </div>
                                    </div>

                                    {walletAction === 'deposit' && (
                                        <div>
                                            <label className="block text-[12px] font-bold text-rose-500 uppercase tracking-wider mb-2">Bank Charge (৳)</label>
                                            <div className="relative">
                                                <i className="fa-solid fa-building-columns absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 text-[13px]"></i>
                                                <input type="number" min="0" step="0.01" value={walletForm.data.bank_charge} onChange={e => walletForm.setData('bank_charge', e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3.5 text-[15px] font-bold text-rose-700 outline-none transition-shadow focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 shadow-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {walletAction === 'withdraw' && (
                                        <div className="sm:col-span-2 bg-purple-50/50 p-4 sm:p-5 rounded-2xl border border-purple-100">
                                            <label className="block text-[12px] font-bold text-purple-700 uppercase tracking-wider mb-2">Extra Profit / Commission (৳)</label>
                                            <div className="relative">
                                                <i className="fa-solid fa-arrow-trend-up absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"></i>
                                                <input type="number" step="0.01" min="0" value={walletForm.data.profit_amount} onChange={e => walletForm.setData("profit_amount", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-purple-300 bg-white px-4 pl-10 py-3.5 text-[16px] font-black outline-none transition-shadow shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-purple-900" />
                                            </div>
                                            <p className="text-[11.5px] text-purple-600/80 mt-2 font-semibold"><i className="fa-solid fa-circle-info mr-1"></i> ভেন্ডর যদি মূল অ্যাডভান্সের চেয়ে বেশি (লাভ) ফেরত দেয়, তবে তা এখানে লিখুন।</p>
                                        </div>
                                    )}

                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Note / Description</label>
                                        <textarea value={walletForm.data.description} onChange={e => walletForm.setData("description", e.target.value)} placeholder={walletAction === 'deposit' ? 'e.g., Advance for future work' : 'e.g., Refund for cancelled work'} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-medium text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm resize-none" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowWalletModal(false)} className="rounded-xl border border-gray-300 bg-white px-5 sm:px-6 py-2.5 text-[13.5px] sm:text-[14px] font-bold text-gray-700 hover:bg-gray-100 shadow-sm">Cancel</button>
                                <button type="submit" disabled={walletForm.processing} className={`rounded-xl px-6 sm:px-8 py-2.5 text-[13.5px] sm:text-[14px] font-bold text-white transition-all shadow-md disabled:opacity-70 flex items-center gap-2 ${walletAction === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                    {walletForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm Transaction</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
