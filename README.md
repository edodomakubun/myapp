# Aplikasi Absensi Sekolah Berbasis Cloudflare

Aplikasi Absensi Sekolah berbasis web (PWA) yang ringan, cepat, dan gratis menggunakan ekosistem Cloudflare:
- **Cloudflare Pages:** Untuk hosting Frontend (HTML, Tailwind CSS, Vanilla JS) dan Backend (Hono / Cloudflare Workers dalam mode *Advanced*).
- **Cloudflare D1:** Sebagai database SQLite (Relasional) untuk menyimpan data guru, rekap absen, izin, pengaturan, dan hari libur.
- **Cloudflare R2:** Sebagai *Object Storage* untuk menyimpan foto selfie absensi dan foto surat izin/keterangan dokter.

## Fitur Utama

### Guru (Aplikasi Utama)
- **Login Sederhana:** Menggunakan ID Guru dan PIN.
- **Absensi Masuk / Terlambat:** Otomatis mendeteksi waktu dan lokasi (Geofencing). Mewajibkan foto selfie.
- **Absensi Pulang:** Validasi jam pulang.
- **Ajukan Izin:** Form untuk mengirimkan alasan absen beserta unggahan foto surat keterangan.
- **PWA (Progressive Web App):** Dapat diinstal di layar utama (Homescreen) smartphone layaknya aplikasi native.

### Admin (Dashboard)
- **Login Admin:** Akses khusus untuk mengelola data.
- **Rekap Absensi:** Melihat daftar kehadiran guru lengkap dengan foto selfie, lokasi, dan keterangan (Tepat Waktu / Terlambat).
- **Kelola Izin (Approval):** Menyetujui atau menolak pengajuan izin dari guru.
- **Kelola Data Guru:** Menambah dan menghapus data guru beserta PIN-nya.
- **Pengaturan Absen:** Mengatur jam masuk, jam terlambat, jam pulang, serta lokasi sekolah (Latitude, Longitude) dan batas radius absensi (Geofencing) dalam hitungan meter.
- **Kelola Hari Libur:** Menambah dan menghapus daftar hari libur. Absensi otomatis ditolak pada hari libur.

---

## Panduan Pemasangan Tanpa Terminal (Via Website Cloudflare & GitHub)

Anda **tidak memerlukan terminal lokal**. Anda dapat mendeploy aplikasi ini langsung dari website Cloudflare dengan menghubungkannya ke repositori GitHub.

### Prasyarat
1. Akun **[GitHub](https://github.com/)** yang sudah menyimpan (Push/Fork) repositori aplikasi ini.
2. Akun **[Cloudflare](https://dash.cloudflare.com/)**.

### Langkah 1: Buat Database D1
1. Login ke Dashboard Cloudflare.
2. Di menu sebelah kiri, cari bagian **Workers & Pages**, lalu pilih **D1 SQL Database**.
3. Klik tombol **Create database**.
4. Beri nama database Anda (misalnya: `absensi-db`), lalu klik **Create**.
5. Setelah terbuat, masuk ke database tersebut, lalu pilih tab **Console**.
6. Buka file `schema.sql` di repository Anda (GitHub), **salin semua teksnya**, lalu **paste** ke dalam kotak Console D1 tersebut dan klik **Execute**. Ini akan membuat tabel-tabel yang dibutuhkan.

### Langkah 2: Buat R2 Bucket (Penyimpanan Foto)
1. Di menu sebelah kiri Cloudflare, pilih **R2 Object Storage**.
2. Jika belum pernah menggunakan R2, Anda akan diminta memasukkan metode pembayaran untuk aktivasi (R2 memiliki paket gratis yang sangat besar, jadi Anda tidak akan ditagih untuk penggunaan wajar).
3. Klik tombol **Create bucket**.
4. Beri nama bucket Anda (harus persis: `absensi-bucket`), lalu klik **Create bucket**.

### Langkah 3: Deploy ke Cloudflare Pages
1. Di menu sebelah kiri Cloudflare, pilih **Workers & Pages**, lalu masuk ke menu **Overview**.
2. Klik tombol **Create application**, lalu pilih tab **Pages**.
3. Pilih **Connect to Git** dan hubungkan akun GitHub Anda.
4. Pilih repositori aplikasi absensi ini, lalu klik **Begin setup**.
5. Di halaman Set Up Builds and Deployments, pastikan pengaturannya seperti ini:
   - **Project name:** (Terserah Anda, misalnya: `absensi-sekolah`)
   - **Production branch:** `main` (Atau branch yang Anda gunakan)
   - **Framework preset:** `None`
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `public`
   - Buka **Environment variables (advanced)**, lalu tambahkan variabel baru:
     - Variable name: `JWT_SECRET`
     - Value: *(Isi dengan kata sandi rahasia yang acak, misal: `Rahas1a4bs3ns1ku`)*
6. Klik **Save and Deploy**. (Proses ini akan gagal karena kita belum menghubungkan D1 dan R2. Jangan khawatir!).

### Langkah 4: Hubungkan Pages dengan D1 dan R2
Setelah deploy pertama selesai (meskipun gagal), masuk ke **Settings** dari project Pages Anda.

1. Buka menu **Settings > Functions**.
2. Gulir ke bawah ke bagian **D1 database bindings**:
   - Klik **Add binding**.
   - **Variable name:** Isi dengan `DB`.
   - **D1 database:** Pilih database `absensi-db` yang Anda buat di Langkah 1.
3. Gulir ke bawah ke bagian **R2 bucket bindings**:
   - Klik **Add binding**.
   - **Variable name:** Isi dengan `BUCKET`.
   - **R2 bucket:** Pilih bucket `absensi-bucket` yang Anda buat di Langkah 2.
4. Klik **Save**.

### Langkah 5: Re-Deploy Aplikasi
1. Kembali ke menu **Deployments** di project Pages Anda.
2. Klik tombol tiga titik pada baris deployment terakhir, lalu pilih **Retry deployment** (atau Anda bisa memicu perubahan baru di GitHub).
3. Setelah deployment selesai dan berhasil, klik URL yang disediakan oleh Cloudflare (misalnya: `https://absensi-sekolah.pages.dev`).

---

## Informasi Login Admin Pertama Kali
Setelah aplikasi berhasil online, buka halaman admin dengan menambahkan `/admin.html` di akhir URL Anda (contoh: `https://[URL-ANDA].pages.dev/admin.html`).

- **Username:** `sdinleling@admin`
- **Password:** `Admin123`

### Menambah Data Guru Pertama
Karena database masih kosong, Anda harus:
1. Login sebagai Admin.
2. Buka menu **Kelola Data Guru**.
3. Tambahkan ID, Nama, dan PIN Guru.
4. Setelah berhasil, guru tersebut dapat login di halaman utama menggunakan ID dan PIN yang baru saja Anda buat.
