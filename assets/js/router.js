/* =========================================================
 * router.js — Hash 路由
 * 路由表：
 *   #/                      首页
 *   #/browse?cat=&...       分类浏览
 *   #/search?q=             搜索结果
 *   #/work/:id              作品详情
 *   #/scenes                场景推荐
 *   #/scene/:sceneId        场景歌单
 *   #/library               我的书架（收藏/歌单/历史）
 *   #/playlist/:id          自定义歌单详情
 *   #/sources               资源来源
 *   #/about                 关于本站
 *   #/data                  数据管理
 * 命名空间：window.Router
 * ========================================================= */
(function () {
  'use strict';

  const VIEWS = {};   // name -> render(container, params)

  const Router = {
    current: null,
    register(name, renderFn) { VIEWS[name] = renderFn; },
    appEl() { return document.getElementById('app'); },
    go(hash) { location.hash = hash; },

    parse() {
      let h = location.hash || '#/';
      if (h[0] === '#') h = h.slice(1);
      if (!h.startsWith('/')) h = '/' + h;
      const qi = h.indexOf('?');
      const path = qi >= 0 ? h.slice(0, qi) : h;
      const query = {};
      if (qi >= 0) {
        new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { query[k] = v; });
      }
      const seg = path.split('/').filter(Boolean);
      return { path, seg, query };
    },

    render() {
      const { seg, query } = Router.parse();
      const app = Router.appEl();
      const name = seg[0] || 'home';
      let viewName = name, params = Object.assign({}, query);

      switch (name) {
        case 'home': break;
        case 'browse': break;
        case 'search': break;
        case 'work': params.id = seg[1]; break;
        case 'scenes': viewName = 'scenes'; break;
        case 'scene': viewName = 'scenePlaylist'; params.sceneId = seg[1]; break;
        case 'library': params.tab = seg[1] || query.tab || 'fav'; break;
        case 'playlist': viewName = 'playlistDetail'; params.id = seg[1]; break;
        case 'sources': break;
        case 'about': break;
        case 'data': break;
        default: viewName = '404';
      }

      const fn = VIEWS[viewName] || VIEWS['404'];
      Router.current = viewName;
      // 渲染前收起移动端菜单
      document.getElementById('mainNav').classList.remove('open');
      try {
        app.innerHTML = '';
        Promise.resolve(fn(app, params)).catch(err => {
          console.error('视图渲染失败：', err);
          app.innerHTML = `<div class="error-state"><span class="glyph">⚠</span>
            <h3>页面加载出错了</h3><p>${U.escapeHtml(err.message || '未知错误')}</p>
            <a class="btn" href="#/">回到首页</a></div>`;
        });
      } catch (err) {
        console.error(err);
        app.innerHTML = `<div class="error-state"><span class="glyph">⚠</span><h3>页面加载出错了</h3>
          <p>${U.escapeHtml((err && err.message) || '未知错误')}</p>
          <a class="btn" href="#/">回到首页</a></div>`;
      }
      // 高亮导航
      document.querySelectorAll('.main-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.nav === navOf(viewName));
      });
      // 滚回顶部（保留播放状态）
      window.scrollTo({ top: 0 });
    },

    start() {
      window.addEventListener('hashchange', Router.render);
      Router.render();
    }
  };

  function navOf(view) {
    if (view === 'home') return 'home';
    if (view === 'browse' || view === 'work' || view === '404') return 'browse';
    if (view === 'scenes' || view === 'scenePlaylist') return 'scenes';
    if (view === 'library' || view === 'playlistDetail') return 'library';
    if (view === 'sources') return 'sources';
    if (view === 'about' || view === 'data') return 'about';
    return '';
  }

  window.Router = Router;
})();
