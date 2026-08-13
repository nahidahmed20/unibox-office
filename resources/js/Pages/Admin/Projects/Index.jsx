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
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    
    const [filterClient, setFilterClient] = useState(() => new URLSearchParams(window.location.search).get("client_id") || "");
    const [showClientFilterDropdown, setShowClientFilterDropdown] = useState(false);
    const [clientFilterSearch, setClientFilterSearch] = useState("");

    const [filterStatus, setFilterStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "");
    const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
    const [statusFilterSearch, setStatusFilterSearch] = useState("");

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
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
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
                router.delete(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    const openViewModal = (project) => {
        setSelectedProject(project);
        setShowViewModal(true);
    };

    const getStatusStyles = (status) => {
        const styles = { planning: "bg-gray-100 text-gray-700 border-gray-200", in_progress: "bg-blue-100 text-blue-700 border-blue-200", completed: "bg-emerald-100 text-emerald-700 border-emerald-200", on_hold: "bg-red-100 text-red-700 border-red-200" };
        return styles[status] || styles.planning;
    };

    const getPriorityStyles = (priority) => {
        const styles = { low: "bg-gray-100 text-gray-600", medium: "bg-sky-100 text-sky-700", high: "bg-amber-100 text-amber-700", urgent: "bg-rose-100 text-rose-700" };
        return styles[priority] || styles.medium;
    };

    const statusOptions = [
        { value: "planning", label: "Planning" }, { value: "in_progress", label: "In Progress" },
        { value: "on_hold", label: "On Hold" }, { value: "completed", label: "Completed" }
    ];

    return (
        <AdminLayout>
            <Head title="Projects Management" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Project Workspace</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage, track and oversee client projects seamlessly.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-layer-group text-[var(--accent)]"></i> Current Active Projects
                        </div>
                        {hasPermission('create_project') && (
                            <Link href={route('admin.projects.create')} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] shadow-sm">
                                <i className="fa-solid fa-plus"></i> Add New Project
                            </Link>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-[100px] rounded-md border-gray-300 px-3 py-1.5 outline-none cursor-pointer">
                                    <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value="all">All</option>
                                </select>
                            </div>
                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="border border-gray-300 px-2.5 py-1.5 rounded-md hover:bg-gray-50"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="border border-gray-300 px-2.5 py-1.5 rounded-md hover:bg-gray-50"><i className="fas fa-file-excel text-emerald-500"></i> CSV</button>
                                <button onClick={handlePrint} className="border border-gray-300 px-2.5 py-1.5 rounded-md hover:bg-gray-50"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input type="text" placeholder="Search project..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px]" />
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50/30 border-b border-gray-100" ref={filterRef}>
                        <div className="relative w-full sm:w-[240px]">
                            <div onClick={() => { setShowClientFilterDropdown(!showClientFilterDropdown); setShowStatusFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] hover:bg-gray-50">
                                <span className={filterClient ? 'text-gray-900 font-semibold' : 'text-gray-500'}>{filterClient ? (clients.find(c => c.id == filterClient)?.name || "All Clients") : "All Clients"}</span>
                                {filterClient ? <i className="fa-solid fa-times text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setFilterClient(""); }}></i> : <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>}
                            </div>
                            {showClientFilterDropdown && (
                                <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                    <div className="border-b bg-gray-50 p-2"><input type="text" placeholder="Search client..." value={clientFilterSearch} onChange={(e) => setClientFilterSearch(e.target.value)} className="w-full rounded border-gray-300 px-2.5 py-1.5 text-[13px]" autoFocus /></div>
                                    <div className="overflow-y-auto py-1">
                                        <div onClick={() => { setFilterClient(""); setShowClientFilterDropdown(false); }} className="cursor-pointer px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">All Clients</div>
                                        {clients.filter(c => c.name.toLowerCase().includes(clientFilterSearch.toLowerCase())).map(c => (
                                            <div key={c.id} onClick={() => { setFilterClient(c.id); setShowClientFilterDropdown(false); setClientFilterSearch(""); }} className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-gray-50 ${filterClient == c.id ? 'bg-[var(--accent-bg)] font-semibold' : ''}`}>{c.name}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative w-full sm:w-[180px]">
                            <div onClick={() => { setShowStatusFilterDropdown(!showStatusFilterDropdown); setShowClientFilterDropdown(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] hover:bg-gray-50">
                                <span className={filterStatus ? 'text-gray-900 font-semibold' : 'text-gray-500'}>{filterStatus ? (statusOptions.find(s => s.value === filterStatus)?.label || "All Status") : "All Status"}</span>
                                {filterStatus ? <i className="fa-solid fa-times text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}></i> : <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>}
                            </div>
                            {showStatusFilterDropdown && (
                                <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                    <div className="overflow-y-auto py-1">
                                        <div onClick={() => { setFilterStatus(""); setShowStatusFilterDropdown(false); }} className="cursor-pointer px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">All Status</div>
                                        {statusOptions.map(s => (
                                            <div key={s.value} onClick={() => { setFilterStatus(s.value); setShowStatusFilterDropdown(false); }} className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-gray-50 ${filterStatus === s.value ? 'bg-[var(--accent-bg)] font-semibold' : ''}`}>{s.label}</div>
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
                                        const canModify = !isCompleted || isSuperAdmin;

                                        return (
                                            <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">{projects.from ? projects.from + index : index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                        {project.title}
                                                        {project.priority && <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${getPriorityStyles(project.priority)}`}>{project.priority}</span>}
                                                    </div>
                                                    <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5"><i className="fa-solid fa-user-tie"></i> {project.project_manager?.name || 'Unassigned'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-800">{project.client?.name || "N/A"}</div>
                                                    {project.client?.company_name && <div className="text-[12px] text-gray-500 mt-0.5"><i className="fa-regular fa-building"></i> {project.client.company_name}</div>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {project.quantity && <div className="text-[13px] font-semibold text-gray-800">{Number(project.quantity).toLocaleString()} {project.unit_type}</div>}
                                                    <div className="text-[12px] text-gray-500 mt-0.5">
                                                        {project.budget ? `Total: TK ${Number(project.budget).toLocaleString('en-IN')}` : 'No budget set'}
                                                        {project.budget && project.quantity > 0 && <span className="block mt-1 text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">Rate: TK {(project.budget / project.quantity).toFixed(2)}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select value={project.status} onChange={(e) => handleQuickStatusChange(project.id, e.target.value)} disabled={!canModify} className={`appearance-none bg-none border px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none ${canModify ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'} ${getStatusStyles(project.status)}`}>
                                                        <option value="planning">Planning</option><option value="in_progress">In Progress</option>
                                                        <option value="on_hold">On Hold</option><option value="completed">Completed</option>
                                                    </select>
                                                    <div className="w-full max-w-[140px] bg-gray-200 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${project.progress === 100 ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`} style={{ width: `${project.progress || 0}%` }}></div></div>
                                                    <span className="text-[10px] font-medium text-gray-500 mt-1 block">{project.progress || 0}% Done</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 font-medium">{project.deadline || "-"}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_project') && <button onClick={() => openViewModal(project)} className="h-7 w-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="View"><i className="fa-regular fa-eye text-[12px]"></i></button>}
                                                        {canModify ? (
                                                            <>
                                                                {hasPermission('edit_project') && <Link href={route('admin.projects.edit', project.id)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 hover:bg-amber-100" title="Edit"><i className="fa-regular fa-pen-to-square text-[12px]"></i></Link>}
                                                                {hasPermission('delete_project') && <button onClick={() => handleDelete(project.id)} className="h-7 w-7 rounded bg-red-50 text-red-600 hover:bg-red-100" title="Delete"><i className="fa-regular fa-trash-can text-[12px]"></i></button>}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[11px] text-gray-500"><i className="fa-solid fa-lock text-[10px]"></i> Locked</div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No projects found.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {projects.links && projects.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">Showing {projects.from || 0} to {projects.to || 0} of {projects.total || 0} entries</div>
                            <div className="flex flex-wrap items-center gap-1">
                                {projects.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] ${link.active ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : link.url ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 pointer-events-none'}`} preserveState dangerouslySetInnerHTML={{ __html: link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between px-6 py-4 border-b bg-gray-50"><h3 className="text-[18px] font-semibold flex items-center gap-2"><i className="fa-regular fa-folder-open text-[var(--accent)]"></i> Project View</h3><button onClick={() => setShowViewModal(false)}><i className="fa-solid fa-xmark text-lg"></i></button></div>
                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="mb-6">
                                <h2 className="text-[22px] font-bold text-gray-900 mb-2">{selectedProject.title}</h2>
                                <p className="text-[14px] text-gray-600">{selectedProject.description || "No description provided."}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase text-gray-500 mb-3 border-b pb-2">Involved</span>
                                    <div className="mb-2"><span className="text-[12px] text-gray-500">Client:</span> <div className="font-semibold">{selectedProject.client?.name}</div></div>
                                    <div><span className="text-[12px] text-gray-500">Manager:</span> <div className="font-semibold">{selectedProject.project_manager?.name || "None"}</div></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase text-gray-500 mb-3 border-b pb-2">Financials</span>
                                    <div className="mb-2"><span className="text-[12px] text-gray-500">Quantity:</span> <div className="font-semibold">{selectedProject.quantity ? `${selectedProject.quantity} ${selectedProject.unit_type}` : "N/A"}</div></div>
                                    <div><span className="text-[12px] text-gray-500">Budget:</span> <div className="font-semibold text-emerald-600">{selectedProject.budget ? `TK ${Number(selectedProject.budget).toLocaleString()}` : "N/A"}</div></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase text-gray-500 mb-3 border-b pb-2">Timeline</span>
                                    <div className="mb-2"><span className="text-[12px] text-gray-500">Dates:</span> <div className="font-semibold text-[13px]">{selectedProject.start_date || "-"} &rarr; {selectedProject.deadline}</div></div>
                                    <div>
                                        <span className="text-[12px] text-gray-500 block mb-1">Progress ({selectedProject.progress || 0}%)</span>
                                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: `${selectedProject.progress || 0}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                            {(selectedProject.repo_link || selectedProject.live_url) && (
                                <div className="border-t pt-5">
                                    <span className="block text-[11px] font-bold uppercase text-gray-500 mb-3">Links</span>
                                    <div className="flex gap-4">
                                        {selectedProject.repo_link && <a href={selectedProject.repo_link} target="_blank" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"><i className="fa-brands fa-github"></i> Repository</a>}
                                        {selectedProject.live_url && <a href={selectedProject.live_url} target="_blank" className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm"><i className="fa-solid fa-globe"></i> Live URL</a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}