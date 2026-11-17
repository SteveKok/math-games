/*
 * Nim 规则与策略（纯逻辑，不碰 DOM）。
 * 浏览器里挂到 window.MG.Nim；Node 里通过 module.exports 导出，供 tests/ 使用。
 *
 * 规则（正常玩法）：几堆物品，两人轮流从「某一堆」拿走至少 1 个，拿到最后一个的人赢。
 * 必胜策略：所有堆数量的异或和（nim-sum）不为 0 时，先手必胜；
 *           每次把局面变成异或和为 0，对手就必输。
 */
(function (root) {
  'use strict';

  /** 所有堆的异或和 */
  function nimSum(piles) {
    return piles.reduce(function (a, b) { return a ^ b; }, 0);
  }

  function isOver(piles) {
    return piles.every(function (n) { return n === 0; });
  }

  function isLegal(piles, pile, count) {
    return Number.isInteger(pile) && Number.isInteger(count) &&
      pile >= 0 && pile < piles.length && count >= 1 && count <= piles[pile];
  }

  /** 返回新数组，不修改原数组 */
  function applyMove(piles, move) {
    if (!isLegal(piles, move.pile, move.count)) throw new Error('illegal move');
    var next = piles.slice();
    next[move.pile] -= move.count;
    return next;
  }

  /** 所有合法走法 */
  function allMoves(piles) {
    var moves = [];
    for (var i = 0; i < piles.length; i++) {
      for (var c = 1; c <= piles[i]; c++) moves.push({ pile: i, count: c });
    }
    return moves;
  }

  /** 所有「必胜走法」：走完后异或和为 0。局面异或和为 0 时返回空数组。 */
  function winningMoves(piles) {
    var s = nimSum(piles);
    if (s === 0) return [];
    var moves = [];
    for (var i = 0; i < piles.length; i++) {
      var target = piles[i] ^ s;
      if (target < piles[i]) moves.push({ pile: i, count: piles[i] - target });
    }
    return moves;
  }

  function pick(arr, rand) {
    return arr[Math.floor(rand() * arr.length)];
  }

  /** 随机走法；偏向少拿一点，让小朋友有更多回合可以观察 */
  function randomMove(piles, rand) {
    rand = rand || Math.random;
    var nonEmpty = [];
    for (var i = 0; i < piles.length; i++) if (piles[i] > 0) nonEmpty.push(i);
    var pile = pick(nonEmpty, rand);
    var max = piles[pile];
    var count = 1 + Math.floor(Math.pow(rand(), 1.6) * max);
    if (count > max) count = max;
    return { pile: pile, count: count };
  }

  /**
   * 电脑走一步。
   * skill ∈ [0,1]：每步以 skill 的概率走必胜步（若存在），否则随机。
   * 处于必输局面（异或和为 0）时，最优玩家也只能随机拖延——拿 1 个，尽量拖长。
   */
  function computerMove(piles, skill, rand) {
    rand = rand || Math.random;
    if (isOver(piles)) return null;
    var wins = winningMoves(piles);
    if (wins.length && rand() < skill) return pick(wins, rand);
    if (!wins.length && skill >= 1) {
      // 必输时：从最大的堆拿 1 个，给对手留下最多出错的机会
      var best = 0;
      for (var i = 1; i < piles.length; i++) if (piles[i] > piles[best]) best = i;
      return { pile: best, count: 1 };
    }
    return randomMove(piles, rand);
  }

  /** 把一个数拆成 8、4、2、1 这样的「小份」（从大到小） */
  function splitPowers(n) {
    var parts = [];
    for (var p = 8; p >= 1; p >>= 1) if (n & p) parts.push(p);
    for (var q = 16; q <= n; q <<= 1) if (n & q) parts.unshift(q);
    return parts;
  }

  /*
   * 关卡：孩子总是先手，起始局面异或和都不为 0，所以每一关孩子都「有路可赢」。
   * tests/nim-logic.test.js 会用暴力搜索验证这一点。
   * skill：电脑走必胜步的概率。tip：通关后一句话点破的数学（i18n key）。
   */
  var LEVELS = [
    { piles: [2, 3], skill: 0, tip: 'tipTwoEqual' },
    { piles: [3, 5], skill: 0.35, tip: 'tipTwoEqual' },
    { piles: [4, 6], skill: 1, tip: 'tipMirror' },
    { piles: [5, 8], skill: 1, tip: 'tipMirror' },
    { piles: [1, 2, 4], skill: 0, tip: 'tipThreeA' },
    { piles: [2, 4, 5], skill: 0.5, tip: 'tipPairs' },
    { piles: [3, 5, 7], skill: 1, tip: 'tipPairs' },
    { piles: [4, 5, 7], skill: 1, tip: 'tipPairs' },
    { piles: [1, 3, 5, 6], skill: 0.5, tip: 'tipPairs' },
    { piles: [2, 4, 6, 7], skill: 1, tip: 'tipPairs' },
    { piles: [3, 5, 6, 7], skill: 1, tip: 'tipFinal' }
  ];

  var Nim = {
    nimSum: nimSum,
    isOver: isOver,
    isLegal: isLegal,
    applyMove: applyMove,
    allMoves: allMoves,
    winningMoves: winningMoves,
    randomMove: randomMove,
    computerMove: computerMove,
    splitPowers: splitPowers,
    LEVELS: LEVELS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Nim;
  else { root.MG = root.MG || {}; root.MG.Nim = Nim; }
})(typeof window !== 'undefined' ? window : globalThis);
