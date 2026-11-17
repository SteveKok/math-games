/*
 * 一笔画与涂地图：界面与交互。能不能画、怎么提示、几种颜色，全部来自 graph-logic.js。
 */
(function (root) {
  'use strict';
  var MG = root.MG, G = MG.Graph, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var NS = G.STROKE.length, NC = G.COLOR.length;

  /* ---------- 进度：两章各自解锁，两章一开始都能玩 ---------- */
  var PROGRESS_KEY = 'mg.graph.v1';
  var progress = MG.store.get(PROGRESS_KEY, null);
  if (!progress || typeof progress !== 'object') progress = {};
  var un = progress.unlocked && typeof progress.unlocked === 'object' ? progress.unlocked : {};
  progress.unlocked = {
    stroke: Math.min(Math.max(un.stroke | 0, 0), NS - 1),
    color: Math.min(Math.max(un.color | 0, 0), NC - 1)
  };
  progress.cleared = progress.cleared && typeof progress.cleared === 'object' ? progress.cleared : {};
  progress.allClear = progress.allClear && typeof progress.allClear === 'object' ? progress.allClear : {};
  function saveProgress() { MG.store.set(PROGRESS_KEY, progress); }

  function chapterOf(i) { return i < NS ? 'stroke' : 'color'; }
  function localIdx(i) { return i < NS ? i : i - NS; }
  function globalIdx(ch, j) { return ch === 'stroke' ? j : NS + j; }
  function isUnlocked(i) { return localIdx(i) <= progress.unlocked[chapterOf(i)]; }

  var state = {
    level: 0, kind: 'stroke', fails: 0, done: false, status: null,
    skin: MG.getGraphSkin(MG.prefs.get('graphSkin', 'paper')).id,
    // 一笔画
    used: [], order: [], trail: [], glasses: false, hint: null, dragging: false, trace: [],
    // 涂地图
    map: null, geo: null, colors: [], locked: [], brush: 0, painting: false, lastPainted: null, wasFullBad: false
  };

  function lv() { return G.LEVELS[state.level]; }
  function skin() { return MG.getGraphSkin(state.skin); }
  function current() { return state.trail.length ? state.trail[state.trail.length - 1] : null; }
  function f(n) { return Math.round(n * 100) / 100; }
  var svg = $('gsvg');

  function setStatus(key, vars, info) {
    state.status = key ? { key: key, vars: vars, info: info } : null;
    var el = $('status');
    el.textContent = key ? t(key, vars) : '';
    el.classList.toggle('info', !!info);
  }

  /* ================= 一笔画：绘制 ================= */
  var VIEW = '-6 -6 112 112', HIT = 11;

  function edgeCtrl(g, e) {
    var a = g.nodes[e[0]], b = g.nodes[e[1]], bend = e[2] || 0;
    if (!bend) return null;
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    return [(a[0] + b[0]) / 2 - dy / len * bend * 2, (a[1] + b[1]) / 2 + dx / len * bend * 2];
  }
  function edgePath(g, e) {
    var a = g.nodes[e[0]], b = g.nodes[e[1]], c = edgeCtrl(g, e);
    return 'M' + a[0] + ' ' + a[1] + (c ? ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' : ' L') + b[0] + ' ' + b[1];
  }
  function edgeSamples(g, e) {
    var a = g.nodes[e[0]], b = g.nodes[e[1]], c = edgeCtrl(g, e) || [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], out = [];
    for (var k = 0; k <= 12; k++) {
      var s = k / 12, u = 1 - s;
      out.push([u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]]);
    }
    return out;
  }

  function riverArt(sk) {
    // 一条河分成两股，中间是小岛（左）和东边的地（右）
    var land = function (x, w) {
      return '<rect x="' + x + '" y="36" width="' + w + '" height="28" rx="4" fill="' + sk.bg + '" stroke="' + sk.waterEdge + '" stroke-width="1"/>' +
        '<rect x="' + x + '" y="36" width="' + w + '" height="28" rx="4" fill="url(#gp)"/>';
    };
    return '<rect x="-6" y="25" width="112" height="50" fill="' + sk.water + '" stroke="' + sk.waterEdge + '" stroke-width="1"/>' +
      land(14, 45) + land(69, 40);
  }

  function renderStroke() {
    var g = lv(), sk = skin(), deg = G.degrees(g), E = g.edges.length, cur = current(), hint = state.hint || {};
    var h = '<defs><pattern id="gp" width="10" height="10" patternUnits="userSpaceOnUse">' +
      '<path d="M10 0H0V10" fill="none" stroke="' + sk.grid + '" stroke-width=".6"/></pattern></defs>' +
      '<rect x="-6" y="-6" width="112" height="112" fill="url(#gp)"/>';
    if (g.river) h += riverArt(sk);
    // 提示的线
    if (hint.edge != null) h += '<path class="ghint-edge" d="' + edgePath(g, g.edges[hint.edge]) + '" stroke="#ff8c1a" stroke-width="9" stroke-linecap="round" fill="none" opacity=".55"/>';
    // 还没画的线：点点虚线
    g.edges.forEach(function (e, i) {
      if (!state.used[i]) h += '<path d="' + edgePath(g, e) + '" stroke="' + sk.guide + '" stroke-width="3.4" stroke-dasharray="0.1 5.2" stroke-linecap="round" fill="none"/>';
    });
    // 画过的线：按顺序变色
    state.order.forEach(function (ei, k) {
      h += '<path d="' + edgePath(g, g.edges[ei]) + '" stroke="' + sk.trail(k, E) + '" stroke-width="4.6" stroke-linecap="round" fill="none"/>';
    });
    h += '<line id="rubber" x1="0" y1="0" x2="0" y2="0" stroke="' + sk.trail(state.order.length, E) + '" stroke-width="3" stroke-dasharray="3 3" stroke-linecap="round" visibility="hidden"/>';
    // 点
    var hintNodes = hint.nodes || [];
    g.nodes.forEach(function (p, i) {
      var r = state.glasses ? 7 : (g.river ? 6.5 : 5.2), odd = deg[i] % 2 === 1;
      var fill = i === cur ? sk.current : (state.glasses && odd ? '#ff8c1a' : sk.node);
      if (hintNodes.indexOf(i) >= 0) h += '<circle class="ghint" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r + 5) + '" fill="none" stroke="#ff8c1a" stroke-width="2.6"/>';
      if (state.trail.length && i === state.trail[0]) h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r + 2.8) + '" fill="none" stroke="' + sk.start + '" stroke-width="1.4"/>';
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + fill + '" stroke="' + (i === cur ? '#1d2433' : sk.ink) + '" stroke-width="2"/>';
      if (state.glasses) {
        h += '<text x="' + p[0] + '" y="' + (p[1] + 3) + '" text-anchor="middle" font-size="8.5" font-weight="800" fill="' +
          (i === cur ? '#1d2433' : odd ? '#fff' : sk.ink) + '">' + deg[i] + '</text>';
      }
    });
    svg.setAttribute('viewBox', VIEW);
    svg.innerHTML = h;
  }

  /* ================= 一笔画：操作 ================= */
  function toSvg(e) {
    var m = svg.getScreenCTM();
    if (!m) return [0, 0];
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var q = pt.matrixTransform(m.inverse());
    return [q.x, q.y];
  }
  function nodeAt(p) {
    var best = null, bd = HIT;
    lv().nodes.forEach(function (n, i) {
      var d = Math.hypot(n[0] - p[0], n[1] - p[1]);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function startAt(n) {
    state.trail = [n]; state.hint = null;
    setStatus(null);
    MG.sound.play('tap');
    renderAll();
  }
  /** 两点之间有好几条线（七桥）时，挑最贴近手指走过路线的那条 */
  function pickEdge(cands) {
    if (cands.length === 1 || !state.trace.length) return cands[0];
    var g = lv(), best = cands[0], bestCost = Infinity;
    cands.forEach(function (ei) {
      var pts = edgeSamples(g, g.edges[ei]), cost = 0;
      state.trace.forEach(function (p) {
        var m = Infinity;
        pts.forEach(function (q) { m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])); });
        cost += m;
      });
      if (cost < bestCost) { bestCost = cost; best = ei; }
    });
    return best;
  }
  function traverse(n) {
    var g = lv(), cur = current();
    var cands = G.unusedEdgesBetween(g, state.used, cur, n);
    if (!cands.length) return;
    var ei = pickEdge(cands);
    state.used[ei] = true; state.order.push(ei); state.trail.push(n);
    state.hint = null; state.trace = [];
    setStatus(null);
    if (state.used.every(Boolean)) {
      state.done = true; renderAll();
      return win();
    }
    if (!G.hasMoveFrom(g, state.used, n)) {
      state.fails++;
      MG.sound.play('lose');
      setStatus('gstuck', { n: state.used.filter(function (u) { return !u; }).length });
    } else MG.sound.play('tap');
    renderAll();
  }
  function undo() {
    if (state.done) return;
    if (state.order.length) {
      state.used[state.order.pop()] = false;
      state.trail.pop();
    } else state.trail = [];
    state.hint = null;
    setStatus(null);
    MG.sound.play('untap');
    renderAll();
  }
  function sayImpossible() {
    if (state.done) return;
    if (!G.possible(lv())) {
      state.done = true; state.glasses = true; state.hint = null;
      renderAll();
      return win();
    }
    state.fails++;
    MG.sound.play('lose');
    setStatus('gcanDo');
    renderAll();
  }
  function strokeHint() {
    var g = lv(), cur = current();
    if (!G.possible(g)) {
      state.glasses = true; state.hint = { impossible: true };
      setStatus('ghintCount', null, true);
    } else if (cur == null) {
      state.hint = { nodes: G.goodStarts(g) };
      setStatus('ghintStart', null, true);
    } else if (G.canFinish(g, state.used, cur)) {
      var e = G.goodNextEdges(g, state.used, cur)[0], ed = g.edges[e];
      state.hint = { edge: e, nodes: [ed[0] === cur ? ed[1] : ed[0]] };
      setStatus('ghintNext', null, true);
    } else {
      state.hint = { undo: true };
      setStatus('ghintUndo', null, true);
    }
    MG.sound.play('hint');
    renderAll();
  }

  function strokeDown(e) {
    var g = lv(), p = toSvg(e), n = nodeAt(p), cur = current();
    if (cur == null) {
      if (n == null) return;
      startAt(n);
    } else if (n !== cur) {
      if (n != null && G.unusedEdgesBetween(g, state.used, cur, n).length) traverse(n);
      else {
        // 点了别处：提醒从亮着的点接着画
        if (!state.status) setStatus('gcontinue', null, true);
        return;
      }
    }
    state.dragging = true; state.trace = [];
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 有的浏览器不支持 */ }
  }
  function strokeMove(e) {
    if (!state.dragging || state.done) return;
    var p = toSvg(e), cur = current();
    state.trace.push(p);
    if (state.trace.length > 80) state.trace.shift();
    var n = nodeAt(p);
    if (n != null && n !== cur && G.unusedEdgesBetween(lv(), state.used, cur, n).length) traverse(n);
    var rb = $('rubber'), c = lv().nodes[current()];
    if (rb && c && !state.done) {
      rb.setAttribute('x1', c[0]); rb.setAttribute('y1', c[1]);
      rb.setAttribute('x2', f(p[0])); rb.setAttribute('y2', f(p[1]));
      rb.setAttribute('visibility', Math.hypot(p[0] - c[0], p[1] - c[1]) > 6 ? 'visible' : 'hidden');
    }
  }

  /* ================= 涂地图：绘制 ================= */
  var S = 10, W = S * Math.sqrt(3), PAD = 3;
  function cellCenter(c, r) { return [PAD + W * (c + 0.5 * (r & 1)) + W / 2, PAD + S + 1.5 * S * r]; }
  function pt(p) { return f(p[0]) + ' ' + f(p[1]); }

  function buildGeometry(map) {
    var polys = [], borders = [], coast = [];
    map.cells.forEach(function (cell, i) {
      var c = cellCenter(cell.c, cell.r), pts = [];
      for (var k = 0; k < 6; k++) {
        var a = (60 * k - 30) * Math.PI / 180;
        pts.push(pt([c[0] + (S + 0.35) * Math.cos(a), c[1] + (S + 0.35) * Math.sin(a)]));
      }
      polys.push(pts.join(' '));
      G.hexNeighbors(cell.c, cell.r).forEach(function (nb) {
        var j = map.at[nb[0] + ',' + nb[1]];
        if (j != null && j < i) return;            // 每条边只画一次
        if (j != null && map.cells[j].region === cell.region) return;
        var o = cellCenter(nb[0], nb[1]), th = Math.atan2(o[1] - c[1], o[0] - c[0]), d = Math.PI / 6;
        var seg = { p: [c[0] + S * Math.cos(th - d), c[1] + S * Math.sin(th - d)], q: [c[0] + S * Math.cos(th + d), c[1] + S * Math.sin(th + d)] };
        if (j == null) coast.push(seg);
        else { seg.a = cell.region; seg.b = map.cells[j].region; borders.push(seg); }
      });
    });
    // 每块国家找一个靠中间的格子放标记
    var marks = map.regions.map(function (reg) {
      var cs = reg.cells.map(function (i) { return cellCenter(map.cells[i].c, map.cells[i].r); });
      var mx = 0, my = 0;
      cs.forEach(function (p) { mx += p[0]; my += p[1]; });
      mx /= cs.length; my /= cs.length;
      return cs.reduce(function (b, p) { return Math.hypot(p[0] - mx, p[1] - my) < Math.hypot(b[0] - mx, b[1] - my) ? p : b; });
    });
    return {
      w: PAD * 2 + W * (map.cols + 0.5), h: PAD * 2 + S * 2 + 1.5 * S * (map.rows - 1),
      polys: polys, borders: borders, coast: coast, marks: marks
    };
  }

  function renderColor() {
    var map = state.map, geo = state.geo, sk = skin();
    var bad = {};
    G.conflicts(map, state.colors).forEach(function (p) { bad[p[0] + ',' + p[1]] = bad[p[1] + ',' + p[0]] = true; });
    var h = '<rect x="0" y="0" width="' + f(geo.w) + '" height="' + f(geo.h) + '" rx="8" fill="' + sk.sea + '"/>';
    map.cells.forEach(function (cell, i) {
      var c = state.colors[cell.region], fill = c == null ? sk.land : sk.colors[c];
      h += '<polygon class="cell" data-r="' + cell.region + '" points="' + geo.polys[i] + '" fill="' + fill + '" stroke="' + fill + '" stroke-width=".5"/>';
    });
    var normal = '', clash = '', coast = '';
    geo.borders.forEach(function (s) {
      var d = 'M' + pt(s.p) + 'L' + pt(s.q);
      if (bad[s.a + ',' + s.b]) clash += d; else normal += d;
    });
    geo.coast.forEach(function (s) { coast += 'M' + pt(s.p) + 'L' + pt(s.q); });
    h += '<path d="' + normal + '" stroke="' + sk.border + '" stroke-width="1.3" stroke-linecap="round" fill="none"/>';
    h += '<path d="' + coast + '" stroke="' + sk.border + '" stroke-width="2.2" stroke-linecap="round" fill="none"/>';
    if (clash) {
      h += '<path d="' + clash + '" stroke="#ffd23f" stroke-width="4.4" stroke-linecap="round" fill="none"/>' +
        '<path class="clash" d="' + clash + '" stroke="#1d2433" stroke-width="4.4" stroke-dasharray="2.2 2.2" fill="none"/>';
    }
    // 提示确定下来的国家：一个小勾
    state.locked.forEach(function (l, r) {
      if (!l) return;
      var p = geo.marks[r];
      h += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="4.2" fill="#fff" stroke="#1d2433" stroke-width="1.2"/>' +
        '<path d="M' + f(p[0] - 2.2) + ' ' + f(p[1] + 0.1) + ' l1.6 1.7 l3 -3.4" fill="none" stroke="#13a36b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    svg.setAttribute('viewBox', '0 0 ' + f(geo.w) + ' ' + f(geo.h));
    svg.innerHTML = h;
  }

  function renderPalette() {
    var pal = $('palette'), sk = skin(), k = lv().k, h = '';
    for (var c = 0; c < k; c++) {
      h += '<button class="pot" data-c="' + c + '" aria-pressed="' + (state.brush === c) + '" aria-label="' + t('ccolor' + c) + '" title="' + t('ccolor' + c) + '" style="--c:' + sk.colors[c] + '"><span></span></button>';
    }
    h += '<button class="pot eraser" data-c="-1" aria-pressed="' + (state.brush === -1) + '" aria-label="' + t('ceraser') + '" title="' + t('ceraser') + '">' + MG.ICONS.eraser + '</button>';
    pal.innerHTML = h;
    pal.setAttribute('aria-label', t('cpalette'));
  }

  /* ================= 涂地图：操作 ================= */
  function regionAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var cell = el && el.closest ? el.closest('.cell') : null;
    return cell ? +cell.getAttribute('data-r') : null;
  }
  function paint(r) {
    if (state.done || r == null) return;
    state.lastPainted = r;
    if (state.locked[r]) return;
    var c = state.brush < 0 ? null : state.brush;
    if (state.colors[r] === c) return;
    state.colors[r] = c;
    MG.sound.play(c == null ? 'untap' : 'tap');
    afterPaint();
  }
  function afterPaint() {
    var conf = G.conflicts(state.map, state.colors);
    var full = state.colors.every(function (c) { return c != null; });
    if (full && !conf.length) {
      state.done = true; setStatus(null); renderAll();
      return win();
    }
    var fullBad = full && conf.length > 0;
    if (fullBad && !state.wasFullBad) { state.fails++; MG.sound.play('lose'); }
    state.wasFullBad = fullBad;
    if (conf.length) setStatus(conf.length === 1 ? 'cclashOne' : 'cclash', { n: conf.length });
    else if (state.status && !state.status.info) setStatus(null);
    renderAll();
  }
  function colorHint() {
    var h = G.colorHint(state.map, lv().k, state.colors, state.locked);
    if (!h) return;
    state.colors[h.region] = h.color; state.locked[h.region] = true;
    MG.sound.play('hint');
    afterPaint();
    // 没有撞色时才说「我帮你涂好了一个」，有撞色时撞色的提醒更有用
    if (!state.done && !G.conflicts(state.map, state.colors).length) setStatus('chintUsed', null, true);
  }

  /* ================= 共用 ================= */
  function renderAll() {
    if (state.kind === 'stroke') renderStroke(); else renderColor();
    paintChrome();
  }

  function paintChrome() {
    var stroke = state.kind === 'stroke', i = state.level, l = lv();
    var showNope = stroke && i >= G.IMPOSSIBLE_FROM;
    $('level-title').textContent = t(stroke ? 'glevelS' : 'glevelC', { n: localIdx(i) + 1 });
    $('ask').textContent = t(stroke ? 'gaskS' : 'gaskC', { k: l.k });
    $('btn-skin').innerHTML = MG.graphSkinIcon(skin());
    $('gboard').className = 'gboard ' + state.kind + ' skin-' + state.skin;
    $('gboard').style.background = skin().bg;
    svg.setAttribute('aria-label', t(stroke ? 'gaskS' : 'gaskC', { k: l.k }));
    $('palette').hidden = stroke;
    if (!stroke) renderPalette();
    $('btn-undo').hidden = !stroke;
    $('btn-count').hidden = !showNope;
    $('btn-count').setAttribute('aria-pressed', String(state.glasses));
    $('btn-impossible').hidden = !showNope;
    $('btn-hint').hidden = state.fails < 2 || state.done;
    var hint = state.hint || {};
    $('btn-undo').classList.toggle('hint', !!hint.undo);
    $('btn-impossible').classList.toggle('hint', !!hint.impossible);
    $('btn-impossible').disabled = state.done;
  }

  function startLevel(i) {
    state.level = i; MG.prefs.set('graphLevel', i);
    var l = lv();
    state.kind = l.kind; state.fails = 0; state.done = false; state.hint = null;
    state.dragging = false; state.painting = false;
    setStatus(null);
    if (l.kind === 'stroke') {
      state.used = l.edges.map(function () { return false; });
      state.order = []; state.trail = []; state.glasses = false;
    } else {
      state.map = G.parseMap(l.map);
      state.geo = buildGeometry(state.map);
      state.colors = state.map.regions.map(function () { return null; });
      state.locked = state.colors.map(function () { return false; });
      state.brush = 0; state.wasFullBad = false; state.lastPainted = null;
    }
    renderAll();
    if (!MG.prefs.get(l.kind + 'RulesSeen', false)) openRules();
    else if (l.kind === 'stroke' && i === G.IMPOSSIBLE_FROM && !progress.cleared[i]) openRules();
  }

  function restart() {
    if (state.kind === 'stroke') {
      state.used = lv().edges.map(function () { return false; });
      state.order = []; state.trail = []; state.hint = null; state.done = false;
    } else {
      state.colors = state.colors.map(function (c, r) { return state.locked[r] ? c : null; });
      state.wasFullBad = false; state.done = false;
    }
    setStatus(null);
    MG.sound.play('untap');
    renderAll();
  }

  function win() {
    var i = state.level, ch = chapterOf(i), j = localIdx(i);
    var lastInCh = j === (ch === 'stroke' ? NS : NC) - 1;
    progress.cleared[i] = true;
    if (!lastInCh) progress.unlocked[ch] = Math.max(progress.unlocked[ch], j + 1);
    else progress.allClear[ch] = true;
    saveProgress();
    MG.sound.play('win');
    MG.confetti('star');
    setStatus(null);
    $('win-tip').textContent = t(lv().tip);
    $('win-face').innerHTML = ch === 'stroke' ? MG.graphSkinIcon(MG.getGraphSkin('paper'))
      : hexPair(MG.getGraphSkin('paper').colors[0], MG.getGraphSkin('paper').colors[1], false).replace('viewBox="0 0 60 44"', 'viewBox="6 6 48 32"');
    $('win-next').hidden = i === G.LEVELS.length - 1;
    $('win-math').hidden = !lastInCh;
    setTimeout(function () { openDialog('dlg-win'); }, MG.reducedMotion() ? 100 : 800);
  }

  /* ---------- 弹窗 ---------- */
  function openDialog(id) {
    var d = $(id);
    MG.i18n.apply(d);
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  }
  function closeDialog(id) {
    var d = $(id);
    if (d.close) { if (d.open) d.close(); } else d.removeAttribute('open');
  }
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDialog(d.id); });
  });

  function miniGraph(nodes, edges, traced) {
    var sk = MG.getGraphSkin('paper'), h = '<svg viewBox="0 0 60 44" aria-hidden="true">';
    edges.forEach(function (e, k) {
      var a = nodes[e[0]], b = nodes[e[1]];
      h += '<path d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + '" stroke="' + (k < traced ? sk.trail(k, edges.length) : sk.guide) + '" stroke-width="' + (k < traced ? 3.4 : 2.6) + '"' +
        (k < traced ? '' : ' stroke-dasharray="0.1 4"') + ' stroke-linecap="round" fill="none"/>';
    });
    nodes.forEach(function (p) { h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff" stroke="#1d2433" stroke-width="2"/>'; });
    return h + '</svg>';
  }
  function hexPair(c1, c2, clash) {
    var hx = function (cx, cy, fill) {
      var p = [];
      for (var k = 0; k < 6; k++) { var a = (60 * k - 30) * Math.PI / 180; p.push(f(cx + 11 * Math.cos(a)) + ' ' + f(cy + 11 * Math.sin(a))); }
      return '<polygon points="' + p.join(' ') + '" fill="' + fill + '" stroke="#1d2433" stroke-width="1.6"/>';
    };
    return '<svg viewBox="0 0 60 44" aria-hidden="true">' + hx(20.5, 22, c1) + hx(39.5, 22, c2) +
      (clash ? '<path d="M30 12.5 V31.5" stroke="#ffd23f" stroke-width="3.6"/><path d="M30 12.5 V31.5" stroke="#1d2433" stroke-width="3.6" stroke-dasharray="2.4 2.4"/>' : '') + '</svg>';
  }
  var MARK_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#13a36b"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var MARK_BAD = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ff5d73"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

  function openRules() {
    var tri = [[30, 6], [8, 38], [52, 38]], triE = [[0, 1], [1, 2], [2, 0]];
    var items;
    if (state.kind === 'stroke') {
      items = [
        ['grule1', miniGraph(tri, triE, 1)],
        ['grule2', miniGraph([[6, 22], [30, 22], [54, 22]], [[0, 1], [1, 2]], 2) + MARK_OK],
        ['grule3', miniGraph(tri, triE, 3) + MARK_OK]
      ];
      if (state.level >= G.IMPOSSIBLE_FROM) items.push(['grule4', '<span class="nope-demo">' + MG.ICONS.nope + '</span>']);
      $('rules-how').textContent = t('grulesHow');
    } else {
      var sk = MG.getGraphSkin('paper');
      items = [
        ['crule1', '<span class="pot-demo" style="--c:' + sk.colors[0] + '"></span><span class="pot-demo" style="--c:' + sk.colors[1] + '"></span>'],
        ['crule2', hexPair(sk.colors[1], sk.colors[1], true) + MARK_BAD],
        ['crule3', hexPair(sk.colors[0], sk.colors[1], false) + MARK_OK]
      ];
      $('rules-how').textContent = t('crulesHow');
    }
    $('rules-list').innerHTML = items.map(function (it) {
      return '<li><span class="rule-art g-art">' + it[1] + '</span><span>' + t(it[0]) + '</span></li>';
    }).join('');
    MG.prefs.set(state.kind + 'RulesSeen', true);
    openDialog('dlg-rules');
  }

  function openLevels() {
    var body = $('levels-body');
    body.innerHTML = '';
    [['stroke', 'gchapterS', NS], ['color', 'gchapterC', NC]].forEach(function (chap) {
      var hd = document.createElement('h3');
      hd.className = 'lv-chapter';
      hd.textContent = t(chap[1]);
      body.appendChild(hd);
      var grid = document.createElement('div');
      grid.className = 'levels-grid';
      for (var j = 0; j < chap[2]; j++) (function (j) {
        var i = globalIdx(chap[0], j), b = document.createElement('button');
        b.className = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.level ? ' current' : '');
        b.disabled = !isUnlocked(i);
        b.textContent = j + 1;
        b.setAttribute('aria-label', t(chap[0] === 'stroke' ? 'glevelS' : 'glevelC', { n: j + 1 }));
        b.addEventListener('click', function () { closeDialog('dlg-levels'); startLevel(i); });
        grid.appendChild(b);
      })(j);
      body.appendChild(grid);
    });
    var row = $('skin-row');
    row.innerHTML = '';
    MG.GRAPH_SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'skin-btn';
      b.setAttribute('aria-pressed', String(s.id === state.skin));
      b.innerHTML = MG.graphSkinIcon(s) + '<span>' + t(s.nameKey) + '</span>';
      b.addEventListener('click', function () { setSkin(s.id); openLevels(); });
      row.appendChild(b);
    });
    $('levels-math').hidden = !(progress.allClear.stroke || progress.allClear.color);
    openDialog('dlg-levels');
  }

  function openMath() {
    $('math-body').innerHTML = t('gmath');
    openDialog('dlg-math');
  }
  function setSkin(id) { state.skin = id; MG.prefs.set('graphSkin', id); renderAll(); }

  /* ---------- 事件 ---------- */
  svg.addEventListener('pointerdown', function (e) {
    if (state.done) return;
    e.preventDefault();
    if (state.kind === 'stroke') return strokeDown(e);
    state.painting = true; state.lastPainted = null;
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    paint(regionAt(e.clientX, e.clientY));
  });
  svg.addEventListener('pointermove', function (e) {
    if (state.kind === 'stroke') return strokeMove(e);
    if (!state.painting) return;
    var r = regionAt(e.clientX, e.clientY);
    if (r != null && r !== state.lastPainted) paint(r);
  });
  function up() {
    state.dragging = false; state.painting = false; state.lastPainted = null;
    var rb = $('rubber');
    if (rb) rb.setAttribute('visibility', 'hidden');
  }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);

  $('palette').addEventListener('click', function (e) {
    var b = e.target.closest('.pot');
    if (!b) return;
    state.brush = +b.dataset.c;
    MG.sound.play('tap');
    renderPalette();
  });
  $('btn-undo').addEventListener('click', undo);
  $('btn-restart').addEventListener('click', restart);
  $('btn-impossible').addEventListener('click', sayImpossible);
  $('btn-count').addEventListener('click', function () {
    state.glasses = !state.glasses;
    MG.sound.play(state.glasses ? 'tap' : 'untap');
    renderAll();
  });
  $('btn-hint').addEventListener('click', function () {
    if (state.done) return;
    if (state.kind === 'stroke') strokeHint(); else colorHint();
  });
  $('btn-rules').addEventListener('click', function () { MG.sound.play('tap'); openRules(); });
  $('btn-levels').addEventListener('click', openLevels);
  $('btn-skin').addEventListener('click', function () {
    var i = MG.GRAPH_SKINS.findIndex(function (s) { return s.id === state.skin; });
    setSkin(MG.GRAPH_SKINS[(i + 1) % MG.GRAPH_SKINS.length].id);
    MG.sound.play('tap');
  });
  $('levels-math').addEventListener('click', function () { closeDialog('dlg-levels'); openMath(); });
  $('win-again').addEventListener('click', function () { closeDialog('dlg-win'); });
  $('win-next').addEventListener('click', function () { var n = state.level + 1; state.done = false; closeDialog('dlg-win'); startLevel(n); });
  $('win-math').addEventListener('click', function () { closeDialog('dlg-win'); openMath(); });
  // 关掉通关弹窗（「再玩一次」或 Esc）：重新开始这一关
  $('dlg-win').addEventListener('close', function () { if (state.done) startLevel(state.level); });
  root.addEventListener('mg:lang', function () {
    renderAll();
    if (state.status) setStatus(state.status.key, state.status.vars, state.status.info);
  });

  $('win-face').innerHTML = MG.graphSkinIcon(MG.getGraphSkin('paper'));
  MG.setupTopbar();

  // 首页的两个入口：graph.html#stroke / graph.html#color
  var start = Math.min(Math.max(MG.prefs.get('graphLevel', 0) | 0, 0), G.LEVELS.length - 1);
  if (!isUnlocked(start)) start = globalIdx(chapterOf(start), progress.unlocked[chapterOf(start)]);
  var want = (root.location.hash || '').slice(1);
  if ((want === 'stroke' || want === 'color') && chapterOf(start) !== want) start = globalIdx(want, progress.unlocked[want]);
  startLevel(start);

  MG.graphDebug = { state: state, startLevel: startLevel, G: G };
})(window);
