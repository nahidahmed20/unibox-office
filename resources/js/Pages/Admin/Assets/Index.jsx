import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Index({ assets = [], users = [] }) {

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get('search') || ''
    );

    const [perPage, setPerPage] = useState(
        () => new URLSearchParams(window.location.search).get('per_page') || 10
    );

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, clearErrors } = useForm({
        id: '',
        name: '',
        asset_code: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
        assigned_to: '',
        assigned_date: '',
        condition: 'new'
    });

    // SEARCH + PAGINATION
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            router.get(
                route('admin.assets.index'),
                {
                    search: searchTerm,
                    per_page: perPage,
                },
                {
                    preserveState: true,
                    replace: true,
                }
            );
        }, 500);

        return () => clearTimeout(delay);

    }, [searchTerm, perPage]);

    // OPEN CREATE
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setShowModal(true);
    };

    // OPEN EDIT
    const openEditModal = (asset) => {
        clearErrors();
        setData({
            ...asset,
            assigned_to: asset.assigned_to || '',
            serial_number: asset.serial_number || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    // SUBMIT
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            put(route('admin.assets.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Asset updated.', 'success');
                }
            });
        } else {
            post(route('admin.assets.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire('Created!', 'Asset added.', 'success');
                }
            });
        }
    };

    // DELETE
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33'
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route('admin.assets.destroy', id));
            }
        });
    };

    // COPY
    const handleCopy = () => {
        const text = assets.map(a =>
            `${a.asset_code}\t${a.name}\t${a.condition}\t${a.assignee?.name ?? 'Unassigned'}`
        ).join('\n');

        navigator.clipboard.writeText(text);

        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            timer: 1200,
            showConfirmButton: false,
        });
    };

    // CSV
    const handleCSV = () => {
        const rows = [
            ['Code', 'Name', 'Condition', 'Assigned'],
            ...assets.map(a => [
                a.asset_code,
                a.name,
                a.condition,
                a.assignee?.name ?? 'Unassigned'
            ])
        ];

        const csv = rows.map(r => r.join(",")).join("\n");

        const blob = new Blob([csv], { type: "text/csv" });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "assets.csv";
        a.click();

        URL.revokeObjectURL(url);
    };

    // EXCEL
    const handleExcel = () => {
        const ws = XLSX.utils.json_to_sheet(
            assets.map(a => ({
                Code: a.asset_code,
                Name: a.name,
                Condition: a.condition,
                Assigned: a.assignee?.name ?? 'Unassigned'
            }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Assets");

        const excelBuffer = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array"
        });

        const file = new Blob([excelBuffer], {
            type: "application/octet-stream"
        });

        saveAs(file, "assets.xlsx");
    };

    // PDF
    const handlePDF = () => {
        const doc = new jsPDF();

        autoTable(doc, {
            head: [['Code', 'Name', 'Condition', 'Assigned']],
            body: assets.map(a => [
                a.asset_code,
                a.name,
                a.condition,
                a.assignee?.name ?? 'Unassigned'
            ])
        });

        doc.save("assets.pdf");
    };

    return (
        <AdminLayout>
            <Head title="Assets" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Company Assets</h1>
                </div>

                <div className="card-container">

                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-boxes-stacked"></i> Asset Inventory
                        </div>

                        <button onClick={openCreateModal} className="add-btn">
                            + Add Asset
                        </button>
                    </div>

                    {/* TOOLBAR (SAME DESIGN) */}
                    <div className="table-toolbar">

                        <div className="show-entries">
                            Show
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value)}>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn" onClick={handleCopy}>
                                <i className="fas fa-copy me-1"></i> Copy
                            </button>

                            <button type="button" className="export-btn" onClick={handleExcel}>
                                <i className="fas fa-file-excel me-1"></i> Excel
                            </button>

                            <button type="button" className="export-btn" onClick={handleCSV}>
                                <i className="fas fa-file-csv me-1"></i> CSV
                            </button>

                            <button type="button" className="export-btn" onClick={handlePDF}>
                                <i className="fas fa-file-pdf me-1"></i> PDF
                            </button>

                            <button type="button" className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                    </div>

                    {/* TABLE */}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CODE</th>
                                <th>ASSET NAME</th>
                                <th>CONDITION</th>
                                <th>ASSIGNED TO</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>

                        <tbody>
                            {assets.map((ast) => (
                                <tr key={ast.id}>
                                    <td className="font-bold">{ast.asset_code}</td>
                                    <td>{ast.name}</td>
                                    <td>
                                        <span className="uppercase text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                            {ast.condition?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        {ast.assignee?.name || <span className="text-gray-400">Unassigned</span>}
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            <button onClick={() => openEditModal(ast)} className="icon-btn edit">
                                                <i className="fa-regular fa-pen-to-square"></i>
                                            </button>

                                            <button onClick={() => handleDelete(ast.id)} className="icon-btn delete">
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

            {/* MODAL (UNCHANGED) */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '650px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Asset" : "Add New Asset"}
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Asset Name *</label>
                                    <input value={data.name} onChange={e => setData('name', e.target.value)} className="form-control" required />
                                </div>

                                <div className="form-group">
                                    <label>Asset Code *</label>
                                    <input value={data.asset_code} onChange={e => setData('asset_code', e.target.value)} className="form-control" required />
                                </div>

                                <div className="form-group">
                                    <label>Serial Number</label>
                                    <input value={data.serial_number} onChange={e => setData('serial_number', e.target.value)} className="form-control" />
                                </div>

                                <div className="form-group">
                                    <label>Condition *</label>
                                    <select value={data.condition} onChange={e => setData('condition', e.target.value)} className="form-control">
                                        <option value="new">New</option>
                                        <option value="good">Good</option>
                                        <option value="damaged">Damaged</option>
                                        <option value="under_repair">Under Repair</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Assign To</label>
                                    <select value={data.assigned_to} onChange={e => setData('assigned_to', e.target.value)} className="form-control">
                                        <option value="">-- Unassigned --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Assigned Date</label>
                                    <input type="date" value={data.assigned_date} onChange={e => setData('assigned_date', e.target.value)} className="form-control" />
                                </div>
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                                    Cancel
                                </button>

                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}