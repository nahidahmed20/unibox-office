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

export default function Edit({ project, clients = [], managers = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        client_id: project.client_id || "",
        project_manager_id: project.project_manager_id || "",
        title: project.title || "",
        description: project.description || "",
        quantity: project.quantity || "",
        unit_type: project.unit_type || "piece",
        start_date: project.start_date ? project.start_date.split('T')[0] : "",
        deadline: project.deadline ? project.deadline.split('T')[0] : "",
        budget: project.budget || "",
        status: project.status || "planning",
        priority: project.priority || "medium",
        progress: project.progress || 0,
        repo_link: project.repo_link || "",
        live_url: project.live_url || ""
    });

    const [selectedClient, setSelectedClient] = useState(() => clients.find(c => c.id === project.client_id) || null);
    const [selectedManager, setSelectedManager] = useState(() => managers.find(m => m.id === project.project_manager_id) || null);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) return Swal.fire({ icon: 'warning', title: 'Client Required', text: 'Please select a target client first.', confirmButtonColor: '#4f46e5' });
        if (!data.title || !data.deadline) return Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill out all required fields (Title, Deadline).', confirmButtonColor: '#4f46e5' });

        put(route("admin.projects.update", project.id), {
            onSuccess: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Project Updated!', showConfirmButton: false, timer: 1500 });
            }
        });
    };

    const dLeft = daysUntil(data.deadline);

    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '48px', borderRadius: '0.75rem',
            border: state.isFocused ? '1px solid var(--accent, #6366f1)' : '1px solid #e5e7eb',
            backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : 'none',
            transition: 'all 0.2s ease', fontSize: '14px', cursor: 'pointer', paddingLeft: '0.25rem',
            '&:hover': { borderColor: state.isFocused ? 'var(--accent, #6366f1)' : '#cbd5e1' }
        }),
        menu: (base) => ({
            ...base, fontSize: '14px', borderRadius: '0.75rem', overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9', marginTop: '8px', zIndex: 9999
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base, backgroundColor: state.isSelected ? 'var(--accent, #4f46e5)' : state.isFocused ? '#f8fafc' : 'white',
            color: state.isSelected ? 'white' : '#1e293b', cursor: 'pointer', padding: '10px 16px',
            fontWeight: state.isSelected ? '700' : '500', transition: 'background-color 0.15s ease'
        })
    };

    return (
        <AdminLayout>
            <Head title="Edit Project" />

            <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 mt-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-wider mb-3">
                            <i className="fa-solid fa-pen-ruler"></i> Modification
                        </div>
                        <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight">Edit Project</h1>
                        <p className="text-[14.5px] font-bold text-indigo-600 mt-1">#{project.id} — {project.title}</p>
                    </div>
                    <Link href={route('admin.projects.index')} className="flex items-center justify-center gap-2 text-[14px] font-bold text-gray-600 hover:text-indigo-600 transition-all bg-gray-50 hover:bg-indigo-50 px-6 py-3 rounded-xl border border-gray-200 hover:border-indigo-200 shadow-sm group">
                        <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i> Back to Directory
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Global Configuration Section */}
                    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-full opacity-60 pointer-events-none"></div>

                        <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50/80 to-white rounded-t-3xl">
                            <div className="h-10 w-10 rounded-xl bg-slate-800 shadow-md text-white flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-building-user text-[15px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-gray-900">Project Assignment</h2>
                                <p className="text-[12.5px] text-gray-500 font-medium mt-0.5">Manage client assignment and project manager.</p>
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
                                    {errors.client_id && <p className="text-rose-500 text-[12px] font-bold mt-1.5">{errors.client_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                        Project Manager <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span>
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
                        </div>
                    </section>

                    {/* Single Project Detailed Form Section */}
                    <section className="bg-white rounded-3xl shadow-sm relative border border-gray-200 transition-all duration-300">

                        <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/80 rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white text-[16px] font-black shadow-md shrink-0">
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-gray-900 flex items-center gap-3">
                                        Project Details
                                        {dLeft !== null && dLeft <= 7 && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 shadow-sm">
                                                <i className="fa-solid fa-clock"></i> {dLeft < 0 ? "Overdue" : `${dLeft} Days Left`}
                                            </span>
                                        )}
                                    </h3>
                                    {data.title && <p className="text-[13px] text-gray-500 font-semibold truncate max-w-xs sm:max-w-md mt-0.5">{data.title}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-7">

                                <div className="md:col-span-2 lg:col-span-12">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                        Project Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData("title", e.target.value)}
                                        required
                                        placeholder="e.g. E-Commerce Website Development"
                                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[15px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                    />
                                    {errors.title && <p className="text-rose-500 text-[12px] font-bold mt-1.5">{errors.title}</p>}
                                </div>

                                <div className="md:col-span-2 lg:col-span-12">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Priority Level</label>
                                    <div className="flex flex-wrap gap-3 p-2 bg-gray-50 border border-gray-100 rounded-xl w-fit">
                                        {PRIORITIES.map(pr => {
                                            const isActive = data.priority === pr.value;
                                            return (
                                                <button
                                                    key={pr.value}
                                                    type="button"
                                                    onClick={() => setData("priority", pr.value)}
                                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                                                        isActive ? "text-white shadow-md transform scale-105" : "bg-transparent text-gray-500 hover:bg-gray-200/50"
                                                    }`}
                                                    style={{ backgroundColor: isActive ? (pr.value === "low" ? "#10b981" : pr.value === "medium" ? "#f97316" : pr.value === "high" ? "#ef4444" : "#f43f5e") : "transparent" }}
                                                >
                                                    {!isActive && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pr.value === "low" ? "#10b981" : pr.value === "medium" ? "#f97316" : pr.value === "high" ? "#ef4444" : "#f43f5e" }}></span>}
                                                    {isActive && <i className="fa-solid fa-check text-[11px]"></i>}
                                                    {pr.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="lg:col-span-4">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Quantity / Size</label>
                                    <div className="flex bg-white rounded-xl border border-gray-300 overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm">
                                        <input
                                            type="number" min="0" step="any"
                                            value={data.quantity}
                                            onChange={e => setData("quantity", e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent px-4 py-3.5 text-[15px] font-bold text-gray-900 outline-none border-none border-r border-gray-200"
                                        />
                                        <select
                                            value={data.unit_type}
                                            onChange={e => setData("unit_type", e.target.value)}
                                            className="w-[100px] bg-gray-50 px-2 py-3.5 text-[13.5px] font-bold text-gray-700 outline-none border-none cursor-pointer appearance-none text-center hover:bg-gray-100 transition-colors"
                                        >
                                            <option value="piece">Pcs</option><option value="kg">Kg</option><option value="set">Set</option><option value="box">Box</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="lg:col-span-4">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Total Budget (TK)</label>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-emerald-50 border-r border-emerald-200 rounded-l-xl z-10">
                                            <span className="text-emerald-600 font-bold text-[17px]" style={{ fontFamily: 'Arial, sans-serif' }}>৳</span>
                                        </div>
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={data.budget}
                                            onChange={e => setData("budget", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full rounded-xl border border-gray-300 bg-white pl-14 pr-4 py-3.5 text-[15px] font-black text-emerald-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm relative z-0"
                                        />
                                    </div>
                                </div>

                                <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Start Date</label>
                                        <input
                                            type="date"
                                            value={data.start_date}
                                            onChange={e => setData("start_date", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3.5 text-[14px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-rose-600 uppercase tracking-wider mb-2.5">Deadline <span className="text-rose-500">*</span></label>
                                        <input
                                            type="date"
                                            value={data.deadline}
                                            onChange={e => setData("deadline", e.target.value)}
                                            required
                                            className="w-full rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 focus:bg-white px-3 py-3.5 text-[14px] font-bold text-rose-700 outline-none transition-shadow focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 lg:col-span-12 mt-2">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Project Scope / Details</label>
                                    <textarea
                                        value={data.description}
                                        onChange={e => setData("description", e.target.value)}
                                        rows="3"
                                        placeholder="Write down project requirements, links, or specific notes..."
                                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-[14.5px] font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y leading-relaxed text-gray-800 shadow-sm"
                                    ></textarea>
                                </div>

                                {/* 🟢 Status & Progress Block (Modern UI) */}
                                <div className="md:col-span-2 lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-8 mt-2">
                                    <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 shadow-sm">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-3">Current Status <span className="text-rose-500">*</span></label>
                                        <select
                                            value={data.status}
                                            onChange={e => setData("status", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14.5px] font-bold outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                        >
                                            <option value="planning">Planning (Not Started)</option>
                                            <option value="in_progress">In Progress (Active)</option>
                                            <option value="on_hold">On Hold (Paused)</option>
                                            <option value="completed">Completed (Done)</option>
                                        </select>
                                    </div>

                                    <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                        <label className="flex justify-between text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-3">
                                            <span>Completion Progress</span>
                                            <span className={`font-black text-[16px] ${data.progress == 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{data.progress}%</span>
                                        </label>
                                        <div className="relative pt-1">
                                            <input
                                                type="range" min="0" max="100"
                                                value={data.progress}
                                                onChange={e => setData("progress", e.target.value)}
                                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                                                <span>0%</span>
                                                <span>50%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* External Links Block */}
                                <div className="md:col-span-2 lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                            <i className="fa-brands fa-github mr-1 text-gray-800"></i> Repo / Drive Link
                                        </label>
                                        <input
                                            type="url"
                                            value={data.repo_link}
                                            onChange={e => setData("repo_link", e.target.value)}
                                            placeholder="https://github.com/..."
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14px] font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                                            <i className="fa-solid fa-globe mr-1 text-blue-500"></i> Live URL
                                        </label>
                                        <input
                                            type="url"
                                            value={data.live_url}
                                            onChange={e => setData("live_url", e.target.value)}
                                            placeholder="https://www.example.com"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14px] font-medium text-blue-600 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    <div aria-hidden="true" style={{ height: footerHeight ? footerHeight + 16 : 0 }} />

                    {/* Sticky Footer */}
                    <div ref={footerRef} className="fixed bottom-0 left-0 md:left-[270px] right-0 z-[999] bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
                        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-[13px] font-bold text-gray-500">
                                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700 border border-emerald-100 shadow-sm">
                                    <i className="fa-solid fa-sack-dollar text-emerald-500"></i>
                                    <span>Budget: <span className="text-[16px] font-black">৳{formatTaka(data.budget)}</span></span>
                                </div>
                                {dLeft !== null && (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm font-bold border ${dLeft <= 7 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                        <i className="fa-solid fa-clock"></i>
                                        <span>{dLeft < 0 ? "Deadline Overdue" : `${dLeft} Days Remaining`}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                                <Link
                                    href={route('admin.projects.index')}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-[14.5px] hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-[14.5px] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-70"
                                >
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-cloud-arrow-up"></i> Update Project</>}
                                </button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
