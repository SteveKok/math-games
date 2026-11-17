/*
 * 公平切蛋糕：界面。几何全在 MG.Cut（cut-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, C = MG.Cut, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = C.LEVELS.length - 1;
  var CAKE = '#f6c56f', CAKE_EDGE = '#1d2433', LEFT = '#7cc3ff', RIGHT = '#ff9fb0';

  /* ---------- 进度 ---------- */
  var KEY = 'mg.cut.v1';
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {} };
  function save() { MG.store.set(KEY, progress); }
  function complete() {
    progress.cleared[state.idx] = true;
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
  }

  var state = {};
  function isGame(lv) { return lv.ch !== 'read'; }
  function tol(lv) { return C.isEdge(lv) ? C.EDGE_TOL : C.FREE_TOL; }
  function numInChapter(idx) {
    var ch = C.chapterOf(C.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (C.chapterOf(C.LEVELS[i]) === ch) n++;
    return n;
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = C.LEVELS[idx];
    state = { idx: idx, lv: lv, lines: [], line: null, sel: -1, fails: 0, misses: 0, hintOn: false, done: false, revealed: false, status: null };
    MG.prefs.set('cutLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (!isGame(lv) || lv.ch === 'think') return;
    var mode = C.isEdge(lv) ? 'edge' : 'free', seen = 'cutRules_' + mode;
    if (!MG.prefs.get(seen, false)) { MG.prefs.set(seen, true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function render() {
    var lv = state.lv;
    $('level-title').textContent = lv.olympiad ? 'OMK 2016 · B1'
      : lv.ch === 'read' ? t('cchRead')
      : lv.ch === 'think' ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = lv.ch === 'free' ? t('caskFree') : lv.ch === 'pin' ? t('caskPin')
      : lv.ch === 'read' ? t('creadT') : lv.ch === 'think' ? t(lv.key + 'Q') : lv.olympiad ? t('caskRing')
      : lv.regions.length > 1 ? t('caskTwo') : t('caskEdge');
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('cpolySource');
      $('oly-q').textContent = t('cpolyQ');
      $('oly-note').textContent = t('cpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = !isGame(lv) || lv.ch === 'think';
    $('game-ctrl').hidden = !isGame(lv);
    $('btn-undo').hidden = !C.isEdge(lv);
    $('btn-undo').disabled = !state.lines.length || state.done;
    $('btn-hint').hidden = lv.ch === 'think' || state.done || !showHintButton();
    $('btn-hint').classList.toggle('hint', !state.hintOn);
    $('card-ctrl').hidden = !(lv.ch === 'read' || lv.ch === 'think');
    $('btn-got').hidden = lv.ch !== 'read';
    $('btn-thint').hidden = $('btn-reveal').hidden = lv.ch !== 'think';
    $('btn-thint').setAttribute('aria-pressed', String(!!state.hintOn));
    $('btn-reveal').disabled = state.revealed;
    $('btn-cardnext').hidden = !(lv.ch === 'think' && (state.revealed || state.done) && state.idx < LAST);
    if (lv.ch === 'read') return renderRead();
    $('board').className = 'pboard cut-board';
    if (!$('csvg')) $('board').innerHTML = '<svg id="csvg" class="csvg" viewBox="0 0 100 100" role="img"></svg>';
    drawBoard();
    renderReveal();
    paintStatus();
  }
  function showHintButton() {
    var lv = state.lv;
    if (C.isEdge(lv)) return state.misses >= (lv.solution ? lv.solution.length : 3) + 1;
    return state.fails >= 2;
  }

  function polyPath(pl) { return 'M' + pl.map(function (q) { return q[0].toFixed(3) + ' ' + q[1].toFixed(3); }).join('L') + 'Z'; }
  function regionPath(r) { return polyPath(r.outer) + (r.holes || []).map(polyPath).join(''); }
  var BIG = [[-20, -20], [120, -20], [120, 120], [-20, 120]];
  /** 直线延长到画布边缘的两个端点 */
  function ends(line) {
    var p = line.p, d = line.d, n = Math.hypot(d[0], d[1]);
    var u = [d[0] / n, d[1] / n];
    return [[p[0] - u[0] * 300, p[1] - u[1] * 300], [p[0] + u[0] * 300, p[1] + u[1] * 300]];
  }
  function lineEl(line, cls) {
    var e = ends(line);
    return '<line class="' + cls + '" x1="' + e[0][0].toFixed(2) + '" y1="' + e[0][1].toFixed(2) + '" x2="' + e[1][0].toFixed(2) + '" y2="' + e[1][1].toFixed(2) + '"/>';
  }

  /** 当前要显示「两边各占多少」的那条线 */
  function activeLine() {
    if (C.isEdge(state.lv)) return state.lines.length ? state.lines[state.lines.length - 1] : null;
    return state.line;
  }

  function drawBoard() {
    var lv = state.lv, line = activeLine(), fair = line && C.isFair(lv, line, tol(lv));
    var h = '<defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#ece4d0" stroke-width=".3"/></pattern>';
    if (line) {
      h += '<clipPath id="cl"><path d="' + polyPath(C.clipLeft(BIG, line)) + '"/></clipPath>' +
        '<clipPath id="cr"><path d="' + polyPath(C.clipLeft(BIG, C.flip(line))) + '"/></clipPath>';
    }
    h += '</defs><rect x="0" y="0" width="100" height="100" fill="url(#grid)"/>';
    lv.regions.forEach(function (r) {
      var d = regionPath(r);
      h += '<path d="' + d + '" fill="' + CAKE + '" fill-rule="evenodd"/>';
      if (line) {
        h += '<path d="' + d + '" fill="' + LEFT + '" fill-opacity=".75" fill-rule="evenodd" clip-path="url(#cl)"/>' +
          '<path d="' + d + '" fill="' + RIGHT + '" fill-opacity=".75" fill-rule="evenodd" clip-path="url(#cr)"/>';
      }
      h += '<path d="' + d + '" fill="none" stroke="' + CAKE_EDGE + '" stroke-width=".7" stroke-linejoin="round"/>';
      (r.holes || []).forEach(function (hole) { h += '<path d="' + polyPath(hole) + '" fill="#fff" fill-opacity=".9" stroke="' + CAKE_EDGE + '" stroke-width=".7"/>'; });
    });
    if (C.isEdge(lv)) {
      state.lines.forEach(function (l, i) {
        var last = i === state.lines.length - 1;
        h += lineEl(l, last && fair ? 'cut win' : last ? 'cut helper last' : 'cut helper');
      });
    } else if (line) {
      h += lineEl(line, fair ? 'cut win' : 'cut');
    }
    if (state.hintOn && lv.center && !C.isEdge(lv)) {
      h += '<circle class="hint-ring" cx="' + lv.center[0] + '" cy="' + lv.center[1] + '" r="3.2"/>';
    }
    (lv.pins || []).forEach(function (p) {
      h += '<g class="pin"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4" fill="#e63946" stroke="#1d2433" stroke-width=".6"/><circle cx="' + (p[0] - 0.7) + '" cy="' + (p[1] - 0.7) + '" r=".7" fill="#fff"/></g>';
    });
    if (C.isEdge(lv) && !state.done) {
      var pts = C.points(lv, state.lines);
      state.pts = pts;
      var glow = state.hintOn && lv.hintPts ? lv.hintPts : [];
      pts.forEach(function (q, i) {
        var g = glow.some(function (gq) { return Math.hypot(gq[0] - q[0], gq[1] - q[1]) < 1e-6; });
        h += '<circle class="pt' + (i === state.sel ? ' sel' : '') + (g ? ' glow' : '') + '" cx="' + q[0].toFixed(3) + '" cy="' + q[1].toFixed(3) + '" r="' + (i === state.sel ? 2 : 1.3) + '"/>';
      });
    }
    $('csvg').innerHTML = h;
  }

  function splitText(line) {
    return t('csides') + state.lv.regions.map(function (r) {
      var a = C.leftShare(r, line) * 100;
      return a.toFixed(1) + '% | ' + (100 - a).toFixed(1) + '%';
    }).join('  ·  ');
  }
  function paintStatus() {
    var lv = state.lv, el = $('status'), line = activeLine(), kind = '', text;
    if (state.status) { text = t(state.status.key); kind = state.status.kind; }
    else if (state.sel >= 0) text = t('cpicked');
    else if (line) text = splitText(line);
    else text = t(lv.ch === 'pin' ? 'cpinTap' : C.isEdge(lv) ? 'cedgeTap' : 'cfreeTap');
    if (state.status && line && state.status.withSplit) text = splitText(line) + ' — ' + text;
    el.textContent = text;
    el.className = 'status ' + kind;
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      if (state.hintOn || state.revealed) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (state.revealed) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('callClear') + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「过中心的一刀」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('creadB').split('\n');
    var rect = C.quad([50, 50], [36, 6], [-4, 24]);
    var line = { p: [50, 50], d: [Math.cos(0.5), Math.sin(0.5)] };
    var pairs = [[30, 44], [62, 34], [41, 63]];
    var svg = '<svg class="read-art" viewBox="0 0 100 100" aria-hidden="true"><defs>' +
      '<clipPath id="rl"><path d="' + polyPath(C.clipLeft(BIG, line)) + '"/></clipPath><clipPath id="rr"><path d="' + polyPath(C.clipLeft(BIG, C.flip(line))) + '"/></clipPath></defs>' +
      '<path d="' + polyPath(rect) + '" fill="' + LEFT + '" clip-path="url(#rl)"/><path d="' + polyPath(rect) + '" fill="' + RIGHT + '" clip-path="url(#rr)"/>' +
      '<path d="' + polyPath(rect) + '" fill="none" stroke="#1d2433" stroke-width=".8"/>' + lineEl(line, 'cut win') +
      pairs.map(function (q) {
        var o = [100 - q[0], 100 - q[1]];
        return '<line x1="' + q[0] + '" y1="' + q[1] + '" x2="' + o[0] + '" y2="' + o[1] + '" stroke="#1d2433" stroke-width=".5" stroke-dasharray="1.5 1.2"/>' +
          '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.8" fill="#8338ec"/><circle cx="' + o[0] + '" cy="' + o[1] + '" r="1.8" fill="#8338ec"/>';
      }).join('') +
      '<circle cx="50" cy="50" r="2.2" fill="#fff" stroke="#1d2433" stroke-width=".8"/></svg>';
    var h = '<div class="lesson"><figure class="portrait">' + svg + '<figcaption>' + t('cpairs') + '</figcaption></figure>' +
      paras.map(function (x) { return '<p class="lesson-text">' + x + '</p>'; }).join('') + '</div>';
    $('board').className = 'pboard read-board';
    $('board').innerHTML = h;
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 输入 ---------- */
  function svgPoint(e) {
    var svg = $('csvg'), pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  }
  var drag = null;
  function onDown(e) {
    var lv = state.lv;
    if (!$('csvg') || state.done || lv.ch === 'read' || state.revealed) return;
    var q = svgPoint(e);
    if (C.isEdge(lv)) { drag = { start: q }; return; }
    $('csvg').setPointerCapture(e.pointerId);
    state.status = null;
    if (lv.ch === 'pin') { drag = { pin: true }; aimPin(q); }
    else { drag = { a: q }; state.line = null; }
    render();
  }
  function aimPin(q) {
    var p = state.lv.pins[0];
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 2) state.line = { p: p, d: [q[0] - p[0], q[1] - p[1]] };
  }
  function onMove(e) {
    if (!drag || C.isEdge(state.lv)) return;
    var q = svgPoint(e);
    if (drag.pin) aimPin(q);
    else if (Math.hypot(q[0] - drag.a[0], q[1] - drag.a[1]) > 2) state.line = C.lineThrough(drag.a, q);
    drawBoard(); paintStatus();
  }
  function onUp(e) {
    if (!drag) return;
    var d = drag; drag = null;
    var lv = state.lv;
    if (C.isEdge(lv)) {
      var q = svgPoint(e);
      if (Math.hypot(q[0] - d.start[0], q[1] - d.start[1]) > 6) return;
      return tapPoint(q);
    }
    if (!state.line) return render();
    if (C.isFair(lv, state.line, tol(lv))) return win();
    state.fails++;
    MG.sound.play('untap');
    render();
  }
  function tapPoint(q) {
    var i = C.findPoint(state.pts || [], q, 5);
    if (i < 0) return;
    state.status = null;
    if (state.sel < 0) { state.sel = i; MG.sound.play('tap'); return render(); }
    if (state.sel === i) { state.sel = -1; MG.sound.play('untap'); return render(); }
    var line = C.lineThrough(state.pts[state.sel], state.pts[i]);
    state.sel = -1;
    if (state.lines.some(function (l) { return C.sameLine(l, line); })) { MG.sound.play('untap'); return render(); }
    state.lines.push(line);
    MG.sound.play('take');
    if (C.isFair(state.lv, line, tol(state.lv))) return win();
    state.misses++;
    var lv = state.lv;
    if (lv.pins && !lv.pins.every(function (p) { return C.onLine(line, p); }) &&
        lv.regions.every(function (r) { return Math.abs(C.leftShare(r, line) - 0.5) < 1e-9; })) {
      state.status = { key: 'cnotPin', kind: 'warn', withSplit: true };
    }
    render();
  }

  /* ---------- 胜利、提示、答案 ---------- */
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    render();
    var lv = state.lv;
    $('win-face').innerHTML = winFace();
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('callClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function winFace() {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M14 40 L50 22 L86 40 L86 74 L14 74 Z" fill="' + CAKE + '" stroke="#1d2433" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M14 40 L50 58 L86 40 M50 58 V74" fill="none" stroke="#1d2433" stroke-width="3"/><path d="M14 52 L50 70 L86 52" fill="none" stroke="#ff7ab6" stroke-width="4"/>' +
      '<path d="M50 6 V22" stroke="#e63946" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="6" r="3" fill="#ffb627"/></svg>';
  }
  function useHint() {
    state.hintOn = true;
    MG.sound.play('hint');
    state.status = { key: state.lv.hint, kind: 'info' };
    render();
  }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.sel = -1; state.status = null;
    state.lines = lv.solution.map(function (s) { return C.lineThrough(s[0], s[1]); });
    complete();
    MG.sound.play('hint');
    render();
    if (state.idx === LAST) { MG.sound.play('win'); MG.confetti('star'); }
  }

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var edge = C.isEdge(state.lv);
    var keys = edge ? ['crulesEdge1', 'crulesEdge2', 'crulesEdge3'] : ['crulesFree1', 'crulesFree2', 'crulesFree3'];
    var art = edge
      ? ['<svg viewBox="0 0 60 40"><line x1="4" y1="34" x2="56" y2="6" stroke="#1d2433" stroke-width="2"/><circle cx="14" cy="28.6" r="3.5" fill="#3a86ff"/><circle cx="46" cy="11.4" r="3.5" fill="#3a86ff"/></svg>',
         '<svg viewBox="0 0 60 40"><line x1="6" y1="6" x2="54" y2="34" stroke="#888" stroke-width="1.6"/><line x1="6" y1="34" x2="54" y2="6" stroke="#888" stroke-width="1.6"/><circle cx="30" cy="20" r="4" fill="#ffd23f" stroke="#1d2433" stroke-width="1.5"/></svg>',
         MG.ICONS.check]
      : ['<svg viewBox="0 0 60 40"><rect x="6" y="6" width="48" height="28" fill="' + CAKE + '" stroke="#1d2433" stroke-width="2"/><line x1="10" y1="38" x2="50" y2="2" stroke="#e63946" stroke-width="2.4"/></svg>',
         '<b>50%</b>', '<svg viewBox="0 0 60 40"><circle cx="30" cy="20" r="6" fill="#e63946" stroke="#1d2433" stroke-width="2"/></svg>'];
    $('rules-list').innerHTML = keys.map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    C.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      C.LEVELS.forEach(function (lv, i) {
        if (C.chapterOf(lv) !== ch.id) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (i > progress.unlocked ? ' disabled' : '') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
          (lv.olympiad ? MG.ICONS.trophy : lv.ch === 'read' ? MG.ICONS.book : lv.ch === 'think' ? numInChapter(i) : (i + 1)) +
          (progress.cleared[i] ? '<small>★</small>' : '') + '</button>';
      });
      h += '</div>';
    });
    $('levels-body').innerHTML = h;
    $('dlg-levels').showModal();
  }

  /* ---------- 事件 ---------- */
  function init() {
    MG.setupTopbar();
    var board = $('board');
    board.addEventListener('pointerdown', function (e) { if (e.target.closest('#csvg')) onDown(e); });
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', function () { drag = null; });
    $('btn-undo').addEventListener('click', function () {
      if (!state.lines.length || state.done) return;
      state.lines.pop(); state.sel = -1; state.status = null;
      MG.sound.play('untap'); render();
    });
    $('btn-restart').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('btn-hint').addEventListener('click', useHint);
    $('btn-rules').addEventListener('click', openRules);
    $('btn-levels').addEventListener('click', openLevels);
    $('btn-got').addEventListener('click', function () { complete(); MG.sound.play('tap'); startLevel(state.idx + 1); });
    $('btn-thint').addEventListener('click', function () { state.hintOn = !state.hintOn; MG.sound.play('hint'); render(); });
    $('btn-reveal').addEventListener('click', revealAnswer);
    $('btn-cardnext').addEventListener('click', function () { MG.sound.play('tap'); startLevel(state.idx + 1); });
    $('levels-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (b && !b.disabled) { $('dlg-levels').close(); startLevel(+b.getAttribute('data-lv')); }
    });
    $('win-again').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx); });
    $('win-next').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx + 1); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    root.addEventListener('mg:lang', function () { render(); });
    startLevel(MG.prefs.get('cutLevel', 0));
  }

  MG.cutDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
