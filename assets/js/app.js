/* =========================================================
 * app.js — 应用引导
 * 职责：数据加载 → 路由启动；主题/字号持久化；全局搜索联想；
 *      播放条 UI 与快捷键；播放器心跳（进度广播 + 可视化 + 曲尾交叉检测）
 * ========================================================= */
(function () {
  'use strict';

  /* ---------- 主题与字号 ---------- */
  const themePref = U.store.get('theme', null);   // 'light' | 'dark' | null(跟随系统)
  function applyTheme(mode) {
    if (mode === 'dark') document.documentElement.dataset.theme = 'dark';
    else if (mode === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(themePref);
  // 未手动选择过时跟随系统深色偏好
  if (!themePref && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
  document.documentElement.dataset.font = U.store.get('font', 'normal');

  document.getElementById('themeToggle').onclick = () => {
    const cur = document.documentElement.dataset.theme ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    U.store.set('theme', next);
    applyTheme(next);
  };

  const fontPop = document.getElementById('fontPop');
  document.getElementById('fontToggle').onclick = e => {
    e.stopPropagation();
    fontPop.hidden = !fontPop.hidden;
  };
  fontPop.addEventListener('click', e => {
    const b = e.target.closest('[data-font]');
    if (!b) return;
    const f = b.dataset.font;
    document.documentElement.dataset.font = f;
    U.store.set('font', f);
    fontPop.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.font === f));
    fontPop.hidden = true;
  });
  document.addEventListener('click', e => {
    if (!fontPop.hidden && !fontPop.contains(e.target)) fontPop.hidden = true;
  });

  /* ---------- 移动端菜单 ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.onclick = () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  /* ---------- 全局搜索 ---------- */
  const searchInput = document.getElementById('globalSearch');
  const searchBtn = document.getElementById('searchBtn');
  const suggestBox = document.getElementById('searchSuggest');

  function doSearch() {
    const q = searchInput.value.trim();
    suggestBox.hidden = true;
    if (!q) { U.toast('请输入要搜索的作品、作者或拼音', 'warn'); return; }
    location.hash = '#/search?q=' + encodeURIComponent(q);
  }
  searchBtn.onclick = doSearch;
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    if (e.key === 'Escape') suggestBox.hidden = true;
  });
  searchInput.addEventListener('input', U.debounce(() => {
    const q = searchInput.value.trim();
    if (q.length < 1) { suggestBox.hidden = true; return; }
    const hits = SE.suggest(q, 7);
    if (!hits.length) { suggestBox.hidden = true; return; }
    suggestBox.innerHTML = hits.map(t => {
      const meta = [t.composer, t.category].join(' · ');
      return `<a href="#/work/${t.id}" data-id="${t.id}">
        <span class="sg-title">${U.escapeHtml(t.title)}</span>
        <span class="sg-meta">${U.escapeHtml(meta)}</span></a>`;
    }).join('');
    suggestBox.hidden = false;
    suggestBox.querySelectorAll('a').forEach(a => {
      a.onclick = () => { suggestBox.hidden = true; };
    });
  }, 180));
  document.addEventListener('click', e => {
    if (!suggestBox.hidden && !e.target.closest('.search-box')) suggestBox.hidden = true;
  });

  /* ---------- 键盘快捷键（输入框内不生效） ---------- */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const st = Player.state();
    switch (e.key) {
      case ' ': e.preventDefault(); Player.toggle(); break;
      case 'ArrowLeft': e.preventDefault(); Player.seekBy(-5); break;
      case 'ArrowRight': e.preventDefault(); Player.seekBy(5); break;
      case 'ArrowUp': e.preventDefault(); Player.setVolume(Math.min(1, st.volume + 0.1)); break;
      case 'ArrowDown': e.preventDefault(); Player.setVolume(Math.max(0, st.volume - 0.1)); break;
      case 'n': case 'N': Player.next(); break;
      case 'p': case 'P': Player.prev(); break;
      case 'l': case 'L': {
        const m = Player.cycleLoop();
        U.toast('循环模式：' + (m === 'off' ? '关闭' : m === 'all' ? '列表循环' : '单曲循环'), 'info', 1600);
        break;
      }
      case 'm': case 'M': Player.toggleMute(); break;
      case 'r': case 'R': {
        const r = Player.cycleRate();
        U.toast('播放倍速：' + r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '×', 'info', 1600);
        break;
      }
      case 'f': case 'F':
        if (st.track) { DB.favs.toggle(st.track.id); PUI.syncFav(); U.toast(DB.favs.has(st.track.id) ? '已收藏' : '已取消收藏', 'info', 1500); }
        break;
    }
  });

  /* ---------- 播放条 UI ---------- */
  const $ = id => document.getElementById(id);
  const playerBar = $('playerBar');

  const PUI = {
    els: {
      cover: $('playerCover'), title: $('playerTitle'), artist: $('playerArtist'),
      play: $('btnPlay'), prev: $('btnPrev'), next: $('btnNext'), loop: $('btnLoop'),
      loopBadge: $('loopBadge'), mute: $('btnMute'), fav: $('btnFav'),
      seek: $('seekBar'), vol: $('volBar'), rate: $('btnRate'),
      cur: $('timeCur'), dur: $('timeDur'), collapse: $('btnCollapse'),
      canvas: $('vizCanvas')
    },
    init() {
      const E = this.els;
      E.play.onclick = () => Player.toggle();
      E.prev.onclick = () => Player.prev();
      E.next.onclick = () => Player.next();
      E.loop.onclick = () => {
        const m = Player.cycleLoop();
        E.loop.title = '循环模式 (L)：' + (m === 'off' ? '关闭' : m === 'all' ? '列表循环' : '单曲循环');
        this.syncLoop();
      };
      E.mute.onclick = () => Player.toggleMute();
      E.rate.onclick = () => Player.cycleRate();
      E.fav.onclick = () => {
        const st = Player.state();
        if (!st.track) return;
        const added = DB.favs.toggle(st.track.id);
        this.syncFav();
        U.toast(added ? '已加入收藏' : '已取消收藏', 'info', 1500);
      };
      E.collapse.onclick = () => playerBar.classList.toggle('collapsed');
      E.seek.oninput = () => {
        const frac = E.seek.value / 1000;
        E.cur.textContent = U.fmtTime(frac * (Player.state().dur || 0));
      };
      E.seek.onchange = () => Player.seek(E.seek.value / 1000);
      E.vol.oninput = () => Player.setVolume(E.vol.value / 100);
      Player.on('change', () => this.syncTrack());
      Player.on('play', () => this.syncPlay());
      Player.on('pause', () => this.syncPlay());
      Player.on('stop', () => this.syncPlay());
      Player.on('progress', st => this.syncProgress(st));
      Player.on('volume', () => this.syncVol());
      Player.on('rate', () => this.syncRate());
      Player.on('loop', () => this.syncLoop());
      Player.on('error', () => this.syncPlay());
      document.addEventListener('dbchange', () => this.syncFav());
      this.syncVol(); this.syncRate(); this.syncLoop();
      this._viz();
    },
    syncPlay() {
      const st = Player.state();
      this.els.play.textContent = st.playing ? '⏸' : '▶';
      this.els.play.setAttribute('aria-label', st.playing ? '暂停' : '播放');
    },
    syncLoop() {
      const m = Player.loopMode;
      this.els.loopBadge.hidden = m !== 'one';
      this.els.loop.style.opacity = m === 'off' ? '.5' : '1';
      this.els.loop.title = '循环模式 (L)：' + (m === 'off' ? '关闭' : m === 'all' ? '列表循环' : '单曲循环');
    },
    syncVol() {
      const st = Player.state();
      this.els.vol.value = Math.round(st.volume * 100);
      this.els.mute.textContent = st.muted || st.volume === 0 ? '🔇' : '🔊';
    },
    syncRate() {
      const r = Player.rate;
      this.els.rate.textContent = (r + '').replace(/0$/, '') + '×';
    },
    syncFav() {
      const st = Player.state();
      const on = st.track && DB.favs.has(st.track.id);
      this.els.fav.textContent = on ? '♥' : '♡';
      this.els.fav.classList.toggle('on', !!on);
    },
    syncTrack() {
      const st = Player.state();
      const t = st.track;
      if (!t) return;
      playerBar.hidden = false;
      document.body.classList.add('has-player');
      this.els.title.textContent = t.title;
      this.els.title.href = '#/work/' + t.id;
      this.els.artist.textContent = [t.composer, t.performer].filter(x => x && x !== '佚名').join(' · ') || '公有领域音乐';
      if (t.cover) {
        this.els.cover.hidden = false;
        this.els.cover.src = t.cover;
      } else {
        this.els.cover.hidden = true;
      }
      this.syncFav(); this.syncPlay(); this.syncLoop();
    },
    syncProgress(st) {
      const frac = st.dur ? st.cur / st.dur : 0;
      this.els.seek.value = Math.round(frac * 1000);
      this.els.cur.textContent = U.fmtTime(st.cur);
      this.els.dur.textContent = U.fmtTime(st.dur);
    },
    /* 心跳：驱动交叉淡出检测 + 电平可视化 */
    _viz() {
      const cv = this.els.canvas, ctx2d = cv.getContext('2d');
      const loop = () => {
        Player.tick();
        if (!playerBar.hidden) {
          const lv = Player.vizLevels(12);
          ctx2d.clearRect(0, 0, cv.width, cv.height);
          ctx2d.fillStyle = '#bda87e';
          const bw = cv.width / 12 - 2;
          for (let i = 0; i < 12; i++) {
            let h = lv ? lv[i] * cv.height : (Player.state().playing ? 3 + Math.abs(Math.sin(Date.now() / 300 + i)) * 6 : 2);
            ctx2d.fillRect(i * (bw + 2), cv.height - h, bw, h);
          }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  };

  /* ---------- 启动（带看门狗：加载异常时给出明确出口而非无限转圈） ---------- */
  U.initLightbox();
  PUI.init();

  const watchdog = setTimeout(() => {
    const app = document.getElementById('app');
    if (app && app.querySelector('.view-loading')) {
      app.innerHTML = `<div class="error-state"><span class="glyph">⏳</span><h3>馆藏加载时间过长</h3>
        <p>网络或本地服务响应缓慢。数据回退通道未生效，请点击重试；若反复出现，可直接双击 index.html 打开。</p>
        <button class="btn btn-primary" onclick="location.reload()">重新加载</button></div>`;
    }
  }, 8000);

  DB.load().then(() => {
    clearTimeout(watchdog);
    const boot = document.getElementById('bootLoading');
    if (boot) boot.remove();
    if (DB.loadError) {
      document.getElementById('app').innerHTML =
        `<div class="error-state"><span class="glyph">📕</span><h3>馆藏数据加载失败</h3>
         <p>${U.escapeHtml(DB.loadError)}</p>
         <button class="btn btn-primary" onclick="location.reload()">重新加载</button></div>`;
      return;
    }
    Router.start();
  }).catch(err => {
    clearTimeout(watchdog);
    document.getElementById('app').innerHTML =
      `<div class="error-state"><span class="glyph">📕</span><h3>初始化失败</h3><p>${U.escapeHtml(err.message)}</p>
       <button class="btn btn-primary" onclick="location.reload()">重新加载</button></div>`;
  });
})();
