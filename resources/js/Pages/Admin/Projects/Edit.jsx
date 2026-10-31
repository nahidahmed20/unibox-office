import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "@/Components/PortalSelect";
import ReactQuill from "react-quill-new";
import 'react-quill-new/dist/quill.snow.css';
import CustomSelect from '@/Components/CustomSelect';

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

// 🟢 Deeper Contrast Select Styles (Matches Create.jsx)
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '48px',
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8', // 🟢 slate-400 for Deep borders
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }, // hover effect slate-500
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#0F172A',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#0F172A', fontWeight: 700, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
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
    const itemRefs = useRef([]);
    const previousItemCount = useRef(data.items.length);

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
    const addDeliveryChargeRow = () => setData("items", [
        ...data.items,
        { item_name: "Delivery Charge", description: "Transportation and delivery fee", quantity: 1, unit_type: "delivery", unit_price: 0, total: 0 }
    ]);
    const removeItemRow = (index) => setData("items", data.items.filter((_, i) => i !== index));

    const totalBudget = data.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const dLeft = daysUntil(data.deadline);

    useEffect(() => {
        if (data.items.length <= previousItemCount.current) {
            previousItemCount.current = data.items.length;
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            const newItem = itemRefs.current[data.items.length - 1];
            newItem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newItem?.querySelector('[data-item-name]')?.focus({ preventScroll: true });
        });

        previousItemCount.current = data.items.length;
        return () => window.cancelAnimationFrame(frame);
    }, [data.items.length]);

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

    // 🟢 Deeper Contrast Input Classes
    const inputClass = "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all";

    return (
        <AdminLayout>
            <Head title={`Edit Project - ${project.title}`} />

            <style dangerouslySetInnerHTML={{__html: `
                /* 🟢 Deeper Quill Editor Borders */
                .ql-editor { min-height: 100px; font-size: 14px; background: #FFFFFF; border-radius: 0 0 0.75rem 0.75rem; font-weight: 600; color: #0F172A; }
                .ql-editor.ql-blank::before { color: #64748B; font-style: normal; font-weight: 600; }
                .ql-editor:focus { background: #ffffff; }
                .ql-toolbar.ql-snow { border-radius: 0.75rem 0.75rem 0 0; background: #F8FAFC; border-color: #94A3B8 !important; border-width: 1px; }
                .ql-container.ql-snow { border-color: #94A3B8 !important; border-width: 1px; border-top: none !important; }
                .quill-wrapper { border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); transition: all 0.2s ease; }
                .quill-wrapper:focus-within { box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
                .quill-wrapper:focus-within .ql-toolbar.ql-snow,
                .quill-wrapper:focus-within .ql-container.ql-snow { border-color: #4F46E5 !important; }
                .project-item-description .ql-toolbar.ql-snow { padding: 5px 8px; }
                .project-item-description .ql-editor { min-height: 56px; max-height: 120px; overflow-y: auto; }
                input[type="range"].ledger-range { accent-color: #4F46E5; }
            `}} />

            <div className="flex flex-col gap-8 w-full mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b-2 border-slate-300">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 text-[11px] font-black uppercase tracking-widest mb-3 shadow-sm">
                            <i className="fa-solid fa-pen-to-square"></i> Editing Project
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Edit Project</h1>
                        <p className="text-[14px] text-indigo-600 font-bold mt-2 truncate max-w-lg">#{project.id} — {project.title}</p>
                    </div>
                    <Link href={route("admin.projects.index")} className="flex w-fit items-center justify-center gap-2 text-[14px] font-black text-slate-700 hover:text-indigo-700 transition-colors border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 px-5 py-2.5 rounded-xl bg-white shadow-sm shrink-0">
                        <i className="fa-solid fa-arrow-left-long"></i> Directory
                    </Link>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="relative flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Column */}
                    <div ref={leftColumnRef} className="flex-1 w-full flex flex-col gap-8">

                        {/* General Info */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                                    <i className="fa-solid fa-circle-info text-[16px]"></i>
                                </div>
                                <h3 className="text-[18px] font-black text-slate-900">Project details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Start date</label>
                                    <input type="date" value={data.start_date} onChange={e => setData("start_date", e.target.value)} className={`${inputClass} cursor-pointer`} />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-black text-red-600 mb-2">Deadline <span className="text-red-600">*</span></label>
                                    <input type="date" value={data.deadline} onChange={e => setData("deadline", e.target.value)} className="w-full rounded-xl border border-red-400 bg-red-50/50 px-4 py-3 text-[14px] font-extrabold text-red-700 outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 shadow-sm transition-colors cursor-pointer" required />
                                    {errors.deadline && <span className="text-red-600 text-[12px] font-bold mt-2 block">{errors.deadline}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Select client <span className="text-red-600">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === data.client_id) || null}
                                        onChange={(opt) => {
                                            setData("client_id", opt ? opt.value : "");
                                            setSelectedClient(opt ? opt.raw : null);
                                        }}
                                        styles={selectStyles}
                                        isClearable placeholder="Search client…"
                                    />
                                    {errors.client_id && <span className="text-red-600 text-[12px] font-bold mt-2 block">{errors.client_id}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Manager <span className="text-slate-400 font-bold normal-case">(optional)</span></label>
                                    <Select
                                        options={managerOptions}
                                        value={managerOptions.find(o => o.value === data.project_manager_id) || null}
                                        onChange={(opt) => setData("project_manager_id", opt ? opt.value : "")}
                                        styles={selectStyles}
                                        isClearable placeholder="Assign manager…"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Project title <span className="text-red-600">*</span></label>
                                    <input type="text" value={data.title} onChange={e => setData("title", e.target.value)} placeholder="E.g., Complete Branding Package" className={inputClass} required />
                                    {errors.title && <span className="text-red-600 text-[12px] font-bold mt-2 block">{errors.title}</span>}
                                </div>



                                <div className="md:col-span-2">
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Priority</label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-300 rounded-xl w-fit shadow-inner">
                                        {PRIORITIES.map(pr => {
                                            const isActive = data.priority === pr.value;
                                            return (
                                                <button
                                                    key={pr.value} type="button"
                                                    onClick={() => setData("priority", pr.value)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-black transition-all border ${isActive ? "text-white shadow-md border-transparent" : "text-slate-700 bg-white hover:bg-slate-100 border-slate-300"}`}
                                                    style={{ backgroundColor: isActive ? pr.color : undefined }}
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : pr.color }}></span>
                                                    {pr.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status & Progress */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                                    <i className="fa-solid fa-spinner text-[16px]"></i>
                                </div>
                                <h3 className="text-[18px] font-black text-slate-900">Status &amp; progress</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Current status <span className="text-red-600">*</span></label>
                                    <div className="relative">
                                        <CustomSelect value={data.status} onChange={(e) => setData("status", e.target.value)} className={`${inputClass} appearance-none cursor-pointer pr-10`} style={{ backgroundImage: 'none' }}>
                                            <option value="planning">Planning (Not Started)</option>
                                            <option value="in_progress">In Progress (Active)</option>
                                            <option value="on_hold">On Hold (Paused)</option>
                                            <option value="completed">Completed (Done)</option>
                                        </CustomSelect>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex justify-between text-[13px] font-black text-slate-800 mb-2">
                                        <span>Completion progress</span>
                                        <span className={`font-mono text-[16px] ${data.progress == 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{data.progress}%</span>
                                    </label>
                                    <div className="relative pt-2">
                                        <input type="range" min="0" max="100" value={data.progress} onChange={e => setData("progress", e.target.value)} className="ledger-range w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer border border-slate-300" />
                                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 font-mono">
                                            <span>0%</span><span>50%</span><span>100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Links */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                                    <i className="fa-solid fa-align-left text-[16px]"></i>
                                </div>
                                <h3 className="text-[18px] font-black text-slate-900">Notes &amp; links</h3>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Project scope / details</label>
                                    <div className="quill-wrapper">
                                        <ReactQuill theme="snow" value={data.description || ''} onChange={(val) => setData("description", val)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[13px] font-black text-slate-800 mb-2"><i className="fa-brands fa-github text-slate-500 mr-1"></i> Repo / drive link</label>
                                        <input type="url" value={data.repo_link} onChange={e => setData("repo_link", e.target.value)} placeholder="https://github.com/..." className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-black text-slate-800 mb-2"><i className="fa-solid fa-globe text-slate-500 mr-1"></i> Live URL</label>
                                        <input type="url" value={data.live_url} onChange={e => setData("live_url", e.target.value)} placeholder="https://www.example.com" className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="sticky top-2 z-30 -mx-3 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-md backdrop-blur sm:mx-0 sm:px-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <i className="fa-solid fa-boxes-stacked text-[16px]"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-black text-slate-900 m-0">Project items</h3>
                                        <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{data.items.length} {data.items.length === 1 ? 'product' : 'products'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={addDeliveryChargeRow}
                                        className="border-2 border-amber-300 bg-amber-50/70 text-amber-900 px-4 py-2.5 rounded-xl text-[13px] font-black hover:border-amber-500 hover:bg-amber-100 shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-truck-fast text-[12px] text-amber-700"></i> Delivery charge
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addItemRow}
                                        className="border-2 border-slate-300 bg-white text-slate-800 px-5 py-2.5 rounded-xl text-[13.5px] font-black hover:border-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-plus text-[12px]"></i> Add product
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {data.items.map((item, index) => (
                                    <div key={item.id ?? index} ref={(node) => { itemRefs.current[index] = node; }} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 shadow-sm transition-colors hover:border-indigo-200">
                                        <div className="flex justify-between items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-[11px] font-black text-indigo-700">{String(index + 1).padStart(2, "0")}</span>
                                                <span className="truncate text-[13px] font-extrabold text-slate-800">{item.item_name || `Product ${index + 1}`}</span>
                                            </div>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} aria-label={`Remove product ${index + 1}`} title="Remove product" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40">
                                                <i className="fa-solid fa-trash-can text-[12px]"></i>
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-4 p-4">
                                            <div>
                                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Product name <span className="text-red-600">*</span></label>
                                                <input data-item-name type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="E.g., Business Card Design" className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Description / specifications <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label>
                                                <div className="quill-wrapper project-item-description">
                                                    <ReactQuill theme="snow" value={item.description || ''} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
                                                <div>
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Quantity</label>
                                                    <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="0" />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Unit</label>
                                                    <CustomSelect value={item.unit_type || "piece"} onChange={e => updateItem(index, "unit_type", e.target.value)}
                                                        className="w-full">
                                                        <option value="piece">Pcs</option>
                                                        <option value="set">Set</option>
                                                        <option value="box">Box</option>
                                                        <option value="kg">Kg</option>
                                                        <option value="sqft">SqFt</option>
                                                        <option value="trip">Trip</option>
                                                        <option value="delivery">Delivery</option>
                                                        <option value="lot">Lot</option>
                                                        <option value="service">Service</option>
                                                        <option value="none">— (None)</option>
                                                    </CustomSelect>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Unit price</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-500 font-black" />
                                                        <input type="number" step="any" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-right font-mono text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="0" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end text-right">
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Line total</label>
                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 font-mono text-[14px] font-black tabular-nums text-emerald-700">
                                                        <Taka className="text-[12px] text-emerald-700" />{Number(item.total).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                                <p className="m-0 text-[12.5px] font-semibold text-slate-600">
                                    {data.items.length} {data.items.length === 1 ? 'product' : 'products'} added. Add another whenever you need.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={addDeliveryChargeRow}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3.5 py-2 text-[12.5px] font-extrabold text-amber-800 transition hover:bg-amber-50"
                                    >
                                        <i className="fa-solid fa-truck-fast"></i> Delivery charge
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addItemRow}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                                    >
                                        <i className="fa-solid fa-plus"></i> Add product
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div ref={stickyWrapperRef} className="w-full xl:w-[360px] shrink-0 relative">
                        <div ref={stickyInnerRef} style={stickyStyle} className="flex flex-col gap-6 z-20">
                            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white border border-slate-700">
                                {/* Decorative Taka */}
                                <span className="absolute -right-4 -top-10 text-[160px] leading-none font-mono text-white/[0.04] select-none pointer-events-none">৳</span>

                                <div className="relative">
                                    <p className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest mb-6">Quote summary</p>

                                    <div className="flex justify-between items-center pb-5 border-b border-slate-700">
                                        <span className="text-[14.5px] font-bold text-slate-300">Total line items</span>
                                        <span className="font-mono text-[16px] font-black bg-slate-800 px-3 py-1 rounded-lg border border-slate-600 shadow-sm">{data.items.length}</span>
                                    </div>

                                    <div className="pt-6">
                                        <span className="block text-[12.5px] font-black text-emerald-400 uppercase tracking-widest mb-2">Total Estimate</span>
                                        <div className="flex items-baseline gap-1.5 font-mono text-[36px] font-black tracking-tight text-white tabular-nums">
                                            <Taka className="text-[22px] text-slate-400" />
                                            <span>{totalBudget.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    {/* Days Remaining Banner */}
                                    {dLeft !== null && (
                                        <div className={`mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-bold border shadow-sm ${dLeft <= 7 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-white/10 text-slate-200 border-white/20'}`}>
                                            <i className="fa-solid fa-clock text-[14px]"></i>
                                            <span className="text-[14px] font-mono">{dLeft < 0 ? "Deadline overdue!" : `${dLeft} days remaining`}</span>
                                        </div>
                                    )}

                                    <div className="mt-8 flex flex-col gap-3">
                                        <button type="submit" disabled={processing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-[15px] font-extrabold transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                                            {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Updating Project…</> : <><i className="fa-solid fa-cloud-arrow-up text-lg"></i> Update Project</>}
                                        </button>
                                        <Link href={route('admin.projects.index')} className="w-full text-slate-300 py-3.5 rounded-xl text-[13.5px] font-bold hover:text-white transition-colors border border-slate-600 hover:bg-slate-800 flex items-center justify-center bg-slate-800/50">
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
