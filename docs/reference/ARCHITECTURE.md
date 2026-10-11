# Architecture — planned production system

## Context

Satu venue, **5 meja**, 1 terminal kasir **tablet Android (contoh: Advan)** di meja depan; owner mengakses dashboard lewat HP/laptop. Tidak ada kebutuhan integrasi power on/off mesin Mahjong pada MVP.

```text
Android Tablet /pos        Owner Phone /admin
           \                 /
              React PWA
                  |
           API (Cloudflare Workers)
                  |
       PostgreSQL on Supabase
             /          \
     Staff/Auth      Charges & Ledger
                  |
           Payment Gateway
          (QRIS webhook/status)
                  |
       Android print bridge / LAN
          Thermal 80mm receipt
```

## Boundary

Frontend: hanya UI, local cache, request backend; **tidak** memutuskan status PAID, tidak menghitung harga final dan tidak menjadi sumber waktu authoritative.

Backend: authentication, RBAC, pricing, session validation, deduplication, audit, webhooks, settlement/reconciliation, inventory movement, printing payload.

Database: source of truth. Mutasi multi-entity (extend + charge, order + stock, payment + allocation) harus atomic in a DB transaction. Pertimbangkan koneksi PostgreSQL melalui Hyperdrive pada Cloudflare Workers, atau jalur backend yang mendukung satu transaksi DB utuh; jangan mengandalkan beberapa request REST terpisah untuk satu transaksi keuangan.

Timer: `expires_at` UTC dari server. Browser menghitung countdown untuk tampilan saja. API selalu memeriksa waktu server. Cron dapat menandai sesi EXPIRED untuk dashboard, tetapi keabsahan cutoff **tidak bergantung pada Cron berjalan tepat waktu**.

Realtime: optional Supabase Realtime atau polling berbasis API, semua write dilakukan melalui API. Tidak perlu koneksi real-time untuk pembayaran sah; lakukan status refetch setelah webhook.

## Real device

Target satu printer 80 mm bersama, bukan printer per meja. Untuk Android PWA + printer LAN/BT gunakan solusi compatible Android print bridge/native companion/secure local print gateway. Test ESC/POS khusus model printer sebelum membeli/mengandalkan silent print. QRIS dinamis tampil di layar kasir dari backend; jangan pernah gunakan QR contoh sebagai kode pembayaran riil.

## Future folders (belum diimplementasikan)

- `apps/pos-web/`: cashier/admin PWA
- `apps/api/`: REST API
- `packages/domain/`: domain rules, validators, test fixtures
- `infra/`: migrations, deployment, monitoring
- `tests/`: unit/integration/E2E/security

Jangan menganggap prototype HTML sebagai production source; migrasikan dengan mempertahankan layout dan alur, lalu ganti seluruh localStorage dengan backend.
