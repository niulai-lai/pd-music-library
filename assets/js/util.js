/* =========================================================
 * util.js — 通用工具：存储 / 格式化 / 提示 / 弹窗 / 灯箱
 * 命名空间：window.U
 * ========================================================= */
(function () {
  'use strict';
  const U = {};

  /* ---------- localStorage 安全封装 ---------- */
  const NS = 'pdml.';
  U.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch (e) { console.warn('localStorage 写入失败', e); return false; }
    },
    remove(key) {
      try { localStorage.removeItem(NS + key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- 格式化 ---------- */
  U.fmtTime = function (sec) {
    if (!isFinite(sec) || sec < 0) return '--:--';
    sec = Math.round(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    return m + ':' + String(s).padStart(2, '0');
  };
  U.fmtSize = function (mb) {
    if (mb == null || isNaN(mb)) return '大小未知';
    return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.round(mb * 1024) + ' KB';
  };
  /* 拆词高亮：把 query 中命中的部分加 <mark> */
  U.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  };
  U.debounce = function (fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      const args = arguments, self = this;
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  };
  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  U.todayStr = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  U.uid = function () { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* 无痕迹地址栏更新（沙箱环境 replaceState 不可用时降级） */
  U.replaceHash = function (hash) {
    try {
      history.replaceState(null, '', hash);
    } catch (e) {
      try { location.replace(location.pathname + location.search + hash); }
      catch (e2) { /* 极端环境：放弃地址栏同步 */ }
    }
  };

  /* ---------- Toast 提示 ---------- */
  let toastWrap = null;
  U.toast = function (msg, type = 'info', ms = 3200) {
    if (!toastWrap) toastWrap = document.getElementById('toastWrap');
    if (!toastWrap) { console.log('[' + type + ']', msg); return; }
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' err' : type === 'warn' ? ' warn' : '');
    el.textContent = msg;
    toastWrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, ms - 300);
    setTimeout(() => el.remove(), ms);
  };

  /* ---------- 确认弹窗 ---------- */
  U.confirm = function (title, text, onOk, okLabel = '确定') {
    const root = document.getElementById('modalRoot');
    root.hidden = false;
    root.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="${U.escapeHtml(title)}">
        <h3>${U.escapeHtml(title)}</h3>
        <p style="color:var(--ink-soft)">${U.escapeHtml(text)}</p>
        <div class="modal-actions">
          <button class="btn" data-act="cancel">取消</button>
          <button class="btn btn-primary" data-act="ok">${U.escapeHtml(okLabel)}</button>
        </div>
      </div>`;
    const close = () => { root.hidden = true; root.innerHTML = ''; };
    root.querySelector('[data-act="cancel"]').onclick = close;
    root.querySelector('[data-act="ok"]').onclick = () => { close(); onOk && onOk(); };
    root.onclick = e => { if (e.target === root) close(); };
  };

  /* ---------- 乐谱灯箱（缩放 + 拖拽平移） ---------- */
  const LB = { scale: 1, tx: 0, ty: 0, dragging: false, sx: 0, sy: 0 };
  function lbApply() {
    const img = document.getElementById('lbImg');
    img.style.transform = `translate(${LB.tx}px, ${LB.ty}px) scale(${LB.scale})`;
  }
  U.lightboxOpen = function (src, label, downloadUrl) {
    const box = document.getElementById('lightbox');
    const img = document.getElementById('lbImg');
    img.src = src; img.alt = label || '乐谱预览';
    LB.scale = 1; LB.tx = 0; LB.ty = 0; lbApply();
    document.getElementById('lbDownload').href = downloadUrl || src;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  U.lightboxClose = function () {
    document.getElementById('lightbox').hidden = true;
    document.body.style.overflow = '';
  };
  U.initLightbox = function () {
    const stage = document.getElementById('lbStage');
    document.getElementById('lbClose').onclick = U.lightboxClose;
    document.getElementById('lightbox').addEventListener('click', e => {
      if (e.target.id === 'lightbox') U.lightboxClose();
    });
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      LB.scale = Math.min(6, Math.max(0.4, LB.scale * (e.deltaY < 0 ? 1.15 : 0.87)));
      lbApply();
    }, { passive: false });
    stage.addEventListener('mousedown', e => { LB.dragging = true; LB.sx = e.clientX - LB.tx; LB.sy = e.clientY - LB.ty; });
    window.addEventListener('mousemove', e => {
      if (!LB.dragging || document.getElementById('lightbox').hidden) return;
      LB.tx = e.clientX - LB.sx; LB.ty = e.clientY - LB.sy; lbApply();
    });
    window.addEventListener('mouseup', () => { LB.dragging = false; });
    document.querySelectorAll('#lightbox [data-zoom]').forEach(b => {
      b.onclick = () => {
        const z = b.dataset.zoom;
        if (z === 'in') LB.scale = Math.min(6, LB.scale * 1.3);
        else if (z === 'out') LB.scale = Math.max(0.4, LB.scale / 1.3);
        else { LB.scale = 1; LB.tx = 0; LB.ty = 0; }
        lbApply();
      };
    });
  };

  /* ---------- 图片懒加载（IO + 即时检查 + 轮询兜底，兼容特殊环境） ---------- */
  U.observeLazy = function (root) {
    const imgs = Array.prototype.slice.call((root || document).querySelectorAll('img[data-src]'));
    if (!imgs.length) return;
    const swap = img => { img.src = img.dataset.src; img.removeAttribute('data-src'); };
    const pending = new Set(imgs);
    let io = null, poll = null;
    const settle = () => {
      if (!pending.size) {
        if (io) io.disconnect();
        if (poll) clearInterval(poll);
      }
    };
    const check = () => {
      pending.forEach(img => {
        if (!img.isConnected) { pending.delete(img); return; }
        const r = img.getBoundingClientRect();
        if (r.top < window.innerHeight + 300 && r.bottom > -300) {
          swap(img); pending.delete(img);
          if (io) io.unobserve(img);
        }
      });
      settle();
      return pending.size;
    };
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) { swap(en.target); pending.delete(en.target); io.unobserve(en.target); }
        });
        settle();
      }, { rootMargin: '300px' });
      imgs.forEach(i => io.observe(i));
    }
    check();
    // 兜底：个别环境 IntersectionObserver/scroll 事件不派发时仍能加载
    poll = setInterval(() => { if (!check()) clearInterval(poll); }, 900);
    setTimeout(() => { if (poll) clearInterval(poll); }, 60000);
  };

  /* ---------- 剪贴板 ---------- */
  U.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => false);
    }
    return Promise.resolve(false);
  };

  window.U = U;
})();
