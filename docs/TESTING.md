# Phase 1 validation — 14 October 2026 (UTC)

## Automated results

| Check | Result |
|---|---|
| `npm run build` | PASS — strict TypeScript and Vite bundle |
| `npm run lint` | PASS — no ESLint errors/warnings |
| `npm test` | PASS — 36 tests: 29 domain + 7 device-boundary tests |
| `npm run test:e2e` | PASS — 29 browser checks, 0 uncaught page errors |
| `npm run owner:preview` | PASS — compiled self-contained owner HTML and SHA-256 |
| `npm run test:owner-preview` | PASS — 4 standalone artifact checks, 0 uncaught page errors |

Production bundle: approximately 286 kB JavaScript (87 kB gzip), 45 kB CSS (9 kB gzip), plus the 69 kB original JPEG. No remote runtime fonts, images, payment SDKs, or charts are loaded.

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

## Owner artifact and device boundaries — 14 October 2026

The owner artifact was tested as the exact generated HTML served from a temporary local HTTP server. The managed Chromium policy blocked direct `file://` navigation, so direct file opening on a client phone/desktop is not a passed check. The four checks cover owner-only entry, five Standard tables, exact embedded original logo, explicit local/not-connected status, rates/prices/HPP/restock with retained active-session snapshots, offline actions, persisted edits after online reload, CSV download, mobile width and no external asset requests. Screenshot: `owner-file-mobile.png`. No owner server or URL was deployed. The portable file does not register a service worker.

Seven device-boundary tests cover monochrome raster bit order/alpha/padding and bounds; safe text wrapping/control sanitization/balances/demo marking; explicit raster/cutter/profile settings; disconnected/unsupported printer rejection and submitted-only semantics; fake USB/Classic Bluetooth/BLE/TCP adapters; concurrent EDC request deduplication and changed-bill rejection; timeout/lookup without repurchase; mismatched approvals, decline and invalid amounts. No actual native transport or bank SDK was invoked. Memory-only duplicate protection is not production idempotency.

The main browser suite also verifies receipt black text, monochrome rendering of the unchanged original logo, and its transparent wrapper. Receipt-specific grayscale/inversion/contrast blends the dark photo background into white paper. `receipt-logo-white.png` shows the receipt preview without the dark logo rectangle; `receipt-80mm.png` shows print media. Browser print screenshots remain distinct from actual thermal paper tests. Build/lint/tests above were rerun for these changes. The APK binary below is the previously verified 0.1.1 release and was not rebuilt for these web changes.

## Android APK validation

- `npm run android:apk`: PASS — frontend build, Capacitor sync, Gradle `assembleDebug` and `lintDebug`. Final native-only packaging/backup configuration was rebuilt with `node scripts/build-android.mjs`: PASS.
- Toolchain: Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, JDK 21, Android SDK 36 (AGP also installed its required Build Tools 35).
- `apksigner verify --verbose`: PASS — APK Signature Scheme v2, one debug signer. This is not a client release signature.
- Packaged metadata: `com.goldenhand.mahjong.pos.demo`, version `0.1.1-demo` (versionCode 2), minimum API 24 / Android 7, target API 36.
- Static package inspection: PASS — local HTML and every referenced compiled CSS/JS asset present, original logo bytes unchanged, cashier `/pos` start path, no remote server URL. Packaged Android manifest disables backups and declares extraction/transfer exclusions.
- APK: `4,151,879` bytes; SHA-256 `1f0fafa7a4fe07ac1c1f0d9da2fd6e0582c21eeef7fc2dfacf6f04b611d118cf`. File and checksum are in `downloads/`.
- Android app lint: PASS with 0 errors and 6 warnings. Findings are Gradle/appcompat update recommendations, the old-API backup-rule recommendation, generated Cordova XML marked unused, and missing monochrome themed launcher icons. Explicit backup flags are false and Android 12+ extraction exclusions are supplied. The full original logo is retained instead of creating substitute monochrome artwork. Capacitor's library lint uses its vendor-provided baseline (six existing findings filtered); no project baseline or suppression was added.
- No Android emulator or physical phone was available. Installation, actual Android Back behavior, system bars, airplane-mode cold start, process death/reopen, WebView storage, EDC and thermal printer still require device UAT. Browser native-flag simulation is not evidence of those hardware outcomes.

See [Android installation and phone test steps](ANDROID_DEMO.md).

## Ten-minute reminders — 13 October 2026

Two additional domain cases cover the exact 10-minute boundary, late return into the warning window, exclusion of expired/inactive sessions, and a new reminder identity after extension. Three browser checks cover simultaneous reminders, visibility across cashier menus, saved acknowledgement across reload, extension clearing the old reminder and later generating a new one offline, and removal at expiry. With reminders shown, tablet checkout stays within 1280×800 and the acknowledgement controls fit a 390×844 phone without horizontal overflow. Preview screenshots are `session-reminder-tablet.png` and `session-reminder-phone.png`; these are browser captures, not physical Android screenshots.

Updated `npm run android:apk`: PASS — build, Capacitor sync, `assembleDebug`, `lintDebug`. Updated APK signature, embedded assets and checksum verified. APK's signing-certificate SHA-256 matches the previous test APK, so it is suitable for an in-place test update without uninstalling. Minimum API 24 and target API 36 are unchanged. No OS notification or background alarm is implemented; reminders are visual while the app is open. Android app lint remains passing with warnings listed above. No physical phone/tablet, EDC, printer or customer reminder hardware was tested.
