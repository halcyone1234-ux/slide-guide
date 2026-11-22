/* 講義各段的互動：選擇題、題組、改前改後、找找看、數一數、前後對照、評分、檢查表、複製，
   以及幾個只用一次的小實驗（三秒鐘、一秒鐘、對比、後排、九張卡片、給 AI 六件事、指令產生器、路線）。
   沒有 JavaScript 時，每一頁都退回成可以直接閱讀的內容。 */
(function () {
  'use strict';

  var reduced = window.Site.reduced;

  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem('sg.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try { window.localStorage.setItem('sg.' + key, JSON.stringify(value)); } catch (e) { /* 不記住也沒關係 */ }
    }
  };

  function all(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function sceneOf(el) {
    return el.closest('[data-scene]');
  }

  function press(buttons, active) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === active ? 'true' : 'false'); });
  }

  function setMood(scene, mood) {
    if (!scene || !mood) { return; }
    scene.setAttribute('data-audience', mood);
    if (window.Site.currentStop() === scene) { window.Mascots.refreshMood(); }
  }

  function speak(scene, text) {
    var line = scene && scene.querySelector('.dialog [data-say]');
    if (!line || !text) { return; }
    line.setAttribute('data-said', '');
    window.Mascots.say(line, text);
  }

  function fx(kind, target) {
    if (window.Feedback) { window.Feedback[kind](target); }
  }

  function onArrive(scene, enter, leave) {
    var inside = false;
    document.addEventListener('stopchange', function (event) {
      var here = event.detail.stop === scene;
      if (here && !inside) {
        inside = true;
        enter();
      } else if (!here && inside) {
        inside = false;
        if (leave) { leave(); }
      }
    });
  }

  function reveal(selector) {
    if (!selector) { return; }
    all(document, selector).forEach(function (el) {
      el.hidden = false;
      el.classList.add('is-revealed');
    });
  }

  function unhide(root) {
    all(root, '[data-js]').forEach(function (el) { el.hidden = false; });
  }

  /* ===== 選擇題：選錯閃紅框，選對放煙火 ===== */
  function initQuizzes() {
    all(document, '[data-quiz]').forEach(function (quiz) {
      var scene = sceneOf(quiz);
      var right = quiz.getAttribute('data-right');
      var buttons = all(quiz, '[data-choice]');
      quiz.hidden = false;
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (quiz.hasAttribute('data-locked')) { return; }
          var ok = button.getAttribute('data-choice') === right;
          buttons.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
          button.classList.add(ok ? 'is-right' : 'is-wrong');
          press(buttons, button);
          if (ok) {
            quiz.classList.add('is-solved');
            fx('right', button);
            if (!quiz.hasAttribute('data-no-party')) { fx('party'); }
            setMood(scene, quiz.getAttribute('data-mood') || 'happy');
            speak(scene, quiz.getAttribute('data-say-right'));
            reveal(quiz.getAttribute('data-reveal'));
          } else {
            fx('wrong', button);
            setMood(scene, 'speechless');
            speak(scene, button.getAttribute('data-why') || quiz.getAttribute('data-say-wrong') || '再想一想。');
          }
          quiz.dispatchEvent(new CustomEvent('answer', { detail: { ok: ok, choice: button.getAttribute('data-choice') } }));
        });
      });
    });
  }

  /* ===== 題組：一次一題，答對才有下一題，全部答對放煙火 ===== */
  function initDecks() {
    all(document, '[data-qdeck]').forEach(function (deck) {
      var scene = sceneOf(deck);
      var cards = all(deck, '.qcard');
      var count = deck.querySelector('[data-qcount]');
      var next = deck.querySelector('[data-qnext]');
      var current = 0;

      function show(i) {
        current = i;
        cards.forEach(function (card, k) { card.hidden = k !== i; });
        count.textContent = (i + 1) + ' / ' + cards.length;
        next.hidden = true;
      }

      deck.classList.add('is-live');
      unhide(deck);
      cards.forEach(function (card, k) {
        var answer = card.getAttribute('data-answer');
        all(card, '[data-opt]').forEach(function (button) {
          button.addEventListener('click', function () {
            if (card.classList.contains('is-done')) { return; }
            if (button.getAttribute('data-opt') === answer) {
              card.classList.add('is-done');
              button.classList.add('is-right');
              fx('right', button);
              speak(scene, card.getAttribute('data-say'));
              if (k === cards.length - 1) {
                deck.classList.add('is-finished');
                count.textContent = '全部答對';
                setMood(scene, 'love');
                fx('party');
              } else {
                setMood(scene, 'happy');
                next.hidden = false;
              }
            } else {
              button.classList.remove('is-wrong');
              void button.offsetWidth;
              button.classList.add('is-wrong');
              fx('wrong', button);
              setMood(scene, 'speechless');
              speak(scene, button.getAttribute('data-why') || '再想一想。');
            }
          });
        });
      });
      next.addEventListener('click', function () {
        if (current < cards.length - 1) { show(current + 1); }
      });
      show(0);
    });
  }

  /* ===== 改之前、改之後 ===== */
  function initFlips() {
    all(document, '[data-flip]').forEach(function (group) {
      var scene = sceneOf(group);
      var target = document.querySelector(group.getAttribute('data-flip'));
      var attr = group.getAttribute('data-attr') || 'data-state';
      var buttons = all(group, '[data-value]');
      group.hidden = false;
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          target.setAttribute(attr, button.getAttribute('data-value'));
          press(buttons, button);
          speak(scene, button.getAttribute('data-say'));
          setMood(scene, button.getAttribute('data-mood'));
        });
      });
      /* 有 JavaScript 時從「改之前」開始，按了才看到改法。 */
      var start = buttons.filter(function (b) { return b.hasAttribute('data-start'); })[0];
      if (start) {
        target.setAttribute(attr, start.getAttribute('data-value'));
        press(buttons, start);
      }
    });

    all(document, '[data-toggle]').forEach(function (button) {
      var target = document.querySelector(button.getAttribute('data-toggle'));
      var attr = button.getAttribute('data-attr');
      button.hidden = false;
      button.addEventListener('click', function () {
        var on = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) { target.setAttribute(attr, ''); } else { target.removeAttribute(attr); }
      });
    });
  }

  /* ===== 找找看：計時，點到對的地方就停 ===== */
  function initFinders() {
    all(document, '[data-find]').forEach(function (box) {
      var scene = sceneOf(box);
      var area = box.querySelector('[data-find-area]');
      var start = box.querySelector('[data-find-start]');
      var clock = box.querySelector('[data-clock]');
      var saveKey = box.getAttribute('data-save');
      var compareKey = box.getAttribute('data-compare-to');
      var began = 0;
      var timer = 0;
      var found = false;

      function stopClock() {
        window.clearInterval(timer);
        timer = 0;
      }

      function begin() {
        found = false;
        began = Date.now();
        area.classList.add('is-hunting');
        all(area, '.is-found').forEach(function (el) { el.classList.remove('is-found'); });
        stopClock();
        if (clock) {
          clock.textContent = '0.0 秒';
          timer = window.setInterval(function () { clock.textContent = ((Date.now() - began) / 1000).toFixed(1) + ' 秒'; }, 100);
        }
        speak(scene, box.getAttribute('data-say-start'));
      }

      unhide(box);
      if (start) { start.addEventListener('click', begin); } else { began = Date.now(); }

      area.addEventListener('click', function (event) {
        if (found) { return; }
        if (start && !began) {
          speak(scene, '先按「開始」，再找。');
          return;
        }
        var spot = event.target.closest('[data-spot]');
        if (spot && area.contains(spot)) {
          found = true;
          stopClock();
          area.classList.remove('is-hunting');
          spot.classList.add('is-found');
          var seconds = (Date.now() - began) / 1000;
          if (clock && start) { clock.textContent = seconds.toFixed(1) + ' 秒'; }
          fx('right', spot);
          fx('party');
          setMood(scene, box.getAttribute('data-mood') || 'happy');
          var text = box.getAttribute('data-say-found') || '';
          if (start) {
            text = text.replace('{s}', seconds.toFixed(1));
            var before = compareKey ? store.get(compareKey, null) : null;
            if (before !== null) { text += '上次花了 ' + before.toFixed(1) + ' 秒。'; }
          }
          if (saveKey && start) { store.set(saveKey, seconds); }
          speak(scene, text);
          reveal(box.getAttribute('data-reveal'));
        } else {
          var miss = event.target.closest('li, p, td, th, span, div, svg, figure') || area;
          fx('wrong', miss === area ? [] : miss);
          setMood(scene, 'speechless');
          speak(scene, box.getAttribute('data-say-miss') || '不是這裡，再找找。');
        }
      });
      onArrive(scene, function () {}, stopClock);
    });
  }

  /* ===== 三秒鐘：只給看三秒，再回答 ===== */
  function initGlances() {
    all(document, '[data-glance]').forEach(function (box) {
      var scene = sceneOf(box);
      var screen = box.querySelector('[data-glance-screen]');
      var button = box.querySelector('[data-glance-start]');
      var seconds = Number(box.getAttribute('data-glance')) || 3;
      var label = button.textContent;
      var timer = 0;
      unhide(box);
      screen.classList.add('is-covered');
      button.addEventListener('click', function () {
        window.clearInterval(timer);
        var left = seconds;
        screen.classList.remove('is-covered');
        button.disabled = true;
        button.textContent = left + ' 秒';
        timer = window.setInterval(function () {
          left -= 1;
          if (left > 0) {
            button.textContent = left + ' 秒';
            return;
          }
          window.clearInterval(timer);
          screen.classList.add('is-covered');
          button.disabled = false;
          button.textContent = label;
          speak(scene, box.getAttribute('data-say-after') || '時間到。你選哪一個？');
        }, 1000);
      });
    });
  }

  /* ===== 數一數：點一下算一樣 ===== */
  function initCounters() {
    all(document, '[data-count]').forEach(function (box) {
      var scene = sceneOf(box);
      var items = all(box, '[data-countme]');
      var out = box.querySelector('[data-count-out]');
      var reset = box.querySelector('[data-count-reset]');
      var n = 0;
      unhide(box);
      items.forEach(function (item) {
        item.addEventListener('click', function (event) {
          event.stopPropagation();
          if (item.hasAttribute('data-counted')) { return; }
          n += 1;
          item.setAttribute('data-counted', String(n));
          out.textContent = String(n);
          if (n === items.length) {
            fx('party');
            setMood(scene, 'surprised');
            speak(scene, box.getAttribute('data-say-done'));
            reveal(box.getAttribute('data-reveal'));
          } else {
            speak(scene, '第 ' + n + ' 樣：' + (item.getAttribute('data-countme') || '') + '。');
          }
        });
      });
      if (reset) {
        reset.addEventListener('click', function () {
          n = 0;
          out.textContent = '0';
          items.forEach(function (item) { item.removeAttribute('data-counted'); });
        });
      }
    });
  }

  /* ===== 前後對照：拖拉分隔線 ===== */
  function initCompares() {
    all(document, '[data-compare]').forEach(function (box) {
      var range = box.querySelector('input[type="range"]');
      var after = box.querySelector('.compare__after');
      function update() {
        box.style.setProperty('--cut', range.value + '%');
        after.style.clipPath = 'inset(0 0 0 ' + range.value + '%)';
      }
      box.classList.add('is-live');
      range.hidden = false;
      range.addEventListener('input', update);
      update();
    });
  }

  /* ===== 評分：想繼續看下去的程度 ===== */
  function initRatings() {
    all(document, '[data-rating]').forEach(function (group) {
      var scene = sceneOf(group);
      var key = 'rating.' + group.getAttribute('data-rating');
      var buttons = all(group, '[data-score]');
      var other = group.getAttribute('data-against');
      var note = group.parentNode.querySelector('[data-rating-note]');

      function paint(score) {
        buttons.forEach(function (b) {
          var on = Number(b.getAttribute('data-score')) <= score;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', Number(b.getAttribute('data-score')) === score ? 'true' : 'false');
        });
      }

      function compare(score) {
        if (!other || !note) { return; }
        var before = store.get('rating.' + other, null);
        note.textContent = before === null ? '還沒在 2-1 評過分。' : '原版你給 ' + before + ' 顆，現在 ' + score + ' 顆。';
        if (before !== null && score > before) { fx('party'); }
      }

      group.hidden = false;
      var saved = store.get(key, 0);
      if (saved) { paint(saved); }
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          var score = Number(b.getAttribute('data-score'));
          paint(score);
          store.set(key, score);
          setMood(scene, ['', 'sleepy', 'neutral', 'thinking', 'happy', 'love'][score]);
          speak(scene, group.getAttribute('data-say').replace('{n}', String(score)));
          compare(score);
        });
      });
      onArrive(scene, function () {
        var score = store.get(key, 0);
        if (score && other) { compare(score); }
      });
    });
  }

  /* ===== 檢查表：勾選會記住，全部打勾放煙火 ===== */
  function initChecklists() {
    all(document, '[data-checklist]').forEach(function (list) {
      var scene = sceneOf(list);
      var key = list.getAttribute('data-checklist');
      var boxes = all(list, 'input[type="checkbox"]');
      var out = scene.querySelector('[data-check-count]');
      var saved = store.get(key, {});
      function count(talk) {
        var n = boxes.filter(function (b) { return b.checked; }).length;
        if (out) { out.textContent = n + '/' + boxes.length; }
        setMood(scene, n === boxes.length ? 'love' : (n >= boxes.length / 2 ? 'happy' : 'thinking'));
        if (talk && n === boxes.length) {
          fx('party');
          speak(scene, list.getAttribute('data-say-done'));
        }
      }
      boxes.forEach(function (box) {
        box.checked = Boolean(saved[box.value]);
        box.addEventListener('change', function () {
          saved[box.value] = box.checked;
          store.set(key, saved);
          count(true);
        });
      });
      count(false);
    });

    all(document, '[data-print-checklist]').forEach(function (button) {
      if (window.SG_PREVIEW || typeof window.print !== 'function') { return; }
      button.hidden = false;
      button.addEventListener('click', function () {
        var root = document.documentElement;
        root.classList.add('print-checklist');
        window.addEventListener('afterprint', function done() {
          root.classList.remove('print-checklist');
          window.removeEventListener('afterprint', done);
        });
        window.print();
      });
    });
  }

  /* ===== 複製：複製不了時改成選取文字 ===== */
  function copyText(text, button, source) {
    var label = button.getAttribute('data-label') || button.textContent;
    button.setAttribute('data-label', label);
    function done(ok) {
      button.textContent = ok ? '已複製' : '已選取，請按 Ctrl+C';
      if (ok) { fx('right', button); }
      window.setTimeout(function () { button.textContent = label; }, 1800);
    }
    function fallback() {
      if (source && source.select) {
        source.focus();
        source.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        done(ok);
        return;
      }
      var helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
      document.body.removeChild(helper);
      done(copied);
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        return;
      }
    } catch (e) { /* 改用選取 */ }
    fallback();
  }

  function initCopies() {
    all(document, '[data-copy]').forEach(function (button) {
      button.hidden = false;
      button.addEventListener('click', function () {
        var source = document.querySelector(button.getAttribute('data-copy'));
        copyText(source.value !== undefined ? source.value : source.textContent.trim(), button, source.value !== undefined ? source : null);
      });
    });
  }

  /* ===== 0-3 今天的路線 ===== */
  function initRoute() {
    var root = document.querySelector('[data-route]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var stops = all(root, '[data-stop]');
    var cards = all(root, '[data-stop-card]');
    var walker = root.querySelector('.route__walker');
    var seen = {};
    function go(i, talk) {
      press(stops, stops[i]);
      cards.forEach(function (card, k) { card.hidden = k !== i; });
      root.style.setProperty('--at', String(i));
      seen[i] = true;
      if (walker) { walker.setAttribute('data-at', String(i)); }
      if (talk) {
        speak(scene, stops[i].getAttribute('data-say'));
        setMood(scene, Object.keys(seen).length === stops.length ? 'happy' : 'thinking');
      }
    }
    unhide(root);
    stops.forEach(function (button, i) {
      button.addEventListener('click', function () { go(i, true); });
    });
    go(0, false);
  }

  /* ===== 2-2 九張卡片 ===== */
  function initCards() {
    var root = document.querySelector('[data-cards]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var messy = root.querySelector('.cards--messy');
    var tidy = root.querySelector('[data-tidy]');
    unhide(root);
    tidy.addEventListener('click', function () {
      var on = !messy.classList.contains('is-tidy');
      messy.classList.toggle('is-tidy', on);
      tidy.setAttribute('aria-pressed', on ? 'true' : 'false');
      tidy.textContent = on ? '恢復原狀' : '把左邊排整齊';
      speak(scene, on ? '大小一樣、邊對齊、間距相等。只做了這三件事。' : '每一格都要重新找位置，眼睛很累。');
      setMood(scene, on ? 'happy' : 'speechless');
    });
  }

  /* ===== 2-4 對比：讀不讀得到 ===== */
  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, v, i) { return sum + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }

  function contrast(a, b) {
    var x = luminance(a);
    var y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function initContrast() {
    var root = document.querySelector('[data-contrast]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var preview = root.querySelector('[data-contrast-preview]');
    var out = root.querySelector('[data-contrast-out]');
    var state = { fg: '#16324F', bg: '#FFFFFF' };

    all(root, '[data-swatch]').forEach(function (cell) {
      var ratio = contrast(cell.getAttribute('data-fg'), cell.getAttribute('data-bg'));
      cell.querySelector('[data-ratio]').textContent = '對比 ' + ratio.toFixed(1) + '：1　' + (ratio >= 4.5 ? '過關' : '沒過');
      cell.classList.toggle('is-pass', ratio >= 4.5);
    });

    function update(talk) {
      var ratio = contrast(state.fg, state.bg);
      preview.style.color = state.fg;
      preview.style.backgroundColor = state.bg;
      var pass = ratio >= 4.5;
      var large = ratio >= 3;
      out.textContent = '對比 ' + ratio.toFixed(1) + '：1　' + (pass ? '一般文字過關' : (large ? '只有大字過關' : '沒過'));
      out.classList.toggle('is-pass', pass);
      setMood(scene, pass ? 'happy' : (large ? 'thinking' : 'speechless'));
      if (talk) {
        if (pass) { fx('right', out); } else { fx('wrong', out); }
      }
    }

    all(root, '[data-fg-pick], [data-bg-pick]').forEach(function (button) {
      button.addEventListener('click', function () {
        var isFg = button.hasAttribute('data-fg-pick');
        state[isFg ? 'fg' : 'bg'] = button.getAttribute(isFg ? 'data-fg-pick' : 'data-bg-pick');
        press(all(root, isFg ? '[data-fg-pick]' : '[data-bg-pick]'), button);
        update(true);
      });
    });
    unhide(root);
    update(false);
  }

  /* ===== 2-8 坐在第幾排 ===== */
  function initDistance() {
    var root = document.querySelector('[data-distance]');
    if (!root) { return; }
    var range = root.querySelector('input[type="range"]');
    var label = root.querySelector('[data-row]');
    var ladder = root.querySelector('.ladder');
    function update() {
      var row = Number(range.value);
      label.textContent = '第 ' + row + ' 排';
      ladder.style.setProperty('--row', String(row));
    }
    unhide(root);
    range.addEventListener('input', update);
    update();
  }

  /* ===== 2-10 一秒鐘：橘點在哪裡 ===== */
  function initGlimpse() {
    var root = document.querySelector('[data-glimpse]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var grid = root.querySelector('.dots');
    var cells = all(grid, '.dot');
    var start = root.querySelector('[data-glimpse-start]');
    var status = root.querySelector('[data-glimpse-status]');
    var round = 0;
    var target = -1;
    var waiting = false;
    var POSITIONS = [17, 6];
    var PALETTE = ['#2E7D6B', '#6A4C8C', '#C0392B', '#1F4468', '#7FA7C9', '#B07A45', '#9BD37E', '#F39DB5'];

    function paint(mode) {
      cells.forEach(function (cell, i) {
        var color = '#AEB8C0';
        if (i === target) { color = '#F2A541'; }
        else if (mode === 'busy') { color = PALETTE[(i * 5) % PALETTE.length]; }
        cell.style.setProperty('--dot', color);
      });
    }

    function play() {
      target = POSITIONS[round % 2];
      grid.setAttribute('data-mode', round % 2 ? 'busy' : 'calm');
      paint(round % 2 ? 'busy' : 'calm');
      grid.classList.remove('is-hidden');
      status.textContent = round % 2 ? '第 2 回：每一顆都不一樣' : '第 1 回：只有一顆不一樣';
      start.disabled = true;
      window.setTimeout(function () {
        grid.classList.add('is-hidden');
        waiting = true;
        status.textContent = '橘點剛剛在哪一格？點那一格。';
        start.disabled = false;
      }, 1000);
    }

    cells.forEach(function (cell, i) {
      cell.addEventListener('click', function () {
        if (!waiting) { return; }
        waiting = false;
        grid.classList.remove('is-hidden');
        if (i === target) {
          fx('right', cell);
          fx('party');
          speak(scene, round % 2 ? '這回也找到了，但是不是比較吃力？' : '幾乎不用找。其他都是灰的，橘點自己跳出來。');
          setMood(scene, 'happy');
        } else {
          fx('wrong', cell);
          speak(scene, round % 2 ? '每一顆都在搶，橘點就被淹沒了。每一樣都強調，等於沒有強調。' : '再試一次，盯著畫面中間。');
          setMood(scene, 'speechless');
        }
        round += 1;
        start.textContent = round % 2 ? '第 2 回' : '再玩一次';
      });
    });

    unhide(root);
    grid.classList.add('is-hidden');
    start.addEventListener('click', play);
  }

  /* ===== 5-3 給 AI 六件事 ===== */
  function initSixThings() {
    var root = document.querySelector('[data-six]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var mock = root.querySelector('[data-ai-mock]');
    var buttons = all(root, '[data-give]');
    var out = root.querySelector('[data-six-count]');
    unhide(root);
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-give');
        var on = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) { mock.setAttribute('data-' + key, ''); } else { mock.removeAttribute('data-' + key); }
        var n = buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
        out.textContent = n + '/6';
        setMood(scene, ['sleepy', 'sleepy', 'neutral', 'neutral', 'thinking', 'happy', 'love'][n]);
        if (n === 6) {
          fx('party');
          speak(scene, '六件都給了：結論、聽眾、大綱、資料、規格、不要什麼。它就不用自己編了。');
        } else {
          speak(scene, on ? button.getAttribute('data-say') : '少了這一件，它又開始自己猜。');
        }
      });
    });
  }

  /* ===== 5-4 指令產生器：分兩次下指令 ===== */
  function initPromptMaker() {
    var root = document.querySelector('[data-prompt]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var fields = {};
    all(root, '[data-field]').forEach(function (el) { fields[el.getAttribute('data-field')] = el; });
    var first = root.querySelector('[data-out="first"]');
    var second = root.querySelector('[data-out="second"]');
    var warn = root.querySelector('[data-prompt-warn]');
    var config = window.SiteConfig;

    var saved = store.get('prompt', null);
    if (saved) {
      Object.keys(fields).forEach(function (key) { if (saved[key] !== undefined) { fields[key].value = saved[key]; } });
    }

    /* 第 4 關寫好的一句話結論帶過來；同一次瀏覽裡剛寫好的也算。 */
    function prefill() {
      var line = store.get('oneLine', null);
      if (fields.thesis.value.trim() || !line || !line.find || !line.act) { return false; }
      fields.thesis.value = '我們發現' + line.find + '，所以建議' + line.act;
      return true;
    }
    prefill();
    if (!fields.minutes.value) { fields.minutes.value = String(config.minutes); }
    if (!fields.pages.value) { fields.pages.value = String(config.pages); }

    function fill(value, hole) {
      var text = value.trim();
      return text ? text : '〔' + hole + '〕';
    }

    function update() {
      var v = {};
      Object.keys(fields).forEach(function (key) { v[key] = fields[key].value; });
      store.set('prompt', v);
      var thesis = fill(v.thesis, '我們發現＿＿，所以建議＿＿');
      var audience = fill(v.audience, '誰在聽、他們已經知道什麼');
      var minutes = fill(v.minutes, '20');
      var pages = fill(v.pages, '20');
      var data = fill(v.data, '貼上重點、數字和出處');
      first.value = [
        '我要做一份課堂報告的簡報。請先只給我大綱，不要生成投影片。',
        '',
        '一句話結論：' + thesis,
        '聽眾：' + audience,
        '長度：' + minutes + ' 分鐘，約 ' + pages + ' 頁',
        '我手上的資料：',
        data,
        '',
        '請給我 ' + pages + ' 頁的大綱，每頁一行，格式是：頁碼｜標題｜這一頁放什麼',
        '要求：',
        '1. 標題寫成一句完整的結論，20 字以內，不要只寫名詞。',
        '2. 第一頁要能引起興趣，用一個問題、一個數字或一個場景開場。不要自我介紹，不要目錄。',
        '3. 最後一頁是一句讓人帶走的話，不要「謝謝聆聽」。',
        '4. 只能使用我提供的資料。需要但我沒有給的數字，請寫〔待查證〕，不要自己編。'
      ].join('\n');
      second.value = [
        '請依照下面這份我改過的大綱生成簡報。',
        '',
        '（貼上你改好的大綱）',
        '',
        '規格：',
        '1. 繁體中文，台灣用語。',
        '2. 標題照大綱寫，不要改成名詞。',
        '3. 每頁只講一件事，最多 3 個重點，每個重點 15 字以內。',
        '4. 全份只用三個顏色：深藍、灰、橘。',
        '5. 不要目錄頁，不要與內容無關的裝飾圖。',
        '6. 每個數字下方留一行「資料來源：」讓我自己填。'
      ].join('\n');
      var holes = ['thesis', 'audience', 'minutes', 'pages', 'data'].filter(function (key) { return !v[key].trim(); }).length;
      warn.textContent = holes ? '還有 ' + holes + ' 格沒填，複製出去的指令會留著〔 〕。' : '五格都填好了，可以複製。';
      warn.classList.toggle('is-ok', !holes);
      setMood(scene, holes ? 'thinking' : 'happy');
    }

    unhide(root);
    Object.keys(fields).forEach(function (key) { fields[key].addEventListener('input', update); });
    update();
    onArrive(scene, function () { if (prefill()) { update(); } });
  }

  initQuizzes();
  initDecks();
  initFlips();
  initFinders();
  initGlances();
  initCounters();
  initCompares();
  initRatings();
  initChecklists();
  initCopies();
  initRoute();
  initCards();
  initContrast();
  initDistance();
  initGlimpse();
  initSixThings();
  initPromptMaker();

  window.Lessons = { contrast: contrast };
})();
