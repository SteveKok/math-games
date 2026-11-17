/*
 * 鸽子与糖果（抽屉原理）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Pigeon，Node 里 module.exports（测试用）。
 *
 * 三章，一步步走向 OMK 2016 Bongsu B3：
 *   nest     ：把 items 只鸽子放进 boxes 个窝，每个窝最多 cap 只。做得到吗？
 *   distinct ：把 sweets 颗糖全部分给 kids 个小朋友（可以分到 0 颗），每人都不一样多。做得到吗？
 *   least    ：有 sweets 颗糖，最少要几个小朋友，才「一定」有两人分到一样多？
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Pigeon = factory();
})(this, function () {
  'use strict';

  /* ---------- 第一章：鸽子回家 ---------- */
  /** 能不能放下：每个窝最多 cap 只，boxes 个窝最多放 boxes × cap 只 */
  function nestPossible(items, boxes, cap) { return items <= boxes * cap; }
  /** 当前摆法是否成功：全部放好，没有哪个窝超过 cap */
  function nestSolved(counts, items, cap) {
    var sum = 0;
    for (var i = 0; i < counts.length; i++) { if (counts[i] > cap) return false; sum += counts[i]; }
    return sum === items;
  }
  /** 提示：放到哪个窝（最空的那个） */
  function nestHint(counts, cap) {
    var best = -1;
    for (var i = 0; i < counts.length; i++) if (counts[i] < cap && (best < 0 || counts[i] < counts[best])) best = i;
    return best;
  }

  /* ---------- 第二章：分糖果，都不一样 ---------- */
  /** n 个人都不一样多，最少要几颗糖：0 + 1 + … + (n−1) */
  function minDistinct(n) { return n * (n - 1) / 2; }
  function distinctPossible(kids, sweets) { return sweets >= minDistinct(kids); }
  /** 哪些人和别人一样多（返回下标数组） */
  function sameIndexes(amounts) {
    var out = [];
    for (var i = 0; i < amounts.length; i++) {
      for (var j = 0; j < amounts.length; j++) {
        if (i !== j && amounts[i] === amounts[j]) { out.push(i); break; }
      }
    }
    return out;
  }
  function distinctSolved(amounts, sweets) {
    var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
    return sum === sweets && sameIndexes(amounts).length === 0;
  }
  /** 一种都不一样的分法：0, 1, …, n−2，剩下的全给最后一个人（做不到时返回 null） */
  function distinctExample(kids, sweets) {
    if (!distinctPossible(kids, sweets)) return null;
    var a = [];
    for (var i = 0; i < kids - 1; i++) a.push(i);
    a.push(sweets - minDistinct(kids - 1));
    return a;
  }

  /* ---------- 第三章：最少几个人？ ---------- */
  /** n 个人分 sweets 颗糖，是不是「一定」有两人一样多 */
  function forcedSame(n, sweets) { return minDistinct(n) > sweets; }
  /** 最少几个人才一定撞：最小的 n，使 n(n−1)/2 > sweets */
  function leastKids(sweets) {
    var n = 1;
    while (!forcedSame(n, sweets)) n++;
    return n;
  }

  /* ---------- 关卡 ---------- */
  var LEVELS = [
    // 第一章：每个窝最多 1 只，再到最多 2、3 只
    { ch: 'nest', items: 3, boxes: 3, cap: 1, tip: 'ptip1' },
    { ch: 'nest', items: 4, boxes: 3, cap: 1, tip: 'ptip2' },
    { ch: 'nest', items: 5, boxes: 5, cap: 1, tip: 'ptip3' },
    { ch: 'nest', items: 6, boxes: 5, cap: 1, tip: 'ptip4' },
    { ch: 'nest', items: 8, boxes: 3, cap: 3, tip: 'ptip5' },
    { ch: 'nest', items: 9, boxes: 4, cap: 2, tip: 'ptip6' },
    // 第二章：都不一样多（可以分到 0 颗）
    { ch: 'distinct', kids: 3, sweets: 6, tip: 'ptip7' },
    { ch: 'distinct', kids: 3, sweets: 3, tip: 'ptip8' },
    { ch: 'distinct', kids: 3, sweets: 2, tip: 'ptip9' },
    { ch: 'distinct', kids: 4, sweets: 9, tip: 'ptip10' },
    { ch: 'distinct', kids: 4, sweets: 5, tip: 'ptip11' },
    // 第三章：最少几个人一定撞
    { ch: 'least', sweets: 10, tip: 'ptip12' },
    { ch: 'least', sweets: 20, tip: 'ptip13' },
    { ch: 'least', sweets: 50, tip: 'ptip14' },
    // 终章：OMK 2016 Bongsu B3 原题
    { ch: 'least', sweets: 1000, olympiad: true, tip: 'ptip15' },
    // 解答：没有游戏的关卡，一页一个重点，配插画
    { ch: 'read', key: 'sol1', art: 'nest' },
    { ch: 'read', key: 'sol2', art: 'stair4' },
    { ch: 'read', key: 'sol3', art: 'n45' },
    { ch: 'read', key: 'sol4', art: 'n46' },
    { ch: 'read', key: 'sol5', art: 'general' },
    // 想一想：三道额外题（答案见 EXTRA，由测试暴力验证）
    { ch: 'think', key: 'ex1', art: 'socks', answer: 4 },
    { ch: 'think', key: 'ex2', art: 'sum11', answer: 6 },
    { ch: 'think', key: 'ex3', art: 'hands' }
  ];
  var CHAPTERS = [
    { id: 'nest', nameKey: 'pchNest' },
    { id: 'distinct', nameKey: 'pchDistinct' },
    { id: 'least', nameKey: 'pchLeast' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'pchSol' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  /** 关卡属于哪一章（真题单独成一章） */
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  /** 这一关「做得到」吗（第三章不用这个） */
  function levelPossible(lv) {
    if (lv.ch === 'nest') return nestPossible(lv.items, lv.boxes, lv.cap);
    if (lv.ch === 'distinct') return distinctPossible(lv.kids, lv.sweets);
    return true;
  }

  /* ---------- 额外思考题（答案由测试暴力验证） ---------- */
  var EXTRA = {
    // 1. 抽屉里有红、蓝、绿袜子各 10 只，闭着眼拿，最少拿几只一定有一双同色？
    socks: { colors: 3, each: 10, answer: 4 },
    // 2. 从 1 到 10 里选数，最少选几个，一定有两个数加起来等于 11？
    sum11: { max: 10, target: 11, answer: 6 },
    // 3. 6 个人互相握手（每两人最多握一次），一定有两个人握手次数一样多
    handshake: { people: 6 }
  };

  return {
    nestPossible: nestPossible, nestSolved: nestSolved, nestHint: nestHint,
    minDistinct: minDistinct, distinctPossible: distinctPossible, sameIndexes: sameIndexes,
    distinctSolved: distinctSolved, distinctExample: distinctExample,
    forcedSame: forcedSame, leastKids: leastKids,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, levelPossible: levelPossible, EXTRA: EXTRA
  };
});
