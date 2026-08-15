import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ projects = { data: [], links: [] }, clients = [], managers = [], is_super_admin = false }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);

    const [filterClient, setFilterClient] = useState(() => new URLSearchParams(window.location.search).get("client_id") || "");
    const [showClientFilterDropdown, setShowClientFilterDropdown] = useState(false);
    const [clientFilterSearch, setClientFilterSearch] = useState("");

    const [filterStatus, setFilterStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "");
    const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);

    const filterRef = useRef(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowClientFilterDropdown(false);
                setShowStatusFilterDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;
            if (filterClient) params.client_id = filterClient;
            if (filterStatus) params.status = filterStatus;

            router.get(route("admin.projects.index"), params, {
                preserveState: true, replace: true, preserveScroll: true
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage, filterClient, filterStatus]);

    // Derived Totals
    const totalProjectsBudget = projects.data.reduce((acc, curr) => acc + Number(curr.budget || 0), 0);
    const activeProjectsCount = projects.data.filter(p => p.status === 'in_progress').length;

    const handleCopy = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = projects.data
            .map((p) => `${p.title}\t${p.client?.name || "N/A"}\t${p.budget || "0"}\t${p.status?.toUpperCase()}\t${p.deadline || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText("Title\tClient\tBudget\tStatus\tDeadline\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Project Title,Client,Budget,Status,Start Date,Deadline\n"];
        const rows = projects.data.map(p => `"${p.title}","${p.client?.name || ''}","${p.budget || ''}","${p.status}","${p.start_date || '-'}","${p.deadline || '-'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Projects_Directory_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Projects Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>Projects Directory Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const handleQuickStatusChange = (projectId, newStatus) => {
        router.patch(route("admin.projects.update-status", projectId), { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status updated!', showConfirmButton: false, timer: 1500 }); },
            onError: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Failed to update status', showConfirmButton: false, timer: 2000 }); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?", text: "This project will be deleted permanently!", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Yes, Delete"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    const openViewModal = (project) => { setSelectedProject(project); setShowViewModal(true); };

    const getStatusStyles = (status) => {
        const styles = { planning: "bg-gray-100 text-gray-600 border-gray-200", in_progress: "bg-blue-100 text-blue-700 border-blue-200", completed: "bg-emerald-100 text-emerald-700 border-emerald-200", on_hold: "bg-red-100 text-red-700 border-red-200" };
        return styles[status] || styles.planning;
    };

    const getPriorityStyles = (priority) => {
        const styles = { low: "bg-gray-100 text-gray-500 border-gray-200", medium: "bg-sky-50 text-sky-600 border-sky-200", high: "bg-amber-50 text-amber-600 border-amber-200", urgent: "bg-rose-50 text-rose-600 border-rose-200" };
        return styles[priority] || styles.medium;
    };

    const statusOptions = [
        { value: "planning", label: "Planning" }, { value: "in_progress", label: "In Progress" },
        { value: "on_hold", label: "On Hold" }, { value: "completed", label: "Completed" }
    ];

    return (
        <AdminLayout>
            <Head title="Projects Management" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12">

                {/* Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Operations
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Project Workspace</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Manage, track, and oversee client projects seamlessly from start to completion.
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-indigo-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
                                <i className="fa-solid fa-layer-group text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Projects Listed</p>
                                <h3 className="text-[26px] font-black text-gray-900 m-0 tracking-tight tabular-nums">{projects?.total || 0}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-200">
                                <i className="fa-solid fa-chart-line text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-blue-600/90">Active (In Progress)</p>
                                <h3 className="text-[26px] font-black text-blue-700 m-0 tabular-nums tracking-tight">{activeProjectsCount} Projects</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
                                <i className="fa-solid fa-hand-holding-dollar text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-emerald-600/90">Total Value (Current View)</p>
                                <h3 className="text-[26px] font-black text-emerald-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalProjectsBudget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-layer-group text-[14px]"></i>
                            </div>
                            Project Directory
                        </div>
                        {hasPermission('create_project') && (
                            <Link href={route('admin.projects.create')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Add New Project
                            </Link>
                        )}
                    </div>

                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100" ref={filterRef}>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Client Filter Dropdown */}
                            <div className="relative w-full sm:w-[260px]">
                                <div onClick={() => { setShowClientFilterDropdown(!showClientFilterDropdown); setShowStatusFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] hover:bg-gray-50 transition-shadow shadow-sm font-medium">
                                    <span className={filterClient ? 'text-indigo-600 font-bold' : 'text-gray-500'}>
                                        {filterClient ? (clients.find(c => c.id == filterClient)?.name || "All Clients") : "Filter by Client"}
                                    </span>
                                    {filterClient ? (
                                        <i className="fa-solid fa-times text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterClient(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-gray-400"></i>
                                    )}
                                </div>
                                {showClientFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1 flex max-h-[280px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
                                        <div className="border-b border-gray-100 bg-gray-50 p-2 relative">
                                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                                            <input type="text" placeholder="Search client..." value={clientFilterSearch} onChange={(e) => setClientFilterSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-[13px] outline-none focus:border-indigo-500" autoFocus />
                                        </div>
                                        <div className="overflow-y-auto py-1 custom-table-scroll">
                                            <div onClick={() => { setFilterClient(""); setShowClientFilterDropdown(false); }} className="cursor-pointer px-4 py-2 text-[13px] text-gray-700 hover:bg-indigo-50 font-medium">All Clients</div>
                                            {clients.filter(c => c.name.toLowerCase().includes(clientFilterSearch.toLowerCase())).map(c => (
                                                <div key={c.id} onClick={() => { setFilterClient(c.id); setShowClientFilterDropdown(false); setClientFilterSearch(""); }} className={`cursor-pointer px-4 py-2 text-[13px] hover:bg-indigo-50 ${filterClient == c.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 font-medium'}`}>{c.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Filter Dropdown */}
                            <div className="relative w-full sm:w-[200px]">
                                <div onClick={() => { setShowStatusFilterDropdown(!showStatusFilterDropdown); setShowClientFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] hover:bg-gray-50 transition-shadow shadow-sm font-medium">
                                    <span className={filterStatus ? 'text-indigo-600 font-bold' : 'text-gray-500'}>
                                        {filterStatus ? (statusOptions.find(s => s.value === filterStatus)?.label || "All Status") : "Filter by Status"}
                                    </span>
                                    {filterStatus ? (
                                        <i className="fa-solid fa-times text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-gray-400"></i>
                                    )}
                                </div>
                                {showStatusFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
                                        <div className="overflow-y-auto py-1">
                                            <div onClick={() => { setFilterStatus(""); setShowStatusFilterDropdown(false); }} className="cursor-pointer px-4 py-2.5 text-[13px] text-gray-700 hover:bg-indigo-50 font-medium">All Status</div>
                                            {statusOptions.map(s => (
                                                <div key={s.value} onClick={() => { setFilterStatus(s.value); setShowStatusFilterDropdown(false); }} className={`cursor-pointer px-4 py-2.5 text-[13px] hover:bg-indigo-50 ${filterStatus === s.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 font-medium'}`}>{s.label}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                            <div className="relative w-full sm:w-[280px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                                <input type="text" placeholder="Search project or client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" />
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-white px-6 py-3 border-b border-gray-100 justify-between items-center text-[13.5px] text-gray-600">
                        <div className="flex items-center gap-2.5">
                            <span className="font-medium text-gray-500">Rows per page:</span>
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="appearance-none text-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-1 text-[13px] font-bold outline-none cursor-pointer">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value="all">All</option>
                            </select>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5 w-[25%]">Project Details</th>
                                    <th className="px-6 py-4.5">Client & Manager</th>
                                    <th className="px-6 py-4.5 text-right">Value / Budget</th>
                                    <th className="px-6 py-4.5 text-center">Status & Progress</th>
                                    <th className="px-6 py-4.5 text-center no-print w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {projects.data && projects.data.length > 0 ? (
                                    projects.data.map((project, index) => {
                                        const isCompleted = project.status === 'completed';
                                        const canModify = !isCompleted || isSuperAdmin;

                                        return (
                                            <tr key={project.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-400">{projects.from ? projects.from + index : index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[14.5px] text-gray-900 truncate max-w-[300px]" title={project.title}>
                                                        {project.title}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {project.priority && <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border ${getPriorityStyles(project.priority)}`}>{project.priority}</span>}
                                                        <span className="text-[11.5px] text-gray-500 font-medium flex items-center gap-1"><i className="fa-regular fa-calendar text-[10px]"></i> Deadline: {project.deadline || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-indigo-700 text-[13.5px]">{project.client?.name || <span className="text-gray-400 italic">No Client</span>}</div>
                                                    <div className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1.5"><i className="fa-solid fa-user-tie text-[10px] opacity-70"></i> {project.project_manager?.name || 'Unassigned'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-black text-gray-900 text-[15px] tabular-nums bg-gray-50 px-2 py-1 rounded inline-block border border-gray-100">
                                                        {project.budget ? `৳ ${Number(project.budget).toLocaleString('en-IN')}` : <span className="text-gray-400 text-[13px] font-medium italic">No budget set</span>}
                                                    </div>
                                                    {project.quantity && (
                                                        <div className="text-[11.5px] font-semibold text-gray-500 mt-1">
                                                            {Number(project.quantity).toLocaleString()} {project.unit_type}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 w-[180px]">
                                                    <select value={project.status} onChange={(e) => handleQuickStatusChange(project.id, e.target.value)} disabled={!canModify} className={`w-full appearance-none bg-white border px-3 py-1.5 mb-2 rounded-lg text-[11px] font-bold uppercase tracking-wider outline-none text-center shadow-sm ${canModify ? 'cursor-pointer focus:ring-2 focus:ring-indigo-500/20' : 'cursor-not-allowed opacity-80'} ${getStatusStyles(project.status)}`}>
                                                        <option value="planning">Planning</option><option value="in_progress">In Progress</option>
                                                        <option value="on_hold">On Hold</option><option value="completed">Completed</option>
                                                    </select>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${project.progress || 0}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500 mt-1 block text-right">{project.progress || 0}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-right no-print">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_project') && (
                                                            <button onClick={() => openViewModal(project)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {canModify ? (
                                                            <>
                                                                {hasPermission('edit_project') && (
                                                                    <Link href={route('admin.projects.edit', project.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                    </Link>
                                                                )}
                                                                {hasPermission('delete_project') && (
                                                                    <button onClick={() => handleDelete(project.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold text-gray-500 uppercase tracking-wider"><i className="fa-solid fa-lock text-[10px]"></i> Locked</div>
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
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-layer-group text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No projects found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or create a new project.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {projects.links && projects.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing {projects.from || 0} to {projects.to || 0} of {projects.total || 0} projects
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {projects.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : link.url
                                                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'
                                            }
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

            {/* --- STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* 🟢 Premium Profile Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-black opacity-10 -translate-x-5 translate-y-5"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl shadow-lg ring-1 ring-white/30">
                                    <i className="fa-regular fa-folder-open"></i>
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedProject.status === 'completed' ? 'bg-emerald-500 text-white' : selectedProject.status === 'in_progress' ? 'bg-blue-500 text-white' : 'bg-white/20 text-white'}`}>
                                            {selectedProject.status.replace('_', ' ')}
                                        </span>
                                        {selectedProject.priority && <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white">Priority: {selectedProject.priority}</span>}
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">{selectedProject.title}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">

                            {/* Top Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-user-tie mr-1 text-indigo-400"></i> Client</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedProject.client?.name || "N/A"}</div>
                                    {selectedProject.client?.company_name && <div className="text-[12px] text-gray-500 mt-0.5">{selectedProject.client.company_name}</div>}
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-user-shield mr-1 text-blue-400"></i> Project Manager</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedProject.project_manager?.name || "Unassigned"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-rose-400"></i> Timeline</span>
                                    <div className="font-bold text-gray-900 text-[13px]">{selectedProject.start_date || "-"} &rarr; {selectedProject.deadline || "-"}</div>
                                </div>
                            </div>

                            {/* Middle Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-chart-pie text-emerald-500 mr-1.5"></i> Financials</span>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-500 font-semibold text-[13px]">Total Budget:</span>
                                        <span className="font-black text-emerald-700 text-[18px] bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 tabular-nums">
                                            {selectedProject.budget ? `৳ ${Number(selectedProject.budget).toLocaleString('en-IN')}` : "Not Set"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-semibold text-[13px]">Quantity / Units:</span>
                                        <span className="font-bold text-gray-800 text-[14.5px]">{selectedProject.quantity ? `${Number(selectedProject.quantity).toLocaleString()} ${selectedProject.unit_type}` : "N/A"}</span>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-spinner text-blue-500 mr-1.5"></i> Task Progress</span>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[13px] font-bold text-gray-600">Completion Level</span>
                                        <span className={`text-[20px] font-black ${selectedProject.progress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{selectedProject.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${selectedProject.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} style={{ width: `${selectedProject.progress || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Description Box */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-3 border-b border-gray-100 pb-2"><i className="fa-solid fa-align-left text-gray-400 mr-1.5"></i> Project Description</span>
                                <div className="text-gray-600 text-[14.5px] leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[100px]">
                                    {selectedProject.description || <span className="italic text-gray-400">No description provided for this project.</span>}
                                </div>
                            </div>

                            {/* Links / Resources Box */}
                            {(selectedProject.repo_link || selectedProject.live_url) && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-link text-gray-400 mr-1.5"></i> External Links & Resources</span>
                                    <div className="flex flex-wrap gap-4">
                                        {selectedProject.repo_link && (
                                            <a href={selectedProject.repo_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[13.5px] font-bold transition-colors shadow-sm">
                                                <i className="fa-brands fa-github text-[16px]"></i> Code Repository
                                            </a>
                                        )}
                                        {selectedProject.live_url && (
                                            <a href={selectedProject.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl text-[13.5px] font-bold transition-colors shadow-sm">
                                                <i className="fa-solid fa-globe text-[16px]"></i> Live Preview URL
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

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
        </AdminLayout>
    );
}
