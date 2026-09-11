/* =========================================================
 * views-browse.js — 分类浏览
 * 左：分类树 + 年代；右：多维筛选（作曲家/乐器/流派/表演者/场景）
 *     + 排序（热度/时间/名称）+ 网格/列表 + 分页或无限滚动
 * 筛选状态同步到地址栏（可分享、可回退），深链接可直接打开
 * ========================================================= */
(function () {
  'use strict';

  const PAGE = 12;
  const CAT_DESC = {
    '古典音乐': '巴赫至德彪西的古典与浪漫时期作品，含 Musopen 公益录音与 20 世纪上半叶历史唱片。',
    '民国老唱片': '清末民初（1901—1949）中国音乐历史录音与唱片档案，含田野蜡筒录音。',
    '戏曲曲艺': '京剧及地方戏曲的历史剧场实录，保留原生态唱腔。',
    '红色歌曲': '中国近现代革命历史歌曲档案，附手稿与首版唱片图档。',
    '民间音乐': '民族乐器与民间曲调，含现代 CC0 零版权录音。',
    '乐谱库': '公有领域乐谱扫描件与工尺谱档案，可放大预览、下载。'
  };

  Router.register('browse', function (app, params) {
    const st = {
      cat: params.cat || '',
      composer: params.composer || '',
      instrument: params.instrument || '',
      genre: params.genre || '',
      performer: params.performer || '',
      era: params.era || '',
      scene: params.scene || '',
      tag: params.tag || '',
      album: params.album || '',
      sort: params.sort || 'heat',
      view: params.view || 'grid',
      mode: params.mode || 'page',     // page | scroll
      page: parseInt(params.page, 10) || 1
    };

    app.innerHTML = `
      <div class="container">
        <h1 class="page-title">分类浏览</h1>
        <p class="page-sub">${U.escapeHtml(CAT_DESC[st.cat] || '按馆区、年代、作曲家、乐器、流派、表演者与场景多维检索全部馆藏。')}</p>
        <div class="browse-layout">
          <aside class="cat-tree" id="catTree">
            <h3>馆区分类</h3>
            <ul>
              <li><a href="#/browse" data-cat="">全部馆藏 <span class="cnt">${DB.tracks.length}</span></a></li>
              ${DB.CATEGORIES.map(c => `
                <li><a href="#/browse?cat=${encodeURIComponent(c)}" data-cat="${c}">${U.escapeHtml(c)}
                  <span class="cnt">${DB.tracks.filter(t => t.category === c).length}</span></a></li>`).join('')}
            </ul>
            <h3 style="margin-top:16px">年代</h3>
            <div class="chip-row" id="eraChips">
              ${[''].concat(DB.eras()).map(e => `<button class="chip ${st.era === e ? 'active' : ''}" data-era="${U.escapeHtml(e)}">${e || '全部'}</button>`).join('')}
            </div>
          </aside>
          <section id="browseMain"></section>
        </div>
      </div>`;

    const main = document.getElementById('browseMain');

    function applyFilters() {
      let list;
      if (st.album) {
        const a = DB.albumById(st.album);
        list = a ? DB.albumTracks(a) : [];
      } else {
        list = DB.filter({
          category: st.cat, composer: st.composer, instrument: st.instrument,
          genre: st.genre, performer: st.performer, era: st.era, scene: st.scene, tag: st.tag
        });
      }
      return DB.sortBy(list, st.sort);
    }

    function syncUrl() {
      const p = new URLSearchParams();
      Object.keys(st).forEach(k => { if (st[k] !== '' && !(k === 'page' && st.page === 1) && !(k === 'sort' && st.sort === 'heat') && !(k === 'view' && st.view === 'grid') && !(k === 'mode' && st.mode === 'page')) p.set(k, st[k]); });
      const qs = p.toString();
      U.replaceHash('#/browse' + (qs ? '?' + qs : ''));
    }

    function renderMain() {
      const list = applyFilters();
      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      if (st.page > pages) st.page = 1;
      const slice = st.mode === 'scroll' ? list.slice(0, st.page * PAGE) : list.slice((st.page - 1) * PAGE, st.page * PAGE);

      /* 筛选器选项（依据全库facet） */
      const opts = (field, label) => {
        const vals = DB.facetValues(field);
        if (!vals.length) return '';
        return `<select data-f="${field}" aria-label="${label}">
          <option value="">${label}：全部</option>
          ${vals.map(v => `<option ${st[field] === v ? 'selected' : ''}>${U.escapeHtml(v)}</option>`).join('')}
        </select>`;
      };
      const sceneOpts = `<select data-f="scene" aria-label="场景">
          <option value="">场景：全部</option>
          ${DB.SCENES.map(s => `<option value="${s.id}" ${st.scene === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>`;

      main.innerHTML = `
        <div class="filter-panel">
          <div class="filter-row">
            <span class="f-label">筛选</span>
            ${opts('composer', '作曲家')}${opts('instrument', '乐器')}${opts('genre', '流派')}
            ${opts('performer', '表演者')}${sceneOpts}
          </div>
          <div class="list-toolbar">
            <span class="result-info">共 <b>${list.length}</b> 件馆藏${st.cat ? ' · ' + U.escapeHtml(st.cat) : ''}${st.album ? ' · 专辑《' + U.escapeHtml((DB.albumById(st.album) || {}).title || '') + '》' : ''}</span>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <select data-f="sort" aria-label="排序方式">
                <option value="heat" ${st.sort === 'heat' ? 'selected' : ''}>按热度</option>
                <option value="new" ${st.sort === 'new' ? 'selected' : ''}>按时间（新→旧）</option>
                <option value="old" ${st.sort === 'old' ? 'selected' : ''}>按时间（旧→新）</option>
                <option value="name" ${st.sort === 'name' ? 'selected' : ''}>按名称</option>
                <option value="added" ${st.sort === 'added' ? 'selected' : ''}>按收录时间</option>
              </select>
              <div class="view-toggle" role="group" aria-label="视图切换">
                <button data-view="grid" class="${st.view === 'grid' ? 'active' : ''}">网格</button>
                <button data-view="list" class="${st.view === 'list' ? 'active' : ''}">列表</button>
              </div>
              <div class="view-toggle" role="group" aria-label="加载方式">
                <button data-mode="page" class="${st.mode === 'page' ? 'active' : ''}">分页</button>
                <button data-mode="scroll" class="${st.mode === 'scroll' ? 'active' : ''}">无限滚动</button>
              </div>
            </div>
          </div>
        </div>
        ${st.album ? albumBanner() : ''}
        <div id="resultZone">
          ${!list.length ? UI.empty('🔎', '没有符合条件的馆藏。试试清空筛选条件，或浏览其他馆区。',
            '<a class="btn" href="#/browse" style="margin-top:10px">清空筛选</a>')
            : st.view === 'grid'
              ? `<div class="work-grid">${slice.map(t => UI.workCard(t)).join('')}</div>`
              : `<div>${slice.map((t, i) => UI.listItem(t, (st.mode === 'scroll' ? (st.page - 1) * PAGE + i : (st.page - 1) * PAGE + i))).join('')}</div>`}
        </div>
        ${list.length && st.mode === 'page' ? pager(pages) : ''}
        ${list.length && st.mode === 'scroll' && slice.length < list.length ? '<div class="load-more-hint" id="scrollSentinel">下滑自动加载更多…</div>' : ''}
        ${list.length && st.mode === 'scroll' && slice.length >= list.length && list.length > PAGE ? '<div class="load-more-hint">— 已加载全部 —</div>' : ''}
      `;
      bindMain(list);

      function albumBanner() {
        const a = DB.albumById(st.album);
        if (!a) return '';
        return `<div class="playlist-head">
          <span class="ph-icon">💿</span>
          <div>
            <h2 style="margin:0">${U.escapeHtml(a.title)}</h2>
            <p>${U.escapeHtml(a.desc || '')}</p>
            ${UI.playAllBtn(list, '播放整张专辑')}
          </div>
        </div>`;
      }
      function pager(pages) {
        let btns = '';
        const add = (label, page, cur, dis) =>
          `<button ${dis ? 'disabled' : ''} class="${cur ? 'cur' : ''}" data-page="${page}">${label}</button>`;
        btns += add('‹ 上一页', st.page - 1, false, st.page <= 1);
        for (let i = 1; i <= pages; i++) {
          if (pages > 9 && i > 3 && i < pages - 2 && Math.abs(i - st.page) > 1) {
            if (i === 4) btns += add('…', st.page, false, true);
            continue;
          }
          btns += add(String(i), i, i === st.page, false);
        }
        btns += add('下一页 ›', st.page + 1, false, st.page >= pages);
        return `<div class="pagination">${btns}</div>`;
      }
      function bindMain(list) {
        UI.bind(main, () => list);
        UI.bindPlayAll(main, () => list);
        UI.observeLazy(main);
        main.querySelectorAll('select[data-f]').forEach(sel => {
          sel.onchange = () => {
            const f = sel.dataset.f;
            st[f] = sel.value;
            st.page = 1;
            syncUrl(); renderMain();
          };
        });
        main.querySelectorAll('[data-view]').forEach(b => {
          b.onclick = () => { st.view = b.dataset.view; syncUrl(); renderMain(); };
        });
        main.querySelectorAll('[data-mode]').forEach(b => {
          b.onclick = () => { st.mode = b.dataset.mode; st.page = 1; syncUrl(); renderMain(); };
        });
        main.querySelectorAll('[data-page]').forEach(b => {
          if (b.disabled) return;
          b.onclick = () => { st.page = parseInt(b.dataset.page, 10); syncUrl(); renderMain(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
        });
        // 无限滚动：接近页面底部时追加下一页（滚动监听 + 轻量轮询兜底）
        if (st.mode === 'scroll' && slice.length < list.length) {
          let dead = false;
          const tryLoad = () => {
            if (dead) return;
            const bottom = document.documentElement.scrollHeight || document.body.scrollHeight;
            if (window.innerHeight + window.scrollY >= bottom - 600) {
              dead = true;
              window.removeEventListener('scroll', onScroll);
              clearInterval(poll);
              st.page += 1;
              syncUrl();
              renderMain();
            }
          };
          const onScroll = () => tryLoad();
          window.addEventListener('scroll', onScroll);
          const poll = setInterval(() => {
            if (Router.current !== 'browse') { clearInterval(poll); return; }
            tryLoad();
          }, 700);
        }
      }
    }

    /* 分类树 / 年代交互 */
    document.getElementById('catTree').addEventListener('click', e => {
      const a = e.target.closest('a[data-cat]');
      if (a) {
        e.preventDefault();
        st.cat = a.dataset.cat; st.page = 1;
        syncUrl(); renderMain();
        document.getElementById('catTree').querySelectorAll('a[data-cat]').forEach(x =>
          x.classList.toggle('active', x.dataset.cat === st.cat));
        document.querySelector('.page-sub').textContent = CAT_DESC[st.cat] || '按馆区、年代、作曲家、乐器、流派、表演者与场景多维检索全部馆藏。';
        return;
      }
      const chip = e.target.closest('[data-era]');
      if (chip) {
        st.era = chip.dataset.era; st.page = 1;
        document.getElementById('eraChips').querySelectorAll('.chip').forEach(x =>
          x.classList.toggle('active', x === chip));
        syncUrl(); renderMain();
      }
    });
    document.getElementById('catTree').querySelectorAll('a[data-cat]').forEach(x =>
      x.classList.toggle('active', x.dataset.cat === st.cat));

    renderMain();
  });

  /* 专辑深链接：#/browse?album=xxx 由本视图处理 */
})();
