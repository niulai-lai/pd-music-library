/* =========================================================
 * data.js — 数据层
 * 职责：
 *   1. 双模式加载馆藏数据：优先 fetch data/music.json（静态托管），
 *      失败（file:// 本地打开）时回退到 data/music.js 注入的 window.PDML_DATA
 *   2. 条目规范化 + 拼音索引 + 多维筛选切片
 *   3. 用户数据管理：收藏 / 历史 / 自定义歌单 / 播放计数 / 时长缓存
 *   4. 批量导入（JSON / CSV）与导出，全部持久化在 localStorage
 * 命名空间：window.DB
 * ========================================================= */
(function () {
  'use strict';

  const DB = {
    tracks: [],          // 合并后的全部条目（内置 + 用户导入）
    userTracks: [],      // 用户导入的条目
    builtInCount: 0,
    loaded: false,
    loadError: null
  };

  const K = {
    userTracks: 'userTracks',
    favs: 'favorites',
    history: 'history',
    playlists: 'playlists',
    playCounts: 'playCounts',
    durations: 'durations'
  };

  /* 分类固定顺序（六大馆区） */
  DB.CATEGORIES = ['古典音乐', '民国老唱片', '戏曲曲艺', '红色歌曲', '民间音乐', '乐谱库'];

  /* 场景定义（详情见 scenes 视图） */
  DB.SCENES = [
    { id: 'documentary', name: '纪录片BGM', icon: '🎞', desc: '历史人文纪录片配乐：厚重、开阔、有年代感', moods: ['恢弘', '厚重', '悠远'], maxDur: 600 },
    { id: 'audiobook', name: '有声书背景', icon: '📖', desc: '有声书与播客垫乐：安静、不抢人声', moods: ['安静', '舒缓'], maxDur: 480 },
    { id: 'video', name: '视频剪辑', icon: '🎬', desc: '短视频与Vlog剪辑素材：节奏清晰、情绪明确', moods: ['明快', '优雅'], maxDur: 360 },
    { id: 'study', name: '学习白噪音', icon: '📚', desc: '专注学习时的连续背景音：平稳、无干扰', moods: ['安静', '平稳'], maxDur: 900 },
    { id: 'live', name: '直播背景', icon: '📻', desc: '直播间氛围垫乐：柔和、可循环、不干扰说话', moods: ['柔和', '优雅'], maxDur: 600 },
    { id: 'nostalgia', name: '怀旧氛围', icon: '🏮', desc: '老电影感与旧时光氛围：年代感十足', moods: ['怀旧', '悠远', '温存'], maxDur: 600 }
  ];

  /* ---------- 加载 ---------- */
  DB.load = function () {
    if (DB.loaded || DB._loading) return Promise.resolve();
    DB._loading = true;
    // fetch 加超时护栏：请求被防火墙/代理挂住时也能及时回退，启动永不卡死
    const withTimeout = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('数据请求超时')), ms))
    ]);
    // 方式一：静态托管时直接 fetch JSON（便于"改 JSON 即加歌"）
    return withTimeout(
      fetch('data/music.json', { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }),
      5000
    )
      .then(json => {
        DB._apply(json, 'json');
      })
      .catch(() => {
        // 方式二：file:// 本地打开或 fetch 失败时，music.js 已随页面注入 window.PDML_DATA
        if (window.PDML_DATA && window.PDML_DATA.tracks) {
          DB._apply(window.PDML_DATA, 'js');
        } else {
          DB.loadError = '无法加载馆藏数据（data/music.json）。若直接双击打开网页，请确认 data/music.js 存在；若部署到服务器，请检查 JSON 路径。';
        }
      })
      .then(() => {
        DB._loadUser();
        DB._merge();
        DB.loaded = true;
        DB._loading = false;
      });
  };

  DB._apply = function (json, mode) {
    DB.rawMeta = {
      schema: json.schema || 'pdml.v1',
      generated: json.generated || '',
      sources: json.sources || []
    };
    DB.albums = (json.albums || []).map(a => Object.assign({}, a));
    DB.builtIn = (json.tracks || []).map(t => DB.normalize(t, 'builtin'));
    DB.builtInCount = DB.builtIn.length;
    DB._mode = mode;
  };

  DB._loadUser = function () {
    DB.userTracks = (U.store.get(K.userTracks, []) || []).map(t => DB.normalize(t, 'user'));
  };

  DB._merge = function () {
    DB.tracks = DB.builtIn.concat(DB.userTracks);
  };

  /* ---------- 规范化 ---------- */
  DB.normalize = function (t, origin) {
    t = Object.assign({}, t);
    if (!t.id) t.id = 'u' + U.uid();
    t._origin = origin || 'user';
    t.title = String(t.title || '未命名').trim();
    t.titleEn = t.titleEn || '';
    t.composer = t.composer || '佚名';
    t.composerLife = t.composerLife || '';
    t.performer = t.performer || '佚名';
    t.category = DB.CATEGORIES.indexOf(t.category) >= 0 ? t.category : (t.category || '古典音乐');
    t.tags = Array.isArray(t.tags) ? t.tags : String(t.tags || '').split(/[;；,，]/).map(s => s.trim()).filter(Boolean);
    t.scenes = Array.isArray(t.scenes) ? t.scenes : [];
    t.versions = Array.isArray(t.versions) ? t.versions : [];
    t.scores = Array.isArray(t.scores) ? t.scores : (t.scores ? [t.scores] : []);
    t.audio = t.audio || null;
    t.recordedYear = t.recordedYear || '';
    t.durationSec = Number(t.durationSec) || 0;
    t.playSeeds = Number(t.playSeeds) || 0;
    t.addedAt = t.addedAt || U.todayStr();
    if (t.audio && typeof t.audio.sizeMB === 'string') t.audio.sizeMB = parseFloat(t.audio.sizeMB) || null;
    // 拼音索引（标题 / 作者 / 表演者 / 标签）
    t._py = {
      title: PY.of(t.title + ' ' + t.titleEn),
      composer: PY.of(t.composer + ' ' + (t.composerEn || '')),
      performer: PY.of(t.performer),
      tags: PY.of(t.tags.join(' ')),
      full: ''
    };
    t._py.full = [t._py.title, t._py.composer, t._py.performer, t._py.tags].join(' ');
    return t;
  };

  /* ---------- 查询基础 ---------- */
  DB.byId = function (id) { return DB.tracks.find(t => t.id === id) || null; };

  DB.facetValues = function (field) {
    const set = new Set();
    DB.tracks.forEach(t => {
      const v = t[field];
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'));
  };

  DB.eras = function () {
    // 年代维度：按录制年份分档
    return ['—1900', '1900—1924', '1925—1949', '1950—1975', '1976—2000', '2000—'];
  };
  DB.eraOf = function (t) {
    const y = parseInt(t.recordedYear, 10);
    if (!y || isNaN(y)) return '年份未详';
    if (y <= 1900) return '—1900';
    if (y <= 1924) return '1900—1924';
    if (y <= 1949) return '1925—1949';
    if (y <= 1975) return '1950—1975';
    if (y <= 2000) return '1976—2000';
    return '2000—';
  };

  /* 通用筛选：filters = {category, composer, instrument, genre, performer, era, scene, tag} */
  DB.filter = function (filters) {
    let list = DB.tracks.slice();
    if (filters.category) list = list.filter(t => t.category === filters.category);
    if (filters.composer) list = list.filter(t => t.composer === filters.composer);
    if (filters.instrument) list = list.filter(t => t.instrument === filters.instrument);
    if (filters.genre) list = list.filter(t => t.genre === filters.genre);
    if (filters.performer) list = list.filter(t => t.performer === filters.performer);
    if (filters.era) list = list.filter(t => DB.eraOf(t) === filters.era);
    if (filters.scene) list = list.filter(t => (t.scenes || []).indexOf(filters.scene) >= 0);
    if (filters.tag) list = list.filter(t => t.tags.indexOf(filters.tag) >= 0);
    return list;
  };

  DB.sortBy = function (list, mode) {
    const counts = U.store.get(K.playCounts, {});
    const heat = t => (counts[t.id] || 0) + t.playSeeds;
    const arr = list.slice();
    if (mode === 'heat') arr.sort((a, b) => heat(b) - heat(a) || String(a.title).localeCompare(b.title, 'zh-Hans-CN'));
    else if (mode === 'name') arr.sort((a, b) => String(a.title).localeCompare(b.title, 'zh-Hans-CN'));
    else if (mode === 'old') arr.sort((a, b) => (parseInt(a.recordedYear, 10) || 9999) - (parseInt(b.recordedYear, 10) || 9999));
    else if (mode === 'new') arr.sort((a, b) => (parseInt(b.recordedYear, 10) || 0) - (parseInt(a.recordedYear, 10) || 0) || String(b.addedAt).localeCompare(a.addedAt));
    else if (mode === 'added') arr.sort((a, b) => String(b.addedAt).localeCompare(a.addedAt));
    else arr.sort((a, b) => heat(b) - heat(a));
    return arr;
  };

  /* ---------- 专辑 ---------- */
  DB.albumById = function (id) { return (DB.albums || []).find(a => a.id === id) || null; };
  DB.albumTracks = function (album) {
    return (album.trackIds || []).map(id => DB.byId(id)).filter(Boolean);
  };

  /* ---------- 个人数据 ---------- */
  DB.favs = {
    list() { return U.store.get(K.favs, []); },
    has(id) { return this.list().indexOf(id) >= 0; },
    toggle(id) {
      const l = this.list();
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.unshift(id);
      U.store.set(K.favs, l);
      return i < 0;
    }
  };

  DB.history = {
    list() { return U.store.get(K.history, []); },
    add(id) {
      let l = this.list().filter(h => h.id !== id);
      l.unshift({ id, ts: Date.now() });
      if (l.length > 200) l.length = 200;
      U.store.set(K.history, l);
    },
    clear() { U.store.set(K.history, []); }
  };

  DB.playCounts = {
    get(id) { return (U.store.get(K.playCounts, {}))[id] || 0; },
    inc(id) {
      const m = U.store.get(K.playCounts, {});
      m[id] = (m[id] || 0) + 1;
      U.store.set(K.playCounts, m);
    }
  };

  DB.playlists = {
    list() { return U.store.get(K.playlists, []); },
    save(l) { U.store.set(K.playlists, l); },
    create(name) {
      const l = this.list();
      const p = { id: U.uid(), name: name.trim() || '未命名歌单', trackIds: [], createdAt: Date.now() };
      l.unshift(p);
      this.save(l);
      return p;
    },
    byId(id) { return this.list().find(p => p.id === id) || null; },
    remove(id) { this.save(this.list().filter(p => p.id !== id)); },
    addTrack(pid, tid) {
      const p = this.byId(pid);
      if (!p || p.trackIds.indexOf(tid) >= 0) return false;
      p.trackIds.push(tid);
      this.save(this.list());
      return true;
    },
    removeTrack(pid, tid) {
      const p = this.byId(pid);
      if (!p) return;
      p.trackIds = p.trackIds.filter(x => x !== tid);
      this.save(this.list());
    }
  };

  /* ---------- 时长缓存（播放时自动校正） ---------- */
  DB.durations = {
    get(id, fallback) {
      const m = U.store.get(K.durations, {});
      return m[id] || fallback || 0;
    },
    set(id, sec) {
      if (!isFinite(sec) || sec <= 0) return;
      const m = U.store.get(K.durations, {});
      if (Math.abs((m[id] || 0) - sec) < 1) return;
      m[id] = Math.round(sec);
      U.store.set(K.durations, m);
    }
  };

  /* 显示时长：优先运行时缓存 */
  DB.durOf = function (t) {
    return DB.durations.get(t.id, t.durationSec);
  };

  /* =========================================================
   * 导入 / 导出
   * ========================================================= */

  /* CSV 解析（支持引号、转义、换行） */
  DB.parseCSV = function (text) {
    const rows = [];
    let row = [], cell = '', inQ = false;
    text = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQ = false;
        } else cell += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  };

  /* 表头（中文主键 + 英文别名兼容） */
  const CSV_FIELDS = [
    { cn: '标题', en: 'title', req: true },
    { cn: '作者', en: 'composer' },
    { cn: '生卒年', en: 'composerLife' },
    { cn: '表演者', en: 'performer' },
    { cn: '录制年份', en: 'recordedYear' },
    { cn: '分类', en: 'category' },
    { cn: '标签', en: 'tags' },
    { cn: '音频链接', en: 'audioUrl', req: false },
    { cn: '乐谱链接', en: 'scoreUrl' },
    { cn: '来源', en: 'sourceUrl' },
    { cn: '来源名称', en: 'sourceName' },
    { cn: '版权状态', en: 'license' },
    { cn: '背景介绍', en: 'background' },
    { cn: '场景', en: 'scenes' },
    { cn: '流派', en: 'genre' },
    { cn: '乐器', en: 'instrument' },
    { cn: '时长秒', en: 'durationSec' }
  ];
  DB.CSV_FIELDS = CSV_FIELDS;

  /* CSV → 条目数组 */
  DB.csvToTracks = function (text) {
    const rows = DB.parseCSV(text);
    if (!rows.length) throw new Error('CSV 内容为空');
    const head = rows[0].map(h => h.trim());
    const colMap = head.map(h => {
      const f = CSV_FIELDS.find(f => f.cn === h || f.en === h);
      return f ? f.en : null;
    });
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      rows[i].forEach((v, idx) => {
        const en = colMap[idx];
        if (en) obj[en] = v.trim();
      });
      items.push(obj);
    }
    return DB.itemsToTracks(items);
  };

  /* 中间格式（含扁平字段）→ 规范条目 */
  DB.itemsToTracks = function (items) {
    return items.map(it => {
      if (it.audioUrl) {
        it.audio = it.audio || { url: it.audioUrl };
        it.audio.url = it.audioUrl;
        const ext = (it.audioUrl.split('?')[0].match(/\.(\w+)$/) || [])[1];
        if (ext) it.audio.format = it.audio.format || ext.toUpperCase();
      }
      if (it.scoreUrl) {
        it.scores = [{ url: it.scoreUrl, label: it.scoreLabel || '乐谱扫描' }];
      }
      if (it.sourceUrl) {
        it.source = { name: it.sourceName || '外部来源', page: it.sourceUrl, license: it.license || 'Public domain', licenseNote: it.license || '请以来源页标注为准' };
      }
      delete it.audioUrl; delete it.scoreUrl; delete it.sourceUrl; delete it.sourceName; delete it.license; delete it.scoreLabel;
      if (it.scenes) it.scenes = String(it.scenes).split(/[;；,，|]/).map(s => s.trim()).filter(Boolean);
      return DB.normalize(it, 'user');
    });
  };

  /* 导入校验。返回 {ok, added, skipped, errors[]} */
  DB.importItems = function (tracks) {
    const errors = [], added = [];
    let skipped = 0;
    tracks.forEach(t => {
      if (!t.title || t.title === '未命名') { errors.push('第' + (tracks.indexOf(t) + 1) + '条：缺少标题'); return; }
      if (!t.audio || !t.audio.url) {
        // 允许纯乐谱条目
        if (!t.scores || !t.scores.length) { errors.push('《' + t.title + '》：既无音频链接也无乐谱链接'); return; }
      }
      if (!t.source || !t.source.page) { errors.push('《' + t.title + '》：缺少来源链接（合规必填）'); return; }
      const dup = DB.tracks.find(x => x.title === t.title && x.performer === t.performer);
      if (dup) { skipped++; return; }
      t.addedAt = U.todayStr();
      added.push(t);
    });
    if (added.length) {
      DB.userTracks = DB.userTracks.concat(added);
      U.store.set(K.userTracks, DB.userTracks);
      DB._merge();
    }
    return { ok: added.length > 0, added: added.length, skipped, errors };
  };

  /* 导出全部用户数据 */
  DB.exportUserTracks = function () {
    return DB.userTracks.map(t => {
      const c = Object.assign({}, t);
      delete c._py; delete c._origin;
      return c;
    });
  };

  /* 下载文本文件 */
  DB.downloadFile = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* 用户数据统计（数据管理页） */
  DB.userStats = function () {
    return {
      builtIn: DB.builtInCount,
      imported: DB.userTracks.length,
      favs: DB.favs.list().length,
      playlists: DB.playlists.list().length,
      history: DB.history.list().length
    };
  };

  /* 清空用户数据 */
  DB.clearUserData = function (what) {
    if (what === 'all') {
      [K.userTracks, K.favs, K.history, K.playlists, K.playCounts, K.durations].forEach(k => U.store.remove(k));
      DB.userTracks = [];
      DB._merge();
      return;
    }
    const map = { imported: K.userTracks, favs: K.favs, history: K.history, playlists: K.playlists, playCounts: K.playCounts, durations: K.durations };
    if (map[what]) {
      U.store.remove(map[what]);
      if (what === 'imported') { DB.userTracks = []; DB._merge(); }
    }
  };

  window.DB = DB;
})();
