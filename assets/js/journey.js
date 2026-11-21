/* 馬鈴薯的旅程：同一條路一直走下去。
   構圖、道路、馬鈴薯和節奏每一次都一樣，只有季節和時間在變。
   季節跟著章節：想是春天播種，生是夏天長大，修是秋天修剪，看是冬天沉澱，講是下一個春天開花。
   時間跟著翻頁：白天、黃昏、黑夜、清晨輪流。座標單位都是一個美術像素。 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* 風景每隔這麼長重複一次；一次轉場往前走這麼遠。 */
  var PERIOD = 480;
  var TRAVEL = 190;
  var GROUND_H = 52;
  var FAR_H = 84;
  var MID_H = 100;

  var CHAPTER_SEASON = { 0: 'spring', 1: 'spring', 2: 'summer', 3: 'autumn', 4: 'winter', 5: 'spring', 6: 'summer' };
  var CYCLE = ['day', 'dusk', 'night', 'dawn'];

  var ROAD = { road: '#DCC394', roadEdge: '#C2A473', dash: '#F3E3BF' };

  var SEASONS = {
    spring: {
      hillFar: '#B5DDA4', hillNear: '#93CC85',
      crown: ['#F7B4C6', '#EE8FA9', '#FCDDE5'], trunk: '#7A5040',
      grass: '#9BD37E', grassDark: '#7FC067', flecks: ['#FFFFFF', '#F7A8BC', '#F2C14E'],
      road: ROAD
    },
    summer: {
      hillFar: '#6DB87C', hillNear: '#479A63',
      crown: ['#3E9B57', '#2C7D48', '#66BC70'], trunk: '#6B4630',
      grass: '#5FB562', grassDark: '#479A50', flecks: ['#F2C14E', '#FFFFFF', '#E8622B'],
      road: ROAD
    },
    autumn: {
      hillFar: '#DDA968', hillNear: '#C4803F',
      crown: ['#D9622B', '#B93F26', '#EDA33C'], trunk: '#5E3A20',
      grass: '#BC9A48', grassDark: '#9C7A33', flecks: ['#E8822E', '#C8452B', '#EDB23C'],
      road: ROAD
    },
    winter: {
      hillFar: '#E6EFF5', hillNear: '#CBDDE8',
      crown: ['#F4F8FB', '#BFD4E2', '#FFFFFF'], trunk: '#5E4632',
      grass: '#F3F8FB', grassDark: '#DCE9F1', flecks: ['#FFFFFF', '#C9DCE8', '#B7CFE0'],
      road: { road: '#DDE7EF', roadEdge: '#BFD0DD', dash: '#FFFFFF' }
    }
  };

  /* tint 乘在風景的顏色上，整條路就像換了一個時辰。 */
  var TIMES = {
    day: {
      tint: [1, 1, 1], cloud: '#FFFFFF', cloudShade: '#D6EAF4',
      sky: ['#4AA3DF', '#5FB3E6', '#7CC5EC', '#9BD5F1', '#BCE5F5', '#DDF2F8']
    },
    dusk: {
      tint: [1, 0.8, 0.68], cloud: '#FBD2A8', cloudShade: '#E79F83',
      sky: ['#3D4E86', '#6C5A93', '#A9668F', '#E07F73', '#F3A765', '#F9CF8D']
    },
    night: {
      tint: [0.4, 0.46, 0.68], cloud: '#2B4568', cloudShade: '#1F3552',
      sky: ['#081426', '#0B1B33', '#0F2540', '#14304D', '#1A3B5C', '#234A6E']
    },
    dawn: {
      tint: [0.97, 0.88, 0.88], cloud: '#FFF0E6', cloudShade: '#F2C9C4',
      sky: ['#7FA7D6', '#A3B8DE', '#CDBFD9', '#F0C8C9', '#F9D9B8', '#FCE9C8']
    }
  };

  var TREES = [
    { x: 36, h: 72, seed: 3 }, { x: 118, h: 56, seed: 11 }, { x: 204, h: 80, seed: 19 },
    { x: 286, h: 60, seed: 27 }, { x: 372, h: 76, seed: 35 }, { x: 446, h: 52, seed: 43 }
  ];
  var CLOUDS = [
    { x: 20, y: 10, w: 54 }, { x: 120, y: 34, w: 36 }, { x: 210, y: 4, w: 64 },
    { x: 300, y: 40, w: 40 }, { x: 380, y: 16, w: 50 }, { x: 446, y: 46, w: 30 }
  ];

  function noise(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function inkFor(tint) {
    var seen = {};
    return function (hex) {
      if (!seen[hex]) {
        var n = parseInt(hex.slice(1), 16);
        seen[hex] = 'rgb(' + Math.round((n >> 16 & 255) * tint[0]) + ',' + Math.round((n >> 8 & 255) * tint[1]) + ',' + Math.round((n & 255) * tint[2]) + ')';
      }
      return seen[hex];
    };
  }

  function disc(g, cx, cy, r, paint) {
    for (var y = -r; y <= r; y += 1) {
      for (var x = -r; x <= r; x += 1) {
        if (x * x + y * y <= r * r + r * 0.6) {
          g.fillStyle = paint(x, y);
          g.fillRect(mod(cx + x, g.canvas.width), cy + y, 1, 1);
        }
      }
    }
  }

  /* ===== 天空：只看時間，四季共用 ===== */

  function paintSun(g, cx, cy, r, colors, rays) {
    if (rays) {
      g.fillStyle = colors[2];
      for (var k = 0; k < 8; k += 1) {
        for (var d = r + 4; d <= r + 9; d += 1) {
          g.fillRect(cx + Math.round(Math.cos(k * TAU / 8) * d), cy + Math.round(Math.sin(k * TAU / 8) * d), 2, 2);
        }
      }
    }
    disc(g, cx, cy, r, function (x, y) {
      var d = Math.sqrt(x * x + y * y);
      if (d < r * 0.55) { return colors[0]; }
      return d < r * 0.88 ? colors[1] : colors[2];
    });
  }

  function paintMoon(g, cx, cy, r) {
    for (var y = -r; y <= r; y += 1) {
      for (var x = -r; x <= r; x += 1) {
        var bite = (x - r * 0.5) * (x - r * 0.5) + (y + r * 0.3) * (y + r * 0.3);
        if (x * x + y * y <= r * r + r * 0.6 && bite > r * r * 0.7) {
          g.fillStyle = bite < r * r * 0.95 ? '#F2D98A' : '#FFF1BF';
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  }

  var skies = {};
  function skyFor(name, W, H) {
    var key = name + W + 'x' + H;
    if (skies[key]) { return skies[key]; }

    var c = makeCanvas(W, H);
    var g = c.getContext('2d');
    var colors = TIMES[name].sky;
    var top = H - GROUND_H;
    var band = (top + 8) / colors.length;

    colors.forEach(function (color, i) {
      g.fillStyle = color;
      g.fillRect(0, Math.floor(i * band), W, i === colors.length - 1 ? H : Math.ceil(band));
    });
    for (var i = 1; i < colors.length; i += 1) {
      var edge = Math.floor(i * band);
      for (var x = 0; x < W; x += 1) {
        g.fillStyle = (x + edge) % 2 ? colors[i - 1] : colors[i];
        g.fillRect(x, (x + edge) % 2 ? edge : edge - 1, 1, 1);
      }
    }

    if (name === 'night') {
      var count = Math.round(W * top / 90);
      for (var s = 0; s < count; s += 1) {
        g.fillStyle = noise(s, 3) > 0.7 ? '#FFE9A8' : '#FFFFFF';
        g.fillRect(Math.floor(noise(s, 1) * W), Math.floor(noise(s, 2) * top * 0.9), 1, 1);
      }
      paintMoon(g, Math.round(W * 0.76), 36, 15);
    } else if (name === 'day') {
      paintSun(g, Math.round(W * 0.78), 38, 15, ['#FFE89A', '#FFD45E', '#F9B233'], true);
    } else if (name === 'dusk') {
      paintSun(g, Math.round(W * 0.72), top - 14, 24, ['#FFD08A', '#F9B066', '#F2884B'], false);
    } else {
      paintSun(g, Math.round(W * 0.24), top - 12, 17, ['#FFF3D6', '#FFE2B0', '#FFD08E'], false);
    }

    skies[key] = c;
    return c;
  }

  /* ===== 風景：每一季的形狀都相同，只換顏色 ===== */

  function drawClouds(time) {
    var c = makeCanvas(PERIOD, 70);
    var g = c.getContext('2d');
    function bar(x, y, w, h, color) {
      g.fillStyle = color;
      for (var i = 0; i < w; i += 1) { g.fillRect(mod(x + i, PERIOD), y, 1, h); }
    }
    CLOUDS.forEach(function (cloud) {
      var h = Math.max(3, Math.round(cloud.w * 0.15));
      bar(cloud.x + Math.round(cloud.w * 0.3), cloud.y, Math.round(cloud.w * 0.32), h, time.cloud);
      bar(cloud.x + Math.round(cloud.w * 0.14), cloud.y + h, Math.round(cloud.w * 0.68), h, time.cloud);
      bar(cloud.x, cloud.y + h * 2, cloud.w, h, time.cloud);
      bar(cloud.x, cloud.y + h * 3 - 1, cloud.w, 1, time.cloudShade);
    });
    return c;
  }

  function drawFar(season, ink) {
    var c = makeCanvas(PERIOD, FAR_H);
    var g = c.getContext('2d');
    for (var x = 0; x < PERIOD; x += 1) {
      var u = x / PERIOD * TAU;
      var back = Math.round(46 + 14 * Math.sin(u * 2 + 1) + 8 * Math.sin(u * 5 + 2.2));
      var front = Math.round(26 + 9 * Math.sin(u * 3 + 4) + 5 * Math.sin(u * 7 + 0.5));
      g.fillStyle = ink(season.hillFar);
      g.fillRect(x, FAR_H - back, 1, back);
      g.fillStyle = ink(season.hillNear);
      g.fillRect(x, FAR_H - front, 1, front);
    }
    return c;
  }

  function drawMid(season, ink) {
    var c = makeCanvas(PERIOD, MID_H);
    var g = c.getContext('2d');
    TREES.forEach(function (tree) {
      var width = Math.max(3, Math.round(tree.h * 0.1));
      var crownY = Math.round(MID_H - tree.h * 0.66);
      var R = tree.h * 0.36;
      g.fillStyle = ink(season.trunk);
      g.fillRect(tree.x - (width >> 1), crownY, width, MID_H - crownY);
      for (var i = 0; i < 13; i += 1) {
        var angle = noise(tree.seed, i) * TAU;
        var reach = noise(i, tree.seed + 3) * R;
        var cx = Math.round(tree.x + Math.cos(angle) * reach * 1.2);
        var cy = Math.round(crownY + Math.sin(angle) * reach * 0.72);
        var r = Math.round(R * (0.34 + noise(tree.seed + 5, i) * 0.26));
        disc(g, cx, cy, r, leafPaint(cx, cy, r, tree.seed, season, ink));
      }
    });
    return c;
  }

  function leafPaint(cx, cy, r, seed, season, ink) {
    return function (px, py) {
      var n = noise(cx + px, cy + py + seed) + py / r * 0.22;
      if (n < 0.34) { return ink(season.crown[2]); }
      return n < 0.8 ? ink(season.crown[0]) : ink(season.crown[1]);
    };
  }

  function drawGround(season, ink) {
    var c = makeCanvas(PERIOD, GROUND_H);
    var g = c.getContext('2d');
    function rect(x, y, w, h, color) {
      g.fillStyle = ink(color);
      g.fillRect(x, y, w, h);
    }
    rect(0, 0, PERIOD, GROUND_H, season.grass);
    rect(0, 0, PERIOD, 2, season.grassDark);
    rect(0, 8, PERIOD, 28, season.road.road);
    rect(0, 8, PERIOD, 2, season.road.roadEdge);
    rect(0, 34, PERIOD, 2, season.road.roadEdge);
    for (var d = 0; d < PERIOD; d += 32) { rect(d, 21, 16, 2, season.road.dash); }
    for (var i = 0; i < 150; i += 1) {
      var upper = noise(i, 2) < 0.35;
      var y = upper ? 2 + Math.floor(noise(i, 3) * 5) : 38 + Math.floor(noise(i, 4) * 13);
      rect(Math.floor(noise(i, 1) * (PERIOD - 2)), y, 2, 2, i % 3 === 0 ? season.grassDark : season.flecks[i % season.flecks.length]);
    }
    return c;
  }

  var worlds = {};
  function worldFor(place) {
    if (!worlds[place.id]) {
      var season = SEASONS[place.season];
      var time = TIMES[place.time];
      var ink = inkFor(time.tint);
      worlds[place.id] = { clouds: drawClouds(time), far: drawFar(season, ink), mid: drawMid(season, ink), ground: drawGround(season, ink), ink: ink };
    }
    return worlds[place.id];
  }

  /* ===== 飄落的東西 ===== */

  function sprite(rows, palette) {
    var c = makeCanvas(rows[0].length, rows.length);
    var g = c.getContext('2d');
    rows.forEach(function (row, y) {
      row.split('').forEach(function (ch, x) {
        if (palette[ch]) {
          g.fillStyle = palette[ch];
          g.fillRect(x, y, 1, 1);
        }
      });
    });
    return c;
  }

  function spins(base) {
    var out = [base];
    for (var i = 1; i < 4; i += 1) {
      var prev = out[i - 1];
      var c = makeCanvas(prev.height, prev.width);
      var g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.translate(c.width, 0);
      g.rotate(Math.PI / 2);
      g.drawImage(prev, 0, 0);
      out.push(c);
    }
    return out;
  }

  var PETAL = ['.aa..', 'aaba.', '.abaa', '..aa.'];
  var MAPLE = [
    '....a....',
    '...aca...',
    'a..aca..a',
    'aa.aca.aa',
    '.aaacaaa.',
    '..aacaa..',
    '.aaacaaa.',
    '....b....',
    '....b....'
  ];

  var kit = null;
  function bits() {
    if (!kit) {
      kit = {
        petals: [
          spins(sprite(PETAL, { a: '#F39DB5', b: '#F9C9D6' })),
          spins(sprite(PETAL, { a: '#F7B4C6', b: '#FCDDE5' }))
        ],
        leaves: [
          spins(sprite(MAPLE, { a: '#E8822E', c: '#C8622A', b: '#7A4A24' })),
          spins(sprite(MAPLE, { a: '#C8452B', c: '#A33622', b: '#7A4A24' })),
          spins(sprite(MAPLE, { a: '#EDB23C', c: '#D0902B', b: '#7A4A24' }))
        ]
      };
    }
    return kit;
  }

  function drift(v, count, seed, o, draw) {
    for (var i = 0; i < count; i += 1) {
      var q = (v.p - noise(i, seed) * 0.4) / 0.6;
      if (q < 0 || q > 1) { continue; }
      var start = noise(seed, i + 9) * v.W * 1.3 - v.W * 0.2;
      var y = q * (v.H + 24) - 12;
      draw(i, start + q * o.wind + Math.sin(q * o.sway + i) * o.swing, o.rise ? v.H - y : y, q);
    }
  }

  var FALLING = {
    spring: function (ctx, v) {
      drift(v, Math.round(v.W * 0.14), 3, { wind: -v.W * 0.16, sway: 7, swing: 5 }, function (i, x, y, q) {
        put(ctx, bits().petals[i % 2][Math.floor(q * 10 + i) % 4], x, y, v.art);
      });
    },
    /* 夏天是往上飄的光點，晚上就成了螢火蟲。 */
    summer: function (ctx, v) {
      drift(v, Math.round(v.W * 0.1), 8, { wind: -v.W * 0.06, sway: 6, swing: 6, rise: true }, function (i, x, y, q) {
        if (Math.floor(q * 12 + i) % 3 === 0) { return; }
        block(ctx, x, y, 2, 2, '#F4F7A1', v.art);
      });
    },
    autumn: function (ctx, v) {
      drift(v, Math.round(v.W * 0.09), 7, { wind: -v.W * 0.2, sway: 9, swing: 8 }, function (i, x, y, q) {
        put(ctx, bits().leaves[i % 3][Math.floor(q * 9 + i) % 4], x, y, v.art);
      });
    },
    winter: function (ctx, v) {
      drift(v, Math.round(v.W * 0.4), 5, { wind: -v.W * 0.08, sway: 5, swing: 3 }, function (i, x, y) {
        var size = i % 3 === 0 ? 3 : 2;
        block(ctx, x, y + size, size, 1, '#9FC2DB', v.art);
        block(ctx, x, y, size, size, '#FFFFFF', v.art);
      });
    }
  };

  /* ===== 畫面 ===== */

  function put(ctx, img, x, y, art) {
    ctx.drawImage(img, Math.round(x) * art, Math.round(y) * art, img.width * art, img.height * art);
  }

  function block(ctx, x, y, w, h, color, art) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x) * art, Math.round(y) * art, w * art, h * art);
  }

  function strip(ctx, img, offset, y, v) {
    for (var x = -mod(Math.round(offset), img.width); x < v.W; x += img.width) {
      put(ctx, img, x, y, v.art);
    }
  }

  /* 路邊的指示牌，寫著這一站的編號。 */
  function paintSign(ctx, label, x, top, ink, art) {
    ctx.font = (12 * art) + 'px "Cubic 11", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var textW = Math.ceil(ctx.measureText(label).width / art);
    var boardW = Math.max(34, textW + 12);
    var boardY = top - 34;
    var left = Math.round(x - boardW / 2);
    block(ctx, left + (boardW >> 1) - 2, boardY + 18, 4, 26, ink('#7A5040'), art);
    block(ctx, left, boardY, boardW, 20, ink('#7A5040'), art);
    block(ctx, left + 2, boardY + 2, boardW - 4, 16, ink('#E3BE86'), art);
    ctx.fillStyle = ink('#3A2A22');
    ctx.fillText(label, (left + Math.round((boardW - textW) / 2)) * art, (boardY + 15) * art);
  }

  /* 馬鈴薯用現成的奔跑小圖，一路蹦蹦跳跳往前。 */
  var runner = new Image();
  runner.src = (window.SPRITE_DATA && window.SPRITE_DATA.potato_run) || 'assets/img/mascots/1x/potato_run.png';
  var HOPS = 6;

  function paintRunner(ctx, v, top, ink) {
    var forward = v.dir > 0;
    var w = 47;
    var h = 50;
    var along = forward ? 0.3 + 0.32 * v.p : 0.7 - 0.32 * v.p;
    var x = Math.round(v.W * along - w / 2);
    var feet = top + 31;
    var lift = Math.abs(Math.sin(Math.PI * HOPS * v.p));

    /* 影子 */
    var shadow = lift > 0.6 ? 22 : 32;
    block(ctx, x + Math.round((w - shadow) / 2), feet - 2, shadow, 3, ink('#B89F73'), v.art);

    /* 落地揚起的塵土 */
    for (var k = 1; k < HOPS; k += 1) {
      var age = (v.p - k / HOPS) / 0.1;
      if (age < 0 || age >= 1) { continue; }
      var at = v.W * (forward ? 0.3 + 0.32 * k / HOPS : 0.7 - 0.32 * k / HOPS) - (forward ? 18 : -18) - (v.p - k / HOPS) * TRAVEL * v.dir;
      var size = age < 0.5 ? 4 : 2;
      block(ctx, at, feet - 4 - age * 6, size, size, ink('#F3E3BF'), v.art);
      block(ctx, at - 7 * v.dir, feet - 2 - age * 3, size, size, ink('#F3E3BF'), v.art);
    }

    if (!runner.complete || !runner.naturalWidth) { return; }
    var y = Math.round(feet - h - lift * 9);
    /* 原圖面向左邊，往前跑時翻過來。 */
    ctx.save();
    ctx.translate((forward ? x + w : x) * v.art, y * v.art);
    ctx.scale(forward ? -1 : 1, 1);
    ctx.drawImage(runner, 0, 0, w * v.art, h * v.art);
    ctx.restore();
  }

  function paint(ctx, place, v) {
    var world = worldFor(place);
    var top = v.H - GROUND_H;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyFor(place.time, v.W, v.H), 0, 0, v.W * v.art, v.H * v.art);
    strip(ctx, world.clouds, v.scroll * 0.06, 6, v);
    strip(ctx, world.far, v.scroll * 0.2, top + 4 - FAR_H, v);
    strip(ctx, world.mid, v.scroll * 0.55, top + 4 - MID_H, v);
    strip(ctx, world.ground, v.scroll, top, v);
    paintSign(ctx, place.sign, v.W * (v.dir > 0 ? 0.64 : 0.36) + (0.55 - v.p) * TRAVEL * v.dir, top, world.ink, v.art);
    paintRunner(ctx, v, top, world.ink);
    FALLING[place.season](ctx, v);
  }

  /* 這一張在旅程的哪裡。每一章從白天開始，首頁算清晨，所以第一次翻頁就是白天。 */
  function placeOf(stop, stops) {
    var chapter = stop.getAttribute('data-chapter');
    var step = stops.filter(function (s) { return s.getAttribute('data-chapter') === chapter; }).indexOf(stop);
    var season = CHAPTER_SEASON[chapter];
    var time = CYCLE[(step + (chapter === '0' ? 3 : 0)) % CYCLE.length];
    var level = stop.getAttribute('data-interlude');
    var sign = stop.getAttribute('data-scene');
    if (level) { sign = level === '6' ? '終點' : '第 ' + level + ' 關'; }
    return { season: season, time: time, sign: sign, id: season + '-' + time };
  }

  window.Journey = {
    TRAVEL: TRAVEL,
    placeOf: placeOf,
    paint: paint,
    warm: worldFor,
    ready: function () { return runner.complete && runner.naturalWidth > 0; }
  };
})();
