# APK uji Android — Golden Hand POS

APK ini membungkus frontend React dengan Capacitor 8.5.3. Android menyediakan runtime dan akses perangkat untuk integrasi berikutnya; antarmuka tetap memakai WebView, bukan ditulis ulang dengan Kotlin/Compose. Ini demo kasir, bukan rilis produksi.

## Pasang di HP

1. Login GitHub dengan akun yang memiliki akses ke repository development yang masih private.
2. Buka [golden-hand-pos-demo.apk](https://github.com/Ndoaivi/golden-hand-pos/blob/main/downloads/golden-hand-pos-demo.apk), pilih **Download raw file**. Jika yang terunduh adalah halaman HTML, buka kembali halaman file dan gunakan tombol download, bukan menyimpan halaman.
3. Buka APK dari aplikasi Files/Downloads. Izinkan **Install unknown apps / Instal aplikasi tidak dikenal** untuk aplikasi yang membuka APK jika Android memintanya.
4. Pasang, buka **Golden Hand POS Demo**, lalu pilih **Cashier POS** untuk masuk demo.

Minimum Android 7 / API 24, dengan Chrome / Android System WebView yang diperbarui. Nama paket `com.goldenhand.mahjong.pos.demo` terpisah dari aplikasi produksi yang belum dibuat. Paket menggunakan debug signing untuk uji internal; tidak diterbitkan ke Play Store atau layanan hosting.

## Coba alurnya

- Pastikan ada tepat lima meja Standard. HP bisa dipakai portrait atau landscape; penggunaan kasir utama tetap ditujukan untuk tablet landscape.
- Pilih meja 03 yang tersedia, mulai sesi postpaid, tambah F&B, lalu catat pembayaran tunai.
- Aktifkan mode pesawat dan terus gunakan demo. Semua aset tampilan ada di APK; tidak perlu koneksi atau persiapan login online untuk **demo ini**.
- Tutup aplikasi dan buka lagi. Konfirmasi masuk demo bisa muncul kembali, tetapi transaksi dan waktu selesai sesi tetap disimpan. Countdown dihitung kembali dari timestamp, bukan dari jumlah tick saat aplikasi aktif.
- Tekan Back Android saat dialog terbuka: dialog ditutup tanpa menyimpan. Dari menu kasir lain, Back kembali ke layar meja. Dari layar utama, Back menutup aplikasi.
- Buka preview bill. Tombol cetak native dinonaktifkan dan diberi keterangan karena print bridge Android / ESC/POS belum dibangun. Cetak browser tetap tersedia pada versi web.

Data demo tersimpan di localStorage WebView pada HP ini. APK tidak mempunyai antrean sinkronisasi produksi, autentikasi, server RBAC, pengiriman data ke owner, koneksi EDC BCA atau printer. Owner tetap memakai versi web `/admin`; data browser owner dan data APK **belum terhubung**. Software cutoff hanya mengubah status sesi, tidak memutus listrik meja.

Uninstall / Clear data menghapus data demo. APK dari mesin build lain dapat memiliki debug signing key berbeda; pembaruan dengan key berbeda akan ditolak Android. Jangan memakai data operasional nyata pada build ini. Rilis produksi membutuhkan signing key milik klien yang disimpan aman di luar Git dan mekanisme pembaruan yang diuji.

## Build ulang

Pasang Node.js 24+, JDK 21, Android Studio 2025.2.1+ dan Android SDK platform 36. Toolchain: Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3. Gradle wrapper memverifikasi SHA-256 distribusi. `apps/android/local.properties` berisi `sdk.dir=...` sesuai mesin dan tidak masuk Git.

```sh
npm ci
npm run android:apk
```

Perintah menjalankan build frontend, menyalin aset ke Android, membangun `assembleDebug`, menjalankan Android `lintDebug`, lalu menyalin APK dan checksum ke `downloads/`. Build mengunduh dependensi toolchain dan membutuhkan internet; aplikasi demo yang terpasang memuat aset lokal.

Untuk menjalankan lewat Android Studio / HP USB:

```sh
npm run android:sync
npm run android:open
```

Pilih perangkat Android dan klik Run. USB debugging hanya diperlukan untuk metode Android Studio; pemasangan APK biasa tidak memerlukannya.

Android source ada di `apps/android`, UI di `apps/web`, aturan bisnis di `packages/domain`. Config native ada di `capacitor.config.ts`. Tidak ada `server.url`, live reload eksternal, payment SDK, kredensial produksi, atau izin Bluetooth/USB yang belum diperlukan. Logo asli disalin tanpa perubahan byte; drawable icon memberi ruang dengan rasio 1280:995.

Referensi resmi: [Capacitor Android](https://capacitorjs.com/docs/android), [persiapan lingkungan](https://capacitorjs.com/docs/getting-started/environment-setup). Bukti pengujian ada di [TESTING.md](TESTING.md). Pengujian browser dengan simulasi platform native tidak menggantikan pengujian perangkat Android fisik.
