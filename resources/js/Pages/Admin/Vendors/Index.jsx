import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import TableExportButtons from '@/Components/TableExportButtons';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

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
        payment_source: 'account', account_id: '', advance_user_id: '', amount: '', profit_amount: '', description: '', bank_charge: '', date: new Date().toISOString().slice(0, 10)
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

    const vendorList = Array.isArray(vendors) ? vendors : (vendors?.data || []);
    const exportHeaders = ['SL', 'Vendor Name', 'Company', 'Phone', 'Address', 'Total Due (৳)', 'Wallet Balance (৳)', 'Net Payable (৳)'];
    const exportRows = useMemo(() => {
        return vendorList.map((v, idx) => [
            idx + 1,
            v.name || '',
            v.company_name || 'Individual',
            v.phone || '-',
            v.address || '-',
            parseFloat(v.total_due || 0).toFixed(2),
            parseFloat(v.wallet_balance || 0).toFixed(2),
            parseFloat(v.net_due || 0).toFixed(2)
        ]);
    }, [vendorList]);

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
        walletForm.setData({ payment_source: 'account', account_id: '', advance_user_id: '', amount: '', profit_amount: '', description: '', bank_charge: '', date: localDate });
        walletForm.clearErrors(); setShowWalletModal(true);
    };

    const handleUndoAdvance = (vendorId) => {
        Swal.fire({
            title: 'Undo Last Advance?', text: 'Are you sure you want to undo the last advance payment?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Undo It', confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.vendors.add-advance', vendorId), { undo_last: true }, {
                    preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Undone!", text: "Last advance payment has been undone.", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const handleDeleteClick = (vendor) => {
        if (Number(vendor.total_due) > 0 || Number(vendor.wallet_balance) > 0) {
            Swal.fire({ icon: 'error', title: 'Action Denied!', text: 'Cannot delete vendor with outstanding dues or wallet balance.' });
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
        if (selectedBillIds.length === 0) return Swal.fire("Required", "Please select at least one bill.", "warning");

        payForm.transform((formData) => ({ ...formData, project_expense_ids: selectedBillIds }));
        payForm.post(route('admin.vendors.pay', selectedVendor.id), {
            onSuccess: () => { setShowPayModal(false); setSelectedBillIds([]); Swal.fire({ icon: "success", title: "Payment Recorded Successfully!", timer: 1500, showConfirmButton: false }); },
            onError: (err) => { if (err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleWalletSubmit = (e) => {
        e.preventDefault();
        if (walletAction === 'deposit' && walletForm.data.payment_source === 'advance') {
            if (!walletForm.data.advance_user_id) {
                return Swal.fire("Required", "Please select an employee holding advance balance.", "warning");
            }
            const staffAdv = advances.find(a => String(a.user_id) === String(walletForm.data.advance_user_id));
            if (!staffAdv || Number(walletForm.data.amount) > Number(staffAdv.available_balance || 0)) {
                return Swal.fire("Insufficient Balance", `Selected staff only has ৳ ${Number(staffAdv?.available_balance || 0).toLocaleString('en-IN')} available advance.`, "error");
            }
        }

        const routeName = walletAction === 'deposit' ? 'admin.vendors.add-advance' : 'admin.vendors.receive-refund';
        walletForm.post(route(routeName, selectedVendor.id), {
            onSuccess: () => { setShowWalletModal(false); Swal.fire({ icon: "success", title: "Wallet Updated!", timer: 1500, showConfirmButton: false }); },
            onError: (err) => { if (err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const listedTotalDue = (vendors.data || []).reduce((acc, curr) => acc + Number(curr.total_due || 0), 0);
    const listedTotalWallet = (vendors.data || []).reduce((acc, curr) => acc + Number(curr.wallet_balance || 0), 0);
    const listedTotalNetDue = (vendors.data || []).reduce((acc, curr) => acc + Number(curr.net_due || 0), 0);

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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="relative flex items-center gap-5">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200"><i className="fa-solid fa-scale-balanced text-[20px]"></i></div>
                                <div>
                                    <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-emerald-700">Net Payable after Advance</p>
                                    <h3 className="text-[26px] font-black text-emerald-800 m-0 tabular-nums tracking-tight"><Taka className="text-[18px] mr-1.5 opacity-80"/>{listedTotalNetDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
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
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename="Vendors_Report"
                                title="Vendors & Suppliers Directory"
                            />
                        </div>

                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                            <input type="text" placeholder="Search by name, company, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1250px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Vendor Profile</th>
                                    <th className="px-6 py-4.5">Contact & Location</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/40">Total Payables (Due)</th>
                                    <th className="px-6 py-4.5 text-right bg-purple-50/40 border-r border-gray-100">Wallet (Advance)</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/40">Net Payable</th>
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
                                            <td className="px-6 py-4 text-right font-black text-emerald-700 tabular-nums bg-emerald-50/20">
                                                <Taka />{Number(vendor.net_due || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('view_pay_vendor') && <button onClick={() => openPayModal(vendor)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 transition-all shadow-sm" title="Pay Bills"><i className="fa-solid fa-money-bills text-[12.5px]"></i></button>}
                                                    {hasPermission('add_advance_vendor') && (
                                                        <>
                                                            <button onClick={() => openWalletModal(vendor, 'deposit')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white border border-indigo-200 transition-all shadow-sm" title="Add to Wallet"><i className="fa-solid fa-plus text-[12.5px]"></i></button>
                                                            <button onClick={() => handleUndoAdvance(vendor.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-rose-500 hover:text-white border border-gray-200 transition-all shadow-sm" title="Undo Last Advance"><i className="fa-solid fa-rotate-left text-[12.5px]"></i></button>
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
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-500">
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

            {/* --- 💎 EXECUTIVE CREATE / EDIT VENDOR MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl lg:max-w-3xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-800 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-truck-fast'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-address-book"></i> {editMode ? 'Vendor Profile Management' : 'Vendor Onboarding'}
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {editMode ? 'Modify Vendor Profile' : 'Register New Vendor'}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            {editMode
                                                ? 'Update company credentials, contact information and initial balance'
                                                : 'Add a supplier, subcontractor or service provider to track payables and ledgers'}
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

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50">
                                
                                {/* 1. BUSINESS & CONTACT IDENTITY CARD */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                                        <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            <i className="fa-solid fa-id-card"></i>
                                        </div>
                                        <h4 className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider">
                                            Basic & Business Identity
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Vendor / Contact Person <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) => setData("name", e.target.value)}
                                                    placeholder="e.g. Rahim Miah"
                                                    required
                                                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:ring-4 focus:ring-indigo-600/10 ${
                                                        errors.name
                                                            ? 'border-red-400 bg-red-50/20 focus:border-red-500'
                                                            : 'border-slate-300 bg-white focus:border-indigo-600'
                                                    }`}
                                                />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Company / Business Name
                                            </label>
                                            <div className="relative">
                                                <i className="fa-regular fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.company_name}
                                                    onChange={(e) => setData("company_name", e.target.value)}
                                                    placeholder="e.g. Rahim Printing Press"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.phone}
                                                    onChange={(e) => setData("phone", e.target.value)}
                                                    placeholder="e.g. 017xxxxxxxx"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.phone}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Opening Due Balance (৳)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[15px]">৳</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={data.opening_balance}
                                                    onChange={(e) => setData("opening_balance", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 tabular-nums"
                                                />
                                            </div>
                                            {errors.opening_balance && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.opening_balance}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                            Physical / Workshop Address
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                value={data.address}
                                                onChange={(e) => setData("address", e.target.value)}
                                                placeholder="Enter vendor's full physical office or workshop address..."
                                                rows="2"
                                                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-[13.5px] font-medium text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 resize-none"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* HELPER ADVISORY NOTE */}
                                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
                                    <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm shadow-sm mt-0.5">
                                        <i className="fa-solid fa-circle-info"></i>
                                    </div>
                                    <div className="text-[12px] font-medium text-indigo-950 leading-relaxed">
                                        <p className="font-bold text-indigo-900 text-[12.5px] mb-0.5">Vendor Ledger & Balance Integration</p>
                                        Any opening due balance provided here will be automatically registered in the vendor statement. Future project bills, advances, and settlements will automatically link to this vendor profile.
                                    </div>
                                </div>

                            </div>

                            {/* FOOTER */}
                            <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-8 py-3 text-[14px] font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
                                >
                                    {processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                                    ) : (
                                        <><i className="fa-solid fa-check"></i> {editMode ? "Update Vendor" : "Save Vendor"}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 💎 PROFESSIONAL SETTLE VENDOR BILLS MODAL --- */}
            {showPayModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-5 md:p-8">
                    <div className="w-full max-w-4xl bg-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-700/30 animate-[scaleIn_0.2s_ease-out]">

                        {/* EXECUTIVE HEADER */}
                        <div className="shrink-0 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-700 bg-slate-900 relative overflow-hidden text-white">
                            <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>

                            <div className="relative z-10 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                    <i className="fa-solid fa-file-invoice-dollar"></i>
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                        <i className="fa-solid fa-hand-holding-dollar"></i> Bill Settlement
                                    </div>
                                    <h3 className="text-[19px] sm:text-[23px] font-black text-white tracking-tight leading-tight">
                                        Settle Vendor Bills
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 text-[12px] sm:text-[13px] font-bold text-slate-400 mt-1">
                                        <span className="text-white"><i className="fa-solid fa-truck-field text-emerald-400 mr-1.5"></i>{selectedVendor.name} {selectedVendor.company_name ? `(${selectedVendor.company_name})` : ''}</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md text-[11.5px]">
                                            Advance Available: ৳ {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handlePaySubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8 space-y-6">

                                {/* 1. PENDING BILLS SELECTION */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-200 pb-3.5 gap-3">
                                        <h4 className="text-[13px] sm:text-[14px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <i className="fa-solid fa-list-check text-indigo-600"></i> Select Pending Bills <span className="text-rose-500">*</span>
                                        </h4>
                                        <label className="flex items-center gap-2 cursor-pointer text-[12px] font-black uppercase tracking-wider text-indigo-700 hover:bg-indigo-100 transition-colors bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200 select-none shadow-xs">
                                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" checked={dueBillsList.length > 0 && selectedBillIds.length === dueBillsList.length} onChange={toggleSelectAllBills} />
                                            Select All ({dueBillsList.length})
                                        </label>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 max-h-[220px] overflow-y-auto custom-table-scroll divide-y divide-slate-200">
                                        {dueBillsList.length === 0 ? (
                                            <div className="p-8 text-center text-[13.5px] font-bold text-slate-400 flex flex-col items-center gap-2">
                                                <i className="fa-regular fa-face-smile text-3xl text-slate-300"></i> No pending bills found for this vendor.
                                            </div>
                                        ) : (
                                            dueBillsList.map(bill => (
                                                <label key={bill.id} className={`flex cursor-pointer items-center justify-between p-3.5 sm:p-4 transition-all select-none ${selectedBillIds.includes(bill.id) ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600' : 'hover:bg-white border-l-4 border-l-transparent'}`}>
                                                    <span className="flex items-center gap-3.5 min-w-0 pr-3">
                                                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer shadow-xs shrink-0" checked={selectedBillIds.includes(bill.id)} onChange={() => toggleBillSelect(bill.id)} />
                                                        <div className="min-w-0">
                                                            <div className="font-extrabold text-slate-900 text-[13.5px] sm:text-[14.5px] truncate">{bill.title}</div>
                                                            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-[12px] font-bold text-slate-500 mt-1">
                                                                {bill.project && <span className="text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded"><i className="fa-regular fa-folder-open mr-1"></i>{bill.project.title}</span>}
                                                                <span><i className="fa-regular fa-calendar text-slate-400 mr-1"></i>{formatDateDisplay(bill.date)}</span>
                                                            </div>
                                                        </div>
                                                    </span>
                                                    <span className="font-black text-rose-600 text-[14px] sm:text-[15px] bg-white px-3 py-1.5 rounded-lg border border-rose-200 shadow-xs tabular-nums shrink-0">
                                                        <Taka className="text-[12px] text-rose-500"/> {Number(bill.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {selectedBillIds.length > 0 && (
                                        <div className="mt-4 rounded-xl bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-[fadeIn_0.2s_ease-out]">
                                            <span className="flex items-center gap-2 text-[13px] sm:text-[14px] font-black text-indigo-900">
                                                <i className="fa-solid fa-check-double text-indigo-600"></i> {selectedBillIds.length} Bills Selected
                                            </span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-slate-900 tabular-nums bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-xs">
                                                Total Selected Due: <Taka className="text-[14px] text-rose-500"/> {selectedTotalDue.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                    {payForm.errors.project_expense_ids && <span className="mt-2 block text-[12px] font-bold text-red-600">{payForm.errors.project_expense_ids}</span>}
                                </div>

                                {/* 2. PAYMENT CONFIGURATION */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
                                    <div className="mb-6 border-b border-slate-200 pb-5">
                                        <label className="block text-[11.5px] sm:text-[12px] font-black text-slate-600 uppercase tracking-widest mb-3">
                                            Payment Source <span className="text-red-600">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'account' ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'}`}>
                                                <input type="radio" name="payment_source" value="account" checked={payForm.data.payment_source === 'account'} onChange={() => { payForm.setData("payment_source", "account"); payForm.setData("advance_user_id", ""); }} className="hidden" />
                                                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg"><i className="fa-solid fa-building-columns"></i></div>
                                                <span className="text-[13px] font-black uppercase tracking-wider text-center">Bank / Cash</span>
                                                <span className="text-[11px] font-bold text-slate-500 -mt-1">Direct company account</span>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'advance' ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'}`}>
                                                <input type="radio" name="payment_source" value="advance" checked={payForm.data.payment_source === 'advance'} onChange={() => { payForm.setData("payment_source", "advance"); payForm.setData("account_id", ""); payForm.setData("bank_charge", ""); }} className="hidden" />
                                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg"><i className="fa-solid fa-user-tie"></i></div>
                                                <span className="text-[13px] font-black uppercase tracking-wider text-center">Staff Advance</span>
                                                <span className="text-[11px] font-bold text-slate-500 -mt-1">Adjust staff balance</span>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 border-2 rounded-2xl select-none ${payForm.data.payment_source === 'wallet' ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-md ring-2 ring-purple-500/20' : 'border-slate-300 bg-white text-slate-700 hover:border-purple-400'}`}>
                                                <input type="radio" name="payment_source" value="wallet" checked={payForm.data.payment_source === 'wallet'} onChange={() => payForm.setData({ ...payForm.data, payment_source: 'wallet', account_id: '', advance_user_id: '', bank_charge: '', pay_amount: Math.min(selectedTotalDue, Number(selectedVendor.wallet_balance || 0)) })} className="hidden" />
                                                <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg"><i className="fa-solid fa-wallet"></i></div>
                                                <span className="text-[13px] font-black uppercase tracking-wider text-center">Vendor Advance</span>
                                                <span className="text-[11px] font-bold text-purple-600 -mt-1">Use existing wallet</span>
                                            </label>
                                        </div>
                                        {payForm.errors.payment_source && <p className="text-red-600 text-sm font-bold mt-2">{payForm.errors.payment_source}</p>}
                                    </div>

                                    {/* DYNAMIC SOURCE SELECTION */}
                                    <div className="mb-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                                        {payForm.data.payment_source === 'wallet' ? (
                                            <div className="flex items-start gap-3">
                                                <div className="h-11 w-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0 shadow-inner">
                                                    <i className="fa-solid fa-wallet"></i>
                                                </div>
                                                <div>
                                                    <h4 className="text-[14.5px] font-black text-purple-900">Settling via Vendor Advance (Wallet)</h4>
                                                    <p className="text-[12.5px] font-bold text-purple-700/80 leading-relaxed mt-0.5">
                                                        No bank deduction will occur. This will deduct from the vendor's pre-paid advance balance.
                                                    </p>
                                                    <div className="mt-2.5 inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-purple-200 shadow-xs">
                                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Available Advance:</span>
                                                        <span className="text-[15px] font-black text-purple-800 tabular-nums"><Taka className="text-[13px] text-purple-600"/> {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : payForm.data.payment_source === 'account' ? (
                                            <div>
                                                <label className="block text-[11.5px] sm:text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Select Payment Account <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={accounts}
                                                    value={payForm.data.account_id}
                                                    onChange={(val) => payForm.setData("account_id", val)}
                                                    placeholder="-- Click to search & select bank/cash account --"
                                                    getValue={(acc) => acc.id}
                                                    getLabel={(acc) => `${acc.name} (Current Bal: ৳ ${Number(acc.current_balance).toLocaleString('en-IN')})`}
                                                    error={payForm.errors.account_id}
                                                />
                                                {payForm.errors.account_id && <span className="mt-1.5 block text-[12px] font-bold text-red-600">{payForm.errors.account_id}</span>}
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-[11.5px] sm:text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Select Employee (Staff Advance) <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={advances}
                                                    value={payForm.data.advance_user_id}
                                                    onChange={(val) => payForm.setData("advance_user_id", val)}
                                                    placeholder="-- Click to search & select staff --"
                                                    getValue={(adv) => adv.user_id}
                                                    getLabel={(adv) => `${adv.user?.name} (Advance Available: ৳ ${Number(adv.available_balance).toLocaleString('en-IN')})`}
                                                    error={payForm.errors.advance_user_id}
                                                />
                                                {payForm.errors.advance_user_id && <span className="mt-1.5 block text-[12px] font-bold text-red-600">{payForm.errors.advance_user_id}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* AMOUNTS & CHARGES GRID */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-emerald-700 uppercase tracking-widest mb-2">Pay Amount <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <Taka className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[15px]" />
                                                <input type="number" step="0.01" min="0" value={payForm.data.pay_amount} onChange={e => payForm.setData("pay_amount", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-emerald-400 bg-emerald-50/40 pl-9 pr-3 py-3 text-[16px] font-black text-emerald-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 shadow-xs transition-all" required={!payForm.data.adjustment_amount} />
                                            </div>
                                            {payForm.errors.pay_amount && <span className="mt-1 block text-[11px] font-bold text-red-600">{payForm.errors.pay_amount}</span>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-amber-700 uppercase tracking-widest mb-2">Discount / Adjust</label>
                                            <div className="relative">
                                                <Taka className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-[15px]" />
                                                <input type="number" step="0.01" min="0" value={payForm.data.adjustment_amount} onChange={e => payForm.setData("adjustment_amount", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-amber-300 bg-amber-50/40 pl-9 pr-3 py-3 text-[16px] font-black text-amber-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-xs transition-all" />
                                            </div>
                                            {payForm.errors.adjustment_amount && <span className="mt-1 block text-[11px] font-bold text-red-600">{payForm.errors.adjustment_amount}</span>}
                                        </div>

                                        {payForm.data.payment_source === 'account' ? (
                                            <div>
                                                <label className="block text-[11.5px] font-black text-rose-600 uppercase tracking-widest mb-2">Bank Charge</label>
                                                <div className="relative">
                                                    <Taka className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-[15px]" />
                                                    <input type="number" step="0.01" min="0" value={payForm.data.bank_charge || ''} onChange={e => payForm.setData("bank_charge", e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-3 text-[16px] font-black text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs transition-all" />
                                                </div>
                                                {payForm.errors.bank_charge && <span className="mt-1 block text-[11px] font-bold text-red-600">{payForm.errors.bank_charge}</span>}
                                            </div>
                                        ) : (
                                            <div className="opacity-50 pointer-events-none">
                                                <label className="block text-[11.5px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Charge</label>
                                                <input type="text" disabled value="N/A" className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-[14px] font-bold text-slate-400" />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">Payment Date <span className="text-red-600">*</span></label>
                                            <input type="date" value={payForm.data.date} onChange={e => payForm.setData("date", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-[13.5px] font-black text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 cursor-pointer shadow-xs transition-all" required />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. LIVE SETTLEMENT SUMMARY CARD */}
                                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700/60 pb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-calculator text-indigo-400"></i> Settlement Summary & Projection
                                    </h4>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div>
                                            <span className="block text-[11px] font-bold text-slate-400 uppercase">Selected Bills Due</span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-white tabular-nums">
                                                ৳ {selectedTotalDue.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-bold text-emerald-400 uppercase">Amount Paid</span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-emerald-300 tabular-nums">
                                                ৳ {Number(payForm.data.pay_amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-bold text-amber-400 uppercase">Discount / Adjust</span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-amber-300 tabular-nums">
                                                ৳ {Number(payForm.data.adjustment_amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-bold text-indigo-300 uppercase">Total Cleared</span>
                                            <span className="text-[18px] sm:text-[22px] font-black text-indigo-300 tabular-nums leading-tight">
                                                ৳ {(Number(payForm.data.pay_amount || 0) + Number(payForm.data.adjustment_amount || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                            </span>
                                        </div>
                                    </div>

                                    {Number(payForm.data.pay_amount || 0) > selectedTotalDue && (
                                        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2 text-emerald-300 text-[12px] font-bold">
                                            <i className="fa-solid fa-circle-check text-emerald-400"></i>
                                            Excess amount of ৳ {(Number(payForm.data.pay_amount || 0) - selectedTotalDue).toLocaleString('en-IN')} will be credited directly to Vendor Advance Wallet!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowPayModal(false)} className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs">
                                    Cancel
                                </button>
                                <button type="submit" disabled={payForm.processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3 text-[14px] font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2">
                                    {payForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm Settlement</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 💎 EXECUTIVE VENDOR WALLET MODAL (Deposit Advance & Receive Refund) --- */}
            {showWalletModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl lg:max-w-4xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">

                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-800 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 border ${walletAction === 'deposit' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                        <i className={`fa-solid ${walletAction === 'deposit' ? 'fa-wallet' : 'fa-hand-holding-dollar'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-coins"></i> Vendor Advance & Wallet
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {walletAction === 'deposit' ? 'Give Advance to Vendor' : 'Receive Advance Refund'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 text-[12px] sm:text-[13px] font-bold text-slate-400 mt-1">
                                            <span className="text-white"><i className="fa-solid fa-truck-field text-indigo-400 mr-1.5"></i>{selectedVendor.name} {selectedVendor.company_name ? `(${selectedVendor.company_name})` : ''}</span>
                                            <span className="text-slate-600">•</span>
                                            <span className="text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md text-[11.5px] tabular-nums">
                                                Balance: ৳ {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setShowWalletModal(false)} className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>

                            {/* MODE SWITCHER TABS */}
                            <div className="mt-5 grid grid-cols-2 gap-2 p-1.5 bg-slate-950/70 border border-slate-800 rounded-2xl relative z-10">
                                <button
                                    type="button"
                                    onClick={() => setWalletAction('deposit')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[12.5px] font-black uppercase tracking-wider transition-all ${walletAction === 'deposit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <i className="fa-solid fa-plus-circle"></i>
                                    <span>Give Advance</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWalletAction('withdraw')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[12.5px] font-black uppercase tracking-wider transition-all ${walletAction === 'withdraw' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <i className="fa-solid fa-arrow-rotate-left"></i>
                                    <span>Receive Refund</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleWalletSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8 space-y-5 bg-slate-50">
                                {Object.keys(walletForm.errors).length > 0 && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-bold text-red-700 shadow-sm flex items-start gap-2.5">
                                        <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5 text-[15px]"></i>
                                        <div>{Object.values(walletForm.errors).join(' ')}</div>
                                    </div>
                                )}

                                {/* FORM INPUTS CARD */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    {walletAction === 'deposit' && (
                                        <div className="border-b border-slate-200 pb-4 mb-2">
                                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5">
                                                Advance Source <span className="text-red-600">*</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all select-none ${walletForm.data.payment_source === 'account' ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300'}`}>
                                                    <input
                                                        type="radio"
                                                        name="wallet_payment_source"
                                                        value="account"
                                                        checked={walletForm.data.payment_source === 'account'}
                                                        onChange={() => walletForm.setData({ ...walletForm.data, payment_source: 'account', advance_user_id: '' })}
                                                        className="hidden"
                                                    />
                                                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-base shrink-0">
                                                        <i className="fa-solid fa-building-columns"></i>
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-black uppercase tracking-wide">Bank / Cash</div>
                                                        <div className="text-[11px] font-bold text-slate-500">Direct company account</div>
                                                    </div>
                                                </label>

                                                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all select-none ${walletForm.data.payment_source === 'advance' ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300'}`}>
                                                    <input
                                                        type="radio"
                                                        name="wallet_payment_source"
                                                        value="advance"
                                                        checked={walletForm.data.payment_source === 'advance'}
                                                        onChange={() => walletForm.setData({ ...walletForm.data, payment_source: 'advance', account_id: '', bank_charge: '' })}
                                                        className="hidden"
                                                    />
                                                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base shrink-0">
                                                        <i className="fa-solid fa-user-tie"></i>
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-black uppercase tracking-wide">Staff Advance</div>
                                                        <div className="text-[11px] font-bold text-slate-500">Deduct staff's cash balance</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Transaction Date <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    required
                                                    value={walletForm.data.date}
                                                    onChange={e => walletForm.setData('date', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[13.5px] font-black text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 cursor-pointer shadow-xs transition-all"
                                                />
                                            </div>
                                        </div>

                                        {walletAction === 'withdraw' || walletForm.data.payment_source === 'account' ? (
                                            <div>
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    {walletAction === 'deposit' ? 'Pay From Account' : 'Receive Into Account'} <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={accounts}
                                                    value={walletForm.data.account_id}
                                                    onChange={(val) => walletForm.setData("account_id", val)}
                                                    placeholder="-- Choose Account --"
                                                    getValue={(acc) => acc.id}
                                                    getLabel={(acc) => `${acc.name} (৳ ${Number(acc.current_balance).toLocaleString('en-IN')})`}
                                                    error={walletForm.errors.account_id}
                                                />
                                                {walletForm.errors.account_id && <span className="mt-1 block text-[11px] font-bold text-red-600">{walletForm.errors.account_id}</span>}
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Select Employee (Staff Advance) <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={advances}
                                                    value={walletForm.data.advance_user_id}
                                                    onChange={(val) => walletForm.setData("advance_user_id", val)}
                                                    placeholder="-- Select Staff Advance --"
                                                    getValue={(adv) => adv.user_id}
                                                    getLabel={(adv) => `${adv.user?.name} (Advance Available: ৳ ${Number(adv.available_balance).toLocaleString('en-IN')})`}
                                                    error={walletForm.errors.advance_user_id}
                                                />
                                                {walletForm.errors.advance_user_id && <span className="mt-1 block text-[11px] font-bold text-red-600">{walletForm.errors.advance_user_id}</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                {walletAction === 'deposit' ? 'Advance Amount (৳)' : 'Refund Amount (৳)'} <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[15px]">৳</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    value={walletForm.data.amount}
                                                    onChange={e => walletForm.setData("amount", e.target.value)}
                                                    placeholder="0.00"
                                                    className={`w-full rounded-xl border pl-10 pr-4 py-3.5 text-[17px] font-black outline-none transition-all shadow-xs ${walletAction === 'deposit' ? 'border-indigo-300 bg-indigo-50/40 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 text-indigo-950' : 'border-emerald-300 bg-emerald-50/40 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 text-emerald-950'}`}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {walletAction === 'deposit' ? (
                                            walletForm.data.payment_source === 'account' ? (
                                                <div>
                                                    <label className="block text-[11.5px] font-black text-rose-700 uppercase tracking-widest mb-2">
                                                        Bank Charge / Fee (৳)
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-rose-400 text-[14px]">৳</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={walletForm.data.bank_charge}
                                                            onChange={e => walletForm.setData('bank_charge', e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full rounded-xl border border-rose-200 bg-rose-50/30 focus:bg-white pl-10 pr-4 py-3.5 text-[15px] font-black text-rose-800 outline-none transition-all focus:border-rose-600 focus:ring-4 focus:ring-rose-600/10 shadow-xs"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-[11.5px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                                                        Staff Available Balance
                                                    </label>
                                                    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-[14px] font-black text-emerald-900 flex items-center justify-between">
                                                        <span>Available Advance:</span>
                                                        <span className="text-[16px] text-emerald-700">৳ {Number(advances.find(a => String(a.user_id) === String(walletForm.data.advance_user_id))?.available_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div>
                                                <label className="block text-[11.5px] font-black text-purple-700 uppercase tracking-widest mb-2">
                                                    Extra Profit / Commission (৳)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-purple-400 text-[14px]">৳</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={walletForm.data.profit_amount}
                                                        onChange={e => walletForm.setData("profit_amount", e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full rounded-xl border border-purple-200 bg-purple-50/30 focus:bg-white pl-10 pr-4 py-3.5 text-[15px] font-black text-purple-800 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 shadow-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                            Note / Transaction Remarks
                                        </label>
                                        <textarea
                                            value={walletForm.data.description}
                                            onChange={e => walletForm.setData("description", e.target.value)}
                                            placeholder={walletAction === 'deposit' ? 'e.g., Advance given for ongoing site work / purchase order' : 'e.g., Refund received for remaining advance / cancelled order'}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13.5px] font-medium text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs resize-none"
                                            rows="2"
                                        ></textarea>
                                    </div>
                                </div>

                                {/* LIVE CALCULATION & WALLET PROJECTION */}
                                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700/60 pb-2 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <i className="fa-solid fa-calculator text-indigo-400"></i> Advance Projection & Account Impact
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${walletAction === 'deposit' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}`}>
                                            {walletAction === 'deposit' ? 'Advance Outflow' : 'Refund Inflow'}
                                        </span>
                                    </h4>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div>
                                            <span className="block text-[11px] font-bold text-slate-400 uppercase">Current Balance</span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-white tabular-nums">
                                                ৳ {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={`block text-[11px] font-bold uppercase ${walletAction === 'deposit' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                {walletAction === 'deposit' ? 'Advance Given' : 'Refund Received'}
                                            </span>
                                            <span className={`text-[16px] sm:text-[18px] font-black tabular-nums ${walletAction === 'deposit' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                                                ৳ {Number(walletForm.data.amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="block text-[11px] font-bold text-amber-400 uppercase">
                                                {walletAction === 'deposit' 
                                                    ? (walletForm.data.payment_source === 'advance' ? 'Staff Advance Deduction' : 'Account Deduction')
                                                    : 'Account Credit'}
                                            </span>
                                            <span className="text-[16px] sm:text-[18px] font-black text-amber-300 tabular-nums">
                                                ৳ {walletAction === 'deposit' 
                                                    ? (walletForm.data.payment_source === 'advance'
                                                        ? Number(walletForm.data.amount || 0).toLocaleString('en-IN')
                                                        : (Number(walletForm.data.amount || 0) + Number(walletForm.data.bank_charge || 0)).toLocaleString('en-IN'))
                                                    : (Number(walletForm.data.amount || 0) + Number(walletForm.data.profit_amount || 0)).toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="block text-[11px] font-bold text-cyan-300 uppercase">New Advance Bal.</span>
                                            <span className="text-[18px] sm:text-[22px] font-black text-cyan-300 tabular-nums leading-tight">
                                                ৳ {walletAction === 'deposit'
                                                    ? (Number(selectedVendor.wallet_balance || 0) + Number(walletForm.data.amount || 0)).toLocaleString('en-IN')
                                                    : Math.max(0, Number(selectedVendor.wallet_balance || 0) - Number(walletForm.data.amount || 0)).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowWalletModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={walletForm.processing}
                                    className={`rounded-xl px-8 py-3 text-[14px] font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2 ${walletAction === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                >
                                    {walletForm.processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                                    ) : (
                                        <><i className="fa-solid fa-check"></i> {walletAction === 'deposit' ? 'Confirm Advance' : 'Confirm Refund'}</>
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
