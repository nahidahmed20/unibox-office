import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

const Taka = ({ className = "text-[13px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 ${className}`}>৳</span>
);

// Updated DOT colors to match modern SaaS theme (Tailwind HEX equivalents)
const STATUS_DOT = { planning: "#94A3B8", in_progress: "#4F46E5", on_hold: "#EF4444", completed: "#10B981" };
const PRIORITY_DOT = { low: "#10B981", medium: "#F59E0B", high: "#F97316", urgent: "#EF4444" };

export default function Index({ projects = { data: [], links: [] }, clients = [], managers = [], is_super_admin = false }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || 25);

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
            params.per_page = perPage;
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
            showCancelButton: true, confirmButtonColor: "#EF4444", cancelButtonColor: "#64748B", confirmButtonText: "Yes, Delete"
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

    // Modernized Status Badge Styles
    const getStatusStyles = (status) => {
        const styles = {
            planning: "bg-slate-100 text-slate-600 border-slate-200",
            in_progress: "bg-indigo-50 text-indigo-600 border-indigo-200",
            completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
            on_hold: "bg-red-50 text-red-600 border-red-200",
        };
        return styles[status] || styles.planning;
    };

    // Modernized Priority Badge Styles
    const getPriorityStyles = (priority) => {
        const styles = {
            low: "bg-emerald-50 text-emerald-600 border-emerald-200",
            medium: "bg-amber-50 text-amber-600 border-amber-200",
            high: "bg-orange-50 text-orange-600 border-orange-200",
            urgent: "bg-red-50 text-red-600 border-red-200",
        };
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
                .custom-table-scroll::-webkit-scrollbar-track { background: #F8FAFC; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-slate-200">
                    <div>
                        <p className="text-[13px] font-semibold text-slate-500 mb-1">Operations</p>
                        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Project workspace</h1>
                        <p className="text-[14px] text-slate-500 mt-2 max-w-lg">Manage, track, and oversee client projects from start to completion.</p>
                    </div>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="p-6">
                        <p className="text-[12px] font-semibold text-slate-500 mb-2">Total projects listed</p>
                        <h3 className="font-mono text-[26px] font-bold text-slate-900 tabular-nums">{projects?.total || 0}</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-[12px] font-semibold text-slate-500 mb-2">Active — in progress</p>
                        <h3 className="font-mono text-[26px] font-bold text-indigo-600 tabular-nums">{activeProjectsCount}</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-[12px] font-semibold text-slate-500 mb-2">Total value (current view)</p>
                        <h3 className="font-mono text-[26px] font-bold text-emerald-600 tabular-nums flex items-center">
                            <Taka className="text-[17px] text-emerald-600" />{totalProjectsBudget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4">
                        <div className="text-[15px] font-semibold text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-layer-group text-[14px]"></i>
                            </div>
                            Project directory
                        </div>
                        {hasPermission('create_project') && (
                            <Link href={route('admin.projects.create')} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors shadow-sm">
                                <i className="fa-solid fa-plus"></i> New project
                            </Link>
                        )}
                    </div>

                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200" ref={filterRef}>

                        {/* Left Side: Show Rows & Filters */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Show Rows Dropdown */}
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/15 transition-colors">
                                <span className="bg-slate-50 px-4 py-2.5 text-[12px] font-semibold text-slate-500 border-r border-slate-200">
                                    Show
                                </span>
                                <div className="relative">
                                    <select
                                        value={perPage}
                                        onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13px] font-semibold text-slate-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                        style={{ backgroundImage: 'none' }}
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

                            {/* Client Filter Dropdown */}
                            <div className="relative w-full sm:w-[220px]">
                                <div onClick={() => { setShowClientFilterDropdown(!showClientFilterDropdown); setShowStatusFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] hover:border-indigo-600 transition-colors font-medium">
                                    <span className={filterClient ? 'text-indigo-600 font-semibold' : 'text-slate-500'}>
                                        {filterClient ? (clients.find(c => c.id == filterClient)?.name || "All Clients") : "Filter by client"}
                                    </span>
                                    {filterClient ? (
                                        <i className="fa-solid fa-times text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterClient(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-slate-400"></i>
                                    )}
                                </div>
                                {showClientFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1 flex max-h-[280px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                                        <div className="border-b border-slate-200 bg-slate-50 p-2 relative">
                                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]"></i>
                                            <input type="text" placeholder="Search client..." value={clientFilterSearch} onChange={(e) => setClientFilterSearch(e.target.value)} className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-2 text-[13px] outline-none focus:border-indigo-600" autoFocus />
                                        </div>
                                        <div className="overflow-y-auto py-1 custom-table-scroll">
                                            <div onClick={() => { setFilterClient(""); setShowClientFilterDropdown(false); }} className="cursor-pointer px-4 py-2 text-[13px] text-slate-800 hover:bg-slate-50 font-medium">All Clients</div>
                                            {clients.filter(c => c.name.toLowerCase().includes(clientFilterSearch.toLowerCase())).map(c => (
                                                <div key={c.id} onClick={() => { setFilterClient(c.id); setShowClientFilterDropdown(false); setClientFilterSearch(""); }} className={`cursor-pointer px-4 py-2 text-[13px] hover:bg-slate-50 ${filterClient == c.id ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-800 font-medium'}`}>{c.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Filter Dropdown */}
                            <div className="relative w-full sm:w-[160px]">
                                <div onClick={() => { setShowStatusFilterDropdown(!showStatusFilterDropdown); setShowClientFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] hover:border-indigo-600 transition-colors font-medium">
                                    <span className={filterStatus ? 'text-indigo-600 font-semibold' : 'text-slate-500'}>
                                        {filterStatus ? (statusOptions.find(s => s.value === filterStatus)?.label || "All Status") : "Filter by status"}
                                    </span>
                                    {filterStatus ? (
                                        <i className="fa-solid fa-times text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-slate-400"></i>
                                    )}
                                </div>
                                {showStatusFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                                        <div className="overflow-y-auto py-1">
                                            <div onClick={() => { setFilterStatus(""); setShowStatusFilterDropdown(false); }} className="cursor-pointer px-4 py-2.5 text-[13px] text-slate-800 hover:bg-slate-50 font-medium">All Status</div>
                                            {statusOptions.map(s => (
                                                <div key={s.value} onClick={() => { setFilterStatus(s.value); setShowStatusFilterDropdown(false); }} className={`cursor-pointer px-4 py-2.5 text-[13px] hover:bg-slate-50 ${filterStatus === s.value ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-800 font-medium'}`}>{s.label}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Search & Export */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"><i className="fas fa-print"></i> Print</button>
                            </div>
                            <div className="relative w-full sm:w-[240px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input type="text" placeholder="Search project..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-colors focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15 bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-12">
                                        SL
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[28%]">
                                        Project Details
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        Client &amp; Manager
                                    </th>
                                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        Value / Budget
                                    </th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        Status &amp; Progress
                                    </th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide no-print w-36">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {projects.data && projects.data.length > 0 ? (
                                    projects.data.map((project, index) => {
                                        const isCompleted = project.status === 'completed';
                                        const canModify = !isCompleted || isSuperAdmin;

                                        return (
                                            <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-slate-500 text-center">{projects.from ? projects.from + index : index + 1}</td>

                                                {/* Project Details Column */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                            <i className="fa-solid fa-layer-group text-[16px]"></i>
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-[14.5px] text-slate-900 truncate max-w-[280px]" title={project.title}>
                                                                {project.title}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {project.priority && (
                                                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide border ${getPriorityStyles(project.priority)}`}>
                                                                        {project.priority}
                                                                    </span>
                                                                )}
                                                                <span className="text-[11.5px] text-slate-500 font-medium flex items-center gap-1">
                                                                    <i className="fa-regular fa-calendar text-[10px]"></i> {project.deadline || "No Deadline"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Client & Manager Column */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[12px] font-bold uppercase">
                                                            {project.client?.name ? project.client.name.charAt(0) : '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 text-[13.5px]">
                                                                {project.client?.name || <span className="text-slate-400 italic font-normal">No Client</span>}
                                                            </div>
                                                            <div className="text-[11.5px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                                                                <i className="fa-solid fa-user-tie text-[10px] text-indigo-600"></i> {project.project_manager?.name || 'Unassigned'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Value / Budget */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-bold text-slate-900 text-[15px] tabular-nums">
                                                        {project.budget ? <><Taka className="text-[12px]" />{Number(project.budget).toLocaleString('en-IN')}</> : <span className="text-slate-400 text-[13px] font-medium italic font-sans">No budget set</span>}
                                                    </div>
                                                    <div className="text-[11.5px] font-medium text-slate-500 mt-1 flex justify-end items-center gap-1">
                                                        <i className="fa-solid fa-box text-[10px]"></i> {project.items?.length || 0} items
                                                    </div>
                                                </td>

                                                {/* Status & Progress */}
                                                <td className="px-6 py-4 w-[180px]">
                                                    <select
                                                        value={project.status}
                                                        onChange={(e) => handleQuickStatusChange(project.id, e.target.value)}
                                                        disabled={!canModify}
                                                        className={`w-full appearance-none border px-3 py-1.5 mb-2 rounded-md text-[11px] font-bold uppercase tracking-wide outline-none text-center ${canModify ? 'cursor-pointer focus:ring-2 focus:ring-indigo-600/20' : 'cursor-not-allowed opacity-80'} ${getStatusStyles(project.status)}`}
                                                        style={{ backgroundImage: 'none' }}
                                                    >
                                                        <option value="planning">Planning</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="on_hold">On Hold</option>
                                                        <option value="completed">Completed</option>
                                                    </select>

                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                (project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : project.progress)) === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                                            }`}
                                                            style={{ width: `${project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : project.progress)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-mono text-[10px] font-semibold text-slate-500 mt-1 block text-right">
                                                        {project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : (project.progress || 0))}%
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right no-print">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_project') && (
                                                            <button onClick={() => openViewModal(project)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900 transition-colors bg-white shadow-sm" title="View Details">
                                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {canModify ? (
                                                            <>
                                                                {hasPermission('edit_project') && (
                                                                    <Link href={route('admin.projects.edit', project.id)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-colors bg-white shadow-sm" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                    </Link>
                                                                )}
                                                                {hasPermission('delete_project') && (
                                                                    <button onClick={() => handleDelete(project.id)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-500 transition-colors bg-white shadow-sm" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-md text-[10.5px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200"><i className="fa-solid fa-lock text-[10px]"></i> Locked</div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                                    <i className="fa-solid fa-layer-group text-2xl text-slate-300"></i>
                                                </div>
                                                <p className="text-[15px] font-semibold text-slate-800">No projects found.</p>
                                                <p className="text-[13px] text-slate-500 mt-1">Try adjusting your filters or create a new project.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {projects.links && projects.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
                            <div className="text-[13px] font-medium text-slate-500">
                                Showing {projects.from || 0} to {projects.to || 0} of {projects.total || 0} projects
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {projects.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors shadow-sm
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : link.url
                                                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                    : 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'
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

            {/* View Details Modal */}
            {showViewModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

                        {/* Letterhead Header */}
                        <div className="relative bg-slate-900 px-8 py-8 shrink-0 overflow-hidden border-b border-slate-800">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors z-20">
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="font-mono text-[12px] text-slate-400">Ref. #{selectedProject.id}</span>
                                    <span className="text-white/20">·</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white capitalize">
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_DOT[selectedProject.status] || '#94A3B8' }}></span>
                                        {selectedProject.status.replace('_', ' ')}
                                    </span>
                                    {selectedProject.priority && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white capitalize">
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_DOT[selectedProject.priority] || '#94A3B8' }}></span>
                                            {selectedProject.priority} priority
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-[24px] sm:text-[27px] font-bold text-white tracking-tight leading-tight max-w-2xl">
                                    {selectedProject.title}
                                </h2>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-5">

                            {/* Top Info Strip */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                                <div className="p-5">
                                    <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Client</span>
                                    <div className="font-semibold text-slate-900 text-[14.5px]">{selectedProject.client?.name || "N/A"}</div>
                                    {selectedProject.client?.company_name && <div className="text-[12px] text-slate-500 mt-0.5">{selectedProject.client.company_name}</div>}
                                </div>
                                <div className="p-5">
                                    <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Project manager</span>
                                    <div className="font-semibold text-slate-900 text-[14.5px]">{selectedProject.project_manager?.name || "Unassigned"}</div>
                                </div>
                                <div className="p-5">
                                    <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Timeline</span>
                                    <div className="font-mono font-semibold text-slate-900 text-[13px]">{selectedProject.start_date || "-"} → {selectedProject.deadline || "-"}</div>
                                </div>
                            </div>

                            {/* Financials + Progress */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="p-6 rounded-xl border border-slate-200 shadow-sm bg-white">
                                    <span className="block text-[12px] font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">Financials</span>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[13px] text-slate-500 font-medium">Total budget</span>
                                        <span className="font-mono font-bold text-emerald-600 text-[18px] tabular-nums flex items-center">
                                            {selectedProject.budget ? <><Taka className="text-[13px] text-emerald-600" />{Number(selectedProject.budget).toLocaleString('en-IN')}</> : <span className="font-sans font-semibold text-[14px]">Not set</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] text-slate-500 font-medium">Items included</span>
                                        <span className="font-mono font-semibold text-slate-900 text-[14px]">{selectedProject.items?.length || 0}</span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl border border-slate-200 shadow-sm bg-white">
                                    <span className="block text-[12px] font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">Task progress</span>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[13px] text-slate-500 font-medium">Completion level</span>
                                        <span className={`font-mono text-[18px] font-bold ${selectedProject.progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{selectedProject.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${selectedProject.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${selectedProject.progress || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedProject.description && selectedProject.description !== '<p><br></p>' && (
                                <div className="p-6 rounded-xl border border-slate-200 shadow-sm bg-white">
                                    <span className="block text-[12px] font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">Project notes</span>
                                    <div
                                        className="text-slate-800 text-[14.5px] leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                                    />
                                </div>
                            )}

                            {/* Project Items Table */}
                            {selectedProject.items && selectedProject.items.length > 0 && (
                                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                        <span className="text-[12px] font-semibold text-slate-900">Project items</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse bg-white">
                                            <thead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-3.5 w-12">No.</th>
                                                    <th className="px-6 py-3.5">Item</th>
                                                    <th className="px-6 py-3.5 text-center">Qty / unit</th>
                                                    <th className="px-6 py-3.5 text-right">Unit price</th>
                                                    <th className="px-6 py-3.5 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[13px] text-slate-800 divide-y divide-slate-100">
                                                {selectedProject.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-mono text-slate-400">{String(idx + 1).padStart(2, "0")}</td>
                                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                                            {item.item_name}
                                                            {item.description && item.description !== '<p><br></p>' && (
                                                                <div className="text-[12px] text-slate-500 font-normal mt-1" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono text-slate-600">{Number(item.quantity).toLocaleString()} <span className="text-[10.5px] text-slate-400 uppercase ml-1 font-sans">{item.unit_type}</span></td>
                                                        <td className="px-6 py-4 text-right font-mono text-slate-600 tabular-nums"><Taka className="text-[11px] text-slate-400" />{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 tabular-nums"><Taka className="text-[11px] text-emerald-600" />{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Links / Resources */}
                            {(selectedProject.repo_link || selectedProject.live_url) && (
                                <div className="p-6 rounded-xl border border-slate-200 shadow-sm bg-white">
                                    <span className="block text-[12px] font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">External links</span>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedProject.repo_link && (
                                            <a href={selectedProject.repo_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-800 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all">
                                                <i className="fa-brands fa-github text-[15px]"></i> Code repository
                                            </a>
                                        )}
                                        {selectedProject.live_url && (
                                            <a href={selectedProject.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 text-slate-600 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all">
                                                <i className="fa-solid fa-globe text-[15px]"></i> Live preview
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-slate-900 hover:bg-black px-8 py-3 text-[14px] font-semibold text-white transition-colors shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
