// ════════════════════════════════════════════
//   LibraryHub — app.js
//   Firebase Realtime Database — CRUD
//   (firebase sudah diinit di auth.js)
// ════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {

  // ── Firebase refs ──
  var db       = firebase.database();
  var booksRef = db.ref('books');

  // ── Local state ──
  var allBooks = {};

  // ════════════════════════════════════════════
  //   BIND ALL BUTTON EVENTS
  // ════════════════════════════════════════════
  function bindById(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  // Tabs
  bindById('btn-tab-list', function () { switchTab('list'); });
  bindById('btn-tab-add',  function () { switchTab('add'); });

  // Add form
  bindById('btn-add-book',   addBook);
  bindById('btn-clear-form', clearAddForm);

  // Edit modal
  bindById('btn-save-edit',    saveEdit);
  bindById('btn-close-edit',   function () { closeModal('edit-modal'); });
  bindById('btn-cancel-edit',  function () { closeModal('edit-modal'); });

  // Detail modal
  bindById('btn-close-detail-1', function () { closeModal('detail-modal'); });
  bindById('btn-close-detail-2', function () { closeModal('detail-modal'); });

  // Delete modal
  bindById('btn-confirm-delete', confirmDelete);
  bindById('btn-cancel-delete',  function () { closeModal('delete-modal'); });

  // Logout (defined in auth.js, but bind here too for safety)
  bindById('btn-logout', doLogout);

  // Search & filter
  var searchInput = document.getElementById('search-input');
  var filterGenre  = document.getElementById('filter-genre');
  var filterStatus = document.getElementById('filter-status');
  if (searchInput) searchInput.addEventListener('input',  filterBooks);
  if (filterGenre)  filterGenre.addEventListener('change', filterBooks);
  if (filterStatus) filterStatus.addEventListener('change',filterBooks);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target === el) el.classList.remove('open');
    });
  });

  // ════════════════════════════════════════════
  //   REAL-TIME LISTENER (READ)
  // ════════════════════════════════════════════
  booksRef.on('value', function (snapshot) {
    allBooks = snapshot.val() || {};
    renderBooks(allBooks);
    updateStats(allBooks);
  }, function (error) {
    document.getElementById('books-container').innerHTML =
      '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>' +
      '<h3>Gagal terhubung ke Firebase</h3><p>' + error.message + '</p></div>';
    showToast('Gagal terhubung ke Firebase.', 'error');
  });

  // ════════════════════════════════════════════
  //   RENDER TABLE
  // ════════════════════════════════════════════
  function renderBooks(data) {
    var container = document.getElementById('books-container');
    var entries   = Object.entries(data);

    if (entries.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<i class="fas fa-book-open"></i>' +
        '<h3>Belum ada buku</h3>' +
        '<p>Klik "Tambah Buku" untuk menambahkan koleksi pertama Anda.</p>' +
        '</div>';
      return;
    }

    var rows = entries.map(function (pair) {
      var id = pair[0], b = pair[1];
      return '<tr>' +
        '<td><strong>' + escHtml(b.title) + '</strong></td>' +
        '<td>' + escHtml(b.author) + '</td>' +
        '<td><small style="color:var(--brown-mid)">' + escHtml(b.isbn || '—') + '</small></td>' +
        '<td>' + (b.year || '—') + '</td>' +
        '<td>' + escHtml(b.genre || '—') + '</td>' +
        '<td><span class="badge ' + statusClass(b.status) + '">' + escHtml(b.status || 'Tersedia') + '</span></td>' +
        '<td><div class="action-btns">' +
          '<button class="btn btn-ghost btn-sm" data-id="' + id + '" data-action="view" title="Detail"><i class="fas fa-eye"></i></button>' +
          '<button class="btn btn-amber btn-sm"  data-id="' + id + '" data-action="edit" title="Edit"><i class="fas fa-pen"></i></button>' +
          '<button class="btn btn-danger btn-sm" data-id="' + id + '" data-action="delete" title="Hapus"><i class="fas fa-trash"></i></button>' +
        '</div></td>' +
        '</tr>';
    }).join('');

    container.innerHTML =
      '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>Judul</th><th>Pengarang</th><th>ISBN</th><th>Tahun</th><th>Genre</th><th>Status</th><th>Aksi</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div>';

    // Bind action buttons via event delegation
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');
      if (action === 'view')   viewBook(id);
      if (action === 'edit')   editBook(id);
      if (action === 'delete') openDeleteModal(id);
    });
  }

  function statusClass(s) {
    if (s === 'Dipinjam') return 'badge-borrowed';
    if (s === 'Hilang')   return 'badge-lost';
    return 'badge-available';
  }

  function updateStats(data) {
    var books = Object.values(data);
    document.getElementById('stat-total').textContent     = books.length;
    document.getElementById('stat-available').textContent = books.filter(function (b) { return b.status === 'Tersedia'; }).length;
    document.getElementById('stat-borrowed').textContent  = books.filter(function (b) { return b.status === 'Dipinjam'; }).length;
  }

  // ════════════════════════════════════════════
  //   CREATE
  // ════════════════════════════════════════════
  function addBook() {
    var title  = val('add-title').trim();
    var author = val('add-author').trim();
    var isbn   = val('add-isbn').trim();
    var year   = val('add-year').trim();
    var genre  = val('add-genre');
    var status = val('add-status');
    var desc   = val('add-desc').trim();

    if (!title || !author || !isbn || !year || !genre) {
      showToast('Harap isi semua field yang wajib (*) !', 'error');
      return;
    }

    booksRef.push({
      title: title, author: author, isbn: isbn,
      year: parseInt(year), genre: genre, status: status, desc: desc,
      createdAt: new Date().toISOString()
    }).then(function () {
      clearAddForm();
      switchTab('list');
      showToast('✅ Buku "' + title + '" berhasil ditambahkan!', 'success');
    }).catch(function (e) {
      showToast('Gagal menyimpan: ' + e.message, 'error');
    });
  }

  function clearAddForm() {
    ['add-title','add-author','add-isbn','add-year','add-desc'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('add-genre').value  = '';
    document.getElementById('add-status').value = 'Tersedia';
  }

  // ════════════════════════════════════════════
  //   READ — Detail
  // ════════════════════════════════════════════
  function viewBook(id) {
    var b = allBooks[id]; if (!b) return;
    var tanggal = b.createdAt
      ? new Date(b.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
      : '—';

    document.getElementById('detail-content').innerHTML =
      '<div class="detail-item"><label>Judul</label><p>'        + escHtml(b.title)       + '</p></div>' +
      '<div class="detail-item"><label>Pengarang</label><p>'    + escHtml(b.author)      + '</p></div>' +
      '<div class="detail-item"><label>ISBN</label><p>'         + escHtml(b.isbn||'—')   + '</p></div>' +
      '<div class="detail-item"><label>Tahun Terbit</label><p>' + (b.year||'—')          + '</p></div>' +
      '<div class="detail-item"><label>Genre</label><p>'        + escHtml(b.genre||'—')  + '</p></div>' +
      '<div class="detail-item"><label>Status</label><p><span class="badge ' + statusClass(b.status) + '">' + escHtml(b.status) + '</span></p></div>' +
      '<div class="detail-item full"><label>Deskripsi</label><p>' + escHtml(b.desc||'(tidak ada deskripsi)') + '</p></div>' +
      '<div class="detail-item"><label>Ditambahkan</label><p>'  + tanggal + '</p></div>';

    openModal('detail-modal');
  }

  // ════════════════════════════════════════════
  //   UPDATE — Edit
  // ════════════════════════════════════════════
  function editBook(id) {
    var b = allBooks[id]; if (!b) return;
    document.getElementById('edit-id').value     = id;
    document.getElementById('edit-title').value  = b.title;
    document.getElementById('edit-author').value = b.author;
    document.getElementById('edit-isbn').value   = b.isbn   || '';
    document.getElementById('edit-year').value   = b.year   || '';
    document.getElementById('edit-genre').value  = b.genre  || 'Lainnya';
    document.getElementById('edit-status').value = b.status || 'Tersedia';
    document.getElementById('edit-desc').value   = b.desc   || '';
    openModal('edit-modal');
  }

  function saveEdit() {
    var id     = document.getElementById('edit-id').value;
    var title  = val('edit-title').trim();
    var author = val('edit-author').trim();
    if (!title || !author) { showToast('Judul dan pengarang wajib diisi!', 'error'); return; }

    db.ref('books/' + id).update({
      title: title, author: author,
      isbn:      val('edit-isbn').trim(),
      year:      parseInt(val('edit-year')) || null,
      genre:     val('edit-genre'),
      status:    val('edit-status'),
      desc:      val('edit-desc').trim(),
      updatedAt: new Date().toISOString()
    }).then(function () {
      closeModal('edit-modal');
      showToast('✏️ Buku "' + title + '" berhasil diperbarui!', 'success');
    }).catch(function (e) {
      showToast('Gagal memperbarui: ' + e.message, 'error');
    });
  }

  // ════════════════════════════════════════════
  //   DELETE
  // ════════════════════════════════════════════
  function openDeleteModal(id) {
    document.getElementById('delete-id').value = id;
    openModal('delete-modal');
  }

  function confirmDelete() {
    var id    = document.getElementById('delete-id').value;
    var title = allBooks[id] ? allBooks[id].title : 'Buku';
    db.ref('books/' + id).remove().then(function () {
      closeModal('delete-modal');
      showToast('🗑️ "' + title + '" berhasil dihapus.', 'info');
    }).catch(function (e) {
      showToast('Gagal menghapus: ' + e.message, 'error');
    });
  }

  // ════════════════════════════════════════════
  //   FILTER & SEARCH
  // ════════════════════════════════════════════
  function filterBooks() {
    var q      = (document.getElementById('search-input').value || '').toLowerCase();
    var genre  = document.getElementById('filter-genre').value;
    var status = document.getElementById('filter-status').value;
    var filtered = {};
    Object.entries(allBooks).forEach(function (pair) {
      var id = pair[0], b = pair[1];
      var mQ = !q || (b.title&&b.title.toLowerCase().includes(q)) || (b.author&&b.author.toLowerCase().includes(q)) || (b.isbn&&b.isbn.toLowerCase().includes(q));
      var mG = !genre  || b.genre  === genre;
      var mS = !status || b.status === status;
      if (mQ && mG && mS) filtered[id] = b;
    });
    renderBooks(filtered);
  }

  // ════════════════════════════════════════════
  //   TAB NAVIGATION
  // ════════════════════════════════════════════
  function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('tab-' + name).classList.add('active');
    var targetBtn = document.getElementById('btn-tab-' + name);
    if (targetBtn) targetBtn.classList.add('active');
  }

  // ════════════════════════════════════════════
  //   MODAL HELPERS
  // ════════════════════════════════════════════
  function openModal(id)  { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  // ════════════════════════════════════════════
  //   TOAST
  // ════════════════════════════════════════════
  function showToast(msg, type) {
    type = type || 'info';
    var icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
    var c = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<i class="fas ' + (icons[type]||icons.info) + '"></i> ' + msg;
    c.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  // ════════════════════════════════════════════
  //   UTILS
  // ════════════════════════════════════════════
  function val(id) { return document.getElementById(id).value; }
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

}); // end DOMContentLoaded
