# GOLDEN HAND MAHJONG POS

Phase 1 frontend for a five-table Mahjong lounge. React + TypeScript, light surfaces and restrained bronze accents, responsive cashier and owner interfaces, and the supplied original brand image.

**Status: working frontend DEMO, not a production POS.** Data lives in this browser's localStorage. Role selection is a preview feature, not authentication. Do not use real customer data or transactions. No backend, payment gateway, production credentials, or deployment is configured.

Development repository: **[Ndoaivi/golden-hand-pos](https://github.com/Ndoaivi/golden-hand-pos)**. The original [Ndoaivi/mahjong-pos](https://github.com/Ndoaivi/mahjong-pos) is strictly read-only.

## Run locally

Requires Node.js 24+ and npm. No environment variables or credentials are needed.

```sh
npm ci
npm run dev
```

Open the displayed local URL and select **Cashier POS** or **Owner Dashboard**. `/pos` and `/admin` are frontend routes; they do not provide authorization. A fresh tab shows the demo role chooser. The preview switch in the sidebar makes role testing convenient.

```sh
npm run build
npm run preview
```

The build is written to `apps/web/dist`. The service worker is enabled only in the built preview on localhost/HTTPS. It caches the static shell and assets; it does not queue transactions or provide server synchronization. The original image is used unchanged in the manifest. Android install UX and the final icon set need real-device validation.

## Demo functionality

- Exactly **five Standard tables**, numbered 01–05, with one shared rental setting. The sample rate is Rp80,000/hour; the actual commercial rate is not yet confirmed.
- Start sessions with prepaid, postpaid, or mixed billing; hourly rates and 30/60/120-minute extensions.
- Countdown rebuilt from saved timestamps. Expired sessions block new F&B orders until extended. Software cutoff never switches off a physical machine and never adds late charges.
- Stock-aware F&B orders, price/HPP snapshots, partial cash payments, cash change, noncash pending/settlement simulation, outstanding balances, checkout, and cleaning/ready workflow.
- Shared local state across cashier/owner tabs on the same browser origin. Owner edits apply to future sessions/orders; historical snapshots remain unchanged.
- Owner catalog, prices, rental rates, restock/adjustment with reasons, gross-profit reports, CSV export, staff profiles, shift reconciliation, approval statuses, and local audit trail.
- Bill and paid receipt previews with the original logo and **80 mm print CSS**. Browser print is implemented; native ESC/POS is not.
- Loading, empty, expired, low-stock, pending-payment, offline, validation-error, and corrupt-data recovery states.

QRIS/transfer buttons are clearly labelled **demo**. They do not initiate payments, display a real QR, contact a gateway, or verify a bank transaction. Approval decisions change demo status only, without ledger or inventory reversal. Staff profiles do not create Supabase users or grant real access.

Cashier screens contain no price, HPP, rate, inventory-adjustment, staff, or business-setting editors. Shared demo action rules also reject cashier configuration edits. These browser checks are not a substitute for server-enforced RBAC.

## Structure

```text
apps/
  web/
    public/brand/                 Original supplied logo, unchanged
    public/sw.js                  Static-shell offline cache
    src/components/               Brand, controls, focus-managed dialogs
    src/features/cashier/         Cashier POS
    src/features/owner/           Owner dashboard
    src/data/                     Demo persistence / cross-tab updates
    src/styles.css                Light responsive design system
  api/README.md                   Reserved Cloudflare Workers boundary
packages/domain/                 Typed shared rules, fixtures and validators
infra/database/README.md         Reserved database/migration boundary
tests/                           Domain and browser acceptance checks
docs/                            Implementation, validation, production roadmap
docs/previews/                    Captured screenshots
docs/reference/                  Unmodified reference engineering documents
prototypes/reference/            Unmodified cashier and owner HTML references
```

## Verification

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

The browser suite serves the built files on a temporary localhost port, launches Chromium, tests the main workflows and viewport sizes, then closes the server. It does not deploy anything. By default it uses `/usr/bin/chromium`; set `PLAYWRIGHT_CHROMIUM_PATH` to a locally installed Chromium if needed. Browser tests require local socket/process permissions.

Validation results and exact coverage are in [docs/TESTING.md](docs/TESTING.md). Screenshots: [cashier tablet](docs/previews/cashier-tablet.png), [owner desktop](docs/previews/owner-desktop.png), [owner mobile](docs/previews/owner-mobile.png), [login](docs/previews/login.png), [80 mm receipt](docs/previews/receipt-80mm.png).

## Handover and next phase

Read [implementation notes](docs/IMPLEMENTATION.md), [BCA EDC integration options](docs/EDC_BCA.md), and [production roadmap](docs/PRODUCTION_ROADMAP.md). Resetting the demo deletes local transactions; use the JSON backup export first. The previous Golden Hand demo dataset upgrades automatically to five Standard tables. Its exact JSON is backed up under the existing storage key plus `-before-standard`; financial snapshots, pending quotes, and outstanding balances are preserved. Historical bill labels may retain the old class name, without keeping a VIP table or rate setting. The original reference prototypes used separate datasets and remain unchanged.

**Phase 1 ends here. Backend and payment integration require owner approval. No production deployment is authorized.**
