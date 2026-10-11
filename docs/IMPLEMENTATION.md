# Phase 1 implementation notes

## Reference inspection

The original repository contained a launcher, two self-contained Indonesian HTML prototypes, a draft SQL schema, and architecture/API/business/security documents. There was no React application, package manager, backend service, or authentication implementation.

The cashier prototype covered five-table session handling, prepaid/postpaid/mixed billing, F&B stock deductions, noncash settlement simulation, bill/receipt browser printing, and checkout/cleaning. The owner prototype covered monitoring, rates, selling prices/HPP, catalog, inventory, sample reporting/CSV, approval statuses, and audit. Its staff/shift view was predominantly static. Each prototype stored separate demo data, so owner edits did not affect cashier prices.

Both original HTML files and the four engineering documents were copied unchanged into this DEVELOPMENT repository as reference artifacts. No change, branch, commit, or push was made in the original repository. The empty development repository was initialized independently; it does not track the original repository as a remote.

## Architecture implemented

The frontend is React 19 + strict TypeScript, built with Vite. Views and reusable controls are separated from local persistence and pure shared business transitions. `packages/domain` holds typed entities, a five-table seed, reporting helpers, shape validation and testable demo rules. Backend/database directories contain boundary documentation only.

`useDemoStore` persists a successful action before updating the visible React state. Storage errors remain errors rather than appearing as successful transactions. Data is validated on load; invalid data is not silently overwritten. Users can export the raw backup and choose to reset. LocalStorage events refresh other tabs. Revision comparison rejects detected stale writes, but localStorage cannot provide a multi-tab atomic lock; two genuinely simultaneous writes can still race.

Status is derived from persisted `expires` and the current browser clock on every render/action. The timer clamps at zero. Expired sessions cannot order F&B; extend starts from the later of the prior cutoff and now. Charges do not grow automatically. Browser clocks are not authoritative and can be changed; server time is required in production.

Session rental rates and ordered product price/HPP are snapshots. Rental edits affect new sessions; active-session extensions retain the original session rate. Pending prepaid starts retain their quoted amount even if an owner updates the rate before simulated settlement. This preserves the reference demo policy; the final server pricing/quote-expiry rules must be decided in Phase 2.

Cash payments record the amount applied to the bill, not the full cash tender. Change is shown to the cashier. Pending noncash intents never count as paid and never activate prepaid durations. The simulation can settle once or cancel. Checkout requires zero due and no pending intent, archives payments/charges, and moves the table to cleaning. A separate ready action frees the table.

## Standard-table upgrade

Current state schema version 2 contains five Standard tables and only `rates.Standard`. All new demo sessions share the sample Rp80,000/hour rate. Owner edits one rental setting for all five tables.

Existing version 1 Golden Hand data is validated before migration. The store saves the exact old JSON to `golden-hand-pos-phase1-v1-before-standard` before persisting the upgrade under the existing key. Migration changes current table classifications and rate configuration, increments the revision, and adds an audit entry. It preserves active-session rates, charge labels/amounts, product/HPP snapshots, payments, unpaid balances, pending quotes, completed records, shifts and staff. Legacy charge text can still mention the former class because historical bills are not rewritten. Migration is idempotent. Invalid data or a failed storage write opens the existing recovery screen instead of resetting financial data. The previous prototype HTML files remain untouched.

The service worker cache version is bumped to v3 so an updated shell can replace the dark version. Close old demo tabs before upgrading; localStorage still has the concurrency limitations described above.

## Reports and shift definitions

- Completed-sale revenue is recognized at checkout; payments are recognized at payment time. A prepaid payment and its later checkout can fall on different report dates.
- All report date grouping uses Asia/Jakarta. Amounts are integer IDR; rental rates must be even integer rupiah for half-hour extensions.
- Gross profit = completed sales − historical F&B HPP. Table operational costs, rent, depreciation, payroll, taxes and service fees are not modeled.
- Opening cash + applied cash payments = expected drawer. Cash tender/change net to the applied amount. Closing captures counted cash and a visible difference.
- Closing a shift does not erase an open table session; the next shift can continue it. Pending payments must be handled before shift closure.
- Seed transactions are explicitly sample history for demonstration, not imported real sales.

## Visual and device design

Warm white surfaces, fine neutral borders, bronze primary actions, dark text and consistent system typography form the light design system. Decorative table illustrations, marketing slogans and filler panels were removed; the floor contains only five functional table cards. No external font or image service is required. Core controls have 44–48 px touch targets. Cashier actions stay visible in the session panel on landscape tablets; detailed bill content scrolls separately. Owner views reflow for 390 px mobile screens, with horizontally scrollable catalog/report tables where needed.

The supplied JPEG is included byte-for-byte at `apps/web/public/brand/golden-hand-original.jpg`. It is shown with its native aspect ratio using `height:auto`/`object-fit:contain` on login, navigation, mobile header, and bill/receipt. Continuous espresso brand areas, CSS edge fades on the JPEG background, and blending remove its rectangular presentation in the app. The hand, tile and lettering are retained. Receipt rendering uses the complete, unmasked original image. The source asset was not edited, reconstructed, or generated. A supplied transparent PNG/SVG would allow a fully light logo treatment without approximating the brand.

Dialogs trap focus, restore prior focus where it still exists, close with Escape, have labels, and show inline validation errors. Status is identified by text and color. Reduced-motion preferences are respected. Physical Android/tablet readability and screen-reader audits remain part of device UAT.

## Printing and PWA limits

Bill preview distinguishes an unpaid bill from a fully paid receipt. Printed copies include a demo/salinan marker and original logo. `@page` and receipt widths target 80 mm; the Android/browser/driver may still override paper size or margins. The print action audits a request, not confirmed hardware output. There is no native ESC/POS command transport, silent printing, Bluetooth pairing, or successful-print acknowledgement.

The production build registers a service worker on localhost/HTTPS. Installation caches the HTML, compiled CSS/JS and original logo, enabling offline shell reload. This is a frontend demo convenience, not a safe offline financial queue. No API writes, sync engine, conflict resolution, remote backup, or live venue synchronization exist. The original landscape JPEG is retained in the manifest; a final Android-tested icon set/install UX remains a handover task.

## Security boundary

Cashier and owner enter through separate `/pos` and `/admin` pages; the root defaults to the cashier entry. Each page has one portal-specific demo confirmation and no role switch. Portal-specific sessionStorage keys replace the previous shared role key, which is ignored. Changing a URL or using Back/Forward only restores that portal's existing demo confirmation; it never grants the new role based on the URL. Logout clears the current portal and keeps its entry URL. Cashier screens have no global reset; owner retains the demo reset/recovery workflow.

Owner adjusts the one shared rental rate and product selling price/HPP in existing editor dialogs. Cross-tab data still shares one local store so the cashier menu reflects owner pricing without gaining editors. Active-session rental rates and previous order snapshots remain unchanged.

Demo roles hide incompatible screens and shared action checks prevent accidental cashier configuration changes. Anyone controlling the browser can edit storage/code or manually visit the owner demo URL. Staff editing manages local profile records only. There are no passwords, authenticated sessions, access tokens, or server RBAC policies. Separate routes and demo confirmations must not be described as protected access. Production must verify the signed-in staff role on every API operation, deny cashier access to owner settings, and authenticate realtime subscriptions. Install the tablet PWA from the cashier entry when the production PWA entry policy is finalized; the current manifest still starts at the root/cashier entry.

Approval decisions update a local request status and audit entry only. They do not issue refunds, reverse a charge, restore stock, or reconcile an EDC/gateway. Production audit must be append-only in a protected backend, with full transactional reversals.

No Supabase project was connected, no migration was executed, no Cloudflare Worker was deployed, no Midtrans/EDC request was made, and no production credential was added.
