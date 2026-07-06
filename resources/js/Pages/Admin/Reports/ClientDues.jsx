import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";

export default function ClientDues({ clientsWithDues = [] }) {
    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || "",
    );
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    const grandTotalDue = clientsWithDues.reduce((sum, client) => sum + parseFloat(client.total_due), 0);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            router.get(
                route("admin.client-dues"),
                { search: searchTerm },
                { preserveState: true, replace: true },
            );
        }, 500);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    return (
        <AdminLayout>
            <Head title="Client Dues Report" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Accounts Receivable</h1>
                </div>
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Clients with Dues</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '5px 0 0 0' }}>{clientsWithDues.length}</h2>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', borderLeft: '4px solid #ef4444' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total Receivable Amount</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: '5px 0 0 0' }}>
                            TK. {grandTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-file-invoice-dollar"></i> Client Dues List
                        </div>
                    </div>

                    {/* TOOLBAR */}
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        
                        <div className="show-entries" style={{ fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                            Show
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 mx-2 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-copy me-1"></i> Copy</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-excel me-1 text-green-600"></i> Excel</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-pdf me-1 text-red-600"></i> PDF</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-print me-1 text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CLIENT NAME</th>
                                <th>CONTACT INFO</th>
                                <th>COMPANY</th>
                                <th style={{ textAlign: 'right' }}>TOTAL DUE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientsWithDues.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-4 text-gray-500">No due records found.</td>
                                </tr>
                            ) : (
                                clientsWithDues.map((client) => (
                                    <tr key={client.id}>
                                        <td style={{ fontWeight: "600", color: "#111827" }}>{client.name}</td>
                                        <td>
                                            <div style={{ fontSize: "13px" }}>{client.email}</div>
                                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{client.phone || "N/A"}</div>
                                        </td>
                                        <td>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600">
                                                {client.company_name || "Individual"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                                            TK. {parseFloat(client.total_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}