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
- **Kelola Hari Libur:** Menambah dan menghapus daftar hari libur. Absensi akan otomatis ditolak jika guru mencoba absen pada hari libur.

---

## Panduan Pemasangan (Deployment Guide)

Berikut adalah langkah-langkah untuk memasang dan meng-online-kan aplikasi ini ke akun Cloudflare Anda.

### Prasyarat
1. Akun **[Cloudflare](https://dash.cloudflare.com/)** (Daftar jika belum punya).
2. **Node.js** terinstal di komputer Anda.
3. Terminal / Command Prompt.

### 1. Login ke Cloudflare melalui Terminal
Buka terminal di folder project ini, lalu jalankan:
```bash
npx wrangler login
```
*Akan terbuka halaman browser. Silakan setujui (Authorize) agar Wrangler dapat mengakses akun Cloudflare Anda.*

### 2. Buat Database D1
Buat database baru untuk menyimpan data absensi:
```bash
npx wrangler d1 create absensi-db
```
Catat `database_id` yang muncul di terminal. Buka file `wrangler.toml` dan perbarui baris berikut dengan ID yang baru saja Anda dapatkan:
```toml
[[d1_databases]]
binding = "DB"
database_name = "absensi-db"
database_id = "MASUKKAN_DATABASE_ID_ANDA_DI_SINI"
```

### 3. Inisialisasi Tabel Database
Masukkan struktur tabel dan pengaturan awal ke dalam database yang baru dibuat:
```bash
npx wrangler d1 execute absensi-db --file=./schema.sql --remote
```

### 4. Buat R2 Bucket (Penyimpanan Foto)
Buat bucket R2 untuk menyimpan foto selfie dan surat izin. *(Catatan: Anda mungkin perlu menambahkan kartu kredit/debit ke akun Cloudflare Anda untuk mengaktifkan R2, tetapi R2 memiliki kuota gratis/Free Tier yang sangat besar sehingga Anda tidak akan dikenakan biaya untuk penggunaan wajar).*
```bash
npx wrangler r2 bucket create absensi-bucket
```
*(Nama `absensi-bucket` sudah dikonfigurasi di dalam `wrangler.toml`)*.

### 5. Atur Secret Key untuk Keamanan (JWT)
Aplikasi ini menggunakan JWT untuk mengamankan login. Anda harus mengatur *secret key* acak di Cloudflare:
```bash
npx wrangler pages secret put JWT_SECRET
```
*Saat diminta memasukkan value, ketikkan teks acak yang panjang dan sulit ditebak (misalnya: `KunciRahas1aAbs3nsiSek0lah2024!`), lalu tekan Enter.*

### 6. Uji Coba Secara Lokal (Opsional)
Jika Anda ingin mencoba aplikasi di komputer Anda sebelum di-deploy, jalankan:
```bash
npx wrangler d1 execute absensi-db --file=./schema.sql --local
npx wrangler pages dev public
```
Aplikasi akan berjalan di `http://localhost:8788`.
- Akses Guru: `http://localhost:8788`
- Akses Admin: `http://localhost:8788/admin.html` (Gunakan username `sdinleling@admin` dan password `Admin123`).

### 7. Deploy ke Cloudflare Pages
Jika semua sudah siap, deploy aplikasi agar bisa diakses secara online:
```bash
npx wrangler pages deploy public --project-name absensi-sekolah
```
Tunggu proses upload selesai. Anda akan mendapatkan URL publik aplikasi Anda (contoh: `https://absensi-sekolah.pages.dev`).

---

## Informasi Login Default Admin
Setelah aplikasi berhasil di-deploy, buka halaman admin di URL Anda:
`https://[URL-ANDA].pages.dev/admin.html`

- **Username:** `sdinleling@admin`
- **Password:** `Admin123`

*(Sangat disarankan untuk mengubah kode ini di file `public/_worker.js` jika ingin digunakan secara publik).*

## Menambah Data Guru Pertama
Karena database masih kosong, Anda harus **login sebagai Admin terlebih dahulu**, lalu masuk ke menu **Kelola Data Guru** untuk menambahkan ID dan PIN Guru. Setelah guru ditambahkan, guru tersebut baru bisa login di halaman utama.
