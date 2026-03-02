// app.js - Frontend Logic Vanilla JS

const App = document.getElementById('app-container');

// State Manager
const state = {
  guru: JSON.parse(localStorage.getItem('guru')) || null,
  token: localStorage.getItem('guru_token') || null,
  latitude: null,
  longitude: null,
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

// Render helper
function render(html) {
  App.innerHTML = html;
}

// Routes
function Router() {
  if (!state.guru) {
    renderLogin();
  } else {
    renderDashboard();
  }
}

// --- Views ---

function renderLogin() {
  render(`
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Login Guru</h2>
    <form id="login-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">ID Guru</label>
        <input type="text" id="id_guru" placeholder="Contoh: G001" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">PIN</label>
        <input type="password" id="pin" placeholder="Contoh: 4821" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
      </div>
      <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Masuk
      </button>
      <div id="login-error" class="text-red-500 text-sm mt-2 hidden text-center"></div>
    </form>
  `);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('id_guru').value;
    const pin = document.getElementById('pin').value;

    try {
      const res = await fetch('/api/guru/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pin })
      });
      const data = await res.json();

      if (data.success) {
        state.guru = data.guru;
        state.token = data.token;
        localStorage.setItem('guru', JSON.stringify(data.guru));
        localStorage.setItem('guru_token', data.token);
        Router();
      } else {
        const err = document.getElementById('login-error');
        err.textContent = data.message;
        err.classList.remove('hidden');
      }
    } catch (error) {
       console.error(error);
       alert("Gagal menghubungi server");
    }
  });
}

function renderDashboard() {
  render(`
    <div class="text-center">
      <h2 class="text-xl font-bold mb-2">Selamat Datang, ${escapeHTML(state.guru.nama)}</h2>
      <p class="text-gray-500 mb-8">Pilih aksi di bawah ini</p>

      <div class="space-y-4">
        <button onclick="renderAbsen('masuk')" class="w-full bg-blue-500 text-white py-3 rounded-lg shadow font-semibold hover:bg-blue-600">
          Absen Masuk / Terlambat
        </button>
        <button onclick="renderAbsen('pulang')" class="w-full bg-green-500 text-white py-3 rounded-lg shadow font-semibold hover:bg-green-600">
          Absen Pulang
        </button>
        <button onclick="renderIzin()" class="w-full bg-yellow-500 text-white py-3 rounded-lg shadow font-semibold hover:bg-yellow-600">
          Ajukan Izin
        </button>
      </div>
      <div class="mt-8">
         <button onclick="logout()" class="text-red-500 text-sm underline">Keluar</button>
      </div>
    </div>
  `);
}

function renderAbsen(tipe) {
  render(`
    <h2 class="text-xl font-bold mb-4 text-center capitalize">Absensi ${tipe}</h2>

    <div id="status-lokasi" class="text-sm text-center mb-4 text-gray-600">Mencari lokasi GPS Anda...</div>

    <div class="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-4">
      <video id="video" class="w-full h-full object-cover" autoplay playsinline></video>
      <canvas id="canvas" class="hidden"></canvas>
    </div>

    <button id="btn-foto" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 hidden" disabled>
      Ambil Foto & Kirim Absen
    </button>
    <button onclick="renderDashboard()" class="w-full mt-2 text-gray-500 py-2">Kembali</button>
  `);

  const statusLokasi = document.getElementById('status-lokasi');
  const btnFoto = document.getElementById('btn-foto');
  const video = document.getElementById('video');

  // Akses Geolokasi
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.latitude = position.coords.latitude;
        state.longitude = position.coords.longitude;
        statusLokasi.textContent = `Lokasi ditemukan: ${state.latitude.toFixed(5)}, ${state.longitude.toFixed(5)}`;
        statusLokasi.classList.add('text-green-600');
        btnFoto.disabled = false;
        btnFoto.classList.remove('hidden');
      },
      (error) => {
        statusLokasi.textContent = "Gagal mendapatkan lokasi. Harap nyalakan GPS.";
        statusLokasi.classList.add('text-red-600');
      },
      { enableHighAccuracy: true }
    );
  } else {
    statusLokasi.textContent = "Browser tidak mendukung Geolokasi.";
  }

  // Akses Kamera
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => {
      console.error(err);
      alert("Tidak dapat mengakses kamera.");
    });

  // Handle Foto
  btnFoto.addEventListener('click', async () => {
    btnFoto.textContent = "Mengirim...";
    btnFoto.disabled = true;

    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('id_guru', state.guru.id);
      formData.append('latitude', state.latitude);
      formData.append('longitude', state.longitude);
      formData.append('tipe', tipe);
      formData.append('foto', blob, 'selfie.jpg');

      try {
        const res = await fetch('/api/guru/absen', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${state.token}` },
          body: formData
        });
        const data = await res.json();

        // Stop kamera
        video.srcObject.getTracks().forEach(track => track.stop());

        if (data.success) {
          alert(data.message);
          renderDashboard();
        } else {
          alert("Gagal: " + data.message);
          renderDashboard();
        }
      } catch (err) {
        alert("Gagal menghubungi server");
        renderDashboard();
      }
    }, 'image/jpeg', 0.8);
  });
}

function renderIzin() {
  render(`
    <h2 class="text-xl font-bold mb-4 text-center">Ajukan Izin</h2>
    <form id="izin-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Alasan Izin</label>
        <textarea id="alasan" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md p-2" required></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Foto Bukti (Surat / Keterangan Dokter)</label>
        <input type="file" id="surat" accept="image/*" class="mt-1 block w-full" required>
      </div>
      <button type="submit" id="btn-izin" class="w-full bg-yellow-500 text-white py-2 rounded-lg font-semibold hover:bg-yellow-600">Kirim Izin</button>
      <button type="button" onclick="renderDashboard()" class="w-full text-gray-500 py-2">Batal</button>
    </form>
  `);

  document.getElementById('izin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-izin');
    btn.textContent = "Mengirim...";
    btn.disabled = true;

    const alasan = document.getElementById('alasan').value;
    const file = document.getElementById('surat').files[0];

    const formData = new FormData();
    formData.append('id_guru', state.guru.id);
    formData.append('alasan', alasan);
    formData.append('surat', file);

    try {
      const res = await fetch('/api/guru/izin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        alert("Pengajuan Izin berhasil dikirim!");
        renderDashboard();
      } else {
        alert("Gagal: " + data.message);
        btn.textContent = "Kirim Izin";
        btn.disabled = false;
      }
    } catch (err) {
      alert("Error menghubungi server");
      btn.textContent = "Kirim Izin";
      btn.disabled = false;
    }
  });
}

function logout() {
  state.guru = null;
  state.token = null;
  localStorage.removeItem('guru');
  localStorage.removeItem('guru_token');
  Router();
}

// Inisialisasi awal
Router();
