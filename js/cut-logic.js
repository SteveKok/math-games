/*
 * 公平切蛋糕（OMK 2016 Bongsu B1）的几何。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Cut，Node 里 module.exports（测试用）。
 *
 * 画布坐标 0–100。一块「蛋糕」= 一个区域 { outer: 多边形, holes: [多边形…] }。
 * 一刀 = 一条无限长的直线（经过点 p，方向 d）。
 * 成功 = 这条线把每一块蛋糕都分成面积相等的两半，并且经过所有图钉。
 *
 * 三种玩法：
 *   free ：随手拖一条线
 *   pin  ：线绕着图钉转
 *   edge ：只用没有刻度的直尺——只能连接已有的两个点（角、图钉、线与线/线与边的交点）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Cut = factory();
})(this, function () {
  'use strict';
  var EPS = 1e-7;

  /* ---------- 基本几何 ---------- */
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function area(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }
  /** 直线：经过 a、b 两点 */
  function lineThrough(a, b) { return { p: a, d: sub(b, a) }; }
  /** 点在直线哪一侧（>0 左，<0 右），按方向长度归一 */
  function side(line, q) { return cross(line.d, sub(q, line.p)) / Math.hypot(line.d[0], line.d[1]); }
  function onLine(line, q, tol) { return Math.abs(side(line, q)) <= (tol == null ? 1e-6 : tol); }

  /** 把多边形裁到直线左侧（Sutherland–Hodgman，对凹多边形也能算对面积） */
  function clipLeft(poly, line) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var sa = side(line, a), sb = side(line, b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) {
        var t = sa / (sa - sb);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out.length >= 3 ? out : [];
  }
  function flip(line) { return { p: line.p, d: [-line.d[0], -line.d[1]] }; }

  function regionArea(r) {
    return area(r.outer) - (r.holes || []).reduce(function (s, h) { return s + area(h); }, 0);
  }
  /** 直线左边占这块蛋糕的比例（0–1） */
  function leftShare(r, line) {
    var left = area(clipLeft(r.outer, line)) - (r.holes || []).reduce(function (s, h) { return s + area(clipLeft(h, line)); }, 0);
    return left / regionArea(r);
  }

  /** 这一刀是否成功：每块都平分（误差 tol），并经过所有图钉 */
  function isFair(level, line, tol, pinTol) {
    if (!line || Math.hypot(line.d[0], line.d[1]) < EPS) return false;
    var okPins = (level.pins || []).every(function (p) { return onLine(line, p, pinTol == null ? 1e-6 : pinTol); });
    return okPins && level.regions.every(function (r) { return Math.abs(leftShare(r, line) - 0.5) <= tol; });
  }

  /* ---------- 只用直尺：能点的点 ---------- */
  function polys(level) {
    var out = [];
    level.regions.forEach(function (r) { out.push(r.outer); (r.holes || []).forEach(function (h) { out.push(h); }); });
    return out;
  }
  function edges(level) {
    var out = [];
    polys(level).forEach(function (pl) {
      for (var i = 0; i < pl.length; i++) out.push([pl[i], pl[(i + 1) % pl.length]]);
    });
    return out;
  }
  function inBox(q) { return q[0] >= -EPS && q[0] <= 100 + EPS && q[1] >= -EPS && q[1] <= 100 + EPS; }
  function addPoint(list, q) {
    if (!inBox(q)) return;
    for (var i = 0; i < list.length; i++) if (dist(list[i], q) < 1e-6) return;
    list.push(q);
  }
  /** 两条直线的交点（平行则 null） */
  function meet(l1, l2) {
    var den = cross(l1.d, l2.d);
    if (Math.abs(den) < EPS) return null;
    var t = cross(sub(l2.p, l1.p), l2.d) / den;
    return [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t];
  }
  /** 直线和线段的交点 */
  function meetSegment(line, a, b) {
    var q = meet(line, lineThrough(a, b));
    if (!q) return null;
    var len = dist(a, b), t = ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / (len * len);
    return t >= -EPS && t <= 1 + EPS ? q : null;
  }
  /**
   * 现在纸上能点的所有点：
   *   多边形的角、图钉、画过的线彼此的交点、画过的线和蛋糕边的交点
   */
  function points(level, lines) {
    var pts = [];
    polys(level).forEach(function (pl) { pl.forEach(function (q) { addPoint(pts, q); }); });
    (level.pins || []).forEach(function (q) { addPoint(pts, q); });
    var es = edges(level);
    lines.forEach(function (l, i) {
      es.forEach(function (e) { var q = meetSegment(l, e[0], e[1]); if (q) addPoint(pts, q); });
      for (var j = 0; j < i; j++) { var q2 = meet(l, lines[j]); if (q2) addPoint(pts, q2); }
    });
    return pts;
  }
  function sameLine(l1, l2) { return onLine(l1, l2.p) && onLine(l1, [l2.p[0] + l2.d[0], l2.p[1] + l2.d[1]]); }
  function findPoint(pts, q, tol) {
    var best = -1, bd = tol;
    pts.forEach(function (p, i) { var d = dist(p, q); if (d <= bd) { bd = d; best = i; } });
    return best;
  }

  /* ---------- 形状 ---------- */
  /** 长方形（也可以是平行四边形）：中心 c，两条「半边」向量 u、v；角按顺序排 */
  function quad(c, u, v) {
    return [
      [c[0] + u[0] + v[0], c[1] + u[1] + v[1]],
      [c[0] + u[0] - v[0], c[1] + u[1] - v[1]],
      [c[0] - u[0] - v[0], c[1] - u[1] - v[1]],
      [c[0] - u[0] + v[0], c[1] - u[1] + v[1]]
    ];
  }
  /** 连对角线（找中心）的两步 */
  function diagonals(q) { return [[q[0], q[2]], [q[1], q[3]]]; }

  /* ---------- 关卡 ---------- */
  // 第 1–2 关：随手切
  var R1 = quad([50, 50], [34, 0], [0, 22]);
  var R2 = quad([50, 52], [36, 0], [0, 24]);
  // 第 3 关：斜放的长方形 + 图钉（只用直尺）
  var R3 = quad([50, 50], [32, 8], [-4.8, 19.2]), P3 = [66, 42];
  // 第 4 关：两块蛋糕
  var A4 = quad([28, 32], [17, 0], [0, 12]), B4 = quad([70, 68], [15, 5], [-4, 12]);
  // 第 5 关：OMK 2016 B1 原题（大长方形略斜，小长方形斜放在里面）
  var OUT5 = quad([50, 52], [40, 1], [-0.75, 30]), IN5 = quad([42, 44], [13, 3.5], [-2.975, 11.05]);
  // 想一想 1：平行四边形 + 图钉
  var PAR = quad([50, 50], [30, 0], [10, 30]), PP = [86, 14];
  // 想一想 2：两个长方形中心重合 + 图钉
  var OUTC = quad([50, 50], [36, 0], [0, 28]), INC = quad([50, 50], [12, 5], [-6, 14.4]), PC = [92, 12];
  // 想一想 3：L 形
  var L = [[15, 15], [55, 15], [55, 50], [85, 50], [85, 85], [15, 85]];  // 不对称，免得对角线碰巧平分

  var LEVELS = [
    { ch: 'free', regions: [{ outer: R1 }], center: [50, 50], tip: 'ctip1', hint: 'chintCenter' },
    { ch: 'pin', regions: [{ outer: R2 }], pins: [[28, 36]], center: [50, 52], tip: 'ctip2', hint: 'chintCenter' },
    { ch: 'edge', regions: [{ outer: R3 }], pins: [P3], tip: 'ctip3', hint: 'chintDiag', hintPts: [R3[0], R3[2]],
      solution: diagonals(R3).concat([[P3, [50, 50]]]) },
    { ch: 'edge', regions: [{ outer: A4 }, { outer: B4 }], tip: 'ctip4', hint: 'chintTwo', hintPts: [A4[0], A4[2], B4[0], B4[2]],
      solution: diagonals(A4).concat(diagonals(B4), [[[28, 32], [70, 68]]]) },
    { ch: 'edge', olympiad: true, regions: [{ outer: OUT5, holes: [IN5] }], tip: 'ctip5', hint: 'chintRing', hintPts: [OUT5[0], OUT5[2], IN5[0], IN5[2]],
      solution: diagonals(OUT5).concat(diagonals(IN5), [[[50, 52], [42, 44]]]) },
    { ch: 'read', key: 'cread' },
    { ch: 'think', key: 'cex1', regions: [{ outer: PAR }], pins: [PP], hintPts: [PAR[0], PAR[2]],
      solution: diagonals(PAR).concat([[PP, [50, 50]]]) },
    { ch: 'think', key: 'cex2', regions: [{ outer: OUTC, holes: [INC] }], pins: [PC], hintPts: [OUTC[0], OUTC[2]],
      solution: diagonals(OUTC).concat([[PC, [50, 50]]]) },
    { ch: 'think', key: 'cex3', regions: [{ outer: L }], hintPts: [[55, 15], [55, 50]],
      // 延长里面那条竖边，碰到底边 (55,85)，把 L 分成两个长方形，再各自连对角线
      solution: [[[55, 15], [55, 50]], [[15, 15], [55, 85]], [[55, 15], [15, 85]], [[55, 50], [85, 85]], [[85, 50], [55, 85]], [[35, 50], [70, 67.5]]] }
  ];
  var CHAPTERS = [
    { id: 'free', nameKey: 'cchFree' },
    { id: 'edge', nameKey: 'cchEdge' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'cchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch === 'pin' ? 'free' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });
  /** 这一关是不是「只用直尺」 */
  function isEdge(lv) { return lv.ch === 'edge' || lv.ch === 'think'; }

  return {
    area: area, lineThrough: lineThrough, side: side, onLine: onLine, clipLeft: clipLeft, flip: flip,
    regionArea: regionArea, leftShare: leftShare, isFair: isFair,
    points: points, meet: meet, sameLine: sameLine, findPoint: findPoint, quad: quad,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD, isEdge: isEdge,
    FREE_TOL: 0.01, EDGE_TOL: 1e-9
  };
});
