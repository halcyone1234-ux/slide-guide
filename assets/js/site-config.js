/* 全站設定。
 * 改預設值改 DEFAULTS；給不同課程不同連結時用網址參數覆蓋：
 *   ?course=課程名稱&min=15&pages=15&group=3
 */
(function () {
  'use strict';

  var DEFAULTS = { course: '', minutes: 20, pages: 20, group: '2–3' };
  var LIMITS = { minutes: [5, 90], pages: [5, 60] };

  /* 時間軸各段的比例。
   * time 是時間比例（規格 6.4）。
   * page 是頁數比例：緩衝不佔頁，它的 5% 配給鉤子，預設才會是 2、3、11、3、1 頁（規格 1-4）。 */
  var SEGMENTS = [
    { id: 'hook', name: '鉤子', time: 5, page: 10, tip: '一個問題、數字或場景' },
    { id: 'problem', name: '問題', time: 15, page: 15, tip: '讓人想知道答案' },
    { id: 'body', name: '主體', time: 55, page: 55, tip: '分三段，每段一個發現' },
    { id: 'close', name: '結論與建議', time: 15, page: 15, tip: '回到一句話結論' },
    { id: 'takeaway', name: '帶走一句話', time: 5, page: 5, tip: '不要「謝謝聆聽」' },
    { id: 'buffer', name: '緩衝', time: 5, page: 0, tip: '換人、切換畫面、意外' }
  ];

  /* 最大餘數法：依比例分配整數，總和一定等於 total。 */
  function apportion(total, weights) {
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var exact = weights.map(function (w) { return total * w / sum; });
    var out = exact.map(Math.floor);
    var left = total - out.reduce(function (a, b) { return a + b; }, 0);
    var order = exact
      .map(function (v, i) { return { i: i, rest: v - Math.floor(v), weight: weights[i] }; })
      .filter(function (o) { return o.weight > 0; })
      .sort(function (a, b) { return b.rest - a.rest || b.weight - a.weight; });
    for (var k = 0; k < left; k += 1) { out[order[k % order.length].i] += 1; }

    /* 有比例的段落至少分到 1，從最大的一段借。 */
    weights.forEach(function (w, i) {
      if (w > 0 && out[i] === 0) {
        out[i] = 1;
        out[out.indexOf(Math.max.apply(null, out))] -= 1;
      }
    });
    return out;
  }

  /* segments 省略時用課堂報告的配比；1-4 的其他場合也用同一套算法。 */
  function buildTimeline(minutes, pages, segments) {
    var list = segments || SEGMENTS;
    /* 時間以半分鐘為單位分配，顯示時不會出現 0.75 分這種數字。 */
    var halves = apportion(minutes * 2, list.map(function (s) { return s.time; }));
    var pageCounts = apportion(pages, list.map(function (s) { return s.page; }));
    return list.map(function (s, i) {
      return { id: s.id, name: s.name, minutes: halves[i] / 2, pages: s.page ? pageCounts[i] : 0, tip: s.tip || '' };
    });
  }

  function readInt(value, range) {
    if (!/^\d{1,3}$/.test(value || '')) { return null; }
    var n = parseInt(value, 10);
    return n >= range[0] && n <= range[1] ? n : null;
  }

  function readParams() {
    var out = {};
    var query;
    try { query = new URLSearchParams(window.location.search); } catch (e) { return out; }

    var course = (query.get('course') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
    if (course) { out.course = course; }

    var minutes = readInt(query.get('min'), LIMITS.minutes);
    if (minutes !== null) { out.minutes = minutes; }

    var pages = readInt(query.get('pages'), LIMITS.pages);
    if (pages !== null) { out.pages = pages; }

    var group = query.get('group') || '';
    if (/^\d{1,2}([-–]\d{1,2})?$/.test(group)) { out.group = group.replace('-', '–'); }

    return out;
  }

  var params = readParams();
  var config = {
    course: params.course !== undefined ? params.course : DEFAULTS.course,
    minutes: params.minutes !== undefined ? params.minutes : DEFAULTS.minutes,
    pages: params.pages !== undefined ? params.pages : DEFAULTS.pages,
    group: params.group !== undefined ? params.group : DEFAULTS.group
  };
  config.timeline = buildTimeline(config.minutes, config.pages);
  config.segments = SEGMENTS;
  config.limits = LIMITS;
  config.plan = buildTimeline;

  window.SiteConfig = config;
})();
