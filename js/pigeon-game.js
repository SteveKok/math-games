/*
 * 鸽子与糖果：界面。规则全在 MG.Pigeon（pigeon-logic.js），图画在 pigeon-skins.js。
 */
(function (root) {
  'use strict';
  var MG = root.MG, P = MG.Pigeon, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = P.LEVELS.length - 1;

  /* ---------- 进度 ---------- */
  var KEY = 'mg.pigeon.v2';  // v2：关卡精简后编号变了
  var progress = MG.store.get(KEY, null);
  if (!progress || typeof progress.unlocked !== 'number') progress = { unlocked: 0, cleared: {} };
  function save() { MG.store.set(KEY, progress); }

  var skin = MG.PIGEON_ART;  // 鸽子和窝的画法
  var state = {};

  /** 第一章的名词：鸽子、窝 */
  function nouns(extra) {
    var v = { item: t('item_pigeon'), box: t('box_pigeon'), unit: t('unit_pigeon') };
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
    if (lv.ch === 'think') { state.n = 1; state.showHint = false; state.showAnswer = false; }
    MG.prefs.set('pigeonLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (!isGame(lv)) return;
    var seenKey = 'pigeonRules_' + lv.ch;
    if (!MG.prefs.get(seenKey, false)) { MG.prefs.set(seenKey, true); openRules(); }
  }

  function isGame(lv) { return lv.ch === 'nest' || lv.ch === 'distinct' || lv.ch === 'least'; }
  /** 在本章里是第几关（解答 1、想一想 2……） */
  function numInChapter(idx) {
    var ch = P.chapterOf(P.LEVELS[idx]), n = 0;
    for (var i = 0; i <= idx; i++) if (P.chapterOf(P.LEVELS[i]) === ch) n++;
    return n;
  }

  /* ---------- 画面 ---------- */
  function render() {
    var lv = state.lv, numeric = lv.ch === 'think' && lv.answer;
    $('level-title').textContent = lv.olympiad ? 'OMK 2016 · B3'
      : lv.ch === 'read' ? t('pchSol')
      : lv.ch === 'think' ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = lv.ch === 'nest' ? t('paskNest', nouns({ m: lv.cap }))
      : lv.ch === 'distinct' ? t('paskDistinct', { s: lv.sweets })
      : lv.ch === 'read' ? t('psolT')
      : lv.ch === 'think' ? t('pthinkAsk')
      : t('paskLeast', { s: lv.sweets });
    $('btn-rules').hidden = !isGame(lv);
    $('btn-restart').hidden = !isGame(lv);
    $('card-ctrl').hidden = isGame(lv);
    $('btn-got').hidden = lv.ch !== 'read';
    ['btn-thint', 'btn-reveal'].forEach(function (id) { $(id).hidden = lv.ch !== 'think'; });
    $('btn-thint').setAttribute('aria-pressed', String(!!state.showHint));
    $('btn-reveal').disabled = !!state.showAnswer;
    $('btn-cardnext').hidden = !(lv.ch === 'think' && state.showAnswer && state.idx < LAST);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('polySource');
      $('oly-q').textContent = t('polyQ');
      $('oly-note').textContent = t('polyNote') + ' ' + t('polyGo');
    }
    $('btn-impossible').hidden = !(lv.ch === 'nest' || lv.ch === 'distinct');
    $('least-ctrl').hidden = !(lv.ch === 'least' || (numeric && !state.showAnswer));
    $('btn-hint').hidden = state.fails < 2 || state.done || !isGame(lv);
    $('btn-hint').classList.toggle('hint', state.fails >= 2 && !state.hintOn);
    $('btn-impossible').classList.toggle('hint', !!state.glowNope);
    if (lv.ch === 'nest') renderNest();
    else if (lv.ch === 'distinct') renderDistinct();
    else if (lv.ch === 'least') renderLeast();
    else if (lv.ch === 'read') renderRead();
    else renderThink();
    paintReview();
  }

  /* ---------- 回去看看：只看不答，所有提示和解释都摊开 ---------- */
  function lookAgain() {
    $('dlg-win').close();
    state.review = true;
    if (state.lv.ch === 'think') { state.showHint = true; state.showAnswer = true; }
    render();
    root.scrollTo(0, 0);
  }
  function reviewHint() {
    var lv = state.lv;
    if (lv.ch === 'nest') return P.levelPossible(lv) ? null : t('phintNestCount', nouns({ k: lv.boxes, m: lv.cap, max: lv.boxes * lv.cap, n: lv.items }));
    if (lv.ch === 'distinct') {
      if (P.levelPossible(lv)) return t('phintDistinctShow');
      var list = Array.from({ length: lv.kids }, function (_, i) { return i; });
      return t('phintDistinctMin', { list: list.join(' + '), min: P.minDistinct(lv.kids), s: lv.sweets });
    }
    if (lv.ch === 'least') return t('phintLeast', { s: lv.sweets });
    return null;
  }
  function paintReview() {
    var on = !!state.review, lv = state.lv;
    $('review-ctrl').hidden = !on;
    $('rv-next').hidden = state.idx === LAST;
    if (!on) { $('reveal').hidden = true; $('reveal').innerHTML = ''; return; }
    ['least-ctrl', 'card-ctrl'].forEach(function (id) { $(id).hidden = true; });
    $('btn-hint').hidden = $('btn-restart').hidden = $('btn-impossible').hidden = true;
    var h = '', hint = reviewHint();
    if (hint) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + hint + '</p>';
    if (lv.tip) h += '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip, nouns()) + '</p>';
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
    $('status').textContent = '';
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
      h += '</div><button class="nest-btn" data-b="' + b + '" aria-label="+ ' + t('box_pigeon') + ' ' + (b + 1) + '">' + skin.box(over) +
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
    h += stairSvg(Array.from({ length: n }, function (_, i) { return i; }));
    var terms = n <= 5 ? Array.from({ length: n }, function (_, i) { return i; }).join(' + ') : '0 + 1 + 2 + … + ' + (n - 1);
    h += '<p class="stair-note">' + terms + ' = ' + need + '</p>';

    // 比一比：需要多少 vs 有多少
    h += compareBars(need, S, ok) +
      '<p class="verdict ' + (ok ? 'ok' : 'forced') + '">' + t(ok ? 'pverdictAvoid' : 'pverdictForced') + '<small>' +
      (ok ? t('pleftover', { r: S - need }) : t('pshort', { n: need - S })) + '</small></p>';
    $('board').className = 'pboard least-board';
    $('board').innerHTML = h;

    paintStepper(t('panswer', { n: n }));
    paintStatus('phintLeast', { s: S }, 'soft');
  }
  function paintStepper(label) {
    var n = state.n;
    $('n-val').textContent = n;
    $('btn-answer').lastChild.textContent = label;
    $('btn-m1').disabled = n <= 1; $('btn-m10').disabled = n <= 1;
    $('btn-m10').hidden = $('btn-p10').hidden = !state.lv.olympiad;
  }

  /** 楼梯图：每根柱子是一个人分到的糖；hi 是要标出来的柱子（用另一种颜色，标上数字） */
  function stairSvg(values, hi) {
    var n = values.length, W = 300, H = 110, gap = n > 30 ? 0.6 : 2, bw = (W - gap * (n - 1)) / n;
    var top = Math.max.apply(null, values.concat([1])), out = '';
    values.forEach(function (v, b) {
      var x = b * (bw + gap), hh = (v / top) * (H - 18), isHi = b === hi;
      out += '<rect x="' + x.toFixed(2) + '" y="' + (H - hh).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + hh.toFixed(2) + '" fill="' + (isHi ? '#2ec4b6' : b % 2 ? '#ffb627' : '#ff5d73') + '"' + (isHi ? ' stroke="#1d2433" stroke-width="1.5"' : '') + '/>';
      if (n <= 12 || isHi) out += '<text x="' + (x + bw / 2).toFixed(2) + '" y="' + (H - hh - 4).toFixed(2) + '" text-anchor="' + (isHi && b === n - 1 && n > 12 ? 'end' : 'middle') + '" font-size="12" font-weight="800" fill="#1d2433">' + v + '</text>';
    });
    out += '<line x1="0" y1="' + H + '" x2="' + W + '" y2="' + H + '" stroke="#1d2433" stroke-width="2"/>';
    return '<svg class="stair" viewBox="-2 -2 ' + (W + 4) + ' ' + (H + 4) + '" aria-hidden="true">' + out + '</svg>';
  }
  function compareBars(need, have, ok) {
    var max = Math.max(need, have) || 1;
    function row(label, val, cls) {
      return '<div class="cmp-row"><div class="cmp-head"><span>' + label + '</span><b>' + val + '</b></div>' +
        '<div class="cmp-track"><div class="cmp-bar ' + cls + '" style="width:' + (val / max * 100).toFixed(1) + '%"></div></div></div>';
    }
    return '<div class="compare">' + row(t('pneed'), need, 'need' + (ok ? '' : ' over')) + row(t('phave'), have, 'have') + '</div>';
  }
  function leastStep(d) {
    if (state.done) return;
    state.n = Math.max(1, Math.min(state.n + d, state.lv.ch === 'think' ? 30 : 200));
    state.status = null;
    MG.sound.play(d > 0 ? 'tap' : 'untap');
    render();
  }
  function leastAnswer() {
    if (state.done) return;
    var lv = state.lv, n = state.n;
    if (lv.ch === 'think') {
      if (n === lv.answer) return win();
      return fail(n < lv.answer ? 'pthinkFew' : 'pthinkMany', { n: n });
    }
    if (n === P.leastKids(lv.sweets)) return win();
    fail(P.forcedSame(n, lv.sweets) ? 'ptooMany' : 'ptooFew', { n: n });
  }

  /* --- 解答与想一想：没有游戏的关卡 --- */
  function renderRead() {
    var lv = state.lv;
    var paras = t('psolB').split('\n');
    var h = '<div class="lesson">' + art(lv.art) +
      paras.slice(0, 2).map(function (x) { return '<p class="lesson-text">' + x + '</p>'; }).join('') +
      staticNests([3, 2, 2], 2) + '<p class="art-formula">⌈7 ÷ 3⌉ = 3</p>' +
      paras.slice(2).map(function (x) { return '<p class="lesson-text">' + x + '</p>'; }).join('') + '</div>';
    $('board').className = 'pboard read-board';
    $('board').innerHTML = h;
    paintStatus(null);
  }
  function renderThink() {
    var lv = state.lv, k = lv.key;
    var phase = state.showAnswer ? 'answer' : state.showHint ? 'hint' : 'q';
    var h = '<div class="lesson"><p class="lesson-q">' + t('p' + k + 'Q') + '</p>' +
      '<div class="lesson-art">' + art(lv.art, phase) + '</div>';
    if (state.showHint || state.showAnswer) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t('p' + k + 'H') + '</p>';
    if (state.showAnswer) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t('p' + k + 'A') + '</p>';
    h += '</div>';
    $('board').className = 'pboard read-board';
    $('board').innerHTML = h;
    if (lv.answer && !state.showAnswer) paintStepper(t('pmyAnswer', { n: state.n }));
    if (state.showAnswer && state.idx === LAST) paintStatus('pallClear', null, 'info');
    else paintStatus(null);
  }
  function revealAnswer() {
    if (state.showAnswer) return;
    state.showAnswer = true; state.status = null;
    complete();
    MG.sound.play('hint');
    render();
    if (state.idx === LAST) { MG.sound.play('win'); MG.confetti('star'); }
  }

  /* ---------- 插画（全部用代码画） ---------- */
  function staticNests(counts, cap) {
    var placed = 0, h = '<div class="nests art-nests" style="--cols:' + counts.length + '">';
    counts.forEach(function (c) {
      var over = c > cap;
      h += '<div class="nest-wrap' + (over ? ' over' : '') + '"><div class="nest-in">';
      for (var k = 0; k < c; k++) h += '<span class="pitem' + (k >= cap ? ' extra' : '') + '">' + skin.item(placed++) + '</span>';
      h += '</div><div class="nest-btn">' + skin.box(over) + '<span class="cnt">' + c + '</span></div></div>';
    });
    return h + '</div>';
  }
  var SOCK = ['#ff5d73', '#3a86ff', '#13a36b'];
  function sock(c, extra) {
    return '<svg class="sock' + (extra ? ' ' + extra : '') + '" viewBox="0 0 40 50" aria-hidden="true"><path d="M12 3 h16 v24 l6 6 q5 6 -1 12 q-5 4 -11 -1 l-12 -11 q-3 -3 -3 -7 v-20 Z" fill="' + c + '" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9 h16" stroke="#fff" stroke-width="3" opacity=".7"/></svg>';
  }
  function tile(n, cls) { return '<span class="ntile' + (cls ? ' ' + cls : '') + '">' + n + '</span>'; }
  function art(name, phase) {
    var i, h = '';
    switch (name) {
      case 'dirichlet': return MG.portrait('dirichlet');
      case 'socks':
        if (phase === 'q') {
          h = '<div class="drawer">';
          for (i = 0; i < 9; i++) h += sock(SOCK[(i * 2) % 3]);
          return h + '</div>';
        }
        h = '<div class="sock-boxes">' + SOCK.map(function (c, j) {
          return '<div class="sock-box">' + sock(c) + (phase === 'answer' && j === 0 ? sock(c, 'pop') : '') + '</div>';
        }).join('') + '</div>';
        return h + (phase === 'answer' ? '<p class="art-formula">3 + 1 = 4</p>' : '');
      case 'sum11': {
        var pairs = [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]];
        if (phase === 'q') {
          for (i = 1; i <= 10; i++) h += tile(i);
          return '<div class="tiles">' + h + '</div>';
        }
        h = '<div class="pair-boxes">' + pairs.map(function (p, j) {
          var a = phase === 'answer' ? 'picked' : '', b = phase === 'answer' && j === 0 ? 'picked sixth' : '';
          return '<div class="pair-box">' + tile(p[0], a) + tile(p[1], b) + '<small>= 11</small></div>';
        }).join('') + '</div>';
        return h + (phase === 'answer' ? '<p class="art-formula">5 + 1 = 6</p>' : '');
      }
      case 'hands': {
        var R = 38, pts = [];
        for (i = 0; i < 6; i++) pts.push([50 + R * Math.cos(-Math.PI / 2 + i * Math.PI / 3), 50 + R * Math.sin(-Math.PI / 2 + i * Math.PI / 3)]);
        var lines = [[0, 1], [0, 3], [1, 2], [2, 4], [3, 4], [4, 5], [1, 4]].map(function (e) {
          return '<line x1="' + pts[e[0]][0].toFixed(1) + '" y1="' + pts[e[0]][1].toFixed(1) + '" x2="' + pts[e[1]][0].toFixed(1) + '" y2="' + pts[e[1]][1].toFixed(1) + '" stroke="#ffb627" stroke-width="3" stroke-linecap="round"/>';
        }).join('');
        var faces = pts.map(function (p, j) {
          return '<svg x="' + (p[0] - 11).toFixed(1) + '" y="' + (p[1] - 11).toFixed(1) + '" width="22" height="22" viewBox="0 0 100 100">' + MG.kidFace(j).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>';
        }).join('');
        h = '<svg class="hands" viewBox="0 0 100 100" aria-hidden="true">' + lines + faces + '</svg>';
        if (phase === 'q') return h;
        var badges = [0, 1, 2, 3, 4, 5].map(function (n) {
          return '<span class="ntile' + (phase === 'answer' && (n === 0 || n === 5) ? ' clash' : '') + '">' + n + '</span>';
        }).join('');
        return h + '<div class="tiles">' + badges + '</div>' + (phase === 'answer' ? '<p class="art-formula">' + t('phandsF') + '</p>' : '');
      }
    }
    return '';
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

  function complete() {
    progress.cleared[state.idx] = true;
    if (state.idx < LAST) progress.unlocked = Math.max(progress.unlocked, state.idx + 1);
    save();
  }
  function win() {
    state.done = true;
    if (state.lv.ch === 'think') state.showAnswer = true;
    complete();
    MG.sound.play('win');
    MG.confetti(state.lv.ch === 'nest' ? 'star' : 'candy');
    render();
    var lv = state.lv;
    $('win-face').innerHTML = lv.ch === 'nest' ? skin.item(0) : MG.kidFace(state.idx);
    $('win-tip').textContent = t(lv.tip || ('p' + lv.key + 'A'), nouns()) + (state.idx === LAST ? ' ' + t('pallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    $('win-next').lastChild.textContent = t('nextLevel');
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
    P.CHAPTERS.forEach(function (ch) {
      h += '<h3 class="lv-chapter">' + t(ch.nameKey) + '</h3><div class="levels-grid">';
      P.LEVELS.forEach(function (lv, i) {
        if (P.chapterOf(lv) !== ch.id) return;
        var cls = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.idx ? ' current' : '');
        h += '<button class="' + cls + '" data-lv="' + i + '"' + (i > progress.unlocked ? ' disabled' : '') + ' aria-label="' + t('level', { n: i + 1 }) + '">' +
          (lv.olympiad ? MG.ICONS.trophy : lv.ch === 'read' ? MG.ICONS.book : lv.ch === 'think' ? numInChapter(i) : (i + 1)) + (progress.cleared[i] ? '<small>★</small>' : '') + '</button>';
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
    [['btn-m10', -10], ['btn-m1', -1], ['btn-p1', 1], ['btn-p10', 10]].forEach(function (p) {
      $(p[0]).addEventListener('click', function () { leastStep(p[1]); });
    });
    $('btn-answer').addEventListener('click', leastAnswer);
    $('levels-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (b && !b.disabled) { $('dlg-levels').close(); startLevel(+b.getAttribute('data-lv')); }
    });
    $('win-again').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx); });
    $('win-look').addEventListener('click', lookAgain);
    $('dlg-win').addEventListener('cancel', function (e) { e.preventDefault(); lookAgain(); });
    $('rv-again').addEventListener('click', function () { MG.sound.play('untap'); startLevel(state.idx); });
    $('rv-next').addEventListener('click', function () { MG.sound.play('tap'); startLevel(state.idx + 1); });
    $('win-next').addEventListener('click', function () { $('dlg-win').close(); startLevel(state.idx + 1); });
    $('btn-got').addEventListener('click', function () { complete(); MG.sound.play('tap'); startLevel(state.idx + 1); });
    $('btn-thint').addEventListener('click', function () { state.showHint = !state.showHint; MG.sound.play('hint'); render(); });
    $('btn-reveal').addEventListener('click', revealAnswer);
    $('btn-cardnext').addEventListener('click', function () { MG.sound.play('tap'); startLevel(state.idx + 1); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    root.addEventListener('mg:lang', function () { render(); });
    startLevel(MG.prefs.get('pigeonLevel', 0));
  }

  MG.pigeonDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
