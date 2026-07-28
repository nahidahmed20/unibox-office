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
    logo: `${window.location.origin}/images/logo.png`,
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
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
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
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Employees Report</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        h2.report-title { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                        p.report-date { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                        /* Hide Actions Column */
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <h2 class="report-title">Employee Directory</h2>
                    <p class="report-date">Generated on: ${new Date().toLocaleString()}</p>
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
                    Swal.fire({ icon: "success", title: "Updated!", text: "Employee updated successfully.", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.employees.store"), {
                onSuccess: () => {
                    reset();
                    setShowFormModal(false);
                    Swal.fire({ icon: "success", title: "Created!", text: "Employee added successfully.", timer: 1500, showConfirmButton: false });
                },
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This employee will be deleted!",
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
            minHeight: "42px",
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" },
            fontSize: "13.5px",
            background: editMode && state.isDisabled ? "#f1f5f9" : "#fff",
        }),
        option: (provided, state) => ({
            ...provided, fontSize: "13.5px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Employee Profiles" />

            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Employees</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage staff details, departments, and payroll info.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-users text-[var(--accent)]"></i> Staff Directory
                        </div>
                        {hasPermission('create_employee') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                            <i className="fa-solid fa-plus"></i> Add Employee
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
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button type="button" onClick={handleExcel} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> Excel
                                </button>
                                <button type="button" onClick={handleCSVExport} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-csv text-teal-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4">EMP ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Designation</th>
                                    <th className="px-6 py-4 text-right">Basic Salary</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {employeeList.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-user-xmark text-4xl text-gray-300 mb-3"></i>
                                                <p>No employees found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    employeeList.map((emp, idx) => (
                                        <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-[var(--accent)]">
                                                {emp.employee_id_code}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {emp.user?.name || "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-600 border border-gray-200">
                                                    {emp.department?.name || "-"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                {emp.designation?.name || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right font-extrabold text-emerald-600 text-[14.5px]">
                                                TK. {formatSalary(emp.basic_salary)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('view_employee') && (
                                                        <button onClick={() => openViewModal(emp)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_employee') && (
                                                        <button onClick={() => openEditModal(emp)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Profile">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_employee') && (
                                                        <button onClick={() => handleDelete(emp.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Employee">
                                                            <i className="fa-regular fa-trash-can text-[12px]"></i>
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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {employees.total > 0 && `Showing ${employees.from || 0} to ${employees.to || 0} of ${employees.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {paginationLinks.map((link, index) => (
                                    link.url === null ? (
                                        <span
                                            key={index}
                                            className="flex min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[13px] text-gray-400 cursor-not-allowed"
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                        />
                                    ) : (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            preserveState
                                            className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                                ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && viewData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[18px] font-bold">
                                    {viewData.user?.name ? viewData.user.name.charAt(0).toUpperCase() : "E"}
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#202223] leading-tight">{viewData.user?.name || "N/A"}</h3>
                                    <span className="text-[12px] font-medium text-gray-500">ID: {viewData.employee_id_code}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto brass-scroll flex flex-col gap-6">

                            {/* Official Details */}
                            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                <div>
                                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-1">Department</span>
                                    <div className="text-[14.5px] font-bold text-gray-900">{viewData.department?.name || "-"}</div>
                                </div>
                                <div>
                                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-1">Designation</span>
                                    <div className="text-[14.5px] font-bold text-gray-900">{viewData.designation?.name || "-"}</div>
                                </div>
                                <div>
                                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-1">Join Date</span>
                                    <div className="text-[14.5px] font-semibold text-gray-700"><i className="fa-regular fa-calendar mr-1.5 text-gray-400"></i>{viewData.joining_date || "-"}</div>
                                </div>
                                <div>
                                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-1">Basic Salary</span>
                                    <div className="text-[16px] font-extrabold text-emerald-600">TK. {formatSalary(viewData.basic_salary)}</div>
                                </div>
                            </div>

                            {/* Personal Details */}
                            <div>
                                <h4 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 mb-3 flex items-center gap-2">
                                    <i className="fa-regular fa-id-card text-[var(--accent)]"></i> Personal Details
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Gender</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800 capitalize">{viewData.gender || "-"}</div>
                                    </div>
                                    <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-100">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-rose-500 mb-1">Blood Group</span>
                                        <div className="text-[14px] font-bold text-rose-700">{viewData.blood_group || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">NID Number</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800">{viewData.nid_number || "-"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Bank & Contact Details */}
                            <div>
                                <h4 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 mb-3 flex items-center gap-2">
                                    <i className="fa-solid fa-building-columns text-[var(--accent)]"></i> Bank & Emergency Contact
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Bank Name</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800">{viewData.bank_name || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Account No.</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800">{viewData.bank_account_no || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Emergency Contact</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800">{viewData.emergency_contact_name || "-"}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Emergency Phone</span>
                                        <div className="text-[13.5px] font-semibold text-gray-800">{viewData.emergency_contact_phone || "-"}</div>
                                    </div>
                                    <div className="sm:col-span-2 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1">Present Address</span>
                                        <div className="text-[13.5px] font-medium text-gray-700 leading-relaxed whitespace-pre-line">{viewData.present_address || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showFormModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[95vh] overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Edit Employee Profile" : "✨ Add New Employee"}
                            </h3>
                            <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">

                                {/* Section: Official Details */}
                                <div className="mb-6">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-4">Official Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Link User Account *</label>
                                            <Select
                                                options={users.map((u) => ({ value: u.id, label: u.name }))}
                                                value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                                onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                                placeholder="-- Choose User --"
                                                isSearchable
                                                isClearable
                                                isDisabled={editMode}
                                                styles={{
                                                    control: (provided, state) => ({
                                                        ...provided, minHeight: "42px", borderRadius: "0.5rem",
                                                        border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
                                                        boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
                                                        "&:hover": { borderColor: "#9ca3af" },
                                                        fontSize: "14px",
                                                        background: editMode && state.isDisabled ? "#f1f5f9" : "#fff",
                                                    }),
                                                    option: (provided, state) => ({
                                                        ...provided, fontSize: "14px",
                                                        backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
                                                        color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
                                                    }),
                                                    menuPortal: base => ({ ...base, zIndex: 9999 })
                                                }}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.user_id && <p className="text-red-500 text-[12px] mt-1">{errors.user_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Employee ID Code *</label>
                                            <input
                                                type="text"
                                                value={data.employee_id_code}
                                                onChange={(e) => setData("employee_id_code", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                placeholder="e.g. EMP-001"
                                                required
                                            />
                                            {errors.employee_id_code && <p className="text-red-500 text-[12px] mt-1">{errors.employee_id_code}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Department</label>
                                            <Select
                                                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                                                value={departments.map((d) => ({ value: d.id, label: d.name })).find((opt) => Number(opt.value) === Number(data.department_id)) || null}
                                                onChange={(selected) => setData("department_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Department --"
                                                isSearchable
                                                isClearable
                                                styles={{
                                                    control: (provided, state) => ({
                                                        ...provided, minHeight: "42px", borderRadius: "0.5rem",
                                                        border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
                                                        boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
                                                        "&:hover": { borderColor: "#9ca3af" }, fontSize: "14px", background: "#fff",
                                                    }),
                                                    option: (provided, state) => ({
                                                        ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff", color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
                                                    }),
                                                    menuPortal: base => ({ ...base, zIndex: 9999 })
                                                }}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.department_id && <p className="text-red-500 text-[12px] mt-1">{errors.department_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Designation</label>
                                            <Select
                                                options={designations.map((d) => ({ value: d.id, label: d.name }))}
                                                value={designations.map((d) => ({ value: d.id, label: d.name })).find((opt) => Number(opt.value) === Number(data.designation_id)) || null}
                                                onChange={(selected) => setData("designation_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Designation --"
                                                isSearchable
                                                isClearable
                                                styles={{
                                                    control: (provided, state) => ({
                                                        ...provided, minHeight: "42px", borderRadius: "0.5rem",
                                                        border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
                                                        boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
                                                        "&:hover": { borderColor: "#9ca3af" }, fontSize: "14px", background: "#fff",
                                                    }),
                                                    option: (provided, state) => ({
                                                        ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff", color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
                                                    }),
                                                    menuPortal: base => ({ ...base, zIndex: 9999 })
                                                }}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.designation_id && <p className="text-red-500 text-[12px] mt-1">{errors.designation_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Joining Date *</label>
                                            <input
                                                type="date"
                                                value={data.joining_date}
                                                onChange={(e) => setData("joining_date", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                required
                                            />
                                            {errors.joining_date && <p className="text-red-500 text-[12px] mt-1">{errors.joining_date}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Basic Salary (TK) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.basic_salary}
                                                onChange={(e) => setData("basic_salary", e.target.value)}
                                                className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[15px] font-bold text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                                                placeholder="0.00"
                                                required
                                            />
                                            {errors.basic_salary && <p className="text-red-500 text-[12px] mt-1">{errors.basic_salary}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Personal Details */}
                                <div className="mb-6">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-4">Personal Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Gender</label>
                                            <select
                                                value={data.gender}
                                                onChange={(e) => setData("gender", e.target.value)}
                                                className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                            {errors.gender && <p className="text-red-500 text-[12px] mt-1">{errors.gender}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Blood Group</label>
                                            <input
                                                type="text"
                                                value={data.blood_group}
                                                onChange={(e) => setData("blood_group", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                placeholder="e.g., O+"
                                            />
                                            {errors.blood_group && <p className="text-red-500 text-[12px] mt-1">{errors.blood_group}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">NID Number</label>
                                            <input
                                                type="text"
                                                value={data.nid_number}
                                                onChange={(e) => setData("nid_number", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                placeholder="National ID"
                                            />
                                            {errors.nid_number && <p className="text-red-500 text-[12px] mt-1">{errors.nid_number}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Bank & Contact Details */}
                                <div className="mb-2">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-4">Bank & Emergency Contact</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Bank Name</label>
                                            <input
                                                type="text"
                                                value={data.bank_name}
                                                onChange={(e) => setData("bank_name", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                            {errors.bank_name && <p className="text-red-500 text-[12px] mt-1">{errors.bank_name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Bank Account No.</label>
                                            <input
                                                type="text"
                                                value={data.bank_account_no}
                                                onChange={(e) => setData("bank_account_no", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                            {errors.bank_account_no && <p className="text-red-500 text-[12px] mt-1">{errors.bank_account_no}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Emergency Contact Name</label>
                                            <input
                                                type="text"
                                                value={data.emergency_contact_name}
                                                onChange={(e) => setData("emergency_contact_name", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                            {errors.emergency_contact_name && <p className="text-red-500 text-[12px] mt-1">{errors.emergency_contact_name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Emergency Contact Phone</label>
                                            <input
                                                type="text"
                                                value={data.emergency_contact_phone}
                                                onChange={(e) => setData("emergency_contact_phone", e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                            {errors.emergency_contact_phone && <p className="text-red-500 text-[12px] mt-1">{errors.emergency_contact_phone}</p>}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Present Address</label>
                                            <textarea
                                                value={data.present_address}
                                                onChange={(e) => setData("present_address", e.target.value)}
                                                rows={2}
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-y min-h-[60px] transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            />
                                            {errors.present_address && <p className="text-red-500 text-[12px] mt-1">{errors.present_address}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowFormModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                    {processing ? "Saving..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
