import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

/* =========================================
   REUSABLE SEARCHABLE SELECT COMPONENT
========================================= */
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, renderOption, error, disabled }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) =>
        getLabel(opt).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'hover:bg-gray-50 focus:ring-1'} 
                    ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-300 focus:border-[var(--accent)] focus:ring-[var(--accent)]/50'} 
                    ${selected ? 'text-gray-900 bg-white' : 'text-gray-500 bg-white'}
                `}
            >
                <span className="truncate flex-1">
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>

            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-[13px] text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {renderOption ? renderOption(opt) : getLabel(opt)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Index({ tasks = { data: [], links: [] }, projects = [], users = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });
    
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
        project_id: "",
        assigned_to: "",
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        due_date: "",
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route("admin.tasks.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!tasks.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = tasks.data
            .map((t) => `${t.title}\t${t.project?.title || "N/A"}\t${t.assignee?.name || "N/A"}\t${t.priority?.toUpperCase()}\t${t.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!tasks.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Task Title,Project,Assignee,Priority,Status,Due Date\n"];
        const rows = tasks.data.map(t => `"${t.title}","${t.project?.title || ''}","${t.assignee?.name || ''}","${t.priority}","${t.status}","${t.due_date || '-'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Tasks_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Tasks Report</title>
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
                    <h2>Tasks Directory Report</h2>
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

    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            project_id: '',
            assigned_to: '',
            title: '',
            description: '',
            priority: 'medium', 
            status: 'todo',     
            due_date: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (task) => {
        clearErrors();
        setData({
            id: task.id,
            project_id: task.project_id || '',
            assigned_to: task.assigned_to || '',
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: task.status,
            due_date: task.due_date || "",
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (task) => {
        setSelectedTask(task);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!data.project_id) return Swal.fire("Required", "Please select a Project.", "warning");
        if (!data.assigned_to) return Swal.fire("Required", "Please assign this task to personnel.", "warning");

        if (editMode) {
            put(route("admin.tasks.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.tasks.store"), {
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
            text: "This task will be deleted permanently!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete It",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.tasks.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Task deleted successfully.", timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            low: "bg-gray-100 text-gray-700 border border-gray-200",
            medium: "bg-blue-100 text-blue-700 border border-blue-200",
            high: "bg-orange-100 text-orange-700 border border-orange-200",
            urgent: "bg-red-100 text-red-700 border border-red-200 animate-pulse"
        };
        return styles[priority] || "bg-gray-100 text-gray-700 border border-gray-200";
    };

    const getStatusBadge = (status) => {
        const styles = {
            todo: "bg-slate-100 text-slate-700 border border-slate-200",
            in_progress: "bg-amber-100 text-amber-700 border border-amber-200",
            review: "bg-purple-100 text-purple-700 border border-purple-200",
            done: "bg-emerald-100 text-emerald-700 border border-emerald-200"
        };
        return styles[status] || "bg-gray-100 text-gray-700 border border-gray-200";
    };

    return (
        <AdminLayout>
            <Head title="Tasks Management" />

            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Task Workspace</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage, track and update team assignments seamlessly.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-list-check text-[var(--accent)]"></i> Current Active Tasks
                        </div>
                        {hasPermission('create_task') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Add New Task
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[140px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
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
                                placeholder="Search tasks..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Task Details</th>
                                    <th className="px-6 py-4">Project</th>
                                    <th className="px-6 py-4">Assignee</th>
                                    <th className="px-6 py-4 text-center">Priority</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Due Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {tasks.data && tasks.data.length > 0 ? (
                                    tasks.data.map((task, index) => (
                                        <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {tasks.from ? tasks.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{task.title}</div>
                                                {task.description && (
                                                    <span className="text-[12px] text-gray-500 mt-1 block max-w-[250px] truncate">
                                                        {task.description}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-medium">
                                                {task.project?.title || "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-semibold text-gray-700">
                                                    <i className="fa-regular fa-user text-blue-500"></i> {task.assignee?.name || "Unassigned"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(task.status)}`}>
                                                    {task.status ? task.status.replace("_", " ") : ""}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-500 font-medium">
                                                {task.due_date || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_tasks') && (
                                                        <button onClick={() => openViewModal(task)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_task') && (
                                                        <button onClick={() => openEditModal(task)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Task">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_task') && (
                                                        <button onClick={() => handleDelete(task.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Task">
                                                            <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-list-check text-4xl text-gray-300 mb-3"></i>
                                                <p>No tasks found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tasks.links && tasks.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {tasks.from || 0} to {tasks.to || 0} of {tasks.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {tasks.links.map((link, index) => (
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
            {showViewModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-regular fa-file-lines text-[var(--accent)]"></i> Task Details
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div className="sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Task Title</span>
                                    <div className="text-[20px] font-bold text-gray-900">{selectedTask.title}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Project Name</span>
                                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-folder text-[var(--accent)]"></i>
                                        {selectedTask.project?.title || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Assigned Personnel</span>
                                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-user text-blue-500"></i>
                                        {selectedTask.assignee?.name || "Unassigned"}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Priority Level</span>
                                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getPriorityBadge(selectedTask.priority)}`}>
                                        {selectedTask.priority}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Workflow Status</span>
                                    <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${getStatusBadge(selectedTask.status)}`}>
                                        {selectedTask.status ? selectedTask.status.replace("_", " ") : "TODO"}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Deadline / Due Date</span>
                                    <div className="font-medium text-gray-700 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days text-rose-500"></i>
                                        {selectedTask.due_date || "No deadline assigned"}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Detailed Description / Context</span>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 text-[14px] leading-relaxed min-h-[80px] whitespace-pre-line">
                                    {selectedTask.description || <span className="italic text-gray-400">No descriptions or scope notes provided for this task.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Modify Task Records" : "✨ Create New Project Task"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Task Title *</label>
                                        <input 
                                            type="text" 
                                            value={data.title} 
                                            onChange={(e) => setData("title", e.target.value)} 
                                            placeholder="Enter descriptive task title" 
                                            required 
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        />
                                        {errors.title && <p className="text-red-500 text-[12px] mt-1">{errors.title}</p>}
                                    </div>

                                    {/* --- Searchable Select for Project --- */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Project Allocation *</label>
                                        <SearchableSelect
                                            options={projects}
                                            value={data.project_id}
                                            onChange={(val) => setData("project_id", val)}
                                            placeholder="-- Select Project --"
                                            error={errors.project_id}
                                            getValue={(p) => p.id}
                                            getLabel={(p) => p.title}
                                        />
                                        {errors.project_id && <p className="text-red-500 text-[12px] mt-1">{errors.project_id}</p>}
                                    </div>

                                    {/* --- Searchable Select for Assignee --- */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Assign To Personnel *</label>
                                        <SearchableSelect
                                            options={users}
                                            value={data.assigned_to}
                                            onChange={(val) => setData("assigned_to", val)}
                                            placeholder="-- Assign To --"
                                            error={errors.assigned_to}
                                            getValue={(u) => u.id}
                                            getLabel={(u) => u.name}
                                        />
                                        {errors.assigned_to && <p className="text-red-500 text-[12px] mt-1">{errors.assigned_to}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Priority Level</label>
                                        <select 
                                            value={data.priority} 
                                            onChange={(e) => setData("priority", e.target.value)} 
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Workflow Status</label>
                                        <select 
                                            value={data.status} 
                                            onChange={(e) => setData("status", e.target.value)} 
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        >
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Target Due Date</label>
                                        <input 
                                            type="date" 
                                            value={data.due_date} 
                                            onChange={(e) => setData("due_date", e.target.value)} 
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Task Description / Notes</label>
                                    <textarea 
                                        value={data.description} 
                                        onChange={(e) => setData("description", e.target.value)} 
                                        rows="3" 
                                        placeholder="Write task details or requirements..."
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-y min-h-[80px] transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                    ></textarea>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Dismiss
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                    {processing ? "Saving..." : "Commit Assignment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}