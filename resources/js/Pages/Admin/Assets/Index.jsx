import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ assets = { data: [], links: [] }, users = [], accounts = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => filters.search || new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(filters.per_page) || Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        asset_code: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
        account_id: '',
        assigned_to: '',
        assigned_date: '',
        condition: 'new'
    });

    // --- Live Search & Pagination Sync ---
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
                route('admin.assets.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const assetList = assets.data || [];

    // --- Export Tools ---
    const handleCopy = () => {
        if (!assetList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = assetList
            .map((a) => `${a.name}\t${a.asset_code}\t${a.serial_number || '-'}\t${a.assignee?.name || 'Unassigned'}\t${a.purchase_price || '0'}\t${a.condition?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
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
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Asset Register</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        h2.report-title { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                        p.report-date { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <h2 class="report-title">Company Asset Register</h2>
                    <p class="report-date">Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            account_id: '',
            name: '',
            asset_code: '',
            serial_number: '',
            purchase_date: '',
            purchase_price: '',
            assigned_to: '',
            assigned_date: '',
            condition: 'new'
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (record) => {
        clearErrors();
        setData({
            id: record.id,
            name: record.name || '',
            asset_code: record.asset_code || '',
            serial_number: record.serial_number || '',
            purchase_date: record.purchase_date || '',
            purchase_price: record.purchase_price || '',
            account_id: record.account_id || '',
            assigned_to: record.assigned_to || '',
            assigned_date: record.assigned_date || '',
            condition: record.condition || 'new'
        });
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
            put(route('admin.assets.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.assets.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Asset Added Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: "This asset record will be permanently deleted! If it has a linked purchase cost, that amount will be refunded to the account.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.assets.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "The asset has been deleted.", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    // Condition Styling Generator
    const getConditionStyles = (condition) => {
        const styles = {
            new: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'New' },
            good: { bg: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Good' },
            damaged: { bg: 'bg-red-50 text-red-600 border-red-200', label: 'Damaged' },
            under_repair: { bg: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Under Repair' }
        };
        return styles[condition] || { bg: 'bg-gray-100 text-gray-500 border-gray-200', label: condition };
    };

    // React-Select Custom Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "42px",
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" },
            fontSize: "13.5px",
            background: "#fff",
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "13.5px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Asset Management" />

            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Asset Management</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Track company assets, assignments, and purchase costs.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-boxes-stacked text-[var(--accent)]"></i> Asset Records
                        </div>
                        {hasPermission('create_asset') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                            <i className="fa-solid fa-plus"></i> Add Asset
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
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button type="button" onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-csv text-emerald-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search name or asset code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4">Serial No</th>
                                    <th className="px-6 py-4">Assigned To</th>
                                    <th className="px-6 py-4 text-right">Purchase Price</th>
                                    <th className="px-6 py-4 text-center">Condition</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {assetList.length > 0 ? (
                                    assetList.map((record, index) => {
                                        const conditionStyle = getConditionStyles(record.condition);
                                        return (
                                            <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {assets.from ? assets.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-[14px]">{record.name}</div>
                                                    <div className="text-[12px] text-gray-500 mt-0.5">{record.asset_code}</div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-600">{record.serial_number || '-'}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{record.assignee?.name || 'Unassigned'}</td>
                                                <td className="px-6 py-4 text-right font-extrabold text-blue-600 text-[14px]">
                                                    {record.purchase_price ? `TK. ${parseFloat(record.purchase_price).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${conditionStyle.bg}`}>
                                                        {conditionStyle.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {hasPermission('view_asset') && (
                                                            <button onClick={() => openViewModal(record)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_asset') && (
                                                            <button onClick={() => openEditModal(record)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_asset') && (
                                                            <button onClick={() => handleDelete(record.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-boxes-stacked text-4xl text-gray-300 mb-3"></i>
                                                <p>No asset records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {assets.links && assets.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {assets.total > 0 && `Showing ${assets.from || 0} to ${assets.to || 0} of ${assets.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {assets.links.map((link, index) => (
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
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-regular fa-address-card text-[var(--accent)]"></i> Asset Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="text-center mb-6">
                                <div className="text-[22px] font-extrabold text-gray-900">
                                    {selectedRecord.name}
                                </div>
                                <div className="text-[13.5px] font-medium text-gray-500 mt-1">{selectedRecord.asset_code}</div>
                                <span className={`inline-flex mt-3 px-3.5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${getConditionStyles(selectedRecord.condition).bg}`}>
                                    {getConditionStyles(selectedRecord.condition).label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Serial Number</span>
                                    <div className="text-[14.5px] font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-barcode text-rose-400"></i>{selectedRecord.serial_number || "-"}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Assigned To</span>
                                    <div className="text-[14.5px] font-bold text-emerald-700 flex items-center gap-2">
                                        <i className="fa-solid fa-user text-emerald-500"></i>{selectedRecord.assignee?.name || "Unassigned"}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Purchase Date</span>
                                    <div className="text-[14.5px] font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar text-blue-500"></i>{selectedRecord.purchase_date || '-'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Purchase Price</span>
                                    <div className="text-[15px] font-extrabold text-blue-700">{selectedRecord.purchase_price ? `৳ ${parseFloat(selectedRecord.purchase_price).toLocaleString('en-IN')}` : "N/A"}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Paid From Account</span>
                                <div className="text-[14px] font-bold text-gray-800">{selectedRecord.account?.name || "N/A"}</div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button type="button" onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Edit Asset" : "✨ Add New Asset"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Asset Name *</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            required
                                        />
                                        {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Asset Code *</label>
                                        <input
                                            type="text"
                                            value={data.asset_code}
                                            onChange={e => setData('asset_code', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            required
                                        />
                                        {errors.asset_code && <p className="text-red-500 text-[12px] mt-1">{errors.asset_code}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Serial Number</label>
                                        <input
                                            type="text"
                                            value={data.serial_number}
                                            onChange={e => setData('serial_number', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        />
                                        {errors.serial_number && <p className="text-red-500 text-[12px] mt-1">{errors.serial_number}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Condition *</label>
                                        <select
                                            value={data.condition}
                                            onChange={e => setData('condition', e.target.value)}
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        >
                                            <option value="new">New</option>
                                            <option value="good">Good</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="under_repair">Under Repair</option>
                                        </select>
                                        {errors.condition && <p className="text-red-500 text-[12px] mt-1">{errors.condition}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={data.purchase_date}
                                            onChange={e => setData('purchase_date', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                        />
                                        {errors.purchase_date && <p className="text-red-500 text-[12px] mt-1">{errors.purchase_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Purchase Price (TK)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.purchase_price}
                                            onChange={e => setData('purchase_price', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] font-bold outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            placeholder="0.00"
                                        />
                                        {errors.purchase_price && <p className="text-red-500 text-[12px] mt-1">{errors.purchase_price}</p>}
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Paid From Account</label>
                                    <Select
                                        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                        value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                        onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                        placeholder="-- Select Account --"
                                        isSearchable
                                        isClearable
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {errors.account_id && <p className="text-red-500 text-[12px] mt-1">{errors.account_id}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-2">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Assigned To (User)</label>
                                        <Select
                                            options={users?.map(u => ({ value: u.id, label: u.name })) || []}
                                            value={users?.map(u => ({ value: u.id, label: u.name })).find(opt => opt.value === data.assigned_to) || null}
                                            onChange={option => setData('assigned_to', option ? option.value : '')}
                                            placeholder="-- Select User --"
                                            isSearchable
                                            isClearable
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.assigned_to && <p className="text-red-500 text-[12px] mt-1">{errors.assigned_to}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Assigned Date</label>
                                        <input
                                            type="date"
                                            value={data.assigned_date}
                                            onChange={e => setData('assigned_date', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                        />
                                        {errors.assigned_date && <p className="text-red-500 text-[12px] mt-1">{errors.assigned_date}</p>}
                                    </div>
                                </div>

                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? "Saving..." : (editMode ? "Update Asset" : "Save Asset")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
