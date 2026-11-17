/*
 * 说谎者与诚实者：题目的表示、求解、生成（纯逻辑，不碰 DOM）。
 * 浏览器里挂到 window.MG.Liar；Node 里通过 module.exports 导出，供 tests/ 使用。
 *
 * 规则：每个人要么「诚实」（说的话一定为真），要么「说谎」（说的话一定为假）。
 * 一个答案 h（h[i] = true 表示第 i 个人诚实）是「说得通」的，当且仅当每个人都满足：
 *     h[i] === 第 i 个人说的话在 h 下是否为真
 * 程序枚举全部 2^n 种可能，只保留「恰好一种说得通」的题目，所以每题都有唯一答案。
 */
(function (root) {
  'use strict';

  /*
   * 一句话 = { type, a, b, n }
   *   isH / isL        a 是诚实的 / a 是说谎的
   *   same / diff      我和 a 是同一种人 / 不是同一种人
   *   bothH / bothL    a 和 b 都诚实 / 都说谎
   *   eitherH / eitherL  a 和 b 里至少一个诚实 / 至少一个说谎
   *   countL           我们当中恰好有 n 个说谎的
   *   atLeastL         我们当中至少有一个说谎的
   */
  var TYPES = ['isH', 'isL', 'same', 'diff', 'bothH', 'bothL', 'eitherH', 'eitherL', 'countL', 'atLeastL'];
  var NEEDS_TWO = { bothH: 1, bothL: 1, eitherH: 1, eitherL: 1 };
  var NEEDS_ONE = { isH: 1, isL: 1, same: 1, diff: 1 };

  function liars(h) { return h.filter(function (x) { return !x; }).length; }

  /** 在答案 h 下，speaker 说的话 st 是否为真 */
  function evaluate(st, speaker, h) {
    switch (st.type) {
      case 'isH': return h[st.a];
      case 'isL': return !h[st.a];
      case 'same': return h[speaker] === h[st.a];
      case 'diff': return h[speaker] !== h[st.a];
      case 'bothH': return h[st.a] && h[st.b];
      case 'bothL': return !h[st.a] && !h[st.b];
      case 'eitherH': return h[st.a] || h[st.b];
      case 'eitherL': return !h[st.a] || !h[st.b];
      case 'countL': return liars(h) === st.n;
      case 'atLeastL': return liars(h) >= 1;
    }
    throw new Error('unknown statement type ' + st.type);
  }

  /** 每个人「说得通」吗？返回布尔数组 */
  function check(statements, h) {
    return statements.map(function (st, i) { return h[i] === evaluate(st, i, h); });
  }

  function consistent(statements, h) {
    return check(statements, h).every(Boolean);
  }

  /** 第 k 种答案（二进制位 1 = 诚实） */
  function assignment(k, n) {
    var h = [];
    for (var i = 0; i < n; i++) h.push(!!(k & (1 << i)));
    return h;
  }

  /** 所有说得通的答案 */
  function solve(statements) {
    var n = statements.length, out = [];
    for (var k = 0; k < (1 << n); k++) {
      var h = assignment(k, n);
      if (consistent(statements, h)) out.push(h);
    }
    return out;
  }

  /** 这句话格式是否合法（不指向自己、两个对象不同、数字在范围内） */
  function isValidStatement(st, speaker, n) {
    if (TYPES.indexOf(st.type) < 0) return false;
    var others = function (x) { return Number.isInteger(x) && x >= 0 && x < n && x !== speaker; };
    if (NEEDS_ONE[st.type]) return others(st.a);
    if (NEEDS_TWO[st.type]) return others(st.a) && others(st.b) && st.a < st.b;
    if (st.type === 'countL') return Number.isInteger(st.n) && st.n >= 0 && st.n <= n;
    return st.type === 'atLeastL';
  }

  function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

  function randomStatement(speaker, n, types, rand) {
    var usable = types.filter(function (t) { return !NEEDS_TWO[t] || n >= 3; });
    var type = pick(usable, rand);
    var others = [];
    for (var i = 0; i < n; i++) if (i !== speaker) others.push(i);
    var st = { type: type };
    if (NEEDS_ONE[type]) st.a = pick(others, rand);
    if (NEEDS_TWO[type]) {
      var x = pick(others, rand), rest = others.filter(function (o) { return o !== x; });
      var y = pick(rest, rand);
      st.a = Math.min(x, y); st.b = Math.max(x, y);
    }
    if (type === 'countL') st.n = 1 + Math.floor(rand() * (n - 1)); // 1..n-1，避免「没有人说谎」这种一眼看穿的话
    return st;
  }

  function sameStatement(p, q) { return p.type === q.type && p.a === q.a && p.b === q.b && p.n === q.n; }

  /**
   * 生成一道题：{ statements, solution }
   * 保证：唯一解；答案里诚实、说谎两种人都有；同一题里没有两句一模一样的话。
   */
  function generate(level, rand) {
    rand = rand || Math.random;
    var n = level.n;
    for (var tries = 0; tries < 20000; tries++) {
      var sts = [];
      for (var i = 0; i < n; i++) sts.push(randomStatement(i, n, level.types, rand));
      var dup = sts.some(function (s, i) { return sts.some(function (t, j) { return j > i && sameStatement(s, t); }); });
      if (dup) continue;
      var sols = solve(sts);
      if (sols.length !== 1) continue;
      var L = liars(sols[0]);
      if (L === 0 || L === n) continue;
      // 关卡要求某种句式必须出现（让每一关有新东西）
      if (level.mustUse && !sts.some(function (s) { return level.mustUse.indexOf(s.type) >= 0; })) continue;
      return { statements: sts, solution: sols[0] };
    }
    throw new Error('could not generate puzzle');
  }

  /*
   * 关卡。tip：通关后一句话点破（i18n key）。
   */
  var BASIC = ['isH', 'isL', 'atLeastL'];
  var LEVELS = [
    { n: 2, types: BASIC, tip: 'ltipAssume' },
    { n: 2, types: BASIC.concat(['same']), mustUse: ['same'], tip: 'ltipSame' },
    { n: 2, types: BASIC.concat(['same', 'diff']), mustUse: ['diff'], tip: 'ltipDiff' },
    { n: 3, types: ['isH', 'isL', 'same', 'diff'], tip: 'ltipChain' },
    { n: 3, types: ['isH', 'isL', 'same', 'diff', 'bothH', 'bothL'], mustUse: ['bothH', 'bothL'], tip: 'ltipBoth' },
    { n: 3, types: ['isH', 'isL', 'same', 'diff', 'eitherH', 'eitherL'], mustUse: ['eitherH', 'eitherL'], tip: 'ltipEither' },
    { n: 3, types: ['isH', 'isL', 'same', 'diff', 'countL', 'atLeastL'], mustUse: ['countL'], tip: 'ltipCount' },
    { n: 3, types: TYPES, tip: 'ltipNobody' },
    { n: 4, types: ['isH', 'isL', 'same', 'diff', 'countL'], tip: 'ltipAssume' },
    { n: 4, types: TYPES, tip: 'ltipFinal' }
  ];

  var Liar = {
    TYPES: TYPES,
    evaluate: evaluate,
    check: check,
    consistent: consistent,
    solve: solve,
    generate: generate,
    isValidStatement: isValidStatement,
    LEVELS: LEVELS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Liar;
  else { root.MG = root.MG || {}; root.MG.Liar = Liar; }
})(typeof window !== 'undefined' ? window : globalThis);
