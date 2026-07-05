import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({
    employees = [],
    users = [],
    departments = [],
    designations = [],
}) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });
    const [perPage, setPerPage] = useState(10);
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
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) {
                params.search = searchTerm;
            }
            if (perPage !== 10) {
                params.per_page = perPage;
            }
            router.get(route("admin.employees.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = employees
            .map(
                (emp) =>
                    `${emp.employee_id_code}\t${emp.user?.name}\t${emp.department?.name}\t${emp.designation?.name}\t${emp.joining_date}\t${emp.basic_salary}`
            )
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({
            icon: "success",
            title: "Copied!",
            timer: 1200,
            showConfirmButton: false,
        });
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (emp) => {
        clearErrors();
        setData({
            ...emp,
            department_id: emp.department_id || "",
            designation_id: emp.designation_id || "",
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route("admin.employees.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({
                        icon: "success",
                        title: "Updated!",
                        text: "Employee updated successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                },
            });
        } else {
            post(route("admin.employees.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({
                        icon: "success",
                        title: "Created!",
                        text: "Employee added successfully.",
                        timer: 1500,
                        showConfirmButton: false,
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
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.employees.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "Employee deleted successfully.",
                            timer: 1500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Employee Profiles" />
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Employees</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-id-card"></i> Staff Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Employee
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show
                            <select
                                value={perPage}
                                onChange={(e) =>
                                    setPerPage(Number(e.target.value))
                                }
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            entries
                        </div>

                        <div
                            className="export-buttons"
                            style={{ display: "flex", gap: "8px" }}
                        >
                            <button
                                type="button"
                                className="export-btn"
                                onClick={handleCopy}
                            >
                                <i className="fas fa-copy me-1"></i>
                                Copy
                            </button>
                            <button className="export-btn">
                                <i className="fas fa-file-excel me-1"></i>
                                Excel
                            </button>
                            <button className="export-btn">
                                <i className="fas fa-file-csv me-1"></i>
                                CSV
                            </button>
                            <button
                                className="export-btn"
                                onClick={() => window.print()}
                            >
                                <i className="fas fa-print me-1"></i>
                                Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search by ID or Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>EMP ID</th>
                                    <th>NAME</th>
                                    <th>DEPARTMENT</th>
                                    <th>DESIGNATION</th>
                                    <th>JOIN DATE</th>
                                    <th>BASIC</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td className="font-bold text-blue-600">
                                            {emp.employee_id_code}
                                        </td>
                                        <td className="font-semibold">
                                            {emp.user?.name}
                                        </td>
                                        <td>{emp.department?.name || "-"}</td>
                                        <td>{emp.designation?.name || "-"}</td>
                                        <td>{emp.joining_date}</td>
                                        <td className="text-green-700 font-bold">
                                            ${emp.basic_salary}
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button
                                                    onClick={() =>
                                                        openEditModal(emp)
                                                    }
                                                    className="icon-btn edit"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(emp.id)
                                                    }
                                                    className="icon-btn delete"
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div
                        className="modal-content"
                        style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Profile" : "New Employee Profile"}
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                                title="Close"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">
                                Official Details
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "15px",
                                }}
                            >
                                <div className="form-group">
                                    <label>Link User Account *</label>
                                    <select
                                        value={data.user_id}
                                        onChange={(e) => setData("user_id", e.target.value)}
                                        className="form-control"
                                        required
                                        disabled={editMode}
                                    >
                                        <option value="">Select User</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.user_id && (
                                        <p className="error-text">{errors.user_id}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Employee ID Code *</label>
                                    <input
                                        type="text"
                                        value={data.employee_id_code}
                                        onChange={(e) => setData("employee_id_code", e.target.value)}
                                        className="form-control"
                                        placeholder="EMP-001"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Department</label>
                                    <select
                                        value={data.department_id}
                                        onChange={(e) => setData("department_id", e.target.value)}
                                        className="form-control"
                                    >
                                        <option value="">Select</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Designation</label>
                                    <select
                                        value={data.designation_id}
                                        onChange={(e) => setData("designation_id", e.target.value)}
                                        className="form-control"
                                    >
                                        <option value="">Select</option>
                                        {designations.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Joining Date *</label>
                                    <input
                                        type="date"
                                        value={data.joining_date}
                                        onChange={(e) => setData("joining_date", e.target.value)}
                                        className="form-control"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Basic Salary *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.basic_salary}
                                        onChange={(e) => setData("basic_salary", e.target.value)}
                                        className="form-control"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-4 mt-6 text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">
                                Personal & Bank Details
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                    gap: "15px",
                                }}
                            >
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select
                                        value={data.gender}
                                        onChange={(e) => setData("gender", e.target.value)}
                                        className="form-control"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Blood Group</label>
                                    <input
                                        type="text"
                                        value={data.blood_group}
                                        onChange={(e) => setData("blood_group", e.target.value)}
                                        className="form-control"
                                        placeholder="e.g., O+"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>NID Number</label>
                                    <input
                                        type="text"
                                        value={data.nid_number}
                                        onChange={(e) => setData("nid_number", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bank Name</label>
                                    <input
                                        type="text"
                                        value={data.bank_name}
                                        onChange={(e) => setData("bank_name", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div
                                    className="form-group"
                                    style={{ gridColumn: "span 2" }}
                                >
                                    <label>Bank Account Number</label>
                                    <input
                                        type="text"
                                        value={data.bank_account_no}
                                        onChange={(e) => setData("bank_account_no", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            <div className="mb-4 mt-6 text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">
                                Emergency Contact
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "15px",
                                }}
                            >
                                <div className="form-group">
                                    <label>Contact Name</label>
                                    <input
                                        type="text"
                                        value={data.emergency_contact_name}
                                        onChange={(e) => setData("emergency_contact_name", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone</label>
                                    <input
                                        type="text"
                                        value={data.emergency_contact_phone}
                                        onChange={(e) => setData("emergency_contact_phone", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div
                                    className="form-group"
                                    style={{ gridColumn: "span 2" }}
                                >
                                    <label>Present Address</label>
                                    <textarea
                                        value={data.present_address}
                                        onChange={(e) => setData("present_address", e.target.value)}
                                        className="form-control"
                                        rows="2"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer mt-5 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn-save"
                                >
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