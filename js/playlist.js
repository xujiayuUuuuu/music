// ─── Playlist Panel UI ───
// 依賴：storageService.js、playlistService.js、tracks.js、player.js

window.PlaylistPanel = (() => {

  // ── 狀態 ──
  let _open = false;
  let _currentTab = 'tracks';   // 'tracks' | 'playlists'
  let _viewingPlaylist = null;  // 播放清單 id（null = 列表頁）
  let _quickMenu = null;        // 快速加入下拉的目標 trackId

  // ── DOM refs ──
  const el = {};

  // ── Init ──
  function init() {
    _buildDOM();
    _bindEvents();
    _render();
  }

  // ── 建立面板 HTML ──
  function _buildDOM() {
    // 遮罩
    const overlay = document.createElement('div');
    overlay.className = 'pl-overlay';
    overlay.id = 'plOverlay';
    document.body.appendChild(overlay);

    // 面板
    const panel = document.createElement('div');
    panel.className = 'pl-panel';
    panel.id = 'plPanel';
    panel.innerHTML = `
      <div class="pl-header">
        <h2>音樂庫</h2>
        <button class="pl-close-btn" id="plCloseBtn" aria-label="關閉">✕</button>
      </div>
      <div class="pl-tabs">
        <button class="pl-tab active" data-tab="tracks">所有曲目</button>
        <button class="pl-tab" data-tab="playlists">播放清單</button>
      </div>
      <div class="pl-body" id="plBody">
        <div class="pl-pane active" id="plPaneTracks"></div>
        <div class="pl-pane" id="plPanePlaylists"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // 快速加入下拉
    const qm = document.createElement('div');
    qm.className = 'pl-quick-menu';
    qm.id = 'plQuickMenu';
    document.body.appendChild(qm);

    // 吐司
    const toast = document.createElement('div');
    toast.className = 'pl-toast';
    toast.id = 'plToast';
    document.body.appendChild(toast);

    // 快取 ref
    el.overlay    = overlay;
    el.panel      = panel;
    el.closeBtn   = document.getElementById('plCloseBtn');
    el.tabs       = panel.querySelectorAll('.pl-tab');
    el.body       = document.getElementById('plBody');
    el.paneTracks = document.getElementById('plPaneTracks');
    el.panePL     = document.getElementById('plPanePlaylists');
    el.quickMenu  = qm;
    el.toast      = toast;
  }

  // ── 綁定事件 ──
  function _bindEvents() {
    el.closeBtn.addEventListener('click', () => _setOpen(false));
    el.overlay.addEventListener('click', () => _setOpen(false));

    el.tabs.forEach(tab => {
      tab.addEventListener('click', () => _switchTab(tab.dataset.tab));
    });

    // 點外部關閉快速選單
    document.addEventListener('click', e => {
      if (!el.quickMenu.contains(e.target) && !e.target.closest('.pl-add-btn')) {
        _closeQuickMenu();
      }
    });
  }

  // ── 開/關面板 ──
  function _setOpen(val) {
    _open = val;
    el.panel.classList.toggle('active', val);
    el.overlay.classList.toggle('active', val);
  }

  // ── 切 Tab ──
  function _switchTab(tab) {
    _currentTab = tab;
    _viewingPlaylist = null;
    el.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    el.paneTracks.classList.toggle('active', tab === 'tracks');
    el.panePL.classList.toggle('active', tab === 'playlists');
    _render();
  }

  // ── 重新渲染 ──
  function _render() {
    if (_currentTab === 'tracks') {
      _renderTracks();
    } else {
      if (_viewingPlaylist !== null) _renderPlaylistDetail(_viewingPlaylist);
      else _renderPlaylistList();
    }
  }

  // ── 渲染曲目列表 ──
  function _renderTracks() {
    const currentId = window.Player ? Player.currentId() : null;
    const allPL = playlistService.getAll();
    el.paneTracks.innerHTML = '';
    tracks.forEach(t => {
      const div = document.createElement('div');
      div.className = 'pl-track-item' + (t.id === currentId ? ' playing' : '');
      div.innerHTML = `
        <img class="pl-track-cover" src="${t.image}" alt="${t.title}" loading="lazy">
        <div class="pl-track-info">
          <div class="pl-track-title">${t.title}</div>
          <div class="pl-track-meta">${t.author} · ${t.genre || ''}</div>
        </div>
        <span class="pl-track-badge">${t.audioType === 'generated' ? '合成' : '原創'}</span>
        <button class="pl-add-btn" data-track="${t.id}" title="加入播放清單">＋</button>
      `;
      // 點曲目 → 播放
      div.addEventListener('click', e => {
        if (e.target.closest('.pl-add-btn')) return;
        Player.playTrack(t.id);
        _renderTracks();
      });
      // 加入播放清單
      div.querySelector('.pl-add-btn').addEventListener('click', e => {
        e.stopPropagation();
        _openQuickMenu(t.id, e.currentTarget);
      });
      el.paneTracks.appendChild(div);
    });
  }

  // ── 渲染播放清單列表 ──
  function _renderPlaylistList() {
    el.panePL.innerHTML = '';

    // 建立列
    const createRow = document.createElement('div');
    createRow.className = 'pl-create-row';
    createRow.innerHTML = `
      <input class="pl-create-input" id="plNameInput" placeholder="新播放清單名稱…" maxlength="30">
      <button class="pl-create-confirm" id="plCreateBtn">建立</button>
    `;
    el.panePL.appendChild(createRow);

    document.getElementById('plCreateBtn').addEventListener('click', () => {
      const input = document.getElementById('plNameInput');
      const name = input.value.trim();
      if (!name) return;
      playlistService.create(name);
      input.value = '';
      _renderPlaylistList();
    });
    document.getElementById('plNameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('plCreateBtn').click();
    });

    const all = playlistService.getAll();
    if (!all.length) {
      el.panePL.insertAdjacentHTML('beforeend', `<div class="pl-empty">還沒有播放清單<br>建立一個開始收藏吧</div>`);
      return;
    }

    all.forEach(pl => {
      const div = document.createElement('div');
      div.className = 'pl-list-item';
      div.innerHTML = `
        <div class="pl-list-name">${_esc(pl.name)}</div>
        <div class="pl-list-count">${pl.trackIds.length} 首曲目</div>
        <div class="pl-list-actions">
          <button class="pl-list-action-btn pl-btn-play">▶ 全部播放</button>
          <button class="pl-list-action-btn pl-btn-view">查看</button>
          <button class="pl-list-action-btn danger pl-btn-del">刪除</button>
        </div>
      `;
      div.querySelector('.pl-btn-play').addEventListener('click', e => {
        e.stopPropagation();
        if (!pl.trackIds.length) { _toast('播放清單是空的'); return; }
        Player.setQueue(pl.trackIds);
        Player.playTrack(pl.trackIds[0]);
        _setOpen(false);
      });
      div.querySelector('.pl-btn-view').addEventListener('click', e => {
        e.stopPropagation();
        _viewingPlaylist = pl.id;
        _renderPlaylistDetail(pl.id);
      });
      div.querySelector('.pl-btn-del').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`確定刪除「${pl.name}」？`)) return;
        playlistService.delete(pl.id);
        _renderPlaylistList();
        _toast('已刪除');
      });
      el.panePL.appendChild(div);
    });
  }

  // ── 渲染播放清單詳細 ──
  function _renderPlaylistDetail(plId) {
    const pl = playlistService.getById(plId);
    if (!pl) { _viewingPlaylist = null; _renderPlaylistList(); return; }

    el.panePL.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'pl-detail-header';
    header.innerHTML = `
      <button class="pl-back-btn" id="plBackBtn">‹</button>
      <div class="pl-detail-name">${_esc(pl.name)}</div>
      <button class="pl-play-all-btn" id="plPlayAllBtn">▶ 全播</button>
    `;
    el.panePL.appendChild(header);

    document.getElementById('plBackBtn').addEventListener('click', () => {
      _viewingPlaylist = null;
      _renderPlaylistList();
    });
    document.getElementById('plPlayAllBtn').addEventListener('click', () => {
      if (!pl.trackIds.length) { _toast('播放清單是空的'); return; }
      Player.setQueue(pl.trackIds);
      Player.playTrack(pl.trackIds[0]);
      _setOpen(false);
    });

    if (!pl.trackIds.length) {
      el.panePL.insertAdjacentHTML('beforeend', `<div class="pl-empty">清單是空的<br>從「所有曲目」頁加入曲目</div>`);
      return;
    }

    pl.trackIds.forEach(tid => {
      const t = tracks.find(x => x.id === tid);
      if (!t) return;
      const div = document.createElement('div');
      div.className = 'pl-track-item';
      div.innerHTML = `
        <img class="pl-track-cover" src="${t.image}" alt="${t.title}" loading="lazy">
        <div class="pl-track-info">
          <div class="pl-track-title">${t.title}</div>
          <div class="pl-track-meta">${t.author}</div>
        </div>
        <button class="pl-add-btn pl-rm-btn" data-tid="${t.id}" title="移除">－</button>
      `;
      div.addEventListener('click', e => {
        if (e.target.closest('.pl-rm-btn')) return;
        Player.playTrack(t.id);
      });
      div.querySelector('.pl-rm-btn').addEventListener('click', e => {
        e.stopPropagation();
        playlistService.removeTrack(plId, t.id);
        _renderPlaylistDetail(plId);
        _toast('已移除');
      });
      el.panePL.appendChild(div);
    });
  }

  // ── 快速加入下拉 ──
  function _openQuickMenu(trackId, btnEl) {
    _quickMenu = trackId;
    const all = playlistService.getAll();
    el.quickMenu.innerHTML = '';

    if (all.length) {
      all.forEach(pl => {
        const already = pl.trackIds.includes(trackId);
        const item = document.createElement('div');
        item.className = 'pl-quick-menu-item' + (already ? ' added' : '');
        item.textContent = already ? `✓ ${pl.name}` : pl.name;
        if (!already) {
          item.addEventListener('click', () => {
            playlistService.addTrack(pl.id, trackId);
            _closeQuickMenu();
            _toast(`已加入「${pl.name}」`);
            if (_currentTab === 'tracks') _renderTracks();
          });
        }
        el.quickMenu.appendChild(item);
      });
      const hr = document.createElement('hr');
      hr.className = 'pl-quick-menu-divider';
      el.quickMenu.appendChild(hr);
    }

    const newItem = document.createElement('div');
    newItem.className = 'pl-quick-menu-item new';
    newItem.textContent = '＋ 建立新清單';
    newItem.addEventListener('click', () => {
      _closeQuickMenu();
      _switchTab('playlists');
      _setOpen(true);
      setTimeout(() => {
        const inp = document.getElementById('plNameInput');
        if (inp) inp.focus();
      }, 180);
    });
    el.quickMenu.appendChild(newItem);

    // 定位
    const rect = btnEl.getBoundingClientRect();
    el.quickMenu.style.top  = (rect.bottom + 6) + 'px';
    el.quickMenu.style.left = Math.max(8, rect.left - 140) + 'px';
    el.quickMenu.classList.add('active');
  }

  function _closeQuickMenu() {
    el.quickMenu.classList.remove('active');
    _quickMenu = null;
  }

  // ── 吐司 ──
  let _toastTimer = null;
  function _toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  // ── 工具 ──
  function _esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── 公開方法 ──
  function refreshTracks() { if (_currentTab === 'tracks') _renderTracks(); }
  function openPanel()     { _setOpen(true); }

  return { init, refreshTracks, openPanel };
})();

document.addEventListener('DOMContentLoaded', () => PlaylistPanel.init());
