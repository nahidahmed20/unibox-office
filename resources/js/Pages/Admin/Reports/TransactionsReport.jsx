import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function TransactionsReport({ transactions = { data: [], links: [] }, accounts = [], filters = {} }) {
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [sourceType, setSourceType] = useState(filters.source_type || '');
    const [fromDate, setFromDate] = useState(filters.from || '');
    const [toDate, setToDate] = useState(filters.to || '');

    const isFirstRender = useRef(true);

    // --- Source type লেবেল ও কালার ম্যাপ ---
    const sourceMeta = {
        vendor_payment:      { label: 'Vendor Payment',       color: '#d97706', bg: '#fef3c7' },
        vendor_payment_void: { label: 'Payment Voided',       color: '#16a34a', bg: '#f0fdf4' },
        vendor_advance:      { label: 'Advance Given',        color: '#4f46e5', bg: '#e0e7ff' },
        vendor_refund:       { label: 'Refund Received',      color: '#be123c', bg: '#ffe4e6' },
        manual_adjustment:   { label: 'Manual Adjustment',    color: '#0f172a', bg: '#f1f5f9' },
    };

    const getSourceMeta = (type) =>
        sourceMeta[type] || { label: type || 'Unknown', color: '#64748b', bg: '#f1f5f9' };

    // --- ফিল্টার পরিবর্তন হলে সার্ভারে রিকোয়েস্ট ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (accountId) params.account_id = accountId;
            if (sourceType) params.source_type = sourceType;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;

            router.get(route('admin.accounts.transactions'), params, {
                preserveState: true,
                replace: true
            });
        }, 350);

        return () => clearTimeout(delay);
    }, [accountId, sourceType, fromDate, toDate]);

    const clearFilters = () => {
        setAccountId('');
        setSourceType('');
        setFromDate('');
        setToDate('');
    };

    const hasActiveFilters = accountId || sourceType || fromDate || toDate;

    return (
        <AdminLayout>
            <Head title="Account Transactions Report" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                <div className="page-header" style={{ marginBottom: "24px" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                        Account Transactions Report
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
                        প্রতিটা অ্যাকাউন্টে কবে, কোথা থেকে, কত টাকা ঢুকেছে বা বেরিয়েছে তার সম্পূর্ণ হিস্টরি।
                    </p>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>

                    {/* --- FILTER BAR --- */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Account</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", minWidth: "180px", fontSize: "0.875rem" }}
                            >
                                <option value="">সব Account</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>Type</label>
                            <select
                                value={sourceType}
                                onChange={(e) => setSourceType(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", minWidth: "170px", fontSize: "0.875rem" }}
                            >
                                <option value="">সব Type</option>
                                <option value="vendor_payment">Vendor Payment</option>
                                <option value="vendor_payment_void">Payment Voided</option>
                                <option value="vendor_advance">Advance Given</option>
                                <option value="vendor_refund">Refund Received</option>
                                <option value="manual_adjustment">Manual Adjustment</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", marginBottom: "5px" }}>To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                            />
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff", color: "#ef4444", fontSize: "0.85rem", cursor: "pointer", fontWeight: "500" }}
                            >
                                <i className="fa-solid fa-xmark" style={{ marginRight: "6px" }}></i> Clear Filters
                            </button>
                        )}
                    </div>

                    {/* --- TABLE --- */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Date</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Account</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Type</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Reference / Note</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Amount</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Balance After</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.9rem" }}>
                                {transactions.data && transactions.data.length > 0 ? (
                                    transactions.data.map((tx) => {
                                        const meta = getSourceMeta(tx.source_type);
                                        return (
                                            <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "14px 24px", color: "#64748b", whiteSpace: "nowrap" }}>
                                                    {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                                        {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 24px", fontWeight: "600", color: "#0f172a" }}>
                                                    {tx.account?.name || '-'}
                                                </td>
                                                <td style={{ padding: "14px 24px" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "4px 10px",
                                                        borderRadius: "999px",
                                                        fontSize: "0.72rem",
                                                        fontWeight: "700",
                                                        color: meta.color,
                                                        background: meta.bg
                                                    }}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px 24px" }}>
                                                    <div style={{ fontWeight: "500", color: "#334155" }}>{tx.reference || '-'}</div>
                                                    {tx.note && (
                                                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>{tx.note}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "14px 24px", textAlign: "right", fontWeight: "700", color: tx.type === 'debit' ? "#ef4444" : "#10b981" }}>
                                                    {tx.type === 'debit' ? '-' : '+'} TK. {Number(tx.amount).toLocaleString()}
                                                </td>
                                                <td style={{ padding: "14px 24px", textAlign: "right", color: "#475569", fontWeight: "600" }}>
                                                    TK. {Number(tx.balance_after).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                                            কোনো ট্রানজেকশন পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- PAGINATION --- */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        preserveState
                                        style={{
                                            padding: "6px 12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            fontSize: "0.875rem",
                                            color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"),
                                            backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"),
                                            pointerEvents: link.url ? "auto" : "none",
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minWidth: "32px"
                                        }}
                                    >
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left"></i>
                                            : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right"></i>
                                            : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}