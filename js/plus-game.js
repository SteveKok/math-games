/*
 * 加号游戏：界面。规则全在 MG.Plus（plus-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, Q = MG.Plus, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = Q.LEVELS.length - 1;

  /* ---------- 进度 ---------- */
  var KEY = 'mg.plus.v1';
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
    var ch = Q.chapterOf(Q.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (Q.chapterOf(Q.LEVELS[i]) === ch) n++;
    return n;
  }
  function locked() { return state.done || state.revealed || state.review; }
  /** 现在的放法：各种长度各几段、总和、加号数 */
  function current() {
    var lv = state.lv;
    if (lv.mode === 'row') {
      var blocks = Q.blocksFromGaps(lv.n, state.gaps);
      var ev = Q.evalBlocks(blocks), c = Q.countsOf(blocks);
      return { c: c, sum: ev.sum, pluses: ev.pluses, terms: ev.terms, ok: true, blocks: blocks };
    }
    var f = Q.fromCounts(lv.n, state.cnt[2], state.cnt[3], state.cnt[4]), e = Q.evaluate(f.c);
    return { c: f.c, sum: e.sum, pluses: e.pluses, terms: e.terms, ok: f.ok, ones: f.ones };
  }
  /** 「看答案」或计数转成一排时用：按 1111、111、11、1 的顺序排好，段与段之间放加号 */
  function gapsFromCounts(n, c2, c3, c4) {
    var gaps = [], lens = [];
    [[4, c4], [3, c3], [2, c2]].forEach(function (p) { for (var i = 0; i < p[1]; i++) lens.push(p[0]); });
    var used = lens.reduce(function (a, b) { return a + b; }, 0);
    for (var j = 0; j < n - used; j++) lens.push(1);
    lens.forEach(function (len, k) { for (var i = 0; i < len - 1; i++) gaps.push(false); if (k < lens.length - 1) gaps.push(true); });
    return gaps;
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = Q.LEVELS[idx];
    state = { idx: idx, lv: lv, gaps: lv.n ? new Array(lv.n - 1).fill(false) : [], cnt: [0, 0, 0, 0, 0],
      fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('plusLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'play') return;
    if (!MG.prefs.get('plusRules', false)) { MG.prefs.set('plusRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('qreadT');
    if (lv.key) return t(lv.key + 'Q');
    return t(lv.goal === 'max' ? 'qaskMax' : lv.goal === 'min' ? 'qaskMin' : 'qaskReach', { n: lv.n, s: lv.s });
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = lv.ch === 'think';
    $('level-title').textContent = lv.olympiad ? 'OMK 2018 · B3'
      : lv.ch === 'read' ? t('qchRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('qpolySource');
      $('oly-q').textContent = t('qpolyQ');
      $('oly-note').textContent = t('qpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = lv.ch !== 'play';
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('btn-check').hidden = !playing;
    // 「做不到！」从第 3 关起一直都在，免得一出现就等于告诉答案
    $('btn-impossible').hidden = !(playing && (state.idx >= 2));
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
    var cur = current();
    $('board').className = 'pboard plus-board';
    $('board').innerHTML = (lv.mode === 'row' ? rowHtml(cur) : countHtml(cur)) + summaryHtml(cur);
    renderReveal();
    paintStatus();
  }
  /** 一排 1：同一段的 1 用同一种底色；空隙是按钮，有加号就显示 + */
  function rowHtml(cur) {
    var lv = state.lv, h = '<div class="ones' + (locked() ? ' locked' : '') + '">', block = 0;
    for (var i = 0; i < lv.n; i++) {
      h += '<span class="one b' + (block % 2) + '">1</span>';
      if (i < lv.n - 1) {
        var on = state.gaps[i];
        h += '<button class="gap' + (on ? ' on' : '') + '" data-g="' + i + '" aria-pressed="' + on + '" aria-label="' + t('qgap', { n: i + 1 }) + '"' + (locked() ? ' disabled' : '') + '>' + (on ? '+' : '') + '</button>';
        if (on) block++;
      }
    }
    return h + '</div>';
  }
  /** 1 太多时：几个 1111、111、11 用 ▲ ▼ 决定 */
  function countHtml(cur) {
    var lv = state.lv, big = lv.n > 200;
    var rows = [4, 3, 2].map(function (k) {
      var v = state.cnt[k], dis = locked() ? ' disabled' : '';
      return '<div class="crow"><b class="rep">' + Q.repunit(k) + '</b><span class="times">×</span>' +
        (big ? '<button class="icon-btn small-txt" data-k="' + k + '" data-d="-10"' + dis + '>−10</button>' : '') +
        '<button class="icon-btn" data-k="' + k + '" data-d="-1"' + dis + (v ? '' : ' disabled') + '>' + MG.ICONS.minus + '</button>' +
        '<b class="cval">' + v + '</b>' +
        '<button class="icon-btn" data-k="' + k + '" data-d="1"' + dis + '>' + MG.ICONS.plus + '</button>' +
        (big ? '<button class="icon-btn small-txt" data-k="' + k + '" data-d="10"' + dis + '>+10</button>' : '') + '</div>';
    }).join('');
    return '<div class="counts">' + rows + '<div class="crow singles' + (cur.ok ? '' : ' bad') + '"><b class="rep">1</b><span class="times">×</span><b class="cval">' + cur.ones + '</b><span class="cnote">' + t('qsingles') + '</span></div></div>';
  }
  function summaryHtml(cur) {
    var lv = state.lv, parts = [];
    [4, 3, 2, 1].forEach(function (k) { if (cur.c[k] > 0) parts.push('<span class="piece">' + Q.repunit(k) + ' × ' + cur.c[k] + '</span>'); });
    var hit = cur.ok && cur.sum === lv.s;
    return '<div class="psum">' +
      '<div class="pieces">' + parts.join('<i>+</i>') + '</div>' +
      '<div class="meters"><div class="meter ' + (hit ? 'hit' : cur.sum > lv.s ? 'over' : '') + '"><span>' + t('qsum') + '</span><b>' + (cur.ok ? cur.sum : '—') + '</b><small>' + t('qtarget') + ' ' + lv.s + '</small></div>' +
      '<div class="meter"><span>' + t('qpluses') + '</span><b>' + (cur.ok ? cur.pluses : '—') + '</b></div></div></div>';
  }
  function paintStatus() {
    var el = $('status');
    if (state.review) { el.textContent = state.solShown ? t(state.solShown) : ''; el.className = 'status info'; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.className = 'status soft';
    el.textContent = t(state.lv.mode === 'row' ? 'qtap' : 'qcountTap');
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('qallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「9 的秘密」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('qreadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    var rows = [1, 2, 3, 4].map(function (k) {
      var extra = Q.repunit(k) - k;
      return '<tr><td><b>' + Q.repunit(k) + '</b></td><td>' + extra + (extra ? ' = 9 × ' + extra / 9 : '') + '</td><td>' + (k - 1) + '</td></tr>';
    }).join('');
    var table = '<table class="mod-table"><thead><tr><th>' + t('qtableLen') + '</th><th>' + t('qtableExtra') + '</th><th>' + t('qtableUse') + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    var demo = '<div class="ones locked demo">' + '1111+111+11+1+1'.split('+').map(function (p, i) {
      return p.split('').map(function () { return '<span class="one b' + (i % 2) + '">1</span>'; }).join('<span class="gap"></span>');
    }).join('<span class="gap on">+</span>') + '</div>';
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + para(paras[0]) + demo + para(paras[1]) + table + paras.slice(2).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function toggleGap(i) {
    if (locked()) return;
    state.gaps[i] = !state.gaps[i];
    state.status = null;
    MG.sound.play(state.gaps[i] ? 'tap' : 'untap');
    render();
  }
  function stepCount(k, d) {
    if (locked()) return;
    state.cnt[k] = Math.max(0, state.cnt[k] + d);
    state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    render();
  }
  function check() {
    if (locked()) return;
    var lv = state.lv, cur = current();
    if (!cur.ok) return fail('qtooMany', { n: lv.n });
    var j = Q.judge(lv, cur);
    if (j === 'ok') return win();
    if (j === 'sum') return fail('qnoSum', { a: cur.sum, s: lv.s });
    fail(j === 'more' ? 'qnoMore' : 'qnoFewer');
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function pressImpossible() {
    if (locked()) return;
    if (!Q.levelPossible(state.lv)) return win();
    fail('pcanDo');
  }
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    state.status = null;
    render();
    var lv = state.lv, cur = current(), ok = Q.levelPossible(lv);
    $('win-face').innerHTML = '<div class="win-plus"><b>' + (ok ? cur.sum : '?') + '</b><span>' + (ok ? t('qpluses') + ' ' + cur.pluses : '') + '</span></div>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('qallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    var sol = Q.levelPossible(lv) ? Q.solution(lv.n, lv.s, lv.goal) : null;
    if (sol) {
      if (lv.mode === 'row') state.gaps = gapsFromCounts(lv.n, sol[0], sol[1], sol[2]);
      else state.cnt = [0, 0, sol[0], sol[1], sol[2]];
    }
    complete();
    MG.sound.play('hint');
    render();
    if (state.idx === LAST) { MG.sound.play('win'); MG.confetti('star'); }
  }
  /** 游戏关看答案：把一个答案摆上去；返回 false 表示这一关做不到 */
  function solve() {
    var lv = state.lv, sol = Q.levelPossible(lv) ? Q.solution(lv.n, lv.s, lv.goal) : null;
    if (sol) {
      if (lv.mode === 'row') state.gaps = gapsFromCounts(lv.n, sol[0], sol[1], sol[2]);
      else state.cnt = [0, 0, sol[0], sol[1], sol[2]];
    }
    return !!sol;
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

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var demo = '<div class="ones locked demo"><span class="one b0">1</span><span class="gap"></span><span class="one b0">1</span><span class="gap on">+</span><span class="one b1">1</span></div>';
    var art = [demo, '<b>11 + 1 = 12</b>', MG.ICONS.check];
    $('rules-list').innerHTML = ['qrules1', 'qrules2', 'qrules3'].map(function (k, i) {
      return '<li><span class="rule-art' + (i === 0 ? ' wide' : '') + '">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    Q.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      Q.LEVELS.forEach(function (lv, i) {
        if (Q.chapterOf(lv) !== ch.id) return;
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
    $('board').addEventListener('click', function (e) {
      var g = e.target.closest('[data-g]');
      if (g && !g.disabled) return toggleGap(+g.getAttribute('data-g'));
      var k = e.target.closest('[data-k]');
      if (k && !k.disabled) stepCount(+k.getAttribute('data-k'), +k.getAttribute('data-d'));
    });
    $('btn-check').addEventListener('click', check);
    $('btn-impossible').addEventListener('click', pressImpossible);
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
    root.addEventListener('mg:lang', function () { render(); });
    startLevel(MG.prefs.get('plusLevel', 0));
  }

  MG.plusDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
