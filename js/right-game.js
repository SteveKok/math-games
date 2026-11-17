/*
 * 找直角：界面。规则全在 MG.Right（right-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, R = MG.Right, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = R.LEVELS.length - 1;
  var SIDES = ['DE', 'EF', 'FD'];

  /* ---------- 进度 ---------- */
  var KEY = 'mg.right.v1';
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {} };
  function save() { MG.store.set(KEY, progress); }
  function complete() {
    progress.cleared[state.idx] = true;
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
  }

  var state = {};
  function numInChapter(idx) {
    var ch = R.chapterOf(R.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (R.chapterOf(R.LEVELS[i]) === ch) n++;
    return n;
  }
  function isThink(lv) { return R.chapterOf(lv) === 'think'; }
  function locked() { return state.done || state.revealed || state.review; }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = R.LEVELS[idx];
    state = { idx: idx, lv: lv, phase: lv.ch, val: lv.start || 1, x: lv.start || 1, guess: {}, found: {}, sel: 'DE',
      fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('rightLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch === 'read' || isThink(lv)) return;
    if (!MG.prefs.get('rightRules', false)) { MG.prefs.set('rightRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('rreadT');
    if (lv.key) return t(lv.key + 'Q');
    if (lv.ch === 'pyth') return lv.find === 'b' ? t('raskB', { a: lv.a, c: lv.c }) : t('raskC', { a: lv.a, b: lv.b });
    return state.phase === 'lengths' ? t('raskLengths') : t('raskAngle');
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = isThink(lv);
    $('level-title').textContent = lv.olympiad ? 'OMK 2016 · Muda B1'
      : lv.ch === 'read' ? t('rchRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('rpolySource');
      $('oly-q').textContent = t('rpolyQ');
      $('oly-note').textContent = t('rpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = !game || think;
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('stepper').hidden = !playing;
    $('btn-check').hidden = !playing;
    $('btn-hint').hidden = think || !playing || state.fails < 2;
    $('btn-hint').classList.toggle('hint', !state.hintOn);
    $('btn-restart').hidden = !game || (think && state.revealed);
    $('side-chips').hidden = state.phase !== 'lengths' || state.review;
    $('card-ctrl').hidden = state.review || !(lv.ch === 'read' || think);
    $('btn-got').hidden = lv.ch !== 'read';
    $('btn-thint').hidden = $('btn-reveal').hidden = !think;
    $('btn-thint').setAttribute('aria-pressed', String(!!state.hintOn));
    $('btn-reveal').disabled = state.revealed;
    $('btn-cardnext').hidden = !(think && (state.revealed || state.done) && state.idx < LAST);
    $('review-ctrl').hidden = !state.review;
    $('rv-next').hidden = state.idx === LAST;
    if (lv.ch === 'read') return renderRead();
    paintStepper();
    paintChips();
    $('board').className = 'pboard right-board';
    $('board').innerHTML = lv.ch === 'pyth' ? pythSvg(lv, state.val) : angleSvg(lv, state.x);
    renderReveal();
    paintStatus();
  }
  function paintStepper() {
    var lv = state.lv, angle = state.phase === 'angle';
    var big = lv.ch === 'pyth' ? (lv.c || 0) > 20 || lv.b > 20 : angle ? lv.max > 20 : true;
    $('n-label').textContent = angle ? 'BF =' : state.phase === 'lengths' ? state.sel + ' =' : (lv.find === 'b' ? 'b =' : 'c =');
    $('n-val').textContent = state.val;
    $('btn-m10').hidden = $('btn-p10').hidden = !big;
    $('btn-m1').disabled = $('btn-m10').disabled = state.val <= 1;
    $('slider').hidden = !angle;
    if (angle) { $('slider').max = lv.max; $('slider').value = state.x; }
  }
  function paintChips() {
    if (state.phase !== 'lengths') return;
    $('side-chips').innerHTML = SIDES.map(function (k) {
      var f = state.found[k];
      return '<button class="chip side' + (k === state.sel ? ' sel' : '') + (f ? ' found' : '') + '" data-side="' + k + '"' + (f || locked() ? ' disabled' : '') + '>' +
        k + ' = ' + (f || '?') + '</button>';
    }).join('');
  }
  function paintStatus() {
    var el = $('status');
    if (state.review) { el.textContent = ''; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.className = 'status soft';
    el.textContent = state.phase === 'lengths' ? t('rpickSide') : '';
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (isThink(lv)) {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('rallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    if (state.phase === 'lengths' && SIDES.every(function (k) { return state.found[k]; })) {
      var v = SIDES.map(function (k) { return state.found[k]; });
      h = '<p class="reveal answer-box"><b>' + t('rperim', { a: v[0], b: v[1], c: v[2], p: v[0] + v[1] + v[2] }) + '</b></p>' + h;
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* ---------- 画图 ---------- */
  function pts(list) { return list.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function center(list) { var x = 0, y = 0; list.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / list.length, y / list.length]; }
  /** 网格线：在以 o 为角、边向量 u、v 的正方形里画 n × n 格 */
  function grid(o, u, v, n, sw) {
    var h = '';
    for (var i = 1; i < n; i++) {
      var k = i / n;
      h += '<line x1="' + (o[0] + u[0] * k) + '" y1="' + (o[1] + u[1] * k) + '" x2="' + (o[0] + u[0] * k + v[0]) + '" y2="' + (o[1] + u[1] * k + v[1]) + '"/>' +
        '<line x1="' + (o[0] + v[0] * k) + '" y1="' + (o[1] + v[1] * k) + '" x2="' + (o[0] + v[0] * k + u[0]) + '" y2="' + (o[1] + v[1] * k + u[1]) + '"/>';
    }
    return '<g stroke="#1d2433" stroke-opacity=".25" stroke-width="' + sw + '">' + h + '</g>';
  }
  /** 直角三角形 + 三边上的正方形；guess 是孩子现在猜的长度 */
  function pythSvg(lv, guess, solved) {
    var a = lv.a, b = lv.find === 'b' ? R.pythAnswer(lv) : lv.b, c = lv.find === 'c' ? R.pythAnswer(lv) : lv.c;
    solved = solved || state.done || state.revealed || state.review;
    var P = [0, 0], Q = [a, 0], Rr = [0, -b], n = [b, -a];
    var SA = [P, Q, [a, a], [0, a]], SB = [P, Rr, [-b, -b], [-b, 0]], SC = [Q, Rr, [Rr[0] + n[0], Rr[1] + n[1]], [Q[0] + n[0], Q[1] + n[1]]];
    var all = SA.concat(SB, SC), xs = all.map(function (p) { return p[0]; }), ys = all.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var span = Math.max(maxX - minX, maxY - minY), m = span * 0.06, sw = span * 0.006, fs = span * 0.065;
    var useGrid = Math.max(a, b, c) <= 13;
    var h = '<svg class="rsvg" viewBox="' + (minX - m) + ' ' + (minY - m) + ' ' + (maxX - minX + 2 * m) + ' ' + (maxY - minY + 2 * m) + '" role="img">';
    function square(sq, fill, label, unknown) {
      var out = '<polygon points="' + pts(sq) + '" fill="' + fill + '" stroke="#1d2433" stroke-width="' + sw * 1.4 + '"' + (unknown ? ' stroke-dasharray="' + sw * 4 + ' ' + sw * 3 + '" fill-opacity=".35"' : '') + '/>';
      var ctr = center(sq);
      return out + '<text x="' + ctr[0] + '" y="' + ctr[1] + '" font-size="' + fs + '" text-anchor="middle" dominant-baseline="central" font-weight="800" fill="#1d2433">' + label + '</text>';
    }
    var unknownC = lv.find === 'c' && !solved, unknownB = lv.find === 'b' && !solved;
    h += square(SA, '#ffd6dc', a + '² = ' + a * a);
    if (useGrid) h += grid(P, [a, 0], [0, a], a, sw);
    h += square(SB, '#cfe0ff', unknownB ? (!solved && guess ? '' : 'b² = ?') : b + '² = ' + b * b, unknownB);
    if (useGrid && !unknownB) h += grid(P, [0, -b], [-b, 0], b, sw);
    var guessing = !solved && guess;
    h += square(SC, '#c9f2dc', unknownC ? (guessing ? '' : 'c² = ?') : c + '² = ' + c * c, unknownC);
    if (useGrid && !unknownC) h += grid(Q, [Rr[0] - Q[0], Rr[1] - Q[1]], n, c, sw);
    // 孩子猜的正方形（虚线框里的半透明黄色）
    if (!solved && guess) {
      var k = guess / (lv.find === 'b' ? b : c), G;
      if (lv.find === 'b') G = [P, [0, -guess], [-guess, -guess], [-guess, 0]];
      else {
        var d = [Rr[0] - Q[0], Rr[1] - Q[1]];
        G = [Q, [Q[0] + d[0] * k, Q[1] + d[1] * k], [Q[0] + d[0] * k + n[0] * k, Q[1] + d[1] * k + n[1] * k], [Q[0] + n[0] * k, Q[1] + n[1] * k]];
      }
      var gc = center(G);
      h += '<polygon points="' + pts(G) + '" fill="#ffd23f" fill-opacity=".55" stroke="#b8860b" stroke-width="' + sw * 1.4 + '"/>' +
        '<text x="' + gc[0] + '" y="' + gc[1] + '" font-size="' + fs * 0.85 + '" text-anchor="middle" dominant-baseline="central" font-weight="800" fill="#7a5a00">' + guess + '² = ' + guess * guess + '</text>';
    }
    h += '<polygon points="' + pts([P, Q, Rr]) + '" fill="#fff" stroke="#1d2433" stroke-width="' + sw * 2 + '"/>' +
      '<path d="M' + sw * 8 + ' 0 V' + -sw * 8 + ' H0" fill="none" stroke="#1d2433" stroke-width="' + sw + '"/>';
    return h + '</svg>';
  }

  /** 长方形 ABCD 里的 E、F；x = BF */
  function angleSvg(lv, x, opts) {
    opts = opts || {};
    var g = R.geom(lv, x), W = g.W, right = R.isRight(lv, x);
    var lengthsMode = opts.lengths || state.phase === 'lengths';
    // 调 BF 时画布高度固定（不跳动）；找边长时只画到长方形底边
    var Hmax = lengthsMode ? g.H : (lv.max || x) + lv.FC;
    var m = W * 0.1, sw = W * 0.006, fs = W * 0.042;
    var h = '<svg class="rsvg angle" viewBox="' + (-m) + ' ' + (-m) + ' ' + (W + 2 * m) + ' ' + (Hmax + 2 * m) + '" role="img">';
    h += '<polygon points="' + pts([g.D, g.A, g.E]) + '" fill="#7cc3ff" fill-opacity=".55"/>' +
      '<polygon points="' + pts([g.E, g.B, g.F]) + '" fill="#ff9fb0" fill-opacity=".6"/>';
    h += '<rect x="0" y="0" width="' + W + '" height="' + g.H + '" fill="none" stroke="#1d2433" stroke-width="' + sw * 1.6 + '"/>';
    var found = opts.found || state.found || {}, lengths = opts.lengths || state.phase === 'lengths';
    var segs = { DE: [g.D, g.E], EF: [g.E, g.F], FD: [g.F, g.D] };
    SIDES.forEach(function (k) {
      var s = segs[k], sel = lengths && !opts.noSel && k === state.sel && !found[k];
      h += '<line x1="' + s[0][0] + '" y1="' + s[0][1] + '" x2="' + s[1][0] + '" y2="' + s[1][1] + '" stroke="' + (sel ? '#ff8c1a' : right ? '#e63946' : '#1d2433') + '" stroke-width="' + sw * (sel ? 3.4 : 2.2) + '" stroke-linecap="round"/>';
      if (lengths) {
        var mid = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];
        h += '<text x="' + mid[0] + '" y="' + mid[1] + '" font-size="' + fs * 1.05 + '" text-anchor="middle" dominant-baseline="central" font-weight="900" fill="#1d2433" stroke="#fff" stroke-width="' + sw * 3 + '" paint-order="stroke">' + k + ' = ' + (found[k] || '?') + '</text>';
        if (!opts.noSel && !found[k] && !locked()) h += '<line class="side-hit" data-side="' + k + '" x1="' + s[0][0] + '" y1="' + s[0][1] + '" x2="' + s[1][0] + '" y2="' + s[1][1] + '" stroke="transparent" stroke-width="' + W * 0.06 + '"/>';
      }
    });
    // ∠DEF：直角就画小方块，不然画弧和度数
    var ed = [g.D[0] - g.E[0], g.D[1] - g.E[1]], ef = [g.F[0] - g.E[0], g.F[1] - g.E[1]];
    var r = W * 0.06, u1 = norm(ed), u2 = norm(ef);
    if (right) {
      var p1 = [g.E[0] + u1[0] * r, g.E[1] + u1[1] * r], p2 = [g.E[0] + u2[0] * r, g.E[1] + u2[1] * r];
      h += '<path d="M' + p1 + ' L' + (p1[0] + u2[0] * r) + ',' + (p1[1] + u2[1] * r) + ' L' + p2 + '" fill="none" stroke="#e63946" stroke-width="' + sw * 1.6 + '"/>';
    } else {
      var a1 = [g.E[0] + u1[0] * r, g.E[1] + u1[1] * r], a2 = [g.E[0] + u2[0] * r, g.E[1] + u2[1] * r];
      h += '<path d="M' + a1 + ' A' + r + ' ' + r + ' 0 0 1 ' + a2 + '" fill="none" stroke="#1d2433" stroke-width="' + sw * 1.2 + '"/>';
    }
    if (!lengths) {
      var deg = R.angleDEF(lv, x);
      h += '<text x="' + g.E[0] + '" y="' + (g.E[1] + r * 2.4) + '" font-size="' + fs * 1.2 + '" text-anchor="middle" font-weight="900" fill="' + (right ? '#e63946' : '#1d2433') + '">' + (right ? '90°' : deg.toFixed(1) + '°') + '</text>';
    }
    // 点名
    var lab = { A: [-m * 0.45, -m * 0.3], B: [W + m * 0.45, -m * 0.3], C: [W + m * 0.45, g.H + m * 0.55], D: [-m * 0.45, g.H + m * 0.55], E: [lv.AE, -m * 0.35], F: [W + m * 0.45, x] };
    Object.keys(lab).forEach(function (k) {
      h += '<text x="' + lab[k][0] + '" y="' + lab[k][1] + '" font-size="' + fs * 1.15 + '" text-anchor="middle" dominant-baseline="central" font-weight="900" fill="#1d2433">' + k + '</text>';
    });
    // 已知长度
    function len(x0, y0, txt, anchor) {
      return '<text x="' + x0 + '" y="' + y0 + '" font-size="' + fs + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="central" font-weight="700" fill="#4a5468">' + txt + '</text>';
    }
    h += len(lv.AE / 2, m * 0.35, lv.AE) + len(lv.AE + lv.EB / 2, m * 0.35, lv.EB) +
      len(W - m * 0.2, x / 2, 'BF ' + x, 'end') + len(W - m * 0.2, x + lv.FC / 2, lv.FC, 'end') +
      len(-m * 0.15, g.H / 2, g.H, 'end');
    return h + '</svg>';
  }
  function norm(v) { var l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; }

  /* --- 毕达哥拉斯定理：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('rreadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    var b1 = R.LEVELS[R.OLYMPIAD];
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + MG.portrait('pythagoras') + para(paras[0]) +
      '<div class="read-fig">' + pythSvg({ a: 3, b: 4, find: 'c' }, 0, true) + '</div>' + para(paras[1]) +
      '<div class="read-fig">' + angleSvg(b1, 20, { lengths: true, found: { DE: 39, EF: 52, FD: 65 }, noSel: true }) + '</div>' +
      paras.slice(2).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function setVal(v) {
    if (locked()) return;
    var lv = state.lv, max = state.phase === 'angle' ? lv.max : 200;
    v = Math.max(1, Math.min(max, v));
    if (v === state.val) return;
    state.val = v;
    if (state.phase === 'angle') state.x = v;
    if (state.phase === 'lengths') state.guess[state.sel] = v;
    state.status = null;
    render();
  }
  function pickSide(k) {
    if (state.found[k] || locked()) return;
    state.sel = k;
    state.val = state.guess[k] || 1;
    state.status = null;
    MG.sound.play('tap');
    render();
  }
  function check() {
    if (locked()) return;
    var lv = state.lv, v = state.val;
    if (state.phase === 'pyth') {
      var ans = R.pythAnswer(lv);
      if (v === ans) return win();
      if (lv.find === 'b') return fail('rnoB', { c: lv.c, a: lv.a, s: lv.c * lv.c - lv.a * lv.a, g: v, g2: v * v });
      return fail('rnoC', { a: lv.a, b: lv.b, s: lv.a * lv.a + lv.b * lv.b, g: v, g2: v * v });
    }
    if (state.phase === 'angle') {
      if (!R.isRight(lv, v)) return fail('rnoAngle', { deg: R.angleDEF(lv, v).toFixed(1) });
      if (!lv.lengths) return win();
      state.phase = 'lengths'; state.sel = 'DE'; state.val = 1; state.fails = 0; state.hintOn = false;
      state.status = { key: 'rsameShape', kind: 'info' };
      MG.sound.play('hint');
      return render();
    }
    var s = R.sides(lv, state.x)[state.sel], len = R.sideLength(s);
    if (v !== len) return fail('rnoSide', { side: state.sel, l1: s.legs[0], l2: s.legs[1], s: len * len, g: v, g2: v * v });
    state.found[state.sel] = v;
    MG.sound.play('take');
    var next = SIDES.filter(function (k) { return !state.found[k]; })[0];
    if (!next) return win();
    state.sel = next; state.val = state.guess[next] || 1; state.status = null;
    render();
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    state.status = null;
    render();
    var lv = state.lv;
    $('win-face').innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="14,86 86,86 14,22" fill="#ffd23f" stroke="#1d2433" stroke-width="4" stroke-linejoin="round"/><path d="M14 72 H28 V86" fill="none" stroke="#e63946" stroke-width="4"/></svg>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('rallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    if (lv.ch === 'pyth') state.val = R.pythAnswer(lv);
    else {
      state.x = R.rightX(lv);
      if (lv.lengths) {
        state.phase = 'lengths';
        var sd = R.sides(lv, state.x);
        SIDES.forEach(function (k) { state.found[k] = R.sideLength(sd[k]); });
      }
    }
    complete();
    MG.sound.play('hint');
    render();
    if (state.idx === LAST) { MG.sound.play('win'); MG.confetti('star'); }
  }
  function lookAgain() {
    $('dlg-win').close();
    state.review = true; state.hintOn = true; state.status = null;
    render();
    root.scrollTo(0, 0);
  }

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var art = ['<span class="pm-demo">' + MG.ICONS.up + MG.ICONS.down + '</span>',
      '<svg viewBox="0 0 60 40"><rect x="22" y="4" width="16" height="16" fill="#cfe0ff" stroke="#1d2433" stroke-width="1.5"/><rect x="38" y="20" width="16" height="16" fill="#ffd6dc" stroke="#1d2433" stroke-width="1.5"/><polygon points="22,20 38,20 22,36" fill="#fff" stroke="#1d2433" stroke-width="2"/></svg>',
      MG.ICONS.check];
    $('rules-list').innerHTML = ['rrules1', 'rrules2', 'rrules3'].map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    R.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      R.LEVELS.forEach(function (lv, i) {
        if (R.chapterOf(lv) !== ch.id) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (i > progress.unlocked ? ' disabled' : '') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
          (lv.olympiad ? MG.ICONS.trophy : lv.ch === 'read' ? MG.ICONS.book : isThink(lv) ? numInChapter(i) : (i + 1)) +
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
    [['btn-m10', -10], ['btn-m1', -1], ['btn-p1', 1], ['btn-p10', 10]].forEach(function (p) {
      $(p[0]).addEventListener('click', function () { MG.sound.play(p[1] > 0 ? 'tap' : 'untap'); setVal(state.val + p[1]); });
    });
    $('slider').addEventListener('input', function () { setVal(+$('slider').value); });
    $('side-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-side]'); if (b && !b.disabled) pickSide(b.getAttribute('data-side')); });
    $('board').addEventListener('click', function (e) { var s = e.target.closest('[data-side]'); if (s) pickSide(s.getAttribute('data-side')); });
    $('btn-check').addEventListener('click', check);
    $('btn-hint').addEventListener('click', useHint);
    $('btn-restart').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
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
    $('win-look').addEventListener('click', lookAgain);
    $('dlg-win').addEventListener('cancel', function (e) { e.preventDefault(); lookAgain(); });
    $('win-next').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx + 1); });
    $('rv-again').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('rv-next').addEventListener('click', function () { MG.sound.play('tap'); startLevel(state.idx + 1); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    root.addEventListener('mg:lang', function () { render(); });
    startLevel(MG.prefs.get('rightLevel', 0));
  }

  MG.rightDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
