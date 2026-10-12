# GOLDEN HAND MAHJONG POS

Phase 1 frontend for a five-table Mahjong lounge. React + TypeScript, light surfaces and restrained bronze accents, responsive cashier and owner interfaces, and the supplied original brand image.

**Status: working frontend DEMO, not a production POS.** Web and Android demo data lives in each browser/WebView's localStorage. Separate entry confirmations are preview features, not authentication. Do not use real customer data or transactions. No backend, payment gateway, production credentials, or deployment is configured.

Development repository: **[Ndoaivi/golden-hand-pos](https://github.com/Ndoaivi/golden-hand-pos)**. The original [Ndoaivi/mahjong-pos](https://github.com/Ndoaivi/mahjong-pos) is strictly read-only.

## Run locally

Requires Node.js 24+ and npm. No environment variables or credentials are needed.

```sh
npm ci
npm run dev
```

Open **`/pos`** on the cashier tablet (the root URL defaults here), or **`/admin`** on the owner device. Each entry shows only its corresponding demo confirmation. There is no owner switch in the cashier UI and no cashier switch in the owner UI. Logout stays at that portal; per-portal demo sessions cannot authorize the other entry, including browser history navigation. These are frontend routes and do not provide real authorization. Anyone can manually visit the owner URL until production authentication is implemented.

```sh
npm run build
npm run preview
```

The build is written to `apps/web/dist`. The service worker is enabled only in the built preview on localhost/HTTPS. It caches the static shell and assets; it does not queue transactions or provide server synchronization. The original image is used unchanged in the manifest. Android install UX and the final icon set need real-device validation.

## Demo functionality

An installable **Android cashier demo** is now available. See [APK installation and phone test steps](docs/ANDROID_DEMO.md). It bundles the existing React frontend with Capacitor, always enters the cashier preview, and loads local assets without a web service worker. Owner remains on the web portal. APK data is not synchronized to the owner browser. Native printing and EDC are not connected.

- Exactly **five Standard tables**, numbered 01–05, with one shared rental setting. The sample rate is Rp80,000/hour; the actual commercial rate is not yet confirmed.
- Start sessions with prepaid, postpaid, or mixed billing; hourly rates and 30/60/120-minute extensions.
- Countdown rebuilt from saved timestamps. Expired sessions block new F&B orders until extended. Software cutoff never switches off a physical machine and never adds late charges.
- Stock-aware F&B orders, price/HPP snapshots, partial cash payments, cash change, noncash pending/settlement simulation, outstanding balances, checkout, and cleaning/ready workflow.
- Shared local state across cashier/owner tabs on the same browser origin. Owner edits apply to future sessions/orders; historical snapshots remain unchanged.
- Owner catalog, prices, rental rates, restock/adjustment with reasons, gross-profit reports, CSV export, staff profiles, shift reconciliation, approval statuses, and local audit trail.
- Bill and paid receipt previews with the original logo and **80 mm print CSS**. Browser print is implemented; native ESC/POS is not.
- Loading, empty, expired, low-stock, pending-payment, offline, validation-error, and corrupt-data recovery states.

QRIS/transfer buttons are clearly labelled **demo**. They do not initiate payments, display a real QR, contact a gateway, or verify a bank transaction. Approval decisions change demo status only, without ledger or inventory reversal. Staff profiles do not create Supabase users or grant real access.

Owner adjusts the shared table rate under **Tarif meja**, and each product selling price/HPP under **Katalog & stok → Edit harga**. Changes apply to new sessions/orders; existing charge snapshots remain unchanged.

Cashier screens contain no price, HPP, rate, inventory-adjustment, staff, reset, or business-setting editors. Shared demo action rules also reject cashier configuration edits. These browser checks are not a substitute for server-enforced RBAC.

## Structure

```text
apps/
  android/                       Native cashier demo shell, Gradle wrapper and original brand drawable
  web/
    public/brand/                 Original supplied logo, unchanged
    public/sw.js                  Static-shell offline cache
    src/components/               Brand, controls, focus-managed dialogs
    src/features/cashier/         Cashier POS
    src/features/owner/           Owner dashboard
    src/data/                     Demo persistence, portal sessions / cross-tab updates
    src/styles.css                Light responsive design system
  api/README.md                   Reserved Cloudflare Workers boundary
packages/domain/                 Typed shared rules, fixtures and validators
infra/database/README.md         Reserved database/migration boundary
tests/                           Domain and browser acceptance checks
scripts/build-android.mjs        Debug APK build, Android lint and checksum packaging
downloads/                      Internal test APK and SHA-256 (not a production release)
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

Validation results and exact coverage are in [docs/TESTING.md](docs/TESTING.md). Screenshots: [cashier tablet](docs/previews/cashier-tablet.png), [owner desktop](docs/previews/owner-desktop.png), [owner mobile](docs/previews/owner-mobile.png), [cashier entry](docs/previews/login.png), [owner entry](docs/previews/owner-login.png), [80 mm receipt](docs/previews/receipt-80mm.png).

## Handover and next phase

Read [implementation notes](docs/IMPLEMENTATION.md), [BCA EDC integration options](docs/EDC_BCA.md), and [production roadmap](docs/PRODUCTION_ROADMAP.md). Resetting the demo is available only in the owner interface and deletes local transactions; use the JSON backup export first. The previous Golden Hand demo dataset upgrades automatically to five Standard tables. Its exact JSON is backed up under the existing storage key plus `-before-standard`; financial snapshots, pending quotes, and outstanding balances are preserved. Historical bill labels may retain the old class name, without keeping a VIP table or rate setting. The original reference prototypes used separate datasets and remain unchanged.

**Phase 1 ends here. Backend and payment integration require owner approval. No production deployment is authorized.**
