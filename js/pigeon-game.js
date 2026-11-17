/*
 * 鸽子与糖果：界面。规则全在 MG.Pigeon（pigeon-logic.js），长相在 pigeon-skins.js。
 */
(function (root) {
  'use strict';
  var MG = root.MG, P = MG.Pigeon, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = P.LEVELS.length - 1;

  /* ---------- 进度 ---------- */
  var KEY = 'mg.pigeon.v1';
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {} };
  function save() { MG.store.set(KEY, progress); }

  var skin = MG.getPigeonSkin(MG.prefs.get('pigeonSkin', 'pigeon'));
  var state = {};

  /** 随皮肤变化的名词：鸽子/窝 或 糖果/罐子 */
  function nouns(extra) {
    var v = { item: t('item_' + skin.id), box: t('box_' + skin.id), unit: t('unit_' + skin.id) };
    for (var k in extra || {}) v[k] = extra[k];
    return v;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = P.LEVELS[idx];
    state = { idx: idx, lv: lv, fails: 0, hintOn: false, glow: -1, status: null, done: false };
    if (lv.ch === 'nest') state.counts = new Array(lv.boxes).fill(0);
    if (lv.ch === 'distinct') state.amounts = new Array(lv.kids).fill(0);
    if (lv.ch === 'least') state.n = 2;
    MG.prefs.set('pigeonLevel', idx);
    render();
    var seenKey = 'pigeonRules_' + lv.ch;
    if (!MG.prefs.get(seenKey, false)) { MG.prefs.set(seenKey, true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function render() {
    var lv = state.lv;
    $('level-title').textContent = lv.olympiad ? 'OMK 2016 · B3' : t('level', { n: state.idx + 1 });
    $('ask').textContent = lv.ch === 'nest' ? t('paskNest', nouns({ m: lv.cap }))
      : lv.ch === 'distinct' ? t('paskDistinct', { s: lv.sweets })
      : t('paskLeast', { s: lv.sweets });
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('polySource');
      $('oly-q').textContent = t('polyQ');
      $('oly-note').textContent = t('polyNote') + ' ' + t('polyGo');
    }
    $('btn-skin').innerHTML = MG.pigeonSkinIcon(skin);
    $('btn-impossible').hidden = lv.ch === 'least';
    $('least-ctrl').hidden = lv.ch !== 'least';
    $('btn-hint').hidden = state.fails < 2 || state.done;
    $('btn-hint').classList.toggle('hint', state.fails >= 2 && !state.hintOn);
    $('btn-impossible').classList.toggle('hint', !!state.glowNope);
    if (lv.ch === 'nest') renderNest(); else if (lv.ch === 'distinct') renderDistinct(); else renderLeast();
  }

  function setStatus(key, vars, kind) { state.status = { key: key, vars: vars, kind: kind || '' }; }
  function paintStatus(defKey, defVars, defKind) {
    var s = state.status || { key: defKey, vars: defVars, kind: defKind || '' };
    var el = $('status');
    el.textContent = s.key ? t(s.key, s.vars) : '';
    el.className = 'status ' + s.kind;
  }

  /* --- 第一章：窝 --- */
  function renderNest() {
    var lv = state.lv, c = state.counts, waiting = lv.items - sum(c), placed = 0;
    var h = '<div class="wire" aria-label="' + t('pwaiting', nouns({ n: waiting })) + '">';
    for (var w = 0; w < waiting; w++) h += '<span class="witem">' + skin.item(lv.items - 1 - w) + '</span>';
    h += '</div><div class="nests" style="--cols:' + lv.boxes + '">';
    for (var b = 0; b < lv.boxes; b++) {
      var over = c[b] > lv.cap;
      h += '<div class="nest-wrap' + (over ? ' over' : '') + (state.glow === b ? ' glow' : '') + '" data-b="' + b + '">';
      h += '<div class="nest-in">';
      for (var k = 0; k < Math.max(c[b], lv.cap); k++) {
        if (k < c[b]) h += '<button class="pitem' + (k >= lv.cap ? ' extra' : '') + '" data-b="' + b + '" aria-label="−">' + skin.item(placed++) + '</button>';
        else h += '<span class="slot"></span>';
      }
      h += '</div><button class="nest-btn" data-b="' + b + '" aria-label="+ ' + t('box_' + skin.id) + ' ' + (b + 1) + '">' + skin.box(over) +
        '<span class="cnt">' + c[b] + ' / ' + lv.cap + '</span></button></div>';
    }
    h += '</div>';
    $('board').className = 'pboard nest-board';
    $('board').innerHTML = h;
    var crowded = c.some(function (x) { return x > lv.cap; });
    if (crowded && !state.status) paintStatus('pcrowded', nouns(), 'warn');
    else paintStatus(waiting ? 'pwaiting' : 'pnestTap', nouns({ n: waiting }));
  }
  function nestAdd(b) {
    var lv = state.lv, waiting = lv.items - sum(state.counts);
    if (state.done || waiting === 0) { MG.sound.play('untap'); return; }
    state.counts[b]++; state.glow = -1; state.status = null;
    MG.sound.play(state.counts[b] > lv.cap ? 'untap' : 'tap');
    afterChange(waiting === 1);
  }
  function nestRemove(b) {
    if (state.done || !state.counts[b]) return;
    state.counts[b]--; state.status = null;
    MG.sound.play('untap');
    render();
  }

  /* --- 第二章：分糖 --- */
  function renderDistinct() {
    var lv = state.lv, a = state.amounts, left = lv.sweets - sum(a);
    var same = sum(a) ? P.sameIndexes(a) : [];  // 还没开始分时不标
    var h = '<div class="pool"><div class="pool-sweets">';
    for (var s = 0; s < left; s++) h += '<span class="psweet">' + MG.sweetSvg(s) + '</span>';
    h += '</div><b class="pool-n">' + (left ? t('pleft', { n: left }) : t('pallOut')) + '</b></div><div class="kids">';
    var color = 0;
    a.forEach(function (n, i) {
      var isSame = same.indexOf(i) >= 0;
      h += '<div class="kid' + (isSame ? ' same' : '') + '">' + MG.kidFace(i, isSame ? 'same' : '') +
        '<div class="plate">';
      for (var k = 0; k < n; k++) h += '<span class="psweet">' + MG.sweetSvg(color++) + '</span>';
      h += '</div><b class="amt">' + n + '</b><div class="pm">' +
        '<button class="icon-btn" data-i="' + i + '" data-d="-1" aria-label="−"' + (n ? '' : ' disabled') + '>' + MG.ICONS.minus + '</button>' +
        '<button class="icon-btn" data-i="' + i + '" data-d="1" aria-label="+"' + (left ? '' : ' disabled') + '>' + MG.ICONS.plus + '</button>' +
        '</div></div>';
    });
    h += '</div>';
    $('board').className = 'pboard distinct-board kids-' + a.length;
    $('board').innerHTML = h;
    if (left === 0 && same.length) paintStatus('psame', null, 'warn');
    else paintStatus(null);
  }
  function distinctStep(i, d) {
    var lv = state.lv, left = lv.sweets - sum(state.amounts);
    if (state.done) return;
    if (d > 0 && left === 0) return;
    if (d < 0 && state.amounts[i] === 0) return;
    state.amounts[i] += d; state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    afterChange(d > 0 && left === 1);
  }

  /* --- 第三章：最少几个人 --- */
  function renderLeast() {
    var lv = state.lv, n = state.n, S = lv.sweets;
    var need = P.minDistinct(n), ok = !P.forcedSame(n, S);
        var h = '<div class="least-top"><div class="faces">';
    var show = Math.min(n, 12);
    for (var i = 0; i < show; i++) h += '<span class="face">' + MG.kidFace(i) + '</span>';
    if (n > show) h += '<span class="more">+' + (n - show) + '</span>';
    h += '</div><b class="kid-n">' + t('pkids', { n: n }) + '</b></div>';

    // 楼梯：让大家都不一样的最省分法 0, 1, 2, …, n−1
    var W = 300, H = 110, gap = n > 30 ? 0.6 : 2, bw = (W - gap * (n - 1)) / n;
    var top = Math.max(n - 1, 1), stair = '';
    for (var b = 0; b < n; b++) {
      var x = b * (bw + gap), hh = (b / top) * (H - 18);
      stair += '<rect x="' + x.toFixed(2) + '" y="' + (H - hh).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + hh.toFixed(2) + '" fill="' + (b % 2 ? '#ffb627' : '#ff5d73') + '"/>';
      if (n <= 12) stair += '<text x="' + (x + bw / 2).toFixed(2) + '" y="' + (H - hh - 4).toFixed(2) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#1d2433">' + b + '</text>';
    }
    stair += '<line x1="0" y1="' + H + '" x2="' + W + '" y2="' + H + '" stroke="#1d2433" stroke-width="2"/>';
    h += '<svg class="stair" viewBox="-2 -2 ' + (W + 4) + ' ' + (H + 4) + '" aria-hidden="true">' + stair + '</svg>';
    var terms = n <= 5 ? Array.from({ length: n }, function (_, i) { return i; }).join(' + ') : '0 + 1 + 2 + … + ' + (n - 1);
    h += '<p class="stair-note">' + terms + ' = ' + need + '</p>';

    // 比一比：需要多少 vs 有多少
    var max = Math.max(need, S) || 1;
    function row(label, val, cls) {
      return '<div class="cmp-row"><div class="cmp-head"><span>' + label + '</span><b>' + val + '</b></div>' +
        '<div class="cmp-track"><div class="cmp-bar ' + cls + '" style="width:' + (val / max * 100).toFixed(1) + '%"></div></div></div>';
    }
    h += '<div class="compare">' + row(t('pneed'), need, 'need' + (ok ? '' : ' over')) + row(t('phave'), S, 'have') + '</div>' +
      '<p class="verdict ' + (ok ? 'ok' : 'forced') + '">' + t(ok ? 'pverdictAvoid' : 'pverdictForced') + '<small>' +
      (ok ? t('pleftover', { r: S - need }) : t('pshort', { n: need - S })) + '</small></p>';
    $('board').className = 'pboard least-board';
    $('board').innerHTML = h;

    $('n-val').textContent = n;
    $('btn-answer').lastChild.textContent = t('panswer', { n: n });
    $('btn-m1').disabled = n <= 1; $('btn-m10').disabled = n <= 1;
    $('btn-m10').hidden = $('btn-p10').hidden = !lv.olympiad;
    paintStatus('phintLeast', { s: S }, 'soft');
  }
  function leastStep(d) {
    if (state.done) return;
    state.n = Math.max(1, Math.min(state.n + d, 200));
    state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    render();
  }
  function leastAnswer() {
    if (state.done) return;
    var lv = state.lv, n = state.n;
    if (n === P.leastKids(lv.sweets)) return win();
    fail(P.forcedSame(n, lv.sweets) ? 'ptooMany' : 'ptooFew', { n: n });
  }

  /* ---------- 判定 ---------- */
  /** justFilled：这一步刚好把东西全部放完 / 分完——放完了还不对，算一次「卡住」 */
  function afterChange(justFilled) {
    var lv = state.lv;
    if (lv.ch === 'nest' && P.nestSolved(state.counts, lv.items, lv.cap)) return win();
    if (lv.ch === 'distinct' && P.distinctSolved(state.amounts, lv.sweets)) return win();
    if (justFilled) state.fails++;
    render();
  }
  function fail(key, vars) {
    state.fails++;
    setStatus(key, vars, 'warn');
    MG.sound.play('untap');
    render();
  }
  function pressImpossible() {
    if (state.done) return;
    if (!P.levelPossible(state.lv)) return win();
    fail('pcanDo');
  }

  function useHint() {
    var lv = state.lv;
    state.hintOn = true;
    MG.sound.play('hint');
    if (lv.ch === 'nest') {
      if (!P.levelPossible(lv)) {
        state.glowNope = true;
        setStatus('phintNestCount', nouns({ k: lv.boxes, m: lv.cap, max: lv.boxes * lv.cap, n: lv.items }), 'info');
      } else {
        var over = state.counts.findIndex(function (x) { return x > lv.cap; });
        if (over >= 0) { state.glow = over; setStatus('pcrowded', nouns(), 'info'); }
        else { state.glow = P.nestHint(state.counts, lv.cap); setStatus('phintNestPut', nouns(), 'info'); }
      }
    } else if (lv.ch === 'distinct') {
      if (!P.levelPossible(lv)) {
        state.glowNope = true;
        var list = Array.from({ length: lv.kids }, function (_, i) { return i; });
        setStatus('phintDistinctMin', { list: list.join(' + '), min: P.minDistinct(lv.kids), s: lv.sweets }, 'info');
      } else {
        state.amounts = P.distinctExample(lv.kids, lv.sweets);
        render();
        return setTimeout(win, 700);
      }
    } else {
      setStatus('phintLeast', { s: lv.sweets }, 'info');
    }
    render();
  }

  function win() {
    state.done = true;
    progress.cleared[state.idx] = true;
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
    MG.sound.play('win');
    MG.confetti(state.lv.ch === 'nest' ? 'star' : 'candy');
    render();
    var lv = state.lv;
    $('win-face').innerHTML = lv.ch === 'nest' ? skin.item(0) : MG.kidFace(state.idx);
    $('win-tip').textContent = t(lv.tip, nouns());
    $('win-next').hidden = state.idx === LAST;
    $('win-math').hidden = state.idx !== LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }

  /* ---------- 弹窗 ---------- */
  function openRules() {
    var ch = state.lv.ch, v = nouns();
    var keys = ch === 'nest' ? ['prulesNest1', 'prulesNest2', 'prulesNest3']
      : ch === 'distinct' ? ['prulesDistinct1', 'prulesDistinct2', 'prulesDistinct3']
      : ['prulesLeast1', 'prulesLeast2', 'prulesLeast3'];
    var art = ch === 'nest' ? [skin.item(0) + '<span class="arrow">→</span>' + skin.box(false), skin.box(true), '<span class="nope-demo">' + MG.ICONS.nope + '</span>']
      : ch === 'distinct' ? ['<span class="pm-demo">' + MG.ICONS.minus + MG.ICONS.plus + '</span>', MG.sweetSvg(0) + '<b>0</b>', MG.kidFace(0) + MG.kidFace(1, 'same')]
      : ['<span class="pm-demo">' + MG.ICONS.minus + MG.ICONS.plus + '</span>', '<b>0+1+2</b>', MG.ICONS.check];
    $('rules-list').innerHTML = keys.map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k, v) + '</span></li>';
    }).join('');
    $('rules-how').textContent = t('prulesHow');
    $('dlg-rules').showModal();
  }

  function openLevels() {
    var h = '';
    P.CHAPTERS.concat([{ id: 'oly', nameKey: 'pchOly' }]).forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      P.LEVELS.forEach(function (lv, i) {
        var inCh = ch.id === 'oly' ? lv.olympiad : (lv.ch === ch.id && !lv.olympiad);
        if (!inCh) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (i > progress.unlocked ? ' disabled' : '') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
          (lv.olympiad ? MG.ICONS.trophy : (i + 1)) + (progress.cleared[i] ? '<small>★</small>' : '') + '</button>';
      });
      h += '</div>';
    });
    $('levels-body').innerHTML = h;
    $('skin-row').innerHTML = MG.PIGEON_SKINS.map(function (s) {
      return '<button class="skin-btn" data-skin="' + s.id + '" aria-pressed="' + (s.id === skin.id) + '">' + MG.pigeonSkinIcon(s) + '<span>' + t(s.nameKey) + '</span></button>';
    }).join('');
    $('levels-math').hidden = !progress.cleared[LAST];
    $('dlg-levels').showModal();
  }

  function openMath() {
    var ex = [1, 2, 3].map(function (i) {
      return '<div class="think"><p><b>' + i + '.</b> ' + t('pex' + i + 'Q') + '</p>' +
        '<details><summary>' + t('phintLabel') + '</summary><p>' + t('pex' + i + 'H') + '</p></details>' +
        '<details><summary>' + t('panswerLabel') + '</summary><p>' + t('pex' + i + 'A') + '</p></details></div>';
    }).join('');
    $('math-body').innerHTML = '<p class="oly-src-small">' + t('polySource') + '</p>' + t('pmath') +
      '<h3 class="think-title">' + t('pthinkTitle') + '</h3>' + ex;
    $('dlg-math').showModal();
  }

  function setSkin(id) {
    skin = MG.getPigeonSkin(id);
    MG.prefs.set('pigeonSkin', skin.id);
    render();
  }

  /* ---------- 事件 ---------- */
  function init() {
    MG.setupTopbar();
    $('board').addEventListener('click', function (e) {
      var it = e.target.closest('.pitem');
      if (it) return nestRemove(+it.getAttribute('data-b'));
      var nw = e.target.closest('.nest-wrap');
      if (nw) return nestAdd(+nw.getAttribute('data-b'));
      var pm = e.target.closest('[data-d]');
      if (pm && !pm.disabled) return distinctStep(+pm.getAttribute('data-i'), +pm.getAttribute('data-d'));
    });
    $('btn-impossible').addEventListener('click', pressImpossible);
    $('btn-hint').addEventListener('click', useHint);
    $('btn-restart').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('btn-rules').addEventListener('click', openRules);
    $('btn-levels').addEventListener('click', openLevels);
    $('btn-skin').addEventListener('click', function () {
      var i = MG.PIGEON_SKINS.indexOf(skin);
      setSkin(MG.PIGEON_SKINS[(i + 1) % MG.PIGEON_SKINS.length].id);
      MG.sound.play('tap');
    });
    [['btn-m10', -10], ['btn-m1', -1], ['btn-p1', 1], ['btn-p10', 10]].forEach(function (p) {
      $(p[0]).addEventListener('click', function () { leastStep(p[1]); });
    });
    $('btn-answer').addEventListener('click', leastAnswer);
    $('levels-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (b && !b.disabled) { $('dlg-levels').close(); startLevel(+b.getAttribute('data-lv')); }
    });
    $('skin-row').addEventListener('click', function (e) {
      var b = e.target.closest('[data-skin]');
      if (b) { setSkin(b.getAttribute('data-skin')); $('dlg-levels').close(); openLevels(); }
    });
    $('levels-math').addEventListener('click', function () { $('dlg-levels').close(); openMath(); });
    $('win-again').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx); });
    $('win-next').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx + 1); });
    $('win-math').addEventListener('click', function () { $('dlg-win').close(); openMath(); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    root.addEventListener('mg:lang', function () { render(); });
    startLevel(MG.prefs.get('pigeonLevel', 0));
  }

  MG.pigeonDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
