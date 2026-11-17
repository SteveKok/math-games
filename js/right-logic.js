/*
 * 找直角（OMK 2016 Muda B1）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Right，Node 里 module.exports（测试用）。
 *
 * 两种玩法：
 *   pyth  ：直角三角形，已知两边，用「试」找第三边（c² = a² + b²）
 *   angle ：长方形 ABCD，E 在 AB 上、F 在 BC 上；AE、EB、FC 固定，孩子调 BF = x，
 *           找到让 ∠DEF = 90° 的 x。lengths: true 的关卡，接着要找出 DE、EF、FD 三条边。
 *
 * 坐标：A(0,0) B(W,0) C(W,H) D(0,H)，W = AE + EB，H = AD = x + FC，E(AE,0)，F(W,x)。
 * ED = (−AE, H)，EF = (EB, x)，ED·EF = H·x − AE·EB，所以 ∠DEF = 90° ⇔ x(x + FC) = AE·EB。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Right = factory();
})(this, function () {
  'use strict';

  function isqrt(n) { var r = Math.round(Math.sqrt(n)); return r * r === n ? r : null; }

  /* ---------- 勾股 ---------- */
  /** 直角三角形：给两个已知边和要找的那条边（'c' 斜边，'b' 直角边），guess 对不对 */
  function pythAnswer(lv) {
    return lv.find === 'b' ? isqrt(lv.c * lv.c - lv.a * lv.a) : isqrt(lv.a * lv.a + lv.b * lv.b);
  }

  /* ---------- 长方形里的直角 ---------- */
  function geom(lv, x) {
    var W = lv.AE + lv.EB, H = x + lv.FC;
    return { W: W, H: H, A: [0, 0], B: [W, 0], C: [W, H], D: [0, H], E: [lv.AE, 0], F: [W, x] };
  }
  /** ED·EF：0 就是直角 */
  function dot(lv, x) { return (x + lv.FC) * x - lv.AE * lv.EB; }
  /** ∠DEF 的度数 */
  function angleDEF(lv, x) {
    var H = x + lv.FC, ed = [-lv.AE, H], ef = [lv.EB, x];
    var c = (ed[0] * ef[0] + ed[1] * ef[1]) / (Math.hypot(ed[0], ed[1]) * Math.hypot(ef[0], ef[1]));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  function isRight(lv, x) { return dot(lv, x) === 0; }
  /** 让 ∠DEF = 90° 的 BF（正整数解；没有就 null） */
  function rightX(lv) {
    for (var x = 1; x <= 1000; x++) if (isRight(lv, x)) return x;
    return null;
  }
  /** 三角形 DEF 的三条边，以及每条边所在直角三角形的两条直角边 */
  function sides(lv, x) {
    var H = x + lv.FC, W = lv.AE + lv.EB;
    return {
      DE: { legs: [lv.AE, H], legNames: ['AE', 'AD'] },
      EF: { legs: [lv.EB, x], legNames: ['EB', 'BF'] },
      FD: { legs: [W, lv.FC], legNames: ['CD', 'FC'] }
    };
  }
  function sideLength(s) { return isqrt(s.legs[0] * s.legs[0] + s.legs[1] * s.legs[1]); }

  /* ---------- 关卡 ---------- */
  var LEVELS = [
    // 第一章：拼正方形——斜边是多少？
    { ch: 'pyth', a: 3, b: 4, find: 'c', start: 3, tip: 'rtip1', hint: 'rhint1' },
    { ch: 'pyth', a: 5, b: 12, find: 'c', start: 12, tip: 'rtip2', hint: 'rhint1' },
    { ch: 'pyth', a: 16, b: 63, find: 'c', start: 63, tip: 'rtip3', hint: 'rhint3' },
    // 第二章：找直角——长方形里，BF 是多少时 ∠DEF = 90°？
    { ch: 'angle', AE: 4, EB: 9, FC: 5, start: 1, max: 14, tip: 'rtip4', hint: 'rhint4' },
    { ch: 'angle', AE: 2, EB: 12, FC: 5, start: 1, max: 14, tip: 'rtip5', hint: 'rhint5' },
    // 终章：OMK 2016 Muda B1 原题
    { ch: 'angle', AE: 15, EB: 48, FC: 16, start: 5, max: 45, lengths: true, olympiad: true, tip: 'rtip6', hint: 'rhint6' },
    // 毕达哥拉斯定理：没有游戏的一页
    { ch: 'read', key: 'rread' },
    // 想一想
    { ch: 'angle', key: 'rex1', AE: 12, EB: 12, FC: 7, start: 1, max: 24, lengths: true },
    { ch: 'pyth', key: 'rex2', a: 20, b: 21, find: 'c', start: 21 },
    { ch: 'pyth', key: 'rex3', a: 7, c: 25, find: 'b', start: 7 }
  ];
  var CHAPTERS = [
    { id: 'pyth', nameKey: 'rchPyth' },
    { id: 'angle', nameKey: 'rchAngle' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'rchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.key && lv.key.indexOf('rex') === 0 ? 'think' : lv.ch; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });

  return {
    isqrt: isqrt, pythAnswer: pythAnswer, geom: geom, dot: dot, angleDEF: angleDEF, isRight: isRight,
    rightX: rightX, sides: sides, sideLength: sideLength,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, OLYMPIAD: OLYMPIAD
  };
});
