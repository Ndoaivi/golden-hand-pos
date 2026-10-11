# API Contract — draft (not implemented)

Semua route menggunakan authentication + per-venue RBAC, JSON schema input validation, request ID, dan error model konsisten. Tulis operasi finansial dengan idempotency key dan database transactions.

| Method | Path | Role / purpose |
|---|---|---|
| GET | /api/tables | Cashier+: 5 meja & status |
| POST | /api/sessions | Cashier+: start (prepaid only after confirmed payment) |
| GET | /api/sessions/:id | Cashier+: timer, charges, orders |
| POST | /api/sessions/:id/extensions | Cashier+: price quote → pay if prepaid → apply |
| POST | /api/sessions/:id/checkout | Cashier+: close when balance settled or authorized credit |
| GET | /api/products | Cashier+: current sellable F&B catalog |
| POST | /api/orders | Cashier+: confirmed order, price snapshot, inventory movement |
| POST | /api/payments | Cashier+: cash or QRIS intent; amounts calculated by server |
| POST | /api/webhooks/payment | Provider callback; signature/status/amount validation |
| GET | /api/payments/:id | Authorized status lookup |
| POST | /api/prints/bill | Cashier+: bill before final payment |
| POST | /api/prints/receipt | Cashier+: receipt after settlement |
| GET | /api/admin/pricing | Owner: tariffs + F&B prices |
| PATCH | /api/admin/pricing/:id | Owner: price changes + audit |
| POST | /api/admin/inventory/movements | Supervisor/Owner: restock/adjustment |
| GET | /api/admin/reports | Owner: revenue, inventory, shifts |
| POST | /api/admin/approvals/:id/decision | Supervisor/Owner: void/refund approval |

## Write contract

- Client sends `Idempotency-Key` for start/extend/orders/payment/checkout.
- Server checks user, role, venue, session version, stock and balance under row locks.
- Never trust client-supplied price or calculated total. Only product ID + qty or duration selection.
- Unique payment gateway order_id; unique provider transaction ID; reject amount mismatch.
- Redirect/QR/screenshot/cashier click does not mark QRIS as paid; verified gateway status does.
- All timestamps UTC in DB; display Asia/Jakarta.
- Session state changes, payment verification and inventory movement generate append-only audit events.

API is a future implementation plan. None of these routes exist in the HTML prototypes.
