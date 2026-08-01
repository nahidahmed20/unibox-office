import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

/* =========================================
   REUSABLE SEARCHABLE SELECT COMPONENT
========================================= */
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, renderOption, error, disabled }) {
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
    const filtered = options.filter((opt) =>
        getLabel(opt).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'hover:bg-gray-50 focus:ring-1'} 
                    ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-300 focus:border-[var(--accent)] focus:ring-[var(--accent)]/50'} 
                    ${selected ? 'text-gray-900 bg-white' : 'text-gray-500 bg-white'}
                `}
            >
                <span className="truncate flex-1">
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>

            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-[13px] text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {renderOption ? renderOption(opt) : getLabel(opt)}
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

    const [paymentsData, setPaymentsData] = useState({ data: [], current_page: 1, last_page: 1 });
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);

    // Pay Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    // NEW: Multi-bill checkbox selection
    const [selectedBillIds, setSelectedBillIds] = useState([]);

    // Wallet Modal State
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [walletAction, setWalletAction] = useState('deposit'); 

    const [showVoidModal, setShowVoidModal] = useState(false);
    const [paymentToVoid, setPaymentToVoid] = useState(null);

    const voidForm = useForm({
        void_reason: ''
    });

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        company_name: '',
        phone: '',
        address: '',
        opening_balance: 0
    });

    // --- Pay Pending Bill(s) Form ---
    const payForm = useForm({
        project_expense_ids: [],
        payment_source: 'account',
        account_id: '',
        advance_user_id: '',
        adjustment_amount: '',
        pay_amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    // --- Vendor Wallet Form ---
    const walletForm = useForm({
        account_id: '',
        amount: '',
        description: ''
    });

    const fetchPayments = (vendorId, page = 1) => {
        setPaymentsLoading(true);
        axios.get(route('admin.vendors.payments.index', vendorId), { params: { page } })
            .then(res => setPaymentsData(res.data))
            .catch(() => Swal.fire("Error", "পেমেন্ট হিস্টরি লোড করা যায়নি", "error"))
            .finally(() => setPaymentsLoading(false));
    };

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

            router.get(route('admin.vendors.index'), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Copy Data ---
    const handleCopy = () => {
        if (!vendors.data || !vendors.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = vendors.data
            .map((v) => `${v.name}\t${v.company_name || "N/A"}\t${v.phone || "N/A"}\tDue: ${v.total_due || 0}\tWallet: ${v.wallet_balance || 0}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    // --- Export CSV ---
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

    // --- Custom Full Screen Print ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Vendors Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                        .financial-list { display: flex; flex-direction: column; gap: 4px; }
                        .text-red { color: #dc2626; font-weight: bold; }
                        .text-purple { color: #9333ea; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>Vendors Directory Report</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', name: '', company_name: '', phone: '', address: '', opening_balance: 0 });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (vendor) => {
        clearErrors();
        setData({
            id: vendor?.id || '',
            name: vendor?.name || '',
            company_name: vendor?.company_name || '',
            phone: vendor?.phone || '',
            address: vendor?.address || '',
            opening_balance: vendor?.opening_balance || 0
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (vendor) => {
        setSelectedVendor(vendor);
        setShowViewModal(true);
        fetchPayments(vendor.id, 1);
    };

    const openPayModal = (vendor) => {
        const dueBills = vendor.project_expenses || vendor.projectExpenses || [];
        if (dueBills.length === 0) {
            return Swal.fire("No Dues", "This vendor has no pending bills.", "info");
        }
        setSelectedVendor(vendor);
        setSelectedBillIds([]);
        payForm.reset();
        payForm.clearErrors();
        setShowPayModal(true);
    };

    const openWalletModal = (vendor, action) => {
        setSelectedVendor(vendor);
        setWalletAction(action);
        walletForm.reset();
        walletForm.clearErrors();
        setShowWalletModal(true);
    };

    const openVoidModal = (payment) => {
        setPaymentToVoid(payment);
        voidForm.reset();
        voidForm.clearErrors();
        setShowVoidModal(true);
    };

    const handleVoidSubmit = (e) => {
        e.preventDefault();
        voidForm.post(route('admin.vendors.payments.void', paymentToVoid.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowVoidModal(false);
                setPaymentToVoid(null);
                fetchPayments(selectedVendor.id, paymentsData.current_page);
                Swal.fire({ icon: "success", title: "পেমেন্ট ভয়েড হয়েছে!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => {
                if (err.error) Swal.fire("Error", err.error, "error");
            }
        });
    };

    // --- Derived data for the Pay Modal ---
    const dueBillsList = selectedVendor ? (selectedVendor.project_expenses || selectedVendor.projectExpenses || []) : [];

    const selectedTotalDue = dueBillsList
        .filter(bill => selectedBillIds.includes(bill.id))
        .reduce((sum, bill) => sum + Number(bill.due_amount || 0), 0);

    const toggleBillSelect = (billId) => {
        setSelectedBillIds(prev =>
            prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
        );
    };

    const toggleSelectAllBills = () => {
        if (selectedBillIds.length === dueBillsList.length) {
            setSelectedBillIds([]);
        } else {
            setSelectedBillIds(dueBillsList.map(b => b.id));
        }
    };

    useEffect(() => {
        if (showPayModal) {
            payForm.setData("pay_amount", selectedTotalDue > 0 ? selectedTotalDue : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBillIds]);

    // --- Submits ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.vendors.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.vendors.store'), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handlePaySubmit = (e) => {
        e.preventDefault();

        if (selectedBillIds.length === 0) {
            return Swal.fire("সিলেক্ট করুন", "অন্তত একটা বিল সিলেক্ট করতে হবে।", "warning");
        }

        payForm.transform((formData) => ({
            ...formData,
            project_expense_ids: selectedBillIds,
        }));

        payForm.post(route('admin.vendors.pay', selectedVendor.id), {
            onSuccess: () => {
                setShowPayModal(false);
                setSelectedBillIds([]);
                Swal.fire({ icon: "success", title: "পেমেন্ট সফল হয়েছে!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => {
                if (err.error) Swal.fire("Error", err.error, "error");
            }
        });
    };

    const handleWalletSubmit = (e) => {
        e.preventDefault();
        const routeName = walletAction === 'deposit' ? 'admin.vendors.add-advance' : 'admin.vendors.receive-refund';
        
        walletForm.post(route(routeName, selectedVendor.id), {
            onSuccess: () => {
                setShowWalletModal(false);
                Swal.fire({ icon: "success", title: "Wallet Updated Successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => {
                if (err.error) Swal.fire("Error", err.error, "error");
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This vendor will be deleted permanently!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.vendors.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Vendor removed successfully.", timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Vendors Management" />
            
            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Vendor Workspace</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage, track and communicate with your vendors.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-truck-field text-[var(--accent)]"></i> Vendor Directory
                        </div>
                        {hasPermission('create_vendor') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Add New Vendor
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
                                    className="w-[110px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
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
                                placeholder="Search vendors..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Vendor Details</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Financial Data</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {vendors.data && vendors.data.length > 0 ? (
                                    vendors.data.map((vendor, index) => (
                                        <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {vendors.from ? vendors.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[14.5px] text-gray-900">{vendor.name}</div>
                                                <div className="text-[12px] text-gray-500 mt-1 flex items-center">
                                                    <i className="fa-regular fa-building mr-1.5 text-gray-400"></i> 
                                                    {vendor.company_name || "No Company"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700 font-medium flex items-center gap-1.5">
                                                    <i className="fa-solid fa-phone text-gray-400"></i> {vendor.phone || "-"}
                                                </div>
                                                <div className="text-[12px] text-gray-500 mt-1.5 whitespace-normal max-w-[200px] leading-relaxed flex items-start gap-1.5">
                                                    <i className="fa-solid fa-location-dot mt-0.5 text-gray-400 shrink-0"></i>
                                                    {vendor.address ? (vendor.address.length > 30 ? vendor.address.substring(0, 30) + '...' : vendor.address) : "No address"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 w-[180px] financial-list">
                                                    <div className={`flex justify-between items-center px-2 py-1.5 rounded text-[12px] font-bold ${vendor.total_due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-gray-500'}`}>
                                                        <span className={`${vendor.total_due > 0 ? 'text-rose-500' : 'text-gray-400'} font-medium`}>Due:</span>
                                                        <span>TK. {Number(vendor.total_due || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-purple-50 px-2 py-1.5 rounded text-[12px] font-bold text-purple-700 border border-purple-100">
                                                        <span className="font-medium flex items-center gap-1.5 text-purple-500">
                                                            <i className="fa-solid fa-wallet"></i> Wallet:
                                                        </span>
                                                        <span>TK. {Number(vendor.wallet_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('add_advance_vendor') && (
                                                        <button onClick={() => openWalletModal(vendor, 'deposit')} className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-200" title="Give Advance to Wallet">
                                                            <i className="fa-solid fa-plus text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('return_advance_vendor') && (
                                                        <button onClick={() => openWalletModal(vendor, 'withdraw')} className="flex h-7 w-7 items-center justify-center rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-transparent hover:border-rose-200" title="Receive Refund from Wallet">
                                                            <i className="fa-solid fa-minus text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('view_pay_vendor') && (
                                                        <button onClick={() => openPayModal(vendor)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-transparent hover:border-amber-200" title="Pay Due Bills">
                                                            <i className="fa-solid fa-money-bill-wave text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('view_vendors') && (
                                                        <button onClick={() => openViewModal(vendor)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-transparent hover:border-emerald-200" title="View Profile & Payments">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_vendor') && (
                                                        <button onClick={() => openEditModal(vendor)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Vendor">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_vendor') && (
                                                        <button onClick={() => handleDelete(vendor.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Vendor">
                                                            <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-truck-slash text-4xl text-gray-300 mb-3"></i>
                                                <p>No vendors found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {vendors.links && vendors.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {vendors.from || 0} to {vendors.to || 0} of {vendors.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {vendors.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
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

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-truck-field text-[var(--accent)]"></i> Vendor Profile
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                            
                            {/* Profile Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-2xl font-bold border border-[var(--accent)]/20 uppercase">
                                        {selectedVendor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-[20px] font-bold text-gray-900">{selectedVendor.name}</h2>
                                        {selectedVendor.company_name && (
                                            <div className="text-[13px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                <i className="fa-regular fa-building"></i> {selectedVendor.company_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedVendor.phone && (
                                        <a href={`tel:${selectedVendor.phone}`} className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 border border-emerald-100 transition-colors" title="Call Vendor">
                                            <i className="fa-solid fa-phone"></i>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Financial Overview & Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Financial Overview */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-chart-pie text-[var(--accent)]"></i> Financial Overview
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`${selectedVendor.total_due > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'} border p-4 rounded-xl text-center shadow-sm`}>
                                            <span className={`block text-[10px] uppercase font-bold ${selectedVendor.total_due > 0 ? 'text-rose-600' : 'text-gray-500'} mb-1`}>Total Due Amount</span>
                                            <span className={`block text-[16px] font-extrabold ${selectedVendor.total_due > 0 ? 'text-rose-800' : 'text-gray-700'}`}>
                                                TK. {Number(selectedVendor.total_due || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center shadow-sm">
                                            <span className="block text-[10px] uppercase font-bold text-purple-600 mb-1">Wallet Balance</span>
                                            <span className="block text-[16px] font-extrabold text-purple-800">
                                                TK. {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Address */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-address-book text-gray-400"></i> Contact Details
                                    </h4>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Phone Number</span>
                                            <div className="font-medium text-gray-800">{selectedVendor.phone || "N/A"}</div>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Physical Address</span>
                                            <div className="text-gray-700 text-[13.5px] leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedVendor.address || <span className="italic text-gray-400">No address provided.</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History Section */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <i className="fa-solid fa-clock-rotate-left text-[var(--accent)]"></i> Payment History
                                </h4>

                                {(!paymentsData.data || paymentsData.data.length === 0) ? (
                                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-[13.5px] text-gray-500">
                                        <i className="fa-solid fa-receipt text-2xl text-gray-300 mb-2 block"></i>
                                        No payment records found.
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-lg border border-gray-200 bg-white max-h-[300px] overflow-y-auto brass-scroll divide-y divide-gray-100">
                                            {paymentsData.data.map((payment) => (
                                                <div 
                                                    key={payment.id} 
                                                    className={`p-4 transition-colors ${payment.status === 'voided' ? 'bg-red-50/50 opacity-80' : 'hover:bg-gray-50/50'}`}
                                                >
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-gray-900 text-[14.5px] flex items-center gap-2">
                                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[11px]">PAID</span>
                                                                TK. {Number(payment.pay_amount).toLocaleString('en-IN')}
                                                                {payment.status === 'voided' && (
                                                                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase">Voided</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[12px] font-semibold text-gray-500 mt-1.5 flex items-center gap-2">
                                                                <i className="fa-regular fa-calendar text-gray-400"></i> {payment.date} 
                                                                <span className="text-gray-300">|</span> 
                                                                <i className="fa-solid fa-building-columns text-gray-400"></i> {payment.payment_source === 'account' ? (payment.account?.name || 'Account') : 'Employee Advance'}
                                                            </div>
                                                            {payment.details && payment.details.length > 0 && (
                                                                <div className="text-[12px] text-gray-600 mt-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                                                                    <strong><i className="fa-solid fa-list-check text-gray-400 mr-1"></i> Bills Settled:</strong> {payment.details.map(d => d.expense?.title).filter(Boolean).join(', ')}
                                                                </div>
                                                            )}
                                                            {payment.wallet_credit_amount > 0 && (
                                                                <div className="text-[12px] font-semibold text-purple-600 mt-2 flex items-center gap-1.5 bg-purple-50 p-1.5 w-fit rounded border border-purple-100">
                                                                    <i className="fa-solid fa-arrow-turn-down"></i> Sent to Wallet: TK. {Number(payment.wallet_credit_amount).toLocaleString('en-IN')}
                                                                </div>
                                                            )}
                                                            {payment.status === 'voided' && payment.void_reason && (
                                                                <div className="text-[12px] italic text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                                                                    <strong><i className="fa-solid fa-circle-info mr-1"></i> Void Reason:</strong> {payment.void_reason}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {payment.status !== 'voided' && hasPermission('void_vendor_payment') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openVoidModal(payment)}
                                                                className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                                                title="Void this payment"
                                                            >
                                                                <i className="fa-solid fa-rotate-left mr-1.5"></i> Void
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {paymentsData.last_page > 1 && (
                                            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                                                <span className="text-[12.5px] font-medium text-gray-500">
                                                    Page {paymentsData.current_page} of {paymentsData.last_page}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={paymentsData.current_page <= 1}
                                                        onClick={() => fetchPayments(selectedVendor.id, paymentsData.current_page - 1)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <i className="fa-solid fa-chevron-left text-[12px]"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={paymentsData.current_page >= paymentsData.last_page}
                                                        onClick={() => fetchPayments(selectedVendor.id, paymentsData.current_page + 1)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <i className="fa-solid fa-chevron-right text-[12px]"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAY VENDOR MODAL (Multi-bill Selection) --- */}
            {showPayModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-2xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-money-check-dollar text-emerald-500"></i> Process Payment: {selectedVendor.name}
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handlePaySubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                                
                                {/* Multi-bill checkbox list */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                        <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                                            <i className="fa-solid fa-list-check text-blue-500"></i> সিলেক্ট বিলসমূহ <span className="text-red-500">*</span>
                                        </h4>
                                        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={dueBillsList.length > 0 && selectedBillIds.length === dueBillsList.length}
                                                onChange={toggleSelectAllBills}
                                            />
                                            সব সিলেক্ট করুন
                                        </label>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 max-h-[220px] overflow-y-auto brass-scroll">
                                        {dueBillsList.length === 0 ? (
                                            <div className="p-6 text-center text-[13.5px] text-gray-500">No pending bills found.</div>
                                        ) : (
                                            dueBillsList.map(bill => (
                                                <label
                                                    key={bill.id}
                                                    className={`flex cursor-pointer items-center justify-between border-b border-gray-200 px-4 py-3.5 transition-colors last:border-0 ${selectedBillIds.includes(bill.id) ? 'bg-blue-50/50' : 'hover:bg-white'}`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5"
                                                            checked={selectedBillIds.includes(bill.id)}
                                                            onChange={() => toggleBillSelect(bill.id)}
                                                        />
                                                        <span className="font-semibold text-gray-800 text-[14px]">{bill.title}</span>
                                                    </span>
                                                    <span className="font-bold text-red-500 text-[14px] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                        Due: TK. {Number(bill.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {selectedBillIds.length > 0 && (
                                        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3.5 text-[14px] font-semibold text-blue-800 flex items-center justify-between shadow-sm">
                                            <span className="flex items-center gap-2"><i className="fa-solid fa-check-double"></i> {selectedBillIds.length} টি বিল সিলেক্টেড</span>
                                            <span className="text-[15px]">মোট বকেয়া: TK. {selectedTotalDue.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {payForm.errors.project_expense_ids && <span className="mt-2 block text-[12px] font-bold text-red-500">{payForm.errors.project_expense_ids}</span>}
                                </div>

                                {/* Payment Form Area */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    {/* Payment Source Radios */}
                                    <div className="mb-6">
                                        <label className="block text-[13px] font-bold text-gray-800 mb-3">Payment Source <span className="text-red-500">*</span></label>
                                        <div className="flex flex-wrap gap-4">
                                            <label className={`flex cursor-pointer items-center gap-2 text-[14px] font-medium transition-all px-4 py-2 border rounded-lg ${payForm.data.payment_source === 'account' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input 
                                                    type="radio" name="payment_source" value="account" 
                                                    checked={payForm.data.payment_source === 'account'} 
                                                    onChange={() => { payForm.setData("payment_source", "account"); payForm.setData("advance_user_id", ""); }} 
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 hidden"
                                                />
                                                <i className="fa-solid fa-building-columns text-[16px]"></i> Bank / Cash
                                            </label>
                                            <label className={`flex cursor-pointer items-center gap-2 text-[14px] font-medium transition-all px-4 py-2 border rounded-lg ${payForm.data.payment_source === 'advance' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input 
                                                    type="radio" name="payment_source" value="advance" 
                                                    checked={payForm.data.payment_source === 'advance'} 
                                                    onChange={() => { payForm.setData("payment_source", "advance"); payForm.setData("account_id", ""); }} 
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 hidden"
                                                />
                                                <i className="fa-solid fa-user-tie text-[16px]"></i> Employee Advance
                                            </label>
                                        </div>
                                    </div>

                                    {/* Conditional Source Dropdowns */}
                                    <div className="mb-6">
                                        {payForm.data.payment_source === 'account' ? (
                                            <>
                                                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Account <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <select 
                                                        value={payForm.data.account_id} 
                                                        onChange={e => payForm.setData("account_id", e.target.value)} 
                                                        className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer" 
                                                        required
                                                    >
                                                        <option value="">-- Select Account --</option>
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name} (Bal: {Number(acc.current_balance).toLocaleString('en-IN')})</option>
                                                        ))}
                                                    </select>
                                                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                                {payForm.errors.account_id && <span className="mt-1 block text-[12px] text-red-500">{payForm.errors.account_id}</span>}
                                            </>
                                        ) : (
                                            <>
                                                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Employee <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <select 
                                                        value={payForm.data.advance_user_id} 
                                                        onChange={e => payForm.setData("advance_user_id", e.target.value)} 
                                                        className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer" 
                                                        required
                                                    >
                                                        <option value="">-- Select Employee --</option>
                                                        {advances.map(adv => (
                                                            <option key={adv.id} value={adv.user_id}>{adv.user?.name} (Avail: TK. {Number(adv.available_balance).toLocaleString('en-IN')})</option>
                                                        ))}
                                                    </select>
                                                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                                </div>
                                                {payForm.errors.advance_user_id && <span className="mt-1 block text-[12px] text-red-500">{payForm.errors.advance_user_id}</span>}
                                            </>
                                        )}
                                    </div>

                                    {/* Amount & Date fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-4">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Pay Amount (TK) <span className="text-red-500">*</span></label>
                                            <input 
                                                type="number" step="0.01" min="0" 
                                                value={payForm.data.pay_amount} 
                                                onChange={e => payForm.setData("pay_amount", e.target.value)} 
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] font-bold text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                required={!payForm.data.adjustment_amount}
                                            />
                                            {payForm.errors.pay_amount && <span className="mt-1 block text-[12px] text-red-500">{payForm.errors.pay_amount}</span>}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Discount/Adjust (TK)</label>
                                            <input 
                                                type="number" step="0.01" min="0" 
                                                value={payForm.data.adjustment_amount} 
                                                onChange={e => payForm.setData("adjustment_amount", e.target.value)} 
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-emerald-300 px-3.5 py-2.5 text-[15px] font-bold text-emerald-700 bg-emerald-50 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" 
                                            />
                                            {payForm.errors.adjustment_amount && <span className="mt-1 block text-[12px] text-red-500">{payForm.errors.adjustment_amount}</span>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Payment Date <span className="text-red-500">*</span></label>
                                            <input 
                                                type="date" 
                                                value={payForm.data.date} 
                                                onChange={e => payForm.setData("date", e.target.value)} 
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-text" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-5 p-3.5 rounded-lg border border-indigo-200 bg-indigo-50 flex justify-between items-center shadow-sm">
                                        <span className="font-bold text-indigo-800 text-[13.5px] flex items-center gap-2">
                                            <i className="fa-solid fa-calculator text-[16px]"></i> Total Cleared (Pay + Adjust):
                                        </span>
                                        <span className="font-extrabold text-indigo-900 text-[18px] bg-white px-3 py-1 rounded border border-indigo-100">
                                            TK. {(Number(payForm.data.pay_amount || 0) + Number(payForm.data.adjustment_amount || 0)).toLocaleString('en-IN')}
                                        </span>
                                    </div>

                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800 flex items-start gap-2.5">
                                        <i className="fa-solid fa-circle-info mt-0.5 text-amber-600 text-[15px] shrink-0"></i>
                                        <p className="m-0 leading-relaxed font-medium">
                                            টাকাটা সিলেক্ট করা বিলগুলোর মধ্যে পুরনো বিল আগে ধরে ক্রমান্বয়ে সেটেল হবে। বকেয়ার চেয়ে বেশি দিলে বাড়তি অংশ ভেন্ডরের ওয়ালেটে স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowPayModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={payForm.processing} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-70 flex items-center gap-2">
                                    {payForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm Payment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VENDOR WALLET MODAL (Deposit & Withdraw) --- */}
            {showWalletModal && selectedVendor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 ${walletAction === 'deposit' ? 'bg-indigo-50/50' : 'bg-rose-50/50'}`}>
                            <h3 className={`text-[18px] font-bold flex items-center gap-2 ${walletAction === 'deposit' ? 'text-indigo-700' : 'text-rose-700'}`}>
                                {walletAction === 'deposit' ? <i className="fa-solid fa-circle-plus"></i> : <i className="fa-solid fa-circle-minus"></i>}
                                {walletAction === 'deposit' ? 'Add Advance to Wallet' : 'Receive Refund from Wallet'}
                            </h3>
                            <button onClick={() => setShowWalletModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors h-8 w-8 rounded-full hover:bg-white/50 flex items-center justify-center">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[13.5px] shrink-0 shadow-inner">
                            <span className="font-semibold text-gray-600 truncate mr-4">Vendor: {selectedVendor.name}</span>
                            <span className="font-bold text-purple-700 shrink-0 bg-purple-100 px-2 py-1 rounded border border-purple-200">Bal: TK. {Number(selectedVendor.wallet_balance || 0).toLocaleString('en-IN')}</span>
                        </div>

                        <form onSubmit={handleWalletSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll flex flex-col gap-5">
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                                        {walletAction === 'deposit' ? 'Pay From Account' : 'Receive To Account'} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={walletForm.data.account_id} 
                                            onChange={e => walletForm.setData("account_id", e.target.value)} 
                                            className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer" 
                                            required
                                        >
                                            <option value="">-- Select Bank/Cash Account --</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} (Bal: TK. {Number(acc.current_balance).toLocaleString('en-IN')})</option>
                                            ))}
                                        </select>
                                        <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                    {walletForm.errors.account_id && <span className="mt-1 block text-[12px] text-red-500">{walletForm.errors.account_id}</span>}
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Amount (TK) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" step="0.01" min="1" 
                                        value={walletForm.data.amount} 
                                        onChange={e => walletForm.setData("amount", e.target.value)} 
                                        placeholder="0.00"
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[16px] font-bold text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        required 
                                    />
                                    {walletForm.errors.amount && <span className="mt-1 block text-[12px] text-red-500">{walletForm.errors.amount}</span>}
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Note / Description</label>
                                    <input 
                                        type="text" 
                                        value={walletForm.data.description} 
                                        onChange={e => walletForm.setData("description", e.target.value)} 
                                        placeholder={walletAction === 'deposit' ? 'e.g., Advance for future work' : 'e.g., Refund for cancelled work'}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowWalletModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={walletForm.processing} className={`rounded-lg px-6 py-2.5 text-[14px] font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 flex items-center gap-2 ${walletAction === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500' : 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'}`}>
                                    {walletForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VOID PAYMENT CONFIRMATION MODAL --- */}
            {showVoidModal && paymentToVoid && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-200 bg-red-50 shrink-0">
                            <h3 className="text-[17px] font-bold text-red-700 flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation"></i> পেমেন্ট ভয়েড করুন
                            </h3>
                            <button onClick={() => setShowVoidModal(false)} className="text-red-400 hover:text-red-700 transition-colors h-8 w-8 rounded-full hover:bg-white flex items-center justify-center">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleVoidSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13.5px] text-amber-800 leading-relaxed mb-5 shadow-sm font-medium">
                                    এই পেমেন্টটি ভয়েড করলে সংশ্লিষ্ট বিলের বকেয়া, অ্যাকাউন্ট/অ্যাডভান্স ব্যালেন্স এবং ওয়ালেট — সবকিছু আগের অবস্থায় ফিরে যাবে। এই কাজটি সরাসরি undo করা যাবে না।
                                </div>

                                <div className="mb-5 rounded-xl bg-gray-50 border border-gray-200 p-5 text-[14px] text-gray-700 flex flex-col gap-2.5 shadow-inner">
                                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                        <span className="font-semibold text-gray-500">পেমেন্টের পরিমাণ:</span>
                                        <strong className="text-red-600 text-[16px] bg-red-50 px-2 py-0.5 rounded border border-red-100">TK. {Number(paymentToVoid.pay_amount).toLocaleString('en-IN')}</strong>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="font-semibold text-gray-500">পেমেন্টের তারিখ:</span>
                                        <span className="font-medium bg-white px-2 py-0.5 rounded border border-gray-200">{paymentToVoid.date}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                        ভয়েড করার কারণ <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={voidForm.data.void_reason}
                                        onChange={(e) => voidForm.setData("void_reason", e.target.value)}
                                        placeholder="যেমন: ভুল অ্যাকাউন্ট সিলেক্ট হয়ে গিয়েছিল"
                                        rows="3"
                                        className="w-full rounded-lg border border-gray-300 p-3.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-y"
                                        required
                                    ></textarea>
                                    {voidForm.errors.void_reason && <p className="mt-1 block text-[12px] font-bold text-red-500">{voidForm.errors.void_reason}</p>}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowVoidModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    বাতিল
                                </button>
                                <button type="submit" disabled={voidForm.processing} className="rounded-lg bg-red-600 px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-70 flex items-center gap-2 shadow-sm">
                                    {voidForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> প্রসেসিং...</> : <><i className="fa-solid fa-rotate-left"></i> নিশ্চিত ভয়েড করুন</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL (IMPROVED UI) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-[var(--accent)]"></i> Modify Vendor</>
                                ) : (
                                    <><i className="fa-solid fa-truck-field text-[var(--accent)]"></i> Register New Vendor</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                                
                                {/* Section 1: Basic Information */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-regular fa-user text-gray-400"></i> Basic Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Vendor Full Name <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={data.name} 
                                                onChange={(e) => setData("name", e.target.value)} 
                                                placeholder="e.g. Rahim Miah" 
                                                required 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Company / Business Name</label>
                                            <input 
                                                type="text" 
                                                value={data.company_name} 
                                                onChange={(e) => setData("company_name", e.target.value)} 
                                                placeholder="e.g. Rahim Printing Press" 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.company_name && <p className="text-red-500 text-[12px] mt-1">{errors.company_name}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contact & Financials */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-address-book text-gray-400"></i> Contact Details & Financials
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Phone Number</label>
                                            <div className="relative">
                                                <i className="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                <input 
                                                    type="text" 
                                                    value={data.phone} 
                                                    onChange={(e) => setData("phone", e.target.value)} 
                                                    placeholder="017..." 
                                                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-[12px] mt-1">{errors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Opening Balance / Previous Due</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-[12px]">TK.</span>
                                                <input 
                                                    type="number" step="0.01" 
                                                    value={data.opening_balance} 
                                                    onChange={(e) => setData("opening_balance", e.target.value)} 
                                                    placeholder="0.00" 
                                                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] font-semibold text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                            {errors.opening_balance && <p className="text-red-500 text-[12px] mt-1">{errors.opening_balance}</p>}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Physical Address / Office Location</label>
                                            <textarea 
                                                value={data.address} 
                                                onChange={(e) => setData("address", e.target.value)} 
                                                placeholder="Enter full address here..." 
                                                rows="3" 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            ></textarea>
                                            {errors.address && <p className="text-red-500 text-[12px] mt-1">{errors.address}</p>}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Vendor" : "Save Vendor"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}