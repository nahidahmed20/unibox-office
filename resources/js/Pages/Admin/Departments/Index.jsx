import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ departments = { data: [], links: [] } }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 25);
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        description: ''
    });

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            params.per_page = perPage;

            router.get(
                route('admin.departments.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Copy Data ---
    const handleCopy = () => {
        if (!departments.data || !departments.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = departments.data
            .map((d) => `${d.name}\t${d.description || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    // --- Export CSV ---
    const handleExportCSV = () => {
        if (!departments.data || !departments.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Department Name,Description\n"];
        const rows = departments.data.map(d => `"${d.name}","${d.description || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Departments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    // --- Custom Print ---
    const handlePrint = () => {
        window.print();
    };

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            name: '',
            description: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (department) => {
        clearErrors();
        setData({
            id: department?.id || '',
            name: department?.name || '',
            description: department?.description || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (department) => {
        setSelectedDepartment(department);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.departments.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                }
            });
        } else {
            post(route('admin.departments.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This department will be deleted permanently!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.departments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Department removed successfully.", timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Departments Management" />

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

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-2">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Organization Structure
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Department Workspace</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Manage and track all company departments effectively.</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-building text-[14px]"></i>
                            </div>
                            Department Directory
                        </div>
                        {hasPermission('create_department') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Add New Department
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        
                        <div className="flex flex-wrap items-center gap-3">
                            
                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button type="button" onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search departments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white font-medium"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Department Name</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[50%]">Description</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {departments.data && departments.data.length > 0 ? (
                                    departments.data.map((department, index) => (
                                        <tr key={department.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                {departments.from ? departments.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-gray-900 text-[14.5px]">{department.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium whitespace-normal leading-relaxed">
                                                {department.description ? department.description : <span className="text-gray-400 italic">No description provided</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_department') && (
                                                        <button onClick={() => openViewModal(department)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_department') && (
                                                        <button onClick={() => openEditModal(department)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Department">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_department') && (
                                                        <button onClick={() => handleDelete(department.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Department">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-building text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No departments found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or add a new department.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {departments.links && departments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {departments.total > 0 && `Showing ${departments.from || 0} to ${departments.to || 0} of ${departments.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {departments.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
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

            {/* --- WIDE & MODERN VIEW DETAILS MODAL --- */}
            {showViewModal && selectedDepartment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Executive Header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">🏢</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className="fa-solid fa-building"></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-sitemap"></i> Department Profile
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {selectedDepartment.name}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            Corporate Division & Functional Unit
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowViewModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-800/80 border border-slate-700 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6 overflow-y-auto custom-table-scroll">
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">Department Name</span>
                                <div className="text-[18px] font-black text-gray-900">{selectedDepartment.name}</div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Description</span>
                                <div className="text-gray-700 text-[14px] leading-relaxed whitespace-pre-line font-medium bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[80px]">
                                    {selectedDepartment.description || <span className="italic text-gray-400">No description provided for this department.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs cursor-pointer"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIDE & MODERN CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">🏢</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-building'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-sitemap"></i> {editMode ? 'Department Update' : 'New Department'}
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {editMode ? "Update Department" : "Add New Department"}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            {editMode
                                                ? "Update corporate department name and responsibilities"
                                                : "Register new business unit for staff and project allocation"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-800/80 border border-slate-700 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Department Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="e.g. Human Resources"
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                        required
                                        autoFocus
                                    />
                                    {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description</label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        placeholder="Brief description about the department..."
                                        rows="4"
                                        className="w-full rounded-xl border border-gray-300 bg-white p-4 text-[14px] font-medium text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y min-h-[100px] shadow-sm"
                                    ></textarea>
                                    {errors.description && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.description}</p>}
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 px-7 py-2.5 text-[13.5px] font-black text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                                >
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Department" : "Save Department"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
