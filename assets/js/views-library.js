/* =========================================================
 * views-library.js — 我的书架（全本地，localStorage）
 * 收藏 / 自定义歌单 / 播放历史 三个标签页
 * ========================================================= */
(function () {
  'use strict';

  Router.register('library', function (app, params) {
    const tab = params.tab || 'fav';
    render(app, tab);
  });

  Router.register('playlistDetail', function (app, params) {
    const p = DB.playlists.byId(params.id);
    if (!p) {
      app.innerHTML = `<div class="container">${UI.empty('📁', '没有找到这个歌单，可能已被删除。')}</div>`;
      return;
    }
    const list = p.trackIds.map(id => DB.byId(id)).filter(Boolean);
    app.innerHTML = `
    <div class="container">
      <div class="crumbs"><a href="#/library/tab">我的书架</a> / ${U.escapeHtml(p.name)}</div>
      <div class="playlist-head">
        <span class="ph-icon">📁</span>
        <div style="flex:1">
          <h1 style="margin:0">${U.escapeHtml(p.name)}</h1>
          <p>${list.length} 首 · 创建于 ${new Date(p.createdAt).toLocaleDateString('zh-CN')}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${UI.playAllBtn(list, '连续播放')}
            <button class="btn" id="plShuffle">🔀 随机播放</button>
            <button class="btn" id="plDel" style="color:var(--accent)">🗑 删除歌单</button>
          </div>
        </div>
      </div>
      ${list.length
        ? `<div>${list.map((t, i) => listItemWithRemove(t, i, p.id)).join('')}</div>`
        : UI.empty('🎵', '歌单还是空的。去书库里用「加入歌单」添加作品吧。', '<a class="btn" href="#/browse">去浏览</a>')}
    </div>`;

    function listItemWithRemove(t, i, pid) {
      const item = UI.listItem(t, i);
      const wrap = document.createElement('div');
      wrap.innerHTML = item;
      const side = wrap.querySelector('.wli-side');
      if (side) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small';
        btn.textContent = '✕ 移出';
        btn.onclick = e => { e.stopPropagation(); DB.playlists.removeTrack(pid, t.id); renderAfterChange(); };
        side.appendChild(btn);
      }
      return wrap.innerHTML;
    }
    function renderAfterChange() { Router.render(); }
    UI.bind(app, () => list);
    UI.bindPlayAll(app, () => list);
    document.getElementById('plShuffle').onclick = () => {
      if (!list.length) return U.toast('歌单为空', 'warn');
      Player.playAt(0, U.shuffle(list));
    };
    document.getElementById('plDel').onclick = () => {
      U.confirm('删除歌单', '确定删除歌单「' + p.name + '」？此操作不可恢复。', () => {
        DB.playlists.remove(p.id);
        U.toast('已删除歌单', 'ok');
        location.hash = '#/library';
      }, '删除');
    };
  });

  function render(app, tab) {
    const favs = DB.favs.list().map(id => DB.byId(id)).filter(Boolean);
    const lists = DB.playlists.list();
    const history = DB.history.list().map(h => ({ h, t: DB.byId(h.id) })).filter(o => o.t);
    const stats = DB.userStats();

    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">我的书架</h1>
      <p class="page-sub">收藏、歌单与播放历史全部保存在本机浏览器（localStorage），无需注册，不上传任何数据。</p>
      <div class="lib-tabs" role="tablist">
        <button data-tab="fav" class="${tab === 'fav' ? 'active' : ''}">♡ 收藏（${favs.length}）</button>
        <button data-tab="lists" class="${tab === 'lists' ? 'active' : ''}">📁 歌单（${lists.length}）</button>
        <button data-tab="history" class="${tab === 'history' ? 'active' : ''}">🕰 播放历史（${history.length}）</button>
      </div>
      <div id="libBody"></div>
    </div>`;

    const body = document.getElementById('libBody');

    if (tab === 'fav') {
      body.innerHTML = favs.length
        ? `<div style="margin-bottom:14px">${UI.playAllBtn(favs, '连续播放收藏')}</div>
           <div>${favs.map((t, i) => UI.listItem(t, i)).join('')}</div>`
        : UI.empty('♡', '还没有收藏。播放或浏览时点击 ♡ 即可收藏。', '<a class="btn" href="#/browse">去逛逛书库</a>');
    } else if (tab === 'lists') {
      body.innerHTML = `
        <div class="inline-form">
          <input type="text" id="newPlName" placeholder="新建歌单：输入名称，回车确认" maxlength="30">
          <button class="btn btn-primary" id="newPlBtn">＋ 新建歌单</button>
        </div>
        <div id="plRows">
          ${lists.length ? lists.map(p => `
            <div class="playlist-row">
              <div>
                <a class="pl-name" href="#/playlist/${p.id}">${U.escapeHtml(p.name)}</a>
                <span class="pl-count">${p.trackIds.length} 首</span>
              </div>
              <div class="pl-actions">
                <a class="btn btn-small" href="#/playlist/${p.id}">查看</a>
                <button class="btn btn-small" data-play-pl="${p.id}">▶ 播放</button>
                <button class="btn btn-small" data-del-pl="${p.id}" style="color:var(--accent)">删除</button>
              </div>
            </div>`).join('')
          : UI.empty('📁', '还没有自定义歌单，先新建一个吧。')}
        </div>`;
      const create = () => {
        const name = document.getElementById('newPlName').value.trim();
        if (!name) return U.toast('请输入歌单名称', 'warn');
        DB.playlists.create(name);
        U.toast('歌单「' + name + '」已创建', 'ok');
        render(app, 'lists');
      };
      document.getElementById('newPlBtn').onclick = create;
      document.getElementById('newPlName').onkeydown = e => { if (e.key === 'Enter') create(); };
      body.querySelectorAll('[data-play-pl]').forEach(b => {
        b.onclick = () => {
          const p = DB.playlists.byId(b.dataset.playPl);
          const l = p.trackIds.map(id => DB.byId(id)).filter(Boolean);
          if (!l.length) return U.toast('歌单为空', 'warn');
          Player.playAt(0, l);
        };
      });
      body.querySelectorAll('[data-del-pl]').forEach(b => {
        b.onclick = () => U.confirm('删除歌单', '确定删除该歌单？', () => {
          DB.playlists.remove(b.dataset.delPl);
          render(app, 'lists');
        }, '删除');
      });
    } else {
      body.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px">
          ${UI.playAllBtn(history.map(o => o.t), '重播全部历史')}
          <button class="btn" id="clearHis" style="color:var(--accent)">🗑 清空历史</button>
        </div>
        ${history.length ? `<div>${history.map((o, i) => historyItem(o, i)).join('')}</div>`
          : UI.empty('🕰', '还没有播放记录。', '<a class="btn" href="#/">去首页发现音乐</a>')}`;
      document.getElementById('clearHis').onclick = () => U.confirm('清空历史', '确定清空全部播放历史？', () => {
        DB.history.clear();
        render(app, 'history');
        U.toast('播放历史已清空', 'ok');
      }, '清空');
    }

    function historyItem(o, i) {
      const t = o.t;
      const item = UI.listItem(t, i);
      const wrap = document.createElement('div');
      wrap.innerHTML = item;
      const side = wrap.querySelector('.wli-side');
      if (side) {
        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = new Date(o.h.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        side.insertBefore(time, side.firstChild);
      }
      return wrap.innerHTML;
    }

    body.querySelectorAll && (function bind() {
      UI.bind(body, () => DB.sortBy(favs, 'heat'));
      UI.bindPlayAll(body, () => DB.sortBy(favs, 'heat'));
    })();

    app.querySelectorAll('[data-tab]').forEach(b => {
      b.onclick = () => {
        U.replaceHash('#/library/' + b.dataset.tab);
        render(app, b.dataset.tab);
      };
    });
  }
})();
