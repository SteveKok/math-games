/*
 * 涂立方体：界面。规则全在 MG.Cube（cube-logic.js）。
 * 立方体用 CSS 3D 画：六个面是 div，整体朝向用一个 3×3 旋转矩阵记着。
 */
(function (root) {
  'use strict';
  var MG = root.MG, C = MG.Cube, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = C.LEVELS.length - 1;
  var FACE_CSS = ['rotateX(90deg)', 'rotateX(-90deg)', '', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateY(90deg)'];   // U D F B L R
  var PAL2 = ['#ffffff', '#2fb67c'];   // 没涂、绿色

  /* ---------- 进度 ---------- */
  var KEY = 'mg.cube.v1';
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
    var ch = C.chapterOf(C.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (C.chapterOf(C.LEVELS[i]) === ch) n++;
    return n;
  }
  function locked() { return state.done || state.revealed || state.review; }
  function palette() { return PAL2; }

  /* ---------- 朝向（3×3 旋转矩阵） ---------- */
  function mul(a, b) {
    var r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) for (var k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
    return r;
  }
  function rx(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function ry(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  // 观看角度固定（从右上方看），立方体本身的朝向 base 只会是 24 种「摆正」的朝向之一
  var VIEW = mul(rx(-24), ry(-34));
  function transpose(m) { return [0, 1, 2].map(function (i) { return [0, 1, 2].map(function (j) { return m[j][i]; }); }); }
  function identity() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  /** 把一个接近摆正的旋转矩阵对齐到最近的摆正朝向（每行只留一个 ±1） */
  function snap(m) {
    var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], used = {};
    for (var i = 0; i < 3; i++) {
      var best = -1;
      for (var j = 0; j < 3; j++) if (!used[j] && (best < 0 || Math.abs(m[i][j]) > Math.abs(m[i][best]))) best = j;
      used[best] = true;
      out[i][best] = m[i][best] < 0 ? -1 : 1;
    }
    return out;
  }
  function shown() { return mul(VIEW, state.base); }
  function cssMatrix(m) {
    return 'matrix3d(' + [m[0][0], m[1][0], m[2][0], 0, m[0][1], m[1][1], m[2][1], 0, m[0][2], m[1][2], m[2][2], 0, 0, 0, 0, 1]
      .map(function (v) { return Math.abs(v) < 1e-9 ? 0 : v.toFixed(6); }).join(',') + ')';
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = C.LEVELS[idx];
    state = { idx: idx, lv: lv, colors: [0, 0, 0, 0, 0, 0], base: identity(), orient: VIEW, found: [], flash: -1,
      fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('cubeLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'paint') return;
    if (!MG.prefs.get('cubeRules', false)) { MG.prefs.set('cubeRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('cbreadT');
    if (lv.key) return t(lv.key + 'Q');
    return lv.k === 'any' ? t('cbaskAny') : t('cbaskK', { k: lv.k });
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = lv.ch === 'think';
    $('level-title').textContent = lv.olympiad ? 'OMK 2018 · Muda A5'
      : lv.ch === 'read' ? t('cbchRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('cbpolySource');
      $('oly-q').textContent = t('cbpolyQ');
      $('oly-note').textContent = t('cbpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = lv.ch !== 'paint';
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('btn-collect').hidden = $('btn-done').hidden = !playing;
    $('btn-hint').hidden = think || !playing || state.fails < 2;
    $('btn-hint').classList.toggle('hint', !state.hintOn);
    // 看了提示还是做不出来：可以看答案，不会卡死
    $('btn-solution').hidden = !(playing && !think && state.hintOn && state.fails >= 3);
    $('btn-restart').hidden = !game || (think && state.revealed);
    $('card-ctrl').hidden = state.review || !(lv.ch === 'read' || think);
    $('btn-got').hidden = lv.ch !== 'read';
    $('btn-thint').hidden = $('btn-reveal').hidden = !think;
    $('btn-thint').setAttribute('aria-pressed', String(!!state.hintOn));
    $('btn-reveal').disabled = state.revealed;
    $('btn-cardnext').hidden = !(think && (state.revealed || state.done) && state.idx < LAST);
    $('review-ctrl').hidden = !state.review;
    $('rv-next').hidden = state.idx === LAST;
    if (lv.ch === 'read') return renderRead();
    if (!$('scene')) buildBoard();
    paintCube();
    paintCollection();
    renderReveal();
    paintStatus();
  }
  function buildBoard() {
    var faces = FACE_CSS.map(function (tr, f) {
      return '<div class="cface" data-f="' + f + '" style="transform:' + tr + ' translateZ(var(--half))" role="button" tabindex="0" aria-label="' + t('cbface') + '"></div>';
    }).join('');
    var arrow = function (dir, icon, key) { return '<button class="icon-btn turn ' + dir + '" data-turn="' + dir + '" aria-label="' + t(key) + '">' + MG.ICONS[icon] + '</button>'; };
    $('board').className = 'pboard cube-board';
    $('board').innerHTML = '<div class="cube-stage">' + arrow('up', 'up', 'cbup') +
      '<div class="cube-row">' + arrow('left', 'left', 'cbleft') +
      '<div class="scene" id="scene"><div class="cube3d" id="cube3d">' + faces + '</div></div>' +
      arrow('right', 'right', 'cbright') + '</div>' + arrow('down', 'down', 'cbdown') + '</div>' +
      '<div class="collection" id="collection"></div>';
  }
  /** 光照：每个面现在朝哪个方向，越朝向灯光越亮——转起来看得出哪面在前 */
  var NORMAL = [[0, -1, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0]];   // U D F B L R（CSS 坐标，y 向下）
  var LIGHT = (function () { var v = [-0.45, -0.75, 0.6], l = Math.hypot(v[0], v[1], v[2]); return v.map(function (x) { return x / l; }); })();
  function shade() {
    var m = state.orient;
    document.querySelectorAll('#cube3d .cface').forEach(function (el) {
      var n = NORMAL[+el.getAttribute('data-f')], w = [0, 1, 2].map(function (i) { return m[i][0] * n[0] + m[i][1] * n[1] + m[i][2] * n[2]; });
      var d = Math.max(0, w[0] * LIGHT[0] + w[1] * LIGHT[1] + w[2] * LIGHT[2]);
      el.style.filter = 'brightness(' + (0.7 + 0.3 * d).toFixed(3) + ')';
    });
  }
  function paintCube() {
    var pal = palette(state.lv);
    $('cube3d').style.transform = cssMatrix(state.orient);
    shade();
    document.querySelectorAll('#cube3d .cface').forEach(function (el) {
      var f = +el.getAttribute('data-f'), c = state.colors[f];
      el.style.background = pal[c];
      el.classList.toggle('painted', !!c);
    });
    $('scene').classList.toggle('locked', locked());
  }
  /** 一个立方体的展开图（十字形），收集册和说明页都用 */
  function netHtml(colors, pal, cls) {
    // 网格位置：上 (0,1)；左 (1,0) 前 (1,1) 右 (1,2) 后 (1,3)；下 (2,1)
    var pos = { 0: [0, 1], 4: [1, 0], 2: [1, 1], 5: [1, 2], 3: [1, 3], 1: [2, 1] };
    return '<div class="net' + (cls ? ' ' + cls : '') + '">' + [0, 1, 2, 3, 4, 5].map(function (f) {
      return '<span style="grid-row:' + (pos[f][0] + 1) + ';grid-column:' + (pos[f][1] + 1) + ';background:' + pal[colors[f]] + '"></span>';
    }).join('') + '</div>';
  }
  function paintCollection() {
    var lv = state.lv, pal = palette(lv);
    $('collection').innerHTML = '<h3>' + t('cbcollection') + ' · ' + state.found.length + '</h3><div class="nets">' +
      state.found.map(function (c, i) { return '<div class="net-item' + (i === state.flash ? ' flash' : '') + '"><small>' + (i + 1) + '</small>' + netHtml(c, pal) + '</div>'; }).join('') + '</div>';
  }
  function paintStatus() {
    var el = $('status');
    if (state.review) { el.textContent = state.solShown ? t(state.solShown) : ''; el.className = 'status info'; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.className = 'status soft';
    el.textContent = t('cbtap');
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('cballClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「伯恩赛德引理」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('cbreadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    var groups = [1, 2, 3, 4, 5, 6].map(function (k) {
      return '<div class="net-group"><b>' + k + '</b>' + C.classes({ k: k }).map(function (c) { return netHtml(c, PAL2, 'small'); }).join('') + '</div>';
    }).join('');
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + para(paras[0]) + '<div class="net-groups">' + groups + '</div>' + para(paras[1]) +
      MG.portrait('burnside') + paras.slice(2).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function turn(dir) {
    var r = dir === 'up' ? rx(90) : dir === 'down' ? rx(-90) : dir === 'left' ? ry(-90) : ry(90);
    state.base = snap(mul(r, state.base));
    state.orient = shown();
    MG.sound.play('tap');
    paintCube();
  }
  function tapFace(f) {
    if (locked()) return;
    state.colors[f] = 1 - state.colors[f];
    state.status = null; state.flash = -1;
    MG.sound.play(state.colors[f] ? 'tap' : 'untap');
    render();
  }
  function collect() {
    if (locked()) return;
    var lv = state.lv, c = state.colors;
    if (!C.allowed(lv, c)) {
      return fail(typeof lv.k === 'number' ? 'cbwrongK' : 'cbwrongAny', { k: lv.k, p: C.painted(c) });
    }
    var key = C.canonical(c), dup = state.found.findIndex(function (x) { return C.canonical(x) === key; });
    if (dup >= 0) {
      state.flash = dup;
      state.status = { key: 'cbsame', vars: { n: dup + 1 }, kind: 'warn' };
      MG.sound.play('untap');
      return render();
    }
    state.found.push(c.slice());
    state.flash = state.found.length - 1;
    state.status = { key: 'cbnew', vars: { n: state.found.length }, kind: 'info' };
    MG.sound.play('take');
    render();
  }
  function claimDone() {
    if (locked()) return;
    if (state.found.length === C.classes(state.lv).length) return win();
    fail('cbmissing');
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function win() {
    state.done = true; state.flash = -1;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    state.status = null;
    render();
    var lv = state.lv, pal = palette(lv);
    $('win-face').innerHTML = state.found.length ? '<div class="nets win-nets">' + state.found.map(function (c) { return netHtml(c, pal, 'small'); }).join('') + '</div>'
      : '';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('cballClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    state.found = C.classes(lv).map(function (c) { return c.slice(); });
    complete();
    MG.sound.play('hint');
    render();
    if (state.idx === LAST) { MG.sound.play('win'); MG.confetti('star'); }
  }
  /** 游戏关看答案：把一个答案摆上去；返回 false 表示这一关做不到 */
  function solve() {
    state.found = C.classes(state.lv).map(function (c) { return c.slice(); });
    return true;
  }
  /** 看了提示还是不会：摆出答案，提示和解释都打开；下一关打开，但这一关不算通过（没有星星） */
  function showSolution() {
    if (state.done || state.revealed) return;
    var can = solve();
    state.revealed = true; state.review = true; state.hintOn = true; state.status = null;
    state.solShown = can ? 'psolShown' : 'psolNope';
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
    MG.sound.play('hint');
    render();
    root.scrollTo(0, 0);
  }
  function lookAgain() {
    $('dlg-win').close();
    state.review = true; state.hintOn = true; state.status = null;
    render();
    root.scrollTo(0, 0);
  }

  /* ---------- 拖动转立方体；没怎么动就算点了一个面 ---------- */
  var drag = null;
  function onDown(e) {
    if (!$('scene') || !e.target.closest('#scene')) return;
    var face = e.target.closest('.cface');
    drag = { x: e.clientX, y: e.clientY, moved: 0, face: face ? +face.getAttribute('data-f') : -1, start: state.orient };
    $('scene').setPointerCapture(e.pointerId);
    $('cube3d').classList.add('dragging');
  }
  function onMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved < 6) return;
    state.orient = mul(mul(ry(dx * 0.6), rx(-dy * 0.6)), drag.start);
    $('cube3d').style.transform = cssMatrix(state.orient);
    shade();
  }
  function onUp() {
    if (!drag) return;
    var d = drag; drag = null;
    $('cube3d').classList.remove('dragging');
    if (d.moved < 6 && d.face >= 0) return tapFace(d.face);
    if (d.moved >= 6) {
      // 放手后对齐到最近的摆正朝向（还是从右上方看）
      state.base = snap(mul(transpose(VIEW), state.orient));
      state.orient = shown();
      paintCube();
    }
  }

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var mini = '<div class="mini-cube"><span class="mt"></span><span class="mf"></span><span class="mr"></span></div>';
    var art = ['<span class="pm-demo">' + MG.ICONS.left + MG.ICONS.right + '</span>', mini, netHtml([1, 0, 1, 0, 0, 0], PAL2, 'small')];
    $('rules-list').innerHTML = ['cbrules1', 'cbrules2', 'cbrules3'].map(function (k, i) {
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
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', function () { drag = null; });
    board.addEventListener('click', function (e) { var b = e.target.closest('[data-turn]'); if (b) turn(b.getAttribute('data-turn')); });
    board.addEventListener('keydown', function (e) {
      var f = e.target.closest && e.target.closest('.cface');
      if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapFace(+f.getAttribute('data-f')); }
    });
    $('btn-collect').addEventListener('click', collect);
    $('btn-done').addEventListener('click', claimDone);
    $('btn-hint').addEventListener('click', useHint);
    $('btn-solution').addEventListener('click', showSolution);
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
    root.addEventListener('mg:lang', function () { $('board').innerHTML = ''; render(); });
    startLevel(MG.prefs.get('cubeLevel', 0));
  }

  MG.cubeDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
