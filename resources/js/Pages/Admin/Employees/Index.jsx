import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

const EMPTY_FORM = {
    id: "",
    user_id: "",
    department_id: "",
    designation_id: "",
    employee_id_code: "",
    nid_number: "",
    gender: "male",
    joining_date: "",
    basic_salary: 0,
    bank_name: "",
    bank_account_no: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    blood_group: "",
    present_address: "",
};

// Formats salary safely
const formatSalary = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
};

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Index({ employees = {}, users = [], departments = [], designations = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const employeeList = employees.data || [];
    const paginationLinks = employees.links || [];

    // Modals State
    const [showFormModal, setShowFormModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewData, setViewData] = useState(null);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 10);
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({ ...EMPTY_FORM });

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route("admin.employees.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const handleCopy = () => {
        if (!employeeList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const header = "EMP ID\tName\tDepartment\tDesignation\tJoin Date\tBasic Salary\n";
        const text = employeeList
            .map((emp) => `${emp.employee_id_code}\t${emp.user?.name || "N/A"}\t${emp.department?.name || "N/A"}\t${emp.designation?.name || "N/A"}\t${emp.joining_date}\tTK. ${formatSalary(emp.basic_salary)}`)
            .join("\n");
        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const handleCSVExport = () => {
        if (!employeeList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const rows = [
            ["EMP ID", "Name", "Department", "Designation", "Join Date", "Basic Salary"],
            ...employeeList.map((emp) => [
                csvEscape(emp.employee_id_code),
                csvEscape(emp.user?.name || "N/A"),
                csvEscape(emp.department?.name || "N/A"),
                csvEscape(emp.designation?.name || "N/A"),
                csvEscape(emp.joining_date),
                formatSalary(emp.basic_salary),
            ]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Employees_List_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExcel = () => {
        if (!employeeList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            employeeList.map((emp) => ({
                "EMP ID": emp.employee_id_code,
                "Name": emp.user?.name || "N/A",
                "Department": emp.department?.name || "N/A",
                "Designation": emp.designation?.name || "N/A",
                "Join Date": emp.joining_date,
                "Basic Salary": formatSalary(emp.basic_salary),
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Employees_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePrint = () => {
        window.print();
    };

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        setData({ ...EMPTY_FORM });
        setEditMode(false);
        setShowFormModal(true);
    };

    const openEditModal = (emp) => {
        clearErrors();
        setData({
            id: emp.id ?? "",
            user_id: emp.user_id ?? emp.user?.id ?? "",
            department_id: emp.department_id ?? "",
            designation_id: emp.designation_id ?? "",
            employee_id_code: emp.employee_id_code ?? "",
            nid_number: emp.nid_number ?? "",
            gender: emp.gender ?? "male",
            joining_date: emp.joining_date ?? "",
            basic_salary: emp.basic_salary ?? 0,
            bank_name: emp.bank_name ?? "",
            bank_account_no: emp.bank_account_no ?? "",
            emergency_contact_name: emp.emergency_contact_name ?? "",
            emergency_contact_phone: emp.emergency_contact_phone ?? "",
            blood_group: emp.blood_group ?? "",
            present_address: emp.present_address ?? "",
        });
        setEditMode(true);
        setShowFormModal(true);
    };

    const openViewModal = (emp) => {
        setViewData(emp);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route("admin.employees.update", data.id), {
                onSuccess: () => {
                    setShowFormModal(false);
                    Swal.fire({ icon: "success", title: "Updated!", text: "Employee updated successfully.", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                },
            });
        } else {
            post(route("admin.employees.store"), {
                onSuccess: () => {
                    reset();
                    setShowFormModal(false);
                    Swal.fire({ icon: "success", title: "Created!", text: "Employee added successfully.", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                },
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This employee profile will be deleted!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.employees.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Employee deleted successfully.", timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    // React-Select Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "48px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent, #6366f1)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent, #6366f1)" : "#9ca3af" },
            fontSize: "14px",
            background: editMode && state.isDisabled ? "#f3f4f6" : "#fff",
            cursor: editMode && state.isDisabled ? "not-allowed" : "pointer"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#1f2937", fontSize: "14px", fontWeight: "600" }),
        option: (provided, state) => ({
            ...provided, fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent, #4f46e5)" : state.isFocused ? "#f8fafc" : "#fff",
            color: state.isSelected ? "#fff" : "#1f2937", cursor: "pointer",
            padding: "10px 12px"
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    return (
        <AdminLayout>
            <Head title="Employee Profiles" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-table, #printable-table * { visibility: visible; }
                    #printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Human Resources
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Employee Profiles</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Manage staff details, departments, payroll info, and emergency contacts.</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-users text-[14px]"></i>
                            </div>
                            Staff Directory
                        </div>
                        {hasPermission('create_employee') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Add Employee
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-3">
                            
                            {/* Premium Show Rows Dropdown */}
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
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button type="button" onClick={handleExcel} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-excel text-emerald-500"></i> Excel</button>
                                <button type="button" onClick={handleCSVExport} className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-[13px] font-bold text-teal-700 transition-colors hover:bg-teal-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white font-medium"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">EMP ID</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Name</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Department</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Designation</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Basic Salary</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {employeeList.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-user-xmark text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No employees found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or add a new employee.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    employeeList.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-indigo-600">
                                                <span className="bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shadow-sm">{emp.employee_id_code}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[12px] font-black uppercase shadow-sm">
                                                        {(emp.user?.name || 'E').charAt(0)}
                                                    </div>
                                                    <div className="font-extrabold text-gray-900 text-[14px]">
                                                        {emp.user?.name || "N/A"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 text-[10.5px] font-extrabold uppercase tracking-wider text-gray-600 border border-gray-200 shadow-sm">
                                                    {emp.department?.name || "-"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-600">
                                                {emp.designation?.name || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15px] tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                                <Taka />{formatSalary(emp.basic_salary)}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_employee') && (
                                                        <button onClick={() => openViewModal(emp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_employee') && (
                                                        <button onClick={() => openEditModal(emp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Profile">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_employee') && (
                                                        <button onClick={() => handleDelete(emp.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Employee">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {paginationLinks.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {employees.total > 0 && `Showing ${employees.from || 0} to ${employees.to || 0} of ${employees.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {paginationLinks.map((link, index) => (
                                    link.url === null ? (
                                        <span
                                            key={index}
                                            className="flex min-w-[36px] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[13px] text-gray-400 cursor-not-allowed font-bold"
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                        />
                                    ) : (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            preserveState
                                            className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                                ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- WIDE & MODERN VIEW DETAILS MODAL --- */}
            {showViewModal && viewData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-black opacity-10 -translate-x-5 translate-y-5"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur text-white text-2xl font-black uppercase shadow-lg ring-1 ring-white/30">
                                    {viewData.user?.name ? viewData.user.name.charAt(0).toUpperCase() : "E"}
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/20 text-white">
                                            ID: {viewData.employee_id_code}
                                        </span>
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">{viewData.user?.name || "N/A"}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">

                            {/* Official Details */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-building mr-1 text-indigo-400"></i> Department</span>
                                    <div className="font-bold text-gray-900 text-[14.5px]">{viewData.department?.name || "-"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-id-badge mr-1 text-blue-400"></i> Designation</span>
                                    <div className="font-bold text-gray-900 text-[14.5px]">{viewData.designation?.name || "-"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-regular fa-calendar mr-1 text-rose-400"></i> Join Date</span>
                                    <div className="font-bold text-gray-900 text-[14px]">{viewData.joining_date || "-"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-money-bill-wave mr-1 text-emerald-500"></i> Basic Salary</span>
                                    <div className="font-black text-emerald-700 text-[16px] tabular-nums"><Taka />{formatSalary(viewData.basic_salary)}</div>
                                </div>
                            </div>

                            {/* Personal Details */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-regular fa-id-card text-gray-400 mr-1.5"></i> Personal Information</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Gender</span>
                                        <div className="font-bold text-gray-800 text-[14px] capitalize">{viewData.gender || "-"}</div>
                                    </div>
                                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1">Blood Group</span>
                                        <div className="font-black text-rose-700 text-[14.5px]">{viewData.blood_group || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">NID Number</span>
                                        <div className="font-bold text-gray-800 text-[14px]">{viewData.nid_number || "-"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Bank & Contact Details */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-building-columns text-gray-400 mr-1.5"></i> Bank & Emergency Contact</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bank Name</span>
                                        <div className="font-bold text-gray-800 text-[14px]">{viewData.bank_name || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bank Account No.</span>
                                        <div className="font-bold text-gray-800 text-[14px]">{viewData.bank_account_no || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Emergency Contact Name</span>
                                        <div className="font-bold text-gray-800 text-[14px]">{viewData.emergency_contact_name || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Emergency Contact Phone</span>
                                        <div className="font-bold text-gray-800 text-[14px]">{viewData.emergency_contact_phone || "-"}</div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Present Address</span>
                                    <div className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                                        {viewData.present_address || <span className="italic text-gray-400">No address provided.</span>}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIDE & MODERN CREATE / EDIT FORM MODAL --- */}
            {showFormModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-users"></i> {editMode ? 'Update' : 'New Profile'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Edit Employee Profile" : "Add New Employee"}
                                </h3>
                            </div>
                            <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {/* Section: Official Details */}
                                <div>
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2 mb-4">Official Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative z-[60]">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Link User Account <span className="text-red-500">*</span></label>
                                            <Select
                                                options={users.map((u) => ({ value: u.id, label: u.name }))}
                                                value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                                onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                                placeholder="-- Choose User --"
                                                isSearchable isClearable
                                                isDisabled={editMode}
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.user_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.user_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Employee ID Code <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={data.employee_id_code}
                                                onChange={(e) => setData("employee_id_code", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-indigo-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="e.g. EMP-001"
                                                required
                                            />
                                            {errors.employee_id_code && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.employee_id_code}</p>}
                                        </div>

                                        <div className="relative z-[50]">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Department</label>
                                            <Select
                                                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                                                value={departments.map((d) => ({ value: d.id, label: d.name })).find((opt) => Number(opt.value) === Number(data.department_id)) || null}
                                                onChange={(selected) => setData("department_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Department --"
                                                isSearchable isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.department_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.department_id}</p>}
                                        </div>

                                        <div className="relative z-[40]">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Designation</label>
                                            <Select
                                                options={designations.map((d) => ({ value: d.id, label: d.name }))}
                                                value={designations.map((d) => ({ value: d.id, label: d.name })).find((opt) => Number(opt.value) === Number(data.designation_id)) || null}
                                                onChange={(selected) => setData("designation_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Designation --"
                                                isSearchable isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.designation_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.designation_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Joining Date <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                value={data.joining_date}
                                                onChange={(e) => setData("joining_date", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                                required
                                            />
                                            {errors.joining_date && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.joining_date}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Basic Salary (TK) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-[16px]" />
                                                <input
                                                    type="number" step="0.01" min="0"
                                                    value={data.basic_salary}
                                                    onChange={(e) => setData("basic_salary", e.target.value)}
                                                    className="w-full rounded-xl border border-emerald-200 bg-white pl-9 pr-4 py-3 text-[15px] font-black text-emerald-700 outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            {errors.basic_salary && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.basic_salary}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Personal Details */}
                                <div>
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2 mb-4">Personal Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Gender</label>
                                            <div className="relative">
                                                <select
                                                    value={data.gender}
                                                    onChange={(e) => setData("gender", e.target.value)}
                                                    className="w-full appearance-none bg-white rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                            {errors.gender && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.gender}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Blood Group</label>
                                            <input
                                                type="text"
                                                value={data.blood_group}
                                                onChange={(e) => setData("blood_group", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="e.g., O+"
                                            />
                                            {errors.blood_group && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.blood_group}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">NID Number</label>
                                            <input
                                                type="text"
                                                value={data.nid_number}
                                                onChange={(e) => setData("nid_number", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="National ID"
                                            />
                                            {errors.nid_number && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.nid_number}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Bank & Contact Details */}
                                <div>
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2 mb-4">Bank & Emergency Contact</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Bank Name</label>
                                            <input
                                                type="text"
                                                value={data.bank_name}
                                                onChange={(e) => setData("bank_name", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="e.g. City Bank"
                                            />
                                            {errors.bank_name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.bank_name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Bank Account No.</label>
                                            <input
                                                type="text"
                                                value={data.bank_account_no}
                                                onChange={(e) => setData("bank_account_no", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="Account number"
                                            />
                                            {errors.bank_account_no && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.bank_account_no}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Emergency Contact Name</label>
                                            <input
                                                type="text"
                                                value={data.emergency_contact_name}
                                                onChange={(e) => setData("emergency_contact_name", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="Contact person"
                                            />
                                            {errors.emergency_contact_name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.emergency_contact_name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Emergency Contact Phone</label>
                                            <input
                                                type="text"
                                                value={data.emergency_contact_phone}
                                                onChange={(e) => setData("emergency_contact_phone", e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                                placeholder="Phone number"
                                            />
                                            {errors.emergency_contact_phone && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.emergency_contact_phone}</p>}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Present Address</label>
                                            <textarea
                                                value={data.present_address}
                                                onChange={(e) => setData("present_address", e.target.value)}
                                                rows={2}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-4 text-[14px] font-medium text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y min-h-[80px] shadow-sm"
                                                placeholder="Street, Area, City"
                                            />
                                            {errors.present_address && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.present_address}</p>}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowFormModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Profile" : "Save Profile"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}