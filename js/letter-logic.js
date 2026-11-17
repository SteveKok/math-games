/*
 * 字母转转乐（OMK 2017 Muda A6）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Letter，Node 里 module.exports（测试用）。
 *
 * 黑板上一排字母，每天按同一个规则替换：letters[i] 换成 images[i]（例如 A → G）。
 * 问：过几天第一次回到原来的样子？答案是各个「圈」长度的最小公倍数。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Letter = factory();
})(this, function () {
  'use strict';

  /** 替换规则：字母 → 第二天变成的字母 */
  function ruleOf(lv) {
    var r = {};
    lv.letters.split('').forEach(function (c, i) { r[c] = lv.images[i]; });
    return r;
  }
  /** 黑板上的字母过一天 */
  function step(board, rule) { return board.map(function (c) { return rule[c]; }); }
  /** 第 d 天的黑板 */
  function boardOn(lv, d) {
    var rule = ruleOf(lv), b = lv.letters.split('');
    for (var i = 0; i < d; i++) b = step(b, rule);
    return b;
  }
  /** 把字母分成一个个圈（每个圈按替换的顺序排） */
  function cycles(lv) {
    var rule = ruleOf(lv), seen = {}, out = [];
    lv.letters.split('').forEach(function (c) {
      if (seen[c]) return;
      var cyc = [], x = c;
      while (!seen[x]) { seen[x] = true; cyc.push(x); x = rule[x]; }
      out.push(cyc);
    });
    return out;
  }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  /** 公式：各个圈长度的最小公倍数 */
  function order(lv) { return cycles(lv).reduce(function (m, c) { return lcm(m, c.length); }, 1); }
  /** 直接模拟：一天天地换，第一次回到原样是第几天 */
  function simulate(lv, limit) {
    var rule = ruleOf(lv), start = lv.letters, b = start.split('');
    for (var d = 1; d <= (limit || 100000); d++) {
      b = step(b, rule);
      if (b.join('') === start) return d;
    }
    return null;
  }
  /** n 个字母最多要等几天：把 n 拆成几个圈长，最小公倍数最大是多少 */
  function longestWait(n) {
    var best = 1;
    (function go(left, maxPart, m) {
      if (m > best) best = m;
      for (var p = Math.min(left, maxPart); p >= 2; p--) go(left - p, p, lcm(m, p));
    })(n, n, 1);
    return best;
  }

  /* ---------- 关卡 ---------- */
  // play：一天天按，回到原样时按「回来了！」；predict：先想好第几天，用 ▲ ▼ 填（也可以按下一天试）
  var LEVELS = [
    { ch: 'play', mode: 'play', letters: 'ABCD', images: 'BCDA', tip: 'lttip1', hint: 'lthint1' },
    { ch: 'play', mode: 'play', letters: 'ABCDE', images: 'BADEC', glasses: true, tip: 'lttip2', hint: 'lthint2' },
    { ch: 'play', mode: 'predict', letters: 'ABCDEFG', images: 'BADEFGC', glasses: true, tip: 'lttip3', hint: 'lthint3' },
    { ch: 'play', mode: 'predict', letters: 'ABCDEFGHIJ', images: 'BCDAFGHIJE', glasses: true, tip: 'lttip4', hint: 'lthint4' },
    { ch: 'play', mode: 'predict', olympiad: true, letters: 'ABCDEFGHIJ', images: 'GIABJDCHFE', glasses: true, august: true, tip: 'lttip5', hint: 'lthint5' },
    { ch: 'read', key: 'ltread' },
    { ch: 'think', key: 'ltex1', mode: 'predict', letters: 'ABCDEFGHIJKL', images: 'BCAEFGDIJKLH', glasses: true },
    { ch: 'think', key: 'ltex2', mode: 'number', answer: 30 },
    // 文化课：天干地支，从 1984 甲子年开始，一年走一格
    { ch: 'culture', mode: 'ganzhi', start: 1984, tip: 'ltgzTip', hint: 'ltgzHint' }
  ];

  /* ---------- 天干地支 ---------- */
  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var STEM_PY = ['jiǎ', 'yǐ', 'bǐng', 'dīng', 'wù', 'jǐ', 'gēng', 'xīn', 'rén', 'guǐ'];
  var BRANCH_PY = ['zǐ', 'chǒu', 'yín', 'mǎo', 'chén', 'sì', 'wǔ', 'wèi', 'shēn', 'yǒu', 'xū', 'hài'];
  /** 甲子年之后第 k 年：天干第几个、地支第几个（从 0 数起） */
  function ganzhi(k) { return { stem: ((k % 10) + 10) % 10, branch: ((k % 12) + 12) % 12 }; }
  /** 公历年份 → 天干地支（1984 是甲子年） */
  function ganzhiOfYear(y) { var g = ganzhi(y - 1984); return STEMS[g.stem] + BRANCHES[g.branch]; }
  /** 一轮（一甲子）有几年 */
  function ganzhiCycle() { return lcm(STEMS.length, BRANCHES.length); }
  var CHAPTERS = [
    { id: 'play', nameKey: 'ltchPlay' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'ltchRead' },
    { id: 'think', nameKey: 'pchThink' },
    { id: 'culture', nameKey: 'ltchCulture' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  function answerOf(lv) { return lv.mode === 'number' ? lv.answer : lv.mode === 'ganzhi' ? ganzhiCycle() : order(lv); }

  return {
    ruleOf: ruleOf, step: step, boardOn: boardOn, cycles: cycles, gcd: gcd, lcm: lcm, order: order,
    simulate: simulate, longestWait: longestWait,
    STEMS: STEMS, BRANCHES: BRANCHES, STEM_PY: STEM_PY, BRANCH_PY: BRANCH_PY, ganzhi: ganzhi, ganzhiOfYear: ganzhiOfYear, ganzhiCycle: ganzhiCycle,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, answerOf: answerOf
  };
});
