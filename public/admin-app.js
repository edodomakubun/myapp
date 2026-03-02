// admin-app.js

const App = document.getElementById('admin-app');

const state = {
  isAdminLoggedIn: localStorage.getItem('isAdmin') === 'true',
  adminToken: localStorage.getItem('adminToken') || null,
  dataAbsensi: [],
  dataIzin: [],
  dataGuru: [],
  pengaturan: null
};

// HTML escape utility to prevent XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function render(html) {
  App.innerHTML = html;
}

function Router() {
  if (!state.isAdminLoggedIn) {
    renderLogin();
  } else {
    renderDashboard();
  }
}

function renderLogin() {
  render(`
    <div class="max-w-md mx-auto bg-white p-8 rounded shadow mt-20">
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>
      <form id="admin-login-form" class="space-y-4">
        <div>
          <label class="block text-sm">Username</label>
          <input type="text" id="username" class="mt-1 block w-full px-3 py-2 border rounded" required>
        </div>
        <div>
          <label class="block text-sm">Password</label>
          <input type="password" id="password" class="mt-1 block w-full px-3 py-2 border rounded" required>
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded">Masuk Admin</button>
      </form>
    </div>
  `);

  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();

      if (data.success) {
        state.isAdminLoggedIn = true;
        state.adminToken = data.token;
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminToken', data.token);
        Router();
      } else {
        alert("Login Gagal: " + data.message);
      }
    } catch (err) {
      alert("Error server");
    }
  });
}

async function renderDashboard() {
  render(`
    <div class="bg-white shadow rounded p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
        <button onclick="logoutAdmin()" class="bg-red-500 text-white px-4 py-2 rounded">Keluar</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button onclick="loadView('absensi')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 p-4 rounded font-semibold text-left shadow">Rekap Absensi</button>
        <button onclick="loadView('izin')" class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 p-4 rounded font-semibold text-left shadow">Data Izin (Approval)</button>
        <button onclick="loadView('guru')" class="bg-green-100 hover:bg-green-200 text-green-800 p-4 rounded font-semibold text-left shadow">Kelola Data Guru</button>
        <button onclick="loadView('pengaturan')" class="bg-purple-100 hover:bg-purple-200 text-purple-800 p-4 rounded font-semibold text-left shadow">Pengaturan Absen</button>
        <button onclick="loadView('libur')" class="bg-red-100 hover:bg-red-200 text-red-800 p-4 rounded font-semibold text-left shadow">Kelola Hari Libur</button>
      </div>

      <div id="admin-content" class="mt-4">
        <p class="text-gray-500 italic">Pilih menu di atas untuk menampilkan data.</p>
      </div>
    </div>
  `);

  // Default view
  loadView('absensi');
}

async function loadView(view) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<p>Memuat data...</p>';

  try {
    const headers = { 'Authorization': `Bearer ${state.adminToken}` };
    if (view === 'absensi') {
      const res = await fetch('/api/admin/absensi', { headers });
      const data = await res.json();
      renderTabelAbsensi(data.data, content);
    } else if (view === 'izin') {
      const res = await fetch('/api/admin/izin', { headers });
      const data = await res.json();
      renderTabelIzin(data.data, content);
    } else if (view === 'guru') {
      const res = await fetch('/api/admin/guru', { headers });
      const data = await res.json();
      renderTabelGuru(data.data, content);
    } else if (view === 'pengaturan') {
      const res = await fetch('/api/admin/pengaturan', { headers });
      const data = await res.json();
      renderPengaturan(data.data, content);
    } else if (view === 'libur') {
      const res = await fetch('/api/admin/libur', { headers });
      const data = await res.json();
      renderTabelLibur(data.data, content);
    }
  } catch (err) {
    content.innerHTML = '<p class="text-red-500">Gagal memuat data.</p>';
  }
}

// ---- Render Views ----

function renderTabelAbsensi(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p>Belum ada data absensi.</p>';
    return;
  }

  let rows = '';
  data.forEach(item => {
    rows += `
      <tr class="border-b">
        <td class="px-4 py-2">${escapeHTML(item.timestamp)}</td>
        <td class="px-4 py-2">${escapeHTML(item.nama_guru)}</td>
        <td class="px-4 py-2 font-semibold ${item.keterangan.includes('Terlambat') ? 'text-red-500' : 'text-green-600'}">${escapeHTML(item.keterangan)}</td>
        <td class="px-4 py-2">
           <a href="${escapeHTML(item.foto_url)}" target="_blank" class="text-blue-500 underline">Lihat Foto</a>
        </td>
        <td class="px-4 py-2 text-xs text-gray-500">${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Rekap Absensi</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full text-left bg-white">
        <thead class="bg-gray-200">
          <tr>
            <th class="px-4 py-2">Waktu</th>
            <th class="px-4 py-2">Nama Guru</th>
            <th class="px-4 py-2">Keterangan</th>
            <th class="px-4 py-2">Foto Selfie</th>
            <th class="px-4 py-2">Lokasi (Lat, Lng)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTabelIzin(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p>Belum ada pengajuan izin.</p>';
    return;
  }

  window.updateIzinStatus = async (id, status) => {
    if(confirm(`Yakin mengubah status izin menjadi ${status}?`)) {
      await fetch('/api/admin/izin/approve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}`},
        body: JSON.stringify({id, status})
      });
      loadView('izin'); // Refresh
    }
  }

  let rows = '';
  data.forEach(item => {
    let actions = '';
    if (item.status_approval === 'Pending') {
       actions = `
         <button onclick="updateIzinStatus(${item.id}, 'Approved')" class="bg-green-500 text-white px-2 py-1 rounded text-xs mr-2">Setuju</button>
         <button onclick="updateIzinStatus(${item.id}, 'Rejected')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Tolak</button>
       `;
    } else {
       actions = `<span class="text-gray-500 italic text-sm">Selesai</span>`;
    }

    rows += `
      <tr class="border-b">
        <td class="px-4 py-2">${escapeHTML(item.tanggal)}</td>
        <td class="px-4 py-2 font-mono">${escapeHTML(item.id_guru)}</td>
        <td class="px-4 py-2 truncate max-w-xs">${escapeHTML(item.alasan)}</td>
        <td class="px-4 py-2"><a href="${escapeHTML(item.foto_surat_url)}" target="_blank" class="text-blue-500 underline text-sm">Lihat Surat</a></td>
        <td class="px-4 py-2 font-bold ${item.status_approval === 'Approved' ? 'text-green-600' : (item.status_approval === 'Rejected' ? 'text-red-600' : 'text-yellow-600')}">${item.status_approval}</td>
        <td class="px-4 py-2">${actions}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Data Izin (Persetujuan)</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full text-left bg-white">
        <thead class="bg-gray-200">
          <tr>
            <th class="px-4 py-2">Tanggal</th>
            <th class="px-4 py-2">ID Guru</th>
            <th class="px-4 py-2">Alasan</th>
            <th class="px-4 py-2">Bukti Surat</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTabelGuru(data, container) {
  window.tambahGuru = async (e) => {
    e.preventDefault();
    const id = document.getElementById('g_id').value;
    const pin = document.getElementById('g_pin').value;
    const nama = document.getElementById('g_nama').value;
    await fetch('/api/admin/guru', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}`},
      body: JSON.stringify({id, pin, nama})
    });
    loadView('guru');
  };

  window.hapusGuru = async (id) => {
    if(confirm(`Yakin menghapus Guru ID: ${id}?`)) {
       await fetch(`/api/admin/guru/${id}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${state.adminToken}` }
       });
       loadView('guru');
    }
  }

  let rows = '';
  if(data) {
    data.forEach(item => {
      rows += `
        <tr class="border-b">
          <td class="px-4 py-2">${escapeHTML(item.id)}</td>
          <td class="px-4 py-2">${escapeHTML(item.nama)}</td>
          <td class="px-4 py-2 font-mono">${escapeHTML(item.pin)}</td>
          <td class="px-4 py-2">
            <button onclick="hapusGuru('${escapeHTML(item.id)}')" class="text-red-500 hover:text-red-700 text-sm">Hapus</button>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Kelola Data Guru</h2>

    <form onsubmit="tambahGuru(event)" class="mb-6 p-4 bg-gray-50 border rounded flex gap-4 items-end">
      <div><label class="block text-sm">ID Guru</label><input type="text" id="g_id" class="border px-2 py-1 w-24" required></div>
      <div><label class="block text-sm">Nama Lengkap</label><input type="text" id="g_nama" class="border px-2 py-1 w-48" required></div>
      <div><label class="block text-sm">PIN (4 Angka)</label><input type="text" id="g_pin" class="border px-2 py-1 w-24" required></div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-1.5 rounded h-full">Tambah Guru</button>
    </form>

    <table class="min-w-full text-left bg-white border">
      <thead class="bg-gray-200">
        <tr>
          <th class="px-4 py-2">ID</th>
          <th class="px-4 py-2">Nama</th>
          <th class="px-4 py-2">PIN</th>
          <th class="px-4 py-2">Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPengaturan(data, container) {
  if (!data) return;

  window.simpanPengaturan = async (e) => {
    e.preventDefault();
    const payload = {
      jam_masuk_awal: document.getElementById('jam_masuk_awal').value,
      jam_masuk_akhir: document.getElementById('jam_masuk_akhir').value,
      jam_terlambat_awal: document.getElementById('jam_terlambat_awal').value,
      jam_terlambat_akhir: document.getElementById('jam_terlambat_akhir').value,
      jam_pulang_awal: document.getElementById('jam_pulang_awal').value,
      jam_pulang_akhir: document.getElementById('jam_pulang_akhir').value,
      lokasi_lat: parseFloat(document.getElementById('lokasi_lat').value),
      lokasi_lng: parseFloat(document.getElementById('lokasi_lng').value),
      radius_meter: parseInt(document.getElementById('radius_meter').value)
    };

    try {
      await fetch('/api/admin/pengaturan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}`},
        body: JSON.stringify(payload)
      });
      alert('Pengaturan berhasil disimpan!');
      loadView('pengaturan');
    } catch(err) {
      alert("Gagal menyimpan pengaturan.");
    }
  };

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Pengaturan Jam Absen & Lokasi</h2>
    <form onsubmit="simpanPengaturan(event)" class="space-y-4 max-w-2xl bg-white p-6 border rounded shadow-sm">

      <div class="grid grid-cols-2 gap-4">
        <h3 class="col-span-2 font-semibold border-b pb-2 mt-4">Jam Absen Masuk (Tepat Waktu)</h3>
        <div><label class="text-xs">Mulai (HH:MM)</label><input type="time" id="jam_masuk_awal" value="${data.jam_masuk_awal}" class="border px-2 py-1 w-full" required></div>
        <div><label class="text-xs">Berakhir (HH:MM)</label><input type="time" id="jam_masuk_akhir" value="${data.jam_masuk_akhir}" class="border px-2 py-1 w-full" required></div>

        <h3 class="col-span-2 font-semibold border-b pb-2 mt-4">Jam Terlambat</h3>
        <div><label class="text-xs">Mulai (HH:MM)</label><input type="time" id="jam_terlambat_awal" value="${data.jam_terlambat_awal}" class="border px-2 py-1 w-full" required></div>
        <div><label class="text-xs">Berakhir (HH:MM)</label><input type="time" id="jam_terlambat_akhir" value="${data.jam_terlambat_akhir}" class="border px-2 py-1 w-full" required></div>

        <h3 class="col-span-2 font-semibold border-b pb-2 mt-4">Jam Pulang</h3>
        <div><label class="text-xs">Mulai (HH:MM)</label><input type="time" id="jam_pulang_awal" value="${data.jam_pulang_awal}" class="border px-2 py-1 w-full" required></div>
        <div><label class="text-xs">Berakhir (HH:MM)</label><input type="time" id="jam_pulang_akhir" value="${data.jam_pulang_akhir}" class="border px-2 py-1 w-full" required></div>

        <h3 class="col-span-2 font-semibold border-b pb-2 mt-4">Geofencing (Lokasi Sekolah)</h3>
        <div><label class="text-xs">Latitude</label><input type="number" step="any" id="lokasi_lat" value="${data.lokasi_lat}" class="border px-2 py-1 w-full" required></div>
        <div><label class="text-xs">Longitude</label><input type="number" step="any" id="lokasi_lng" value="${data.lokasi_lng}" class="border px-2 py-1 w-full" required></div>
        <div class="col-span-2"><label class="text-xs">Radius Maksimal (Meter)</label><input type="number" id="radius_meter" value="${data.radius_meter}" class="border px-2 py-1 w-full" required></div>
      </div>

      <button type="submit" class="mt-6 bg-purple-600 text-white px-6 py-2 rounded shadow">Simpan Pengaturan</button>
    </form>
  `;
}

function renderTabelLibur(data, container) {
  window.tambahLibur = async (e) => {
    e.preventDefault();
    const tanggal = document.getElementById('l_tanggal').value;
    const keterangan = document.getElementById('l_keterangan').value;
    const res = await fetch('/api/admin/libur', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}`},
      body: JSON.stringify({tanggal, keterangan})
    });
    const result = await res.json();
    if (!result.success) {
      alert(result.message);
    }
    loadView('libur');
  };

  window.hapusLibur = async (tanggal) => {
    if(confirm(`Yakin menghapus hari libur tanggal: ${tanggal}?`)) {
       await fetch(`/api/admin/libur/${tanggal}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${state.adminToken}` }
       });
       loadView('libur');
    }
  }

  let rows = '';
  if(data) {
    data.forEach(item => {
      rows += `
        <tr class="border-b">
          <td class="px-4 py-2">${escapeHTML(item.tanggal)}</td>
          <td class="px-4 py-2">${escapeHTML(item.keterangan)}</td>
          <td class="px-4 py-2">
            <button onclick="hapusLibur('${escapeHTML(item.tanggal)}')" class="text-red-500 hover:text-red-700 text-sm">Hapus</button>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Kelola Hari Libur</h2>

    <form onsubmit="tambahLibur(event)" class="mb-6 p-4 bg-gray-50 border rounded flex gap-4 items-end">
      <div><label class="block text-sm">Tanggal</label><input type="date" id="l_tanggal" class="border px-2 py-1 w-full" required></div>
      <div class="flex-grow"><label class="block text-sm">Keterangan</label><input type="text" id="l_keterangan" class="border px-2 py-1 w-full" placeholder="Contoh: Libur Nasional" required></div>
      <button type="submit" class="bg-red-600 text-white px-4 py-1.5 rounded h-full">Tambah</button>
    </form>

    <table class="min-w-full text-left bg-white border">
      <thead class="bg-gray-200">
        <tr>
          <th class="px-4 py-2">Tanggal</th>
          <th class="px-4 py-2">Keterangan</th>
          <th class="px-4 py-2">Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function logoutAdmin() {
  state.isAdminLoggedIn = false;
  state.adminToken = null;
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('adminToken');
  Router();
}

Router();
