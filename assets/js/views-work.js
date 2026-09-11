/* =========================================================
 * views-work.js — 作品详情页
 * 完整元数据 / 背景介绍 / 网页播放 / 下载（大小与音质标注）
 * 版本对比（并排试听）/ 乐谱预览（灯箱缩放）/ 关联推荐
 * ========================================================= */
(function () {
  'use strict';

  function dlSizeText(t, a) {
    // sizeMB 已在数据中核verified；同时提供来源页
    return U.fmtSize(a.sizeMB);
  }

  Router.register('work', function (app, params) {
    const t = DB.byId(params.id);
    if (!t) {
      app.innerHTML = `<div class="container">${UI.empty('🗂', '没有找到这件馆藏，可能已被移除或链接有误。',
        '<a class="btn" href="#/browse" style="margin-top:10px">去书库看看</a>')}</div>`;
      return;
    }
    const dur = DB.durOf(t);
    document.title = t.title + ' · 公有领域音乐图书馆';

    /* 版本对比列表 */
    const versions = (t.versions || []).map(id => DB.byId(id)).filter(Boolean);
    const isVersionOf = DB.tracks.filter(x => (x.versions || []).indexOf(t.id) >= 0);

    /* 关联推荐：同作者 > 同分类 > 同标签 */
    const related = DB.tracks.filter(x => x.id !== t.id && !((t.versions || []).indexOf(x.id) >= 0))
      .map(x => {
        let s = 0;
        if (x.composer === t.composer && t.composer !== '佚名') s += 5;
        if (x.category === t.category) s += 2;
        if (x.genre && x.genre === t.genre) s += 2;
        s += x.tags.filter(g => t.tags.indexOf(g) >= 0).length;
        return { x, s };
      }).filter(o => o.s >= 3).sort((a, b) => b.s - a.s).slice(0, 6).map(o => o.x);

    const playingNow = Player.curTrack && Player.curTrack.id === t.id && Player.state().playing;

    app.innerHTML = `
    <div class="container">
      <div class="crumbs"><a href="#/">首页</a> / <a href="#/browse">${U.escapeHtml(t.category)}</a> / ${U.escapeHtml(t.title)}</div>
      <div class="work-detail">
        <div class="detail-main">
          <header class="work-header">
            <h1>${U.escapeHtml(t.title)}</h1>
            ${t.titleEn ? `<div class="wd-sub">${U.escapeHtml(t.titleEn)}</div>` : ''}
            <div class="wd-sub">${U.escapeHtml(t.composer)}${t.composerLife ? '（' + U.escapeHtml(t.composerLife) + '）' : ''} · ${U.escapeHtml(t.performer)}</div>
            <div class="wd-badges">
              <span class="badge badge-red">${U.escapeHtml(t.category)}</span>
              <span class="badge badge-pd">${U.escapeHtml(t.source && t.source.license || '公有领域')}</span>
              ${t.rare ? '<span class="badge badge-gold">冷门珍品</span>' : ''}
              ${!t.audio && (t.scores || []).length ? '<span class="badge">档案条目 · 暂无音频</span>' : ''}
            </div>
          </header>

          <section class="section">
            <h3 style="border-bottom:1px solid var(--line);padding-bottom:8px">作品信息</h3>
            <table class="info-table">
              <tr><th>作品名称</th><td>${U.escapeHtml(t.title)}${t.titleEn ? '<br><small style="color:var(--ink-faint)">' + U.escapeHtml(t.titleEn) + '</small>' : ''}</td></tr>
              <tr><th>作者</th><td>${U.escapeHtml(t.composer)}${t.composerEn ? '（' + U.escapeHtml(t.composerEn) + '）' : ''}${t.composerLife ? ' · 生卒 ' + U.escapeHtml(t.composerLife) : ''}</td></tr>
              <tr><th>表演者</th><td>${U.escapeHtml(t.performer)}${t.performerDetail ? '<br><small style="color:var(--ink-faint)">' + U.escapeHtml(t.performerDetail) + '</small>' : ''}</td></tr>
              <tr><th>录制年份</th><td>${U.escapeHtml(String(t.recordedYear || '年份未详'))}${t.era ? ' · ' + U.escapeHtml(t.era) : ''}</td></tr>
              <tr><th>时长</th><td id="durCell">${dur ? U.fmtTime(dur) : '待播放时自动读取'}</td></tr>
              <tr><th>格式</th><td>${t.audio ? U.escapeHtml(t.audio.format || '—') + ' · ' + U.escapeHtml(t.audio.quality || '') : '纯乐谱条目'}</td></tr>
              <tr><th>流派 / 乐器</th><td>${U.escapeHtml(t.genre || '—')} · ${U.escapeHtml(t.instrument || '—')}</td></tr>
              <tr><th>版权状态</th><td><b>${U.escapeHtml(t.source && t.source.license || 'Public domain')}</b><br><small style="color:var(--ink-soft)">${U.escapeHtml(t.source && t.source.licenseNote || '')}</small></td></tr>
              <tr><th>来源出处</th><td><a href="${U.escapeHtml(t.source.page)}" target="_blank" rel="noopener">${U.escapeHtml(t.source.name)}（来源页链接 ↗）</a><br>
                <small style="color:var(--ink-faint)">文件页含完整权利说明与数字化信息</small></td></tr>
              ${t.tags.length ? `<tr><th>标签</th><td><div class="chip-row">${t.tags.map(x => `<a class="chip" href="#/browse?tag=${encodeURIComponent(x)}">${U.escapeHtml(x)}</a>`).join('')}</div></td></tr>` : ''}
            </table>
          </section>

          <section class="section">
            <div class="panel">
              <h3>背景介绍</h3>
              <p class="bg-text">${U.escapeHtml(t.background)}</p>
            </div>
          </section>

          ${versions.length || isVersionOf.length ? versionSection() : ''}
          ${(t.scores || []).length ? scoreSection() : ''}
          ${related.length ? `
          <section class="section">
            ${UI.sectionHead('关联推荐 · 同作者 / 同时期 / 同风格')}
            <div class="work-grid">${related.map(x => UI.workCard(x)).join('')}</div>
          </section>` : ''}
        </div>

        <aside class="detail-side">
          <div class="panel action-col">
            ${t.audio
              ? `<button class="btn btn-primary" id="bigPlay">▶ ${playingNow ? '播放中… 点击暂停' : '播放本作品'}</button>`
              : '<span class="notice" style="text-align:left">本条目为档案/乐谱条目，暂无音频。原因与获取途径见下方说明。</span>'}
            <button class="btn" id="favBtn">${DB.favs.has(t.id) ? '♥ 已收藏' : '♡ 收藏'}</button>
            <button class="btn" id="plBtn">📁 加入歌单</button>
            ${(t.scores || []).length ? '<button class="btn" id="scoreBtn">📜 预览乐谱</button>' : ''}
          </div>

          ${t.audio ? downloadPanel() : ''}
          ${!t.audio ? archivePanel() : ''}

          <div class="panel">
            <h3>合规提示</h3>
            <p class="bg-text" style="font-size:.86rem">本作品标注为<b>${U.escapeHtml(t.source && t.source.license || '公有领域')}</b>，标注以来源页为准；如用于商业用途，请先自行核实权利状态。发现侵权请联系本站移除。</p>
          </div>
        </aside>
      </div>
    </div>`;

    function downloadPanel() {
      const a = t.audio;
      const alts = t.audioAlt || [];
      return `
      <div class="panel">
        <h3>下载</h3>
        <table class="dl-table">
          <tr>
            <td><b>${U.escapeHtml(a.format || '音频')}</b><span class="dl-quality">${U.escapeHtml(a.quality || '')} · ${dlSizeText(t, a)}</span></td>
            <td style="text-align:right"><a class="btn btn-small" href="${U.escapeHtml(a.url)}" target="_blank" rel="noopener" download>下载 ↗</a></td>
          </tr>
          ${alts.map(x => `
          <tr>
            <td><b>${U.escapeHtml(x.format || '音频')}</b><span class="dl-quality">${U.escapeHtml(x.quality || '')} · ${U.fmtSize(x.sizeMB)}</span></td>
            <td style="text-align:right"><a class="btn btn-small" href="${U.escapeHtml(x.url)}" target="_blank" rel="noopener" download>下载 ↗</a></td>
          </tr>`).join('')}
          ${(t.scores || []).map(s => `
          <tr>
            <td><b>乐谱</b><span class="dl-quality">${U.escapeHtml(s.label || '扫描件')}</span></td>
            <td style="text-align:right"><a class="btn btn-small" href="${U.escapeHtml(s.url)}" target="_blank" rel="noopener">查看 ↗</a></td>
          </tr>`).join('')}
        </table>
        <p style="font-size:.78rem;color:var(--ink-faint);margin:8px 0 0">文件托管于来源档案库，直接从原站下载；跨域链接在新标签打开。</p>
      </div>`;
    }

    function archivePanel() {
      return `
      <div class="panel">
        <h3>档案条目说明</h3>
        <p class="bg-text" style="font-size:.88rem">${U.escapeHtml(t.audioNote || '本条目暂无外链音频。')}</p>
      </div>`;
    }

    function versionSection() {
      const cards = [];
      const mk = (x, main) => `
        <div class="version-card ${main ? 'now' : ''}">
          <span class="vc-title">${main ? '本页版本 · ' : ''}${U.escapeHtml(x.performer)}</span>
          <span class="vc-meta">${U.escapeHtml(String(x.recordedYear || '年份未详'))} · ${U.escapeHtml(x.audio ? x.audio.format : '无音频')} · ${x.audio ? U.fmtSize(x.audio.sizeMB) : ''}</span>
          <span class="vc-meta">${U.escapeHtml((x.performerDetail || '').slice(0, 60))}</span>
          ${x.audio ? `<button class="btn btn-small btn-primary" data-vplay="${x.id}">▶ 试听此版本</button>` : `<a class="btn btn-small" href="#/work/${x.id}">查看档案</a>`}
          <a class="btn btn-small" href="#/work/${x.id}">详情页</a>
        </div>`;
      cards.push(mk(t, true));
      versions.forEach(v => cards.push(mk(v, false)));
      isVersionOf.forEach(v => cards.push(mk(v, false)));
      return `
      <section class="section">
        ${UI.sectionHead('版本对比 · 同一作品的不同录音')}
        <p class="page-sub">并排展示同一首曲子的不同历史录音，可分别播放对比演绎差异。</p>
        <div class="version-grid">${cards.join('')}</div>
      </section>`;
    }

    function scoreSection() {
      return `
      <section class="section">
        ${UI.sectionHead('乐谱预览')}
        <p class="page-sub">点击放大可缩放平移查看；均来自公有领域档案扫描件，可下载原图。</p>
        <div class="score-grid">
          ${(t.scores || []).map((s, i) => `
            <figure class="score-item" style="margin:0">
              <img data-src="${U.escapeHtml(thumbUrl(s.url))}" data-full="${U.escapeHtml(s.url)}"
                   alt="${U.escapeHtml(s.label || '乐谱 ' + (i + 1))}" loading="lazy">
              <figcaption class="sc-bar">
                <span>${U.escapeHtml(s.label || '乐谱 ' + (i + 1))}</span>
                <a href="${U.escapeHtml(s.url)}" target="_blank" rel="noopener">下载原图</a>
              </figcaption>
            </figure>`).join('')}
        </div>
      </section>`;
    }

    function thumbUrl(url) {
      // Wikimedia 原图转缩略图，减小页面加载量
      const m = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([^/]+)\/(.+)$/);
      if (!m) return url;
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/' + m[1] + '/' + m[2] +
        '/500px-' + m[2];
    }

    /* 行为绑定 */
    const bigPlay = document.getElementById('bigPlay');
    if (bigPlay) {
      bigPlay.onclick = () => {
        const st = Player.state();
        if (st.track && st.track.id === t.id) { Player.toggle(); return; }
        // 与版本一起入队，便于连续对比
        const queue = [t].concat(versions.filter(v => v.audio));
        Player.playAt(0, queue);
      };
    }
    document.getElementById('favBtn').onclick = e => UI.favToggle(t.id, e.currentTarget);
    document.getElementById('plBtn').onclick = () => UI.addToListModal(t.id);
    const scoreBtn = document.getElementById('scoreBtn');
    if (scoreBtn) scoreBtn.onclick = () => {
      const s = (t.scores || [])[0];
      if (s) U.lightboxOpen(s.url, s.label, s.url);
    };
    app.querySelectorAll('[data-vplay]').forEach(b => {
      b.onclick = () => {
        const v = DB.byId(b.dataset.vplay);
        const group = [t].concat(versions).filter(x => x.audio);
        Player.playTrack(v, group.length > 1 ? group : null);
      };
    });
    // 乐谱图片 → 灯箱；缩略图加载失败时回退原图
    app.querySelectorAll('.score-item img').forEach(img => {
      img.onerror = () => {
        if (img.dataset.full && img.src !== img.dataset.full) img.src = img.dataset.full;
      };
      img.onclick = () => U.lightboxOpen(img.dataset.full || img.src, img.alt, img.dataset.full);
    });
    UI.bind(app, () => [t].concat(related));
    UI.observeLazy(app);
    // 版本页头播放态同步
    Player.on('change', function syncHd() {
      const st = Player.state();
      if (bigPlay) bigPlay.textContent = (st.track && st.track.id === t.id && st.playing) ? '⏸ 播放中… 点击暂停' : '▶ 播放本作品';
    });
    // 时长自动回填
    Player.on('progress', st => {
      if (st.track && st.track.id === t.id && st.dur) {
        const cell = document.getElementById('durCell');
        if (cell) cell.textContent = U.fmtTime(st.dur);
      }
    });
  });
})();
