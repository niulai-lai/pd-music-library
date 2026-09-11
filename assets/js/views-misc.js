/* =========================================================
 * views-misc.js — 搜索结果 / 资源来源 / 关于本站 / 数据管理 / 404
 * ========================================================= */
(function () {
  'use strict';

  /* ---------- 搜索结果 ---------- */
  Router.register('search', function (app, params) {
    const q = params.q || '';
    const results = SE.search(q);
    document.title = '搜索：' + q;
    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">搜索结果</h1>
      <p class="page-sub">关键词「${U.escapeHtml(q)}」 · 支持中文、拼音全拼与首字母（如 <a href="#/search?q=${encodeURIComponent('beiduofen')}">beiduofen</a> 或 <a href="#/search?q=${encodeURIComponent('bdf')}">bdf</a>）</p>
      <div class="list-toolbar">
        <span class="result-info">找到 <b>${results.length}</b> 条相关馆藏</span>
        <div style="display:flex;gap:10px">
          <button class="btn btn-small" id="sqPlayAll" ${results.length ? '' : 'disabled'}>▶ 播放全部结果</button>
        </div>
      </div>
      ${results.length
        ? `<div>${results.map((r, i) => UI.listItem(r.track, i, { q })).join('')}</div>`
        : UI.empty('🔍', '没有找到相关作品。可以试试：更短的关键词、作者姓名、或作品的拼音。', `
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              ${['贝多芬', 'beiduofen', '京剧', '茉莉花', 'chopin'].map(k =>
                `<a class="chip" href="#/search?q=${encodeURIComponent(k)}">${k}</a>`).join('')}
            </div>`)}
    </div>`;
    const list = results.map(r => r.track);
    UI.bind(app, () => list);
    UI.bindPlayAll(app, () => list);
  });

  /* ---------- 资源来源 ---------- */
  Router.register('sources', function (app) {
    const SOURCES = [
      {
        name: 'Wikimedia Commons（维基共享资源）', url: 'https://commons.wikimedia.org/',
        license: '收录文件均标注 Public domain 或 CC0/公有领域等同许可',
        rule: '本站音频与乐谱扫描件的主要直链来源。每份文件都有独立文件页，载明作者、许可协议与数字化来源，支持外链与 CORS。本馆引用的文件均逐一经 API 核对许可标注。'
      },
      {
        name: 'Musopen（无私有版权古典录音计划）', url: 'https://musopen.org/',
        license: '由公益乐团录制并声明释放入公有领域',
        rule: 'Musopen Symphony 等乐团专门录制版权已过期作品并以公有领域发布。本站古典馆区的乐团录音经 Commons 转存渠道引用，许可状态以 Commons 文件页为准。'
      },
      {
        name: 'IMSLP 国际乐谱图书馆（Petrucci 音乐图书馆）', url: 'https://imslp.org/',
        license: '公有领域乐谱扫描件（各自页面标注许可）',
        rule: '全球最大的公有领域乐谱库，收录超过 70 万份乐谱。因站点禁止热链接，本站乐谱扫描件采用 Commons 上的同源扫描，IMSLP 作为延伸查阅入口。'
      },
      {
        name: '互联网档案馆 Internet Archive · 中国老唱片', url: 'https://archive.org/details/audio',
        license: '按每件藏品标注（多为 1925 年前美国公有领域录音）',
        rule: '「Great 78 Project」与 George Blood 数字化工程转录了大量中国 78 转唱片。因区域网络可达性与逐件许可核查需要，本站暂以 Commons 已核可文件为主，此处作为延伸检索入口。'
      },
      {
        name: '中国国家图书馆 · 中国记忆项目 / 老唱片资源', url: 'http://www.nlc.cn/',
        license: '馆方自建资源，使用条款以馆方网站为准',
        rule: '收录民国老唱片、口述史料与地方戏曲影像。属公益文化机构资源，本站不直接外链其音频，仅作为权威考证与延伸阅读入口。'
      },
      {
        name: 'Free Music Archive（自由音乐档案）', url: 'https://freemusicarchive.org/',
        license: '按曲目标注 CC0 / CC-BY / CC-BY-SA 等自由许可',
        rule: '只收录其中明确标注 CC0（公有领域贡献）的曲目；需署名的 CC-BY 曲目不在本馆收录范围（本馆红线：仅收 PD 与 CC0）。'
      },
      {
        name: 'Open Music Archive（开放音乐档案）', url: 'https://openmusicarchive.org/',
        license: '英国版权已届满的早期录音，逐件标注',
        rule: '由艺术家 Eileen Simpson 与 Ben White 运营的开放文化项目，聚焦版权已过期的英国早期录音，可自由下载与再创作。'
      }
    ];
    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">资源来源</h1>
      <p class="page-sub">本站只收录公有领域（Public domain）与 CC0 资源。以下是馆藏的来源档案库、对应版权说明与本馆收录规则。</p>
      <div class="source-grid">
        ${SOURCES.map(s => `
          <div class="source-card">
            <h3>${U.escapeHtml(s.name)}</h3>
            <a class="src-url" href="${U.escapeHtml(s.url)}" target="_blank" rel="noopener">${U.escapeHtml(s.url)} ↗</a>
            <p class="src-rule"><b>版权说明：</b>${U.escapeHtml(s.license)}</p>
            <p class="src-rule"><b>本馆收录规则：</b>${U.escapeHtml(s.rule)}</p>
          </div>`).join('')}
      </div>
      <div class="notice" style="margin-top:24px">
        收录红线：仍在版权保护期内的流行音乐、当代音乐与商业唱片一律不收；不提供任何盗版链接；不收录未经授权的翻唱、重制版与当代商业录音。完整规范见
        <a href="#/about#policy">收录规范</a> 与 <a href="docs/collection-policy.md" target="_blank" rel="noopener">《公有领域音乐收录规范》</a>。
      </div>
    </div>`;
  });

  /* ---------- 关于本站 ---------- */
  Router.register('about', function (app) {
    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">关于本站</h1>
      <div class="about-block">
        <h3 id="mission">定位</h3>
        <p>「公有领域音乐图书馆」是一个纯静态、免注册、无广告的公益资料站：把分散在各大档案库里的公有领域音乐整理成可以按分类浏览、按场景取用的「数字书库」，每件馆藏都可溯源。</p>

        <h3>版权红线（第一优先级）</h3>
        <ul>
          <li>只收录<b>版权保护期已满</b>的作品：作者（及词曲相关权利人）去世满 50 年的古典、民间、戏曲、历史歌曲；录制发行已进入公有领域的老唱片；明确标注 CC0 / 公有领域、可自由商用的录音与乐谱。</li>
          <li>不收录仍在保护期内的流行音乐、当代音乐与商业唱片；不提供任何盗版链接；不收录未授权翻唱与当代商业重制录音。</li>
          <li>每首作品完整标注：名称、作者与生卒年、表演者、录制年份、时长、格式、版权状态、来源链接。</li>
          <li>音频与乐谱一律外链公开档案库（Wikimedia Commons 等），本站不存储文件。</li>
        </ul>

        <h3 id="policy">收录规范摘要</h3>
        <p>中国大陆著作权法：作者财产权保护期为<b>终生加去世后 50 年</b>；录音制作者权为<b>首次固定完成后 50 年</b>。美国按《音乐现代化法案》：1925 年及以前录制的唱片已进入公有领域。跨辖区作品取「更严格者」执行——即至少在来源库所属辖区与主要访问辖区均属公有领域，或权利人明确声明 CC0。完整文档见 <a href="docs/collection-policy.md" target="_blank" rel="noopener">docs/collection-policy.md</a>，上架前逐条核对见 <a href="docs/compliance-checklist.md" target="_blank" rel="noopener">docs/compliance-checklist.md</a>。</p>

        <h3>技术</h3>
        <p>纯 HTML + CSS + 原生 JavaScript，无后端、无构建步骤、无第三方运行时依赖；播放器基于 Web Audio API（增益淡入淡出、电平可视化、双通道交叉接续）；数据以 JSON 存储，支持 CSV/JSON 批量导入导出；个人数据（收藏、歌单、历史）保存在浏览器 localStorage。</p>

        <h3>键盘快捷键</h3>
        <table class="field-table" style="max-width:560px">
          <tr><th>空格</th><td>播放 / 暂停</td></tr>
          <tr><th>← / →</th><td>快退 / 快进 5 秒</td></tr>
          <tr><th>↑ / ↓</th><td>音量 +10% / -10%</td></tr>
          <tr><th>N / P</th><td>下一首 / 上一首</td></tr>
          <tr><th>L</th><td>循环模式（关闭→列表→单曲）</td></tr>
          <tr><th>R</th><td>倍速（0.75→1→1.25→1.5→2）</td></tr>
          <tr><th>M</th><td>静音</td></tr>
          <tr><th>F</th><td>收藏当前曲目</td></tr>
        </table>

        <h3>免责声明</h3>
        <div class="notice">本站所有内容均来自公开公有领域资源，仅供学习、研究、创作使用。作品版权状态以来源标注为准，商用前请自行核实。如您认为内容侵犯版权，请联系立即移除。</div>
      </div>
    </div>`;
  });

  /* ---------- 数据管理 ---------- */
  Router.register('data', function (app) {
    const stats = DB.userStats();
    app.innerHTML = `
    <div class="container">
      <h1 class="page-title">数据管理</h1>
      <p class="page-sub">馆藏数据存于 <code>data/music.json</code>；本页提供批量导入（CSV / JSON）、导出与模板下载。导入条目保存在浏览器本地，与内置馆藏合并展示。</p>

      <div class="section" style="display:flex;gap:26px;flex-wrap:wrap">
        <div class="panel" style="min-width:180px"><h3 style="border:0">内置馆藏</h3><b style="font-size:1.6rem;color:var(--accent)">${stats.builtIn}</b> 条</div>
        <div class="panel" style="min-width:180px"><h3 style="border:0">本地导入</h3><b style="font-size:1.6rem;color:var(--accent)">${stats.imported}</b> 条</div>
        <div class="panel" style="min-width:180px"><h3 style="border:0">收藏</h3><b style="font-size:1.6rem;color:var(--accent)">${stats.favs}</b> 首</div>
        <div class="panel" style="min-width:180px"><h3 style="border:0">歌单</h3><b style="font-size:1.6rem;color:var(--accent)">${stats.playlists}</b> 个</div>
      </div>

      <div class="section data-zone">
        <div class="panel">
          <h3>导入 CSV</h3>
          <p class="bg-text" style="font-size:.86rem">表头使用中文字段（标题,作者,生卒年,表演者,录制年份,分类,标签,音频链接,乐谱链接,来源,来源名称,版权状态,背景介绍,场景,流派,乐器,时长秒）。可先下载模板填写。</p>
          <input type="file" id="csvFile" accept=".csv,text/csv" style="margin:8px 0">
          <textarea id="csvText" placeholder="或直接粘贴 CSV 内容…"></textarea>
          <button class="btn btn-primary" id="csvImport" style="margin-top:8px">导入 CSV</button>
          <a class="btn" href="data/import-template.csv" download style="margin-top:8px;margin-left:6px">下载 CSV 模板</a>
        </div>
        <div class="panel">
          <h3>导入 JSON</h3>
          <p class="bg-text" style="font-size:.86rem">接受条目数组或 <code>{"tracks":[…]}</code>；字段见 <a href="data/import-template.json" download>JSON 模板</a>。合规必填：标题、音频或乐谱链接、来源链接。</p>
          <input type="file" id="jsonFile" accept=".json,application/json" style="margin:8px 0">
          <textarea id="jsonText" placeholder='或直接粘贴 JSON：[{"title":"…","audioUrl":"…","sourceUrl":"…"}]'></textarea>
          <button class="btn btn-primary" id="jsonImport" style="margin-top:8px">导入 JSON</button>
          <a class="btn" href="data/import-template.json" download style="margin-top:8px;margin-left:6px">下载 JSON 模板</a>
        </div>
      </div>

      <div class="section data-zone">
        <div class="panel">
          <h3>导出</h3>
          <p class="bg-text" style="font-size:.86rem">导出本地导入的条目，备份或再批量提交进 <code>music.json</code>。</p>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn" id="expJson">导出 JSON</button>
            <button class="btn" id="expCsv">导出 CSV</button>
            <button class="btn" id="expAll">导出全部个人数据（含收藏/歌单/历史）</button>
          </div>
        </div>
        <div class="panel">
          <h3>危险操作</h3>
          <p class="bg-text" style="font-size:.86rem">清空操作不可恢复（仅影响本机浏览器数据）。</p>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn" id="clrImport">清空本地导入条目</button>
            <button class="btn" id="clrPlay">清空播放记录与热度</button>
            <button class="btn" id="clrAll" style="color:var(--accent);border-color:var(--accent)">清空全部本地数据</button>
          </div>
        </div>
      </div>

      <div class="section panel import-result" id="importResult" hidden></div>

      <div class="section panel">
        <h3>字段说明</h3>
        <table class="field-table">
          <tr><th>字段</th><th>必填</th><th>说明</th></tr>
          <tr><td>标题 title</td><td>✔</td><td>作品名称</td></tr>
          <tr><td>作者 composer / 生卒年 composerLife</td><td></td><td>如「贝多芬 / 1770-1827」</td></tr>
          <tr><td>表演者 performer</td><td></td><td>乐团、演奏家或录音者</td></tr>
          <tr><td>录制年份 recordedYear</td><td></td><td>数字或「约1930」</td></tr>
          <tr><td>分类 category</td><td>✔</td><td>六大类之一：古典音乐 / 民国老唱片 / 戏曲曲艺 / 红色歌曲 / 民间音乐 / 乐谱库</td></tr>
          <tr><td>标签 tags</td><td></td><td>分号或逗号分隔，兼作场景与情绪匹配</td></tr>
          <tr><td>音频链接 audioUrl</td><td>二选一</td><td>与乐谱链接至少一项；建议选支持 CORS 的存档直链</td></tr>
          <tr><td>乐谱链接 scoreUrl</td><td>二选一</td><td>乐谱扫描件图片直链</td></tr>
          <tr><td>来源 sourceUrl + 来源名称 sourceName</td><td>✔</td><td>合规必填：可溯源的档案文件页</td></tr>
          <tr><td>版权状态 license</td><td>✔</td><td>如 Public domain / CC0；跨辖区说明写入背景或来源备注</td></tr>
          <tr><td>背景介绍 background</td><td></td><td>建议 100—200 字</td></tr>
        </table>
      </div>
    </div>`;

    const resultBox = document.getElementById('importResult');
    function showResult(res) {
      resultBox.hidden = false;
      resultBox.innerHTML = `
        <h3 style="margin-top:0">导入结果</h3>
        <p><span class="ok">成功 ${res.added}</span> · 跳过重复 ${res.skipped} · <span class="err">问题 ${res.errors.length}</span></p>
        ${res.errors.length ? '<ul>' + res.errors.map(e => `<li class="err">${U.escapeHtml(e)}</li>`).join('') + '</ul>' : ''}
        ${res.added ? '<p class="ok">已合并进馆藏，去 <a href="#/browse">分类浏览</a> 查看新条目。</p>' : ''}`;
    }

    document.getElementById('csvImport').onclick = () => {
      const file = document.getElementById('csvFile').files[0];
      const read = txt => {
        try { showResult(DB.importItems(DB.csvToTracks(txt))); }
        catch (e) { showResult({ added: 0, skipped: 0, errors: [e.message] }); }
      };
      if (file) {
        const fr = new FileReader();
        fr.onload = () => read(fr.result);
        fr.readAsText(file, 'utf-8');
      } else {
        const txt = document.getElementById('csvText').value;
        if (!txt.trim()) return U.toast('请先选择文件或粘贴 CSV 内容', 'warn');
        read(txt);
      }
    };
    document.getElementById('jsonImport').onclick = () => {
      const file = document.getElementById('jsonFile').files[0];
      const read = txt => {
        try {
          const data = JSON.parse(txt);
          const items = Array.isArray(data) ? data : (data.tracks || []);
          if (!Array.isArray(items)) throw new Error('JSON 结构应为条目数组或 {"tracks":[…]}');
          showResult(DB.importItems(DB.itemsToTracks(items)));
        } catch (e) { showResult({ added: 0, skipped: 0, errors: [e.message] }); }
      };
      if (file) {
        const fr = new FileReader();
        fr.onload = () => read(fr.result);
        fr.readAsText(file, 'utf-8');
      } else {
        const txt = document.getElementById('jsonText').value;
        if (!txt.trim()) return U.toast('请先选择文件或粘贴 JSON 内容', 'warn');
        read(txt);
      }
    };
    document.getElementById('expJson').onclick = () => {
      if (!DB.userTracks.length) return U.toast('还没有本地导入条目', 'warn');
      DB.downloadFile('pdml-import-' + U.todayStr() + '.json',
        JSON.stringify(DB.exportUserTracks(), null, 2), 'application/json');
    };
    document.getElementById('expCsv').onclick = () => {
      if (!DB.userTracks.length) return U.toast('还没有本地导入条目', 'warn');
      const rows = [DB.CSV_FIELDS.map(f => f.cn).join(',')];
      DB.userTracks.forEach(t => {
        rows.push([t.title, t.composer, t.composerLife, t.performer, t.recordedYear, t.category,
          t.tags.join(';'), (t.audio || {}).url || '', (t.scores[0] || {}).url || '',
          (t.source || {}).page || '', (t.source || {}).name || '', (t.source || {}).license || '',
          t.background || '', t.scenes.join(';'), t.genre || '', t.instrument || '', t.durationSec || ''
        ].map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(','));
      });
      DB.downloadFile('pdml-import-' + U.todayStr() + '.csv', '\uFEFF' + rows.join('\r\n'), 'text/csv');
    };
    document.getElementById('expAll').onclick = () => {
      const all = {
        exportedAt: new Date().toISOString(),
        userTracks: DB.exportUserTracks(),
        favorites: DB.favs.list(),
        playlists: DB.playlists.list(),
        history: DB.history.list(),
        playCounts: U.store.get('playCounts', {})
      };
      DB.downloadFile('pdml-userdata-' + U.todayStr() + '.json', JSON.stringify(all, null, 2), 'application/json');
    };
    const clr = (what, msg) => U.confirm('确认清空', msg, () => {
      DB.clearUserData(what);
      U.toast('已清空', 'ok');
      Router.render();
    }, '清空');
    document.getElementById('clrImport').onclick = () => clr('imported', '确定清空全部本地导入条目？');
    document.getElementById('clrPlay').onclick = () => clr('playCounts', '确定清空播放记录与热度数据？');
    document.getElementById('clrAll').onclick = () => clr('all', '确定清空全部本地数据（导入条目、收藏、歌单、历史）？');
  });

  /* ---------- 404 ---------- */
  Router.register('404', function (app) {
    app.innerHTML = `<div class="container">${UI.empty('🏚', '这一页不在馆藏目录里（404）。',
      '<a class="btn" href="#/" style="margin-top:10px">回到首页</a>')}</div>`;
  });
})();
