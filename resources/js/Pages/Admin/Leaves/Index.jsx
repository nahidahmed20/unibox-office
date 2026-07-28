import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ leaves = { data: [], links: [] }, users = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        user_id: '',
        type: 'Casual',
        start_date: '',
        end_date: '',
        total_days: 1,
        reason: '',
        status: 'pending'
    });

    const recordList = leaves.data || [];

    // Auto Calculate Total Days
    useEffect(() => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            const timeDiff = end.getTime() - start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            setData('total_days', daysDiff > 0 ? daysDiff : 0);
        }
    }, [data.start_date, data.end_date]);

    // Live Search & Pagination Sync
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;

            router.get(route('admin.leaves.index'), params, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map(lv => `${lv.user?.name || "N/A"}\t${lv.type}\t${lv.start_date}\t${lv.end_date}\t${lv.total_days} Days\t${lv.status.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Employee Name,Leave Type,Start Date,End Date,Total Days,Reason,Status\n"];
        const rows = recordList.map(lv => `"${lv.user?.name || ''}","${lv.type}","${lv.start_date}","${lv.end_date}","${lv.total_days}","${lv.reason || ''}","${lv.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Leave_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Leave Report</title>
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
                    <h2 class="report-title">Employee Leave Report</h2>
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
            user_id: '',
            type: 'Casual',
            start_date: '',
            end_date: '',
            total_days: 1,
            reason: '',
            status: 'pending'
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (leave) => {
        clearErrors();
        setData({ ...leave, reason: leave.reason || '' });
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
            put(route('admin.leaves.update', data.id), {
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.leaves.store'), {
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Applied!', timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Leave Record?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete'
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route('admin.leaves.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    // Status Styling Generator (Tailwind Classes)
    const getStatusStyles = (status) => {
        const styles = {
            approved: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Approved', icon: 'fa-circle-check' },
            rejected: { bg: 'bg-red-50 text-red-600 border-red-200', label: 'Rejected', icon: 'fa-circle-xmark' },
            pending: { bg: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Pending', icon: 'fa-clock' }
        };
        return styles[status] || { bg: 'bg-gray-100 text-gray-600 border-gray-200', label: status, icon: 'fa-circle-dot' };
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
            fontSize: "14px",
            background: editMode && state.isDisabled ? "#f1f5f9" : "#fff",
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Leave Applications Ledger" />

            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Leave Applications Ledger</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage employee leave requests, approvals, and history.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-calendar-minus text-[var(--accent)]"></i> Leave Records
                        </div>
                        {hasPermission('create_leave') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                            <i className="fa-solid fa-plus"></i> Apply Leave
                        </button>
                        )}
                    </div>

                    {/* Toolbar / Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
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

                            {/* Export Buttons */}
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

                        {/* Search Box */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search employee..."
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
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-center">Duration</th>
                                    <th className="px-6 py-4 text-center">Days</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {recordList.length > 0 ? (
                                    recordList.map((lv, index) => {
                                        const statusStyle = getStatusStyles(lv.status);
                                        return (
                                            <tr key={lv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {leaves.from ? leaves.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{lv.user?.name || 'Unknown'}</td>
                                                <td className="px-6 py-4 font-medium text-gray-700">
                                                    <span className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 text-[10.5px] font-bold text-gray-600 border border-gray-200 tracking-wider">
                                                        {lv.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-600 font-medium">
                                                    <div>{lv.start_date}</div>
                                                    <div className="text-[11px] text-gray-400 italic">to</div>
                                                    <div>{lv.end_date}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-800">
                                                    <div className="inline-flex items-center justify-center min-w-[32px] h-8 bg-white border border-gray-200 rounded-md shadow-sm">
                                                        {lv.total_days}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyle.bg}`}>
                                                        <i className={`fa-solid ${statusStyle.icon}`}></i> {statusStyle.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {hasPermission('view_leave') && (
                                                            <button onClick={() => openViewModal(lv)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_leave') && (
                                                            <button onClick={() => openEditModal(lv)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_leave') && (
                                                            <button onClick={() => handleDelete(lv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
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
                                                <i className="fa-regular fa-calendar-xmark text-4xl text-gray-300 mb-3"></i>
                                                <p>No leave applications found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {leaves.links && leaves.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {leaves.total > 0 && `Showing ${leaves.from || 0} to ${leaves.to || 0} of ${leaves.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {leaves.links.map((link, index) => (
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
                                <i className="fa-regular fa-file-lines text-[var(--accent)]"></i> Application Summary
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="text-center mb-6">
                                <div className="text-[20px] font-extrabold text-gray-900">
                                    {selectedRecord.user?.name || "N/A"}
                                </div>
                                <div className="text-[13.5px] font-medium text-gray-500 mt-1">
                                    {selectedRecord.type} Leave Request
                                </div>

                                <span className={`inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusStyles(selectedRecord.status).bg}`}>
                                    <i className={`fa-solid ${getStatusStyles(selectedRecord.status).icon}`}></i> {getStatusStyles(selectedRecord.status).label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Start Date</span>
                                    <div className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-check text-blue-500"></i>{selectedRecord.start_date}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">End Date</span>
                                    <div className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-xmark text-rose-500"></i>{selectedRecord.end_date}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 mb-5 flex justify-between items-center">
                                 <span className="text-[13px] font-bold uppercase tracking-wider text-sky-800">Total Duration</span>
                                 <div className="text-[20px] font-extrabold text-sky-900">{selectedRecord.total_days} Days</div>
                            </div>

                            {selectedRecord.reason && (
                                <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Reason / Comments</span>
                                    <div className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line">
                                        {selectedRecord.reason}
                                    </div>
                                </div>
                            )}
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
                                {editMode ? "📝 Edit Leave Application" : "✨ Apply for Leave"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">

                                <div className="mb-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Employee *</label>
                                    <Select
                                        options={users.map((u) => ({ value: u.id, label: u.name }))}
                                        value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                        onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                        placeholder="-- Choose Employee --"
                                        isSearchable
                                        isClearable
                                        styles={selectStyles}
                                        isDisabled={editMode}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {errors.user_id && <p className="text-red-500 text-[12px] mt-1">{errors.user_id}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Leave Type *</label>
                                        <select
                                            value={data.type}
                                            onChange={e => setData('type', e.target.value)}
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        >
                                            <option value="Casual">Casual Leave</option>
                                            <option value="Sick">Sick Leave</option>
                                            <option value="Earned">Earned Leave</option>
                                            <option value="Maternity">Maternity Leave</option>
                                            <option value="Paternity">Paternity Leave</option>
                                            <option value="Unpaid">Unpaid Leave</option>
                                        </select>
                                        {errors.type && <p className="text-red-500 text-[12px] mt-1">{errors.type}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Approval Status *</label>
                                        <select
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                        {errors.status && <p className="text-red-500 text-[12px] mt-1">{errors.status}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Start Date *</label>
                                        <input
                                            type="date"
                                            value={data.start_date}
                                            onChange={e => setData('start_date', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">End Date *</label>
                                        <input
                                            type="date"
                                            value={data.end_date}
                                            onChange={e => setData('end_date', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-teal-700 mb-1.5">Total Days</label>
                                        <input
                                            type="number"
                                            value={data.total_days}
                                            className="w-full rounded-lg border border-teal-300 bg-teal-50 px-3.5 py-2.5 text-[15px] font-bold text-teal-800 outline-none cursor-not-allowed"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Reason / Comments</label>
                                    <textarea
                                        value={data.reason}
                                        onChange={e => setData('reason', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-y min-h-[80px] transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        placeholder="Briefly state the reason..."
                                    ></textarea>
                                    {errors.reason && <p className="text-red-500 text-[12px] mt-1">{errors.reason}</p>}
                                </div>

                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing || data.total_days <= 0} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? "Saving..." : (editMode ? "Update Details" : "Submit Request")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
