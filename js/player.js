// ─── Global Music Player ───
// 依賴：tracks.js（tracks, trackIdFromSrc, trackIdFromTitle）
//       audioEngine.js（audioEngine）

window.Player = (() => {
  /* ── 狀態 ── */
  let current   = null;
  let idx       = -1;
  let playing   = false;
  let shuffle   = false;
  let loop      = false;
  let prevVol   = 0.8;
  let htmlAudio = null;
  let queue     = [];   // 播放清單 queue（trackId 陣列）

  /* ── DOM 取得 ── */
  const $  = id => document.getElementById(id);
  const el = {};

  function _initEl() {
    el.player      = $('globalPlayer');
    el.cover       = $('gpCover');
    el.title       = $('gpTitle');
    el.author      = $('gpAuthor');
    el.playPause   = $('gpPlayPause');
    el.prev        = $('gpPrev');
    el.next        = $('gpNext');
    el.shuffleBtn  = $('gpShuffle');
    el.loopBtn     = $('gpLoop');
    el.close       = $('gpClose');
    el.progress    = $('gpProgress');
    el.fill        = $('gpFill');
    el.curTime     = $('gpCurrentTime');
    el.duration    = $('gpDuration');
    el.volume      = $('gpVolume');
    el.muteBtn     = $('gpMute');
    el.miniArea    = $('gpMiniArea');
  }

  /* ── 工具 ── */
  function fmt(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  function _updatePlayBtn() {
    if (!el.playPause) return;
    el.playPause.innerHTML = playing
      ? '<span class="pause-icon"></span>'
      : '<span class="play-icon"></span>';
  }

  /* ── HTMLAudio 初始化（lazy） ── */
  function _initHtmlAudio() {
    if (htmlAudio) return;
    htmlAudio = new Audio();
    htmlAudio.volume = parseFloat(el.volume.value);

    htmlAudio.addEventListener('timeupdate', () => {
      if (!htmlAudio.duration) return;
      const pct = (htmlAudio.currentTime / htmlAudio.duration) * 100;
      el.progress.value = pct;
      el.fill.style.width = pct + '%';
      el.curTime.textContent = fmt(htmlAudio.currentTime);
    });

    htmlAudio.addEventListener('loadedmetadata', () => {
      el.duration.textContent = fmt(htmlAudio.duration);
    });

    htmlAudio.addEventListener('ended', () => {
      playing = false;
      _updatePlayBtn();
      if (loop) { htmlAudio.currentTime = 0; htmlAudio.play(); playing = true; _updatePlayBtn(); }
      else _playNext();
    });

    htmlAudio.addEventListener('error', () => {
      console.warn('[Player] 音訊載入失敗:', htmlAudio.src);
      el.duration.textContent = current ? current.duration : '—';
    });
  }

  /* ── Queue 管理 ── */
  function setQueue(trackIds) {
    queue = Array.isArray(trackIds) ? [...trackIds] : [];
  }

  function _queueNext() {
    if (!current || !queue.length) return null;
    const pos = queue.indexOf(current.id);
    if (pos === -1 || pos >= queue.length - 1) return null;
    return queue[pos + 1];
  }

  function _queuePrev() {
    if (!current || !queue.length) return null;
    const pos = queue.indexOf(current.id);
    if (pos <= 0) return null;
    return queue[pos - 1];
  }

  /* ── 播放軌道 ── */
  function playTrack(id) {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    // 停止前一首
    audioEngine.stop();
    if (htmlAudio) { htmlAudio.pause(); htmlAudio.src = ''; }
    playing = false;

    current = track;
    idx     = tracks.indexOf(track);

    // 更新介面
    el.cover.src            = track.image;
    el.title.textContent    = track.title;
    el.author.textContent   = track.author;
    el.curTime.textContent  = '0:00';
    el.progress.value       = 0;
    el.fill.style.width     = '0%';
    el.duration.textContent = track.audioType === 'generated' ? '∞' : track.duration;

    // 顯示播放器
    el.player.classList.add('active');
    document.body.classList.add('has-player');

    // 標記 active 卡片
    document.querySelectorAll('[data-play-id]').forEach(e => {
      e.classList.toggle('track-active', parseInt(e.dataset.playId) === id);
    });

    // 通知播放清單面板
    if (window.PlaylistPanel) PlaylistPanel.refreshTracks();

    // 播放
    if (track.audioType === 'generated') {
      audioEngine.start(track.generatedStyle || 'dreamy', parseFloat(el.volume.value));
      playing = true;
      _updatePlayBtn();
    } else {
      _initHtmlAudio();
      htmlAudio.src = track.audio;
      htmlAudio.play()
        .then(() => { playing = true; _updatePlayBtn(); })
        .catch(err => {
          console.warn('[Player] 播放失敗（可能需要使用者互動）:', err);
          _updatePlayBtn();
        });
    }

    track.plays = (track.plays || 0) + 1;
  }

  /* ── 控制項 ── */
  function togglePlay() {
    if (!current) return;
    if (current.audioType === 'generated') {
      if (playing) { audioEngine.pause(); playing = false; }
      else { audioEngine.resume(); playing = true; }
    } else if (htmlAudio) {
      if (!htmlAudio.paused) { htmlAudio.pause(); playing = false; }
      else { htmlAudio.play().then(() => { playing = true; _updatePlayBtn(); }); }
    }
    _updatePlayBtn();
  }

  function _playNext() {
    if (!tracks.length) return;
    // queue 優先
    const qn = _queueNext();
    if (qn) { playTrack(qn); return; }
    const next = shuffle
      ? tracks[Math.floor(Math.random() * tracks.length)]
      : tracks[(idx + 1) % tracks.length];
    playTrack(next.id);
  }

  function _playPrev() {
    // 已播放 3 秒以上 → 重新開始當前曲
    if (htmlAudio && htmlAudio.currentTime > 3) { htmlAudio.currentTime = 0; return; }
    // queue 優先
    const qp = _queuePrev();
    if (qp) { playTrack(qp); return; }
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    playTrack(prev.id);
  }

  function _close() {
    audioEngine.stop();
    if (htmlAudio) { htmlAudio.pause(); htmlAudio.src = ''; }
    playing = false; current = null;
    el.player.classList.remove('active', 'expanded');
    document.body.classList.remove('has-player');
    document.querySelectorAll('[data-play-id]').forEach(e => e.classList.remove('track-active'));
    queue = [];
  }

  /* ── 控制事件綁定 ── */
  function _bindControls() {
    el.playPause.addEventListener('click', togglePlay);
    el.prev.addEventListener('click', _playPrev);
    el.next.addEventListener('click', _playNext);
    el.close.addEventListener('click', _close);

    el.shuffleBtn.addEventListener('click', () => {
      shuffle = !shuffle;
      el.shuffleBtn.classList.toggle('gp-active', shuffle);
    });

    el.loopBtn.addEventListener('click', () => {
      loop = !loop;
      el.loopBtn.classList.toggle('gp-active', loop);
    });

    // 進度條拖曳
    el.progress.addEventListener('input', () => {
      if (htmlAudio && htmlAudio.duration) {
        htmlAudio.currentTime = (el.progress.value / 100) * htmlAudio.duration;
      }
      el.fill.style.width = el.progress.value + '%';
    });

    // 音量
    el.volume.addEventListener('input', () => {
      const v = parseFloat(el.volume.value);
      if (htmlAudio) htmlAudio.volume = v;
      audioEngine.setVolume(v);
      el.muteBtn.textContent = v === 0 ? '○' : v < 0.5 ? '◑' : '●';
      if (v > 0) prevVol = v;
    });

    el.muteBtn.addEventListener('click', () => {
      const v = parseFloat(el.volume.value);
      if (v > 0) {
        prevVol = v;
        el.volume.value = 0;
        if (htmlAudio) htmlAudio.volume = 0;
        audioEngine.setVolume(0);
        el.muteBtn.textContent = '○';
      } else {
        el.volume.value = prevVol;
        if (htmlAudio) htmlAudio.volume = prevVol;
        audioEngine.setVolume(prevVol);
        el.muteBtn.textContent = '●';
      }
    });

    // 手機：點擊 mini 區域展開完整播放器
    if (el.miniArea) {
      el.miniArea.addEventListener('click', e => {
        if (!e.target.closest('button') && window.innerWidth <= 768) {
          el.player.classList.toggle('expanded');
        }
      });
    }
  }

  /* ── 自動綁定頁面中所有可點擊圖片 ── */
  function _bindGallery() {
    document.querySelectorAll('.gallery-wrapper2 img').forEach(img => {
      const tid = trackIdFromSrc(img.src) ||
        trackIdFromTitle(img.parentElement?.querySelector?.('.music-text2 p')?.textContent);
      img.dataset.playId = tid;
      img.style.cursor   = 'pointer';
      img.addEventListener('click', e => { e.stopPropagation(); playTrack(tid); });
    });

    document.querySelectorAll('.music-text2').forEach(txtEl => {
      const p   = txtEl.querySelector('p');
      const tid = trackIdFromTitle(p ? p.textContent : '');
      txtEl.dataset.playId = tid;
      txtEl.style.cursor   = 'pointer';
      txtEl.addEventListener('click', e => { e.stopPropagation(); playTrack(tid); });
    });

    document.querySelectorAll('.gallery-wrapper img').forEach((img, i) => {
      const tid = trackIdFromSrc(img.src) || ((i % 3) + 1);
      img.dataset.playId = tid;
      img.style.cursor   = 'pointer';
      img.addEventListener('click', () => playTrack(tid));
    });

    const trackItems = document.querySelectorAll('.tracklist .track-item');
    trackItems.forEach((item, i) => {
      const tid = i + 1;
      item.dataset.playId = tid;
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => playTrack(tid));
    });

    const mainCover = document.querySelector('.cover img');
    if (mainCover) {
      mainCover.dataset.playId = 1;
      mainCover.style.cursor   = 'pointer';
      mainCover.addEventListener('click', () => playTrack(1));
    }
  }

  /* ── album card（已有 data-play-id） ── */
  function _bindAlbumCards() {
    document.querySelectorAll('.album-card[data-play-id]').forEach(card => {
      card.addEventListener('click', () => {
        const tid = parseInt(card.dataset.playId);
        if (tid) playTrack(tid);
      });
    });
  }

  /* ── 迷你播放條同步 ── */
  function _initMiniPlayer() {
    const miniBtn   = document.getElementById('miniPlayBtn');
    const miniFill  = document.getElementById('miniProgressFill');
    const miniCur   = document.getElementById('miniCurTime');
    const miniDur   = document.getElementById('miniDur');
    const miniTrack = document.getElementById('miniProgressTrack');
    if (!miniBtn) return;

    miniBtn.addEventListener('click', () => {
      if (current) { togglePlay(); }
      else { playTrack(1); }
    });

    if (miniTrack) {
      miniTrack.addEventListener('click', e => {
        if (!htmlAudio || !htmlAudio.duration) return;
        const rect = miniTrack.getBoundingClientRect();
        const pct  = (e.clientX - rect.left) / rect.width;
        htmlAudio.currentTime = pct * htmlAudio.duration;
      });
    }

    setInterval(() => {
      const gpFill = document.getElementById('gpFill');
      const gpCur  = document.getElementById('gpCurrentTime');
      const gpDur  = document.getElementById('gpDuration');
      const gpBtn  = document.getElementById('gpPlayPause');

      if (miniFill && gpFill) miniFill.style.width = gpFill.style.width || '0%';
      if (miniCur  && gpCur)  miniCur.textContent  = gpCur.textContent;
      if (miniDur  && gpDur)  miniDur.textContent  = gpDur.textContent;
      if (miniBtn && gpBtn) {
        miniBtn.innerHTML = gpBtn.innerHTML.includes('pause-icon')
          ? '<span class="pause-icon"></span>'
          : '<span class="play-icon"></span>';
      }
    }, 250);
  }

  /* ── 初始化 ── */
  function init() {
    _initEl();
    _bindControls();
    _bindGallery();
    _bindAlbumCards();
    _initMiniPlayer();
  }

  // 供外部查詢當前曲目 id
  function currentId() { return current ? current.id : null; }

  return { init, playTrack, togglePlay, setQueue, currentId };
})();

document.addEventListener('DOMContentLoaded', () => Player.init());
