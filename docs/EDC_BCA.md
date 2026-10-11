# Pilihan koneksi EDC BCA

Bank EDC sudah dikonfirmasi BCA. Merek/model mesin dan dukungan integrasi untuk merchant ini belum dikonfirmasi. Phase 1 belum menghubungkan EDC, belum memiliki metode pembayaran EDC, dan belum memverifikasi transaksi bank.

## Pencatatan pembayaran dari EDC

Alur awal yang dapat dibuat setelah persetujuan Phase 2:

1. Kasir memproses nominal tagihan di EDC BCA.
2. Setelah mesin menyatakan berhasil, kasir mencatat nominal, terminal, dan nomor referensi transaksi dari struk EDC di POS.
3. POS menyimpan pembayaran eksternal beserta kasir, waktu, sesi/shift dan referensi. Pencatatan manual ditandai sebagai konfirmasi kasir, bukan verifikasi otomatis bank.
4. Owner mencocokkan transaksi dengan laporan settlement BCA, termasuk perbedaan nominal bersih akibat biaya merchant.

Pembayaran gagal atau statusnya belum jelas tidak boleh melunasi tagihan. Pembayaran sebagian melalui EDC dapat dialokasikan ke sesi; sisanya tetap outstanding. Referensi tidak boleh digunakan dua kali. Jangan memproses ulang pembayaran yang sama lewat Midtrans.

## Koneksi otomatis

Hubungi dukungan merchant BCA untuk meminta konfirmasi **integrasi kasir/POS atau ECR**, dengan menyebutkan model terminal dan bahwa kasir memakai tablet Android dengan aplikasi web/PWA. Ketersediaan, aktivasi, dokumentasi protokol, transport dan perangkat perantara harus dikonfirmasi oleh BCA/vendor yang disetujui. Nama bank saja tidak memastikan terminal menyediakan API.

Jika tersedia, arsitektur yang direncanakan adalah:

`POS → layanan transaksi/bridge resmi → EDC BCA → hasil transaksi → layanan transaksi → status pembayaran POS`

POS mengirim nominal dan referensi unik. Sistem mencatat hasil approved setelah memvalidasi transaksi, nominal dan referensinya melalui jalur yang didukung provider. PWA mungkin memerlukan aplikasi pendamping atau bridge LAN/USB yang disetujui; jangan mengasumsikan browser Android bisa langsung berbicara dengan semua EDC.

Timeout harus ditampilkan sebagai status belum diketahui. Status perlu diperiksa sebelum mencoba transaksi baru agar tamu tidak ditagih dua kali. Settlement, void/refund, otorisasi owner, audit dan rekonsiliasi tetap perlu dibuat dan diuji. POS tidak perlu menyimpan PIN atau nomor kartu lengkap.

QRIS yang diproses melalui EDC BCA mengikuti jalur bank tersebut. Itu tidak otomatis menjadi transaksi Midtrans. Midtrans sandbox tetap pilihan terpisah untuk pembayaran yang memang dimulai melalui gateway itu.

## Informasi berikutnya

- Merek dan model terminal BCA yang digunakan.
- Konfirmasi dukungan integrasi POS/ECR dari BCA untuk merchant dan terminal tersebut.
- Dokumentasi serta perangkat/transport yang disediakan, lalu akses sandbox/UAT bila tersedia.

Ini catatan rancangan. Implementasi backend atau pembayaran menunggu persetujuan Phase 2; deployment produksi membutuhkan persetujuan tersendiri.
