/* =========================================================
 * views-common.js — 视图共享组件
 * 作品卡片 / 列表行 / 空态 / 区块标题 / 卡片行为绑定 / 加入歌单弹窗
 * 命名空间：window.UI
 * ========================================================= */
(function () {
  'use strict';
  const UI = {};

  const CAT_ICONS = {
    '古典音乐': '🎼', '民国老唱片': '📀', '戏曲曲艺': '🎭',
    '红色歌曲': '🚩', '民间音乐': '🪕', '乐谱库': '📜'
  };
  UI.catIcon = c => CAT_ICONS[c] || '🎵';

  /* 懒加载透传（实现在 util.js） */
  UI.observeLazy = root => U.observeLazy(root);

  /* 场景 id → 名称 */
  UI.sceneName = function (sid) {
    const s = (window.DB && DB.SCENES || []).find(x => x.id === sid);
    return s ? s.name : sid;
  };

  /* ---------- 作品卡片 ---------- */
  UI.workCard = function (t, opts) {
    opts = opts || {};
    const dur = DB.durOf(t);
    const durTxt = dur ? U.fmtTime(dur) : '';
    const playing = Player.curTrack && Player.curTrack.id === t.id;
    const tags = t.tags.slice(0, 2).map(x => `<span class="badge">${U.escapeHtml(x)}</span>`).join('');
    const cover = t.cover
      ? `<img data-src="${U.escapeHtml(t.cover)}" alt="${U.escapeHtml(t.title)}" loading="lazy">`
      : `<span class="cover-fallback" aria-hidden="true">${UI.catIcon(t.category)}</span>`;
    return `
    <article class="work-card" data-id="${t.id}">
      <div class="cover">${cover}
        <div class="play-overlay">
          <button class="play-btn" data-play="${t.id}" aria-label="播放 ${U.escapeHtml(t.title)}">▶</button>
        </div>
      </div>
      <div class="wc-body">
        <a class="wc-title" href="#/work/${t.id}">${UI.hlt(t.title, opts.q)}</a>
        <span class="wc-meta">${U.escapeHtml(t.composer)} · ${U.escapeHtml(t.performer)}${t.recordedYear ? ' · ' + U.escapeHtml(t.recordedYear) : ''}</span>
        <span class="wc-meta">${U.escapeHtml(t.category)}${t.genre ? ' · ' + U.escapeHtml(t.genre) : ''}${durTxt ? ' · ' + durTxt : ''}</span>
        <div class="wc-tags">${tags}<span class="badge badge-pd">公有领域</span></div>
      </div>
    </article>`;
  };

  /* ---------- 列表行 ---------- */
  UI.listItem = function (t, idx, opts) {
    opts = opts || {};
    const dur = DB.durOf(t);
    const playing = Player.curTrack && Player.curTrack.id === t.id;
    return `
    <div class="work-list-item" data-id="${t.id}">
      <span class="wli-idx">${idx + 1}</span>
      <div class="wli-main">
        <a class="wli-title" href="#/work/${t.id}">${UI.hlt(t.title, opts.q)}</a>
        <span class="wli-meta">${U.escapeHtml(t.composer)} · ${U.escapeHtml(t.performer)}${t.recordedYear ? ' · ' + U.escapeHtml(t.recordedYear) : ''} · ${U.escapeHtml(t.category)}</span>
      </div>
      <div class="wli-side">
        ${t.tags[0] ? `<span class="badge">${U.escapeHtml(t.tags[0])}</span>` : ''}
        <span class="badge badge-pd">公有领域</span>
        ${dur ? `<span class="wli-dur">${U.fmtTime(dur)}</span>` : ''}
        <button class="btn btn-small ${playing ? '' : 'btn-primary'}" data-play="${t.id}" aria-label="播放 ${U.escapeHtml(t.title)}">${playing ? '⏸ 播放中' : '▶ 播放'}</button>
      </div>
    </div>`;
  };

  /* 关键词高亮 */
  UI.hlt = function (text, q) {
    const safe = U.escapeHtml(text);
    if (!q) return safe;
    const qq = String(q).trim();
    if (qq.length < 1) return safe;
    try {
      // 仅对原文包含的查询串高亮（拼音命中不做标记，避免错切汉字）
      const re = new RegExp(qq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return safe.replace(re, m => `<mark>${m}</mark>`);
    } catch (e) { return safe; }
  };

  /* ---------- 空态 / 区块标题 ---------- */
  UI.empty = function (icon, text, extra) {
    return `<div class="empty-state"><span class="glyph">${icon}</span><p>${U.escapeHtml(text)}</p>${extra || ''}</div>`;
  };
  UI.sectionHead = function (title, moreHref, moreText) {
    return `<div class="section-head"><h2>${U.escapeHtml(title)}</h2>
      ${moreHref ? `<a class="more" href="${moreHref}">${U.escapeHtml(moreText || '更多 →')}</a>` : ''}</div>`;
  };

  /* ---------- 卡片行为绑定 ---------- */
  UI.bind = function (root, listGetter) {
    root.querySelectorAll('[data-play]').forEach(btn => {
      btn.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const id = btn.dataset.play;
        const t = DB.byId(id);
        if (!t) return;
        const list = (listGetter && listGetter()) || null;
        const st = Player.state();
        if (st.track && st.track.id === id && st.playing) { Player.toggle(); return; }
        if (st.track && st.track.id === id && !st.playing) { Player.toggle(); return; }
        if (list && list.length > 1) {
          Player.playAt(Math.max(0, list.findIndex(x => x.id === id)), list);
        } else {
          Player.playTrack(t);
        }
      };
    });
    root.querySelectorAll('.cover').forEach(c => {
      c.onclick = e => {
        if (e.target.closest('[data-play]')) return;
        const card = c.closest('[data-id]');
        if (card) location.hash = '#/work/' + card.dataset.id;
      };
    });
  };

  /* ---------- 加入歌单 / 收藏 ---------- */
  UI.favToggle = function (id, btn) {
    const added = DB.favs.toggle(id);
    if (btn) {
      btn.textContent = added ? '♥ 已收藏' : '♡ 收藏';
      btn.classList.toggle('btn-primary', added);
    }
    U.toast(added ? '已加入收藏' : '已取消收藏', 'info', 1500);
    document.dispatchEvent(new CustomEvent('dbchange'));
    return added;
  };

  UI.addToListModal = function (id) {
    const t = DB.byId(id);
    if (!t) return;
    const lists = DB.playlists.list();
    const root = document.getElementById('modalRoot');
    root.hidden = false;
    root.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>加入收藏或歌单</h3>
        <p style="color:var(--ink-soft)">《${U.escapeHtml(t.title)}》 — ${U.escapeHtml(t.composer)}</p>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn" id="mlFav">♡ 收藏</button>
        </div>
        <h4 style="margin:0 0 8px">我的歌单</h4>
        <div id="mlLists">${lists.length ? lists.map(p => `
          <div class="playlist-row" style="padding:8px 12px;margin-bottom:6px">
            <span>${U.escapeHtml(p.name)} <span class="pl-count">${p.trackIds.length}首</span></span>
            <button class="btn btn-small btn-primary" data-add="${p.id}">加入</button>
          </div>`).join('') : '<p style="color:var(--ink-faint);font-size:.85rem">还没有自定义歌单</p>'}</div>
        <div class="inline-form" style="margin-bottom:0">
          <input type="text" id="mlNewName" placeholder="新建歌单名称…" maxlength="30">
          <button class="btn" id="mlNew">新建并加入</button>
        </div>
        <div class="modal-actions"><button class="btn" id="mlClose">关闭</button></div>
      </div>`;
    const close = () => { root.hidden = true; root.innerHTML = ''; };
    root.querySelector('#mlClose').onclick = close;
    root.onclick = e => { if (e.target === root) close(); };
    root.querySelector('#mlFav').onclick = () => UI.favToggle(id);
    root.querySelectorAll('[data-add]').forEach(b => {
      b.onclick = () => {
        if (DB.playlists.addTrack(b.dataset.add, id)) U.toast('已加入歌单', 'ok');
        else U.toast('该作品已在歌单中', 'warn');
        close();
      };
    });
    root.querySelector('#mlNew').onclick = () => {
      const name = root.querySelector('#mlNewName').value.trim();
      if (!name) { U.toast('请输入歌单名称', 'warn'); return; }
      const p = DB.playlists.create(name);
      DB.playlists.addTrack(p.id, id);
      U.toast('已创建歌单「' + name + '」并加入', 'ok');
      close();
    };
  };

  /* 播放全部（供歌单页/场景页/首页使用） */
  UI.playAllBtn = function (list, label) {
    return `<button class="btn btn-primary" data-playall="1">▶ ${U.escapeHtml(label || '连续播放全部')}</button>`;
  };
  UI.bindPlayAll = function (root, getList) {
    root.querySelectorAll('[data-playall]').forEach(b => {
      b.onclick = () => {
        const list = getList();
        if (!list.length) { U.toast('歌单为空', 'warn'); return; }
        Player.playAt(0, list);
      };
    });
  };

  window.UI = UI;
})();
