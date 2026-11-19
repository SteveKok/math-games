/*
 * 天平找相等：界面。规则全在 MG.Balance（balance-logic.js），图在 MG.BalanceArt（balance-art.js）。
 * balance.html#cover 直接打开分享封面上的那一题。
 */
(function (root) {
  'use strict';
  var MG = root.MG, B = MG.Balance, Art = MG.BalanceArt, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = B.LEVELS.length - 1;
  var GAME = 'balance';

  /** 记录给 analytics（没有 track.js 或没设定收集网址时什么都不做） */
  function track(name, props) {
    if (MG.track) MG.track(name, Object.assign({ game: GAME, level: state.idx + 1 }, props || {}));
  }
  function activeMs() { return MG.activeMs ? MG.activeMs() : Date.now(); }

  /* ---------- 进度 ---------- */
  var KEY = 'mg.balance.v1';
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {}, finished: false };
  function save() { MG.store.set(KEY, progress); }
  function complete() { progress.cleared[state.idx] = true; unlockNext(); }
  function unlockNext() {
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
  }
  function allCleared() { for (var i = 0; i <= LAST; i++) if (!progress.cleared[i]) return false; return true; }

  var state = { idx: 0 };
  function numInChapter(idx) {
    var ch = B.LEVELS[idx].ch, n = 0;
    for (var i = 0; i <= idx; i++) if (B.LEVELS[i].ch === ch) n++;
    return n;
  }
  function rightItems() { return B.repeat('M', state.n); }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx, force) {
    idx = Math.max(0, Math.min(idx, LAST));
    if (!force) idx = Math.min(idx, progress.unlocked);
    var lv = B.LEVELS[idx];
    state = { idx: idx, lv: lv, n: 0, fails: 0, attempts: 0, hintOn: false, done: false, revealed: false, review: false,
      released: lv.mode === 'live', status: null, t0: activeMs(), usedHint: false };
    MG.prefs.set('balanceLevel', idx);
    render();
    root.scrollTo(0, 0);
    track('level_start', { cover: !!lv.cover });
    if (lv.ch === 'learn' && !MG.prefs.get('balanceRules', false)) { MG.prefs.set('balanceRules', true); openRules(); }
  }

  /* ---------- 文字 ---------- */
  /** ['P','P'] → 「2 个黄梨」；['G','M'] → 「1 个番石榴和 1 个芒果」 */
  function describe(items) {
    var counts = {}, order = [];
    items.forEach(function (f) { if (!counts[f]) { counts[f] = 0; order.push(f); } counts[f]++; });
    return order.map(function (f) { return t('bcount', { n: counts[f], fruit: t('bf' + f + (counts[f] > 1 ? 'p' : '')) }); }).join(t('band'));
  }
  function ask(lv) {
    if (lv.ch === 'read') return t('breadT');
    return t('bask', { left: describe(lv.left) });
  }

  /* ---------- 画面 ---------- */
  function render() {
    var lv = state.lv, game = lv.ch !== 'read';
    $('level-title').textContent = lv.ch === 'read' ? t('bchRead')
      : lv.ch === 'cup' ? t('bcupN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('cup-card').hidden = lv.ch !== 'cup';
    $('btn-rules').hidden = !game;
    var playing = game && !state.done && !state.revealed && !state.review;
    $('game-ctrl').hidden = !game || state.review;
    $('count-ctrl').hidden = !playing;
    $('btn-check').hidden = !playing;
    $('btn-check-label').textContent = t(lv.mode === 'live' ? 'bcheckLive' : 'bcheckRelease');
    $('btn-hint').hidden = !playing || state.fails < 2;
    $('btn-hint').classList.toggle('hint', !state.hintOn);
    $('btn-solution').hidden = !(playing && state.hintOn && state.fails >= 3);
    $('btn-restart').hidden = !game;
    $('read-ctrl').hidden = lv.ch !== 'read';
    $('btn-got').hidden = false;
    $('read-done').hidden = true;
    $('review-ctrl').hidden = !state.review;
    $('rv-next').hidden = state.idx === LAST;
    if (lv.ch === 'read') return renderRead();
    renderClues();
    renderBoard();
    renderReveal();
    paintStatus();
  }

  function renderClues() {
    var lv = state.lv;
    if (!lv.clues.length) { $('clues').hidden = true; return; }
    $('clues').hidden = false;
    $('clues-title').textContent = t('bclues');
    $('clues-list').innerHTML = lv.clues.map(function (c, i) {
      return '<figure class="clue"><span class="clue-n">' + '①②③④'[i] + '</span>' + Art.scale(c[0], c[1], { small: true }) +
        '<figcaption>' + describe(c[0]) + ' = ' + describe(c[1]) + '</figcaption></figure>';
    }).join('');
  }

  function renderBoard() {
    var lv = state.lv;
    var d = B.diff(lv.left, rightItems());
    var held = !state.released && !state.done && !state.revealed && !state.review;
    var angle = held ? 0 : B.tilt(d);
    var locked = state.done || state.revealed || state.review;
    $('board').innerHTML = Art.scale(lv.left, rightItems(), { angle: angle, held: held, tapRight: !locked });
    $('m-count').innerHTML = Art.icon('M', 30) + '<b>× ' + state.n + '</b>';
    $('btn-minus').disabled = locked || state.n === 0;
    $('btn-plus').disabled = locked || state.n >= B.MAX_RIGHT;
  }

  function paintStatus() {
    var el = $('status'), lv = state.lv;
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && !state.review) { el.textContent = t(lv.hint); el.className = 'status info'; return; }
    if (!state.released && !state.done) { el.textContent = t('bheld'); el.className = 'status info'; return; }
    el.textContent = ''; el.className = 'status info';
  }

  function renderReveal() {
    var lv = state.lv, h = '';
    if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 天平的秘诀：没有游戏的一页 --- */
  function renderRead() {
    $('clues').hidden = true;
    var paras = t('breadB').split('\n');
    var para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    var swap = '<div class="read-scales">' + Art.scale(['D'], ['P', 'P'], { small: true }) + '<span class="read-arrow">→</span>' +
      Art.scale(['P', 'P'], ['M', 'M', 'M', 'M', 'M', 'M'], { small: true }) + '</div>';
    var cancel = '<div class="read-scales">' + Art.scale(['G', 'G', 'M'], ['G', 'M', 'M', 'M', 'M'], { small: true }) + '<span class="read-arrow">→</span>' +
      Art.scale(['G'], ['M', 'M', 'M'], { small: true }) + '</div>';
    $('board').innerHTML = '<div class="lesson">' + para(paras[0]) + para(paras[1]) + swap + para(paras[2]) + cancel +
      paras.slice(3).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function setN(n) {
    if (state.done || state.revealed || state.review) return;
    n = Math.max(0, Math.min(B.MAX_RIGHT, n));
    if (n === state.n) return;
    MG.sound.play(n > state.n ? 'tap' : 'untap');
    state.n = n;
    state.status = null;
    if (state.lv.mode !== 'live') state.released = false;   // 改了就重新按住，要再放手看看
    render();
  }
  function check() {
    var lv = state.lv;
    if (state.done || state.revealed || state.review) return;
    state.attempts++;
    state.released = true;
    var ok = B.balanced(lv, state.n);
    track('attempt', { value: state.n, ok: ok, n: state.attempts });
    if (ok) return win();
    state.fails++;
    var d = B.diff(lv.left, rightItems());
    state.status = { key: d > 0 ? 'bleftHeavy' : 'brightHeavy', kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    render();
    track('level_complete', { attempts: state.attempts, hint: state.usedHint, solution: false, ms: activeMs() - state.t0, cover: !!state.lv.cover });
    maybeFinished();
    var lv = state.lv;
    $('win-face').className = 'face wide';
    $('win-face').innerHTML = '<div class="win-eq">' + lv.left.map(function (f) { return Art.icon(f, 52); }).join('') +
      '<b>=</b><b>' + state.n + ' ×</b>' + Art.icon('M', 44) + '</div>';
    $('win-tip').textContent = t(lv.tip);
    $('win-next').hidden = state.idx === LAST;
    $('win-share').hidden = false;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 650);
  }
  function maybeFinished() {
    if (!progress.finished && allCleared()) { progress.finished = true; save(); track('game_complete', {}); }
  }
  function useHint() {
    state.hintOn = true; state.usedHint = true; state.status = null;
    MG.sound.play('hint');
    track('hint', {});
    render();
  }
  /** 看了提示还是做不出来：把答案摆好，提示和解释都打开 */
  function showSolution() {
    if (state.done || state.revealed) return;
    state.revealed = true; state.review = true; state.hintOn = true; state.released = true;
    state.n = B.answer(state.lv);
    state.status = { key: 'psolShown', kind: 'info' };
    unlockNext();
    MG.sound.play('hint');
    track('solution', {});
    track('level_complete', { attempts: state.attempts, hint: true, solution: true, ms: activeMs() - state.t0, cover: !!state.lv.cover });
    render();
  }
  function lookAgain() {
    $('dlg-win').close();
    state.review = true; state.hintOn = true; state.status = null;
    render();
    root.scrollTo(0, 0);
  }

  /* ---------- 分享：考考朋友 ---------- */
  function share() {
    var text = state.lv.cover ? t('bshareCover') : t('bshareText');
    track('share_click', { from: 'win' });
    if (MG.share) MG.share({ game: GAME, hash: 'cover', text: text, title: t('gameBalance') });
  }

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var art = [Art.icon('P', 44) + '<b class="rule-vs">|</b>' + Art.icon('M', 36),
      '<span class="pm-demo">' + MG.ICONS.minus + MG.ICONS.plus + '</span>', MG.ICONS.hand];
    $('rules-list').innerHTML = ['brules1', 'brules2', 'brules3'].map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    B.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      B.LEVELS.forEach(function (lv, i) {
        if (lv.ch !== ch.id) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (i > progress.unlocked ? ' disabled' : '') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
          (lv.ch === 'cup' ? MG.ICONS.trophy : lv.ch === 'read' ? MG.ICONS.book : (i + 1)) +
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
    $('btn-minus').addEventListener('click', function () { setN(state.n - 1); });
    $('btn-plus').addEventListener('click', function () { setN(state.n + 1); });
    $('board').addEventListener('click', function (e) {
      var f = e.target.closest('[data-right-i]');
      if (f) setN(state.n - 1);
    });
    $('btn-check').addEventListener('click', check);
    $('btn-hint').addEventListener('click', useHint);
    $('btn-solution').addEventListener('click', showSolution);
    $('btn-restart').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('btn-rules').addEventListener('click', openRules);
    $('btn-levels').addEventListener('click', openLevels);
    $('btn-got').addEventListener('click', function () {
      complete(); maybeFinished(); MG.sound.play('win'); MG.confetti('star');
      track('level_complete', { attempts: 0, hint: false, solution: false, ms: activeMs() - state.t0 });
      $('read-done').hidden = false; $('btn-got').hidden = true;
    });
    $('btn-share-end').addEventListener('click', share);
    $('levels-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (b && !b.disabled) { $('dlg-levels').close(); startLevel(+b.getAttribute('data-lv')); }
    });
    $('win-again').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx); });
    $('win-look').addEventListener('click', lookAgain);
    $('win-share').addEventListener('click', share);
    $('dlg-win').addEventListener('cancel', function (e) { e.preventDefault(); lookAgain(); });
    $('win-next').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx + 1); });
    $('rv-again').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('rv-next').addEventListener('click', function () { MG.sound.play('tap'); startLevel(state.idx + 1); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    root.addEventListener('mg:lang', function () { render(); });

    // 从分享封面点进来：直接打开封面那一题（前面的关也一起打开）
    if (root.location.hash === '#cover') {
      progress.unlocked = Math.max(progress.unlocked, B.COVER);
      save();
      MG.prefs.set('balanceRules', true);   // 封面题不先弹规则，直接玩
      startLevel(B.COVER, true);
    } else {
      startLevel(MG.prefs.get('balanceLevel', 0));
    }
  }

  MG.balanceDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
