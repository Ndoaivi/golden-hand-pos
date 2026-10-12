# Phase 1 validation — 12 October 2026 (Asia/Jakarta)

## Automated results

| Check | Result |
|---|---|
| `npm run build` | PASS — strict TypeScript and Vite bundle |
| `npm run lint` | PASS — no ESLint errors/warnings |
| `npm test` | PASS — 27 domain tests |
| `npm run test:e2e` | PASS — 26 browser checks, 0 uncaught page errors |

Production bundle: approximately 284 kB JavaScript (87 kB gzip), 44 kB CSS (9 kB gzip), plus the 69 kB original JPEG. No remote runtime fonts, images, payment SDKs, or charts are loaded.

## Domain coverage

Exactly five Standard slots and one shared rate; rejection of alternate classifications; safe/idempotent legacy migration preserving bills, payments, pending quotes and historical snapshots; malformed legacy data rejection; valid persisted data; overlapping-session rejection; postpaid start; prepaid/mixed sufficient cash tender; pending start and quote snapshot; duplicate settlement protection; pending cancellation; expired cutoff and order blocking; active/expired extensions; prepaid extend gating; historical price/HPP preservation; inventory decrement and invalid quantity rejection; archived products; partial cash/mixed settlement; invalid payment amounts; cashier configuration rejection; stock adjustment reasons; last-owner protection; status-only approval simulation; shift closure/reopening; pending shift-close rejection; report/payment/HPP accounting; corrupt-data rejection; timer reload/sleep; invalid durations/rates/table IDs.

## Browser coverage

Original logo in integrated brand areas; light theme; five Standard table cashier UI; single owner rental setting; exact legacy backup and one-time migration; cashier editor/reset restrictions; portal-specific entry/logout/reload; URL and Back/Forward navigation do not grant the opposite demo role; legacy shared owner role ignored on tablet entry; owner-adjusted product price appears in the separate cashier menu; tablet layout with visible checkout/payment actions in both landscape sizes; expired cutoff/F&B lock and extend; postpaid start and Escape cancellation; F&B stock deduction; partial cash plus simulated settlement; paid receipt/logo/print CSS; checkout/cleaning/ready; shared owner table monitoring; cross-tab owner rate sync and unchanged session snapshot; owner prices/HPP/restock; approval demo; staff profile demo; empty dated reports; CSV export; mobile/portrait tablet overflow checks; reload persistence; production offline shell reload; corrupt localStorage recovery.

Chromium ran in headless touch-emulation mode. Screenshots are stored in `docs/previews`. Layout widths checked: 1280×800, 1024×768, 390×844 and 768×1024. The suite creates and closes a temporary localhost server, and never deploys.

Two additional browser checks simulate Capacitor's native platform flag at 390×844: cashier-only routing even from `/admin`, five Standard tables, no horizontal overflow, skipped service-worker registration, native Back cancellation without creating a session, offline postpaid demo start, persistence after reload, and explicit native-print unavailability. These checks exercise frontend behavior, not an Android runtime or physical bank/printer connection.

## Practical limits

- Browser emulation is not physical-device validation. No affordable Android hardware, EDC, thermal printer, Bluetooth/LAN print bridge or paper output was tested.
- Unit role checks do not establish production security. No authenticated server, Postgres transactions/RLS, simultaneous multi-client transaction guarantees or production database were tested.
- QRIS/transfer settlement and owner refund decisions are local simulations. No Midtrans, bank webhook or actual refund was tested.
- Offline tests cover shell reload and local demo data only. Browser clocks, storage edits, storage eviction and concurrent localStorage writes remain demo limitations.
- Screenshot receipts demonstrate print CSS, not hardware-compatible ESC/POS output.

Future tests and release gates are in [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) and the unchanged [reference security document](reference/SECURITY_AND_TESTS.md).

## Android APK validation

- `npm run android:apk`: PASS — frontend build, Capacitor sync, Gradle `assembleDebug` and `lintDebug`. Final native-only packaging/backup configuration was rebuilt with `node scripts/build-android.mjs`: PASS.
- Toolchain: Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, JDK 21, Android SDK 36 (AGP also installed its required Build Tools 35).
- `apksigner verify --verbose`: PASS — APK Signature Scheme v2, one debug signer. This is not a client release signature.
- Packaged metadata: `com.goldenhand.mahjong.pos.demo`, version `0.1.0-demo`, minimum API 24 / Android 7, target API 36.
- Static package inspection: PASS — local HTML and every referenced compiled CSS/JS asset present, original logo bytes unchanged, cashier `/pos` start path, no remote server URL. Packaged Android manifest disables backups and declares extraction/transfer exclusions.
- APK: `4,434,194` bytes; SHA-256 `351ea24b82dee02a5c61536566051e30d9c0f3a05fb9a8ddd438698d2d0f521a`. File and checksum are in `downloads/`.
- Android app lint: PASS with 0 errors and 6 warnings. Findings are Gradle/appcompat update recommendations, the old-API backup-rule recommendation, generated Cordova XML marked unused, and missing monochrome themed launcher icons. Explicit backup flags are false and Android 12+ extraction exclusions are supplied. The full original logo is retained instead of creating substitute monochrome artwork. Capacitor's library lint uses its vendor-provided baseline (six existing findings filtered); no project baseline or suppression was added.
- No Android emulator or physical phone was available. Installation, actual Android Back behavior, system bars, airplane-mode cold start, process death/reopen, WebView storage, EDC and thermal printer still require device UAT. Browser native-flag simulation is not evidence of those hardware outcomes.

See [Android installation and phone test steps](ANDROID_DEMO.md).
