# Repository boundary and phase restrictions

- This development repository is Ndoaivi/golden-hand-pos.
- Ndoaivi/mahjong-pos is a read-only reference. Never edit it, create branches there, commit there, or push to it.
- Before Git mutations, verify the target remote. Stop if this workspace points to Ndoaivi/mahjong-pos.
- Phase 1 covers frontend demo work only. Backend, real payment processing, production credentials, and deployment require explicit user authorization.
- Keep exactly five Standard tables and one rental rate configuration. Preserve historical price/HPP snapshots and unpaid balances, including legacy demo migration.
- Keep the interface light, functional and free of decorative marketing panels. Use the original logo within a continuous brand area.
- Keep original logo proportions; do not replace or recreate the supplied logo.
- Keep cashier `/pos` and owner `/admin` entry pages separate, without role-switch buttons. Owner edits rates/prices/HPP; cashier has no configuration or reset controls.
- The frontend's portal confirmations and local action restrictions are demo conveniences, not security boundaries. Never describe them as production RBAC.
- Keep UI, persistence, shared rules, future API, and future database concerns separate.
- Before handover, run build, lint, domain tests and applicable browser tests. Record limitations truthfully.
