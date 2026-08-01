import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ projects = { data: [], links: [] }, clients = [], managers = [], is_super_admin = false }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);
    
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const [clientSearch, setClientSearch] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    
    const [filterClient, setFilterClient] = useState(() => new URLSearchParams(window.location.search).get("client_id") || "");
    const [showClientFilterDropdown, setShowClientFilterDropdown] = useState(false);
    const [clientFilterSearch, setClientFilterSearch] = useState("");

    const [filterStatus, setFilterStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "");
    const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
    const [statusFilterSearch, setStatusFilterSearch] = useState("");

    const filterRef = useRef(null); 
    const isFirstRender = useRef(true);
    
    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        reset,
        processing,
        errors,
        clearErrors,
    } = useForm({
        id: "",
        client_id: "",
        project_manager_id: "",
        title: "",
        description: "",
        quantity: "",
        unit_type: "piece",
        start_date: "",
        deadline: "",
        budget: "",
        status: "planning",
        priority: "medium",
        progress: 0,
        repo_link: "",
        live_url: "",
    });

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
            if (perPage !== 10) params.per_page = perPage;
            if (filterClient) params.client_id = filterClient;
            if (filterStatus) params.status = filterStatus;

            router.get(route("admin.projects.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage, filterClient, filterStatus]);

    const handleCopy = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = projects.data
            .map((p) => `${p.title}\t${p.client?.name || "N/A"}\t${p.budget || "0"}\t${p.status?.toUpperCase()}\t${p.deadline || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Project Title,Client,Budget,Status,Start Date,Deadline\n"];
        const rows = projects.data.map(p => `"${p.title}","${p.client?.name || ''}","${p.budget || ''}","${p.status}","${p.start_date || '-'}","${p.deadline || '-'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Projects_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Projects Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Projects Directory Report</h2>
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

    const handleQuickStatusChange = (projectId, newStatus) => {
        router.patch(route("admin.projects.update-status", projectId), { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status updated!', showConfirmButton: false, timer: 1500 });
            },
            onError: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Failed to update status', showConfirmButton: false, timer: 2000 });
            }
        });
    };

    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            client_id: '',
            project_manager_id: '',
            title: '',
            description: '',
            quantity: '',
            unit_type: 'piece',
            start_date: '',
            deadline: '',
            budget: '',
            status: 'planning',
            priority: 'medium',
            progress: 0,
            repo_link: '',
            live_url: ''
        });
        setEditMode(false);
        setClientSearch("");          
        setShowClientDropdown(false); 
        setShowModal(true);
    };

    const openEditModal = (project) => {
        clearErrors();
        
        const formatDate = (dateString) => {
            if (!dateString) return "";
            return String(dateString).split('T')[0].split(' ')[0];
        };

        setData({
            id: project.id,
            client_id: project.client_id || '',
            project_manager_id: project.project_manager_id || '',
            title: project.title || '',
            description: project.description || '',
            quantity: project.quantity || '',
            unit_type: project.unit_type || 'piece',
            start_date: formatDate(project.start_date),
            deadline: formatDate(project.deadline),
            budget: project.budget || '',
            status: project.status || 'planning',
            priority: project.priority || 'medium',
            progress: project.progress || 0,
            repo_link: project.repo_link || '',
            live_url: project.live_url || ''
        });
        setClientSearch("");
        setShowClientDropdown(false);
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (project) => {
        setSelectedProject(project);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!data.client_id) {
            Swal.fire("Required", "Please select a client from the dropdown.", "warning");
            return;
        }

        if (editMode) {
            put(route("admin.projects.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.projects.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This project will be deleted!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete It",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Project deleted successfully.", timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    const getStatusStyles = (status) => {
        const styles = {
            planning: "bg-gray-100 text-gray-700 border-gray-200",
            in_progress: "bg-blue-100 text-blue-700 border-blue-200",
            completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
            on_hold: "bg-red-100 text-red-700 border-red-200"
        };
        return styles[status] || styles.planning;
    };

    const getPriorityStyles = (priority) => {
        const styles = {
            low: "bg-gray-100 text-gray-600",
            medium: "bg-sky-100 text-sky-700",
            high: "bg-amber-100 text-amber-700",
            urgent: "bg-rose-100 text-rose-700"
        };
        return styles[priority] || styles.medium;
    };

    const statusOptions = [
        { value: "planning", label: "Planning" },
        { value: "in_progress", label: "In Progress" },
        { value: "on_hold", label: "On Hold" },
        { value: "completed", label: "Completed" }
    ];

    return (
        <AdminLayout>
            <Head title="Projects Management" />

            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Project Workspace</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage, track and oversee client projects seamlessly.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-layer-group text-[var(--accent)]"></i> Current Active Projects
                        </div>
                        {hasPermission('create_project') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Add New Project
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
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
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
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

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search project..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50/30" ref={filterRef}>
                        {/* Client Filter Dropdown */}
                        <div className="relative w-full sm:w-[240px]">
                            <div 
                                onClick={() => { setShowClientFilterDropdown(!showClientFilterDropdown); setShowStatusFilterDropdown(false); }}
                                className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-colors hover:bg-gray-50 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            >
                                <span className={`flex items-center gap-2 overflow-hidden whitespace-nowrap ${filterClient ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {filterClient ? (clients.find(c => c.id == filterClient)?.name || "All Clients") : "All Clients"}
                                </span>
                                {filterClient ? (
                                    <i className="fa-solid fa-times text-red-500 hover:text-red-700 p-1" onClick={(e) => { e.stopPropagation(); setFilterClient(""); }}></i>
                                ) : (
                                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
                                )}
                            </div>
                            
                            {showClientFilterDropdown && (
                                <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                    <div className="border-b border-gray-100 bg-gray-50 p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Search client..." 
                                            value={clientFilterSearch}
                                            onChange={(e) => setClientFilterSearch(e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="overflow-y-auto py-1">
                                        <div 
                                            onClick={() => { setFilterClient(""); setShowClientFilterDropdown(false); }}
                                            className="cursor-pointer px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                        >
                                            All Clients
                                        </div>
                                        {clients.filter(c => 
                                            c.name.toLowerCase().includes(clientFilterSearch.toLowerCase()) || 
                                            (c.company_name && c.company_name.toLowerCase().includes(clientFilterSearch.toLowerCase()))
                                        ).map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => { setFilterClient(c.id); setShowClientFilterDropdown(false); setClientFilterSearch(""); }}
                                                className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-gray-50 ${filterClient == c.id ? 'bg-[var(--accent-bg)] font-semibold text-gray-900' : 'text-gray-700'}`}
                                            >
                                                {c.name} {c.company_name ? <span className="text-[11px] text-gray-400 ml-1">({c.company_name})</span> : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="relative w-full sm:w-[180px]">
                            <div 
                                onClick={() => { setShowStatusFilterDropdown(!showStatusFilterDropdown); setShowClientFilterDropdown(false); }}
                                className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-colors hover:bg-gray-50 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            >
                                <span className={`flex items-center gap-2 overflow-hidden whitespace-nowrap ${filterStatus ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {filterStatus ? (statusOptions.find(s => s.value === filterStatus)?.label || "All Status") : "All Status"}
                                </span>
                                {filterStatus ? (
                                    <i className="fa-solid fa-times text-red-500 hover:text-red-700 p-1" onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}></i>
                                ) : (
                                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
                                )}
                            </div>

                            {showStatusFilterDropdown && (
                                <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                    <div className="border-b border-gray-100 bg-gray-50 p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Search status..." 
                                            value={statusFilterSearch}
                                            onChange={(e) => setStatusFilterSearch(e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="overflow-y-auto py-1">
                                        <div 
                                            onClick={() => { setFilterStatus(""); setShowStatusFilterDropdown(false); }}
                                            className="cursor-pointer px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                        >
                                            All Status
                                        </div>
                                        {statusOptions.filter(s => s.label.toLowerCase().includes(statusFilterSearch.toLowerCase())).map(s => (
                                            <div 
                                                key={s.value} 
                                                onClick={() => { setFilterStatus(s.value); setShowStatusFilterDropdown(false); setStatusFilterSearch(""); }}
                                                className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-gray-50 ${filterStatus === s.value ? 'bg-[var(--accent-bg)] font-semibold' : ''}`}
                                            >
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Project Details</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Quantity / Budget</th>
                                    <th className="px-6 py-4">Status & Progress</th>
                                    <th className="px-6 py-4">Deadline</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {projects.data && projects.data.length > 0 ? (
                                    projects.data.map((project, index) => {
                                        const isCompleted = project.status === 'completed';
                                        const canModify = !isCompleted || is_super_admin;
                                        const statusClass = getStatusStyles(project.status);

                                        return (
                                            <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {projects.from ? projects.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                        {project.title}
                                                        {project.priority && (
                                                            <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${getPriorityStyles(project.priority)}`}>
                                                                {project.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                        <i className="fa-solid fa-user-tie"></i> {project.project_manager?.name || 'No Manager Assigned'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-800">
                                                        {project.client?.name || "N/A"}
                                                    </div>
                                                    {project.client?.company_name && (
                                                        <div className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <i className="fa-regular fa-building"></i> {project.client.company_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {project.quantity && (
                                                        <div className="text-[13px] font-semibold text-gray-800">
                                                            {Number(project.quantity).toLocaleString()} {project.unit_type}
                                                        </div>
                                                    )}
                                                    <div className="text-[12px] text-gray-500 mt-0.5">
                                                        {project.budget ? `Total: TK ${Number(project.budget).toLocaleString('en-IN')}` : 'No budget set'}
                                                        
                                                        {project.budget && project.quantity > 0 && (
                                                            <span className="block mt-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
                                                                Rate: TK {(project.budget / project.quantity).toFixed(2)} / {project.unit_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select 
                                                        value={project.status} 
                                                        onChange={(e) => handleQuickStatusChange(project.id, e.target.value)}
                                                        disabled={!canModify}
                                                        className={`appearance-none bg-none border px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none transition-shadow focus:ring-2 focus:ring-offset-1 ${canModify ? 'cursor-pointer focus:ring-[var(--accent)]/50' : 'cursor-not-allowed opacity-80'} ${statusClass}`}
                                                    >
                                                        <option value="planning">Planning</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="on_hold">On Hold</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                    
                                                    {/* Progress Bar */}
                                                    <div className="w-full max-w-[140px] bg-gray-200 rounded-full h-1.5 mt-1">
                                                        <div 
                                                            className={`h-1.5 rounded-full ${project.progress === 100 ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`} 
                                                            style={{ width: `${project.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-gray-500 mt-1 block">{project.progress || 0}% Done</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 font-medium">
                                                    {project.deadline || "-"}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_project') && (
                                                            <button onClick={() => openViewModal(project)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {canModify ? (
                                                            <>
                                                                {hasPermission('edit_project') && (
                                                                    <button onClick={() => openEditModal(project)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Project">
                                                                        <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('delete_project') && (
                                                                    <button onClick={() => handleDelete(project.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Project">
                                                                        <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500" title="Completed projects are locked">
                                                                <i className="fa-solid fa-lock text-[10px]"></i> Locked
                                                            </div>
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
                                                <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-3"></i>
                                                <p>No projects found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {projects.links && projects.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {projects.from || 0} to {projects.to || 0} of {projects.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {projects.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                    >
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-regular fa-folder-open text-[var(--accent)]"></i> Project Detailed View
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto brass-scroll">
                            
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-[22px] font-bold text-gray-900">{selectedProject.title}</h2>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(selectedProject.status)}`}>
                                        {selectedProject.status?.replace("_", " ")}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getPriorityStyles(selectedProject.priority)}`}>
                                        {selectedProject.priority}
                                    </span>
                                </div>
                                <p className="text-[14px] text-gray-600 leading-relaxed">
                                    {selectedProject.description || <span className="italic opacity-70">No project description provided.</span>}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {/* Details Card 1 */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 border-b pb-2">Parties Involved</span>
                                    
                                    <div className="mb-3">
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Client</span>
                                        <div className="flex flex-col gap-1">
                                            <div className="font-semibold text-gray-800 flex items-center gap-2 text-[14px]">
                                                <i className="fa-solid fa-user text-blue-500"></i> {selectedProject.client?.name || "N/A"}
                                            </div>
                                            {selectedProject.client?.company_name && (
                                                <div className="text-[12px] text-gray-500 ml-5 flex items-center gap-1.5">
                                                    <i className="fa-regular fa-building"></i> {selectedProject.client.company_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Project Manager</span>
                                        <div className="font-semibold text-gray-800 flex items-center gap-2 text-[14px]">
                                            <i className="fa-solid fa-user-tie text-[var(--accent)]"></i> {selectedProject.project_manager?.name || "Unassigned"}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Card 2 */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 border-b pb-2">Scope & Financials</span>
                                    
                                    <div className="mb-3">
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Quantity / Order Size</span>
                                        <div className="font-semibold text-gray-800 text-[14px]">
                                            {selectedProject.quantity ? `${selectedProject.quantity} ${selectedProject.unit_type}` : "N/A"}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Total Budget Allocated</span>
                                        <div className="font-semibold text-emerald-600 flex items-center gap-2 text-[14px]">
                                            <i className="fa-solid fa-money-bill-wave"></i>
                                            {selectedProject.budget ? `TK. ${Number(selectedProject.budget).toLocaleString('en-IN')}` : "Not Set"}
                                        </div>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-gray-200 border-dashed">
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Per Unit Rate (Price Rate)</span>
                                        <div className="font-bold text-gray-800 text-[14px]">
                                            {selectedProject.budget && selectedProject.quantity > 0 
                                                ? `TK. ${(selectedProject.budget / selectedProject.quantity).toFixed(2)} / ${selectedProject.unit_type}` 
                                                : "N/A"}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Card 3 */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 border-b pb-2">Timeline & Tracking</span>
                                    
                                    <div className="mb-3">
                                        <span className="block text-[12px] text-gray-500 mb-0.5">Start Date &rarr; Deadline</span>
                                        <div className="font-semibold text-gray-800 text-[13px] flex items-center gap-2">
                                            <i className="fa-regular fa-calendar-days text-rose-500"></i>
                                            {selectedProject.start_date || "-"} &rarr; {selectedProject.deadline || "TBA"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[12px] text-gray-500 mb-1">Completion Progress</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${selectedProject.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${selectedProject.progress || 0}%` }}></div>
                                            </div>
                                            <span className="text-[12px] font-bold text-gray-700">{selectedProject.progress || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Links Section */}
                            {(selectedProject.repo_link || selectedProject.live_url) && (
                                <div className="border-t border-gray-100 pt-5">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">Important Links</span>
                                    <div className="flex flex-wrap gap-4">
                                        {selectedProject.repo_link && (
                                            <a href={selectedProject.repo_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors">
                                                <i className="fa-brands fa-github text-[16px]"></i> Repository / Drive
                                            </a>
                                        )}
                                        {selectedProject.live_url && (
                                            <a href={selectedProject.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border border-blue-200">
                                                <i className="fa-solid fa-globe"></i> Live URL
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL (IMPROVED UI) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-[var(--accent)]"></i> Modify Project</>
                                ) : (
                                    <><i className="fa-solid fa-rocket text-[var(--accent)]"></i> Create New Project</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6" onClick={() => showClientDropdown && setShowClientDropdown(false)}>
                                
                                {/* Section 1: General Information */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-regular fa-address-card text-gray-400"></i> General Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Project Title <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={data.title} 
                                                onChange={(e) => setData("title", e.target.value)} 
                                                placeholder="Enter descriptive project title" 
                                                required 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.title && <p className="text-red-500 text-[12px] mt-1">{errors.title}</p>}
                                        </div>

                                        {/* Client Custom Dropdown */}
                                        <div className="relative">
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Client <span className="text-red-500">*</span></label>
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); setShowClientDropdown(!showClientDropdown); }}
                                                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 ${data.client_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                            >
                                                <span className="truncate block">
                                                    {data.client_id 
                                                        ? (() => {
                                                            const selectedClient = clients.find(cl => String(cl.id) === String(data.client_id));
                                                            if (selectedClient) {
                                                                return (
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span className="font-medium text-gray-900">{selectedClient.name}</span>
                                                                        {selectedClient.company_name && (
                                                                            <span className="text-gray-400 text-[12px]">({selectedClient.company_name})</span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            }
                                                            return <span className="text-gray-400">-- Choose Client --</span>;
                                                        })()
                                                        : <span className="text-gray-400">Search & Select Client</span>
                                                    }
                                                </span>
                                                <i className={`fa-solid fa-chevron-${showClientDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                            </div>

                                            {showClientDropdown && (
                                                <div 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50"
                                                >
                                                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Type client name..." 
                                                            value={clientSearch}
                                                            onChange={(e) => setClientSearch(e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="overflow-y-auto py-1">
                                                        {clients.filter(c => 
                                                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                            (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                        ).length > 0 ? (
                                                            clients.filter(c => 
                                                                c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                                (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                            ).map(c => (
                                                                <div 
                                                                    key={c.id} 
                                                                    onClick={() => {
                                                                        setData("client_id", c.id);
                                                                        setShowClientDropdown(false);
                                                                        setClientSearch("");
                                                                    }}
                                                                    className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.client_id == c.id ? 'bg-[var(--accent-bg)] font-semibold text-gray-900' : 'text-gray-700'}`}
                                                                >
                                                                    {c.name} {c.company_name ? <span className="text-[12px] text-gray-400 ml-1">({c.company_name})</span> : ''}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-3 text-center text-[13px] text-gray-400">No client found.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {errors.client_id && <p className="text-red-500 text-[12px] mt-1">{errors.client_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Project Manager</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.project_manager_id || ""} 
                                                    onChange={(e) => setData("project_manager_id", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                                >
                                                    <option value="">-- Assign a Manager --</option>
                                                    {managers.map(manager => (
                                                        <option key={manager.id} value={manager.id}>{manager.name}</option>
                                                    ))}
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                            {errors.project_manager_id && <p className="text-red-500 text-[12px] mt-1">{errors.project_manager_id}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Planning & Financials */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-chart-pie text-gray-400"></i> Planning & Financials
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Quantity / Amount</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                value={data.quantity} 
                                                onChange={(e) => setData("quantity", e.target.value)} 
                                                placeholder="e.g. 100"
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.quantity && <p className="text-red-500 text-[12px] mt-1">{errors.quantity}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Measuring Unit</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.unit_type} 
                                                    onChange={(e) => setData("unit_type", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                                >
                                                    <option value="piece">Pieces (Pcs)</option>
                                                    <option value="kg">Kilogram (Kg)</option>
                                                    <option value="dozen">Dozen</option>
                                                    <option value="carton">Carton</option>
                                                    <option value="box">Box</option>
                                                    <option value="set">Set</option>
                                                    <option value="unit">Unit</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Total Budget (TK)</label>
                                            <input 
                                                type="number" 
                                                value={data.budget} 
                                                onChange={(e) => setData("budget", e.target.value)} 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                placeholder="e.g. 50000"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Start Date</label>
                                            <input 
                                                type="date" 
                                                value={data.start_date} 
                                                onChange={(e) => setData("start_date", e.target.value)} 
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-text" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Deadline Date <span className="text-red-500">*</span></label>
                                            <input 
                                                type="date" 
                                                value={data.deadline} 
                                                onChange={(e) => setData("deadline", e.target.value)} 
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-text" 
                                                required 
                                            />
                                            {errors.deadline && <p className="text-red-500 text-[12px] mt-1">{errors.deadline}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Status & Additional Tracking */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-bars-progress text-gray-400"></i> Status & Tracking
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Current Status <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select 
                                                    value={data.status} 
                                                    onChange={(e) => setData("status", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer" 
                                                    required
                                                >
                                                    <option value="planning">Planning</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="on_hold">On Hold</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Priority Level</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.priority} 
                                                    onChange={(e) => setData("priority", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                                >
                                                    <option value="low">Low Priority</option>
                                                    <option value="medium">Medium Priority</option>
                                                    <option value="high">High Priority</option>
                                                    <option value="urgent">Urgent</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        {/* --- UPDATED PROGRESS INPUT (No more slider) --- */}
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Completion Progress</label>
                                            <div className="relative flex items-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max="100"
                                                    value={data.progress} 
                                                    onChange={(e) => setData("progress", Math.min(100, Math.max(0, Number(e.target.value))))} 
                                                    className="w-full rounded-lg border border-gray-300 pl-3.5 pr-8 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 text-gray-400 font-bold">%</span>
                                            </div>
                                            {/* Visual Progress feedback */}
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden border border-gray-200">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${data.progress === 100 ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`} 
                                                    style={{ width: `${data.progress || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Repository / Drive Link</label>
                                            <input 
                                                type="url" 
                                                value={data.repo_link} 
                                                onChange={(e) => setData("repo_link", e.target.value)} 
                                                placeholder="https://github.com/..."
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Live URL</label>
                                            <input 
                                                type="url" 
                                                value={data.live_url} 
                                                onChange={(e) => setData("live_url", e.target.value)} 
                                                placeholder="https://www.example.com"
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Detailed Description / Notes</label>
                                        <textarea 
                                            value={data.description} 
                                            onChange={(e) => setData("description", e.target.value)} 
                                            rows="3" 
                                            placeholder="Write project details, requirements, or client notes..."
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Project" : "Create Project"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}