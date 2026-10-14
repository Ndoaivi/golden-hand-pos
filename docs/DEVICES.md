# Printer dan EDC

Model printer belum dipilih. Bank EDC adalah BCA; model terminal dan dukungan ECR belum diketahui. Tidak ada printer/EDC fisik yang terhubung atau diuji. APK demo 0.1.1 yang sudah dibagikan belum diperbarui oleh perubahan ini.

## Struk hitam-putih

Preview web memakai teks dan garis hitam, kertas putih, serta logo asli dengan CSS monokrom. Pada struk, grayscale/inversion/contrast membuat latar foto gelap menjadi putih, dan wrapper transparan dengan blend multiply menyatukannya dengan kertas. Tidak ada kotak gelap di sekitar logo. Ini pengaturan render untuk kertas putih, bukan file PNG transparan baru. File logo tidak diubah; proporsi tetap dipertahankan. Browser print memakai aturan 80 mm. APK yang sudah dibagikan hanya memiliki preview; tombol cetak native tetap nonaktif.

`packages/devices` menyediakan encoder ESC/POS 80 mm dan kontrak `ThermalPrinterAdapter`. Profil mengatur kolom, lebar dot, code page dan cutter. Default memakai 48 kolom/576 dot, ASCII aman, tanpa cutter. Raster logo menerima RGBA yang sudah diskalakan dengan rasio asli, diubah menjadi bit hitam-putih dan dikomposit pada putih. GS v 0 adalah profil kompatibilitas lama; model lain dapat memerlukan command raster berbeda. Lihat [referensi Epson](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html).

Transport yang bisa diimplementasikan adapter: USB, Bluetooth Classic, Bluetooth LE dan TCP/LAN. Deklarasi transport tidak membuat Android atau browser otomatis dapat mengakses perangkat. Bridge native, izin Android, penemuan/perpasangan, chunking, timeout, profil model dan pengujian kertas masih perlu dibuat. Encoder/registry belum dihubungkan ke tombol cetak; tidak ada ekspor file teknis di alur kasir.

Registry menolak perangkat yang belum terdaftar atau profil tidak didukung. Hasil `submitted` hanya berarti adapter menerima job; bukan bukti kertas sudah tercetak. Jangan otomatis mengulang cetakan dengan status tidak jelas. Reprint, otorisasi/audit, kegagalan kertas dan reconnect harus dirancang dengan adapter sebenarnya.

## EDC lintas merek

Antarmuka `EdcAdapter` menyediakan `purchase` dan `lookup`. Vendor yang kompatibel dapat dihubungkan tanpa mengganti aturan pembayaran utama. Ini kontrak implementasi, bukan protokol universal dan bukan koneksi bank aktif. Tidak ada SDK vendor, data kartu/PIN, metode bayar EDC di kasir, atau perubahan ledger dari hasil adapter dalam Phase 1.

`EdcCoordinator` diuji dengan adapter palsu: request ID, bill, nominal IDR, hasil approved/declined/unknown, nominal/referensi hasil yang cocok, pencegahan pembelian duplikat dalam satu proses, dan lookup setelah timeout tanpa mengirim pembelian ulang. Penyimpanannya hanya memori; restart menghapus percobaan. Produksi memerlukan idempotensi dan status persisten, validasi server, batas waktu protokol vendor, keamanan transport, dan rekonsiliasi bank. Timeout/hasil yang tidak cocok tetap unknown, sehingga tidak boleh melunasi tagihan.

Untuk terminal tanpa API/ECR, alur alternatif yang perlu dibuat adalah pencatatan pembayaran eksternal: kasir menjalankan transaksi di EDC, lalu menyimpan nominal dan referensi struk EDC setelah berhasil. Ini konfirmasi manual, bukan verifikasi bank otomatis. Lihat [rancangan EDC BCA](EDC_BCA.md) dan [produk EDC BCA](https://www.bca.co.id/id/bisnis/produk/penerimaan-bisnis/edc-bca).

Setelah perangkat dipilih: konfirmasi protokol resmi/provider, pilih profil/transport, hubungkan bridge, lalu uji transaksi sandbox/UAT, decline, timeout, status lookup, duplikat, reconnect, struk panjang, logo, cutter, kehabisan kertas, dan reprint di perangkat fisik. Tidak ada janji semua merek/model pasti mendukung koneksi langsung.
