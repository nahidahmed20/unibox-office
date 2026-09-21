import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';

// Updated Priorities with modern vibrant colors
const PRIORITIES = [
    { value: "low", label: "Low", color: "#059669" },      // Emerald 600
    { value: "medium", label: "Medium", color: "#D97706" }, // Amber 600
    { value: "high", label: "High", color: "#EA580C" },     // Orange 600
    { value: "urgent", label: "Urgent", color: "#DC2626" }, // Red 600
];

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 ${className}`}>৳</span>
);

const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
};

// Modernized Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '48px',
        borderRadius: '10px',
        borderColor: state.isFocused ? '#4F46E5' : '#E2E8F0', // Indigo-600 or Slate-200
        boxShadow: state.isFocused ? '0 0 0 4px rgba(79, 70, 229, 0.15)' : 'none',
        backgroundColor: '#F8FAFC', // Slate-50
        '&:hover': { borderColor: '#4F46E5' },
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white', // Indigo
        color: state.isSelected ? '#FFFFFF' : '#1E293B',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#94A3B8', fontWeight: 600, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#1E293B', fontWeight: 700, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#1E293B', fontWeight: 600, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0' }),
};

export default function Edit({ project, clients = [], managers = [] }) {
    // 🟢 Initialize state with existing project and items data
    const { data, setData, put, processing, errors } = useForm({
        client_id: project.client_id || "",
        project_manager_id: project.project_manager_id || "",
        title: project.title || "",
        description: project.description || "",
        start_date: project.start_date ? project.start_date.split('T')[0] : "",
        deadline: project.deadline ? project.deadline.split('T')[0] : "",
        status: project.status || "planning",
        priority: project.priority || "medium",
        progress: project.progress || 0,
        repo_link: project.repo_link || "",
        live_url: project.live_url || "",
        // 🟢 Load existing items from database
        items: project.items && project.items.length > 0 ? project.items.map(i => ({
            id: i.id,
            item_name: i.item_name || "",
            description: i.description || "",
            quantity: i.quantity || 1,
            unit_type: i.unit_type || "piece",
            unit_price: i.unit_price || 0,
            total: i.total || 0
        })) : [{ item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]
    });

    const [selectedClient, setSelectedClient] = useState(() => clients.find(c => c.id === project.client_id) || null);

    /* Sticky Summary Refs */
    const formRef = useRef(null);
    const leftColumnRef = useRef(null);
    const stickyWrapperRef = useRef(null);
    const stickyInnerRef = useRef(null);
    const [stickyStyle, setStickyStyle] = useState({});

    const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`, raw: c })), [clients]);
    const managerOptions = useMemo(() => managers.map(m => ({ value: m.id, label: m.name, raw: m })), [managers]);

    const updateItem = (index, field, value) => {
        setData("items", data.items.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            if (field === "quantity" || field === "unit_price") {
                updated.total = (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0);
            }
            return updated;
        }));
    };

    const addItemRow = () => setData("items", [...data.items, { item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]);
    const removeItemRow = (index) => setData("items", data.items.filter((_, i) => i !== index));

    const totalBudget = data.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const dLeft = daysUntil(data.deadline);

    /* Sticky Logic */
    const updateStickyPosition = useCallback(() => {
        const form = formRef.current;
        const leftColumn = leftColumnRef.current;
        const wrapper = stickyWrapperRef.current;
        const inner = stickyInnerRef.current;

        if (!form || !leftColumn || !wrapper || !inner) return;

        if (window.innerWidth < 1280) {
            wrapper.style.minHeight = "";
            setStickyStyle({});
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        const innerHeight = inner.offsetHeight;
        const TOP_OFFSET = 24;

        wrapper.style.minHeight = `${leftColumn.offsetHeight}px`;

        if (wrapperRect.top > TOP_OFFSET) {
            setStickyStyle({ position: "absolute", top: 0, left: 0, width: "100%" });
        } else if (formRect.bottom > innerHeight + TOP_OFFSET) {
            setStickyStyle({ position: "fixed", top: `${TOP_OFFSET}px`, left: `${wrapperRect.left}px`, width: `${wrapperRect.width}px` });
        } else {
            setStickyStyle({ position: "absolute", top: "auto", bottom: 0, left: 0, width: "100%" });
        }
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", updateStickyPosition, { passive: true });
        window.addEventListener("resize", updateStickyPosition);
        updateStickyPosition();
        return () => {
            window.removeEventListener("scroll", updateStickyPosition);
            window.removeEventListener("resize", updateStickyPosition);
        };
    }, [updateStickyPosition]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id || !data.title) return Swal.fire({ icon: 'warning', title: 'Required Fields', text: 'Please fill out Client and Project Title.', confirmButtonColor: '#4F46E5' });

        put(route("admin.projects.update", project.id), {
            onSuccess: () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Project Updated!', showConfirmButton: false, timer: 1500 }),
            onError: () => Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please check the form for missing or incorrect data.', confirmButtonColor: '#EF4444' })
        });
    };

    // Modernized general input classes
    const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15 transition-colors";

    return (
        <AdminLayout>
            <Head title={`Edit Project - ${project.title}`} />

            <style dangerouslySetInnerHTML={{__html: `
                .ql-editor { min-height: 100px; font-size: 14px; background: #F8FAFC; border-radius: 0 0 0.5rem 0.5rem; font-weight: 500; color: #1E293B; }
                .ql-editor.ql-blank::before { color: #94A3B8; font-style: normal; font-weight: 500; }
                .ql-editor:focus { background: #ffffff; }
                .ql-toolbar.ql-snow { border-radius: 0.5rem 0.5rem 0 0; background: #ffffff; border-color: #E2E8F0 !important; }
                .ql-container.ql-snow { border-color: #E2E8F0 !important; }
                .quill-wrapper { border-radius: 0.5rem; overflow: hidden; transition: box-shadow 0.15s ease; }
                .quill-wrapper:focus-within .ql-toolbar.ql-snow,
                .quill-wrapper:focus-within .ql-container.ql-snow { border-color: #4F46E5 !important; }
                input[type="range"].ledger-range { accent-color: #4F46E5; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-slate-200">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-500 mb-1">Editing</p>
                        <h1 className="text-[28px] sm:text-[32px] font-bold text-slate-900 tracking-tight leading-none">Edit project</h1>
                        <p className="text-[14px] text-indigo-600 font-semibold mt-2 truncate max-w-lg">#{project.id} — {project.title}</p>
                    </div>
                    <Link href={route("admin.projects.index")} className="flex w-fit items-center justify-center gap-2 text-[13px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors border border-slate-200 hover:border-indigo-600 px-5 py-2.5 rounded-lg shrink-0 bg-white shadow-sm">
                        <i className="fa-solid fa-arrow-left-long"></i> Directory
                    </Link>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="relative flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Column */}
                    <div ref={leftColumnRef} className="flex-1 w-full flex flex-col gap-8">

                        {/* General Info */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
                                    <i className="fa-solid fa-circle-info text-[15px]"></i>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">Project details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Select client <span className="text-red-500">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === data.client_id) || null}
                                        onChange={(opt) => {
                                            setData("client_id", opt ? opt.value : "");
                                            setSelectedClient(opt ? opt.raw : null);
                                        }}
                                        styles={selectStyles}
                                        isClearable placeholder="Search client…" menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed"
                                    />
                                    {errors.client_id && <span className="text-red-500 text-[12px] font-semibold mt-2 block">{errors.client_id}</span>}
                                </div>
                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Manager (optional)</label>
                                    <Select
                                        options={managerOptions}
                                        value={managerOptions.find(o => o.value === data.project_manager_id) || null}
                                        onChange={(opt) => setData("project_manager_id", opt ? opt.value : "")}
                                        styles={selectStyles}
                                        isClearable placeholder="Assign manager…" menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Project title <span className="text-red-500">*</span></label>
                                    <input type="text" value={data.title} onChange={e => setData("title", e.target.value)} placeholder="E.g., Complete Branding Package" className={inputClass} required />
                                    {errors.title && <span className="text-red-500 text-[12px] font-semibold mt-2 block">{errors.title}</span>}
                                </div>

                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Start date</label>
                                    <input type="date" value={data.start_date} onChange={e => setData("start_date", e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-[12.5px] font-semibold text-red-600 mb-2.5">Deadline <span className="text-red-500">*</span></label>
                                    <input type="date" value={data.deadline} onChange={e => setData("deadline", e.target.value)} className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700 outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-colors cursor-pointer" required />
                                    {errors.deadline && <span className="text-red-500 text-[12px] font-semibold mt-2 block">{errors.deadline}</span>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Priority</label>
                                    <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                                        {PRIORITIES.map(pr => {
                                            const isActive = data.priority === pr.value;
                                            return (
                                                <button
                                                    key={pr.value} type="button"
                                                    onClick={() => setData("priority", pr.value)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${isActive ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/50"}`}
                                                    style={{ backgroundColor: isActive ? pr.color : "transparent" }}
                                                >
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : pr.color }}></span>
                                                    {pr.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status & Progress */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600">
                                    <i className="fa-solid fa-spinner text-[15px]"></i>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">Status &amp; progress</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Current status <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select value={data.status} onChange={(e) => setData("status", e.target.value)} className={`${inputClass} appearance-none cursor-pointer pr-10`} style={{ backgroundImage: 'none' }}>
                                            <option value="planning">Planning (Not Started)</option>
                                            <option value="in_progress">In Progress (Active)</option>
                                            <option value="on_hold">On Hold (Paused)</option>
                                            <option value="completed">Completed (Done)</option>
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex justify-between text-[12.5px] font-semibold text-slate-600 mb-2.5">
                                        <span>Completion progress</span>
                                        <span className={`font-mono font-bold text-[15px] ${data.progress == 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{data.progress}%</span>
                                    </label>
                                    <div className="relative pt-2">
                                        <input type="range" min="0" max="100" value={data.progress} onChange={e => setData("progress", e.target.value)} className="ledger-range w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer" />
                                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 font-mono">
                                            <span>0%</span><span>50%</span><span>100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Links */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600">
                                    <i className="fa-solid fa-align-left text-[15px]"></i>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">Notes &amp; links</h3>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Project scope / details</label>
                                    <div className="quill-wrapper">
                                        <ReactQuill theme="snow" value={data.description || ''} onChange={(val) => setData("description", val)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5"><i className="fa-brands fa-github text-slate-400 mr-1"></i> Repo / drive link</label>
                                        <input type="url" value={data.repo_link} onChange={e => setData("repo_link", e.target.value)} placeholder="https://github.com/..." className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5"><i className="fa-solid fa-globe text-slate-400 mr-1"></i> Live URL</label>
                                        <input type="url" value={data.live_url} onChange={e => setData("live_url", e.target.value)} placeholder="https://www.example.com" className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600">
                                        <i className="fa-solid fa-boxes-stacked text-[15px]"></i>
                                    </div>
                                    <h3 className="text-[15px] font-semibold text-slate-900 m-0">Project items</h3>
                                </div>
                                <button type="button" onClick={addItemRow} className="border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:border-indigo-600 hover:text-indigo-600 shadow-sm transition-colors flex items-center gap-2">
                                    <i className="fa-solid fa-plus text-[11px]"></i> Add item
                                </button>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {data.items.map((item, index) => (
                                    <div key={item.id ?? index} className="py-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-mono text-[12px] font-semibold text-indigo-600 tracking-wide bg-indigo-50 px-2.5 py-1 rounded-md">
                                                No. {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} className="text-[12px] font-semibold text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
                                                <i className="fa-solid fa-trash-can text-[11px]"></i> Remove
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-5">
                                            <div>
                                                <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Item name <span className="text-red-500">*</span></label>
                                                <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="E.g., Business Card Design" className={inputClass} required />
                                            </div>

                                            <div>
                                                <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Description / specifications</label>
                                                <div className="quill-wrapper">
                                                    <ReactQuill theme="snow" value={item.description || ''} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-2">
                                                <div className="w-20">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Qty</label>
                                                    <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                        className="w-full font-mono border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 text-[14px] font-semibold text-slate-800 bg-transparent focus:ring-0 transition-colors" placeholder="0" />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
                                                    <select value={item.unit_type} onChange={e => updateItem(index, "unit_type", e.target.value)}
                                                        className="w-full border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 bg-transparent text-[13px] font-semibold text-slate-800 cursor-pointer focus:ring-0 transition-colors">
                                                        <option value="piece">Pcs</option><option value="kg">Kg</option><option value="set">Set</option><option value="box">Box</option><option value="sqft">SqFt</option>
                                                    </select>
                                                </div>
                                                <span className="font-mono text-[15px] text-slate-300 pb-2">×</span>
                                                <div className="w-32">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit price</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-0 top-1/2 -translate-y-1/2 text-[13px] text-slate-400" />
                                                        <input type="number" step="any" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                            className="w-full font-mono border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 pl-5 text-[14px] font-semibold text-slate-800 bg-transparent text-right focus:ring-0 transition-colors" placeholder="0" />
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[15px] text-slate-300 pb-2">=</span>
                                                <div className="ml-auto text-right">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Line total</label>
                                                    <div className="font-mono text-[19px] font-bold text-emerald-600 tabular-nums">
                                                        <Taka className="text-[13px] text-emerald-600" />{Number(item.total).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div ref={stickyWrapperRef} className="w-full xl:w-[340px] shrink-0 relative">
                        <div ref={stickyInnerRef} style={stickyStyle} className="flex flex-col gap-6 z-20">
                            <div className="bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden text-white border border-slate-800">
                                <span className="absolute -right-3 -top-8 text-[130px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>

                                <div className="relative">
                                    <p className="text-[12px] font-semibold text-slate-400 mb-5">Quote summary</p>

                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-[13px] text-slate-300">Line items</span>
                                        <span className="font-mono text-[15px] font-semibold">{data.items.length}</span>
                                    </div>

                                    <div className="pt-5">
                                        <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Total estimate</span>
                                        <div className="flex items-baseline gap-1 font-mono text-[32px] font-bold tracking-tight">
                                            <Taka className="text-[18px] text-slate-400" />
                                            <span>{totalBudget.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    {/* Days Remaining Banner */}
                                    {dLeft !== null && (
                                        <div className={`mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold border ${dLeft <= 7 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                                            <i className="fa-solid fa-clock text-[12px]"></i>
                                            <span className="text-[13px] font-mono">{dLeft < 0 ? "Deadline overdue" : `${dLeft} days remaining`}</span>
                                        </div>
                                    )}

                                    <div className="mt-7 flex flex-col gap-2.5">
                                        <button type="submit" disabled={processing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg text-[14px] font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
                                            {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-cloud-arrow-up"></i> Update project</>}
                                        </button>
                                        <Link href={route('admin.projects.index')} className="w-full text-slate-400 py-3 rounded-lg text-[13px] font-semibold hover:text-white transition-colors border border-white/10 hover:border-white/20 flex items-center justify-center">
                                            Cancel &amp; go back
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
