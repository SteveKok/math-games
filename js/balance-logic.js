/*
 * 天平找相等（等量代换）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Balance，Node 里 module.exports（测试用）。
 *
 * 每种水果有一个藏起来的重量（单位：芒果）。每关有几个「线索天平」（已经平了的），
 * 孩子要往右边的盘子放芒果，让左边的东西和右边一样重。
 *   live：天平随时跟着动（学怎么看天平）
 *   check：天平先用手按住，按「放手」才知道平不平（要先想，不能只靠试）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Balance = factory();
})(this, function () {
  'use strict';

  // 藏起来的重量。芒果 = 1，所有答案都用「几个芒果」来回答
  var WEIGHT = { M: 1, K: 2, P: 3, G: 3, S: 3, W: 4, D: 6 };
  // M 芒果、K 香蕉、P 黄梨、G 番石榴、S 杨桃、W 西瓜、D 榴梿
  var FRUITS = ['M', 'K', 'P', 'G', 'S', 'W', 'D'];
  var MAX_RIGHT = 12;

  /** 一盘东西的总重量：items 是水果代号的数组，例如 ['P', 'P'] */
  function weigh(items, w) {
    w = w || WEIGHT;
    return items.reduce(function (s, f) { return s + w[f]; }, 0);
  }
  /** 左边减右边。正数 = 左边重（左边往下） */
  function diff(left, right, w) { return weigh(left, w) - weigh(right, w); }
  /** 放了 n 个芒果在右边，平不平 */
  function balanced(lv, n, w) { return diff(lv.left, repeat('M', n), w) === 0; }
  /** 正确答案：左边等于几个芒果 */
  function answer(lv, w) { return weigh(lv.left, w) / (w || WEIGHT).M; }
  function repeat(f, n) { var a = []; for (var i = 0; i < n; i++) a.push(f); return a; }
  /** 画面上的倾斜角度（度）：左边重 → 正数（左边往下） */
  function tilt(d) { return Math.max(-14, Math.min(14, d * 3.5)); }

  /* ---------- 关卡 ---------- */
  // clues：每个线索是 [左边, 右边]，一定是平的
  var LEVELS = [
    // 天平怎么玩
    { ch: 'learn', mode: 'live', left: ['P'], clues: [], tip: 'btip1', hint: 'bhint1' },
    { ch: 'learn', mode: 'check', left: ['P', 'P'], clues: [[['P'], ['M', 'M', 'M']]], tip: 'btip2', hint: 'bhint2' },
    // 换一换：第 3 关就是分享封面上的题（balance.html#cover 直接打开这一关）
    { ch: 'swap', mode: 'check', cover: true, left: ['D'], clues: [[['D'], ['P', 'P']], [['P'], ['M', 'M', 'M']]], tip: 'btip3', hint: 'bhint3' },
    { ch: 'swap', mode: 'check', left: ['D'], clues: [[['D'], ['K', 'K', 'K']], [['K', 'M'], ['P']], [['P'], ['M', 'M', 'M']]], tip: 'btip4', hint: 'bhint4' },
    // 两边拿走一样的
    { ch: 'cancel', mode: 'check', left: ['G'], clues: [[['G', 'G', 'M'], ['G', 'M', 'M', 'M', 'M']]], tip: 'btip5', hint: 'bhint5' },
    { ch: 'cancel', mode: 'check', left: ['K'], clues: [[['P', 'P', 'M'], ['P', 'K', 'K']], [['P'], ['M', 'M', 'M']]], tip: 'btip6', hint: 'bhint6' },
    // 比赛风格的挑战题（自己出的题，不是真题）
    { ch: 'cup', mode: 'check', left: ['S'], clues: [[['S', 'S', 'W'], repeat('M', 10)], [['S', 'W'], repeat('M', 7)]], tip: 'btip7', hint: 'bhint7' },
    { ch: 'cup', mode: 'check', left: ['W'], clues: [[['S', 'S', 'W'], repeat('M', 10)], [['S', 'W'], repeat('M', 7)]], tip: 'btip8', hint: 'bhint8' },
    // 天平的秘诀
    { ch: 'read', key: 'bread' }
  ];
  var CHAPTERS = [
    { id: 'learn', nameKey: 'bchLearn' },
    { id: 'swap', nameKey: 'bchSwap' },
    { id: 'cancel', nameKey: 'bchCancel' },
    { id: 'cup', nameKey: 'bchCup' },
    { id: 'read', nameKey: 'bchRead' }
  ];
  var COVER = LEVELS.findIndex(function (l) { return l.cover; });

  return {
    WEIGHT: WEIGHT, FRUITS: FRUITS, MAX_RIGHT: MAX_RIGHT,
    weigh: weigh, diff: diff, balanced: balanced, answer: answer, repeat: repeat, tilt: tilt,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, COVER: COVER
  };
});
