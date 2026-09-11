/* =========================================================
 * player.js — 全局音频播放器（Web Audio API）
 * 架构：
 *   · 两组 <audio> 通道：WA 组接入 Web Audio 图（GainNode 淡入淡出 +
 *     AnalyserNode 电平可视化），PLAIN 组直接输出（用于未声明 CORS 的外链，
 *     避免 MediaElementSource 静音问题），每组两个元素实现交叉淡入接续播放。
 *   · 队列 / 循环 / 倍速 / 音量 / 静音 / 上一首下一首 / 后台播放（Media Session）
 *   · 加载与播放失败均有用户提示，自动跳过坏链。
 * 命名空间：window.Player
 * ========================================================= */
(function () {
  'use strict';

  const FADE_MS = 600;        // 手动播放/暂停淡入淡出时长
  const XFADE_S = 2.2;        // 曲尾交叉淡出提前量
  const RATES = [0.75, 1.0, 1.25, 1.5, 2.0];

  const P = {
    queue: [], index: -1,
    curTrack: null,
    playing: false,
    loopMode: 'off',          // off | all | one
    rate: 1.0,
    volume: U.store.get('volume', 0.8),
    muted: false,
    listeners: {}
  };

  /* ---------- 通道构建 ---------- */
  function makePair(routed) {
    const els = [new Audio(), new Audio()];
    els.forEach(el => {
      el.preload = 'none';
      el.volume = routed ? 1 : P.volume;
    });
    const ch = { routed, els, cur: 0, gains: [], fadeTimers: [] };
    if (routed && 'AudioContext' in window) {
      try {
        const ctx = P.ctx || (P.ctx = new (window.AudioContext || window.webkitAudioContext)());
        ch.gains = els.map(el => {
          const src = ctx.createMediaElementSource(el);
          const g = ctx.createGain();
          g.gain.value = 0;
          src.connect(g); g.connect(ctx.destination);
          return g;
        });
        ch.analyser = ctx.createAnalyser();
        ch.analyser.fftSize = 64;
        // 主输出仍走 destination，可视化从分析器取电平
        ch.gains.forEach(g => { const tap = ctx.createGain(); tap.gain.value = 1; g.connect(tap); tap.connect(ch.analyser); });
        ch.ctx = ctx;
      } catch (e) {
        console.warn('Web Audio 初始化失败，回退为直接播放', e);
        ch.routed = false;
        els.forEach(el => { el.volume = P.volume; });
      }
    } else {
      ch.routed = false;
    }
    return ch;
  }

  const chWA = makePair(true);    // CORS 明确的外链
  const chPlain = makePair(false);
  P.chWA = chWA; P.chPlain = chPlain;

  function channelFor(track) {
    // 外链未显式声明支持 CORS 时，走直接播放，避免 Web Audio 跨域静音
    return (track && track.audio && track.audio.cors === false) ? chPlain : chWA;
  }

  /* ---------- 事件 ---------- */
  P.on = function (ev, fn) { (P.listeners[ev] = P.listeners[ev] || []).push(fn); };
  P.emit = function (ev, data) {
    (P.listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
  };

  /* ---------- 淡入淡出 ---------- */
  function fadeTo(ch, slot, target, ms, done) {
    const el = ch.els[slot];
    ch.fadeTimers[slot] && cancelAnimationFrame(ch.fadeTimers[slot]);
    if (ch.routed && ch.gains[slot]) {
      const g = ch.gains[slot].gain;
      const t0 = performance.now(), from = g.value;
      g.cancelScheduledValues(ch.ctx.currentTime);
      g.setValueAtTime(from, ch.ctx.currentTime);
      g.linearRampToValueAtTime(target, ch.ctx.currentTime + ms / 1000);
      const tick = now => {
        if (Math.abs(g.value - target) < 0.01 || now - t0 > ms + 50) { done && done(); return; }
        ch.fadeTimers[slot] = requestAnimationFrame(tick);
      };
      ch.fadeTimers[slot] = requestAnimationFrame(tick);
    } else {
      const from = el.volume, t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / ms);
        el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
        if (k < 1) ch.fadeTimers[slot] = requestAnimationFrame(tick);
        else done && done();
      };
      ch.fadeTimers[slot] = requestAnimationFrame(tick);
    }
  }
  function masterVol() { return P.muted ? 0 : P.volume; }
  function applyPlainVol() {
    chPlain.els.forEach(el => { if (!el.paused) { /* 淡入淡出中有自己的 ramp，跳过 */ } else el.volume = masterVol(); });
  }

  /* ---------- 加载与播放 ---------- */
  function setSrc(track, el) {
    const url = track.audio && track.audio.url;
    if (!url) throw new Error('该条目没有音频链接');
    el.crossOrigin = (channelFor(track) === chWA) ? 'anonymous' : null;
    if (el.getAttribute('src') !== url) el.src = url;
    el.playbackRate = P.rate;
    el.volume = channelFor(track) === chPlain ? masterVol() : 1;
  }

  /* 播放队列中的第 i 首 */
  P.playAt = function (i, queue) {
    if (queue) { P.queue = queue.slice(); }
    if (!P.queue.length) return;
    if (i < 0) i = 0;
    if (i >= P.queue.length) i = P.queue.length - 1;
    P.index = i;
    const track = P.queue[i];
    _start(track, true).catch(err => _handleError(track, err));
  };

  P.playTrack = function (track, queue) {
    const q = queue || [track];
    const i = q.findIndex(t => t.id === track.id);
    P.playAt(i < 0 ? 0 : i, q);
  };

  function _start(track, withCount) {
    P.stopAll();
    const ch = channelFor(track);
    const slot = ch.cur;
    const el = ch.els[slot];
    setSrc(track, el);
    P.curTrack = track;
    P.ch = ch; P.slot = slot;

    el.onloadedmetadata = () => {
      DB.durations.set(track.id, el.duration);
      P.emit('progress', P.state());
    };
    el.onerror = () => _handleError(track, new Error('音频加载失败'));
    el.onended = () => _onEnded(false);
    el.ontimeupdate = () => P.emit('progress', P.state());

    const p = el.play();
    const pr = p && p.then ? p : Promise.resolve();
    return pr.then(() => {
      P.playing = true;
      // 淡入
      if (ch.routed && ch.gains[slot]) fadeTo(ch, slot, masterVol(), FADE_MS);
      else el.volume = 0, fadeTo(ch, slot, masterVol(), FADE_MS);
      if (withCount) { DB.playCounts.inc(track.id); DB.history.add(track.id); }
      P._prepareNext();
      _mediaSession(track);
      P.emit('change', P.state());
      P.emit('play', P.state());
      resumeCtx();
    }, err => {
      // play() 被拒绝（自动播放策略等）
      P.emit('error', { track, err });
      U.toast('播放失败：浏览器拒绝了播放请求，请再点击一次播放按钮', 'error');
    });
  };

  function resumeCtx() {
    if (P.ctx && P.ctx.state === 'suspended') P.ctx.resume().catch(() => {});
  }

  /* 预备下一曲（空闲通道预载元数据，实现无缝接续） */
  P._prepareNext = function () {
    const nxt = _peekNext();
    const ch = channelFor(P.curTrack);
    if (!nxt || !nxt.audio) return;
    const idle = 1 - ch.cur;
    const el = ch.els[idle];
    try {
      el.crossOrigin = (channelFor(nxt) === chWA) ? 'anonymous' : null;
      if (el.getAttribute('src') !== nxt.audio.url) {
        el.src = nxt.audio.url;
        el.preload = 'metadata';
        el.playbackRate = P.rate;
      }
    } catch (e) { /* ignore */ }
  };

  function _peekNext() {
    if (!P.queue.length) return null;
    if (P.loopMode === 'one') return P.curTrack;
    let ni = P.index + 1;
    if (ni >= P.queue.length) {
      if (P.loopMode === 'all') ni = 0; else return null;
    }
    return P.queue[ni];
  }

  /* 曲终 / 切换 */
  function _onEnded(auto) {
    if (P.loopMode === 'one' && auto) {
      P.playAt(P.index);
      return;
    }
    let ni = P.index + 1;
    if (ni >= P.queue.length) {
      if (P.loopMode === 'all') ni = 0;
      else { P.playing = false; P.emit('stop'); P.emit('change', P.state()); return; }
    }
    P.playAt(ni);
  }

  /* 交叉淡出：接近曲尾时先起下一曲再淡出当前（仅自动接续时） */
  P.tick = function () {
    const st = P.state();
    if (!st.playing || !st.dur) return;
    const remain = st.dur - st.cur;
    if (remain > 0 && remain <= XFADE_S && P.loopMode !== 'one') {
      const nxt = _peekNext();
      if (nxt && nxt.id !== P.curTrack.id && !P._xfading) {
        P._xfading = true;
        const ch = channelFor(P.curTrack);
        const oldSlot = ch.cur;
        // 启动下一曲到空闲通道
        ch.cur = 1 - oldSlot;
        const track = nxt;
        P.index = P.queue.findIndex(t => t.id === track.id);
        if (P.index < 0) P.index = 0;
        P.curTrack = track;
        const el = ch.els[ch.cur];
        try { setSrc(track, el); } catch (e) { P._xfading = false; return; }
        el.onended = () => _onEnded(true);
        el.ontimeupdate = () => P.emit('progress', P.state());
        el.onerror = () => _handleError(track, new Error('音频加载失败'));
        el.play().then(() => {
          fadeTo(ch, ch.cur, masterVol(), XFADE_S * 1000);
          DB.playCounts.inc(track.id);
          DB.history.add(track.id);
          _mediaSession(track);
          P.emit('change', P.state());
          P._prepareNext();
          setTimeout(() => { P._xfading = false; }, XFADE_S * 1000);
        }, () => { P._xfading = false; });
        // 淡出旧通道并暂停
        fadeTo(ch, oldSlot, 0, XFADE_S * 1000, () => {
          ch.els[oldSlot].pause();
        });
      }
    }
  };

  P.stopAll = function () {
    [chWA, chPlain].forEach(ch => {
      ch.els.forEach((el, i) => {
        try { el.pause(); } catch (e) {}
        if (ch.routed && ch.gains[i]) ch.gains[i].gain.value = 0;
      });
    });
    chWA.cur = 0; chPlain.cur = 0;
  };

  /* ---------- 控制 ---------- */
  P.toggle = function () {
    if (!P.curTrack) {
      // 无当前曲目：随机播放全部馆藏
      const all = DB.sortBy(DB.tracks, 'heat');
      if (all.length) P.playAt(0, U.shuffle(all));
      return;
    }
    const ch = channelFor(P.curTrack);
    const el = ch.els[ch.cur];
    if (P.playing) {
      fadeTo(ch, ch.cur, 0, 260, () => el.pause());
      P.playing = false;
      P.emit('pause', P.state());
    } else {
      const p = el.play();
      if (p && p.then) p.then(() => {
        P.playing = true;
        fadeTo(ch, ch.cur, masterVol(), FADE_MS);
        P.emit('play', P.state());
        resumeCtx();
      }, () => U.toast('播放失败，请重试', 'error'));
      else { P.playing = true; P.emit('play', P.state()); }
    }
  };

  P.next = function () { if (P.queue.length) P.playAt((P.index + 1) % P.queue.length); };
  P.prev = function () {
    if (P.queue.length) P.playAt((P.index - 1 + P.queue.length) % P.queue.length);
  };

  P.seek = function (frac) {
    if (!P.curTrack) return;
    const ch = channelFor(P.curTrack);
    const el = ch.els[ch.cur];
    if (isFinite(el.duration)) el.currentTime = frac * el.duration;
  };

  P.seekBy = function (sec) {
    if (!P.curTrack) return;
    const el = channelFor(P.curTrack).els[channelFor(P.curTrack).cur];
    el.currentTime = Math.max(0, Math.min((el.duration || 0) - 0.5, el.currentTime + sec));
  };

  P.setVolume = function (v) {
    P.volume = Math.max(0, Math.min(1, v));
    P.muted = false;
    U.store.set('volume', P.volume);
    if (!P.ch || P.ch.routed) {
      // 对 WA 通道按当前元素增益调整
      if (P.ch && P.ch.routed) {
        const slot = P.ch.cur;
        const g = P.ch.gains[slot];
        if (g) g.gain.value = P.playing ? P.volume : 0;
      }
    } else {
      applyPlainVol();
    }
    chPlain.els.forEach(el => { if (el.paused) el.volume = masterVol(); });
    P.emit('volume', P.state());
  };
  P.toggleMute = function () {
    P.muted = !P.muted;
    P.setVolume(P.volume);
    P.emit('volume', P.state());
  };

  P.cycleRate = function () {
    const i = RATES.indexOf(P.rate);
    P.rate = RATES[(i + 1) % RATES.length];
    [chWA, chPlain].forEach(ch => ch.els.forEach(el => { el.playbackRate = P.rate; }));
    P.emit('rate', P.state());
    return P.rate;
  };

  P.cycleLoop = function () {
    P.loopMode = P.loopMode === 'off' ? 'all' : P.loopMode === 'all' ? 'one' : 'off';
    P.emit('loop', P.state());
    return P.loopMode;
  };

  /* ---------- 状态与可视化 ---------- */
  P.state = function () {
    let cur = 0, dur = 0;
    if (P.ch) {
      const el = P.ch.els[P.ch.cur];
      cur = el.currentTime || 0;
      dur = isFinite(el.duration) ? el.duration : (P.curTrack ? DB.durOf(P.curTrack) : 0);
    }
    return {
      track: P.curTrack, playing: P.playing, queue: P.queue, index: P.index,
      cur, dur, loopMode: P.loopMode, rate: P.rate,
      volume: P.muted ? 0 : P.volume, muted: P.muted
    };
  };

  P.vizLevels = function (bins) {
    if (!chWA.analyser) return null;
    const data = new Uint8Array(chWA.analyser.frequencyBinCount);
    try { chWA.analyser.getByteFrequencyData(data); } catch (e) { return null; }
    const out = [];
    const step = Math.floor(data.length / bins) || 1;
    for (let i = 0; i < bins; i++) out.push(data[i * step] / 255);
    return out;
  };

  /* ---------- Media Session（锁屏/系统媒体控制） ---------- */
  function _mediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.performer || track.composer,
        album: '公有领域音乐图书馆'
      });
      navigator.mediaSession.setActionHandler('play', () => P.toggle());
      navigator.mediaSession.setActionHandler('pause', () => P.toggle());
      navigator.mediaSession.setActionHandler('previoustrack', () => P.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => P.next());
    } catch (e) { /* ignore */ }
  }

  /* ---------- 错误处理 ---------- */
  function _handleError(track, err) {
    console.warn('播放错误：', track.title, err && err.message);
    P.emit('error', { track, err });
    U.toast('《' + track.title + '》音频加载失败，可能外链失效或网络受限，已尝试跳过', 'error', 4200);
    // 自动跳到下一曲（仅队列超过一首时）
    if (P.queue.length > 1 && P.index >= 0) {
      setTimeout(() => {
        const st = P.state();
        if (st.track && st.track.id === track.id) P.next();
      }, 1800);
    }
  }

  window.Player = P;
})();
