/*
 * 字母转转乐：界面。规则全在 MG.Letter（letter-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, L = MG.Letter, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = L.LEVELS.length - 1;
  var LOOP_COLORS = ['#ff5d73', '#3a86ff', '#ffb627', '#2ec4b6', '#8338ec', '#13a36b'];

  /* ---------- 进度 ---------- */
  var KEY = 'mg.letter.v1';
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
    var ch = L.chapterOf(L.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (L.chapterOf(L.LEVELS[i]) === ch) n++;
    return n;
  }
  function locked() { return state.done || state.revealed || state.review; }
  /** 每个字母属于第几个圈（用来上色） */
  function loopIndex(lv) {
    var m = {};
    L.cycles(lv).forEach(function (c, i) { c.forEach(function (x) { m[x] = i; }); });
    return m;
  }
  function dayLabel(d) {
    var lv = state.lv;
    if (lv.august) return d === 0 ? t('ltjul31') : t('ltaug', { d: d });
    return t('ltday', { d: d });
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = L.LEVELS[idx];
    state = { idx: idx, lv: lv, day: 0, glasses: false, val: 1,
      fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('letterLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'play') return;
    if (!MG.prefs.get('letterRules', false)) { MG.prefs.set('letterRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('ltreadT');
    if (lv.key) return t(lv.key + 'Q');
    return lv.olympiad ? t('ltaskOly') : lv.mode === 'play' ? t('ltaskPlay') : t('ltaskPredict');
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = lv.ch === 'think', mode = lv.mode;
    $('level-title').textContent = lv.olympiad ? 'OMK 2017 · Muda A6'
      : lv.ch === 'read' ? t('ltchRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('ltpolySource');
      $('oly-q').textContent = t('ltpolyQ');
      $('oly-note').textContent = t('ltpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = lv.ch !== 'play';
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('btn-next').hidden = !playing || mode === 'number';
    $('btn-back').hidden = !playing || mode !== 'play';
    $('btn-glasses').hidden = !game || !lv.glasses || mode === 'number';
    $('btn-glasses').setAttribute('aria-pressed', String(!!state.glasses));
    $('count-ctrl').hidden = !playing || mode === 'play';
    $('btn-hint').hidden = think || !playing || state.fails < 2;
    $('btn-hint').classList.toggle('hint', !state.hintOn);
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
    $('board').className = 'pboard letter-board';
    $('board').innerHTML = mode === 'number' ? numberArt() : boardHtml();
    if (mode !== 'play') {
      $('n-val').textContent = state.val;
      $('btn-answer').lastChild.textContent = t(mode === 'number' ? 'ltanswerNum' : lv.august ? 'ltanswerAug' : 'ltanswer', { n: state.val });
    }
    renderReveal();
    paintStatus();
  }
  function tile(c, loops, cls) {
    var color = state.glasses || state.done || state.revealed || state.review ? LOOP_COLORS[loops[c] % LOOP_COLORS.length] : null;
    return '<span class="ltile' + (cls ? ' ' + cls : '') + '"' + (color ? ' style="background:' + color + ';color:#fff"' : '') + '>' + c + '</span>';
  }
  function boardHtml() {
    var lv = state.lv, loops = loopIndex(lv), letters = lv.letters.split('');
    // 规则卡：上面是原来的字母，下面是第二天换成的字母
    var rule = '<div class="rule-card"><b>' + t('ltrule') + '</b><div class="rule-grid" style="--n:' + letters.length + '">' +
      letters.map(function (c) { return tile(c, loops, 'small'); }).join('') +
      letters.map(function () { return '<i>↓</i>'; }).join('') +
      lv.images.split('').map(function (c) { return tile(c, loops, 'small'); }).join('') + '</div></div>';
    var shown = state.glasses || state.done || state.revealed || state.review;
    var loopsLine = shown ? '<p class="loops-line">' + t('ltloops', { list: L.cycles(lv).map(function (c) { return c.length; }).join(' · ') }) + '</p>' : '';
    // 今天的黑板，和前几天的记录
    var today = L.boardOn(lv, state.day);
    var hist = '';
    for (var d = state.day - 1; d >= Math.max(0, state.day - 6); d--) {
      hist += '<div class="hist-row"><small>' + dayLabel(d) + '</small><div class="hist-tiles">' + L.boardOn(lv, d).map(function (c) { return tile(c, loops, 'tiny'); }).join('') + '</div></div>';
    }
    return rule + '<div class="chalkboard"><small class="day-label">' + dayLabel(state.day) + '</small>' +
      '<div class="today" style="--n:' + letters.length + '">' + today.map(function (c) { return tile(c, loops); }).join('') + '</div></div>' +
      loopsLine + '<div class="history">' + hist + '</div>';   // 先留好位置，按钮不会跳来跳去
  }
  function numberArt() {
    var shown = state.done || state.revealed || state.review;
    var parts = shown ? [2, 3, 5] : [10];
    var k = 0, h = '<div class="split-art">';
    parts.forEach(function (p, i) {
      h += '<div class="split-group" style="border-color:' + (shown ? LOOP_COLORS[i] : '#9aa3b5') + '">';
      for (var j = 0; j < p; j++) h += '<span class="ltile small"' + (shown ? ' style="background:' + LOOP_COLORS[i] + ';color:#fff"' : '') + '>' + 'ABCDEFGHIJ'[k++] + '</span>';
      h += '</div>';
    });
    return h + '</div>' + (shown ? '<p class="loops-line">2 + 3 + 5 = 10 · 2 × 3 × 5 = 30</p>' : '');
  }
  function paintStatus() {
    var el = $('status');
    if (state.review) { el.textContent = ''; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.className = 'status soft';
    el.textContent = state.lv.mode === 'number' ? '' : t('ltstep');
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('ltallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「最小公倍数」：没有游戏的一页，画出奥数题的几个圈 --- */
  function loopDiagram(lv) {
    var cyc = L.cycles(lv), x = 8, parts = [], H = 86;
    cyc.forEach(function (c, i) {
      var k = c.length, r = k === 1 ? 0 : 10 + k * 3.5, cx = x + r + 10, cy = 40, color = LOOP_COLORS[i % LOOP_COLORS.length];
      var pts = c.map(function (_, j) { var a = -Math.PI / 2 + j * 2 * Math.PI / k; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
      var g = '';
      if (k === 1) g += '<circle cx="' + cx + '" cy="' + (cy - 14) + '" r="7" fill="none" stroke="' + color + '" stroke-width="1.6" marker-end="url(#arr' + i + ')"/>';
      else pts.forEach(function (p, j) {
        var q = pts[(j + 1) % k], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), s = 8.5 / len;
        g += '<line x1="' + (p[0] + dx * s).toFixed(1) + '" y1="' + (p[1] + dy * s).toFixed(1) + '" x2="' + (q[0] - dx * s).toFixed(1) + '" y2="' + (q[1] - dy * s).toFixed(1) + '" stroke="' + color + '" stroke-width="1.8" marker-end="url(#arr' + i + ')"/>';
      });
      pts.forEach(function (p, j) {
        g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="7" fill="' + color + '"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3.2).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">' + c[j] + '</text>';
      });
      g += '<text x="' + cx.toFixed(1) + '" y="' + (H - 2) + '" text-anchor="middle" font-size="8" font-weight="800" fill="#4a5468">' + k + '</text>';
      parts.push({ g: g, color: color, i: i });
      x = cx + r + 10;
    });
    var defs = '<defs>' + parts.map(function (p) {
      return '<marker id="arr' + p.i + '" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z" fill="' + p.color + '"/></marker>';
    }).join('') + '</defs>';
    return '<svg class="loop-diagram" viewBox="0 0 ' + (x + 6).toFixed(0) + ' ' + H + '" aria-hidden="true">' + defs + parts.map(function (p) { return p.g; }).join('') + '</svg>';
  }
  function renderRead() {
    var paras = t('ltreadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + para(paras[0]) + loopDiagram(L.LEVELS[L.OLYMPIAD]) + paras.slice(1).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function nextDay() {
    if (locked()) return;
    state.day++;
    state.status = null;
    MG.sound.play('take');
    render();
  }
  function claimBack() {
    if (locked()) return;
    var lv = state.lv, home = state.day > 0 && L.boardOn(lv, state.day).join('') === lv.letters;
    if (home && state.day === L.order(lv)) return win();
    fail(home ? 'ltearlier' : 'ltnotYet');
  }
  function answer() {
    if (locked()) return;
    var lv = state.lv, ans = L.answerOf(lv), n = state.val;
    if (n === ans) return win();
    if (lv.mode === 'number') return fail('ltwrongNum', { n: n });
    fail(n % ans === 0 ? 'ltearlier' : 'ltnoDay');
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
    var lv = state.lv, ans = L.answerOf(lv);
    $('win-face').innerHTML = '<div class="win-plus"><b>' + (lv.august ? t('ltaug', { d: ans }) : ans) + '</b></div>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('ltallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    state.val = L.answerOf(state.lv);
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
    var art = ['<span class="mini-rule"><b>A</b>→<b>B</b></span>', '<span class="pm-demo">' + MG.ICONS.next + MG.ICONS.glasses + '</span>', MG.ICONS.check];
    $('rules-list').innerHTML = ['ltrules1', 'ltrules2', 'ltrules3'].map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    L.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      L.LEVELS.forEach(function (lv, i) {
        if (L.chapterOf(lv) !== ch.id) return;
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
    $('btn-next').addEventListener('click', nextDay);
    $('btn-back').addEventListener('click', claimBack);
    $('btn-glasses').addEventListener('click', function () { state.glasses = !state.glasses; MG.sound.play('tap'); render(); });
    [['btn-m10', -10], ['btn-m1', -1], ['btn-p1', 1], ['btn-p10', 10]].forEach(function (p) {
      $(p[0]).addEventListener('click', function () {
        if (locked()) return;
        state.val = Math.max(1, state.val + p[1]); state.status = null;
        MG.sound.play(p[1] > 0 ? 'tap' : 'untap'); render();
      });
    });
    $('btn-answer').addEventListener('click', answer);
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
    startLevel(MG.prefs.get('letterLevel', 0));
  }

  MG.letterDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
