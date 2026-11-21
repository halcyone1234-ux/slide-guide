/* 場景翻頁、章節導覽、進度條、投影模式。轉場動畫在 transition.js。 */
(function () {
  'use strict';

  var root = document.documentElement;
  root.lang = 'zh-Hant-TW';
  root.classList.add('js');

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduced = false; }

  var stops = Array.prototype.slice.call(document.querySelectorAll('[data-scene],[data-interlude]'));
  var scenes = stops.filter(function (s) { return s.hasAttribute('data-scene'); });
  var current = 0;
  var target = null;
  var targetTimer = 0;

  /* 以網頁自己的視窗為準，放在 iframe 裡預覽時 rootMargin 才有效。 */
  function observe(callback, margin) {
    try {
      return new IntersectionObserver(callback, { root: document, rootMargin: margin });
    } catch (e) {
      return new IntersectionObserver(callback, { rootMargin: margin });
    }
  }

  window.Site = {
    reduced: reduced,
    observe: observe,
    currentStop: function () { return stops[current]; }
  };

  /* 內文字型不擋畫面：沒有網路時就用系統字型。 */
  function loadBodyFont() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap';
    document.head.appendChild(link);
  }

  function applyConfig() {
    var config = window.SiteConfig;
    document.querySelectorAll('[data-config]').forEach(function (el) {
      var value = config[el.getAttribute('data-config')];
      var empty = value === '' || value === null || value === undefined;
      el.hidden = empty;
      if (!empty) { el.textContent = String(value); }
    });
  }

  /* 進度條：一個場景一格。 */
  var progress = document.getElementById('progress');
  var blocks = [];
  function buildProgress() {
    progress.setAttribute('aria-valuemax', String(scenes.length));
    scenes.forEach(function () {
      var cell = document.createElement('i');
      progress.appendChild(cell);
      blocks.push(cell);
    });
  }

  function scenesReached(index) {
    var count = 0;
    for (var i = 0; i <= index; i += 1) {
      if (stops[i].hasAttribute('data-scene')) { count += 1; }
    }
    return count;
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));

  function setCurrent(index) {
    if (index < 0) { return; }
    current = index;
    var stop = stops[index];

    var reached = scenesReached(index);
    blocks.forEach(function (cell, i) { cell.classList.toggle('is-on', i < reached); });
    progress.setAttribute('aria-valuenow', String(reached));

    var chapter = stop.getAttribute('data-chapter');
    navLinks.forEach(function (link) {
      if (link.getAttribute('data-nav') === chapter) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    document.dispatchEvent(new CustomEvent('stopchange', { detail: { stop: stop, index: index } }));
  }

  function topOf(el) {
    return el.getBoundingClientRect().top + window.pageYOffset;
  }

  function scrollToStop(el, instant) {
    window.scrollTo({ top: topOf(el), behavior: instant || reduced ? 'auto' : 'smooth' });
  }

  /* 走到另一張時播轉場；留在同一張時只把畫面對齊。 */
  function travel(el) {
    var index = stops.indexOf(el);
    var wipe = window.Transition;
    if (!wipe || index < 0 || (index === current && !wipe.busy())) {
      scrollToStop(el);
      return;
    }
    wipe.go(el, index >= current ? 1 : -1);
  }

  /* 連按時以目的地為基準，不會卡在捲動途中。 */
  function page(delta) {
    var base = target !== null ? target : current;
    var next = Math.max(0, Math.min(stops.length - 1, base + delta));

    /* 場景比螢幕高、又已經往下捲時，往回先回到這個場景的開頭。 */
    if (delta < 0 && target === null && stops[current].getBoundingClientRect().top < -40) {
      next = current;
    }

    target = next;
    window.clearTimeout(targetTimer);
    targetTimer = window.setTimeout(function () { target = null; }, 900);
    travel(stops[next]);
  }

  function setPresent(on) {
    var keep = stops[current];
    if (on) { root.setAttribute('data-present', ''); } else { root.removeAttribute('data-present'); }
    document.getElementById('btnPresent').setAttribute('aria-pressed', on ? 'true' : 'false');
    scrollToStop(keep, true);
  }

  function togglePresent() {
    setPresent(!root.hasAttribute('data-present'));
  }

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) { return; }

    var el = event.target;
    var isElement = el && el.closest;
    if (isElement && (el.isContentEditable || el.closest('input, textarea, select'))) { return; }

    var key = event.key;
    if (key === 'p' || key === 'P') { togglePresent(); return; }

    var isSpace = key === ' ' || key === 'Spacebar';
    if (isSpace && isElement && el.closest('button, a, summary, [role="button"]')) { return; }
    if ((key === 'ArrowLeft' || key === 'ArrowRight') && isElement && el.closest('[role="slider"]')) { return; }

    if (key === 'ArrowRight' || key === 'PageDown' || (isSpace && !event.shiftKey)) {
      event.preventDefault();
      page(1);
    } else if (key === 'ArrowLeft' || key === 'PageUp' || (isSpace && event.shiftKey)) {
      event.preventDefault();
      page(-1);
    }
  }

  function onClick(event) {
    var el = event.target;
    if (!el.closest) { return; }

    var link = el.closest('a[href^="#"]');
    if (link) {
      var dest = document.getElementById(link.getAttribute('href').slice(1));
      if (dest) {
        event.preventDefault();
        travel(dest);
        if (!dest.hasAttribute('tabindex')) { dest.setAttribute('tabindex', '-1'); }
        dest.focus({ preventScroll: true });
      }
    }

    /* 用滑鼠點完按鈕就放開焦點，之後按空白鍵才會翻頁。 */
    var button = el.closest('button');
    if (button && event.detail > 0) { button.blur(); }
  }

  function watchStops() {
    if (!('IntersectionObserver' in window)) {
      setCurrent(0);
      return;
    }

    var band = observe(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { setCurrent(stops.indexOf(entry.target)); }
      });
    }, '-40% 0px -59% 0px');
    stops.forEach(function (stop) { band.observe(stop); });
  }

  function start() {
    loadBodyFont();
    applyConfig();
    buildProgress();
    setCurrent(0);
    watchStops();
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    document.getElementById('btnPresent').addEventListener('click', togglePresent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    window.setTimeout(start, 0);
  }
})();
