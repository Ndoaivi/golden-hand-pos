# Work remaining after Phase 1 approval

1. Confirm operational policy: actual rates and VIP classification, grace period, allowed extensions, postpaid limits, taxes/service fees, cancellation rules, staff permissions, and refund/void limits.
2. Implement Supabase Auth and server-enforced venue/staff RBAC. Restrict database privileges/RLS, remove the demo role chooser and browser settlement controls, add login/session expiry/device logout.
3. Build the Cloudflare Workers API and PostgreSQL migrations. Server timestamps, unique open session constraints, price/HPP snapshots, atomic stock/charge/payment operations, idempotency keys, row locks, protected audit and safe error responses are required.
4. Replace browser data with one authoritative store, authenticated realtime or polling, recovery after device sleep/network loss, quote expiry, and robust conflict handling. Add monitoring, backups and restore rehearsal.
5. Implement cash ledger and allocation, prepaid/postpaid/mixed reconciliation, shift carryover and cash differences, refund/void reversal entries, inventory movements and approval authorization.
6. Select the payment path. Midtrans sandbox QRIS needs server-created intents, verified provider notifications/status, amount matching, retry/out-of-order handling, and reconciliation before considering an amount paid.
7. If the venue already uses a bank EDC, support an external-payment recording workflow with terminal/provider, approved amount, transaction/reference number and bank settlement reconciliation. Do not process the same payment through Midtrans again. Direct EDC integration depends on the bank/terminal provider API or supported POS bridge. No EDC payment method or real verification is implemented in Phase 1.
8. Choose and test an Android-compatible 80 mm printer path: print bridge/native companion or LAN gateway. Implement ESC/POS bytes, routing, authorized reprints, print failure/retry and actual-device acceptance tests. Confirm grayscale logo readability and paper margins.
9. Validate PWA installation/icons, caching/version upgrade policy, 10-inch affordable Android tablet landscape UX, mobile owner access, accessibility and performance. Do not allow offline operations to pretend to be server-verified financial transactions.
10. Complete integration/security/UAT gates: concurrent extend/order/payment, stale clients, duplicate webhooks, role bypass, cross-venue access, incorrect prices, device clock changes, stock reversal, shift totals, refund accounting and restore recovery. Review dependencies and CI before release.
11. Obtain explicit approval for any deployment and production credentials. First deploy an authenticated sandbox/UAT build; production release needs a separate authorization and handover checklist.

This document is a plan only. Phase 2 has not started.
