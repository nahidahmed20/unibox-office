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
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-[14px] font-bold outline-none transition-shadow 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 border-gray-200' : 'bg-white hover:bg-gray-50 focus:ring-4'} 
                    ${error ? 'border-red-400 focus:ring-red-500/10' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/10'} 
                    ${selected ? 'text-gray-900' : 'text-gray-500'} shadow-sm
                `}
            >
                <span className="truncate flex-1">
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>

            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-[13px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 bg-white"
                        />
                    </div>
                    <div className="overflow-y-auto py-1 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] font-medium text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        className={`cursor-pointer px-4 py-2.5 text-[13.5px] transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 font-medium hover:bg-gray-50'}`}
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
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 25;
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
            if (perPage !== 25) params.per_page = perPage;

            router.get(route("admin.tasks.index"), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!tasks.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = tasks.data
            .map((t) => `${t.title}\t${t.project?.title || "N/A"}\t${t.assignee?.name || "N/A"}\t${t.priority?.toUpperCase()}\t${t.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText("Task Title\tProject\tAssignee\tPriority\tStatus\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
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

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Tasks Report</title>
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
                    <h2>Tasks Directory Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
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
            id: '', project_id: '', assigned_to: '', title: '', description: '',
            priority: 'medium', status: 'todo', due_date: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (task) => {
        clearErrors();
        setData({
            id: task.id, project_id: task.project_id || '', assigned_to: task.assigned_to || '',
            title: task.title, description: task.description || "",
            priority: task.priority, status: task.status, due_date: task.due_date || "",
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
                    Swal.fire({ toast: true, position: 'top-end', icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.tasks.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ toast: true, position: 'top-end', icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
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
            cancelButtonColor: "#64748b",
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
            low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            medium: "bg-blue-50 text-blue-700 border border-blue-200",
            high: "bg-orange-50 text-orange-700 border border-orange-200",
            urgent: "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
        };
        return styles[priority] || "bg-gray-50 text-gray-700 border border-gray-200";
    };

    const getStatusBadge = (status) => {
        const styles = {
            todo: "bg-slate-100 text-slate-600 border border-slate-200",
            in_progress: "bg-amber-50 text-amber-600 border border-amber-200",
            review: "bg-purple-50 text-purple-600 border border-purple-200",
            done: "bg-emerald-50 text-emerald-600 border border-emerald-200"
        };
        return styles[status] || "bg-gray-100 text-gray-600 border border-gray-200";
    };

    return (
        <AdminLayout>
            <Head title="Tasks Management" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Operations
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Task Workspace</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Manage, track and update team assignments seamlessly.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-list-check text-[14px]"></i>
                            </div>
                            Current Active Tasks
                        </div>
                        {hasPermission('create_task') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Add New Task
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* 🟢 Premium SVG Show Dropdown */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select 
                                        value={perPage} 
                                        onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    
                                    {/* কাস্টম SVG Arrow */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search tasks..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" 
                            />
                        </div>
                    </div>

                    {/* 🟢 Data Table with Beautiful Header */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[25%]">Task Details</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Project</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Assignee</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Priority</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Status</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Due Date</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {tasks.data && tasks.data.length > 0 ? (
                                    tasks.data.map((task, index) => (
                                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                {tasks.from ? tasks.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-[14.5px] text-gray-900 truncate max-w-[280px]" title={task.title}>{task.title}</div>
                                                {task.description && (
                                                    <span className="text-[12px] font-medium text-gray-500 mt-1 block max-w-[280px] truncate" title={task.description}>
                                                        {task.description}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-layer-group text-indigo-400 text-[11px]"></i>
                                                    <span className="truncate max-w-[200px]" title={task.project?.title || "N/A"}>{task.project?.title || "N/A"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-black uppercase shadow-sm">
                                                        {task.assignee?.name ? task.assignee.name.charAt(0) : '?'}
                                                    </div>
                                                    <div className="font-bold text-gray-900 text-[13.5px]">
                                                        {task.assignee?.name || <span className="text-gray-400 italic">Unassigned</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(task.status)}`}>
                                                    {task.status ? task.status.replace("_", " ") : ""}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-500 font-semibold">
                                                {task.due_date ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <i className="fa-regular fa-calendar-days text-[11px] text-gray-400"></i> {task.due_date}
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_tasks') && (
                                                        <button onClick={() => openViewModal(task)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_task') && (
                                                        <button onClick={() => openEditModal(task)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Task">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_task') && (
                                                        <button onClick={() => handleDelete(task.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Task">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                                                    <i className="fa-solid fa-list-check text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No tasks found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or add a new task.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tasks.links && tasks.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing {tasks.from || 0} to {tasks.to || 0} of {tasks.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {tasks.links.map((link, index) => (
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

            {/* --- 🟢 STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Premium Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-black opacity-10 -translate-x-5 translate-y-5"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl shadow-lg ring-1 ring-white/30">
                                    <i className="fa-regular fa-file-lines"></i>
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedTask.status === 'done' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'}`}>
                                            {selectedTask.status ? selectedTask.status.replace("_", " ") : "TODO"}
                                        </span>
                                        {selectedTask.priority && <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white">Priority: {selectedTask.priority}</span>}
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">{selectedTask.title}</h2>
                                </div>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-folder mr-1 text-indigo-400"></i> Project</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedTask.project?.title || "N/A"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[16px] font-black uppercase shadow-sm">
                                        {selectedTask.assignee?.name ? selectedTask.assignee.name.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Assignee</span>
                                        <div className="font-bold text-gray-900 text-[15px]">{selectedTask.assignee?.name || "Unassigned"}</div>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-rose-400"></i> Due Date</span>
                                    <div className="font-bold text-gray-900 text-[14px]">{selectedTask.due_date || "No deadline assigned"}</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-3 border-b border-gray-100 pb-2"><i className="fa-solid fa-align-left text-gray-400 mr-1.5"></i> Task Description / Notes</span>
                                <div className="text-gray-600 text-[14.5px] leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[100px]">
                                    {selectedTask.description || <span className="italic text-gray-400">No descriptions or scope notes provided for this task.</span>}
                                </div>
                            </div>

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

            {/* --- 🟢 STUNNING CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-list-check"></i> {editMode ? 'Update' : 'New Task'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Modify Task Records" : "Create New Project Task"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Task Title <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={data.title} 
                                            onChange={(e) => setData("title", e.target.value)} 
                                            placeholder="Enter descriptive task title" 
                                            required 
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                                        />
                                        {errors.title && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.title}</p>}
                                    </div>

                                    {/* Searchable Select for Project */}
                                    <div className="relative z-[60]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Project Allocation <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={projects}
                                            value={data.project_id}
                                            onChange={(val) => setData("project_id", val)}
                                            placeholder="-- Select Project --"
                                            error={errors.project_id}
                                            getValue={(p) => p.id}
                                            getLabel={(p) => p.title}
                                        />
                                        {errors.project_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.project_id}</p>}
                                    </div>

                                    {/* Searchable Select for Assignee */}
                                    <div className="relative z-[50]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Assign To Personnel <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={users}
                                            value={data.assigned_to}
                                            onChange={(val) => setData("assigned_to", val)}
                                            placeholder="-- Assign To --"
                                            error={errors.assigned_to}
                                            getValue={(u) => u.id}
                                            getLabel={(u) => u.name}
                                        />
                                        {errors.assigned_to && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.assigned_to}</p>}
                                    </div>

                                    <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Priority Level</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.priority} 
                                                    onChange={(e) => setData("priority", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                    <option value="urgent">Urgent</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[11px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Workflow Status</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.status} 
                                                    onChange={(e) => setData("status", e.target.value)} 
                                                    className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                                >
                                                    <option value="todo">To Do</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="review">Review</option>
                                                    <option value="done">Done</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[11px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Target Due Date</label>
                                            <input 
                                                type="date" 
                                                value={data.due_date} 
                                                onChange={(e) => setData("due_date", e.target.value)} 
                                                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[13.5px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer" 
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Task Description / Notes</label>
                                        <textarea 
                                            value={data.description} 
                                            onChange={(e) => setData("description", e.target.value)} 
                                            rows="3" 
                                            placeholder="Write task details or requirements..."
                                            className="w-full rounded-xl border border-gray-300 px-4 py-4 text-[14px] font-medium outline-none resize-y min-h-[100px] transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm text-gray-800"
                                        ></textarea>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Dismiss
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> Commit Assignment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}