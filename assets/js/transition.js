/* 轉場：翻頁時，馬鈴薯旅行的風景從前方捲進來蓋住畫面，換頁後再捲走，內容接著依序進場。
   每一次的走法都一樣，風景的畫法在 journey.js。新場景只要在內容區塊加上 data-tr，就會自動跟著進場。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var stops = Array.prototype.slice.call(document.querySelectorAll('[data-scene],[data-interlude]'));
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var enabled = root.classList.contains('tr-on');
  var journey = window.Journey;

  /* 毫秒：風景捲進來、停著跑一段、捲走。 */
  var COVER = 320;
  var HOLD = 420;
  var CLEAR = 360;
  var TOTAL = COVER + HOLD + CLEAR;

  /* 美術像素：邊緣每一列的高度、參差的幅度、奶油色邊條的寬度。 */
  var ROW = 8;
  var RAGGED = 12;
  var RIM = 3;

  var canvas = null;
  var ctx = null;
  var place = null;
  var rows = [];
  var distance = 0;
  var view = { W: 0, H: 0, art: 4, p: 0, dir: 1, scroll: 0 };

  var phase = 'idle';
  var destination = null;
  var waiting = null;
  var phaseStart = 0;
  var frameId = 0;
  var safety = 0;

  function prepare() {
    if (!journey) { return false; }
    if (canvas) { return Boolean(ctx); }
    canvas = document.createElement('canvas');
    canvas.className = 'wipe';
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    return Boolean(ctx);
  }

  function layOut(direction) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    /* 風景的像素和吉祥物小圖一樣大，看起來才是同一個世界。 */
    view.art = Math.max(2, Math.round(Math.max(w, h) / 320));
    view.W = Math.ceil(w / view.art);
    view.H = Math.ceil(h / view.art);
    view.dir = direction;

    rows = [];
    for (var i = 0; i * ROW < view.H; i += 1) {
      var n = Math.sin(i * 91.7) * 43758.5453;
      rows.push(Math.round((n - Math.floor(n)) * RAGGED / 2) * 2);
    }
  }

  function clamp(x) {
    return Math.max(0, Math.min(1, x));
  }

  /* 往前翻時風景由右往左經過，往回翻時相反。 */
  function spanOf(left, right, offset) {
    var a = left + offset;
    var b = right + offset;
    return view.dir > 0 ? [a, b] : [view.W - b, view.W - a];
  }

  function paintBand(left, right, ms) {
    var art = view.art;
    var snapLeft = Math.round(left / 4) * 4;
    var snapRight = Math.round(right / 4) * 4;

    view.p = clamp(ms / TOTAL);
    view.scroll = distance + view.p * journey.TRAVEL * view.dir;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    rows.forEach(function (offset, i) {
      var span = spanOf(snapLeft, snapRight, offset);
      if (span[1] > span[0]) { ctx.rect(span[0] * art, i * ROW * art, (span[1] - span[0]) * art, ROW * art); }
    });
    ctx.clip();
    journey.paint(ctx, place, view);
    ctx.restore();

    ctx.fillStyle = '#FFF9EC';
    rows.forEach(function (offset, i) {
      var span = spanOf(snapLeft, snapRight, offset);
      if (span[1] <= span[0]) { return; }
      ctx.fillRect((span[0] - RIM) * art, i * ROW * art, RIM * art, ROW * art);
      ctx.fillRect(span[1] * art, i * ROW * art, RIM * art, ROW * art);
    });
  }

  /* 畫面蓋住時換頁；內容先藏著，等風景捲走才進場。 */
  function jump() {
    if (waiting && waiting !== destination) { waiting.classList.add('is-in'); }
    window.scrollTo({ top: destination.getBoundingClientRect().top + window.pageYOffset, behavior: 'auto' });
    if (enabled) {
      waiting = destination;
      destination.classList.remove('is-in');
    }
  }

  function reveal() {
    waiting = null;
    if (!enabled) { return; }
    void destination.offsetWidth;
    destination.classList.add('is-in');
  }

  function warmNext() {
    var next = stops[stops.indexOf(destination) + 1];
    if (next) { journey.warm(journey.placeOf(next, stops)); }
  }

  function finish() {
    window.clearTimeout(safety);
    window.cancelAnimationFrame(frameId);
    if (phase === 'cover') { jump(); }
    if (phase === 'cover' || phase === 'hold') { reveal(); }
    phase = 'idle';
    distance += journey.TRAVEL * view.dir;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
    window.setTimeout(warmNext, 80);
  }

  function frame(now) {
    var elapsed = now - phaseStart;
    var edge = RAGGED + RIM + 4;
    var start = view.W + edge;
    var stay = start + RAGGED;

    if (phase === 'cover') {
      var moved = Math.min(COVER, elapsed);
      paintBand(start - (start + edge) * clamp(moved / COVER), stay, moved);
      /* 畫面完全蓋住才換頁，看不到跳動。 */
      if (elapsed >= COVER) {
        jump();
        phase = 'hold';
        phaseStart = now;
      }
    } else if (phase === 'hold') {
      paintBand(-edge, stay, COVER + Math.min(HOLD, elapsed));
      if (elapsed >= HOLD) {
        reveal();
        phase = 'clear';
        phaseStart = now;
      }
    } else if (phase === 'clear') {
      var gone = Math.min(CLEAR, elapsed);
      paintBand(-edge, stay - (stay + edge) * clamp(gone / CLEAR), COVER + HOLD + gone);
      if (elapsed >= CLEAR) {
        finish();
        return;
      }
    } else {
      return;
    }
    frameId = window.requestAnimationFrame(frame);
  }

  function begin(stop, direction) {
    place = journey.placeOf(stop, stops);
    canvas.setAttribute('data-theme', place.id);
    canvas.setAttribute('data-sign', place.sign);
    layOut(direction);
    canvas.hidden = false;
    phase = 'cover';
    phaseStart = window.performance.now();
    /* 分頁被切走、動畫暫停時，也不能讓風景一直蓋著畫面。 */
    safety = window.setTimeout(finish, TOTAL + 600);
    frameId = window.requestAnimationFrame(frame);
  }

  /* 連按時不重播：捲進來的途中只改目的地，蓋滿或捲走的途中直接換頁，畫面不會一直閃。 */
  function go(stop, direction) {
    if (phase !== 'idle' && stop === destination) { return; }
    destination = stop;
    if (phase === 'cover') { return; }
    if (phase === 'hold') {
      jump();
      return;
    }
    if (phase === 'clear') {
      jump();
      reveal();
      return;
    }
    if (!enabled || calm.matches || !prepare()) {
      jump();
      reveal();
      return;
    }
    begin(stop, direction);
  }

  /* 正在等風景捲走的那一張，由 reveal() 負責進場。 */
  function markSeen(stop) {
    if (stop !== waiting) { stop.classList.add('is-in'); }
  }

  if (enabled) {
    stops.forEach(function (stop) {
      Array.prototype.forEach.call(stop.querySelectorAll('[data-tr]'), function (part, i) {
        part.style.setProperty('--tr-i', String(Math.min(i, 6)));
      });
    });

    /* 用捲動走到的場景，第一次進入畫面時播一次。 */
    var arrive = window.Site.observe(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          markSeen(entry.target);
          arrive.unobserve(entry.target);
        }
      });
    }, '0px 0px -20% 0px');
    stops.forEach(function (stop) { arrive.observe(stop); });

    document.addEventListener('stopchange', function (event) {
      markSeen(event.detail.stop);
    });

    if (journey && stops[1]) {
      window.setTimeout(function () { journey.warm(journey.placeOf(stops[1], stops)); }, 600);
    }
  }

  window.Transition = {
    go: go,
    busy: function () { return phase !== 'idle'; }
  };
})();
