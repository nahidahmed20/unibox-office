import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import CustomSelect from '@/Components/CustomSelect';

const Taka = ({ className = "text-[13px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 ${className}`}>৳</span>
);

// Updated DOT colors to match modern SaaS theme (Tailwind HEX equivalents)
const STATUS_DOT = { planning: "#94A3B8", in_progress: "#4F46E5", on_hold: "#EF4444", completed: "#10B981" };
const PRIORITY_DOT = { low: "#10B981", medium: "#F59E0B", high: "#F97316", urgent: "#EF4444" };

export default function Index({ projects = { data: [], links: [] }, clients = [], managers = [], is_super_admin = false, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const [searchTerm, setSearchTerm] = useState(filters.search || "");
    const [perPage, setPerPage] = useState(filters.per_page || 25);

    const [filterClient, setFilterClient] = useState(filters.client_id || "");
    const [showClientFilterDropdown, setShowClientFilterDropdown] = useState(false);
    const [clientFilterSearch, setClientFilterSearch] = useState("");

    const [filterStatus, setFilterStatus] = useState(filters.status || "");
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
            title: "Are you sure?",
            text: "This project will be deleted permanently!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#EF4444",
            cancelButtonColor: "#64748B",
            confirmButtonText: "Yes, Delete"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        if (page.props.flash && page.props.flash.error) {
                            Swal.fire({ icon: "error", title: "Cannot Delete!", text: page.props.flash.error });
                        } else {
                            Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
                        }
                    },
                    onError: (errors) => {
                        Swal.fire({
                            icon: "error",
                            title: "Failed!",
                            text: errors.error || "Failed to delete the project. It may have related data."
                        });
                    }
                });
            }
        });
    };

    const openViewModal = (project) => { setSelectedProject(project); setShowViewModal(true); };

    // Modernized Status Badge Styles
    const getStatusStyles = (status) => {
        const styles = {
            planning: "bg-slate-100 text-slate-700 border-slate-300",
            in_progress: "bg-indigo-100 text-indigo-700 border-indigo-300",
            completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
            on_hold: "bg-rose-100 text-rose-700 border-rose-300",
        };
        return styles[status] || styles.planning;
    };

    // Modernized Priority Badge Styles
    const getPriorityStyles = (priority) => {
        const styles = {
            low: "bg-emerald-50 text-emerald-700 border-emerald-300",
            medium: "bg-amber-50 text-amber-700 border-amber-300",
            high: "bg-orange-50 text-orange-700 border-orange-300",
            urgent: "bg-red-50 text-red-700 border-red-300",
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
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b-2 border-slate-300">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-briefcase"></i> Operations
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Project Workspace</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Manage, track, and oversee client projects from start to completion.</p>
                    </div>
                </div>

                {/* 🟢 Premium Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 shadow-lg border border-slate-700 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-slate-300">
                                <i className="fa-solid fa-layer-group text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-slate-400">Total Projects</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums">
                                    {projects?.total || 0}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-lg border border-indigo-500 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100">
                                <i className="fa-solid fa-person-digging text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-indigo-200">Active / In Progress</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums">
                                    {activeProjectsCount}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-lg border border-emerald-500 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-100">
                                <i className="fa-solid fa-sack-dollar text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-emerald-200">Total Value (View)</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[18px] text-emerald-200 mr-1" />{totalProjectsBudget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden flex flex-col shadow-md">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700">
                                <i className="fa-solid fa-list-check text-[15px]"></i>
                            </div>
                            Project Directory
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> Export CSV
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 shadow-sm">
                                <i className="fas fa-print"></i> Print
                            </button>
                            {hasPermission('create_project') && (
                                <Link href={route('admin.projects.create')} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-[13.5px] font-bold text-white transition-colors shadow-md ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> New Project
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* 🟢 High Contrast Filters & Search Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 bg-white border-b border-slate-200" ref={filterRef}>

                        {/* Left Side: Show Rows & Filters */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 shadow-sm transition-all">
                                <span className="bg-slate-100 px-4 py-2.5 text-[12.5px] font-bold text-slate-600 border-r border-slate-300 uppercase tracking-wider">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="bg-transparent pl-4 pr-10 py-2.5 text-[14px] font-bold text-slate-900 outline-none cursor-pointer border-none focus:ring-0 w-[120px]"

                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-slate-300 hidden sm:block mx-1"></div>

                            {/* Client Filter Dropdown */}
                            <div className="relative w-full sm:w-[240px]">
                                <div onClick={() => { setShowClientFilterDropdown(!showClientFilterDropdown); setShowStatusFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] hover:border-indigo-500 transition-colors font-bold shadow-sm">
                                    <span className={filterClient ? 'text-indigo-700 font-extrabold' : 'text-slate-600'}>
                                        {filterClient ? (clients.find(c => c.id == filterClient)?.name || "All Clients") : "Filter by Client"}
                                    </span>
                                    {filterClient ? (
                                        <i className="fa-solid fa-times text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterClient(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-slate-400"></i>
                                    )}
                                </div>
                                {showClientFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1.5 flex max-h-[300px] w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl z-50">
                                        <div className="border-b border-slate-200 bg-slate-50 p-2.5 relative">
                                            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                            <input type="text" placeholder="Search client..." value={clientFilterSearch} onChange={(e) => setClientFilterSearch(e.target.value)} className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-[13.5px] font-bold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600" autoFocus />
                                        </div>
                                        <div className="overflow-y-auto py-1 custom-table-scroll">
                                            <div onClick={() => { setFilterClient(""); setShowClientFilterDropdown(false); }} className="cursor-pointer px-4 py-2.5 text-[13.5px] text-slate-800 hover:bg-slate-100 font-bold border-b border-slate-100">All Clients</div>
                                            {clients.filter(c => c.name.toLowerCase().includes(clientFilterSearch.toLowerCase())).map(c => (
                                                <div key={c.id} onClick={() => { setFilterClient(c.id); setShowClientFilterDropdown(false); setClientFilterSearch(""); }} className={`cursor-pointer px-4 py-2.5 text-[13.5px] hover:bg-slate-50 border-b border-slate-50 last:border-0 ${filterClient == c.id ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-700 font-bold'}`}>{c.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Filter Dropdown */}
                            <div className="relative w-full sm:w-[180px]">
                                <div onClick={() => { setShowStatusFilterDropdown(!showStatusFilterDropdown); setShowClientFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] hover:border-indigo-500 transition-colors font-bold shadow-sm">
                                    <span className={filterStatus ? 'text-indigo-700 font-extrabold' : 'text-slate-600'}>
                                        {filterStatus ? (statusOptions.find(s => s.value === filterStatus)?.label || "All Status") : "Filter by Status"}
                                    </span>
                                    {filterStatus ? (
                                        <i className="fa-solid fa-times text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[11px] text-slate-400"></i>
                                    )}
                                </div>
                                {showStatusFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1.5 flex max-h-[250px] w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl z-50">
                                        <div className="overflow-y-auto py-1">
                                            <div onClick={() => { setFilterStatus(""); setShowStatusFilterDropdown(false); }} className="cursor-pointer px-4 py-2.5 text-[13.5px] text-slate-800 hover:bg-slate-100 font-bold border-b border-slate-100">All Status</div>
                                            {statusOptions.map(s => (
                                                <div key={s.value} onClick={() => { setFilterStatus(s.value); setShowStatusFilterDropdown(false); }} className={`cursor-pointer px-4 py-2.5 text-[13.5px] hover:bg-slate-50 border-b border-slate-50 last:border-0 ${filterStatus === s.value ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-700 font-bold'}`}>{s.label}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reset Filters */}
                            {(filterClient || filterStatus || searchTerm || perPage !== 25) && (
                                <button onClick={() => { setFilterClient(""); setFilterStatus(""); setSearchTerm(""); setPerPage(25); }} className="h-[44px] px-4 rounded-xl border border-rose-300 bg-rose-50 text-[13px] font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-400 shadow-sm flex items-center gap-1.5">
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}

                        </div>

                        {/* Right Side: Search */}
                        <div className="relative w-full lg:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]"></i>
                            <input type="text" placeholder="Search project title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-[14px] font-bold text-slate-900 outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white shadow-sm" />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-center text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest w-12">
                                        SL
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest w-[28%]">
                                        Project Details
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest">
                                        Client &amp; Manager
                                    </th>
                                    <th className="px-6 py-4 text-right text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest">
                                        Value / Budget
                                    </th>
                                    <th className="px-6 py-4 text-center text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest">
                                        Status &amp; Progress
                                    </th>
                                    <th className="px-6 py-4 text-center text-[11.5px] font-extrabold text-slate-600 uppercase tracking-widest no-print w-36">
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
                                            <tr key={project.id} className="hover:bg-indigo-50/40 transition-colors group">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-500 text-center">{projects.from ? projects.from + index : index + 1}</td>

                                                {/* Project Details Column */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-sm">
                                                            <i className="fa-solid fa-layer-group text-[16px]"></i>
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-[15px] text-slate-900 truncate max-w-[280px]" title={project.title}>
                                                                {project.title}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {project.priority && (
                                                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${getPriorityStyles(project.priority)}`}>
                                                                        {project.priority}
                                                                    </span>
                                                                )}
                                                                <span className="text-[12px] text-slate-500 font-bold flex items-center gap-1.5">
                                                                    <i className="fa-regular fa-calendar text-[11px]"></i> {project.deadline || "No Deadline"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Client & Manager Column */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[13px] font-black uppercase shadow-sm">
                                                            {project.client?.name ? project.client.name.charAt(0) : '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 text-[14px]">
                                                                {project.client?.name || <span className="text-slate-400 italic font-bold">No Client</span>}
                                                            </div>
                                                            <div className="text-[12px] text-slate-500 mt-1 flex items-center gap-1.5 font-bold">
                                                                <i className="fa-solid fa-user-tie text-[11px] text-indigo-600"></i> {project.project_manager?.name || 'Unassigned'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Value / Budget */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-black text-slate-900 text-[16px] tabular-nums">
                                                        {project.budget ? <><Taka className="text-[13px]" />{Number(project.budget).toLocaleString('en-IN')}</> : <span className="text-slate-400 text-[13px] font-bold italic font-sans">No budget set</span>}
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-500 mt-1 flex justify-end items-center gap-1.5">
                                                        <i className="fa-solid fa-box text-[11px]"></i> {project.items?.length || 0} items
                                                    </div>
                                                </td>

                                                {/* Status & Progress */}
                                                <td className="px-6 py-4 w-[180px]">
                                                    <select
                                                        value={project.status}
                                                        onChange={(e) => handleQuickStatusChange(project.id, e.target.value)}
                                                        disabled={!canModify}
                                                        className={`w-full appearance-none border px-3 py-1.5 mb-2 rounded-lg text-[11px] font-black uppercase tracking-widest outline-none text-center shadow-sm transition-all ${canModify ? 'cursor-pointer hover:brightness-95 focus:ring-2 focus:ring-indigo-600/20' : 'cursor-not-allowed opacity-80'} ${getStatusStyles(project.status)}`}
                                                        style={{ textAlignLast: 'center' }}
                                                    >
                                                        <option value="planning" className="bg-white text-slate-800">Planning</option>
                                                        <option value="in_progress" className="bg-white text-slate-800">In Progress</option>
                                                        <option value="on_hold" className="bg-white text-slate-800">On Hold</option>
                                                        <option value="completed" className="bg-white text-slate-800">Completed</option>
                                                    </select>

                                                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden border border-slate-300">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                (project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : project.progress)) === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                                            }`}
                                                            style={{ width: `${project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : project.progress)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-mono text-[11px] font-bold text-slate-500 mt-1 block text-right">
                                                        {project.status === 'completed' ? 100 : (project.status === 'planning' ? 0 : (project.progress || 0))}%
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-center no-print">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {hasPermission('view_project') && (
                                                            <button onClick={() => openViewModal(project)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white shadow-sm" title="View Details">
                                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {canModify ? (
                                                            <>
                                                                {hasPermission('edit_project') && (
                                                                    <Link href={route('admin.projects.edit', project.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors bg-white shadow-sm" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                    </Link>
                                                                )}
                                                                {hasPermission('delete_project') && (
                                                                    <button onClick={() => handleDelete(project.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-colors bg-white shadow-sm" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-[10.5px] font-black text-slate-500 uppercase tracking-widest border border-slate-300 shadow-sm"><i className="fa-solid fa-lock text-[10px]"></i> Locked</div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                                                    <i className="fa-solid fa-layer-group text-2xl text-slate-300"></i>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800">No projects found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your filters or create a new project.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {projects.links && projects.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
                            <div className="text-[13.5px] font-bold text-slate-600">
                                Showing <span className="font-black text-slate-900">{projects.from || 0}</span> to <span className="font-black text-slate-900">{projects.to || 0}</span> of <span className="font-black text-slate-900">{projects.total || 0}</span> projects
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {projects.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-black transition-colors shadow-sm
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : link.url
                                                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                    : 'border-slate-200 bg-slate-50 text-slate-400 pointer-events-none'
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

            {/* --- 🟢 STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-gray-50 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-700/30 animate-[scaleIn_0.2s_ease-out]">

                        {/* Letterhead Header */}
                        <div className="relative bg-slate-900 px-8 py-8 shrink-0 overflow-hidden border-b border-slate-700">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors z-20 shadow-sm">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>

                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-2.5 mb-3">
                                    <span className="font-mono text-[13px] font-bold text-slate-400 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">Ref. #{selectedProject.id}</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-black tracking-widest text-white uppercase shadow-sm">
                                        <span className="h-2 w-2 rounded-full shadow-inner" style={{ backgroundColor: STATUS_DOT[selectedProject.status] || '#94A3B8' }}></span>
                                        {selectedProject.status.replace('_', ' ')}
                                    </span>
                                    {selectedProject.priority && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-black tracking-widest text-white uppercase shadow-sm">
                                            <span className="h-2 w-2 rounded-full shadow-inner" style={{ backgroundColor: PRIORITY_DOT[selectedProject.priority] || '#94A3B8' }}></span>
                                            {selectedProject.priority}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-[26px] sm:text-[30px] font-black text-white tracking-tight leading-tight max-w-3xl">
                                    {selectedProject.title}
                                </h2>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                            {/* Top Info Strip */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="p-5 bg-white border border-slate-300 rounded-2xl shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-500 mb-1.5"><i className="fa-regular fa-building mr-1"></i> Client</span>
                                    <div className="font-black text-slate-900 text-[15px]">{selectedProject.client?.name || "N/A"}</div>
                                    {selectedProject.client?.company_name && <div className="text-[12.5px] font-bold text-slate-500 mt-0.5">{selectedProject.client.company_name}</div>}
                                </div>
                                <div className="p-5 bg-white border border-slate-300 rounded-2xl shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-500 mb-1.5"><i className="fa-solid fa-user-tie mr-1"></i> Project manager</span>
                                    <div className="font-black text-slate-900 text-[15px]">{selectedProject.project_manager?.name || "Unassigned"}</div>
                                </div>
                                <div className="p-5 bg-white border border-slate-300 rounded-2xl shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-500 mb-1.5"><i className="fa-regular fa-calendar-days mr-1"></i> Timeline</span>
                                    <div className="font-mono font-bold text-slate-900 text-[13.5px]">{selectedProject.start_date || "-"} <span className="text-slate-400 mx-1">→</span> {selectedProject.deadline || "-"}</div>
                                </div>
                            </div>

                            {/* Financials + Progress */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 rounded-2xl border border-slate-300 shadow-md bg-white">
                                    <span className="block text-[13px] font-black text-slate-900 mb-4 pb-3 border-b border-slate-200 uppercase tracking-widest"><i className="fa-solid fa-file-invoice-dollar mr-1.5 text-emerald-600"></i> Financials</span>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[13.5px] text-slate-600 font-bold">Total budget</span>
                                        <span className="font-mono font-black text-emerald-600 text-[20px] tabular-nums flex items-center">
                                            {selectedProject.budget ? <><Taka className="text-[14px] text-emerald-600" />{Number(selectedProject.budget).toLocaleString('en-IN')}</> : <span className="font-sans font-bold text-[14px] text-slate-400 italic">Not set</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13.5px] text-slate-600 font-bold">Items included</span>
                                        <span className="font-mono font-black text-slate-900 text-[16px] bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{selectedProject.items?.length || 0}</span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-slate-300 shadow-md bg-white">
                                    <span className="block text-[13px] font-black text-slate-900 mb-4 pb-3 border-b border-slate-200 uppercase tracking-widest"><i className="fa-solid fa-spinner mr-1.5 text-indigo-600"></i> Task progress</span>
                                    <div className="flex justify-between items-end mb-2.5">
                                        <span className="text-[13.5px] text-slate-600 font-bold">Completion level</span>
                                        <span className={`font-mono text-[20px] font-black ${selectedProject.progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{selectedProject.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
                                        <div className={`h-full rounded-full transition-all duration-700 ${selectedProject.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${selectedProject.progress || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedProject.description && selectedProject.description !== '<p><br></p>' && (
                                <div className="p-6 rounded-2xl border border-slate-300 shadow-md bg-white">
                                    <span className="block text-[13px] font-black text-slate-900 mb-4 pb-3 border-b border-slate-200 uppercase tracking-widest"><i className="fa-solid fa-align-left mr-1.5 text-slate-500"></i> Project notes</span>
                                    <div
                                        className="text-slate-800 text-[14.5px] leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-200"
                                        dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                                    />
                                </div>
                            )}

                            {/* Links / Resources */}
                            {(selectedProject.repo_link || selectedProject.live_url) && (
                                <div className="p-6 rounded-2xl border border-slate-300 shadow-md bg-white">
                                    <span className="block text-[13px] font-black text-slate-900 mb-4 pb-3 border-b border-slate-200 uppercase tracking-widest"><i className="fa-solid fa-link mr-1.5 text-slate-500"></i> External links</span>
                                    <div className="flex flex-wrap gap-4">
                                        {selectedProject.repo_link && (
                                            <a href={selectedProject.repo_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-2 border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-slate-800 px-5 py-2.5 rounded-xl text-[13.5px] font-black transition-all shadow-sm">
                                                <i className="fa-brands fa-github text-[16px]"></i> Code repository
                                            </a>
                                        )}
                                        {selectedProject.live_url && (
                                            <a href={selectedProject.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-2 border-indigo-200 hover:border-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-[13.5px] font-black transition-all shadow-sm">
                                                <i className="fa-solid fa-globe text-[16px]"></i> Live preview
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Project Items Table */}
                            {selectedProject.items && selectedProject.items.length > 0 && (
                                <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-md bg-white">
                                    <div className="px-6 py-5 border-b border-slate-300 bg-slate-50">
                                        <span className="text-[13px] font-black text-slate-900 uppercase tracking-widest"><i className="fa-solid fa-boxes-stacked mr-1.5 text-slate-500"></i> Project items</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse bg-white">
                                            <thead className="text-[11.5px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-4 w-12 text-center">No.</th>
                                                    <th className="px-6 py-4">Item</th>
                                                    <th className="px-6 py-4 text-center">Qty / unit</th>
                                                    <th className="px-6 py-4 text-right">Unit price</th>
                                                    <th className="px-6 py-4 text-right bg-emerald-50/50">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                                {selectedProject.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-center">{String(idx + 1).padStart(2, "0")}</td>
                                                        <td className="px-6 py-4 font-black text-slate-900">
                                                            {item.item_name}
                                                            {item.description && item.description !== '<p><br></p>' && (
                                                                <div className="text-[12.5px] text-slate-500 font-semibold mt-1" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-600 bg-slate-50/50">{Number(item.quantity).toLocaleString()} <span className="text-[10.5px] text-slate-400 uppercase ml-1 font-sans">{item.unit_type}</span></td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600 tabular-nums"><Taka className="text-[12px] text-slate-400" />{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 tabular-nums bg-emerald-50/30"><Taka className="text-[12px] text-emerald-600" />{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 border-t border-slate-300 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 hover:bg-black px-8 py-3.5 text-[14px] font-bold text-white transition-colors shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
