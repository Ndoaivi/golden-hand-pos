# Repository boundary and phase restrictions

- This development repository is Ndoaivi/golden-hand-pos.
- Ndoaivi/mahjong-pos is a read-only reference. Never edit it, create branches there, commit there, or push to it.
- Before Git mutations, verify the target remote. Stop if this workspace points to Ndoaivi/mahjong-pos.
- Phase 1 covers frontend demo work only. Backend, real payment processing, production credentials, and deployment require explicit user authorization.
- Keep exactly five tables. Preserve historical price/HPP snapshots and unpaid balances.
- Keep original logo proportions; do not replace or recreate the supplied logo.
- The frontend's role chooser and local action restrictions are demo conveniences, not security boundaries. Never describe them as production RBAC.
- Keep UI, persistence, shared rules, future API, and future database concerns separate.
- Before handover, run build, lint, domain tests and applicable browser tests. Record limitations truthfully.
