/*
 * 加号游戏（OMK 2018 Bongsu B3）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Plus，Node 里 module.exports（测试用）。
 *
 * 一排 N 个 1，可以在相邻的 1 之间放加号。连在一起的 1 组成一段：1、11、111、1111……
 * 段数 = 加号 + 1。关卡要求总和等于目标 S；有的关还要加号最多（max）或最少（min）。
 *
 * 关键事实：一段 k 个 1 的值 − k 是 9 的倍数（0、9、108、1107……），
 * 所以「总和 − N」一定是 9 的倍数。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Plus = factory();
})(this, function () {
  'use strict';
  var MAXLEN = 4;   // 关卡里最长用到 1111（11111 比所有目标都大）

  function repunit(k) { var v = 0; for (var i = 0; i < k; i++) v = v * 10 + 1; return v; }

  /** 由「哪些空隙有加号」得到每一段的长度 */
  function blocksFromGaps(n, gaps) {
    var out = [], len = 1;
    for (var i = 0; i < n - 1; i++) { if (gaps[i]) { out.push(len); len = 1; } else len++; }
    out.push(len);
    return out;
  }
  /** 段长 → 各种长度各有几段（c[1] 是单独的 1，c[2] 是 11 的个数……） */
  function countsOf(blocks) {
    var c = [0, 0, 0, 0, 0];
    blocks.forEach(function (k) { if (k > MAXLEN) c.big = (c.big || 0) + 1; else c[k]++; });
    return c;
  }
  /** 用「11、111、1111 各几段」描述一种放法（剩下的都是单独的 1） */
  function fromCounts(n, c2, c3, c4) {
    var used = 2 * c2 + 3 * c3 + 4 * c4, ones = n - used;
    return { ones: ones, c: [0, ones, c2, c3, c4], ok: ones >= 0 };
  }
  /** 一种放法的总和、段数、加号数 */
  function evaluate(c) {
    var sum = 0, terms = 0;
    for (var k = 1; k <= MAXLEN; k++) { sum += c[k] * repunit(k); terms += c[k]; }
    return { sum: sum, terms: terms, pluses: terms - 1 };
  }
  function evalBlocks(blocks) {
    var sum = blocks.reduce(function (s, k) { return s + repunit(k); }, 0);
    return { sum: sum, terms: blocks.length, pluses: blocks.length - 1 };
  }

  /**
   * N 个 1 凑出 S 的所有放法里，加号最少和最多各是多少（做不到返回 null）。
   * 9·c2 + 108·c3 + 1107·c4 = S − N，c2 由 c3、c4 决定，只要枚举 c3、c4。
   */
  function plusRange(n, s) {
    var d = s - n, lo = null, hi = null;
    if (d < 0 || d % 9) return null;
    var k = d / 9;   // = c2 + 12·c3 + 123·c4
    for (var c4 = 0; 123 * c4 <= k; c4++) {
      for (var c3 = 0; 123 * c4 + 12 * c3 <= k; c3++) {
        var c2 = k - 123 * c4 - 12 * c3, f = fromCounts(n, c2, c3, c4);
        if (!f.ok) continue;
        var p = f.ones + c2 + c3 + c4 - 1;
        if (lo === null || p < lo) lo = p;
        if (hi === null || p > hi) hi = p;
      }
    }
    return lo === null ? null : { min: lo, max: hi };
  }
  /** 达到要求的一种放法（给「看答案」用）：返回 [c2, c3, c4] */
  function solution(n, s, goal) {
    var r = plusRange(n, s), k = (s - n) / 9;
    if (!r) return null;
    var want = goal === 'min' ? r.min : r.max;
    for (var c4 = 0; 123 * c4 <= k; c4++) for (var c3 = 0; 123 * c4 + 12 * c3 <= k; c3++) {
      var c2 = k - 123 * c4 - 12 * c3, f = fromCounts(n, c2, c3, c4);
      if (f.ok && f.ones + c2 + c3 + c4 - 1 === want) return [c2, c3, c4];
    }
    return null;
  }

  /** 这一关算不算过：总和对，加号数也满足要求 */
  function judge(lv, ev) {
    if (ev.sum !== lv.s) return 'sum';
    if (lv.goal === 'reach') return 'ok';
    var r = plusRange(lv.n, lv.s);
    if (lv.goal === 'max') return ev.pluses === r.max ? 'ok' : 'more';
    return ev.pluses === r.min ? 'ok' : 'fewer';
  }

  /* ---------- 关卡 ---------- */
  // mode：row = 一个个 1 点空隙；count = 1 太多，改用「几个 11、111、1111」计数
  var LEVELS = [
    { ch: 'play', n: 6, s: 24, goal: 'reach', mode: 'row', tip: 'qtip1', hint: 'qhint1' },
    { ch: 'play', n: 30, s: 138, goal: 'max', mode: 'row', tip: 'qtip2', hint: 'qhint2' },
    { ch: 'play', n: 10, s: 50, goal: 'reach', mode: 'row', impossible: true, tip: 'qtip3', hint: 'qhint3' },
    { ch: 'play', n: 100, s: 1315, goal: 'max', mode: 'count', tip: 'qtip4', hint: 'qhint4' },
    { ch: 'play', n: 2018, s: 8102, goal: 'max', mode: 'count', olympiad: true, tip: 'qtip5', hint: 'qhint5' },
    { ch: 'read', key: 'qread' },
    { ch: 'think', key: 'qex1', n: 40, s: 1147, goal: 'max', mode: 'count' },
    { ch: 'think', key: 'qex2', n: 20, s: 2018, goal: 'reach', mode: 'row', impossible: true },
    { ch: 'think', key: 'qex3', n: 30, s: 138, goal: 'min', mode: 'row' }
  ];
  var CHAPTERS = [
    { id: 'play', nameKey: 'qchPlay' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'qchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  function levelPossible(lv) { return plusRange(lv.n, lv.s) !== null; }

  return {
    MAXLEN: MAXLEN, repunit: repunit, blocksFromGaps: blocksFromGaps, countsOf: countsOf, fromCounts: fromCounts,
    evaluate: evaluate, evalBlocks: evalBlocks, plusRange: plusRange, solution: solution, judge: judge,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, levelPossible: levelPossible
  };
});
