/* =========================================================
 * search.js — 搜索引擎
 * 支持中文关键词、模糊匹配、拼音全拼与首字母检索。
 * 评分：字段权重（标题 > 作者 > 表演者 > 标签/流派）× 匹配方式
 * （完全包含 > 前缀 > 拼音 > 子序列模糊）
 * 命名空间：window.SE
 * ========================================================= */
(function () {
  'use strict';
  const SE = {};

  /* 子序列模糊匹配：q 的字符按序出现在 s 中返回 true */
  function subseq(q, s) {
    let i = 0;
    for (let j = 0; j < s.length && i < q.length; j++) {
      if (s[j] === q[i]) i++;
    }
    return i === q.length;
  }

  /* 对单个候选串打分（0 = 未命中） */
  function scoreOne(q, s, weight) {
    if (!q || !s) return 0;
    const idx = s.indexOf(q);
    if (idx === 0) return weight * 1.0;
    if (idx > 0) return weight * 0.8;
    if (s.startsWith(q) || subseq(q, s)) return weight * 0.45;
    return 0;
  }

  /* 主搜索：返回 [{track, score}]，已按相关度降序 */
  SE.search = function (query, list) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const qPy = PY.of(q);           // 查询词拼音
    const qPyIni = PY.initials(q);  // 查询词首字母（仅当查询是拼音字母时有用）
    const terms = q.split(/\s+/).filter(Boolean);

    const out = [];
    (list || DB.tracks).forEach(t => {
      let score = 0;
      for (const term of terms) {
        const tq = term.toLowerCase();
        let best = 0;
        best = Math.max(best,
          scoreOne(tq, t.title.toLowerCase(), 60),
          scoreOne(tq, (t.titleEn || '').toLowerCase(), 40),
          scoreOne(tq, t.composer.toLowerCase(), 40),
          scoreOne(tq, (t.composerEn || '').toLowerCase(), 30),
          scoreOne(tq, t.performer.toLowerCase(), 30),
          scoreOne(tq, (t.genre || '').toLowerCase(), 20),
          scoreOne(tq, (t.instrument || '').toLowerCase(), 20),
          scoreOne(tq, t.tags.join(' ').toLowerCase(), 15),
          scoreOne(tq, (t.era || '').toLowerCase(), 15),
          scoreOne(tq, (t.recordedYear + '').toLowerCase(), 20)
        );
        // 拼音检索：查询词（拉丁字母）比对目标拼音串
        if (/^[a-z]+$/.test(tq)) {
          best = Math.max(best,
            scoreOne(tq, t._py.title, 55),
            scoreOne(tq, t._py.composer, 38),
            scoreOne(tq, t._py.performer, 28),
            scoreOne(tq, t._py.full, 12),
            // 首字母缩写：如 bdf → 贝多芬、yyj → 义勇军
            tq.length >= 2 ? scoreOne(tq, PY.initials(t.title), 30) : 0,
            tq.length >= 2 ? scoreOne(tq, PY.initials(t.composer), 20) : 0,
            tq.length >= 2 ? scoreOne(tq, PY.initials(t.performer), 12) : 0
          );
        } else {
          // 中文查询词转拼音后比对目标拼音（如输入「bdf」无意义但输入「贝多」可拼音命中）
          const tPy = PY.of(term);
          if (tPy) {
            best = Math.max(best,
              scoreOne(tPy, t._py.title, 40),
              scoreOne(tPy, t._py.full, 10));
          }
        }
        if (!best) { score = 0; break; }
        score += best;
      }
      if (score > 0) out.push({ track: t, score: score + (t.playSeeds || 0) });
    });
    out.sort((a, b) => b.score - a.score || String(a.track.title).localeCompare(b.track.title, 'zh-Hans-CN'));
    return out;
  };

  /* 搜索联想（顶部输入框下拉） */
  SE.suggest = function (query, limit = 8) {
    return SE.search(query).slice(0, limit).map(x => x.track);
  };

  window.SE = SE;
})();
