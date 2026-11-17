/*
 * 加一的秘密：界面。规则全在 MG.Digit（digit-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, D = MG.Digit, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = D.LEVELS.length - 1;

  /* ---------- 进度 ---------- */
  var KEY = 'mg.digit.v1';
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {} };
  function save() { MG.store.set(KEY, progress); }
  function complete() {
    progress.cleared[state.idx] = true;
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
  }

  var state = {};
  var FIRST_PRIME = D.LEVELS.findIndex(function (l) { return l.ch === 'prime'; });
  /** 能不能玩这一关：按顺序解锁；「数字和是质数」这一章是后来加的，第一关一直开着，之后按顺序 */
  function isOpen(i) {
    if (i <= progress.unlocked) return true;
    if (D.LEVELS[i].ch !== 'prime') return false;
    return i === FIRST_PRIME || !!progress.cleared[i - 1];
  }
  function numInChapter(idx) {
    var ch = D.chapterOf(D.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (D.chapterOf(D.LEVELS[i]) === ch) n++;
    return n;
  }
  function value() { return D.fromDigits(state.digits); }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, LAST));
    if (!isOpen(idx)) idx = Math.min(progress.unlocked, LAST);
    var lv = D.LEVELS[idx];
    state = { idx: idx, lv: lv, digits: D.toDigits(lv.start || 0), fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('digitLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'carry') return;
    if (!MG.prefs.get('digitRules', false)) { MG.prefs.set('digitRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('dreadT');
    if (lv.ch === 'think') return t(lv.key + 'Q');
    if (lv.kind === 'primeRun') return t(lv.k === 3 ? 'dask5' : 'dask6');
    return t(lv.kind === 'down' ? 'dask1' : lv.kind === 'drop' ? 'dask2' : lv.kind === 'diffMod' ? 'dask3' : 'dask4');
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read';
    $('level-title').textContent = lv.title ? lv.title : lv.olympiad ? 'OMK 2016 · B2'
      : lv.ch === 'read' ? t('dchRead')
      : lv.ch === 'think' ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      var pk = lv.poly || 'dpoly';   // 第二道真题（Muda B2）用自己的文字
      $('oly-source').textContent = t(pk + 'Source');
      $('oly-q').textContent = t(pk + 'Q');
      $('oly-note').textContent = t(pk + 'Note') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = !(lv.ch === 'carry' || lv.ch === 'prime');
    var playing = game && !state.done && !state.revealed;
    $('game-ctrl').hidden = !game || state.review;
    $('btn-check').hidden = !playing;
    $('btn-impossible').hidden = !(playing && lv.impossible);
    $('btn-hint').hidden = lv.ch === 'think' || !playing || state.fails < 2;
    $('btn-hint').classList.toggle('hint', !state.hintOn);
    $('btn-restart').hidden = !game || lv.ch === 'think' && state.revealed;
    $('card-ctrl').hidden = state.review || !(lv.ch === 'read' || lv.ch === 'think');
    $('btn-got').hidden = lv.ch !== 'read';
    $('btn-thint').hidden = $('btn-reveal').hidden = lv.ch !== 'think';
    $('btn-thint').setAttribute('aria-pressed', String(!!state.hintOn));
    $('btn-reveal').disabled = state.revealed;
    $('btn-cardnext').hidden = !(lv.ch === 'think' && (state.revealed || state.done) && state.idx < LAST);
    $('review-ctrl').hidden = !state.review;
    $('rv-next').hidden = state.idx === LAST;
    if (lv.ch === 'read') return renderRead();
    renderBoard();
    renderReveal();
    paintStatus();
  }

  /** 一行：N（或 N + 1）的各位数字相加 = 数字和，末尾的 9（或进位变出来的 0）标出来 */
  function sumRow(label, n, mark) {
    var s = String(n), ds = D.digitSum(n), B = D.trailingNines(value());
    var digits = s.split('').map(function (c, i) {
      var fromEnd = s.length - 1 - i, cls = '';
      if (mark === 'nine' && fromEnd < B) cls = 'nine';
      if (mark === 'zero' && fromEnd < B) cls = 'zero';
      if (mark === 'zero' && fromEnd === B) cls = 'plus';
      return '<span class="' + cls + '">' + c + '</span>';
    }).join('<i>+</i>');
    var m = state.lv.m, badge = '';
    if (m && state.lv.kind === 'both') {
      var ok = ds % m === 0;
      badge = '<span class="badge ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ ' : '✗ ') + t('dmult', { m: m }) + '</span>';
    }
    return '<div class="srow"><span class="slabel">' + label + ' = <b>' + n + '</b></span>' +
      '<span class="sdigits">' + digits + ' <i>=</i> <b>' + ds + '</b></span>' + badge + '</div>';
  }
  function renderBoard() {
    var n = value(), locked = state.done || state.revealed || state.review;
    var lead = true, h = '<div class="wheels' + (locked ? ' locked' : '') + '">';
    state.digits.forEach(function (d, i) {
      if (d !== 0) lead = false;
      h += '<div class="wheel' + (lead && i < D.WHEELS - 1 ? ' lead' : '') + '">' +
        '<button class="icon-btn wbtn" data-w="' + i + '" data-d="1" aria-label="' + t('dup', { n: i + 1 }) + '"' + (locked ? ' disabled' : '') + '>' + MG.ICONS.up + '</button>' +
        '<b class="dg">' + d + '</b>' +
        '<button class="icon-btn wbtn" data-w="' + i + '" data-d="-1" aria-label="' + t('ddown', { n: i + 1 }) + '"' + (locked ? ' disabled' : '') + '>' + MG.ICONS.down + '</button></div>';
    });
    h += '</div>';
    if (n > 0 && state.lv.kind === 'primeRun') {
      // 连续 k 个数，各自的数字和，是不是质数
      h += '<div class="sums">' + Array.from({ length: state.lv.k }, function (_, j) {
        var m = n + j, ds = D.digitSum(m), ok = D.isPrime(ds);
        return '<div class="srow"><span class="slabel"><b>' + m + '</b></span><span class="sdigits">' + String(m).split('').join('<i>+</i>') + ' <i>=</i> <b>' + ds + '</b></span>' +
          '<span class="badge ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ ' + t('dprime') : '✗ ' + t('dnotPrime')) + '</span></div>';
      }).join('') + '</div>';
    } else if (n > 0) {
      var c = D.change(n);
      h += '<div class="sums">' + sumRow('N', n, 'nine') + sumRow('N + 1', n + 1, 'zero') +
        '<p class="change ' + (c < 0 ? 'down' : 'up') + '"><span>' + t('dchange') + '</span> <b>' + (c > 0 ? '+' : '') + c + '</b></p></div>';
    }
    $('board').className = 'pboard digit-board';
    $('board').innerHTML = h;
  }
  function paintStatus() {
    var el = $('status');
    if (state.review || !state.status) { el.textContent = state.hintOn && state.lv.hint && !state.review ? t(state.lv.hint) : ''; el.className = 'status info'; return; }
    el.textContent = t(state.status.key, state.status.vars);
    el.className = 'status ' + state.status.kind;
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('dallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「高斯的同余」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('dreadB').split('\n');
    var para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    // 进位插画：49999 → 50000
    var carry = '<div class="carry-art"><div class="odo">' + '49999'.split('').map(function (c, i) { return '<span class="' + (i ? 'nine' : '') + '">' + c + '</span>'; }).join('') + '</div>' +
      '<span class="carry-arrow">+1 →</span><div class="odo">' + '50000'.split('').map(function (c, i) { return '<span class="' + (i ? 'zero' : 'plus') + '">' + c + '</span>'; }).join('') + '</div></div>' +
      '<p class="art-formula">4 + 9 + 9 + 9 + 9 = 40 → 5 + 0 + 0 + 0 + 0 = 5</p>';
    // 末尾 B 个 9：数字和少 9B − 1，除以 5 的余数
    var rows = [1, 2, 3, 4, 5].map(function (B) {
      var drop = 9 * B - 1;
      return '<tr' + (drop % 5 === 0 ? ' class="hit"' : '') + '><td>' + B + '</td><td>' + drop + '</td><td>' + (drop % 5) + '</td></tr>';
    }).join('');
    var table = '<table class="mod-table"><thead><tr><th>' + t('dtable') + ' B</th><th>' + t('dtableDrop') + ' 9B − 1</th><th>' + t('dtableRem') + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + MG.portrait('gauss') + para(paras[0]) + para(paras[1]) + carry + table +
      paras.slice(2).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 判定 ---------- */
  function spin(w, d) {
    if (state.done || state.revealed || state.review) return;
    state.digits[w] = (state.digits[w] + d + 10) % 10;
    state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    render();
  }
  function check() {
    var lv = state.lv, n = value();
    if (state.done || state.revealed) return;
    if (n === 0) return fail('dzero');
    if (D.check(lv, n)) return win();
    var c = D.change(n);
    if (lv.kind === 'down') return fail('dno1');
    if (lv.kind === 'both') return fail('dnoBoth', { a: D.digitSum(n), b: D.digitSum(n + 1), m: lv.m });
    if (lv.kind === 'primeRun') return fail('dnoRun', { c: D.primeCount(n, lv.k), need: lv.need });
    fail('dnoChange', { c: (c > 0 ? '+' : '') + c });
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function pressImpossible() {
    if (state.done || state.revealed) return;
    if (!D.levelPossible(state.lv)) return win();
    fail('pcanDo');
  }
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    render();
    var lv = state.lv;
    $('win-face').innerHTML = '<div class="odo big">' + String(value()).split('').map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('dallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() {
    state.hintOn = true;
    state.status = null;
    MG.sound.play('hint');
    render();
  }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    if (lv.example) state.digits = D.toDigits(lv.example);
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
    var art = ['<span class="pm-demo">' + MG.ICONS.up + MG.ICONS.down + '</span>', '<b>4+9=13</b>', MG.ICONS.check];
    $('rules-list').innerHTML = ['drules1', 'drules2', 'drules3'].map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    D.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      D.LEVELS.forEach(function (lv, i) {
        if (D.chapterOf(lv) !== ch.id) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (isOpen(i) ? '' : ' disabled') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
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
      var b = e.target.closest('[data-w]');
      if (b && !b.disabled) spin(+b.getAttribute('data-w'), +b.getAttribute('data-d'));
    });
    $('btn-check').addEventListener('click', check);
    $('btn-impossible').addEventListener('click', pressImpossible);
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
    // 首页「数字和是质数」的入口：digit.html#prime 直接进这一章
    startLevel(root.location.hash === '#prime' ? FIRST_PRIME : MG.prefs.get('digitLevel', 0));
  }

  MG.digitDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
