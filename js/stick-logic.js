/*
 * 小棒拼正方形（OMK 2018 Muda B1）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Stick，Node 里 module.exports（测试用）。
 *
 * 有长度 1、2、…、n 的小棒各一根，可以首尾接起来，但不能折断，要全部用上拼成一个正方形
 * （更一般：拼成 sides 条边一样长的图形，正方形 sides = 4，等边三角形 sides = 3）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Stick = factory();
})(this, function () {
  'use strict';

  function total(n) { return n * (n + 1) / 2; }
  /** 每条边多长（分不平均就 null） */
  function sideLen(n, sides) { var t = total(n); return t % sides === 0 ? t / sides : null; }
  /** 用公式判断：总长能平分，而且最长的那根放得下 */
  function possible(n, sides) {
    sides = sides || 4;
    var s = sideLen(n, sides);
    return n >= 1 && s !== null && s >= n;
  }

  /**
   * 搜索一种拼法（给「看答案」用，也给测试暴力核对）：从最长的开始往各条边放。
   * 返回 sides 个数组，每个是这条边上的小棒；找不到返回 null。
   */
  function search(n, sides) {
    sides = sides || 4;
    var s = sideLen(n, sides);
    if (s === null || s < n) return null;
    var groups = []; for (var i = 0; i < sides; i++) groups.push([]);
    var fill = groups.map(function () { return 0; });
    function go(k) {
      if (k === 0) return true;
      for (var i = 0; i < sides; i++) {
        if (fill[i] + k > s) continue;
        fill[i] += k; groups[i].push(k);
        if (go(k - 1)) return true;
        fill[i] -= k; groups[i].pop();
        if (fill[i] === 0) break;   // 空的边都一样，试一条就够
      }
      return false;
    }
    return go(n) ? groups : null;
  }

  /**
   * 正方形的「配对拼法」（官方解答的做法）：
   *   n = 8k：每 8 根连续的小棒 a…a+7 配成 a+(a+7)、(a+1)+(a+6)、(a+2)+(a+5)、(a+3)+(a+4)，四条边各一对
   *   n = 8k + 7：先用 7、1+6、2+5、3+4 拼一个边长 7 的正方形，再把 8…n 每 8 根照上面配对
   */
  function pairing(n) {
    if (!possible(n, 4)) return null;
    var sides = [[], [], [], []], start = 1;
    if (n % 8 === 7) { sides = [[7], [1, 6], [2, 5], [3, 4]]; start = 8; }
    for (var a = start; a + 7 <= n; a += 8) {
      sides[0].push(a, a + 7); sides[1].push(a + 1, a + 6); sides[2].push(a + 2, a + 5); sides[3].push(a + 3, a + 4);
    }
    return sides;
  }

  /** 1…N 里有几个 n 能拼成正方形 */
  function countUpTo(N, sides) {
    var c = 0;
    for (var n = 1; n <= N; n++) if (possible(n, sides)) c++;
    return c;
  }
  /** 最小的能拼成的 n */
  function smallest(sides) { for (var n = 1; ; n++) if (possible(n, sides)) return n; }

  /* ---------- 关卡 ---------- */
  // build：真的把小棒放上去；pick：在 1…upTo 里挑出能拼的 n；count：只问数目
  var LEVELS = [
    { ch: 'build', n: 8, tip: 'sttip1', hint: 'sthint1' },
    { ch: 'build', n: 7, tip: 'sttip2', hint: 'sthint2' },
    { ch: 'build', n: 5, tip: 'sttip3', hint: 'sthint3' },
    { ch: 'build', n: 15, tip: 'sttip4', hint: 'sthint4' },
    { ch: 'pick', upTo: 24, tip: 'sttip5', hint: 'sthint5' },
    { ch: 'count', upTo: 2018, olympiad: true, tip: 'sttip6', hint: 'sthint6' },
    { ch: 'read', key: 'stread' },
    { ch: 'think', key: 'stex1', kind: 'build', n: 16 },
    { ch: 'think', key: 'stex2', kind: 'count', upTo: 100 },
    { ch: 'think', key: 'stex3', kind: 'smallest', sides: 3 }
  ];
  var CHAPTERS = [
    { id: 'build', nameKey: 'stchBuild' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'stchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch === 'pick' ? 'build' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  /** 这一关的玩法 */
  function kindOf(lv) { return lv.kind || (lv.ch === 'pick' ? 'pick' : lv.ch === 'count' ? 'count' : 'build'); }
  /** 数字题的答案 */
  function answerOf(lv) {
    var k = kindOf(lv);
    if (k === 'count') return countUpTo(lv.upTo, 4);
    if (k === 'smallest') return smallest(lv.sides);
    return null;
  }

  return {
    total: total, sideLen: sideLen, possible: possible, search: search, pairing: pairing,
    countUpTo: countUpTo, smallest: smallest,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, kindOf: kindOf, answerOf: answerOf
  };
});
