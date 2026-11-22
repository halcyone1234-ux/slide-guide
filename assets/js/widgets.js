/* 各場景的小互動。每一頁都有一個可以動手的地方，馬鈴薯和觀眾魟魚會跟著反應。
   沒有 JavaScript 時，每一頁都退回成可以直接閱讀的靜態內容。 */
(function () {
  'use strict';

  var reduced = window.Site.reduced;

  /* 瀏覽器存不了資料時照常可用，只是不會記住。 */
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
      try {
        window.localStorage.setItem('sg.' + key, JSON.stringify(value));
      } catch (e) {
        /* 不記住也沒關係 */
      }
    }
  };

  function all(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function isPressed(button) {
    return button.getAttribute('aria-pressed') === 'true';
  }

  function press(buttons, active) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === active ? 'true' : 'false'); });
  }

  function sceneOf(el) {
    return el.closest('[data-scene]');
  }

  /* 觀眾魟魚的表情跟著這一頁的狀態走。 */
  function setMood(scene, mood) {
    scene.setAttribute('data-audience', mood);
    if (window.Site.currentStop() === scene) { window.Mascots.refreshMood(); }
  }

  function speak(scene, text) {
    var line = scene.querySelector('.dialog [data-say]');
    if (!line) { return; }
    line.setAttribute('data-said', '');
    window.Mascots.say(line, text);
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

  /* ===== 0-2 兩份簡報，選一份看第四頁 ===== */
  function initDuel() {
    var root = document.querySelector('[data-duel]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var decks = all(root, '[data-deck]');
    var votes = all(root, '[data-vote]');
    var replay = root.querySelector('[data-replay]');
    var timer = 0;
    var starter = 0;

    function show(page) {
      decks.forEach(function (deck) {
        all(deck, '.deck__page').forEach(function (p, i) { p.classList.toggle('is-on', i === page); });
      });
    }

    function stop() {
      window.clearTimeout(starter);
      window.clearInterval(timer);
      timer = 0;
    }

    function play() {
      stop();
      press(votes, null);
      setMood(scene, 'thinking');
      /* 減少動態時不自動播放，兩份都維持縮圖。 */
      if (reduced) { return; }
      var page = 0;
      decks.forEach(function (deck) { deck.setAttribute('data-mode', 'play'); });
      show(0);
      timer = window.setInterval(function () {
        page += 1;
        if (page > 2) {
          window.clearInterval(timer);
          return;
        }
        show(page);
      }, 1700);
    }

    function vote(button) {
      stop();
      press(votes, button);
      decks.forEach(function (deck) {
        deck.setAttribute('data-mode', 'sheet');
        deck.setAttribute('data-revealed', '');
      });
      setMood(scene, 'surprised');
      speak(scene, '你選了 ' + button.getAttribute('data-vote').toUpperCase() + '。其實兩份內容一樣：A 在回答講者想講的，B 在回答聽眾想知道的。');
    }

    /* 有 JavaScript 才有投票和重播；說明先藏起來，選了才揭曉。 */
    decks.forEach(function (deck) { deck.removeAttribute('data-revealed'); });
    votes.forEach(function (button) {
      button.hidden = false;
      button.addEventListener('click', function () { vote(button); });
    });
    replay.hidden = reduced;
    replay.addEventListener('click', function () {
      decks.forEach(function (deck) { deck.removeAttribute('data-revealed'); });
      play();
      speak(scene, '再看一次，這次注意前三頁各在回答誰的問題。');
    });

    onArrive(scene, function () {
      if (votes.some(isPressed)) { return; }
      /* 等轉場的風景捲走再開始播。 */
      starter = window.setTimeout(play, 500);
    }, stop);
  }

  /* ===== 4-2 一句話結論 ===== */
  function initOneLine() {
    var root = document.querySelector('[data-oneline]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var fields = { find: root.querySelector('[data-part="find"]'), act: root.querySelector('[data-part="act"]') };
    var outs = { find: root.querySelector('[data-out="find"]'), act: root.querySelector('[data-out="act"]') };
    var slide = root.querySelector('.slide--sentence');
    var hint = root.querySelector('[data-hint]');
    var checks = {};
    all(root, '[data-check]').forEach(function (li) { checks[li.getAttribute('data-check')] = li; });

    var VAGUE = ['提升', '加強', '強化', '優化', '促進', '推廣', '重視', '落實', '改善', '增進', '積極', '致力'];
    var CONCRETE = /[0-9０-９]|[一二三四五六七八九十兩半]成|倍|％|%|一半|多數|少數|族|客群|學生|家庭|上班|農民|長輩|餐廳|市集|會員|辦卡|每次|每週|每月|加購|旺季|當天|首頁|結帳/;
    var CONTRAST = /不是|而是|反而|卡在|其實|只有|竟然|不在|但|卻|沒有變|沒變/;
    var SAMPLES = {
      weak: { find: '集點卡對顧客有正向影響', act: '加強推廣集點卡，提升顧客忠誠度' },
      strong: { find: '辦卡的客人每月多來 3 次，但每次花的錢沒有變', act: '集點卡搭配加購優惠，讓常來的人多帶一樣' },
      clear: { find: '', act: '' }
    };
    var MOODS = ['sleepy', 'neutral', 'thinking', 'happy', 'love'];

    function mark(name, ok, offIcon) {
      checks[name].classList.toggle('is-ok', ok);
      checks[name].querySelector('use').setAttribute('href', ok ? '#i-check' : offIcon);
    }

    var last = { score: 0, failing: [] };

    function update(talk, source) {
      var find = fields.find.value.trim();
      var act = fields.act.value.trim();
      var both = find + act;
      outs.find.textContent = find || '＿＿';
      outs.act.textContent = act || '＿＿';
      outs.find.classList.toggle('is-empty', !find);
      outs.act.classList.toggle('is-empty', !act);
      slide.style.setProperty('--len', String(Array.from(both).length));

      var whole = Array.from(find).length >= 6 && Array.from(act).length >= 6;
      var concrete = CONCRETE.test(both);
      var vague = VAGUE.filter(function (word) { return both.indexOf(word) >= 0; });
      var clean = both.length > 0 && vague.length === 0;
      var contrast = CONTRAST.test(both);
      mark('whole', whole, '#i-cross');
      mark('concrete', concrete, '#i-cross');
      mark('vague', clean, '#i-cross');
      mark('contrast', contrast, '#i-star');
      hint.textContent = vague.length ? '「' + vague.join('」「') + '」' : '';

      var score = [whole, concrete, clean, contrast].filter(Boolean).length;
      var failing = both ? ['whole', 'concrete', 'vague'].filter(function (name) { return !checks[name].classList.contains('is-ok'); }) : [];
      var worse = failing.some(function (name) { return last.failing.indexOf(name) < 0; });
      setMood(scene, both ? MOODS[score] : 'neutral');
      store.set('oneLine', { find: find, act: act });
      if (talk && window.Feedback) {
        if (score === 4 && last.score < 4) {
          window.Feedback.party();
        } else if (failing.length && (source === 'weak' || worse)) {
          window.Feedback.wrong(failing.map(function (name) { return checks[name]; }));
        }
      }
      last = { score: score, failing: failing };
      if (!talk) { return; }

      if (!both) {
        speak(scene, '先填填看，或按下面的例子，我幫你檢查。');
      } else if (!whole) {
        speak(scene, '兩半都要寫：發現了什麼，所以要做什麼。');
      } else if (vague.length) {
        speak(scene, '「' + vague[0] + '」聽起來很努力，但聽的人不知道你到底要做什麼。');
      } else if (!concrete) {
        speak(scene, '加一群具體的人或一個數字，這句話才站得住。');
      } else if (!contrast) {
        speak(scene, '可以了。再說出「大家以為的」和「其實是」的差別，會更想讓人問為什麼。');
      } else {
        speak(scene, '這句可以帶走了。有人可能會反駁它，所以後面每一頁的證據才有意思。');
      }
    }

    var saved = store.get('oneLine', null);
    if (saved) {
      fields.find.value = saved.find || '';
      fields.act.value = saved.act || '';
    }
    update(false);

    var typing = 0;
    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('input', function () {
        window.clearTimeout(typing);
        typing = window.setTimeout(function () { update(true, 'typing'); }, 450);
      });
    });

    var samples = root.querySelector('.oneline__samples');
    samples.hidden = false;
    all(samples, '[data-sample]').forEach(function (button) {
      button.addEventListener('click', function () {
        var name = button.getAttribute('data-sample');
        fields.find.value = SAMPLES[name].find;
        fields.act.value = SAMPLES[name].act;
        update(true, name);
      });
    });
  }

  /* ===== 4-3 鉤子切換：沒有 JavaScript 時四種開場全部列出 ===== */
  function initHookSwitch() {
    var root = document.querySelector('[data-hook]');
    if (!root) { return; }

    var scene = sceneOf(root);
    var tabs = all(root, '[data-hook-tab]');
    var panels = all(root, '[data-hook-panel]');
    var actor = root.querySelector('[data-hook-actor]');
    var line = root.querySelector('[data-say]');

    function show(name, talk) {
      var active = null;
      panels.forEach(function (panel) {
        var isActive = panel.getAttribute('data-hook-panel') === name;
        panel.hidden = !isActive;
        if (isActive) { active = panel; }
      });
      tabs.forEach(function (tab) {
        tab.setAttribute('aria-pressed', tab.getAttribute('data-hook-tab') === name ? 'true' : 'false');
      });

      scene.setAttribute('data-audience', active.getAttribute('data-mood'));
      window.Mascots.swap(actor, active.getAttribute('data-actor'));

      if (talk && name === 'bad' && window.Feedback) {
        window.Feedback.wrong(tabs.filter(function (tab) { return tab.getAttribute('data-hook-tab') === name; }));
      }

      if (talk) {
        /* 4-8 的背包會帶走最後選的鉤子，反例不算。 */
        if (name !== 'bad') { store.set('hook', name); }
        window.Mascots.refreshMood();
        line.setAttribute('data-said', '');
        window.Mascots.say(line, active.getAttribute('data-line'));
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { show(tab.getAttribute('data-hook-tab'), true); });
    });

    show(tabs[0].getAttribute('data-hook-tab'), false);
  }

  /* ===== 4-4 把六句話排成故事線 ===== */
  function initStoryline() {
    var root = document.querySelector('[data-story]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var slots = all(root, '.story__slot');
    var pool = root.querySelector('[data-pool]');
    var tools = root.querySelector('.story__tools');
    /* 打亂後的順序固定，每次上課看到的都一樣。 */
    var SHUFFLE = [3, 0, 5, 2, 4, 1];
    var HINT = {
      hook: '第一格是鉤子：哪一句讓人一聽就想知道答案？',
      problem: '鉤子之後，要把好奇變成一個問題。',
      belief: '接著說出大家「以為」的答案。',
      truth: '然後翻轉：「其實」才是真正的原因。',
      therefore: '知道原因了，所以要怎麼做？',
      takeaway: '最後一格，留一句讓人帶走的話。'
    };
    var cards = [];
    var next = 0;

    function fill(i) {
      slots[i].classList.add('is-filled');
      if (slots[i + 1]) { slots[i + 1].classList.add('is-asked'); }
      cards.forEach(function (card) {
        if (card.getAttribute('data-index') === String(i)) { card.hidden = true; }
      });
    }

    function done() {
      setMood(scene, 'happy');
      speak(scene, '排好了。SCQA、ABT 也是同一個道理：每一段都替下一段製造一個問題。');
    }

    function pick(card) {
      var i = Number(card.getAttribute('data-index'));
      if (i !== next) {
        if (window.Feedback) { window.Feedback.wrong(card); }
        setMood(scene, 'speechless');
        speak(scene, HINT[slots[next].getAttribute('data-node')]);
        return;
      }
      fill(i);
      if (window.Feedback) { window.Feedback.right(slots[i]); }
      next += 1;
      if (next === slots.length) {
        done();
        if (window.Feedback) { window.Feedback.party(); }
        return;
      }
      setMood(scene, 'thinking');
      speak(scene, '觀眾心裡冒出：「' + slots[next].querySelector('.story__voice').textContent + '」下一句要回答它。');
    }

    function reset() {
      next = 0;
      slots.forEach(function (slot) { slot.classList.remove('is-filled', 'is-asked'); });
      pool.textContent = '';
      cards = SHUFFLE.map(function (i) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'story__card px-box';
        card.textContent = slots[i].querySelector('.story__text').textContent;
        card.setAttribute('data-index', String(i));
        card.addEventListener('click', function () { pick(card); });
        pool.appendChild(card);
        return card;
      });
      setMood(scene, 'thinking');
    }

    root.classList.add('is-live');
    pool.hidden = false;
    tools.hidden = false;
    reset();

    root.querySelector('[data-story-reset]').addEventListener('click', function () {
      reset();
      speak(scene, HINT.hook);
    });
    root.querySelector('[data-story-solve]').addEventListener('click', function () {
      slots.forEach(function (slot, i) { fill(i); });
      next = slots.length;
      done();
    });
  }

  /* ===== 4-5 時間怎麼分 ===== */
  function initTimeline() {
    var root = document.querySelector('[data-plan]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var config = window.SiteConfig;
    var COLOR = {
      open: 'var(--orange)', known: 'var(--navy-soft)', way: 'var(--purple)', result: 'var(--green)',
      discuss: 'var(--green-deep)', conclude: 'var(--red)',
      hook: 'var(--orange)', problem: 'var(--navy)', question: 'var(--navy)', lit: 'var(--navy-soft)',
      method: 'var(--navy)', body: 'var(--green)', close: 'var(--purple)', takeaway: 'var(--red)', buffer: 'var(--muted)'
    };
    /* 淺色的段落用深色字 */
    var LIGHT = { open: true, hook: true };
    /* 比例是建議的起點；口試和研討會多留緩衝，因為常被打斷或準時喊停。 */
    var KINDS = {
      'class': { minutes: config.minutes, pages: config.pages, segments: config.segments },
      proposal: {
        minutes: 20,
        pages: 20,
        segments: [
          { id: 'hook', name: '缺口', time: 10, page: 10, tip: '為什麼現在要研究這個' },
          { id: 'question', name: '研究問題', time: 5, page: 5, tip: '一到三題，寫成問句' },
          { id: 'lit', name: '文獻', time: 15, page: 15, tip: '只講和問題有關的' },
          { id: 'body', name: '方法', time: 40, page: 45, tip: '口委最常追問這裡' },
          { id: 'close', name: '預期貢獻', time: 15, page: 15, tip: '學術和實務各一句' },
          { id: 'takeaway', name: '帶走一句話', time: 5, page: 10, tip: '這個研究為什麼值得做' },
          { id: 'buffer', name: '緩衝', time: 10, page: 0, tip: '口委可能中途提問' }
        ]
      },
      conference: {
        minutes: 15,
        pages: 12,
        segments: [
          { id: 'hook', name: '缺口', time: 10, page: 10, tip: '一句話講清楚缺口' },
          { id: 'method', name: '方法', time: 20, page: 20, tip: '只講看懂結果需要的' },
          { id: 'body', name: '發現', time: 40, page: 45, tip: '一頁一個發現' },
          { id: 'close', name: '意涵', time: 15, page: 15, tip: '對誰有什麼用' },
          { id: 'takeaway', name: '帶走一句話', time: 5, page: 10, tip: '讓人記得你的研究' },
          { id: 'buffer', name: '緩衝', time: 10, page: 0, tip: '主持人會準時喊停' }
        ]
      }
    };
    var state = { kind: 'class', minutes: KINDS['class'].minutes, pages: KINDS['class'].pages };
    var bar = root.querySelector('[data-bar]');
    var legend = root.querySelector('[data-legend]');
    var outs = { minutes: root.querySelector('[data-out="minutes"]'), pages: root.querySelector('[data-out="pages"]') };
    var title = root.querySelector('[data-plan-minutes]');
    var kinds = all(root, '[data-kind]');

    function num(minutes) {
      return String(minutes);
    }

    function render(talk) {
      var kind = KINDS[state.kind];
      var plan = config.plan(state.minutes, state.pages, kind.segments);
      bar.textContent = '';
      legend.textContent = '';
      plan.forEach(function (seg, i) {
        var color = COLOR[seg.id] || 'var(--muted)';
        var piece = document.createElement('span');
        piece.className = 'plan__seg' + (LIGHT[seg.id] ? ' plan__seg--light' : '');
        piece.style.setProperty('--m', String(Math.max(seg.minutes, 0.5)));
        piece.style.setProperty('--c', color);
        piece.style.setProperty('--i', String(i));
        piece.textContent = num(seg.minutes);
        bar.appendChild(piece);

        var row = document.createElement('li');
        var swatch = document.createElement('i');
        swatch.className = 'plan__swatch';
        swatch.style.setProperty('--c', color);
        var name = document.createElement('b');
        name.textContent = seg.name;
        var amount = document.createElement('span');
        amount.className = 'plan__num';
        amount.textContent = num(seg.minutes) + ' 分' + (seg.pages ? '・' + seg.pages + ' 頁' : '');
        var tip = document.createElement('span');
        tip.className = 'plan__tip';
        tip.textContent = seg.tip;
        row.appendChild(swatch);
        row.appendChild(name);
        row.appendChild(amount);
        row.appendChild(tip);
        legend.appendChild(row);
      });
      bar.setAttribute('aria-label', plan.map(function (seg) { return seg.name + ' ' + num(seg.minutes) + ' 分鐘'; }).join('，'));
      outs.minutes.textContent = String(state.minutes);
      outs.pages.textContent = String(state.pages);
      title.textContent = String(state.minutes);

      var seconds = Math.round(state.minutes * 60 / state.pages);
      var main = plan.reduce(function (a, b) { return b.minutes > a.minutes ? b : a; });
      var text = main.name + '佔 ' + num(main.minutes) + ' 分鐘、' + main.pages + ' 頁。';
      var mood = 'happy';
      if (seconds < 45) {
        text += '每頁只有 ' + seconds + ' 秒，觀眾會來不及看。';
        mood = 'speechless';
      } else if (seconds > 90) {
        text += '每頁要講 ' + seconds + ' 秒，記得在同一頁裡換重點。';
        mood = 'sleepy';
      } else if (state.kind === 'class') {
        text += '一頁約一分鐘，剛好。';
      } else {
        text += '緩衝留了 ' + num(plan[plan.length - 1].minutes) + ' 分鐘，因為一定會被打斷。';
      }
      setMood(scene, mood);
      if (talk) { speak(scene, text); }
    }

    all(root, '[data-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-step');
        var range = config.limits[key];
        state[key] = Math.max(range[0], Math.min(range[1], state[key] + Number(button.getAttribute('data-by'))));
        render(true);
      });
    });

    kinds.forEach(function (button) {
      button.addEventListener('click', function () {
        state.kind = button.getAttribute('data-kind');
        state.minutes = KINDS[state.kind].minutes;
        state.pages = KINDS[state.kind].pages;
        press(kinds, button);
        render(true);
      });
    });

    root.querySelector('.plan__controls').hidden = false;
    render(false);
  }

  /* ===== 4-6 20 格分鏡：只讀標題、主張和主題比一比、列印學習單 ===== */
  function initStoryboard() {
    var root = document.querySelector('[data-board]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var cells = all(root, '.cell');
    var claims = cells.map(function (cell) { return cell.querySelector('span').textContent; });
    var topics = cells.map(function (cell) { return cell.getAttribute('data-topic'); });
    var kinds = all(root, '[data-titles]');
    var readButton = root.querySelector('[data-readthrough]');
    var read = root.querySelector('[data-read]');
    var printButton = root.querySelector('[data-print-sheet]');
    var state = { titles: 'claim', reading: false };

    function segOf(cell) {
      return cell.className.replace(/.*\b(seg--\w+).*/, '$1');
    }

    function render(talk) {
      var claim = state.titles === 'claim';
      var list = claim ? claims : topics;
      cells.forEach(function (cell, i) { cell.querySelector('span').textContent = list[i]; });
      root.setAttribute('data-mode', state.reading ? 'read' : 'grid');
      read.hidden = !state.reading;
      read.textContent = '';
      if (state.reading) {
        list.forEach(function (text, i) {
          var span = document.createElement('span');
          span.className = segOf(cells[i]);
          span.textContent = /[？！」。]$/.test(text) ? text : text + '。';
          read.appendChild(span);
        });
      }
      press(kinds, kinds.filter(function (b) { return b.getAttribute('data-titles') === state.titles; })[0]);
      readButton.setAttribute('aria-pressed', state.reading ? 'true' : 'false');
      readButton.textContent = state.reading ? '回到分鏡' : '只讀標題';

      if (state.reading) {
        setMood(scene, claim ? 'love' : 'sleepy');
        if (claim) { store.set('readthrough', true); }
      } else {
        setMood(scene, claim ? 'thinking' : 'speechless');
      }
      if (!talk) { return; }
      if (state.reading) {
        speak(scene, claim ? '讀起來是一個故事：有問題、有轉折、有答案。只讀標題，就是一份摘要。' : '這是目錄，不是故事。聽的人還是不知道你要說什麼。');
      } else {
        speak(scene, claim ? '標題寫主張、內容放證據，這叫主張－證據式投影片。' : 'AI 最常給這種標題：只有主題，沒有主張。');
      }
    }

    kinds.forEach(function (button) {
      button.addEventListener('click', function () {
        state.titles = button.getAttribute('data-titles');
        if (state.titles === 'topic' && window.Feedback) { window.Feedback.wrong(button); }
        render(true);
      });
    });
    readButton.addEventListener('click', function () {
      state.reading = !state.reading;
      render(true);
    });

    root.querySelector('.board__kinds').hidden = false;
    readButton.hidden = false;

    /* 預覽版不能列印，只有直接開網站時才有這顆按鈕。 */
    if (!window.SG_PREVIEW && typeof window.print === 'function') {
      printButton.hidden = false;
      printButton.addEventListener('click', printSheet);
    }
    render(false);
  }

  function buildSheet() {
    var sheet = document.querySelector('.sheet');
    if (sheet) { return sheet; }
    var config = window.SiteConfig;
    var labels = [];
    config.timeline.forEach(function (seg) {
      for (var k = 0; k < seg.pages; k += 1) { labels.push(seg.name); }
    });

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) { node.className = className; }
      if (text) { node.textContent = text; }
      return node;
    }

    sheet = el('section', 'sheet');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.appendChild(el('h1', 'sheet__title', config.pages + ' 格分鏡學習單'));
    var fields = el('div', 'sheet__fields');
    fields.appendChild(el('p', '', '題目：'));
    fields.appendChild(el('p', '', '組別：'));
    fields.appendChild(el('p', '', '日期：'));
    sheet.appendChild(fields);
    sheet.appendChild(el('p', 'sheet__thesis', '一句話結論：我們發現　　　　　　　　　　　　　　　　，所以建議　　　　　　　　　　　　　　　　。'));

    var grid = el('div', 'sheet__grid');
    labels.forEach(function (label, i) {
      var frame = el('div', 'sheet__frame');
      var head = el('header');
      head.appendChild(el('b', '', '第 ' + (i + 1) + ' 頁'));
      head.appendChild(el('span', '', label));
      frame.appendChild(head);
      frame.appendChild(el('div', 'sheet__box'));
      frame.appendChild(el('p', 'sheet__line', '標題：'));
      frame.appendChild(el('p', 'sheet__line'));
      grid.appendChild(frame);
    });
    sheet.appendChild(grid);
    sheet.appendChild(el('p', 'sheet__foot', '□ 標題都寫成一句主張　□ 只讀標題，讀得成一個故事　□ 每一段的最後一頁，讓人想知道下一段'));
    document.body.appendChild(sheet);
    return sheet;
  }

  function printSheet() {
    buildSheet();
    var root = document.documentElement;
    root.classList.add('print-sheet');
    window.addEventListener('afterprint', function done() {
      root.classList.remove('print-sheet');
      window.removeEventListener('afterprint', done);
    });
    window.print();
  }

  /* ===== 4-8 出發前的背包 ===== */
  function initBackpack() {
    var root = document.querySelector('[data-pack]');
    if (!root) { return; }
    var scene = sceneOf(root);
    var buttons = all(root, '[data-pack-item]');
    var count = root.querySelector('[data-pack-count]');
    var actor = root.querySelector('.dialog__who .sprite');
    var packed = store.get('pack', {});
    var NAMES = { line: '一句話結論', hook: '鉤子', titles: '20 句標題' };

    function mine() {
      var line = store.get('oneLine', null);
      if (line && line.find && line.act) {
        root.querySelector('[data-mine="line"]').textContent = '我們發現' + line.find + '，所以建議' + line.act + '。';
      }
      var hook = document.querySelector('[data-hook-panel="' + store.get('hook', 'question') + '"] .hook__line');
      if (hook) {
        root.querySelector('[data-mine="hook"]').textContent = hook.textContent.replace('上台第一句', '').trim();
      }
      root.querySelector('[data-mine="titles"]').textContent = store.get('readthrough', false)
        ? '用「只讀標題」讀過一遍了，像一個故事。'
        : '還沒用「只讀標題」讀過，回 4-6 試一次。';
    }

    function render(talk, key) {
      var n = 0;
      buttons.forEach(function (button) {
        var on = Boolean(packed[button.getAttribute('data-pack-item')]);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.textContent = on ? '已裝進背包' : '裝進背包';
        button.closest('.item').classList.toggle('is-packed', on);
        if (on) { n += 1; }
      });
      count.textContent = n + '/3';
      var ready = n === buttons.length;
      window.Mascots.swap(actor, ready ? 'potato_cheer' : 'potato_idea');
      setMood(scene, ready ? 'love' : (n ? 'happy' : 'neutral'));
      store.set('pack', packed);
      if (!talk) { return; }
      if (ready) {
        if (window.Feedback) { window.Feedback.party(); }
        speak(scene, '都裝好了。出發去第 5 關：生！');
      } else {
        speak(scene, packed[key] ? NAMES[key] + '，裝好了。' : NAMES[key] + '先拿出來，再想一想。');
      }
    }

    buttons.forEach(function (button) {
      button.hidden = false;
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-pack-item');
        packed[key] = !packed[key];
        render(true, key);
      });
    });

    mine();
    render(false);
    onArrive(scene, mine);
  }

  initDuel();
  initOneLine();
  initHookSwitch();
  initStoryline();
  initTimeline();
  initStoryboard();
  initBackpack();
})();
