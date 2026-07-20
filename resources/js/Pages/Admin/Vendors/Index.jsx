import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

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

    // --- Pay Pending Bill(s) Form (now supports multiple bill ids) ---
    const payForm = useForm({
        project_expense_ids: [],
        payment_source: 'account',
        account_id: '',
        advance_user_id: '',
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
                replace: true
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
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Vendors Directory Report</h2>
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

    // --- Derived data for the Pay Modal (multi-select bills) ---
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

    // যতগুলো বিল সিলেক্ট হবে, তাদের মোট বকেয়া অটোমেটিক Pay Amount ফিল্ডে বসবে
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
            cancelButtonColor: '#6b7280'
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
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Vendor Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage, track and communicate with your vendors.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-truck-field" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Vendor Directory
                        </div>
                        {hasPermission('create_vendor') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add New Vendor
                        </button>
                        )}
                    </div>

                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                <option value={500}>500 Entries</option>
                                <option value={1000}>1000 Entries</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Vendor Details</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Contact Info</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Financial Data</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {vendors.data && vendors.data.length > 0 ? (
                                    vendors.data.map((vendor, index) => (
                                        <tr key={vendor.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>{vendors.from ? vendors.from + index : index + 1}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{vendor.name}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}><i className="fa-regular fa-building me-1"></i> {vendor.company_name || "No Company"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ color: "#475569", fontWeight: "500" }}>{vendor.phone || "-"}</div>
                                                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>{vendor.address ? vendor.address.substring(0, 20) + '...' : "-"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: "700", color: vendor.total_due > 0 ? "#ef4444" : "#10b981", fontSize: "0.85rem" }}>
                                                    Due: TK. {Number(vendor.total_due || 0).toLocaleString()}
                                                </div>
                                                <div style={{ fontWeight: "600", color: "#7e22ce", fontSize: "0.8rem", marginTop: "4px" }}>
                                                    <i className="fa-solid fa-wallet"></i> Wallet: TK. {Number(vendor.wallet_balance || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    
                                                    {hasPermission('add_advance_vendor') && (
                                                    <button onClick={() => openWalletModal(vendor, 'deposit')} style={{ background: "#e0e7ff", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#4f46e5" }} title="Give Advance to Wallet">
                                                        <i className="fa-solid fa-plus-circle"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('return_advance_vendor') && (
                                                    <button onClick={() => openWalletModal(vendor, 'withdraw')} style={{ background: "#ffe4e6", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#be123c" }} title="Receive Refund from Wallet">
                                                        <i className="fa-solid fa-minus-circle"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('view_pay_vendor') && (
                                                    <button onClick={() => openPayModal(vendor)} style={{ background: "#fef3c7", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#d97706" }} title="Pay Due Bills">
                                                        <i className="fa-solid fa-money-bill-wave"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('view_vendors') && (
                                                    <button onClick={() => openViewModal(vendor)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Profile">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('edit_vendor') && (
                                                    <button onClick={() => openEditModal(vendor)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Vendor">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('delete_vendor') && (
                                                    <button onClick={() => handleDelete(vendor.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Vendor">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No vendors found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {vendors.links && vendors.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Showing {vendors.from || 0} to {vendors.to || 0} of {vendors.total || 0} entries</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {vendors.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), pointerEvents: link.url ? "auto" : "none", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px" }} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedVendor && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "750px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-truck-field" style={{ marginRight: "8px", color: "#2563eb" }}></i> Vendor Profile
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Vendor Name</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedVendor.name}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Company Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}>{selectedVendor.company_name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Phone Number</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}>{selectedVendor.phone || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Total Due Amount</span>
                                    <div style={{ fontWeight: "700", color: selectedVendor.total_due > 0 ? "#ef4444" : "#10b981", fontSize: "1.1rem" }}>
                                        TK. {Number(selectedVendor.total_due || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ gridColumn: "span 2", background: "#faf5ff", border: "1px solid #e9d5ff", padding: "12px", borderRadius: "8px" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#9333ea", display: "block", marginBottom: "4px" }}>Advance / Wallet Balance</span>
                                    <div style={{ fontWeight: "700", color: "#7e22ce", fontSize: "1.1rem" }}>
                                        <i className="fa-solid fa-wallet mr-2"></i> TK. {Number(selectedVendor.wallet_balance || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Physical Address</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", minHeight: "60px" }}>
                                    {selectedVendor.address || "No address provided."}
                                </div>
                            </div>

                            {/* --- PAYMENT HISTORY SECTION --- */}
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px", marginTop: "20px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "10px" }}>
                                    পেমেন্ট হিস্টরি
                                </span>

                                {(!paymentsData.data || paymentsData.data.length === 0) ? (
                                    <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px", fontSize: "0.85rem" }}>
                                        কোনো পেমেন্ট রেকর্ড নেই।
                                    </div>
                                ) : (
                                    <>
                                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", maxHeight: "260px", overflowY: "auto" }}>
                                        {paymentsData.data.map((payment) => (
                                            <div
                                                key={payment.id}
                                                style={{
                                                    padding: "12px 14px",
                                                    borderBottom: "1px solid #f1f5f9",
                                                    background: payment.status === 'voided' ? "#fef2f2" : "#fff",
                                                    opacity: payment.status === 'voided' ? 0.75 : 1
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <div>
                                                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.9rem" }}>
                                                            TK. {Number(payment.pay_amount).toLocaleString()}
                                                            {payment.status === 'voided' && (
                                                                <span style={{ marginLeft: "8px", fontSize: "0.7rem", fontWeight: "700", color: "#ef4444", background: "#fee2e2", padding: "2px 8px", borderRadius: "999px" }}>
                                                                    VOIDED
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "3px" }}>
                                                            {payment.date} · {payment.payment_source === 'account'
                                                                ? (payment.account?.name || 'Account')
                                                                : 'Employee Advance'}
                                                        </div>
                                                        {payment.details && payment.details.length > 0 && (
                                                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
                                                                বিল: {payment.details.map(d => d.expense?.title).filter(Boolean).join(', ')}
                                                            </div>
                                                        )}
                                                        {payment.wallet_credit_amount > 0 && (
                                                            <div style={{ fontSize: "0.75rem", color: "#7e22ce", marginTop: "2px" }}>
                                                                ওয়ালেটে জমা: TK. {Number(payment.wallet_credit_amount).toLocaleString()}
                                                            </div>
                                                        )}
                                                        {payment.status === 'voided' && payment.void_reason && (
                                                            <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "4px", fontStyle: "italic" }}>
                                                                কারণ: {payment.void_reason}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {payment.status !== 'voided' && hasPermission('void_vendor_payment') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openVoidModal(payment)}
                                                            style={{ background: "#fff", border: "1px solid #fecaca", color: "#ef4444", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap", marginLeft: "10px" }}
                                                            title="এই পেমেন্ট ভয়েড করুন"
                                                        >
                                                            <i className="fa-solid fa-rotate-left" style={{ marginRight: "4px" }}></i> Void
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                        {paymentsData.last_page > 1 && (
                                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                                                <button
                                                    type="button"
                                                    disabled={paymentsData.current_page <= 1}
                                                    onClick={() => fetchPayments(selectedVendor.id, paymentsData.current_page - 1)}
                                                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paymentsData.current_page <= 1 ? "not-allowed" : "pointer", opacity: paymentsData.current_page <= 1 ? 0.5 : 1 }}
                                                >
                                                    <i className="fa-solid fa-chevron-left"></i>
                                                </button>
                                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                                    Page {paymentsData.current_page} / {paymentsData.last_page}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={paymentsData.current_page >= paymentsData.last_page}
                                                    onClick={() => fetchPayments(selectedVendor.id, paymentsData.current_page + 1)}
                                                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: paymentsData.current_page >= paymentsData.last_page ? "not-allowed" : "pointer", opacity: paymentsData.current_page >= paymentsData.last_page ? 0.5 : 1 }}
                                                >
                                                    <i className="fa-solid fa-chevron-right"></i>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close Profile</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Update Vendor Details" : "✨ Register New Vendor"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Vendor Name *</label>
                                    <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="e.g. Rahim Miah" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                    {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Company Name</label>
                                    <input type="text" value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} placeholder="e.g. Rahim Printing" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.company_name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.company_name}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Phone Number</label>
                                    <input type="text" value={data.phone} onChange={(e) => setData("phone", e.target.value)} placeholder="017..." style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.phone && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.phone}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Opening Balance / Previous Due</label>
                                    <input type="number" step="0.01" value={data.opening_balance} onChange={(e) => setData("opening_balance", e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.opening_balance && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.opening_balance}</p>}
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Full Address</label>
                                    <textarea value={data.address} onChange={(e) => setData("address", e.target.value)} placeholder="Vendor's physical address" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="2"></textarea>
                                    {errors.address && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.address}</p>}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving Changes..." : "Save Vendor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PAY VENDOR MODAL (now supports multi-bill checkbox selection) --- */}
            {showPayModal && selectedVendor && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-money-check-dollar" style={{ marginRight: "8px", color: "#10b981" }}></i> Process Payment: {selectedVendor.name}
                            </h3>
                            <button type="button" onClick={() => setShowPayModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handlePaySubmit} style={{ padding: "24px" }}>

                            {/* --- Multi-bill checkbox list --- */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>বিল সিলেক্ট করুন *</label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#2563eb", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={dueBillsList.length > 0 && selectedBillIds.length === dueBillsList.length}
                                            onChange={toggleSelectAllBills}
                                        />
                                        সব সিলেক্ট করুন
                                    </label>
                                </div>

                                <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", maxHeight: "220px", overflowY: "auto" }}>
                                    {dueBillsList.map(bill => (
                                        <label
                                            key={bill.id}
                                            style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                                padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                                                background: selectedBillIds.includes(bill.id) ? "#eff6ff" : "#fff"
                                            }}
                                        >
                                            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBillIds.includes(bill.id)}
                                                    onChange={() => toggleBillSelect(bill.id)}
                                                />
                                                <span style={{ fontWeight: "500", color: "#334155" }}>{bill.title}</span>
                                            </span>
                                            <span style={{ fontWeight: "700", color: "#ef4444", fontSize: "0.85rem" }}>
                                                Due: TK. {Number(bill.due_amount).toLocaleString()}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                {selectedBillIds.length > 0 && (
                                    <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#1e40af", background: "#eff6ff", padding: "8px 12px", borderRadius: "6px" }}>
                                        {selectedBillIds.length} টি বিল সিলেক্ট করা হয়েছে — মোট বকেয়া: TK. {selectedTotalDue.toLocaleString()}
                                    </div>
                                )}
                                {payForm.errors.project_expense_ids && <span style={{color:"#ef4444", fontSize:"0.75rem", marginTop: "4px", display: "block"}}>{payForm.errors.project_expense_ids}</span>}
                            </div>

                            {/* Payment Source Radios */}
                            <div style={{ marginBottom: "20px", padding: "12px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "10px" }}>Payment Source *</label>
                                <div style={{ display: "flex", gap: "24px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#334155", fontSize: "0.9rem", fontWeight: "500" }}>
                                        <input 
                                            type="radio" name="payment_source" value="account" 
                                            checked={payForm.data.payment_source === 'account'} 
                                            onChange={() => { payForm.setData("payment_source", "account"); payForm.setData("advance_user_id", ""); }} 
                                        />
                                        Bank / Cash Account
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#334155", fontSize: "0.9rem", fontWeight: "500" }}>
                                        <input 
                                            type="radio" name="payment_source" value="advance" 
                                            checked={payForm.data.payment_source === 'advance'} 
                                            onChange={() => { payForm.setData("payment_source", "advance"); payForm.setData("account_id", ""); }} 
                                        />
                                        Employee Advance
                                    </label>
                                </div>
                            </div>

                            {/* Conditional Source Dropdowns */}
                            {payForm.data.payment_source === 'account' ? (
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Account *</label>
                                    <select 
                                        value={payForm.data.account_id} 
                                        onChange={e => payForm.setData("account_id", e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                        required
                                    >
                                        <option value="">-- Select Account --</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (Bal: {Number(acc.current_balance).toLocaleString()})</option>
                                        ))}
                                    </select>
                                    {payForm.errors.account_id && <span style={{color:"#ef4444", fontSize:"0.75rem", marginTop: "4px", display: "block"}}>{payForm.errors.account_id}</span>}
                                </div>
                            ) : (
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Employee *</label>
                                    <select 
                                        value={payForm.data.advance_user_id} 
                                        onChange={e => payForm.setData("advance_user_id", e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                        required
                                    >
                                        <option value="">-- Select Employee --</option>
                                        {advances.map(adv => (
                                            <option key={adv.id} value={adv.user_id}>{adv.user?.name} (Avail: TK. {Number(adv.available_balance).toLocaleString()})</option>
                                        ))}
                                    </select>
                                    {payForm.errors.advance_user_id && <span style={{color:"#ef4444", fontSize:"0.75rem", marginTop: "4px", display: "block"}}>{payForm.errors.advance_user_id}</span>}
                                </div>
                            )}

                            {/* Amount & Date fields */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Pay Amount (TK) *</label>
                                    <input 
                                        type="number" step="0.01" min="1" 
                                        value={payForm.data.pay_amount} 
                                        onChange={e => payForm.setData("pay_amount", e.target.value)} 
                                        placeholder="e.g. 10000"
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                        required 
                                    />
                                    {payForm.errors.pay_amount && <span style={{color:"#ef4444", fontSize:"0.75rem", marginTop: "4px", display: "block"}}>{payForm.errors.pay_amount}</span>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Date *</label>
                                    <input 
                                        type="date" 
                                        value={payForm.data.date} 
                                        onChange={e => payForm.setData("date", e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "10px 14px", borderRadius: "8px", marginBottom: "8px", fontSize: "0.8rem", color: "#92400e" }}>
                                <i className="fa-solid fa-circle-info" style={{ marginRight: "6px" }}></i>
                                টাকাটা সিলেক্ট করা বিলগুলোর মধ্যে পুরনো বিল আগে ধরে ক্রমান্বয়ে সেটেল হবে। বকেয়ার চেয়ে বেশি দিলে বাড়তি অংশ ভেন্ডরের ওয়ালেটে জমা হয়ে যাবে।
                            </div>

                            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                <button type="submit" disabled={payForm.processing} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: payForm.processing ? 0.7 : 1 }}>
                                    {payForm.processing ? "Processing..." : "Confirm Payment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VENDOR WALLET MODAL (Deposit & Withdraw) --- */}
            {showWalletModal && selectedVendor && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: walletAction === 'deposit' ? '#f5f3ff' : '#fff1f2' }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: walletAction === 'deposit' ? '#6d28d9' : '#be123c' }}>
                                {walletAction === 'deposit' ? <i className="fa-solid fa-plus-circle me-2"></i> : <i className="fa-solid fa-minus-circle me-2"></i>}
                                {walletAction === 'deposit' ? 'Add Advance to Wallet' : 'Receive Refund from Wallet'}
                            </h3>
                            <button type="button" onClick={() => setShowWalletModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        <div style={{ padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: "600", color: "#475569" }}>Vendor: {selectedVendor.name}</span>
                            <span style={{ fontWeight: "700", color: "#7e22ce" }}>Current Balance: {Number(selectedVendor.wallet_balance || 0).toLocaleString()} TK</span>
                        </div>

                        <form onSubmit={handleWalletSubmit} style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                    {walletAction === 'deposit' ? 'Pay From Account *' : 'Receive To Account *'}
                                </label>
                                <select 
                                    value={walletForm.data.account_id} 
                                    onChange={e => walletForm.setData("account_id", e.target.value)} 
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                    required
                                >
                                    <option value="">-- Select Bank/Cash Account --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Bal: {Number(acc.current_balance).toLocaleString()})</option>
                                    ))}
                                </select>
                                {walletForm.errors.account_id && <span style={{color:"#ef4444", fontSize:"0.75rem", display: "block", marginTop: "4px"}}>{walletForm.errors.account_id}</span>}
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (TK) *</label>
                                <input 
                                    type="number" step="0.01" min="1" 
                                    value={walletForm.data.amount} 
                                    onChange={e => walletForm.setData("amount", e.target.value)} 
                                    placeholder="Enter amount"
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "600" }} 
                                    required 
                                />
                                {walletForm.errors.amount && <span style={{color:"#ef4444", fontSize:"0.75rem", display: "block", marginTop: "4px"}}>{walletForm.errors.amount}</span>}
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Note / Description</label>
                                <input 
                                    type="text" 
                                    value={walletForm.data.description} 
                                    onChange={e => walletForm.setData("description", e.target.value)} 
                                    placeholder={walletAction === 'deposit' ? 'e.g., Advance for future work' : 'e.g., Refund for cancelled work'}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} 
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowWalletModal(false)} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={walletForm.processing} style={{ background: walletAction === 'deposit' ? "#6d28d9" : "#be123c", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: walletForm.processing ? 0.7 : 1 }}>
                                    {walletForm.processing ? "Processing..." : "Confirm"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VOID PAYMENT CONFIRMATION MODAL --- */}
            {showVoidModal && paymentToVoid && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "460px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#fef2f2" }}>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600", color: "#b91c1c" }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "8px" }}></i> পেমেন্ট ভয়েড করুন
                            </h3>
                            <button type="button" onClick={() => setShowVoidModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form onSubmit={handleVoidSubmit} style={{ padding: "24px" }}>
                            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.82rem", color: "#92400e" }}>
                                এই পেমেন্টটি ভয়েড করলে সংশ্লিষ্ট বিলের বকেয়া, অ্যাকাউন্ট/অ্যাডভান্স ব্যালেন্স এবং ওয়ালেট — সবকিছু আগের অবস্থায় ফিরে যাবে। এই কাজটি সরাসরি undo করা যাবে না।
                            </div>

                            <div style={{ marginBottom: "8px", fontSize: "0.85rem", color: "#334155" }}>
                                পরিমাণ: <strong>TK. {Number(paymentToVoid.pay_amount).toLocaleString()}</strong> — {paymentToVoid.date}
                            </div>

                            <div style={{ marginBottom: "16px", marginTop: "12px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                    ভয়েড করার কারণ *
                                </label>
                                <textarea
                                    value={voidForm.data.void_reason}
                                    onChange={(e) => voidForm.setData("void_reason", e.target.value)}
                                    placeholder="যেমন: ভুল অ্যাকাউন্ট সিলেক্ট হয়ে গিয়েছিল"
                                    rows="3"
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }}
                                    required
                                ></textarea>
                                {voidForm.errors.void_reason && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{voidForm.errors.void_reason}</p>}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowVoidModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>
                                    বাতিল
                                </button>
                                <button type="submit" disabled={voidForm.processing} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: voidForm.processing ? 0.7 : 1 }}>
                                    {voidForm.processing ? "প্রসেসিং..." : "নিশ্চিত ভয়েড করুন"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
