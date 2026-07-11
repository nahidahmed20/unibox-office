import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

export default function Ledger({ employee = {}, advancesHistory = [], summary = {} }) {
    const {
        total_advance = 0,
        total_settled = 0,
        total_returned = 0,
        current_due = 0
    } = summary;

    const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const summaryCards = [
        { label: 'Total Advance Given', value: total_advance, color: '#0f172a', bg: '#f1f5f9', icon: 'fa-hand-holding-dollar' },
        { label: 'Total Settled (Bills)', value: total_settled, color: '#16a34a', bg: '#dcfce7', icon: 'fa-receipt' },
        { label: 'Total Cash Returned', value: total_returned, color: '#2563eb', bg: '#dbeafe', icon: 'fa-money-bill-transfer' },
        { label: 'Current Due', value: current_due, color: '#dc2626', bg: '#fee2e2', icon: 'fa-triangle-exclamation' },
    ];

    return (
        <AdminLayout>
            <Head title={`Ledger - ${employee.name || 'Employee'}`} />

            <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <Link
                            href={route('admin.advances.index')}
                            style={{ fontSize: "0.85rem", color: "#2563eb", textDecoration: "none", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}
                        >
                            <i className="fa-solid fa-arrow-left"></i> Back to Advances
                        </Link>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                            {employee.name || 'Employee'}
                        </h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
                            Dashboard / Finance / Advances / Ledger
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    {summaryCards.map((card, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <i className={`fa-solid ${card.icon}`} style={{ color: card.color, fontSize: "1rem" }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>{card.label}</div>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: card.color, marginTop: "2px" }}>BDT {fmt(card.value)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Card */}
                <div style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                        <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "8px", color: "#2563eb" }}></i> Advance History
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>PURPOSE / NOTES</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>GIVEN</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", textAlign: "right" }}>EXPENSED</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", textAlign: "right" }}>RETURNED</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#dc2626", textTransform: "uppercase", textAlign: "right" }}>DUE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {advancesHistory.length > 0 ? (
                                    advancesHistory.map((adv) => {
                                        const expensed = parseFloat(adv.settled_amount || 0);
                                        const returned = parseFloat(adv.returned_amount || 0);
                                        const totalGiven = parseFloat(adv.amount || 0);
                                        const due = totalGiven - expensed - returned;

                                        return (
                                            <tr key={adv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#475569" }}>{adv.date}</td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{adv.purpose || '-'}</div>
                                                    {adv.notes && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>{adv.notes}</div>}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                                    {totalGiven.toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                                                    {expensed > 0 ? expensed.toLocaleString('en-IN') : '-'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                                                    {returned > 0 ? returned.toLocaleString('en-IN') : '-'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                                                    {due > 0 ? due.toLocaleString('en-IN') : '0'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize',
                                                        background: adv.status === 'settled' ? '#dcfce7' : '#fee2e2',
                                                        color: adv.status === 'settled' ? '#15803d' : '#b91c1c'
                                                    }}>
                                                        {adv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No advance history found for this employee.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}