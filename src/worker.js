import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';

const app = new Hono();

// Middleware for JWT Authentication
const authMiddleware = (role) => async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const secret = c.env.JWT_SECRET || 'fallback-secret-for-dev';
    const payload = await verify(token, secret);
    if (role && payload.role !== role) {
      return c.json({ success: false, message: 'Forbidden' }, 403);
    }
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Protect Admin routes except login
app.use('/api/admin/*', async (c, next) => {
  if (c.req.path === '/api/admin/login') {
    return next();
  }
  return authMiddleware('admin')(c, next);
});

// Protect Guru routes except login
app.use('/api/guru/*', async (c, next) => {
  if (c.req.path === '/api/guru/login') {
    return next();
  }
  return authMiddleware('guru')(c, next);
});

// Serve uploaded images from R2
app.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');
  const object = await c.env.BUCKET.get(filename);
  if (!object) {
    return c.notFound();
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
});

// Fallback to serve static assets in Cloudflare Pages Advanced Mode
app.all('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ success: false, message: 'Not Found' }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

// Utility for calculating distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// 1. GURU API

// Guru Login
app.post('/api/guru/login', async (c) => {
  const { id, pin } = await c.req.json();
  const db = c.env.DB;

  const guru = await db.prepare('SELECT * FROM guru WHERE id = ? AND pin = ?').bind(id, pin).first();
  if (guru) {
    const secret = c.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = await sign({ id: guru.id, role: 'guru' }, secret);
    return c.json({ success: true, guru, token });
  } else {
    return c.json({ success: false, message: 'ID atau PIN salah' }, 401);
  }
});

// Guru Absensi
app.post('/api/guru/absen', async (c) => {
  const data = await c.req.formData();
  const id_guru = data.get('id_guru');
  const latitude = parseFloat(data.get('latitude'));
  const longitude = parseFloat(data.get('longitude'));
  const tipe = data.get('tipe'); // 'masuk' or 'pulang'
  const foto = data.get('foto'); // File upload

  if (!id_guru || isNaN(latitude) || isNaN(longitude) || !tipe || !foto) {
    return c.json({ success: false, message: 'Data tidak lengkap' }, 400);
  }

  // Ensure the token user ID matches the requested ID
  const user = c.get('user');
  if (user.id !== id_guru) {
     return c.json({ success: false, message: 'Forbidden: ID mismatch' }, 403);
  }

  const db = c.env.DB;
  const bucket = c.env.BUCKET;

  // 1. Fetch pengaturan
  const settings = await db.prepare('SELECT * FROM pengaturan WHERE id = 1').first();
  const guru = await db.prepare('SELECT nama FROM guru WHERE id = ?').bind(id_guru).first();

  if (!guru) return c.json({ success: false, message: 'Guru tidak ditemukan' }, 404);

  // 2. Geolocation validation
  const distance = calculateDistance(latitude, longitude, settings.lokasi_lat, settings.lokasi_lng);
  if (distance > settings.radius_meter) {
    return c.json({ success: false, message: 'Anda berada di luar radius sekolah' }, 403);
  }

  // 3. Time validation & Holiday Check
  const now = new Date();

  // Format for DB timezone
  const WIB = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const dateStr = WIB.toISOString().split('T')[0];

  const libur = await db.prepare('SELECT * FROM hari_libur WHERE tanggal = ?').bind(dateStr).first();
  if (libur) {
    return c.json({ success: false, message: `Hari ini libur: ${libur.keterangan}. Absen ditutup.` }, 403);
  }
  const currentHour = WIB.getUTCHours().toString().padStart(2, '0');
  const currentMinute = WIB.getUTCMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;

  let keterangan = '';

  if (tipe === 'masuk') {
    if (currentTimeStr >= settings.jam_masuk_awal && currentTimeStr <= settings.jam_masuk_akhir) {
       keterangan = 'Absensi Masuk';
    } else if (currentTimeStr >= settings.jam_terlambat_awal && currentTimeStr <= settings.jam_terlambat_akhir) {
       keterangan = 'Terlambat';
    } else {
       return c.json({ success: false, message: 'Waktu absen masuk ditolak.' }, 403);
    }
  } else if (tipe === 'pulang') {
    if (currentTimeStr >= settings.jam_pulang_awal && currentTimeStr <= settings.jam_pulang_akhir) {
       keterangan = 'Absensi Pulang';
    } else {
       return c.json({ success: false, message: 'Waktu absen pulang ditolak.' }, 403);
    }
  } else {
     return c.json({ success: false, message: 'Tipe absensi tidak valid' }, 400);
  }

  // 4. Upload photo to R2
  if (!foto.type.startsWith('image/')) {
    return c.json({ success: false, message: 'File harus berupa gambar' }, 400);
  }
  const fileName = `absensi-${id_guru}-${Date.now()}.jpg`;
  await bucket.put(fileName, await foto.arrayBuffer(), {
    httpMetadata: { contentType: foto.type },
  });

  const foto_url = `/uploads/${fileName}`;

  // 5. Save to DB
  const timestamp = `${WIB.getUTCDate().toString().padStart(2, '0')}/${(WIB.getUTCMonth()+1).toString().padStart(2, '0')}/${WIB.getUTCFullYear()} ${WIB.getUTCHours().toString().padStart(2, '0')}:${WIB.getUTCMinutes().toString().padStart(2, '0')}:${WIB.getUTCSeconds().toString().padStart(2, '0')}`;
  const iso_timestamp = WIB.toISOString();

  await db.prepare(`
    INSERT INTO absensi (id_guru, iso_timestamp, timestamp, nama_guru, keterangan, latitude, longitude, foto_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id_guru, iso_timestamp, timestamp, guru.nama, keterangan, latitude, longitude, foto_url).run();

  return c.json({ success: true, message: `Berhasil mencatat: ${keterangan}`, foto_url });
});

// Guru Ajukan Izin
app.post('/api/guru/izin', async (c) => {
  const data = await c.req.formData();
  const id_guru = data.get('id_guru');
  const alasan = data.get('alasan');
  const surat = data.get('surat'); // File upload

  if (!id_guru || !alasan || !surat) {
    return c.json({ success: false, message: 'Data tidak lengkap' }, 400);
  }

  const user = c.get('user');
  if (user.id !== id_guru) {
     return c.json({ success: false, message: 'Forbidden: ID mismatch' }, 403);
  }

  const db = c.env.DB;
  const bucket = c.env.BUCKET;

  if (!surat.type.startsWith('image/')) {
    return c.json({ success: false, message: 'Surat harus berupa gambar' }, 400);
  }

  const fileName = `izin-${id_guru}-${Date.now()}.jpg`;
  await bucket.put(fileName, await surat.arrayBuffer(), {
    httpMetadata: { contentType: surat.type },
  });

  const foto_surat_url = `/uploads/${fileName}`;
  const todayStr = new Date().toISOString().split('T')[0];

  await db.prepare(`
    INSERT INTO izin (id_guru, tanggal, alasan, foto_surat_url, status_approval)
    VALUES (?, ?, ?, ?, 'Pending')
  `).bind(id_guru, todayStr, alasan, foto_surat_url).run();

  return c.json({ success: true, message: 'Pengajuan izin berhasil dikirim' });
});


// 2. ADMIN API

app.get('/api/admin/libur', async (c) => {
  const db = c.env.DB;
  const results = await db.prepare('SELECT * FROM hari_libur ORDER BY tanggal DESC').all();
  return c.json({ success: true, data: results.results });
});

app.post('/api/admin/libur', async (c) => {
  const { tanggal, keterangan } = await c.req.json();
  const db = c.env.DB;
  try {
    await db.prepare('INSERT INTO hari_libur (tanggal, keterangan) VALUES (?, ?)').bind(tanggal, keterangan).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ success: false, message: 'Tanggal sudah ada atau error.' }, 400);
  }
});

app.delete('/api/admin/libur/:tanggal', async (c) => {
  const tanggal = c.req.param('tanggal');
  const db = c.env.DB;
  await db.prepare('DELETE FROM hari_libur WHERE tanggal = ?').bind(tanggal).run();
  return c.json({ success: true });
});


app.post('/api/admin/login', async (c) => {
  const { username, password } = await c.req.json();
  if (username === 'sdinleling@admin' && password === 'Admin123') {
    const secret = c.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = await sign({ username, role: 'admin' }, secret);
    return c.json({ success: true, token });
  } else {
    return c.json({ success: false, message: 'Username atau password salah' }, 401);
  }
});

app.get('/api/admin/absensi', async (c) => {
  const db = c.env.DB;
  const results = await db.prepare('SELECT * FROM absensi ORDER BY id DESC').all();
  return c.json({ success: true, data: results.results });
});

app.get('/api/admin/izin', async (c) => {
  const db = c.env.DB;
  const results = await db.prepare('SELECT * FROM izin ORDER BY id DESC').all();
  return c.json({ success: true, data: results.results });
});

app.post('/api/admin/izin/approve', async (c) => {
  const { id, status } = await c.req.json(); // status = 'Approved' | 'Rejected'
  const db = c.env.DB;
  await db.prepare('UPDATE izin SET status_approval = ? WHERE id = ?').bind(status, id).run();
  return c.json({ success: true });
});

// Admin Guru Management
app.get('/api/admin/guru', async (c) => {
  const db = c.env.DB;
  const results = await db.prepare('SELECT * FROM guru').all();
  return c.json({ success: true, data: results.results });
});

app.post('/api/admin/guru', async (c) => {
  const { id, pin, nama } = await c.req.json();
  const db = c.env.DB;
  await db.prepare('INSERT INTO guru (id, pin, nama) VALUES (?, ?, ?)').bind(id, pin, nama).run();
  return c.json({ success: true });
});

app.delete('/api/admin/guru/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  await db.prepare('DELETE FROM guru WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Admin Pengaturan
app.get('/api/admin/pengaturan', async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare('SELECT * FROM pengaturan WHERE id = 1').first();
  return c.json({ success: true, data: settings });
});

app.post('/api/admin/pengaturan', async (c) => {
  const p = await c.req.json();
  const db = c.env.DB;
  await db.prepare(`
    UPDATE pengaturan SET
      jam_masuk_awal = ?, jam_masuk_akhir = ?,
      jam_terlambat_awal = ?, jam_terlambat_akhir = ?,
      jam_pulang_awal = ?, jam_pulang_akhir = ?,
      lokasi_lat = ?, lokasi_lng = ?, radius_meter = ?
    WHERE id = 1
  `).bind(
    p.jam_masuk_awal, p.jam_masuk_akhir,
    p.jam_terlambat_awal, p.jam_terlambat_akhir,
    p.jam_pulang_awal, p.jam_pulang_akhir,
    p.lokasi_lat, p.lokasi_lng, p.radius_meter
  ).run();
  return c.json({ success: true });
});

export default app;
