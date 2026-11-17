/*
 * 加一的秘密（OMK 2016 Bongsu B2）的规则。只有纯函数和关卡数据，不碰界面。
 * 浏览器里挂在 MG.Digit，Node 里 module.exports（测试用）。
 *
 * 孩子转 7 个数字轮，组成一个数 N；画面同时显示 N 和 N + 1 的数字和。
 * 关键事实：N 末尾有 B 个 9 时，加 1 让数字和变化 1 − 9B（B = 0 时就是 +1）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MG.Digit = factory();
})(this, function () {
  'use strict';
  var WHEELS = 7;

  function digitSum(n) { var s = 0; n = Math.abs(n); while (n > 0) { s += n % 10; n = Math.floor(n / 10); } return s; }
  function trailingNines(n) { var b = 0; while (n % 10 === 9) { b++; n = Math.floor(n / 10); } return b; }
  /** 加 1 以后数字和的变化 */
  function change(n) { return digitSum(n + 1) - digitSum(n); }
  function mod(a, m) { return ((a % m) + m) % m; }
  function isPrime(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
  /** 从 n 开始连续 k 个数，有几个的数字和是质数 */
  function primeCount(n, k) { var c = 0; for (var j = 0; j < k; j++) if (isPrime(digitSum(n + j))) c++; return c; }
  function fromDigits(ds) { return ds.reduce(function (n, d) { return n * 10 + d; }, 0); }
  function toDigits(n) {
    var out = [];
    for (var i = 0; i < WHEELS; i++) { out.unshift(n % 10); n = Math.floor(n / 10); }
    return out;
  }

  /** 这一关的要求，N 是否满足（N 必须是正整数） */
  function check(lv, n) {
    if (!(n >= 1)) return false;
    switch (lv.kind) {
      case 'down': return change(n) < 0;
      case 'drop': return change(n) === -lv.amount;
      case 'diffMod': return mod(change(n), lv.m) === 0;
      case 'both': return mod(digitSum(n), lv.m) === 0 && mod(digitSum(n + 1), lv.m) === 0;
      case 'primeRun': return n + lv.k - 1 <= Math.pow(10, WHEELS) - 1 && primeCount(n, lv.k) >= lv.need;
    }
    return false;
  }

  /**
   * 两个连续的数，数字和都是 m 的倍数，什么时候存在？
   * 设 N = X 后面跟 B 个 9（X 不以 9 结尾），X 的数字和是 r：
   *   N 的数字和 = r + 9B，N + 1 的数字和 = r + 1
   * 要 r + 1 ≡ 0 且 9B ≡ 1 (mod m)。9B ≡ 1 有解 ⇔ 9 和 m 互质 ⇔ m 不是 3 的倍数。
   */
  function bothPossible(m) { return m === 1 || m % 3 !== 0; }
  /** 按上面的公式造一个例子：最小的 B ≥ 1 使 9B ≡ 1，最小的 X（不以 9 结尾）使数字和 ≡ −1 */
  function bothExample(m) {
    if (!bothPossible(m)) return null;
    var B = 1;
    while (mod(9 * B, m) !== 1) B++;
    var X = 1;
    while (X % 10 === 9 || mod(digitSum(X) + 1, m) !== 0) X++;
    return X * Math.pow(10, B) + (Math.pow(10, B) - 1);
  }

  /* ---------- 关卡 ---------- */
  var LEVELS = [
    // 加 1 会怎样：由浅入深
    { ch: 'carry', kind: 'down', start: 1234, tip: 'dtip1', hint: 'dhint1', example: 19 },
    { ch: 'carry', kind: 'drop', amount: 17, start: 1239, tip: 'dtip2', hint: 'dhint2', example: 1299 },
    { ch: 'carry', kind: 'diffMod', m: 5, start: 1299, tip: 'dtip3', hint: 'dhint3', example: 19999 },
    { ch: 'carry', kind: 'primeRun', k: 3, need: 3, start: 1234, tip: 'dtip5', hint: 'dhint5', example: 199 },
    // 两道真题都在算数字和：OMK 2016 Bongsu B2、Muda B2
    { ch: 'carry', kind: 'both', m: 5, olympiad: true, start: 50767, tip: 'dtip4', hint: 'dhint4', example: 49999 },
    { ch: 'carry', kind: 'primeRun', k: 5, need: 4, start: 1234, olympiad: true, poly: 'dp2', title: 'OMK 2016 · Muda B2', tip: 'dtip6', hint: 'dhint6', example: 197 },
    { ch: 'read', key: 'dread' },
    { ch: 'think', key: 'dex1', kind: 'both', m: 7, start: 1, example: 69999 },
    { ch: 'think', key: 'dex2', kind: 'both', m: 3, start: 1, impossible: true },
    { ch: 'think', key: 'dex3', kind: 'both', m: 11, start: 1, example: 2899999 }
  ];
  var CHAPTERS = [
    { id: 'carry', nameKey: 'dchCarry' },
    { id: 'oly', nameKey: 'pchOly' },
    { id: 'read', nameKey: 'dchRead' },
    { id: 'think', nameKey: 'pchThink' }
  ];
  function chapterOf(lv) { return lv.olympiad ? 'oly' : lv.ch; }
  function levelPossible(lv) { return lv.kind === 'both' ? bothPossible(lv.m) : true; }
  var OLYMPIAD = LEVELS.findIndex(function (l) { return l.olympiad; });

  return {
    WHEELS: WHEELS, digitSum: digitSum, isPrime: isPrime, primeCount: primeCount, trailingNines: trailingNines, change: change, mod: mod,
    fromDigits: fromDigits, toDigits: toDigits, check: check, bothPossible: bothPossible, bothExample: bothExample,
    LEVELS: LEVELS, CHAPTERS: CHAPTERS, chapterOf: chapterOf, levelPossible: levelPossible, OLYMPIAD: OLYMPIAD
  };
});
