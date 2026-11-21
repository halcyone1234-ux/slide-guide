/* 吉祥物小圖、觀眾魟魚、對話框。 */
(function () {
  'use strict';

  var BASE = 'assets/img/mascots/1x/';

  /* 檔名：[寬, 高, 替代文字]。尺寸來自 manifest.json。 */
  var SPRITES = {
    potato_work: [43, 50, '坐在筆電前工作的馬鈴薯'],
    potato_present: [36, 50, '拿著麥克風的馬鈴薯'],
    potato_carry: [47, 50, '搬著一疊文件的馬鈴薯'],
    potato_shrug: [44, 50, '聳肩的馬鈴薯'],
    potato_thumbs: [42, 50, '比讚的馬鈴薯'],
    potato_cheer: [38, 50, '歡呼的馬鈴薯'],
    potato_run: [47, 50, '奔跑的馬鈴薯'],
    potato_sleep: [41, 50, '睡著的馬鈴薯'],
    potato_face_happy: [40, 50, '開心的馬鈴薯'],
    potato_face_nervous: [40, 50, '緊張的馬鈴薯'],
    potato_face_overwhelmed: [40, 50, '招架不住的馬鈴薯'],
    potato_face_thinking: [46, 50, '正在思考的馬鈴薯'],
    potato_face_cool: [38, 50, '戴墨鏡的馬鈴薯'],
    potato_face_sad: [39, 50, '難過的馬鈴薯'],
    potato_face_angry: [39, 50, '生氣的馬鈴薯'],
    potato_face_excited: [38, 50, '興奮的馬鈴薯'],
    potato_idea: [42, 54, '想到點子的馬鈴薯'],
    potato_police: [39, 50, '穿警察制服的馬鈴薯'],
    potato_thief: [41, 50, '穿小偷裝的馬鈴薯'],
    octo_neutral: [52, 50, '蝴蝶章魚'],
    octo_happy: [53, 50, '開心的蝴蝶章魚'],
    octo_excited: [55, 50, '興奮的蝴蝶章魚'],
    octo_love: [52, 50, '喜歡的蝴蝶章魚'],
    octo_sleepy: [49, 50, '想睡的蝴蝶章魚'],
    octo_surprised: [49, 50, '驚訝的蝴蝶章魚'],
    octo_sad: [51, 50, '難過的蝴蝶章魚'],
    octo_thinking: [55, 50, '正在思考的蝴蝶章魚'],
    octo_write: [61, 62, '正在寫字的蝴蝶章魚'],
    manta_neutral: [66, 21, '表情平常的魟魚'],
    manta_happy: [65, 24, '開心的魟魚'],
    manta_love: [66, 31, '好喜歡的魟魚'],
    manta_sleepy: [66, 25, '想睡的魟魚'],
    manta_surprised: [66, 31, '驚訝的魟魚'],
    manta_speechless: [67, 21, '無言的魟魚'],
    manta_sad: [67, 23, '難過的魟魚'],
    manta_cry: [67, 23, '哭哭的魟魚'],
    manta_thinking: [66, 26, '想一想的魟魚'],
    whale_fly: [73, 54, '飛行的天使鯨魚'],
    crab_water: [109, 50, '澆水的寄居蟹'],
    crab_potato: [64, 58, '寄居蟹和馬鈴薯'],
    team_table: [149, 62, '五隻吉祥物圍著桌子開會']
  };

  var MOODS = {
    sleepy: ['manta_sleepy', '想睡'],
    speechless: ['manta_speechless', '無言'],
    sad: ['manta_sad', '難過'],
    cry: ['manta_cry', '哭哭'],
    neutral: ['manta_neutral', '平常'],
    surprised: ['manta_surprised', '驚訝'],
    thinking: ['manta_thinking', '想一想'],
    happy: ['manta_happy', '開心'],
    love: ['manta_love', '好喜歡']
  };

  function srcOf(name) {
    /* 單檔預覽版會把小圖內嵌在 SPRITE_DATA。 */
    var inline = window.SPRITE_DATA && window.SPRITE_DATA[name];
    return inline || BASE + name + '.png';
  }

  /* 表情切換是直接換圖，不做淡入淡出。 */
  function swap(img, name) {
    var info = SPRITES[name];
    if (!img || !info) { return; }
    img.src = srcOf(name);
    img.width = info[0];
    img.height = info[1];
    img.alt = info[2];
    img.style.setProperty('--w', String(info[0]));
  }

  /* 觀眾魟魚 */
  var audienceBox = document.getElementById('audience');
  var audienceImg = document.getElementById('audienceSprite');
  var audienceWord = document.getElementById('audienceMood');
  var currentMood = null;

  function setMood(mood) {
    var info = MOODS[mood] || MOODS.neutral;
    if (mood === currentMood) { return; }
    currentMood = mood;
    swap(audienceImg, info[0]);
    audienceWord.textContent = info[1];
  }

  function refreshMood() {
    var stop = window.Site.currentStop();
    setMood(stop ? stop.getAttribute('data-audience') || 'neutral' : 'neutral');
  }

  /* 先載入九張表情，換圖時才不會閃。 */
  Object.keys(MOODS).forEach(function (mood) {
    var img = new Image();
    img.src = srcOf(MOODS[mood][0]);
  });

  document.addEventListener('stopchange', refreshMood);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'm' && event.key !== 'M') { return; }
    if (event.altKey || event.ctrlKey || event.metaKey) { return; }
    var el = event.target;
    if (el && el.closest && (el.isContentEditable || el.closest('input, textarea, select'))) { return; }
    audienceBox.hidden = !audienceBox.hidden;
  });

  /* 手機畫面小，魟魚下面有文字或按鈕時先躲到畫面外，不擋內容。 */
  var phone = window.matchMedia('(max-width: 720px)');
  var READABLE = 'h1, h2, h3, p, li, button, a, .dialog__box, .monitor__body';
  var dodgeTimer = 0;

  function overReadable() {
    var w = audienceBox.offsetWidth;
    var h = audienceBox.offsetHeight;
    var left = window.innerWidth - 12 - w;
    var top = window.innerHeight - 8 - h;
    for (var row = 0; row < 3; row += 1) {
      for (var col = 0; col < 5; col += 1) {
        var el = document.elementFromPoint(left + w * (col + 0.5) / 5, top + h * (row + 0.5) / 3);
        if (el && el.closest(READABLE)) { return true; }
      }
    }
    return false;
  }

  function dodge() {
    dodgeTimer = 0;
    audienceBox.classList.toggle('is-away', phone.matches && !audienceBox.hidden && overReadable());
  }

  function queueDodge() {
    if (!dodgeTimer) { dodgeTimer = window.setTimeout(dodge, 120); }
  }

  window.addEventListener('scroll', queueDodge, { passive: true });
  window.addEventListener('resize', queueDodge);
  document.addEventListener('stopchange', queueDodge);
  document.addEventListener('click', queueDodge);

  /* 對話框：文字一個字一個字出現，點一下直接顯示完整。 */
  var TYPE_MS = 45;
  var timers = new WeakMap();

  function parts(el) {
    var sr = el.querySelector('.say-sr');
    if (sr) {
      return { sr: sr, shown: el.querySelector('.say-shown'), rest: el.querySelector('.say-rest') };
    }
    el.textContent = '';
    sr = document.createElement('span');
    sr.className = 'say-sr';
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    var shown = document.createElement('span');
    shown.className = 'say-shown';
    var rest = document.createElement('span');
    rest.className = 'say-rest';
    visual.appendChild(shown);
    visual.appendChild(rest);
    el.appendChild(sr);
    el.appendChild(visual);
    return { sr: sr, shown: shown, rest: rest };
  }

  function finish(el) {
    window.clearInterval(timers.get(el));
    timers.delete(el);
    var p = parts(el);
    p.shown.textContent = el.getAttribute('data-full');
    p.rest.textContent = '';
    var box = el.closest('.dialog__box');
    if (box) { box.classList.remove('is-typing'); }
  }

  function say(el, text) {
    if (!el) { return; }
    window.clearInterval(timers.get(el));
    el.setAttribute('data-full', text);
    var p = parts(el);
    p.sr.textContent = text;

    if (window.Site.reduced) {
      finish(el);
      return;
    }

    /* 還沒出現的字先佔位，文字才不會在打字時換行跳動。 */
    var chars = Array.from(text);
    var count = 0;
    p.shown.textContent = '';
    p.rest.textContent = text;
    var box = el.closest('.dialog__box');
    if (box) { box.classList.add('is-typing'); }

    timers.set(el, window.setInterval(function () {
      count += 1;
      p.shown.textContent = chars.slice(0, count).join('');
      p.rest.textContent = chars.slice(count).join('');
      if (count >= chars.length) { finish(el); }
    }, TYPE_MS));
  }

  /* 第一次走到場景時，對話才開始打字。 */
  document.addEventListener('stopchange', function (event) {
    event.detail.stop.querySelectorAll('[data-say]').forEach(function (el) {
      if (el.hasAttribute('data-said')) { return; }
      el.setAttribute('data-said', '');
      say(el, el.getAttribute('data-say'));
    });
  });

  document.addEventListener('click', function (event) {
    var box = event.target.closest && event.target.closest('.dialog__box');
    if (!box) { return; }
    var el = box.querySelector('[data-say]');
    if (el && timers.has(el)) { finish(el); }
  });

  window.Mascots = { swap: swap, say: say, refreshMood: refreshMood };
})();
