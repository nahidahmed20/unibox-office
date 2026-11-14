import React from "react";

export default function AccountAllocationFields({ accounts = [], rows = [], onChange, total, allowCharges = false }) {
    const update = (index, key, value) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
    const addRow = () => onChange([...rows, { account_id: "", amount: "", bank_charge: "" }]);
    const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));
    const allocated = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Account allocations</p>
                <button type="button" onClick={addRow} className="text-sm font-semibold text-indigo-600">+ Add account</button>
            </div>
            {rows.map((row, index) => (
                <div key={index} className={`grid gap-2 ${allowCharges ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
                    <select className="rounded-lg border-slate-300 text-sm" value={row.account_id} onChange={(e) => update(index, "account_id", e.target.value)}>
                        <option value="">Select account</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                    <input type="number" min="0.01" step="0.01" className="rounded-lg border-slate-300 text-sm" placeholder="Amount" value={row.amount} onChange={(e) => update(index, "amount", e.target.value)} />
                    {allowCharges && <input type="number" min="0" step="0.01" className="rounded-lg border-slate-300 text-sm" placeholder="Bank charge" value={row.bank_charge ?? ""} onChange={(e) => update(index, "bank_charge", e.target.value)} />}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Balance: {Number(accounts.find((account) => Number(account.id) === Number(row.account_id))?.current_balance || 0).toLocaleString()}</span>
                        {rows.length > 1 && <button type="button" onClick={() => removeRow(index)} className="font-semibold text-red-600">Remove</button>}
                    </div>
                </div>
            ))}
            <p className={`text-xs font-semibold ${Math.abs(allocated - (Number(total) || 0)) < 0.005 ? "text-emerald-700" : "text-amber-700"}`}>
                Allocated {allocated.toFixed(2)} / {Number(total || 0).toFixed(2)}
            </p>
        </div>
    );
}
