/*
 * 涂立方体（OMK 2018 Muda A5）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Cube，Node 里 module.exports（测试用）。
 *
 * 六个面编号：0 上 U、1 下 D、2 前 F、3 后 B、4 左 L、5 右 R。
 * 一种涂法 = 一个 6 位的「颜色表」colors[f]（0 = 没涂，1 = 绿，2 = 第二种颜色……）。
 * 两种涂法转一转能变成一样，就算同一种。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Cube = factory();
})(this, function () {
  'use strict';
  var U = 0, D = 1, F = 2, B = 3, L = 4, R = 5;

  /** 转法用「新位置 ← 旧面」的排列表示：perm[i] = 转完以后位置 i 上的是原来哪个面 */
  // 绕左右轴转：前 → 上 → 后 → 下 → 前
  var TURN_X = [F, B, D, U, L, R];
  // 绕上下轴转：前 → 右 → 后 → 左 → 前
  var TURN_Y = [U, D, L, R, B, F];
  function compose(p, q) { return p.map(function (_, i) { return q[p[i]]; }); }   // 先 q 后 p
  /** 立方体的全部转法（由两个 90° 转动生成），应该正好 24 种 */
  var ROTATIONS = (function () {
    var seen = {}, list = [[0, 1, 2, 3, 4, 5]], k;
    seen[list[0].join()] = true;
    for (var i = 0; i < list.length; i++) {
      [TURN_X, TURN_Y].forEach(function (g) {
        var n = compose(g, list[i]); k = n.join();
        if (!seen[k]) { seen[k] = true; list.push(n); }
      });
    }
    return list;
  })();

  function apply(rot, colors) { return rot.map(function (f) { return colors[f]; }); }
  /** 代表：所有转法里字典序最小的那个颜色表 */
  function canonical(colors) {
    var best = null;
    ROTATIONS.forEach(function (r) { var c = apply(r, colors).join(''); if (best === null || c < best) best = c; });
    return best;
  }
  function same(a, b) { return canonical(a) === canonical(b); }
  function painted(colors) { return colors.filter(function (c) { return c > 0; }).length; }

  /** 这一关要求的涂法：恰好 k 面（k 是数字）/ 至少一面（'any'）/ 随便（'all'） */
  function allowed(lv, colors) {
    var p = painted(colors);
    if (typeof lv.k === 'number') return p === lv.k;
    if (lv.k === 'any') return p >= 1;
    return true;
  }
  /** 满足要求的所有「不一样」的涂法（逐个列出 colorsN^6 种涂法再去掉转一转一样的） */
  function classes(lv) {
    var nc = lv.colors || 2, seen = {}, out = [];
    for (var code = 0; code < Math.pow(nc, 6); code++) {
      var c = [], x = code;
      for (var f = 0; f < 6; f++) { c.push(x % nc); x = Math.floor(x / nc); }
      if (!allowed(lv, c)) continue;
      var key = canonical(c);
      if (!seen[key]) { seen[key] = true; out.push(c); }
    }
    return out;
  }

  /* ---------- 关卡 ---------- */
  // collect：孩子一个个涂出来收集；answer：只问数目（太多了，不适合一个个收集）
  var LEVELS = [
    { ch: 'paint', k: 1, tip: 'cbtip1', hint: 'cbhint1' },
    { ch: 'paint', k: 2, tip: 'cbtip2', hint: 'cbhint2' },
    { ch: 'paint', k: 3, tip: 'cbtip3', hint: 'cbhint3' },
    { ch: 'paint', k: 'any', olympiad: true, tip: 'cbtip4', hint: 'cbhint4' },
    { ch: 'read', key: 'cbread' },
    { ch: 'think', key: 'cbex1', k: 4 },
    { ch: 'think', key: 'cbex2', k: 'all' },
    { ch: 'think', key: 'cbex3', k: 'all', colors: 3, askCount: true }
  ];
  var CHAPTERS = [
    { id: 'paint', nameKey: 'cbchPaint' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'cbchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });

  return {
    FACES: { U: U, D: D, F: F, B: B, L: L, R: R }, TURN_X: TURN_X, TURN_Y: TURN_Y, ROTATIONS: ROTATIONS,
    apply: apply, canonical: canonical, same: same, painted: painted, allowed: allowed, classes: classes,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD
  };
});
