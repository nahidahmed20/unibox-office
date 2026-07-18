import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Reusable searchable dropdown (replaces plain <select> for long option lists)
function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = "Select",
    disabled = false,
    labelKey = "name",
    valueKey = "id",
    required = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);

    const selectedOption = options.find(
        (opt) => String(opt[valueKey]) === String(value)
    );

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) =>
        String(opt[labelKey] || "")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} style={{ position: "relative" }}>
            <div
                onClick={() => !disabled && setIsOpen((o) => !o)}
                style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: isOpen ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: disabled ? "#f1f5f9" : "#fff",
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: selectedOption ? "#0f172a" : "#94a3b8",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                }}
            >
                <span
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {selectedOption ? selectedOption[labelKey] : placeholder}
                </span>
                <i
                    className={`fa-solid fa-chevron-${isOpen ? "up" : "down"}`}
                    style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "8px" }}
                ></i>
            </div>

            {isOpen && !disabled && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.15)",
                        zIndex: 100,
                        maxHeight: "230px",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            style={{
                                width: "100%",
                                padding: "6px 10px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                outline: "none",
                                fontSize: "0.85rem",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <div style={{ overflowY: "auto" }}>
                        {filteredOptions.length === 0 ? (
                            <div
                                style={{
                                    padding: "10px 14px",
                                    color: "#94a3b8",
                                    fontSize: "0.85rem",
                                }}
                            >
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected =
                                    String(opt[valueKey]) === String(value);
                                return (
                                    <div
                                        key={opt[valueKey]}
                                        onClick={() => {
                                            onChange(String(opt[valueKey]));
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                        style={{
                                            padding: "8px 14px",
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                            background: isSelected ? "#eff6ff" : "#fff",
                                            color: isSelected ? "#2563eb" : "#334155",
                                            fontWeight: isSelected ? "600" : "400",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background = isSelected
                                                ? "#eff6ff"
                                                : "#f8fafc")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background = isSelected
                                                ? "#eff6ff"
                                                : "#fff")
                                        }
                                    >
                                        {opt[labelKey]}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Hidden input keeps native HTML5 "required" validation working */}
            {required && (
                <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={value || ""}
                    required
                    onChange={() => {}}
                    style={{
                        position: "absolute",
                        opacity: 0,
                        height: 0,
                        width: "100%",
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    );
}

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

// Formats salary safely — never renders "NaN" when the value is missing/invalid.
const formatSalary = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

export default function Index({
    employees = {},
    users = [],
    departments = [],
    designations = [],
}) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const employeeList = employees.data || [];
    const paginationLinks = employees.links || [];

    // Modals State
    const [showFormModal, setShowFormModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false); // For View (Show) Modal
    const [viewData, setViewData] = useState(null); // To store data for viewing

    const [editMode, setEditMode] = useState(false);
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
    } = useForm({ ...EMPTY_FORM });

    // Debounced search only — per-page changes are handled immediately in
    // handlePerPageChange, so they must NOT also be a dependency here.
    // Otherwise every per-page change fires both an immediate request AND
    // a second (redundant) debounced request 500ms later.
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
    }, [searchTerm]);

    const handlePerPageChange = (e) => {
        const value = Number(e.target.value);
        setPerPage(value);
        router.get(
            route("admin.employees.index"),
            { search: searchTerm, per_page: value, page: 1 },
            { preserveState: true, replace: true }
        );
    };

    const handleCopy = () => {
        if (!employeeList.length) return Swal.fire("Empty!", "No data to copy", "warning");

        const header = "EMP ID\tName\tDepartment\tDesignation\tJoin Date\tBasic Salary\n";
        const text = employeeList
            .map(
                (emp) =>
                    `${emp.employee_id_code}\t${emp.user?.name || "N/A"}\t${emp.department?.name || "N/A"}\t${emp.designation?.name || "N/A"}\t${emp.joining_date}\tTK. ${formatSalary(emp.basic_salary)}`
            )
            .join("\n");

        navigator.clipboard.writeText(header + text);
        Swal.fire({
            icon: "success",
            title: "Copied to Clipboard!",
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
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

    // Escapes a value for safe inclusion inside a double-quoted CSV field.
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

    const handlePrint = () => {
        window.print();
    };

    // Open Form Modal for Create
    const openCreateModal = () => {
        clearErrors();
        setData({ ...EMPTY_FORM });
        setEditMode(false);
        setShowFormModal(true);
    };

    // Open Form Modal for Edit
    const openEditModal = (emp) => {
        clearErrors();
        // Explicitly map only the fields the form actually uses — spreading the
        // whole `emp` record would drag along nested relations (user, department,
        // designation objects), timestamps, etc. into the form payload.
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

    // Open View Modal for Show
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
                    Swal.fire({
                        icon: "success",
                        title: "Updated!",
                        text: "Employee updated successfully.",
                        confirmButtonColor: "#3b82f6"
                    });
                },
            });
        } else {
            post(route("admin.employees.store"), {
                onSuccess: () => {
                    reset();
                    setShowFormModal(false);
                    Swal.fire({
                        icon: "success",
                        title: "Created!",
                        text: "Employee added successfully.",
                        confirmButtonColor: "#3b82f6"
                    });
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
                        Swal.fire("Deleted!", "Employee deleted successfully.", "success");
                    },
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Employee Profiles" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 className="page-title" style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Employees</h1>
                </div>

                <div className="card-container" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
                            <i className="fa-solid fa-users" style={{ color: "#3b82f6" }}></i> Staff Directory
                        </div>
                        {hasPermission('create_employee') && (
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add Employee
                        </button>
                        )}
                    </div>

                    {/* TOOLBAR */}
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>

                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show
                            <select value={perPage} onChange={handlePerPageChange} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCopy} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
                                <i className="fas fa-copy"></i> Copy
                            </button>
                            <button onClick={handleExcel} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
                                <i className="fas fa-file-excel" style={{ color: "#16a34a" }}></i> Excel
                            </button>
                            <button onClick={handleCSVExport} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
                                <i className="fas fa-file-csv" style={{ color: "#2563eb" }}></i> CSV
                            </button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
                                <i className="fas fa-print" style={{ color: "#475569" }}></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "240px", padding: "6px 12px", paddingLeft: "36px", fontSize: "0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>EMP ID</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Name</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Department</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Designation</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Basic Salary</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155" }}>
                                {employeeList.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                                            No employees found.
                                        </td>
                                    </tr>
                                ) : (
                                    employeeList.map((emp, idx) => (
                                        <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fdfdfd" }}>
                                            <td style={{ padding: "16px 24px", fontWeight: "600", color: "#2563eb" }}>{emp.employee_id_code}</td>
                                            <td style={{ padding: "16px 24px", fontWeight: "600" }}>{emp.user?.name}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                                                    {emp.department?.name || "-"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>{emp.designation?.name || "-"}</td>
                                            <td style={{ padding: "16px 24px", color: "#16a34a", fontWeight: "700" }}>TK. {formatSalary(emp.basic_salary)}</td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    {/* Show Button */}
                                                    {hasPermission('view_employee') && (
                                                    <button onClick={() => openViewModal(emp)} style={{ border: "none", background: "#f0fdf4", color: "#16a34a", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {/* Edit Button */}
                                                    {hasPermission('edit_employee') && (
                                                    <button onClick={() => openEditModal(emp)} style={{ border: "none", background: "#fff7ed", color: "#ea580c", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }} title="Edit Profile">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {/* Delete Button */}
                                                    {hasPermission('delete_employee') && (
                                                    <button onClick={() => handleDelete(emp.id)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }} title="Delete Employee">
                                                        <i className="fa-regular fa-trash-can"></i>
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

                    {/* PAGINATION */}
                    {paginationLinks.length > 3 && (
                        <div className="pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                                Showing <span style={{ color: '#0f172a', fontWeight: '600' }}>{employees.from || 0}</span> to <span style={{ color: '#0f172a', fontWeight: '600' }}>{employees.to || 0}</span> of <span style={{ color: '#0f172a', fontWeight: '600' }}>{employees.total || 0}</span> entries
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {paginationLinks.map((link, index) => (
                                    <button
                                        key={index} disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, { search: searchTerm, per_page: perPage }, { preserveState: true, replace: true })}
                                        style={{
                                            padding: '6px 12px', fontSize: '0.875rem', border: link.active ? '1px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px',
                                            background: link.active ? '#2563eb' : '#fff', color: link.active ? '#fff' : '#475569', cursor: link.url ? 'pointer' : 'not-allowed',
                                            opacity: link.url ? 1 : 0.6, fontWeight: link.active ? '600' : '500'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {showFormModal && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "800px", maxHeight: "90vh", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflowY: "auto" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
                                {editMode ? "✏️ Edit Employee Profile" : "👤 Add New Employee"}
                            </h3>
                            <button
                                type="button" onClick={() => setShowFormModal(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>Official Details</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Link User Account *</label>
                                    <SearchableSelect
                                        options={users}
                                        value={data.user_id}
                                        onChange={(val) => setData("user_id", val)}
                                        placeholder="Select User"
                                        disabled={editMode}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Employee ID Code *</label>
                                    <input type="text" value={data.employee_id_code} onChange={(e) => setData("employee_id_code", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} required />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Department</label>
                                    <SearchableSelect
                                        options={departments}
                                        value={data.department_id}
                                        onChange={(val) => setData("department_id", val)}
                                        placeholder="Select"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Designation</label>
                                    <SearchableSelect
                                        options={designations}
                                        value={data.designation_id}
                                        onChange={(val) => setData("designation_id", val)}
                                        placeholder="Select"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Joining Date *</label>
                                    <input type="date" value={data.joining_date} onChange={(e) => setData("joining_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} required />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Basic Salary *</label>
                                    <input type="number" step="0.01" value={data.basic_salary} onChange={(e) => setData("basic_salary", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} required />
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>Personal Details</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Gender</label>
                                    <select value={data.gender} onChange={(e) => setData("gender", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Blood Group</label>
                                    <input type="text" value={data.blood_group} onChange={(e) => setData("blood_group", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} placeholder="e.g., O+" />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>NID Number</label>
                                    <input type="text" value={data.nid_number} onChange={(e) => setData("nid_number", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>Bank & Emergency Contact</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Bank Name</label>
                                    <input type="text" value={data.bank_name} onChange={(e) => setData("bank_name", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Bank Account No.</label>
                                    <input type="text" value={data.bank_account_no} onChange={(e) => setData("bank_account_no", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Emergency Contact Name</label>
                                    <input type="text" value={data.emergency_contact_name} onChange={(e) => setData("emergency_contact_name", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Emergency Contact Phone</label>
                                    <input type="text" value={data.emergency_contact_phone} onChange={(e) => setData("emergency_contact_phone", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Present Address</label>
                                    <textarea rows={2} value={data.present_address} onChange={(e) => setData("present_address", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                                </div>
                            </div>

                            {errors && Object.keys(errors).length > 0 && (
                                <div style={{ marginTop: "16px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px" }}>
                                    {Object.values(errors).map((msg, i) => (
                                        <p key={i} style={{ color: "#dc2626", fontSize: "0.8rem", margin: "2px 0" }}>{msg}</p>
                                    ))}
                                </div>
                            )}

                            <div className="modal-footer" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowFormModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SHOW / VIEW MODAL */}
            {showViewModal && viewData && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: "#f8fafc", borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold" }}>
                                    {viewData.user?.name ? viewData.user.name.charAt(0) : "E"}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{viewData.user?.name || "N/A"}</h3>
                                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>ID: {viewData.employee_id_code}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.9rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                <div>
                                    <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Department</span>
                                    <strong style={{ color: "#334155" }}>{viewData.department?.name || "-"}</strong>
                                </div>
                                <div>
                                    <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Designation</span>
                                    <strong style={{ color: "#334155" }}>{viewData.designation?.name || "-"}</strong>
                                </div>
                                <div>
                                    <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Join Date</span>
                                    <strong style={{ color: "#334155" }}>{viewData.joining_date || "-"}</strong>
                                </div>
                                <div>
                                    <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Basic Salary</span>
                                    <strong style={{ color: "#16a34a", fontSize: "1rem" }}>TK. {formatSalary(viewData.basic_salary)}</strong>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <h4 style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "12px", fontWeight: "600" }}>Personal Details</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Gender:</span> <strong style={{ textTransform: "capitalize", color: "#334155" }}>{viewData.gender || "-"}</strong></p>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Blood Group:</span> <strong style={{ color: "#dc2626" }}>{viewData.blood_group || "-"}</strong></p>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>NID:</span> <strong style={{ color: "#334155" }}>{viewData.nid_number || "-"}</strong></p>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <h4 style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "12px", fontWeight: "600" }}>Bank & Emergency Contact</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Bank:</span> <strong style={{ color: "#334155" }}>{viewData.bank_name || "-"}</strong></p>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Account No.:</span> <strong style={{ color: "#334155" }}>{viewData.bank_account_no || "-"}</strong></p>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Emergency Contact:</span> <strong style={{ color: "#334155" }}>{viewData.emergency_contact_name || "-"}</strong></p>
                                    <p style={{ margin: 0 }}><span style={{ color: "#64748b" }}>Emergency Phone:</span> <strong style={{ color: "#334155" }}>{viewData.emergency_contact_phone || "-"}</strong></p>
                                    <p style={{ margin: 0, gridColumn: "1 / -1" }}><span style={{ color: "#64748b" }}>Address:</span> <strong style={{ color: "#334155" }}>{viewData.present_address || "-"}</strong></p>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
                            <button onClick={() => setShowViewModal(false)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}