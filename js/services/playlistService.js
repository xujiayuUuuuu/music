// ─── Playlist Service ───
// 播放清單資料層；目前使用 localStorage，未來可替換成後端 API
// 依賴：storageService.js

window.playlistService = {
  KEY: 'msnd_playlists',

  getAll() {
    return storageService.get(this.KEY, []);
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  create(name) {
    const playlists = this.getAll();
    const pl = {
      id: Date.now(),
      name: name.trim(),
      trackIds: [],
      createdAt: new Date().toISOString()
    };
    playlists.push(pl);
    storageService.set(this.KEY, playlists);
    return pl;
  },

  rename(id, name) {
    const all = this.getAll();
    const pl = all.find(p => p.id === id);
    if (pl) { pl.name = name.trim(); storageService.set(this.KEY, all); }
    return pl;
  },

  delete(id) {
    storageService.set(this.KEY, this.getAll().filter(p => p.id !== id));
  },

  addTrack(playlistId, trackId) {
    const all = this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (pl && !pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      storageService.set(this.KEY, all);
    }
    return pl;
  },

  removeTrack(playlistId, trackId) {
    const all = this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (pl) {
      pl.trackIds = pl.trackIds.filter(id => id !== trackId);
      storageService.set(this.KEY, all);
    }
    return pl;
  }
};
