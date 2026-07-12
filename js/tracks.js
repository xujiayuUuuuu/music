// ─── Tracks Data ───
// audioType: "file"      → 真實音訊檔案
// audioType: "generated" → Web Audio API 合成（Prototype Music Generation）
// 欄位 audio / image 之後可直接替換成後端 API 回傳的 URL

const tracks = [
  {
    id: 1,
    title: "羈絆",
    author: "xujiayu",
    image: "img/photo2.png",
    description: "陪伴、友情與親情交織而成的聲音記憶。",
    audio: "img/羈絆1.mp3",
    audioType: "file",
    duration: "46:00",
    mood: "溫暖",
    genre: "Acoustic",
    likes: 48,
    plays: 203,
    createdAt: "2025-01-15",
    link: "music2.html"
  },
  {
    id: 2,
    title: "獨",
    author: "xujiayu",
    image: "img/photo3.png",
    description: "獨自一人時，最清楚聽見的內在聲音。",
    audio: "play-button/獨 - 2025_3_15 上午1.08.m4a",
    audioType: "file",
    duration: "50:00",
    mood: "孤獨",
    genre: "Ambient",
    likes: 36,
    plays: 178,
    createdAt: "2025-03-15",
    link: "music03.html"
  },
  {
    id: 3,
    title: "微光",
    author: "xujiayu",
    image: "img/photo4.png",
    description: "在黑暗中仍然存在的那一點聲音。",
    audio: null,
    audioType: "generated",
    generatedStyle: "dreamy",
    duration: "∞",
    mood: "希望",
    genre: "Dreamy",
    likes: 55,
    plays: 312,
    createdAt: "2025-04-01",
    link: "music4.html"
  },
  // ── 以下為 Prototype Demo 曲目（Web Audio API 合成）──
  {
    id: 4,
    title: "夏日海邊",
    author: "記憶碎片",
    image: "img/1.png",
    description: "海浪聲、陽光與沙灘，某個午後的片段。",
    audio: null,
    audioType: "generated",
    generatedStyle: "ocean",
    duration: "∞",
    mood: "平靜",
    genre: "Ocean",
    likes: 29,
    plays: 145,
    createdAt: "2025-05-10",
    link: null
  },
  {
    id: 5,
    title: "雨夜",
    author: "記憶碎片",
    image: "img/9.png",
    description: "窗外的雨聲，讓人想起那些沉默的夜晚。",
    audio: null,
    audioType: "generated",
    generatedStyle: "rain",
    duration: "∞",
    mood: "悲傷",
    genre: "Rain",
    likes: 41,
    plays: 209,
    createdAt: "2025-05-18",
    link: null
  },
  {
    id: 6,
    title: "晨光",
    author: "記憶碎片",
    image: "img/8.png",
    description: "清晨第一道光線，柔和而充滿期待。",
    audio: null,
    audioType: "generated",
    generatedStyle: "piano",
    duration: "∞",
    mood: "希望",
    genre: "Piano",
    likes: 63,
    plays: 387,
    createdAt: "2025-06-01",
    link: null
  },
  {
    id: 7,
    title: "月夜漫步",
    author: "記憶碎片",
    image: "img/c.png",
    description: "深夜獨自走在街上，腳步聲與城市的呼吸。",
    audio: null,
    audioType: "generated",
    generatedStyle: "lofi",
    duration: "∞",
    mood: "懷念",
    genre: "Lo-fi",
    likes: 77,
    plays: 431,
    createdAt: "2025-06-15",
    link: null
  },
  {
    id: 8,
    title: "記憶的碎片",
    author: "記憶碎片",
    image: "img/a.png",
    description: "所有我曾記得的，都藏在這段聲音裡。",
    audio: null,
    audioType: "generated",
    generatedStyle: "dreamy2",
    duration: "∞",
    mood: "懷念",
    genre: "Dreamy",
    likes: 52,
    plays: 298,
    createdAt: "2025-06-28",
    link: null
  }
];

// 圖片檔名 → track id 對應表
const _imgTrackMap = {
  "photo2.png": 1, "3.png": 1,
  "未命名-1-02.png": 1, "未命名-1-06.png": 1, "未命名-1-08.png": 1,
  "photo3.png": 2, "4.png": 2, "5.png": 2, "5j.png": 2,
  "6.png": 2, "78.png": 2, "photo01.png": 2,
  "未命名-1-03.png": 2, "未命名-1-09.png": 2,
  "photo4.png": 3, "2.png": 3, "fe.png": 3,
  "s-21.png": 3, "s.png": 3,
  "未命名-1-05.png": 3, "未命名-1-13.png": 3, "未命名-1-15.png": 3,
  "1.png": 4,
  "9.png": 5,
  "8.png": 6,
  "c.png": 7,
  "a.png": 8
};

function trackIdFromSrc(src) {
  const name = src.split('/').pop();
  return _imgTrackMap[name] || 1;
}

function trackIdFromTitle(text) {
  if (!text) return 1;
  if (text.includes('獨'))    return 2;
  if (text.includes('微光'))  return 3;
  if (text.includes('夏日'))  return 4;
  if (text.includes('雨夜'))  return 5;
  if (text.includes('晨光'))  return 6;
  if (text.includes('月夜'))  return 7;
  if (text.includes('記憶'))  return 8;
  return 1;
}
