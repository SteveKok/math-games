/*
 * 自我介绍的数（OMK 2017 Bongsu B2「自传数」）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Self，Node 里 module.exports（测试用）。
 *
 * 一个 n 位数，第 i 位（从 0 数起）等于这个数里数字 i 出现的次数，就叫「自传数」。
 * 例：1210 —— 一个 0、两个 1、一个 2、零个 3。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Self = factory();
})(this, function () {
  'use strict';

  /** 每个数字 0…n−1 出现了几次 */
  function counts(digits) {
    var c = digits.map(function () { return 0; });
    digits.forEach(function (d) { if (d < c.length) c[d]++; });
    return c;
  }
  /** 哪些格子对了（第 i 位 = 数字 i 出现的次数） */
  function matches(digits) {
    var c = counts(digits);
    return digits.map(function (d, i) { return d === c[i]; });
  }
  function isSelf(digits) {
    return digits.length > 0 && digits[0] !== 0 && matches(digits).every(Boolean);
  }
  function sum(ds) { return ds.reduce(function (a, b) { return a + b; }, 0); }

  /**
   * 找出所有 n 位自传数。
   * 先用「数字加起来 = n」剪枝（每一位都被数了一次，所以所有次数加起来就是位数）。
   */
  function allSelf(n) {
    var out = [], ds = [];
    (function go(i, left) {
      if (i === n) { if (left === 0 && isSelf(ds)) out.push(ds.join('')); return; }
      for (var d = (i === 0 ? 1 : 0); d <= Math.min(9, left); d++) { ds.push(d); go(i + 1, left - d); ds.pop(); }
    })(0, n);
    return out;
  }

  /* ---------- 关卡 ---------- */
  // targets：这一关要找出几个不同的答案，每个是几位；fixed：开局锁定的格子 { 位置: 数字 }
  var LEVELS = [
    { ch: 'warm', n: 7, fixed: { 0: 3 }, tip: 'stip1', hint: 'shint1' },
    { ch: 'warm', n: 8, tip: 'stip2', hint: 'shint2' },
    { ch: 'warm', n: 6, impossible: true, tip: 'stip3', hint: 'shint3' },
    { ch: 'warm', olympiad: true, parts: [{ n: 4, label: '(a)' }, { n: 4, label: '(a)', distinct: true }, { n: 5, label: '(b)' }], tip: 'stip4', hint: 'shint4' },
    { ch: 'read', key: 'sread' },
    { ch: 'think', key: 'sex1', n: 9 },
    { ch: 'think', key: 'sex2', n: 10 },
    { ch: 'think', key: 'sex3', n: 3, impossible: true }
  ];
  var CHAPTERS = [
    { id: 'warm', nameKey: 'schWarm' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'schRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  /** 这一关的各个小题（普通关卡只有一题） */
  function partsOf(lv) { return lv.parts || (lv.n ? [{ n: lv.n }] : []); }

  return {
    counts: counts, matches: matches, isSelf: isSelf, sum: sum, allSelf: allSelf,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, partsOf: partsOf
  };
});
