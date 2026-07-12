// ─── Storage Service ───
// localStorage 封裝，方便之後替換成真正的後端 API

window.storageService = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
      console.warn('[storageService] 寫入失敗:', e);
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }
};
