// 运行：node tests/nim-logic.test.js
// 用暴力搜索（不依赖异或理论）独立验证 Nim 策略和所有关卡。
'use strict';
const assert = require('assert');
const Nim = require('../js/nim-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

// 暴力 minimax：轮到走的一方是否必胜（拿到最后一个赢）
const memo = new Map();
function bruteWin(piles) {
  const key = piles.slice().sort((a, b) => a - b).join(',');
  if (memo.has(key)) return memo.get(key);
  let win = false;
  if (!Nim.isOver(piles)) {
    for (const m of Nim.allMoves(piles)) {
      if (!bruteWin(Nim.applyMove(piles, m))) { win = true; break; }
    }
  }
  // 全空时轮到的人输（对手拿了最后一个）
  memo.set(key, win);
  return win;
}

function* positions(k, max) {
  const p = new Array(k).fill(0);
  while (true) {
    yield p.slice();
    let i = 0;
    while (i < k && p[i] === max) { p[i] = 0; i++; }
    if (i === k) return;
    p[i]++;
  }
}

// 可复现的伪随机数
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('Nim logic');

test('nim-sum ≠ 0 ⇔ 先手必胜（暴力验证 1–4 堆，每堆 0–8）', () => {
  for (let k = 1; k <= 4; k++) {
    for (const p of positions(k, k <= 3 ? 8 : 7)) {
      assert.strictEqual(bruteWin(p), Nim.nimSum(p) !== 0, 'piles=' + p);
    }
  }
});

test('winningMoves 恰好是暴力搜索找到的全部必胜走法', () => {
  for (const p of positions(3, 7)) {
    const brute = Nim.allMoves(p).filter(m => !bruteWin(Nim.applyMove(p, m)));
    const ours = Nim.winningMoves(p);
    const key = m => m.pile + ':' + m.count;
    assert.deepStrictEqual(ours.map(key).sort(), brute.map(key).sort(), 'piles=' + p);
  }
});

test('每一关：孩子先手且有必胜走法', () => {
  Nim.LEVELS.forEach((lv, i) => {
    assert.ok(bruteWin(lv.piles), 'level ' + (i + 1) + ' piles=' + lv.piles);
  });
});

test('关卡循序渐进：2 堆 → 3 堆 → 4 堆', () => {
  const sizes = Nim.LEVELS.map(l => l.piles.length);
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1]);
  assert.deepStrictEqual([...new Set(sizes)], [2, 3, 4]);
});

test('电脑任何 skill 下都只走合法步，游戏一定结束', () => {
  const rand = rng(42);
  for (let g = 0; g < 2000; g++) {
    const lv = Nim.LEVELS[g % Nim.LEVELS.length];
    const skill = [0, 0.5, 1][g % 3];
    let p = lv.piles.slice(), steps = 0;
    while (!Nim.isOver(p)) {
      const m = Nim.computerMove(p, skill, rand);
      assert.ok(Nim.isLegal(p, m.pile, m.count), 'illegal ' + JSON.stringify(m) + ' on ' + p);
      p = Nim.applyMove(p, m);
      assert.ok(++steps <= 100);
    }
  }
});

test('最优电脑先手于必胜局面时永不输', () => {
  const rand = rng(7);
  for (let g = 0; g < 3000; g++) {
    let p = [1 + (g % 7), 1 + ((g * 3) % 6), (g * 5) % 8];
    if (Nim.nimSum(p) === 0) continue;
    let turn = 'cpu';
    while (true) {
      const m = turn === 'cpu' ? Nim.computerMove(p, 1, rand) : Nim.randomMove(p, rand);
      p = Nim.applyMove(p, m);
      if (Nim.isOver(p)) { assert.strictEqual(turn, 'cpu'); break; }
      turn = turn === 'cpu' ? 'kid' : 'cpu';
    }
  }
});

test('splitPowers 拆分正确', () => {
  for (let n = 0; n <= 40; n++) {
    const parts = Nim.splitPowers(n);
    assert.strictEqual(parts.reduce((a, b) => a + b, 0), n);
    assert.strictEqual(new Set(parts).size, parts.length);
    parts.forEach(x => assert.strictEqual(x & (x - 1), 0));
    for (let i = 1; i < parts.length; i++) assert.ok(parts[i] < parts[i - 1]);
  }
});

test('非法走法会抛错', () => {
  assert.throws(() => Nim.applyMove([3, 2], { pile: 0, count: 0 }));
  assert.throws(() => Nim.applyMove([3, 2], { pile: 1, count: 3 }));
  assert.throws(() => Nim.applyMove([3, 2], { pile: 2, count: 1 }));
});

console.log(passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
