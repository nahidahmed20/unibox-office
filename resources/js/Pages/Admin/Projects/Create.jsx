import React, { useMemo, useState, useRef, useEffect } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

const PRIORITIES = [
    { value: "low", label: "Low", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", activeBg: "bg-emerald-500", activeText: "text-white", border: "border-emerald-200", hover: "hover:bg-emerald-100" },
    { value: "medium", label: "Medium", dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", activeBg: "bg-orange-500", activeText: "text-white", border: "border-orange-200", hover: "hover:bg-orange-100" },
    { value: "high", label: "High", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", activeBg: "bg-red-500", activeText: "text-white", border: "border-red-200", hover: "hover:bg-red-100" },
    { value: "urgent", label: "Urgent", dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", activeBg: "bg-rose-500", activeText: "text-white", border: "border-rose-200", hover: "hover:bg-rose-100" },
];

const formatTaka = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n) || 0);

const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
};

export default function Create({ clients = [], managers = [] }) {
    const emptyProject = {
        title: "", description: "", quantity: "", unit_type: "piece",
        start_date: "", deadline: "", budget: "", status: "planning",
        priority: "medium", progress: 0, repo_link: "", live_url: ""
    };

    const { data, setData, post, processing, errors } = useForm({
        client_id: "",
        project_manager_id: "",
        projects: [{ ...emptyProject }]
    });

    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedManager, setSelectedManager] = useState(null);

    const footerRef = useRef(null);
    const [footerHeight, setFooterHeight] = useState(0);

    useEffect(() => {
        const el = footerRef.current;
        if (!el) return;
        const update = () => setFooterHeight(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        window.addEventListener("resize", update);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", update);
        };
    }, []);

    const clientOptions = useMemo(() => 
        clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`, raw: c })), 
    [clients]);

    const managerOptions = useMemo(() => 
        managers.map(m => ({ value: m.id, label: m.name, raw: m })), 
    [managers]);

    const addProjectRow = () => setData("projects", [...data.projects, { ...emptyProject }]);
    
    const removeProjectRow = (index) => {
        const updated = [...data.projects];
        updated.splice(index, 1);
        setData("projects", updated);
    };

    const updateProjectField = (index, field, value) => {
        const updated = [...data.projects];
        updated[index][field] = value;
        setData("projects", updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) return Swal.fire({ icon: 'warning', title: 'Client Required', text: 'Please select a target client first.', confirmButtonColor: '#111827' });
        
        const invalidProject = data.projects.find(p => !p.title || !p.deadline);
        if (invalidProject) return Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill out all required fields (Title, Deadline) for all projects.', confirmButtonColor: '#111827' });

        post(route("admin.projects.store"));
    };

    const totals = useMemo(() => {
        const budget = data.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
        const urgentSoon = data.projects.filter(p => {
            const d = daysUntil(p.deadline);
            return d !== null && d <= 7;
        }).length;
        return { budget, urgentSoon };
    }, [data.projects]);

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '48px',
            borderRadius: '0.75rem',
            border: state.isFocused ? '1px solid var(--accent, #6366f1)' : '1px solid #e5e7eb',
            backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.2s ease',
            fontSize: '14.5px',
            cursor: 'pointer',
            paddingLeft: '0.25rem',
            '&:hover': {
                borderColor: state.isFocused ? 'var(--accent, #6366f1)' : '#cbd5e1'
            }
        }),
        menu: (base) => ({ 
            ...base, 
            fontSize: '14.5px', 
            borderRadius: '0.75rem', 
            overflow: 'hidden', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9',
            marginTop: '8px'
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? 'var(--accent, #4f46e5)' : state.isFocused ? '#f1f5f9' : 'white',
            color: state.isSelected ? 'white' : '#334155',
            cursor: 'pointer',
            padding: '10px 16px',
            fontWeight: state.isSelected ? '600' : '400',
            transition: 'background-color 0.15s ease'
        })
    };

    return (
        <AdminLayout>
            <Head title="Create Projects" />

            <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider mb-3">
                            <i className="fa-solid fa-layer-group"></i> Batch Intake
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Create Projects</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5">Draft a manifest of projects and assign them to a single client instantly.</p>
                    </div>
                    <Link href={route('admin.projects.index')} className="group flex items-center justify-center gap-2 text-[14px] font-semibold text-gray-600 hover:text-indigo-600 transition-all bg-gray-50 hover:bg-indigo-50 px-5 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-200 shadow-sm">
                        <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i> Back to Directory
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    <section className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-60 pointer-events-none"></div>

                        <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50/80 to-white rounded-t-2xl">
                            <div className="h-10 w-10 rounded-xl bg-slate-800 shadow-md text-white flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-building-user text-[15px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-gray-900">Global Configuration</h2>
                                <p className="text-[12px] text-gray-500 font-medium mt-0.5">Define the client and manager for this entire batch.</p>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                        Target Client <span className="text-rose-500">*</span>
                                    </label>
                                    <Select
                                        value={clientOptions.find(opt => opt.value === data.client_id) || null}
                                        options={clientOptions}
                                        onChange={(opt) => { 
                                            setData("client_id", opt ? opt.value : ""); 
                                            setSelectedClient(opt ? opt.raw : null); 
                                        }}
                                        placeholder="🔍 Search and select client..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        menuPosition={'fixed'}
                                    />
                                    {errors.client_id && <p className="text-rose-500 text-[13px] font-medium mt-2 flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation"></i> {errors.client_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                        Project Manager <span className="text-gray-400 font-normal normal-case tracking-normal">(Optional)</span>
                                    </label>
                                    <Select
                                        value={managerOptions.find(opt => opt.value === data.project_manager_id) || null}
                                        options={managerOptions}
                                        onChange={(opt) => { 
                                            setData("project_manager_id", opt ? opt.value : ""); 
                                            setSelectedManager(opt ? opt.raw : null); 
                                        }}
                                        placeholder="👤 Assign a manager..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        menuPosition={'fixed'}
                                    />
                                </div>
                            </div>

                            {selectedClient && (
                                <div className="mt-7 flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                                    <div className="h-12 w-12 rounded-full bg-indigo-600 shadow-sm text-white flex items-center justify-center text-[16px] font-black shrink-0">
                                        {selectedClient.name ? selectedClient.name.charAt(0).toUpperCase() : "?"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-bold text-gray-900 truncate">
                                            {selectedClient.name} {selectedClient.company_name ? <span className="text-indigo-600 font-semibold text-[14px]">· {selectedClient.company_name}</span> : ""}
                                        </p>
                                        <p className="text-[13px] text-gray-600 mt-0.5 flex items-center gap-1.5">
                                            <i className="fa-regular fa-folder-open text-indigo-400"></i>
                                            All projects below will be assigned here {selectedManager ? <span className="font-semibold text-gray-700">— Managed by {selectedManager.name}</span> : ""}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="relative">
                        {data.projects.length > 1 && (
                            <div className="absolute left-[39px] top-16 bottom-16 w-1 bg-gradient-to-b from-indigo-200 via-gray-200 to-transparent hidden lg:block rounded-full" aria-hidden="true"></div>
                        )}

                        <div className="space-y-8">
                            {data.projects.map((proj, index) => {
                                const p = PRIORITIES.find(x => x.value === proj.priority) || PRIORITIES[1];
                                const dLeft = daysUntil(proj.deadline);

                                return (
                                    <section key={index} className="bg-white rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] relative border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
                                        
                                        <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/40 rounded-t-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white text-[15px] font-black shadow-md shrink-0 transition-transform group-hover:scale-105">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-3">
                                                        Project #{index + 1}
                                                        {dLeft !== null && dLeft <= 7 && (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 shadow-sm">
                                                                <i className="fa-solid fa-clock"></i> {dLeft < 0 ? "Overdue" : `${dLeft} Days Left`}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    {proj.title && <p className="text-[13px] text-gray-500 font-medium truncate max-w-xs sm:max-w-md">{proj.title}</p>}
                                                </div>
                                            </div>

                                            {data.projects.length > 1 && (
                                                <button type="button" onClick={() => removeProjectRow(index)} className="flex items-center gap-2 text-rose-500 text-[13px] font-bold px-4 py-2 rounded-xl transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100">
                                                    <i className="fa-regular fa-trash-can"></i> <span className="hidden sm:inline">Remove</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-6 md:p-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-7">

                                                <div className="md:col-span-2 lg:col-span-12">
                                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                                        Project Title <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={proj.title} 
                                                        onChange={e => updateProjectField(index, "title", e.target.value)} 
                                                        required 
                                                        placeholder="e.g. E-Commerce Website Development" 
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-white px-4 py-3.5 text-[15px] font-semibold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-gray-400 shadow-sm" 
                                                    />
                                                    {errors[`projects.${index}.title`] && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors[`projects.${index}.title`]}</p>}
                                                </div>

                                                <div className="md:col-span-2 lg:col-span-12">
                                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Priority Level</label>
                                                    <div className="flex flex-wrap gap-3 p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                                                        {PRIORITIES.map(pr => {
                                                            const isActive = proj.priority === pr.value;
                                                            return (
                                                                <button
                                                                    key={pr.value}
                                                                    type="button"
                                                                    onClick={() => updateProjectField(index, "priority", pr.value)}
                                                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                                                                        isActive ? "text-white shadow-md transform scale-[1.02]" : "bg-transparent text-gray-500"
                                                                    }`}
                                                                    style={{
                                                                        backgroundColor: isActive ? (pr.value === "low" ? "#10b981" : pr.value === "medium" ? "#f97316" : pr.value === "high" ? "#ef4444" : "#f43f5e") : "transparent"
                                                                    }}
                                                                >
                                                                    {!isActive && (
                                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pr.value === "low" ? "#10b981" : pr.value === "medium" ? "#f97316" : pr.value === "high" ? "#ef4444" : "#f43f5e" }}></span>
                                                                    )}
                                                                    {isActive && <i className="fa-solid fa-check text-[11px]"></i>}
                                                                    {pr.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-4">
                                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Quantity / Size</label>
                                                    <div className="flex bg-gray-50 rounded-xl border border-gray-200 overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all hover:bg-gray-100 focus-within:bg-white shadow-sm">
                                                        <input 
                                                            type="number" min="0" step="any" 
                                                            value={proj.quantity} 
                                                            onChange={e => updateProjectField(index, "quantity", e.target.value)} 
                                                            placeholder="0" 
                                                            className="w-full bg-transparent px-4 py-3.5 text-[14.5px] font-semibold text-gray-900 outline-none border-none border-r border-gray-200" 
                                                        />
                                                        <select 
                                                            value={proj.unit_type} 
                                                            onChange={e => updateProjectField(index, "unit_type", e.target.value)} 
                                                            className="w-[90px] bg-gray-100/50 px-2 py-3.5 text-[13px] font-bold outline-none border-none cursor-pointer appearance-none text-center text-gray-700 hover:bg-gray-200 transition-colors"
                                                        >
                                                            <option value="piece">Pcs</option>
                                                            <option value="kg">Kg</option>
                                                            <option value="set">Set</option>
                                                            <option value="box">Box</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-4">
                                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Total Budget (TK)</label>
                                                    <div className="relative">
                                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-emerald-50 border-r border-gray-200 rounded-l-xl">
                                                            <span className="text-emerald-600 font-bold text-[15px]">৳</span>
                                                        </div>
                                                        <input 
                                                            type="number" min="0" step="0.01" 
                                                            value={proj.budget} 
                                                            onChange={e => updateProjectField(index, "budget", e.target.value)} 
                                                            placeholder="0.00" 
                                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-white pl-14 pr-4 py-3.5 text-[15px] font-bold text-emerald-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Start Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={proj.start_date} 
                                                            onChange={e => updateProjectField(index, "start_date", e.target.value)} 
                                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-white px-3 py-3.5 text-[14px] font-semibold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[12px] font-bold text-rose-600 uppercase tracking-wider mb-2.5">Deadline <span className="text-rose-500">*</span></label>
                                                        <input 
                                                            type="date" 
                                                            value={proj.deadline} 
                                                            onChange={e => updateProjectField(index, "deadline", e.target.value)} 
                                                            required 
                                                            className="w-full rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 focus:bg-white px-3 py-3.5 text-[14px] font-bold text-rose-700 outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 lg:col-span-12 mt-2">
                                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Project Scope / Details</label>
                                                    <textarea 
                                                        value={proj.description} 
                                                        onChange={e => updateProjectField(index, "description", e.target.value)} 
                                                        rows="3" 
                                                        placeholder="Write down project requirements, links, or specific notes..." 
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-white px-4 py-4 text-[14.5px] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y leading-relaxed text-gray-800 shadow-sm"
                                                    ></textarea>
                                                </div>

                                            </div>
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="button" 
                            onClick={addProjectRow} 
                            className="w-full py-6 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-2xl bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all duration-300 group shadow-sm flex flex-col sm:flex-row items-center justify-center gap-3"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 group-hover:border-indigo-400 bg-white transition-colors shadow-sm">
                                <i className="fa-solid fa-plus text-gray-400 group-hover:text-indigo-600 transition-transform group-hover:scale-110 text-lg"></i>
                            </span>
                            <span className="text-[15px]">Add Another Project to this Batch</span>
                        </button>
                    </div>

                    <div aria-hidden="true" style={{ height: footerHeight ? footerHeight + 16 : 0 }} />

                    <div ref={footerRef} className="fixed bottom-0 left-0 md:left-[270px] right-0 z-[999] bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-[13px] font-bold text-gray-500">
                                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                    <i className="fa-solid fa-layer-group text-gray-400"></i>
                                    <span><span className="text-gray-900 text-[15px]">{data.projects.length}</span> Project(s)</span>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700">
                                    <i className="fa-solid fa-sack-dollar text-emerald-500"></i>
                                    <span>Total Value: <span className="text-[15px]">৳{formatTaka(totals.budget)}</span></span>
                                </div>
                                {totals.urgentSoon > 0 && (
                                    <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-lg text-rose-700 animate-pulse">
                                        <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
                                        <span>{totals.urgentSoon} Due Soon</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                                <Link
                                    href={route('admin.projects.index')}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-[14px] hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                                >
                                    <i className="fa-solid fa-xmark mr-2"></i> Cancel
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-slate-900 text-white font-semibold text-[14px] hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cloud-arrow-up"></i>
                                            <span>Save Batch</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}