// ─── Audio Engine ───
// [Prototype Music Generation — 使用 Web Audio API 合成音樂模板]
// 目前提供 5 種風格；未來替換成真正 AI 音樂生成 API 只需修改 start() 方法。
//
// Future API hook:
// async function generateMemoryMusic(memoryData) {
//   const res = await fetch('/api/ai-music/generate', { method:'POST', body: JSON.stringify(memoryData) });
//   return await res.json(); // { audioUrl, coverUrl }
// }

class AudioEngine {
  constructor() {
    this._ctx    = null;
    this._master = null;
    this._oscs   = [];
    this._timers = [];
    this.isRunning = false;
    this._style  = null;
  }

  get ctx() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { console.warn('[AudioEngine] Web Audio API 不支援此瀏覽器'); return null; }
      this._ctx = new AC();
    }
    return this._ctx;
  }

  // ── 統一入口 ──
  start(style = 'dreamy', volume = 0.7) {
    this.stop();
    this._style = style;
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    this.isRunning = true;

    switch (style) {
      case 'ocean':   return this._startOcean(ctx, volume);
      case 'rain':    return this._startRain(ctx, volume);
      case 'lofi':    return this._startLofi(ctx, volume);
      case 'piano':   return this._startPiano(ctx, volume);
      case 'dreamy2': return this._startDreamy2(ctx, volume);
      default:        return this._startDreamy(ctx, volume);
    }
  }

  // ── 微光：夢幻五聲音階 ──
  _startDreamy(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.38, 2.5);
    const chain  = this._makeReverbDelay(ctx);
    chain.out.connect(this._master);
    this._master.connect(ctx.destination);

    const scale   = [261.63, 329.63, 392.00, 440.00, 523.25];
    const pattern = [0, 2, 4, 3, 1, 4, 2, 0, 3, 4, 1, 2];
    this._melodyLoop(ctx, chain.in, pattern, scale, 1.9, 0.62, vol * 0.32);
  }

  // ── 記憶的碎片：Dreamy 變奏（降半音，更憂鬱） ──
  _startDreamy2(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.36, 3);
    const chain  = this._makeReverbDelay(ctx, 5, 3, 0.42);
    chain.out.connect(this._master);
    this._master.connect(ctx.destination);

    const scale   = [246.94, 311.13, 369.99, 415.30, 493.88];
    const pattern = [4, 2, 0, 3, 1, 4, 3, 2, 0, 1, 2, 4];
    this._melodyLoop(ctx, chain.in, pattern, scale, 2.2, 0.58, vol * 0.28);
  }

  // ── 夏日海邊：海浪氛圍 ──
  _startOcean(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.5, 3);
    this._master.connect(ctx.destination);

    // 白噪音濾波成海浪低頻
    const noise  = this._noiseSource(ctx, 3 * ctx.sampleRate);
    const bpf    = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 320;
    bpf.Q.value = 0.4;

    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.5;

    // LFO — 模擬浪來浪去（0.1 Hz）
    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(baseGain.gain);

    noise.connect(bpf);
    bpf.connect(baseGain);
    baseGain.connect(this._master);

    noise.start();
    lfo.start();
    this._oscs.push(noise, lfo);

    // 偶爾出現柔和泛音（海鷗感）
    this._scheduleChime(ctx, this._master, vol, [523.25, 659.25, 783.99], 4000, 8000);
  }

  // ── 雨夜：雨聲 + 水滴 ──
  _startRain(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.48, 2);
    this._master.connect(ctx.destination);

    // 高頻白噪音
    const noise = this._noiseSource(ctx, 2 * ctx.sampleRate);
    const hpf   = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 700;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 5000;

    noise.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(this._master);
    noise.start();
    this._oscs.push(noise);

    // 水滴聲
    this._scheduleDrops(ctx, this._master, vol);
  }

  // ── 月夜漫步：Lo-fi ──
  _startLofi(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.42, 1.5);

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 3200;

    // 輕微失真 (vinyl warmth)
    const ws  = ctx.createWaveShaper();
    ws.curve  = this._distortionCurve(8);
    ws.oversample = '2x';

    lpf.connect(ws);
    ws.connect(this._master);
    this._master.connect(ctx.destination);

    // C 小調五聲音階
    const scale   = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];
    const pattern = [0, null, 2, null, 4, null, 3, null, 1, null, 5, null, 2, null, 0, null];
    const BPM = 80;
    const beat = 60 / BPM;

    const loop = () => {
      if (!this.isRunning) return;
      const now = ctx.currentTime;
      pattern.forEach((ni, i) => {
        if (ni === null) return;
        const time = now + i * (beat / 2);
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = scale[ni] * 1.004;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(vol * 0.26, time + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, time + beat * 0.7);
        osc.connect(env); env.connect(lpf);
        osc.start(time); osc.stop(time + beat * 0.8);
        this._oscs.push(osc);
      });
      const dur = (pattern.length * (beat / 2) - 0.4) * 1000;
      this._timers.push(setTimeout(loop, dur));
    };
    loop();
  }

  // ── 晨光：鋼琴音色（泛音合成） ──
  _startPiano(ctx, vol) {
    this._master = this._createMaster(ctx, vol * 0.36, 2.5);
    const reverb = ctx.createConvolver();
    reverb.buffer = this._impulse(ctx, 2.5, 3.2);
    reverb.connect(this._master);
    this._master.connect(ctx.destination);

    const scale   = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
    const pattern = [0, 2, 4, 6, 5, 3, 1, 0, 4, 2, 6, 4, 5, 1, 3, 0];

    const playNote = (freq, time) => {
      if (!this.isRunning) return;
      [1, 2, 3].forEach((h, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const g   = vol * [0.38, 0.18, 0.08][i];
        osc.type = 'sine';
        osc.frequency.value = freq * h;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(g, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + 1.4 * (1.6 - i * 0.3));
        osc.connect(env); env.connect(reverb);
        osc.start(time); osc.stop(time + 3.5);
        this._oscs.push(osc);
      });
    };

    const gap = 1.4 * 0.55;
    const loop = () => {
      if (!this.isRunning) return;
      const now = ctx.currentTime;
      pattern.forEach((idx, i) => playNote(scale[idx], now + i * gap));
      const dur = (pattern.length * gap - 0.5) * 1000;
      this._timers.push(setTimeout(loop, dur));
    };
    loop();
  }

  // ── 泛用旋律迴圈 ──
  _melodyLoop(ctx, dest, pattern, scale, noteDur, gapRatio, vol) {
    const gap = noteDur * gapRatio;
    const loop = () => {
      if (!this.isRunning) return;
      const now = ctx.currentTime;
      pattern.forEach((idx, i) => {
        const freq = scale[idx];
        [freq, freq * 1.003, freq * 0.997].forEach(f => {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          const t   = now + i * gap;
          osc.type = 'sine';
          osc.frequency.value = f;
          env.gain.setValueAtTime(0, t);
          env.gain.linearRampToValueAtTime(vol, t + 0.07);
          env.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
          osc.connect(env); env.connect(dest);
          osc.start(t); osc.stop(t + noteDur + 0.15);
          this._oscs.push(osc);
        });
      });
      const dur = (pattern.length * gap - 0.6) * 1000;
      this._timers.push(setTimeout(loop, dur));
    };
    loop();
  }

  // ── 偶爾泛音 (ocean/夏日) ──
  _scheduleChime(ctx, dest, vol, freqs, minMs, maxMs) {
    if (!this.isRunning) return;
    const delay = minMs + Math.random() * (maxMs - minMs);
    this._timers.push(setTimeout(() => {
      if (!this.isRunning) return;
      const freq = freqs[Math.floor(Math.random() * freqs.length)];
      const osc  = ctx.createOscillator();
      const env  = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(vol * 0.08, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);
      osc.connect(env); env.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + 3);
      this._oscs.push(osc);
      this._scheduleChime(ctx, dest, vol, freqs, minMs, maxMs);
    }, delay));
  }

  // ── 水滴聲 (rain) ──
  _scheduleDrops(ctx, dest, vol) {
    if (!this.isRunning) return;
    const delay = 200 + Math.random() * 700;
    this._timers.push(setTimeout(() => {
      if (!this.isRunning) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 900 + Math.random() * 1400;
      env.gain.setValueAtTime(vol * 0.12, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.connect(env); env.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
      this._oscs.push(osc);
      this._scheduleDrops(ctx, dest, vol);
    }, delay));
  }

  // ── 工具 ──
  _createMaster(ctx, gain, fadeIn = 2) {
    const m = ctx.createGain();
    m.gain.setValueAtTime(0, ctx.currentTime);
    m.gain.linearRampToValueAtTime(gain, ctx.currentTime + fadeIn);
    return m;
  }

  _makeReverbDelay(ctx, reverbDur = 4, decay = 2.5, feedback = 0.35) {
    const reverb  = ctx.createConvolver();
    reverb.buffer = this._impulse(ctx, reverbDur, decay);
    const delay   = ctx.createDelay(1.5);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    delay.connect(fb); fb.connect(delay);
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1100; lpf.Q.value = 0.6;
    const sum = ctx.createGain(); // merge reverb + delay
    lpf.connect(reverb); lpf.connect(delay);
    reverb.connect(sum); delay.connect(sum);
    return { in: lpf, out: sum };
  }

  _noiseSource(ctx, len) {
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  _impulse(ctx, dur, decay) {
    const sr  = ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  _distortionCurve(amount) {
    const n = 256; const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // ── 控制 ──
  setVolume(vol) {
    if (this._master && this._ctx) {
      this._master.gain.setTargetAtTime(vol * 0.4, this._ctx.currentTime, 0.08);
    }
  }

  pause() { if (this._ctx?.state === 'running')   this._ctx.suspend(); }
  resume() { if (this._ctx?.state === 'suspended') this._ctx.resume(); }

  stop() {
    this.isRunning = false;
    this._timers.forEach(clearTimeout); this._timers = [];
    this._oscs.forEach(o => { try { o.stop(0); } catch (_) {} }); this._oscs = [];
    if (this._master) {
      try { this._master.gain.setValueAtTime(0, this._ctx.currentTime); this._master.disconnect(); }
      catch (_) {}
      this._master = null;
    }
    this._style = null;
  }
}

const audioEngine = new AudioEngine();
