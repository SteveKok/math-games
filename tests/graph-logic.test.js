// 运行：node tests/graph-logic.test.js
// 一笔画：用「把所有走法都试一遍」的暴力搜索（不用欧拉定理）独立验证程序的判断。
// 涂地图：用「把所有涂法都试一遍」的暴力枚举独立验证最少颜色数。
'use strict';
const assert = require('assert');
const G = require('../js/graph-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 暴力：从 v 出发，能不能把没走过的线全部走完（逐条试）
function bruteFrom(edges, used, v) {
  if (used.every(Boolean)) return true;
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    const [a, b] = edges[i];
    if (a !== v && b !== v) continue;
    used[i] = true;
    const ok = bruteFrom(edges, used, a === v ? b : a);
    used[i] = false;
    if (ok) return true;
  }
  return false;
}
function brute(g, used, current) {
  const u = used.slice();
  if (current != null) return bruteFrom(g.edges, u, current);
  return g.nodes.some((_, v) => bruteFrom(g.edges, u, v));
}
function randomGraph(rand) {
  const n = 2 + Math.floor(rand() * 5), m = 1 + Math.floor(rand() * 8);
  const nodes = [...Array(n)].map(() => [0, 0]), edges = [];
  for (let i = 0; i < m; i++) {
    const a = Math.floor(rand() * n);
    let b = Math.floor(rand() * (n - 1)); if (b >= a) b++;
    edges.push([a, b]);
  }
  return { nodes, edges };
}

console.log('One stroke & map colouring logic');

test('欧拉判断 = 暴力搜索（2000 个随机图，含重边、走到一半的状态）', () => {
  const rand = rng(1736);
  for (let k = 0; k < 2000; k++) {
    const g = randomGraph(rand);
    const used = g.edges.map(() => rand() < 0.3);
    const cur = rand() < 0.3 ? null : Math.floor(rand() * g.nodes.length);
    assert.strictEqual(G.canFinish(g, used, cur), brute(g, used, cur), JSON.stringify({ g, used, cur }));
  }
});

test('每一关：能不能画、能从哪些点出发，都与暴力搜索一致', () => {
  G.STROKE.forEach((g) => {
    const none = g.edges.map(() => false);
    assert.strictEqual(G.possible(g), brute(g, none, null), g.id);
    const starts = g.nodes.map((_, i) => i).filter((i) => brute(g, none, i));
    assert.deepStrictEqual(G.goodStarts(g), starts, g.id);
  });
});

test('照着提示走（先挑好起点，每步挑提示的线），每一道能画的题都一定能画完', () => {
  const rand = rng(5);
  G.STROKE.filter(G.possible).forEach((g) => {
    for (let k = 0; k < 50; k++) {
      const starts = G.goodStarts(g);
      let cur = starts[Math.floor(rand() * starts.length)];
      const used = g.edges.map(() => false);
      for (let s = 0; s < g.edges.length; s++) {
        const next = G.goodNextEdges(g, used, cur);
        assert.ok(next.length > 0, g.id + ' 提示走进了死路');
        const e = next[Math.floor(rand() * next.length)];
        used[e] = true; cur = g.edges[e][0] === cur ? g.edges[e][1] : g.edges[e][0];
      }
      assert.ok(used.every(Boolean));
    }
  });
});

test('关卡：有能画的，也有画不出来的；画不出来的单数点都超过 2 个', () => {
  const imp = G.STROKE.filter((g) => !G.possible(g));
  assert.ok(imp.length >= 2 && imp.length < G.STROKE.length);
  imp.forEach((g) => assert.ok(G.oddNodes(g).length > 2, g.id));
  assert.ok(G.possible(G.STROKE[0]) && G.IMPOSSIBLE_FROM > 0);
  // 七桥问题：4 块地都连着单数座桥
  const k = G.STROKE.find((g) => g.id === 'konigsberg');
  assert.deepStrictEqual(G.degrees(k), [3, 3, 5, 3]);
  assert.strictEqual(k.edges.length, 7);
});

test('线不会穿过别的点（不然拖过去会误走）', () => {
  G.STROKE.forEach((g) => {
    g.edges.forEach(([a, b, bend]) => {
      if (bend) return;
      const [x1, y1] = g.nodes[a], [x2, y2] = g.nodes[b];
      g.nodes.forEach(([x, y], v) => {
        if (v === a || v === b) return;
        const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (t <= 0 || t >= 1) return;
        const d = Math.hypot(x1 + t * (x2 - x1) - x, y1 + t * (y2 - y1) - y);
        assert.ok(d > 12, g.id + ': edge ' + a + '-' + b + ' passes node ' + v);
      });
    });
  });
});

// 暴力：k 种颜色有没有正确涂法（逐个试 k^n 种）
function bruteColorable(map, k) {
  const n = map.regions.length;
  for (let m = 0; m < k ** n; m++) {
    const col = []; let x = m;
    for (let i = 0; i < n; i++) { col.push(x % k); x = Math.floor(x / k); }
    if (map.adj.every((list, a) => list.every((b) => col[a] !== col[b]))) return true;
  }
  return false;
}

test('每张地图：国家连成一片，邻居关系对称，给的颜色数正好是最少需要的', () => {
  G.COLOR.forEach((lv) => {
    const map = G.parseMap(lv.map);
    assert.ok(G.regionsConnected(map), lv.id);
    map.adj.forEach((list, a) => list.forEach((b) => assert.ok(map.adj[b].includes(a))));
    assert.ok(bruteColorable(map, lv.k), lv.id + ' 用 ' + lv.k + ' 色涂不完');
    assert.ok(!bruteColorable(map, lv.k - 1), lv.id + ' 用 ' + (lv.k - 1) + ' 色就够');
    assert.strictEqual(G.chromaticNumber(map), lv.k);
    assert.ok(map.regions.length <= 12, '提示要枚举所有涂法，国家别太多');
  });
});

test('涂地图提示：从任何乱涂的状态出发，一直照提示改，最后一定涂对', () => {
  const rand = rng(4);
  G.COLOR.forEach((lv) => {
    const map = G.parseMap(lv.map), n = map.regions.length;
    for (let k = 0; k < 30; k++) {
      const colors = [...Array(n)].map(() => (rand() < 0.3 ? null : Math.floor(rand() * lv.k)));
      const locked = colors.map(() => false);
      for (let s = 0; s <= n; s++) {
        const h = G.colorHint(map, lv.k, colors, locked);
        if (!h) break;
        assert.ok(!locked[h.region], '提示改了已确定的国家');
        colors[h.region] = h.color; locked[h.region] = true;
      }
      assert.ok(G.isSolved(map, colors, lv.k), lv.id + ' ' + JSON.stringify(colors));
    }
  });
});

test('撞色检测', () => {
  const map = G.parseMap(['AABB', 'CCDD']);
  const [A, B] = [0, 1];
  assert.ok(map.adj[A].includes(B));
  const col = map.regions.map(() => 0);
  assert.ok(G.conflicts(map, col).length > 0);
  assert.ok(!G.isSolved(map, col, 4));
  assert.deepStrictEqual(G.conflicts(map, map.regions.map(() => null)), []);
});

console.log(passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
