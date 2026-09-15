const fs = require('fs');
const path = 'resources/js/Pages/Admin/Reports/TransactionsReport.jsx';
let s = fs.readFileSync(path, 'utf8').replaceAll('tx.created_at', 'tx.transaction_date').replaceAll('selectedTrx.created_at', 'selectedTrx.transaction_date');
for (const name of ['tx', 'selectedTrx']) s = s.replaceAll(`Number(${name}.balance_after).toLocaleString('en-IN')`, `${name}.balance_after == null ? '—' : Number(${name}.balance_after).toLocaleString('en-IN')`);
s = s.replace('    const sourceMeta = {', `    const sourceMeta = {
        project_expense: { label: 'Project Expense' },
        asset_purchase: { label: 'Asset Purchase' },
        investment_received: { label: 'Investment / Loan Received' },
        investment_return: { label: 'Investment Return / Profit' },
        staff_advance: { label: 'Staff Advance' },
        client_advance: { label: 'Client Advance' },`);
fs.writeFileSync(path, s);
