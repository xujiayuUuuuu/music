// ─── Generate Music Feature ───
// 流程：上傳照片/影片 → 填寫描述 → 選擇心情與風格 → 生成合成音樂
// 依賴：audioEngine.js、player.js、tracks.js、storageService.js

window.GenerateMusic = (() => {

  // ── 心情 → 推薦風格映射 ──
  const MOOD_STYLE_MAP = {
    '開心': 'ocean',
    '悲傷': 'rain',
    '懷念': 'dreamy2',
    '平靜': 'lofi',
    '希望': 'piano',
    '孤獨': 'dreamy',
  };

  // ── 風格清單 ──
  const STYLES = [
    { key: 'dreamy', icon: '', name: '夢幻' },
    { key: 'ocean',  icon: '', name: '海洋' },
    { key: 'rain',   icon: '', name: '雨聲' },
    { key: 'lofi',   icon: '', name: 'Lo-fi' },
    { key: 'piano',  icon: '', name: '鋼琴' },
    { key: 'dreamy2',icon: '', name: '月夜' },
  ];

  // ── 生成步驟文案 ──
  const STEPS = [
    '正在分析您上傳的內容…',
    '識別畫面中的情緒與氛圍…',
    '選取最匹配的音樂元素…',
    '生成旋律結構…',
    '加入和聲與氛圍層次…',
    '音樂生成完成',
  ];

  // ── 狀態 ──
  let _file        = null;   // 上傳的 File 物件
  let _fileURL     = null;   // ObjectURL
  let _selectedMoods  = [];
  let _selectedStyle  = null;
  let _generatedTrack = null;
  let _genId = 1000;         // 動態產生的 track id 起點

  // ── DOM ──
  const el = {};

  // ── Init ──
  function init() {
    const section = document.getElementById('generateSection');
    if (!section) return;

    el.uploadZone     = document.getElementById('genUploadZone');
    el.fileInput      = document.getElementById('genFileInput');
    el.preview        = document.getElementById('genPreview');
    el.previewVideo   = document.getElementById('genPreviewVideo');
    el.description    = document.getElementById('genDescription');
    el.moodGroup      = document.getElementById('genMoodGroup');
    el.styleGroup     = document.getElementById('genStyleGroup');
    el.submitBtn      = document.getElementById('genSubmitBtn');
    el.progressArea   = document.getElementById('genProgressArea');
    el.progressBar    = document.getElementById('genProgressBar');
    el.progressText   = document.getElementById('genProgressText');
    el.result         = document.getElementById('genResult');
    el.resultCover    = document.getElementById('genResultCover');
    el.resultTitle    = document.getElementById('genResultTitle');
    el.resultMeta     = document.getElementById('genResultMeta');
    el.playBtn        = document.getElementById('genPlayBtn');
    el.addPlaylistBtn = document.getElementById('genAddPlaylistBtn');
    el.retryRow       = document.getElementById('genRetryRow');
    el.retryBtn       = document.getElementById('genRetryBtn');

    _renderMoods();
    _renderStyles();
    _bindEvents();
  }

  function _renderMoods() {
    const moods = Object.keys(MOOD_STYLE_MAP);
    el.moodGroup.innerHTML = moods.map(m =>
      `<span class="gen-mood-tag" data-mood="${m}">${m}</span>`
    ).join('');
    el.moodGroup.querySelectorAll('.gen-mood-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        _selectedMoods = [...el.moodGroup.querySelectorAll('.gen-mood-tag.selected')]
          .map(t => t.dataset.mood);
        // 心情選擇後自動推薦風格（取第一個選中的）
        if (_selectedMoods.length && !_selectedStyle) {
          const suggested = MOOD_STYLE_MAP[_selectedMoods[0]];
          _selectStyle(suggested);
        }
      });
    });
  }

  function _renderStyles() {
    el.styleGroup.innerHTML = STYLES.map(s =>
      `<div class="gen-style-card" data-style="${s.key}">
        <span class="gen-style-icon">${s.icon}</span>
        <span class="gen-style-name">${s.name}</span>
      </div>`
    ).join('');
    el.styleGroup.querySelectorAll('.gen-style-card').forEach(card => {
      card.addEventListener('click', () => _selectStyle(card.dataset.style));
    });
  }

  function _selectStyle(key) {
    _selectedStyle = key;
    el.styleGroup.querySelectorAll('.gen-style-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.style === key);
    });
  }

  function _bindEvents() {
    // 上傳 — 點擊
    el.fileInput.addEventListener('change', e => {
      if (e.target.files[0]) _handleFile(e.target.files[0]);
    });

    // 上傳 — 拖曳
    el.uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      el.uploadZone.classList.add('dragover');
    });
    el.uploadZone.addEventListener('dragleave', () => {
      el.uploadZone.classList.remove('dragover');
    });
    el.uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      el.uploadZone.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f && (f.type.startsWith('image/') || f.type.startsWith('video/')))
        _handleFile(f);
    });

    // 生成
    el.submitBtn.addEventListener('click', _startGenerate);

    // 播放結果
    el.playBtn.addEventListener('click', () => {
      if (_generatedTrack) Player.playTrack(_generatedTrack.id);
    });

    // 加入播放清單
    el.addPlaylistBtn.addEventListener('click', () => {
      if (window.PlaylistPanel) PlaylistPanel.openPanel();
    });

    // 重新生成
    el.retryBtn.addEventListener('click', _reset);
  }

  function _handleFile(file) {
    _file = file;
    if (_fileURL) URL.revokeObjectURL(_fileURL);
    _fileURL = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
      el.preview.src = _fileURL;
      el.preview.style.display = 'block';
      el.previewVideo.style.display = 'none';
    } else {
      el.previewVideo.src = _fileURL;
      el.previewVideo.style.display = 'block';
      el.preview.style.display = 'none';
    }
    el.uploadZone.classList.add('has-file');
  }

  // ── 生成流程 ──
  function _startGenerate() {
    if (!_file) { _shakeZone(); return; }
    const desc  = el.description.value.trim();
    const style = _selectedStyle || _autoDetectStyle(desc);

    el.submitBtn.disabled = true;
    el.result.classList.remove('active');
    el.retryRow.classList.remove('active');
    el.progressArea.classList.add('active');
    el.progressBar.style.width = '0%';

    _animateProgress(style, desc);
  }

  function _autoDetectStyle(desc) {
    // 根據描述文字關鍵字推斷風格
    if (/海|浪|沙灘|海邊|夏/.test(desc)) return 'ocean';
    if (/雨|濕|夜|淚/.test(desc)) return 'rain';
    if (/懷念|記憶|想念|過去/.test(desc)) return 'dreamy2';
    if (/平靜|慢|放鬆|安靜/.test(desc)) return 'lofi';
    if (/希望|早晨|光|清新/.test(desc)) return 'piano';
    if (_selectedMoods.length) return MOOD_STYLE_MAP[_selectedMoods[0]] || 'dreamy';
    return 'dreamy';
  }

  function _animateProgress(style, desc) {
    let step = 0;
    const totalMs = 2800;
    const stepMs  = totalMs / STEPS.length;

    const interval = setInterval(() => {
      const pct = Math.min(((step + 1) / STEPS.length) * 100, 100);
      el.progressBar.style.width = pct + '%';
      el.progressText.textContent = STEPS[step] || STEPS[STEPS.length - 1];
      step++;
      if (step >= STEPS.length) {
        clearInterval(interval);
        setTimeout(() => _finishGenerate(style, desc), 400);
      }
    }, stepMs);
  }

  function _finishGenerate(style, desc) {
    // 建立動態 track 物件
    const styleInfo = STYLES.find(s => s.key === style) || STYLES[0];
    const moodLabel = _selectedMoods.length ? _selectedMoods.join('·') : '未分類';
    const titleSuffix = _selectedMoods[0] || styleInfo.name;
    const coverSrc = _fileURL || 'img/photo01.png';

    _genId++;
    _generatedTrack = {
      id:           _genId,
      title:        `${titleSuffix}的記憶`,
      author:       'AI 生成',
      image:        coverSrc,
      description:  desc || `${moodLabel} 氛圍生成音樂`,
      audio:        null,
      audioType:    'generated',
      generatedStyle: style,
      duration:     '∞',
      mood:         moodLabel,
      genre:        styleInfo.name,
      likes:        0,
      plays:        0,
      createdAt:    new Date().toISOString().slice(0, 10),
      link:         null,
      _isUserGenerated: true,
    };

    // 注入到 tracks 陣列（讓播放器可找到）
    tracks.push(_generatedTrack);

    // 儲存到 localStorage（key: msnd_user_tracks）
    _saveUserTrack(_generatedTrack);

    // 隱藏進度，顯示結果
    el.progressArea.classList.remove('active');

    el.resultCover.src           = coverSrc;
    el.resultTitle.textContent   = _generatedTrack.title;
    el.resultMeta.textContent    = `${styleInfo.icon} ${styleInfo.name} · ${moodLabel}`;
    el.result.classList.add('active');
    el.retryRow.classList.add('active');
    el.submitBtn.disabled = false;

    // 自動播放
    if (window.Player) Player.playTrack(_generatedTrack.id);
  }

  function _saveUserTrack(track) {
    if (!window.storageService) return;
    const saved = storageService.get('msnd_user_tracks', []);
    // 只保留有限筆（不記錄 ObjectURL，重整後失效）
    const minimal = {
      id:    track.id,
      title: track.title,
      mood:  track.mood,
      genre: track.genre,
      createdAt: track.createdAt,
      generatedStyle: track.generatedStyle,
    };
    saved.unshift(minimal);
    storageService.set('msnd_user_tracks', saved.slice(0, 50));
  }

  function _reset() {
    el.result.classList.remove('active');
    el.retryRow.classList.remove('active');
    el.progressArea.classList.remove('active');
    // 清除預覽
    el.uploadZone.classList.remove('has-file');
    el.preview.src = '';
    el.previewVideo.src = '';
    el.fileInput.value = '';
    el.description.value = '';
    el.moodGroup.querySelectorAll('.gen-mood-tag').forEach(t => t.classList.remove('selected'));
    el.styleGroup.querySelectorAll('.gen-style-card').forEach(c => c.classList.remove('selected'));
    _file = null; _fileURL = null;
    _selectedMoods = []; _selectedStyle = null;
    _generatedTrack = null;
    el.submitBtn.disabled = false;
  }

  function _shakeZone() {
    el.uploadZone.style.borderColor = 'rgba(255,160,120,0.8)';
    el.uploadZone.style.animation = 'none';
    setTimeout(() => {
      el.uploadZone.style.borderColor = '';
    }, 600);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => GenerateMusic.init());
