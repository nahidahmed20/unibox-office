import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";

export default function VendorDues({ vendorDues = [] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [perPage, setPerPage] = useState(10);

    // মোট কত টাকা আপনাকে দিতে হবে তার হিসাব
    const grandTotalPayable = vendorDues.reduce((sum, vendor) => sum + parseFloat(vendor.total_due), 0);

    // লোকাল সার্চ ফিল্টার (যেহেতু ডাটাবেস থেকে শুধু নাম আর ব্যালেন্স আসছে)
    const filteredVendors = vendorDues.filter(vendor => 
        vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <Head title="Vendor Dues Report" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Accounts Payable (আমার কাছে কে টাকা পাবে)</h1>
                </div>
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total Vendors to Pay</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '5px 0 0 0' }}>{vendorDues.length}</h2>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total Payable Amount (দেনা)</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', margin: '5px 0 0 0' }}>
                            TK. {grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-hand-holding-dollar"></i> Vendor Dues List
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
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-excel me-1 text-green-600"></i> Excel</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-pdf me-1 text-red-600"></i> PDF</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-print me-1 text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search vendor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>VENDOR NAME</th>
                                <th>STATUS</th>
                                <th style={{ textAlign: 'right' }}>TOTAL DUE (দেনা)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVendors.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-gray-500">No due records found.</td>
                                </tr>
                            ) : (
                                filteredVendors.slice(0, perPage).map((vendor, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: "600", color: "#111827", fontSize: '15px' }}>
                                            <i className="fa-solid fa-store text-gray-400 mr-2"></i> 
                                            {vendor.vendor_name}
                                        </td>
                                        <td>
                                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                                                Payable
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#d97706', fontSize: '15px' }}>
                                            TK. {parseFloat(vendor.total_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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