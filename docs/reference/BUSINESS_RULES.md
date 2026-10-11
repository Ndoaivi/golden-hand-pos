# Business Rules (baseline untuk custom)

## Meja & sesi

- Venue hanya memiliki **5 meja** pada konfigurasi awal; ID sistem unik, nomor label 01–05.
- Per meja hanya boleh ada satu sesi terbuka (`active`, `expired`, `checkout_pending`) pada satu waktu.
- `AVAILABLE` → start → `ACTIVE` → `EXPIRED` / checkout → `CHECKOUT_PENDING` → `CLEANING` → `AVAILABLE`.
- `WARNING` adalah label turunan jika sisa waktu kurang dari parameter (default usulan 10 menit), bukan state permanen DB.
- Software cutoff berarti status sesi berakhir, **bukan** pemutusan listrik/aktivitas mesin Mahjong.
- Sesi EXPIRED tidak menambah tagihan otomatis; untuk lanjut harus extend disetujui sesuai billing mode.
- Harga tidak dihitung dari timer milik browser; simpan `started_at`, `expires_at`, durasi, dan rate snapshot di server.

## Extend

- Kasir dapat meminta extend sesuai opsi dari owner: 30 menit, 60 menit, custom (disesuaikan kebijakan).
- Extend sebelum expired menambah `expires_at` yang ada. Extend setelah expired disarankan mulai ulang dari waktu aktivasi; jika kebijakan diubah, backend harus mengimplementasikan cara yang konsisten.
- **Prepaid**: durasi tambahan baru aktif setelah penerimaan pembayaran diverifikasi.
- **Postpaid**: bisa diaktifkan berdasarkan limit tagihan dan persetujuan kasir, lalu ditagih saat checkout.
- Extend dan charge dibuat dalam transaksi atomik dan menggunakan idempotency key. Dua kasir tidak bisa menambahkan extend ganda secara tidak sengaja.

## Billing

Simpan **charges** dan **payments** secara terpisah. Saldo = total charges setelah adjustment legal - total pembayaran verified yang dialokasikan. Prepaid, postpaid, partial payment, cash + QRIS mixed harus didukung. QRIS pending tidak boleh dianggap lunas.

- Tariff rental dapat diubah owner; snapshot harga tiap session/extend.
- Harga jual/HPP F&B editable hanya di back office; snapshot harga saat pesanan dikonfirmasi.
- F&B dipesan ke sesi/meja, mengurangi stok setelah order confirmed; pembatalan membuat reversal inventory dan audit.
- Stok via inventory movements (restock, sale, waste, adjustment, reversal), bukan angka bebas yang menimpa riwayat.
- Bill = dokumen jumlah tagihan meski belum lunas; Receipt = bukti pembayaran terverifikasi. Reprint diberi penanda salinan dan audit.

## Pengaturan yang masih menunggu konfirmasi owner

Tarif aktual per meja/jam; apakah ada Standard/VIP; cara pembulatan; grace period; kapan checkout otomatis/manual; limit postpaid; pajak/biaya layanan; cutoff reactivation policy; low stock threshold; tipe menu dan metode transfer bank. Nilai uang pada HTML adalah **contoh**.
