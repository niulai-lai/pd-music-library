/* =========================================================
 * views-scene.js — 场景推荐
 * 六大场景自动匹配风格/情绪/时长 → 一键生成可连续播放的歌单
 * ========================================================= */
(function () {
  'use strict';

  /* 场景匹配：scenes 显式标注优先，其次按 mood 关键词、时长上限打分 */
  const sceneOrder = {};   // 「重新生成」保存的洗牌顺序（会话内有效）
  function matchScene(scene) {
    const scored = DB.tracks.filter(t => t.audio).map(t => {
      let s = 0;
      if ((t.scenes || []).indexOf(scene.id) >= 0) s += 10;
      const moods = (t.tags || []);
      scene.moods.forEach(m => {
        if (moods.indexOf(m) >= 0) s += 3;
        // 部分匹配（如“安静”匹配“宁静”）
        if (moods.some(x => x.indexOf(m) >= 0 || m.indexOf(x) >= 0)) s += 1;
      });
      const dur = DB.durOf(t);
      if (dur && dur <= scene.maxDur) s += 1;
      if (dur && dur > scene.maxDur * 2) s -= 2;
      return { t, s };
    }).filter(o => o.s >= 3);
    scored.sort((a, b) => b.s - a.s || (DB.playCounts.get(b.t.id) - DB.playCounts.get(a.t.id)));
    let list = scored.map(o => o.t);
    if (sceneOrder[scene.id]) {
      const saved = sceneOrder[scene.id];
      list = list.slice().sort((a, b) => {
        const ia = saved.indexOf(a.id), ib = saved.indexOf(b.id);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
    }
    return list;
  }

  Router.register('scenes', function (app) {
    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">场景推荐</h1>
      <p class="page-sub">选择使用场景，图书馆自动匹配对应风格、情绪与时长的公有领域音乐，一键生成可连续播放的歌单。</p>
      <div class="scene-grid">
        ${DB.SCENES.map(s => {
          const n = matchScene(s).length;
          return `<div class="scene-card">
            <span class="sc-icon">${s.icon}</span>
            <h3>${s.name}</h3>
            <p>${U.escapeHtml(s.desc)}</p>
            <span class="sc-count">匹配到 ${n} 首可播放馆藏</span>
            <a class="btn btn-primary btn-small" href="#/scene/${s.id}">生成场景歌单 →</a>
          </div>`;
        }).join('')}
      </div>
      <div class="notice" style="margin-top:26px">场景歌单每次生成会综合匹配度、年代与您本机的播放记录微调顺序；歌单仅在本次会话有效，可用「收藏」或「加入歌单」长期保存。</div>
    </div>`;
  });

  Router.register('scenePlaylist', function (app, params) {
    const scene = DB.SCENES.find(s => s.id === params.sceneId);
    if (!scene) {
      app.innerHTML = `<div class="container">${UI.empty('🧭', '没有找到该场景。')}</div>`;
      return;
    }
    const list = matchScene(scene);
    document.title = scene.name + ' · 场景歌单';
    app.innerHTML = `
    <div class="container">
      <div class="crumbs"><a href="#/scenes">场景推荐</a> / ${scene.name}</div>
      <div class="playlist-head">
        <span class="ph-icon">${scene.icon}</span>
        <div style="flex:1">
          <h1 style="margin:0">${scene.name} · 场景歌单</h1>
          <p>${U.escapeHtml(scene.desc)}。匹配关键词：${scene.moods.join(' / ')}；时长上限 ${Math.round(scene.maxDur / 60)} 分钟。</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${UI.playAllBtn(list, '连续播放歌单')}
            <button class="btn" id="reshuffle">🔀 重新生成</button>
          </div>
        </div>
      </div>
      ${list.length
        ? `<div>${list.map((t, i) => UI.listItem(t, i)).join('')}</div>`
        : UI.empty('🧩', '该场景暂无匹配的馆藏，试试其他场景或浏览书库。')}
    </div>`;

    UI.bind(app, () => list);
    UI.bindPlayAll(app, () => list);
    document.getElementById('reshuffle').onclick = () => {
      const base = matchScene(scene).map(t => t.id);
      sceneOrder[scene.id] = U.shuffle(base);
      Router.render();
      U.toast('已重新生成「' + scene.name + '」歌单', 'ok', 1800);
    };
  });
})();
