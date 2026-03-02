CREATE TABLE IF NOT EXISTS guru (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  nama TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS absensi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_guru TEXT NOT NULL,
  iso_timestamp TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  nama_guru TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  foto_url TEXT,
  FOREIGN KEY(id_guru) REFERENCES guru(id)
);

CREATE TABLE IF NOT EXISTS izin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_guru TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  alasan TEXT NOT NULL,
  foto_surat_url TEXT NOT NULL,
  status_approval TEXT NOT NULL DEFAULT 'Pending',
  FOREIGN KEY(id_guru) REFERENCES guru(id)
);

CREATE TABLE IF NOT EXISTS pengaturan (
  id INTEGER PRIMARY KEY,
  jam_masuk_awal TEXT NOT NULL DEFAULT '06:00',
  jam_masuk_akhir TEXT NOT NULL DEFAULT '07:59',
  jam_terlambat_awal TEXT NOT NULL DEFAULT '08:00',
  jam_terlambat_akhir TEXT NOT NULL DEFAULT '08:49',
  jam_pulang_awal TEXT NOT NULL DEFAULT '11:00',
  jam_pulang_akhir TEXT NOT NULL DEFAULT '14:50',
  lokasi_lat REAL NOT NULL DEFAULT -7.14872,
  lokasi_lng REAL NOT NULL DEFAULT 131.70819,
  radius_meter INTEGER NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS hari_libur (
  tanggal TEXT PRIMARY KEY,
  keterangan TEXT
);

-- Inisiasi pengaturan default (Abaikan jika sudah ada)
INSERT OR IGNORE INTO pengaturan (id) VALUES (1);
