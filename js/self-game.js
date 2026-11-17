/*
 * 自我介绍的数：界面。规则全在 MG.Self（self-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, S = MG.Self, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = S.LEVELS.length - 1;

  /* ---------- 进度 ---------- */
  var KEY = 'mg.self.v1';
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
    var ch = S.chapterOf(S.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (S.chapterOf(S.LEVELS[i]) === ch) n++;
    return n;
  }
  function locked() { return state.done || state.revealed || state.review; }
  function part() { return state.parts[state.cur]; }
  /** 开局的数字：第一格 1，其余 0；锁定的格子按关卡给的 */
  function startDigits(n, fixed) {
    var ds = [];
    for (var i = 0; i < n; i++) ds.push(i === 0 ? 1 : 0);
    Object.keys(fixed || {}).forEach(function (i) { ds[i] = fixed[i]; });
    return ds;
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = S.LEVELS[idx];
    state = {
      idx: idx, lv: lv, cur: 0, fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null,
      parts: S.partsOf(lv).map(function (p) { return { n: p.n, label: p.label, distinct: p.distinct, digits: startDigits(p.n, lv.fixed), found: null }; })
    };
    MG.prefs.set('selfLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'warm') return;
    if (!MG.prefs.get('selfRules', false)) { MG.prefs.set('selfRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = lv.ch === 'think';
    $('level-title').textContent = lv.olympiad ? 'OMK 2017 · B2'
      : lv.ch === 'read' ? t('schRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = lv.ch === 'read' ? t('sreadT') : think ? t(lv.key + 'Q') : lv.olympiad ? t('saskOly') : t('saskN', { n: lv.n });
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('spolySource');
      $('oly-q').textContent = t('spolyQ');
      $('oly-note').textContent = t('spolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = lv.ch !== 'warm';
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('btn-check').hidden = !playing;
    $('btn-impossible').hidden = !(playing && lv.impossible);
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
    $('board').className = 'pboard self-board';
    $('board').innerHTML = partTabs() + slotsHtml(part().digits, { fixed: lv.fixed, locked: locked() }) +
      '<p class="slegend">' + t('slegend') + '</p>' +
      (state.hintOn || state.review ? '<p class="ssum">' + t('ssum', { s: S.sum(part().digits), n: part().n }) + '</p>' : '');
    renderReveal();
    paintStatus();
  }
  function partTabs() {
    if (state.parts.length < 2) return '';
    return '<div class="part-tabs">' + state.parts.map(function (p, i) {
      return '<button class="chip side' + (i === state.cur ? ' sel' : '') + (p.found ? ' found' : '') + '" data-part="' + i + '"' + (p.found || locked() ? ' disabled' : '') + '>' +
        p.label + ' ' + (p.found || '?'.repeat(p.n)) + '</button>';
    }).join('') + '</div>';
  }
  /** 一排格子：上面是要数的数字 i，中间是孩子写的，下面是实际出现的次数 */
  function slotsHtml(ds, opts) {
    opts = opts || {};
    var c = S.counts(ds), ok = S.matches(ds);
    return '<div class="sslots" style="--n:' + ds.length + '">' + ds.map(function (d, i) {
      var fixed = opts.fixed && opts.fixed[i] != null, stat = ok[i] ? 'ok' : 'bad';
      var btn = function (dir, icon, key) {
        return opts.locked || fixed ? '<span class="sbtn-gap"></span>' :
          '<button class="icon-btn sbtn" data-s="' + i + '" data-d="' + dir + '" aria-label="' + t(key, { n: i + 1 }) + '">' + MG.ICONS[icon] + '</button>';
      };
      return '<div class="sslot ' + stat + (fixed ? ' fixed' : '') + '">' +
        '<span class="sidx">' + i + '</span>' + btn(1, 'up', 'sup') +
        '<b class="sdig">' + d + '</b>' + btn(-1, 'down', 'sdown') +
        '<span class="scount">' + c[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function paintStatus() {
    var el = $('status');
    if (state.review) { el.textContent = ''; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.textContent = '';
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('sallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「自传数」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('sreadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    var all = ['1210', '2020', '21200', '3211000', '42101000', '521001000', '6210001000'];
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + para(paras[0]) +
      slotsHtml([2, 1, 2, 0, 0], { locked: true }) + para(paras[1]) + para(paras[2]) +
      '<div class="self-list">' + all.map(function (s) { return '<span class="odo">' + s.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</span>'; }).join('') + '</div>' +
      paras.slice(3).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function spin(i, d) {
    if (locked()) return;
    var ds = part().digits;
    ds[i] = (ds[i] + d + 10) % 10;
    state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    render();
  }
  function pickPart(i) {
    if (locked() || state.parts[i].found) return;
    state.cur = i; state.status = null;
    MG.sound.play('tap');
    render();
  }
  function check() {
    if (locked()) return;
    var p = part(), ds = p.digits;
    if (ds[0] === 0) return fail('snoZero', { n: p.n });
    if (!S.isSelf(ds)) return fail('sno', { k: S.matches(ds).filter(function (x) { return !x; }).length });
    var num = ds.join('');
    if (state.parts.some(function (q) { return q.found === num; })) {
      state.status = { key: 'ssame', kind: 'warn' };
      MG.sound.play('untap');
      return render();
    }
    p.found = num;
    var next = state.parts.findIndex(function (q) { return !q.found; });
    if (next < 0) return win();
    state.cur = next;
    state.status = { key: 'sfound', vars: { num: num }, kind: 'info' };
    MG.sound.play('take');
    render();
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function pressImpossible() {
    if (locked()) return;
    if (state.lv.impossible) return win();
    fail('pcanDo');
  }
  function win() {
    state.done = true;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    state.status = null;
    render();
    var lv = state.lv, nums = state.parts.map(function (p) { return p.found; }).filter(Boolean);
    $('win-face').innerHTML = nums.length ? '<div class="win-nums">' + nums.map(function (s) {
      return '<span class="odo">' + s.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</span>';
    }).join('') + '</div>' : '<div class="odo big"><span>?</span></div>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('sallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    var lv = state.lv;
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null;
    if (!lv.impossible) {
      var ans = S.allSelf(lv.n)[0];
      part().digits = ans.split('').map(Number);
      part().found = ans;
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
      slotsHtml([1, 2, 1, 0], { locked: true }), MG.ICONS.check];
    $('rules-list').innerHTML = ['srules1', 'srules2', 'srules3'].map(function (k, i) {
      return '<li><span class="rule-art' + (i === 1 ? ' wide' : '') + '">' + art[i] + '</span><span>' + t(k) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }
  function openLevels() {
    var h = '';
    S.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      S.LEVELS.forEach(function (lv, i) {
        if (S.chapterOf(lv) !== ch.id) return;
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
      var b = e.target.closest('[data-s]');
      if (b) return spin(+b.getAttribute('data-s'), +b.getAttribute('data-d'));
      var p = e.target.closest('[data-part]');
      if (p && !p.disabled) pickPart(+p.getAttribute('data-part'));
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
    startLevel(MG.prefs.get('selfLevel', 0));
  }

  MG.selfDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
