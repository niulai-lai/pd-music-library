/* =========================================================
 * views-home.js — 首页
 * 精选推荐 / 精选专辑 / 冷门珍品 / 场景歌单 / 最新收录 / 热门播放 / 随机推荐
 * ========================================================= */
(function () {
  'use strict';

  Router.register('home', function (app) {
    const total = DB.tracks.length;
    const byCat = {};
    DB.CATEGORIES.forEach(c => { byCat[c] = DB.tracks.filter(t => t.category === c).length; });
    const featured = DB.tracks.filter(t => t.featured);
    const rare = DB.tracks.filter(t => t.rare);
    const newest = DB.sortBy(DB.tracks, 'added').slice(0, 8);
    const hot = DB.sortBy(DB.tracks, 'heat').slice(0, 8);
    const albums = DB.albums || [];
    const rand = U.shuffle(DB.tracks.filter(t => t.audio)).slice(0, 4);

    app.innerHTML = `
    <div class="container">
      <section class="hero">
        <h1>公有领域音乐图书馆</h1>
        <p>收录版权保护期已满的古典音乐、历史录音、戏曲曲艺、红色歌曲、民间音乐与乐谱。每一件馆藏均可溯源，外链直取自 Wikimedia Commons 等公开档案，仅供学习、研究与创作使用。</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/browse">进入书库浏览</a>
          <a class="btn" href="#/scenes">按场景挑选</a>
          <a class="btn" href="#/about">收录规范</a>
        </div>
        <div class="hero-stats">
          <div><b>${total}</b><span>馆藏条目</span></div>
          <div><b>${DB.CATEGORIES.length}</b><span>分类馆区</span></div>
          <div><b>${new Set(DB.tracks.map(t => t.composer)).size}</b><span>作曲家 / 作者</span></div>
          <div><b>100%</b><span>标注版权来源</span></div>
        </div>
      </section>

      <section class="section">
        ${UI.sectionHead('分类馆区', '#/browse', '全部筛选 →')}
        <div class="cat-grid">
          ${DB.CATEGORIES.map(c => `
            <a class="cat-card" href="#/browse?cat=${encodeURIComponent(c)}">
              <span class="cat-icon">${UI.catIcon(c)}</span>
              <b>${c}</b>
              <span>${byCat[c] || 0} 件馆藏</span>
            </a>`).join('')}
        </div>
      </section>

      <section class="section">
        ${UI.sectionHead('精选推荐', '#/browse?sort=heat')}
        ${featured.length ? `<div class="work-grid">${featured.slice(0, 8).map(t => UI.workCard(t)).join('')}</div>`
          : UI.empty('🈳', '暂无精选条目')}
      </section>

      ${albums.length ? `
      <section class="section">
        ${UI.sectionHead('精选专辑')}
        <div class="cat-grid">
          ${albums.map(a => {
            const n = (a.trackIds || []).length;
            return `<a class="cat-card" href="#/browse?album=${a.id}">
              <span class="cat-icon">💿</span><b>${U.escapeHtml(a.title)}</b>
              <span>${n} 首 · ${U.escapeHtml(a.desc || '')}</span></a>`;
          }).join('')}
        </div>
      </section>` : ''}

      <section class="section">
        ${UI.sectionHead('冷门珍品 · 馆藏深处的声音', '#/browse?sort=name')}
        ${rare.length ? `<div class="work-grid">${rare.slice(0, 4).map(t => UI.workCard(t)).join('')}</div>`
          : UI.empty('🗄', '暂无冷门珍品条目')}
      </section>

      <section class="section">
        ${UI.sectionHead('场景歌单 · 一键生成', '#/scenes', '全部场景 →')}
        <div class="cat-grid">
          ${DB.SCENES.map(s => `
            <a class="cat-card" href="#/scene/${s.id}">
              <span class="cat-icon">${s.icon}</span><b>${s.name}</b>
              <span>${U.escapeHtml(s.desc)}</span>
            </a>`).join('')}
        </div>
      </section>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px">
        <section class="section">
          ${UI.sectionHead('最新收录')}
          ${newest.map((t, i) => UI.listItem(t, i)).join('')}
        </section>
        <section class="section">
          ${UI.sectionHead('热门播放', null)}
          ${hot.map((t, i) => UI.listItem(t, i)).join('')}
        </section>
      </div>

      <section class="section" id="randomZone">
        ${UI.sectionHead('随机推荐 · 开盲盒')}
        <div class="work-grid">${rand.map(t => UI.workCard(t)).join('')}</div>
        <div style="margin-top:14px"><button class="btn" id="shuffleBtn">🎲 换一批</button></div>
      </section>
    </div>`;

    UI.bind(app, () => DB.sortBy(DB.tracks, 'heat'));
    UI.observeLazy(app);
    document.getElementById('shuffleBtn').onclick = () => {
      const zone = document.querySelector('#randomZone .work-grid');
      const next = U.shuffle(DB.tracks.filter(t => t.audio)).slice(0, 4);
      zone.innerHTML = next.map(t => UI.workCard(t)).join('');
      UI.bind(zone, () => DB.tracks);
      UI.observeLazy(zone);
    };
  });
})();
