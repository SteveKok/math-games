/*
 * 一笔画与涂地图：纯逻辑（浏览器和 Node 共用，界面不在这里）。
 *
 * 一笔画：图 = 点 nodes [[x,y]...] + 线 edges [[a,b,bend]...]（bend ≠ 0 时画成弯线，允许两点之间有多条线）。
 *   能不能一笔画完，用欧拉定理判断：所有线连在一起，且「连着单数条线的点」只有 0 个或 2 个。
 *   测试里另有一个暴力搜索，独立验证这个判断。
 * 涂地图：六边形格子拼成的地图（每个字母一块国家，'.' 是海），相邻国家颜色不能一样。
 *   每关给的颜色数 = 这张地图最少需要的颜色数（程序算出来、测试验证）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.MG = root.MG || {}; root.MG.Graph = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================= 一笔画 ================= */

  function degrees(g) {
    var d = g.nodes.map(function () { return 0; });
    g.edges.forEach(function (e) { d[e[0]]++; d[e[1]]++; });
    return d;
  }
  function oddNodes(g) {
    return degrees(g).reduce(function (acc, v, i) { if (v % 2) acc.push(i); return acc; }, []);
  }

  /**
   * 还没走过的线（used[i] 为 false 的）能不能从 current 出发一笔走完？
   * current 为 null 表示还没选起点：问的是「有没有某个起点能走完」。
   */
  function canFinish(g, used, current) {
    var rest = [];
    g.edges.forEach(function (e, i) { if (!used[i]) rest.push(e); });
    if (!rest.length) return true;
    var n = g.nodes.length, deg = new Array(n).fill(0), adj = [];
    for (var k = 0; k < n; k++) adj.push([]);
    rest.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    // 剩下的线必须连成一片
    var startAt = current != null ? current : rest[0][0];
    if (!deg[startAt]) return false;
    var seen = new Array(n).fill(false), stack = [startAt];
    seen[startAt] = true;
    while (stack.length) {
      var v = stack.pop();
      adj[v].forEach(function (w) { if (!seen[w]) { seen[w] = true; stack.push(w); } });
    }
    for (var i = 0; i < n; i++) if (deg[i] && !seen[i]) return false;
    var odd = [];
    for (var j = 0; j < n; j++) if (deg[j] % 2) odd.push(j);
    if (odd.length === 0) return true;
    if (odd.length === 2) return current == null || odd.indexOf(current) >= 0;
    return false;
  }

  function possible(g) { return canFinish(g, g.edges.map(function () { return false; }), null); }

  /** 可以作为起点的点（能从这里出发一笔画完） */
  function goodStarts(g) {
    var none = g.edges.map(function () { return false; });
    var d = degrees(g);
    return g.nodes.map(function (_, i) { return i; }).filter(function (i) { return d[i] > 0 && canFinish(g, none, i); });
  }

  /** 从 current 出发、走了以后仍然能画完的线（Fleury 的思路） */
  function goodNextEdges(g, used, current) {
    var out = [];
    g.edges.forEach(function (e, i) {
      if (used[i] || (e[0] !== current && e[1] !== current)) return;
      var other = e[0] === current ? e[1] : e[0];
      var u2 = used.slice(); u2[i] = true;
      if (canFinish(g, u2, other)) out.push(i);
    });
    return out;
  }

  function unusedEdgesBetween(g, used, a, b) {
    var out = [];
    g.edges.forEach(function (e, i) {
      if (!used[i] && ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) out.push(i);
    });
    return out;
  }
  function hasMoveFrom(g, used, v) {
    return g.edges.some(function (e, i) { return !used[i] && (e[0] === v || e[1] === v); });
  }

  /* ================= 涂地图 ================= */

  // 六边形格子（尖顶朝上，奇数行向右错半格）
  function hexNeighbors(c, r) {
    return r % 2 === 0
      ? [[c + 1, r], [c - 1, r], [c, r - 1], [c - 1, r - 1], [c, r + 1], [c - 1, r + 1]]
      : [[c + 1, r], [c - 1, r], [c + 1, r - 1], [c, r - 1], [c + 1, r + 1], [c, r + 1]];
  }

  /** 把字符地图变成 { cells:[{c,r,region}], regions:[{key,cells:[idx]}], adj:[[...]], rows, cols } */
  function parseMap(rows) {
    var keys = [], cells = [], at = {};
    rows.forEach(function (line, r) {
      line.split('').forEach(function (ch, c) {
        if (ch === '.' || ch === ' ') return;
        var k = keys.indexOf(ch);
        if (k < 0) { keys.push(ch); k = keys.length - 1; }
        at[c + ',' + r] = cells.length;
        cells.push({ c: c, r: r, region: k });
      });
    });
    var regions = keys.map(function (key) { return { key: key, cells: [] }; });
    cells.forEach(function (cell, i) { regions[cell.region].cells.push(i); });
    var adjSet = regions.map(function () { return {}; });
    cells.forEach(function (cell) {
      hexNeighbors(cell.c, cell.r).forEach(function (nb) {
        var j = at[nb[0] + ',' + nb[1]];
        if (j == null) return;
        var o = cells[j].region;
        if (o !== cell.region) { adjSet[cell.region][o] = true; adjSet[o][cell.region] = true; }
      });
    });
    var adj = adjSet.map(function (s) { return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); });
    return {
      rows: rows.length, cols: Math.max.apply(null, rows.map(function (l) { return l.length; })),
      cells: cells, regions: regions, adj: adj, at: at
    };
  }

  /** 每块国家的格子是不是连成一片 */
  function regionsConnected(map) {
    return map.regions.every(function (reg) {
      var inReg = {}; reg.cells.forEach(function (i) { inReg[i] = true; });
      var seen = {}, stack = [reg.cells[0]], count = 0;
      seen[reg.cells[0]] = true;
      while (stack.length) {
        var i = stack.pop(); count++;
        var cell = map.cells[i];
        hexNeighbors(cell.c, cell.r).forEach(function (nb) {
          var j = map.at[nb[0] + ',' + nb[1]];
          if (j != null && inReg[j] && !seen[j]) { seen[j] = true; stack.push(j); }
        });
      }
      return count === reg.cells.length;
    });
  }

  /** 相邻且同色的国家对 [[a,b]...]（只算两块都涂了的） */
  function conflicts(map, colors) {
    var out = [];
    map.adj.forEach(function (list, a) {
      list.forEach(function (b) {
        if (a < b && colors[a] != null && colors[a] === colors[b]) out.push([a, b]);
      });
    });
    return out;
  }
  function isSolved(map, colors, k) {
    return colors.length === map.regions.length &&
      colors.every(function (c) { return c != null && c >= 0 && c < k; }) &&
      conflicts(map, colors).length === 0;
  }

  /** 用 k 种颜色的所有正确涂法（回溯；visit 返回 true 时提前停止） */
  function eachColoring(map, k, visit) {
    var n = map.regions.length, col = new Array(n).fill(null), stop = false;
    // 邻居多的先涂，剪枝更快
    var order = map.regions.map(function (_, i) { return i; })
      .sort(function (a, b) { return map.adj[b].length - map.adj[a].length; });
    (function rec(p) {
      if (stop) return;
      if (p === n) { if (visit(col.slice())) stop = true; return; }
      var v = order[p];
      for (var c = 0; c < k && !stop; c++) {
        if (map.adj[v].every(function (w) { return col[w] !== c; })) { col[v] = c; rec(p + 1); col[v] = null; }
      }
    })(0);
  }
  function colorable(map, k) {
    var ok = false;
    eachColoring(map, k, function () { ok = true; return true; });
    return ok;
  }
  function chromaticNumber(map) {
    for (var k = 1; k <= map.regions.length; k++) if (colorable(map, k)) return k;
    return map.regions.length;
  }

  /**
   * 提示：在所有正确涂法里找和孩子现在涂的最像的一种，然后挑一块不一样的国家告诉他。
   * locked 的国家必须保持不变。返回 { region, color } 或 null（已经全对）。
   */
  function colorHint(map, k, colors, locked) {
    var best = null, bestScore = -1;
    eachColoring(map, k, function (sol) {
      for (var i = 0; i < sol.length; i++) if (locked[i] && sol[i] !== colors[i]) return false;
      var score = 0;
      for (var j = 0; j < sol.length; j++) if (sol[j] === colors[j]) score++;
      if (score > bestScore) { bestScore = score; best = sol; }
      return score === sol.length;
    });
    if (!best) return null;
    // 优先改：撞色的 > 没涂的 > 其他；同等情况下挑邻居多的
    var bad = {};
    conflicts(map, colors).forEach(function (p) { bad[p[0]] = bad[p[1]] = true; });
    var pick = null, pickScore = -1;
    best.forEach(function (c, i) {
      if (c === colors[i]) return;
      var s = (bad[i] ? 200 : colors[i] == null ? 100 : 0) + map.adj[i].length;
      if (s > pickScore) { pickScore = s; pick = i; }
    });
    return pick == null ? null : { region: pick, color: best[pick] };
  }

  /* ================= 关卡 ================= */

  // 正五边形上的 5 个点
  function ring(n, cx, cy, rx, ry, rot) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = rot + i * Math.PI * 2 / n;
      out.push([Math.round((cx + Math.cos(a) * rx) * 10) / 10, Math.round((cy + Math.sin(a) * ry) * 10) / 10]);
    }
    return out;
  }
  var PENTA = ring(5, 50, 54, 40, 40, -Math.PI / 2);

  var STROKE = [
    { id: 'tri', nodes: [[50, 14], [14, 80], [86, 80]], edges: [[0, 1], [1, 2], [2, 0]], tip: 'gtip1' },
    { id: 'sqd', nodes: [[18, 18], [82, 18], [82, 82], [18, 82]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]], tip: 'gtip2' },
    { id: 'house', nodes: [[50, 8], [18, 40], [82, 40], [82, 92], [18, 92]],
      edges: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1]], tip: 'gtip3' },
    { id: 'envelope', nodes: [[50, 8], [18, 40], [82, 40], [82, 92], [18, 92]],
      edges: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1], [1, 3], [2, 4]], tip: 'gtip4' },
    { id: 'star', nodes: PENTA,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]], tip: 'gtip5' },
    { id: 'k4', nodes: [[18, 18], [82, 18], [82, 82], [18, 82]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]], tip: 'gtip6' },
    { id: 'glasses', nodes: [[6, 34], [38, 34], [38, 70], [6, 70], [62, 34], [94, 34], [94, 70], [62, 70]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [4, 5], [5, 6], [6, 7], [7, 4]], tip: 'gtip7' },
    { id: 'window', nodes: [[14, 14], [50, 14], [86, 14], [14, 50], [50, 50], [86, 50], [14, 86], [50, 86], [86, 86]],
      edges: [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]], tip: 'gtip8' },
    { id: 'triforce', nodes: [[50, 10], [29, 47], [71, 47], [8, 84], [50, 84], [92, 84]],
      edges: [[0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5]], tip: 'gtip9' },
    // 哥尼斯堡七桥：0 北岸、1 南岸、2 河心岛、3 东边的地
    { id: 'konigsberg', river: true, nodes: [[30, 10], [30, 90], [34, 50], [87, 50]],
      edges: [[0, 2, -11], [0, 2, 11], [1, 2, -11], [1, 2, 11], [2, 3], [0, 3, -9], [1, 3, 9]], tip: 'gtip10' }
  ];

  var COLOR = [
    { id: 'stripes', k: 2, tip: 'ctip1', map: [
      'AABBCCDD',
      'AABBCCDD',
      'AABBCCDD',
      'AABBCCDD'] },
    { id: 'lake4', k: 2, tip: 'ctip2', map: [
      '.AAABBB.',
      'AAA..BBB',
      'DD....CC',
      'DDD..CCC',
      '.DDDCCC.'] },
    { id: 'three', k: 3, tip: 'ctip3', map: [
      'AAAABBBB',
      'AAAABBBB',
      'AAACCBBB',
      'CCCCCCCC',
      'CCCCCCCC'] },
    { id: 'lake5', k: 3, tip: 'ctip4', map: [
      '.AAAABBB.',
      'EEA...BBB',
      'EE.....CC',
      'EEE...CCC',
      '.EEDDDDC.'] },
    { id: 'islands', k: 3, tip: 'ctip5', map: [
      'AAABBBCCCC',
      'AAABBBCCCC',
      'DDDEEEFFFF',
      'DDDEEEFFFF',
      'GGGGHHHHII',
      'GGGGHHHHII'] },
    { id: 'wheel', k: 4, tip: 'ctip6', map: [
      '..AAABBB..',
      '.AAAXXBBB.',
      'EEEXXXXCCC',
      '.EEXXXXCC.',
      '..EEDDDC..',
      '...DDDD...'] },
    { id: 'world', k: 4, tip: 'ctip7', map: [
      'AAAABBBCCC.',
      'AAABBBBCCCC',
      'DDAAEEEFFCC',
      'DDDEEEEFFFG',
      'DDHHEEJFFGG',
      'HHHHJJJJGGG',
      '.HHHJJJJGG.'] }
  ];

  var LEVELS = STROKE.map(function (g) { g.kind = 'stroke'; return g; })
    .concat(COLOR.map(function (m) { m.kind = 'color'; return m; }));
  LEVELS.forEach(function (lv, i) { lv.index = i; });
  // 「画不出来」按钮和数线眼镜从第一道画不出来的题开始出现
  var IMPOSSIBLE_FROM = STROKE.findIndex(function (g) { return !possible(g); });

  return {
    degrees: degrees, oddNodes: oddNodes, canFinish: canFinish, possible: possible,
    goodStarts: goodStarts, goodNextEdges: goodNextEdges, unusedEdgesBetween: unusedEdgesBetween, hasMoveFrom: hasMoveFrom,
    hexNeighbors: hexNeighbors, parseMap: parseMap, regionsConnected: regionsConnected,
    conflicts: conflicts, isSolved: isSolved, eachColoring: eachColoring, colorable: colorable,
    chromaticNumber: chromaticNumber, colorHint: colorHint,
    STROKE: STROKE, COLOR: COLOR, LEVELS: LEVELS, IMPOSSIBLE_FROM: IMPOSSIBLE_FROM
  };
});
