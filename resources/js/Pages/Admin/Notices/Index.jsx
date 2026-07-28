import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

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

export default function Index({ notices = { data: [], links: [] } }) {
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
        title: '',
        content: '',
        is_active: '1' // Using string for select dropdown consistency (1 = active, 0 = inactive)
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
                route('admin.notices.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // Handle both paginated object or flat array
    const recordList = notices.data || (Array.isArray(notices) ? notices : []);

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map((n) => `${n.title}\t${n.creator?.name || "Admin"}\t${new Date(n.created_at).toLocaleDateString()}\t${n.is_active ? "Active" : "Inactive"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const rows = [
            ['Title', 'Posted By', 'Date', 'Status'],
            ...recordList.map(n => [
                `"${n.title}"`,
                `"${n.creator?.name ?? 'Admin'}"`,
                new Date(n.created_at).toLocaleDateString(),
                n.is_active ? "Active" : "Inactive"
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Notice_Board_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExcel = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            recordList.map(n => ({
                "Title": n.title,
                "Posted By": n.creator?.name ?? 'Admin',
                "Date": new Date(n.created_at).toLocaleDateString(),
                "Status": n.is_active ? "Active" : "Inactive"
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Notices");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Notice_Board_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePDF = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Title', 'Posted By', 'Date', 'Status']],
            body: recordList.map(n => [
                n.title,
                n.creator?.name ?? 'Admin',
                new Date(n.created_at).toLocaleDateString(),
                n.is_active ? "Active" : "Inactive"
            ])
        });
        doc.save(`Notice_Board_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Notice Board Report</title>
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
                    <h2 class="report-title">Company Notice Board</h2>
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
            title: '',
            content: '',
            is_active: '1'
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (record) => {
        clearErrors();
        setData({
            id: record.id,
            title: record.title || '',
            content: record.content || '',
            is_active: record.is_active ? '1' : '0'
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

        const payload = {
            ...data,
            is_active: data.is_active === '1'
        };

        if (editMode) {
            put(route('admin.notices.update', data.id), {
                data: payload,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.notices.store'), {
                data: payload,
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Posted Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Notice?',
            text: "This notice will be permanently deleted!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.notices.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "The notice has been removed.", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    const getStatusStyles = (isActive) => {
        if (isActive) return { bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700', label: 'Active' };
        return { bg: 'bg-red-50 border-red-200', color: 'text-red-700', label: 'Inactive' };
    };

    return (
        <AdminLayout>
            <Head title="Company Notices" />

            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Notice Board</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage and broadcast company announcements and policies.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-bullhorn text-[var(--accent)]"></i> Company Notices
                        </div>
                        {hasPermission('create_notice') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                            <i className="fa-solid fa-plus"></i> Post Notice
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
                                <button type="button" onClick={handleExcel} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> Excel
                                </button>
                                <button type="button" onClick={handleCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-csv text-teal-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePDF} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-pdf text-rose-500"></i> PDF
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
                                placeholder="Search notices..."
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
                                    <th className="px-6 py-4 w-[40%]">TITLE</th>
                                    <th className="px-6 py-4">POSTED BY</th>
                                    <th className="px-6 py-4">DATE</th>
                                    <th className="px-6 py-4 text-center">STATUS</th>
                                    <th className="px-6 py-4 text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {recordList.length > 0 ? (
                                    recordList.map((record, index) => {
                                        const statusStyle = getStatusStyles(record.is_active);
                                        return (
                                            <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {notices.from ? notices.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-normal leading-relaxed">{record.title}</td>
                                                <td className="px-6 py-4 font-medium text-gray-700">{record.creator?.name || 'Admin'}</td>
                                                <td className="px-6 py-4 font-medium text-gray-600">
                                                    <i className="fa-regular fa-calendar mr-1.5 text-gray-400"></i>{new Date(record.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.color}`}>
                                                        {statusStyle.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {hasPermission('view_notice') && (
                                                            <button onClick={() => openViewModal(record)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_notice') && (
                                                            <button onClick={() => openEditModal(record)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_notice') && (
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
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-bullhorn text-4xl text-gray-300 mb-3"></i>
                                                <p>No notices found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {notices.links && notices.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {notices.total > 0 && `Showing ${notices.from || 0} to ${notices.to || 0} of ${notices.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {notices.links.map((link, index) => (
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
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-regular fa-envelope-open text-[var(--accent)]"></i> Notice Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="text-center mb-6">
                                <div className="text-[20px] font-extrabold text-gray-900 leading-tight">
                                    {selectedRecord.title}
                                </div>
                                <div className="text-[13px] font-medium text-gray-500 mt-2">
                                    Posted by <span className="text-blue-600 font-bold">{selectedRecord.creator?.name || "Admin"}</span> on <i className="fa-regular fa-calendar ml-1 mr-0.5"></i> {new Date(selectedRecord.created_at).toLocaleDateString()}
                                </div>
                                <span className={`inline-flex mt-3 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(selectedRecord.is_active).bg} ${getStatusStyles(selectedRecord.is_active).color}`}>
                                    {getStatusStyles(selectedRecord.is_active).label}
                                </span>
                            </div>

                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">Notice Content</span>
                                <div className="text-gray-800 leading-relaxed text-[14.5px] whitespace-pre-wrap">
                                    {selectedRecord.content || <span className="italic text-gray-400">No content available.</span>}
                                </div>
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
                                {editMode ? "📝 Edit Notice" : "✨ Post New Notice"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">

                                <div className="mb-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Notice Title *</label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        placeholder="Enter the subject or title"
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        required
                                    />
                                    {errors.title && <p className="text-red-500 text-[12px] mt-1">{errors.title}</p>}
                                </div>

                                <div className="mb-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Notice Content *</label>
                                    <textarea
                                        value={data.content}
                                        onChange={e => setData('content', e.target.value)}
                                        placeholder="Type the detailed announcement here..."
                                        rows="6"
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-y min-h-[120px] transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        required
                                    ></textarea>
                                    {errors.content && <p className="text-red-500 text-[12px] mt-1">{errors.content}</p>}
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Status</label>
                                    <select
                                        value={data.is_active}
                                        onChange={e => setData('is_active', e.target.value)}
                                        className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                    >
                                        <option value="1">Active (Published)</option>
                                        <option value="0">Inactive (Draft / Hidden)</option>
                                    </select>
                                    {errors.is_active && <p className="text-red-500 text-[12px] mt-1">{errors.is_active}</p>}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? "Saving..." : (editMode ? "Update Notice" : "Publish Notice")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
