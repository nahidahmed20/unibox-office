# Payment reconciliation — 2026-09-16

## Correct workflow

Paying a vendor advance withdraws money from the account once and credits the vendor wallet. In Vendors → Pay Bills, choose **Vendor Advance (Wallet)** to apply that existing money. This reduces the wallet and bill due, without another account transaction. Use Bank / Cash only when sending new money. Voiding a wallet settlement restores the wallet and bill due without crediting the bank.

The vendor payment history and wallet ledger retain the settlement even though no new cash transaction exists.

## Fixes

- Added wallet settlement, insufficient-balance/over-settlement checks, and reversal.
- Disabled project-expense reconstruction in `sync:old-transactions`: cumulative `paid_amount` includes subsequent vendor payments and wallet use, so it cannot identify a separate withdrawal.
- Vendor payment sync includes bank charges and only completed account payments.
- Salary, manual transaction and transfer accounting include bank charges. Salary editing preserves principal and fee separately; partial salary payments remain visible when editing.
- Restored bank-charge totals in the financial report response. The report test uses its existing summary contract; the obsolete `monthlyProfitLoss` assertion was removed because this page returns `monthlyReport` instead.

## Initial audit (before repairs)

Read-only `php artisan finance:audit-balances` found 30 differences, including 7 account balances. No historical balances or transaction rows were changed. The wallet-source schema migration was applied locally.

| Account ID | Saved balance | Opening + recorded movements |
| --- | ---: | ---: |
| 2 | 9,021.00 | 16,511.00 |
| 4 | 0.00 | 376,605.00 |
| 5 | 57,695.00 | -757,274.00 |
| 6 | 0.00 | -10.00 |
| 7 | 0.00 | 46.00 |
| 8 | 1,600.00 | 9,100.00 |
| 9 | 0.00 | -855.00 |

There are 106 transactions marked Auto Synced. Of these, 20 project-expense entries relate to bills with completed vendor-payment allocations. These are review candidates, not an instruction to delete every synced entry:

`183, 192, 193, 194, 195, 196, 197, 198, 199, 213, 214, 215, 216, 217, 218, 232, 261, 262, 269, 272`.

For example, transaction 183 records 9,900 for expense 13, which also has 9,900 in completed vendor-payment allocations. Transaction 272 records 600,000 for expense 225, which has 200,000 in completed allocations. Partial overlaps require the original payment history; subtracting current cumulative allocations blindly is unsafe.

Reconcile each candidate against the original payment date, vendor ledger, source account statement, and payment allocation before changing historical rows. The old sync inserted transaction rows without changing account balances, so removing a proven synthetic duplicate must not automatically refund the account. Other mismatches may reflect missing movements or opening balances and need separate evidence.

Deployment requires `php artisan migrate` and `npm run build`. Verify with `php artisan test --compact` and run the read-only balance audit again after historical reconciliation.

## Repairs applied on 2026-09-16

Applied 65 source-supported changes with `php artisan finance:reconcile --apply`. Saved account balances were preserved because source-history gaps prevent certifying the remaining differences.

- Corrected 19 synthetic project-expense transactions: removed 15 fully duplicated entries and reduced 4 to the original cash component. Only allocations created before the sync were subtracted. Transaction 269 was retained because its later payment is separate.
- Restored 15 missing source movements: 9 asset purchases, 4 investments, and 2 investment repayments. This did not move money again.
- Repaired 9 legacy salary paid totals and 2 staff advance summary records.
- Reconstructed 10 uniquely matching client-advance allocations and removed the misleading account association from those 10 invoice settlements. Advance used balances and invoice paid amounts were preserved.
- Client-advance settlements are explicitly excluded from dashboard/report cash receipts, including legacy rows retaining an account.

Private backup with all before-rows and the applied plan:
`storage/app/private/reconciliation/repair-20260916-115354-6582b4ab.json`.
Initial snapshot: `storage/app/private/reconciliation/before-20260916-114450.json`.

A repeat preview proposes **zero changes**. The balance audit now finds **7 account differences**, rather than the original 30 summary differences. Vendor wallet, salary and staff summary checks agree. Additional checks found no project due arithmetic errors, overused staff/client advances, or vendor-payment allocation-total mismatches. Tests: **64 passed, 555 assertions**.

## Unibox (IBBL), account 2

The missing Canon Scanner purchase of 7,000 was restored from Asset 7. Credits total **169,127** and debits **159,616**, giving **9,511** against a saved balance of **9,021**: an unresolved **490** difference. No evidence establishes whether this is an omitted movement or a stale saved balance. No adjustment was invented.

Reviewable ledger: `storage/app/private/reconciliation/unibox-ledger-20260916.csv`.
The actual bank balance and its statement date are needed to settle this difference.

## Remaining balances after source repairs

| Account | Saved | From corrected records |
| --- | ---: | ---: |
| Unibox (IBBL) | 9,021 | 9,511 |
| Elephant Road Branch (IBBL) | 0 | 146,005 |
| Cash | 57,695 | 621,571 |
| Sonali Bank | 0 | -10 |
| Krishi Market Branch (IBBL) | 0 | 46 |
| Bkash | 1,600 | 9,100 |
| Nagad | 0 | -855 |
| City Bank | 159,100 | 159,100 |
| Bangla QR Merchant | 0 | 0 |

Advance 3 has an 8,500 return and Advance 18 a 405 return without linked receiving transactions; the original receiving account/date is not recorded. Account 4's configured opening 47,997 conflicts with opening transaction 52,429. Account 6's configured opening 3,059 conflicts with opening transaction 3,069. Existing manual balance adjustments were preserved. These gaps require original statements, not arbitrary balancing entries.

The reconciliation command defaults to a read-only plan. Applying repairs writes a private before/plan backup inside the database transaction, with locked rows, before changing data. Account rebuilding is opt-in and refuses to proceed while identified evidence gaps remain. Matching computed balances alone does not certify actual bank/cash balances.

## Unibox owner-stated balance reconciliation completed

The owner subsequently stated that Unibox should contain **25,035**. On 2026-09-16, account 2 was reconciled to that amount; this supersedes its unresolved balance above.

- Before: saved balance 9,021; corrected transaction ledger 9,511.
- Recorded a **15,524 credit reconciliation adjustment**, transaction **486**, reference **RECON-UNIBOX-20260916**. This is an explicit historical adjustment, not a sale, invoice receipt, or newly discovered payment. The original cause of the difference remains unverified; no bank statement was supplied.
- Rebuilt the saved balance to **25,035**, correcting the separate 490 cached-balance discrepancy. Adding 15,524 directly to the stale 9,021 would have been incorrect.
- Verified both the saved balance and net transaction ledger equal **25,035**. All other account records remained unchanged.
- Verified private before/plan backup: `storage/app/private/reconciliation/unibox-confirmed-20260916-115929.json`.

The remaining discrepancies in other accounts still require their original records or owner-confirmed balances; Unibox reconciliation does not resolve those accounts.
