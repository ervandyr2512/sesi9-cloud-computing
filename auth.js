// ════════════════════════════════════════════
//   LibraryHub — auth.js
//   Firebase Authentication Guard
//   Dijalankan SEBELUM app.js di index.html
// ════════════════════════════════════════════

// ── Konfigurasi Firebase ──
var firebaseConfig = {
  apiKey:            "AIzaSyCa_Bu1ca0vd78TkgTRcO3CDiJngIZCX4A",
  authDomain:        "afl2-firebase-app.firebaseapp.com",
  databaseURL:       "https://afl2-firebase-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "afl2-firebase-app",
  storageBucket:     "afl2-firebase-app.firebasestorage.app",
  messagingSenderId: "921929778752",
  appId:             "1:921929778752:web:879dee5fefc4205fbbc1a5",
  measurementId:     "G-CTHVSEJ0W1"
};

// Inisialisasi Firebase (hanya sekali)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
var auth = firebase.auth();

// ── Tampilkan auth guard overlay saat halaman dimuat ──
(function injectGuard() {
  var guard = document.createElement('div');
  guard.id = 'auth-guard';
  guard.innerHTML = '<div class="spinner"></div><p>Memeriksa sesi login…</p>';
  document.body.appendChild(guard);
})();

// ════════════════════════════════════════════
//   AUTH STATE OBSERVER
//   - Belum login  → redirect ke login.html
//   - Sudah login  → tampilkan app, isi info user
// ════════════════════════════════════════════
auth.onAuthStateChanged(function(user) {
  var guard = document.getElementById('auth-guard');

  if (!user) {
    // Belum login → redirect
    window.location.href = 'login.html';
    return;
  }

  // Sudah login → hapus overlay
  if (guard) guard.remove();

  // ── Tampilkan info user di header ──
  var chip     = document.getElementById('user-chip');
  var nameEl   = document.getElementById('user-name');
  var avatarEl = document.getElementById('user-avatar');

  if (chip && nameEl && avatarEl) {
    var displayName = user.displayName || user.email;
    var initial     = displayName.charAt(0).toUpperCase();

    nameEl.textContent   = displayName;
    avatarEl.textContent = initial;
    chip.style.display   = 'flex';
  }
});

// ════════════════════════════════════════════
//   LOGOUT
// ════════════════════════════════════════════
function doLogout() {
  if (!confirm('Yakin ingin keluar dari LibraryHub?')) return;

  auth.signOut()
    .then(function() {
      window.location.href = 'login.html';
    })
    .catch(function(error) {
      alert('Gagal logout: ' + error.message);
    });
}
