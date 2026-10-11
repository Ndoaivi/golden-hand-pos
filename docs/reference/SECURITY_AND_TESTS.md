# Security, payments and test gate

## RBAC (server enforced)

| Action | Cashier | Supervisor | Owner |
|---|---|---|---|
| Start / extend / F&B / checkout | Yes | Yes | Yes |
| Cash receipt / request QRIS | Yes | Yes | Yes |
| Adjust stock | No | Limited + reason | Yes |
| Void / refund | Request | Approve within policy | Yes |
| Change rent/F&B prices | No | No | Yes |
| View HPP / global profit | No | No | Yes |
| Users / roles / integration keys | No | No | Yes |

- Separate `/pos` and `/admin` for UI, but URLs/hidden buttons are **not** authorization.
- Restrict all database tables. No frontend service_role, provider server keys, or privileged DB connection.
- Use private `pos` schema, limited DB principal for backend, RLS for any exposed schemas and policies matching venue/role if direct Data API is enabled.
- Per-cashier identity, short sessions, device logout, audit every sensitive action.
- Rate limit login, refunds, repeated payment attempts; monitor suspicious void frequency.
- Append-only audit logs; refunds/voids/reversals add events rather than deleting history.

## Payment rules

QRIS: gateway-approved merchant account; backend payment intent → dynamic QR → gateway webhook → authenticate notification + query transaction status if needed → match amount/order ID → only then verified. Webhook must be idempotent and tolerate retries/out-of-order updates.

Cash: cashier enters amount received and change; track shift drawer and reconciliation. Transfer manual: mark pending until authorized bank reconciliation (not screenshot-only).

## Acceptance tests required

1. Exactly 5 table slots, no simultaneous overlapping open session.
2. Timer recovers from browser reload, sleep, device time changes, temporary server disconnect.
3. Auto-cutoff cannot be bypassed by late Cron; expired time cannot accrue unintended charges.
4. Two cashiers press extend simultaneously → applied once, charge once.
5. Prepaid extension pending payment → must not activate.
6. Postpaid / mixed / partial → balance and receipts consistent across retries.
7. Gateway duplicate webhook and stale failure do not duplicate or reverse verified payment incorrectly.
8. Cashier blocked from price edits/HPP/global reports and from another venue's data.
9. Order decreases stock exactly once; authorized void reverses it exactly once.
10. Old transactions preserve price snapshot after new owner price applied.
11. Print bill vs paid receipt display correct status; reprint is logged.
12. Shift closing totals match captured cash and verified noncash.
13. Backup restore rehearsal and safe device/network failure handling.

PRODUCTION BLOCKED until these pass with real PostgreSQL, payment gateway sandbox and target Android printer.
