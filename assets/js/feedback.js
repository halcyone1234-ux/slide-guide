/* 對錯回饋：選錯時畫面閃一下紅框，做對時馬鈴薯跳出來放煙火。
   減少動態時不閃也不放煙火，只留選項本身的顏色提示。 */
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COLORS = ['#F2A541', '#7CC5EC', '#F39DB5', '#9BD37E'];
  var LAUNCH = 260;
  var GAP = 220;
  var RISE = 300;
  var BURST = 900;
  var DURATION = LAUNCH + GAP * 3 + RISE + BURST;
  var flash = null;
  var partying = false;

  function pulse(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(function () { el.classList.remove(className); }, 700);
  }

  /* 選錯：選項變紅、輕輕晃一下，整個畫面閃一次紅框。 */
  function wrong(targets) {
    [].concat(targets || []).forEach(function (el) { pulse(el, 'fb-wrong'); });
    if (calm.matches) { return; }
    if (!flash) {
      flash = document.createElement('div');
      flash.className = 'fb-flash';
      flash.setAttribute('aria-hidden', 'true');
      document.body.appendChild(flash);
    }
    pulse(flash, 'is-on');
  }

  /* 走對一步：選項短暫變綠。 */
  function right(targets) {
    [].concat(targets || []).forEach(function (el) { pulse(el, 'fb-right'); });
  }

  function noise(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function square(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, size, size);
  }

  /* 一發煙火：先從馬鈴薯手上升空，再炸開成一圈像素。 */
  function drawBurst(ctx, burst, t, from) {
    var since = t - burst.at;
    if (since < 0) { return; }
    if (since < RISE) {
      var k = since / RISE;
      var x = from.x + (burst.x - from.x) * k;
      var y = from.y + (burst.y - from.y) * (1 - (1 - k) * (1 - k));
      square(ctx, x, y, 8, '#FFF9EC');
      square(ctx, x, y + 12, 4, '#F2A541');
      return;
    }
    var s = (since - RISE) / 1000;
    if (s > BURST / 1000) { return; }
    for (var i = 0; i < 24; i += 1) {
      if (s > 0.6 && (i + Math.floor(s * 20)) % 2) { continue; }
      var angle = i / 24 * Math.PI * 2;
      var speed = 200 + noise(i, burst.seed) * 120;
      square(
        ctx,
        burst.x + Math.cos(angle) * speed * s,
        burst.y + Math.sin(angle) * speed * s + 260 * s * s,
        s < 0.5 ? 8 : 4,
        i % 3 ? burst.color : '#FFF9EC'
      );
    }
  }

  /* 做對了：馬鈴薯從畫面下方跳出來，放四發煙火。 */
  function party() {
    if (partying || calm.matches) { return; }
    partying = true;

    var w = window.innerWidth;
    var h = window.innerHeight;
    var layer = document.createElement('div');
    layer.className = 'fb-party';
    layer.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var potato = new Image();
    potato.className = 'sprite';
    potato.alt = '';
    potato.width = 38;
    potato.height = 50;
    potato.style.setProperty('--w', '38');
    potato.src = (window.SPRITE_DATA && window.SPRITE_DATA.potato_cheer) || 'assets/img/mascots/1x/potato_cheer.png';
    layer.appendChild(canvas);
    layer.appendChild(potato);
    document.body.appendChild(layer);

    var ctx = canvas.getContext('2d');
    var scale = parseFloat(window.getComputedStyle(potato).getPropertyValue('--scale')) || 4;
    var from = { x: w * 0.22 + 19 * scale, y: h - 50 * scale };
    var bursts = [0, 1, 2, 3].map(function (i) {
      return {
        at: LAUNCH + i * GAP,
        x: w * (0.3 + 0.45 * noise(i, 1)),
        y: h * (0.16 + 0.24 * noise(i, 2)),
        color: COLORS[i],
        seed: i + 3
      };
    });

    var started = window.performance.now();
    var ended = false;
    function end() {
      if (ended) { return; }
      ended = true;
      if (layer.parentNode) { layer.parentNode.removeChild(layer); }
      partying = false;
    }
    function frame(now) {
      if (ended) { return; }
      var t = now - started;
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        bursts.forEach(function (burst) { drawBurst(ctx, burst, t, from); });
      }
      if (t >= DURATION) {
        end();
        return;
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
    /* 分頁被切走時也要收掉。 */
    window.setTimeout(end, DURATION + 600);
  }

  window.Feedback = {
    wrong: wrong,
    right: right,
    party: party,
    busy: function () { return partying; }
  };
})();
