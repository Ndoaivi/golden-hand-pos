# Uji dashboard owner

`downloads/golden-hand-owner-demo.html` berisi frontend, CSS, dan logo asli dalam satu file. Tidak berisi kredensial, transaksi pelanggan, atau koneksi server. File selalu membuka portal owner; APK tetap khusus kasir.

Unduh HTML ke komputer lalu buka dengan Chrome/Edge. Preview Google Drive bukan aplikasi yang berjalan. Jika pembukaan file dibatasi browser atau aplikasi file HP, jalankan dari repository:

```sh
npm ci
npm run owner:preview
npm run preview
```

Buka alamat lokal yang ditampilkan, tambahkan `/admin`. Untuk membuka dari HP di Wi-Fi yang sama, gunakan IP komputer dan port tersebut. Ini akses jaringan lokal, bukan koneksi jarak jauh melalui internet. Pengujian browser otomatis melayani file HTML yang sama melalui localhost karena kebijakan Chromium environment memblokir `file://`. Pembukaan file langsung pada HP dan persistensi penyimpanan file membutuhkan UAT perangkat pengguna.

Yang bisa diuji: lima meja Standard, tarif per jam, katalog/harga/HPP, restock dengan alasan, laporan/ekspor CSV, shift, profil staf demo, status persetujuan demo dan audit lokal. Perubahan tarif tidak menulis ulang tarif sesi aktif. Tidak ada login produksi; konfirmasi owner hanya untuk demo.

File ini menyimpan data pada browser yang membukanya. Data file terpisah dari `/admin` yang dilayani server dan dari APK. Ketika file sudah terbuka, tindakan demo dapat berjalan tanpa internet; jangan menganggap sebuah HTML yang di-host tanpa cache bisa dibuka ulang secara offline. Penghapusan data browser atau perubahan lokasi file bisa memutus akses ke data demo.

## Agar terhubung ke APK dari jarak jauh

Masih perlu server demo yang disepakati, autentikasi owner/kasir, API dengan pemeriksaan peran, penyimpanan transaksi bersama, dan pembaruan APK yang memakai API itu. Owner akan membuka URL terpisah dari kasir. Tarif/katalog baru disinkronkan saat tablet online; sesi yang berjalan tetap memakai harga yang disepakati. Saat tablet offline, owner harus melihat waktu sinkronisasi terakhir, bukan status seolah-olah realtime.

Kasir offline produksi membutuhkan penyimpanan transaksi lokal yang tahan restart, antrean sinkronisasi dan idempotensi di server, penanganan konflik dan pemulihan. localStorage demo saat ini belum menyediakan jaminan itu. Tidak ada server, database, atau deployment yang diaktifkan untuk file ini.
