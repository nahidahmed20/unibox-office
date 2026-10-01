import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';
import CustomSelect from '@/Components/CustomSelect';

const PRIORITIES = [
    { value: "low", label: "Low", color: "#059669" },
    { value: "medium", label: "Medium", color: "#D97706" },
    { value: "high", label: "High", color: "#EA580C" },
    { value: "urgent", label: "Urgent", color: "#DC2626" },
];

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 ${className}`}>৳</span>
);

// 🟢 Deeper Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '48px',
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8',
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

export default function Create({ clients = [], managers = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: "",
        project_manager_id: "",
        title: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        deadline: "",
        status: "planning",
        priority: "medium",
        progress: 0,
        repo_link: "",
        live_url: "",
        items: [{ item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]
    });

    const [selectedClient, setSelectedClient] = useState(null);

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

        post(route("admin.projects.store"), {
            onError: () => Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please check the form for missing or incorrect data.', confirmButtonColor: '#EF4444' })
        });
    };

    // 🟢 Deeper Contrast Input Classes (slate-400 border + bold text)
    const inputClass = "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all";

    return (
        <AdminLayout>
            <Head title="Create Project" />

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
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b-2 border-slate-300">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 text-[11px] font-black uppercase tracking-widest mb-3 shadow-sm">
                            <i className="fa-solid fa-folder-plus"></i> New engagement
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Create Project</h1>
                        <p className="text-[14.5px] font-bold text-slate-500 mt-2 max-w-md">Set the scope, timeline and cost for a new client engagement.</p>
                    </div>
                    <Link href={route("admin.projects.index")} className="flex w-fit items-center justify-center gap-2 text-[14px] font-black text-slate-700 hover:text-indigo-700 transition-colors border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 px-5 py-2.5 rounded-xl bg-white shadow-sm">
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
                                        isClearable placeholder="Search client…" menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed"
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
                                        isClearable placeholder="Assign manager…" menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed"
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

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex justify-between items-center mb-2 pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <i className="fa-solid fa-boxes-stacked text-[16px]"></i>
                                    </div>
                                    <h3 className="text-[18px] font-black text-slate-900 m-0">Project items</h3>
                                </div>
                                <button type="button" onClick={addItemRow} className="border-2 border-slate-300 bg-white text-slate-800 px-5 py-2.5 rounded-xl text-[13.5px] font-black hover:border-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add item
                                </button>
                            </div>

                            <div className="divide-y divide-slate-300">
                                {data.items.map((item, index) => (
                                    <div key={index} className="py-6">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="font-mono text-[13px] font-black text-indigo-800 tracking-widest bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm">
                                                ITEM NO. {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} className="text-[13px] font-black text-slate-500 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 border border-slate-300 hover:border-red-300 px-4 py-2 rounded-lg shadow-sm">
                                                <i className="fa-solid fa-trash-can text-[12px]"></i> Remove
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <label className="block text-[13px] font-black text-slate-800 mb-2">Item name <span className="text-red-600">*</span></label>
                                                <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="E.g., Business Card Design" className={inputClass} required />
                                            </div>

                                            <div>
                                                <label className="block text-[13px] font-black text-slate-800 mb-2">Description / specifications</label>
                                                <div className="quill-wrapper">
                                                    <ReactQuill theme="snow" value={item.description} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-2">
                                                <div className="w-24">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Qty</label>
                                                    <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                        className="w-full font-mono border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 text-[15px] font-black text-slate-900 bg-transparent focus:ring-0 transition-colors" placeholder="0" />
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Unit</label>
                                                    <CustomSelect value={item.unit_type} onChange={e => updateItem(index, "unit_type", e.target.value)}
                                                        className="w-full border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 bg-transparent text-[14px] font-black text-slate-900 cursor-pointer focus:ring-0 transition-colors">
                                                        <option value="piece">Pcs</option><option value="kg">Kg</option><option value="set">Set</option><option value="sqft">SqFt</option>
                                                    </CustomSelect>
                                                </div>
                                                <span className="font-mono text-[16px] font-black text-slate-400 pb-2">×</span>
                                                <div className="w-36">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Unit price</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-0 top-1/2 -translate-y-1/2 text-[14px] text-slate-500 font-black" />
                                                        <input type="number" step="any" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                            className="w-full font-mono border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 pl-6 text-[15px] font-black text-slate-900 bg-transparent text-right focus:ring-0 transition-colors" placeholder="0" />
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[16px] font-black text-slate-400 pb-2">=</span>
                                                <div className="ml-auto text-right">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Line total</label>
                                                    <div className="font-mono text-[22px] font-black text-emerald-600 tabular-nums">
                                                        <Taka className="text-[15px] text-emerald-600" />{Number(item.total).toLocaleString('en-IN')}
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

                                    <button type="submit" disabled={processing} className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-[15px] font-black transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                                        {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Creating Project…</> : <><i className="fa-solid fa-cloud-arrow-up text-lg"></i> Create Project</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
