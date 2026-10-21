# Payment accounting review — 15 September 2026

## Implemented

- Vendor advance and refund dates are entered explicitly. New advances link to their exact bank transaction for undo.
- Salary advance deductions reduce staff advance balances and net salary. Editing/deleting restores the original advance allocations.
- Project expenses can retain a payee name without creating a vendor. Existing vendor selection and inline vendor creation remain available.
- Expense search covers payee, vendor/company, client/company, project, category, account, staff name and notes.
- List filters preserve page size and `All`; salary totals cover all matching records.
- Project/office expense, salary, vendor payments/advances, manual outgoing payments and account transfers accept bank charges. A payment of 1,000 with a fee of 10 records an account debit of 1,010; settlement and vendor wallet principal remain 1,000.
- Salary cash reports use transaction dates, including installments. Client advance usage is excluded from new invoice cash receipts. Dashboard vendor payments are no longer counted twice. Vendor advance totals use the wallet balance with the correct sign.

The schema migration was applied to the configured development database. Nine legacy paid salaries had zero `paid_amount` despite transactions exactly equal to net pay. Their paid totals were restored from those transactions; bank balances were not changed.

## Remaining historical differences

The following are differences between stored balances and the available records, **not verified bank statement balances**. The transaction history may be incomplete. Do not replace stored balances with these calculated values without reconciling the original records.

| Record | ID | Stored | Calculated from records |
| --- | --- | ---: | ---: |
| Account | 2 | 44,191.00 | 51,681.00 |
| Account | 4 | 0.00 | 376,605.00 |
| Account | 5 | 7,710.00 | -807,259.00 |
| Account | 6 | 0.00 | -10.00 |
| Account | 7 | 0.00 | 46.00 |
| Account | 8 | 0.00 | 7,500.00 |
| Account | 9 | 0.00 | -855.00 |
| Staff advance used | 3 | 101,840.00 | 102,190.00 |
| Staff advance returned | 3 | 755.00 | 405.00 |
| Staff advance given | 4 | 67,210.00 | 516,332.00 |
| Staff advance used | 4 | 0.00 | 429,822.00 |
| Staff advance returned | 4 | 0.00 | 8,500.00 |

Staff 3 has a 350 difference in how usage/returns were classified, but the remaining balance agrees. Staff 4's stored remaining advance is 67,210; its detailed records imply 78,010. These entries require source verification.

Run `php artisan finance:audit-balances` for a read-only comparison. Opening account credits are recognized by the existing `Opening Balance` description. Missing or differently labeled historical opening transactions require manual review.

`php artisan finance:audit-balances --repair-legacy-salaries` only fills a zero paid total on an already-paid salary when existing bank transactions exactly equal net pay. It does not reconcile bank or staff balances.

## Notes

- Old expense entries without a payee name cannot recover that name automatically; enter it when editing.
- Before editing/deleting an expense with completed bulk vendor payments, void those linked payments so their bill allocations remain consistent.
- Operational cash reports cover recorded invoice/client advance receipts and project, office, salary and finance payments, plus bank charges. They are not a full bank reconciliation: advance principal funding, investment principal, internal transfers and uncategorized manual payments have separate ledgers. Staff/vendor advance settlements are not additional bank withdrawals. Historical transaction gaps still affect cash reports.
- Git inspection reports a pre-existing `.git/index: index file smaller than expected` error. The Git index was not modified.
