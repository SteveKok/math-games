/*
 * 小棒拼正方形：界面。规则全在 MG.Stick（stick-logic.js）。
 */
(function (root) {
  'use strict';
  var MG = root.MG, S = MG.Stick, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = S.LEVELS.length - 1;
  var SIDE_KEYS = ['stTop', 'stRight', 'stBottom', 'stLeft'];

  /* ---------- 进度 ---------- */
  var KEY = 'mg.stick.v1';
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
  function kind() { return S.kindOf(state.lv); }
  function hue(k) { return 'hsl(' + ((k * 47) % 360) + ' 72% 62%)'; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function sideLen() { return S.sideLen(state.lv.n, 4); }
  function pile() {
    var on = [].concat.apply([], state.sides);
    var out = [];
    for (var k = state.lv.n; k >= 1; k--) if (on.indexOf(k) < 0) out.push(k);
    return out;
  }

  /* ---------- 开始一关 ---------- */
  function startLevel(idx) {
    idx = Math.max(0, Math.min(idx, progress.unlocked, LAST));
    var lv = S.LEVELS[idx];
    state = { idx: idx, lv: lv, sides: [[], [], [], []], sel: null, marks: {}, val: 1,
      fails: 0, hintOn: false, done: false, revealed: false, review: false, status: null };
    MG.prefs.set('stickLevel', idx);
    render();
    root.scrollTo(0, 0);
    if (lv.ch !== 'build') return;
    if (!MG.prefs.get('stickRules', false)) { MG.prefs.set('stickRules', true); openRules(); }
  }

  /* ---------- 画面 ---------- */
  function ask(lv) {
    if (lv.ch === 'read') return t('streadT');
    if (lv.key) return t(lv.key + 'Q');
    var k = kind();
    return k === 'pick' ? t('staskPick', { m: lv.upTo }) : k === 'count' ? t('staskCount', { m: lv.upTo }) : t('staskBuild', { n: lv.n });
  }
  function render() {
    var lv = state.lv, game = lv.ch !== 'read', think = lv.ch === 'think', k = game ? kind() : null;
    $('level-title').textContent = lv.olympiad ? 'OMK 2018 · Muda B1'
      : lv.ch === 'read' ? t('stchRead')
      : think ? t('pthinkN', { n: numInChapter(state.idx) })
      : t('level', { n: state.idx + 1 });
    $('ask').textContent = ask(lv);
    $('oly-card').hidden = !lv.olympiad;
    if (lv.olympiad) {
      $('oly-source').textContent = t('stpolySource');
      $('oly-q').textContent = t('stpolyQ');
      $('oly-note').textContent = t('stpolyNote') + ' ' + t('polyGo');
    }
    $('btn-rules').hidden = lv.ch !== 'build';
    var playing = game && !locked();
    $('game-ctrl').hidden = !game || state.review;
    $('count-ctrl').hidden = !playing || !(k === 'count' || k === 'smallest');
    $('btn-check').hidden = !playing || k !== 'pick';
    // 「做不到！」从第 3 关起，在拼正方形的关卡里一直都在
    $('btn-impossible').hidden = !(playing && k === 'build' && (state.idx >= 2 || think));
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
    $('board').className = 'pboard stick-board';
    $('board').innerHTML = k === 'build' ? buildHtml() : k === 'pick' ? pickHtml() : countHtml();
    if (k === 'count' || k === 'smallest') {
      $('n-val').textContent = state.val;
      $('btn-answer').lastChild.textContent = t('stcountAsk', { n: state.val });
      $('btn-m100').hidden = $('btn-p100').hidden = !(lv.upTo > 500);
    }
    renderReveal();
    paintStatus();
  }

  /** 正方形的样子：四条边上按顺序画出已经放上去的小棒 */
  function squareSvg(sides, n, s) {
    var P = 10, L = 100, h = '<svg class="sq-svg" viewBox="0 0 120 120" aria-hidden="true">';
    h += '<rect x="' + P + '" y="' + P + '" width="' + L + '" height="' + L + '" fill="#fffdf6" stroke="#d6cdb8" stroke-width="5" stroke-dasharray="2 2"/>';
    // 每条边从哪里开始、往哪个方向画（顺时针）
    var starts = [[P, P, 1, 0], [P + L, P, 0, 1], [P + L, P + L, -1, 0], [P, P + L, 0, -1]];
    sides.forEach(function (list, i) {
      var st = starts[i], pos = 0;
      list.forEach(function (k) {
        var a = pos / s * L, b = (pos + k) / s * L;
        var x1 = st[0] + st[2] * a, y1 = st[1] + st[3] * a, x2 = st[0] + st[2] * b, y2 = st[1] + st[3] * b;
        h += '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" stroke="#1d2433" stroke-width="7" stroke-linecap="butt"/>' +
          '<line x1="' + (x1 + st[2] * 0.6).toFixed(2) + '" y1="' + (y1 + st[3] * 0.6).toFixed(2) + '" x2="' + (x2 - st[2] * 0.6).toFixed(2) + '" y2="' + (y2 - st[3] * 0.6).toFixed(2) + '" stroke="' + hue(k) + '" stroke-width="4.6"/>';
        var nx = [0, 1, 0, -1][i], ny = [-1, 0, 1, 0][i];   // 朝外的方向，数字写在边的外侧
        if (n <= 16) h += '<text x="' + ((x1 + x2) / 2 + nx * 7).toFixed(2) + '" y="' + ((y1 + y2) / 2 + ny * 7 + 2.4).toFixed(2) + '" text-anchor="middle" font-size="7" font-weight="800" fill="#1d2433">' + k + '</text>';
        pos += k;
      });
    });
    return h + '</svg>';
  }
  function buildHtml() {
    var lv = state.lv, s = sideLen(), tot = S.total(lv.n), lock = locked();
    var side = s === null ? (tot / 4).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : s;
    var h = '<p class="stdiv">' + t('stdiv', { t: tot, s: side }) + '</p>';
    if (s !== null) h += squareSvg(state.sides, lv.n, s);
    // 小棒堆
    var p = pile(), unit = Math.min(34, 290 / lv.n);
    h += '<div class="pile-sticks">' + p.map(function (k) {
      return '<button class="stick' + (state.sel === k ? ' sel' : '') + '" data-stick="' + k + '" style="width:' + Math.max(30, k * unit) + 'px;background:' + hue(k) + '"' + (lock ? ' disabled' : '') + '>' + k + '</button>';
    }).join('') + '</div>';
    // 四条边：点一下就把选中的小棒放上去
    var unit = s || tot / 4;
    h += '<div class="side-rows">' + state.sides.map(function (list, i) {
      var filled = sum(list), full = s !== null && filled === s;
      return '<div class="side-row' + (full ? ' full' : '') + '"><button class="side-name" data-side="' + i + '"' + (lock ? ' disabled' : '') + '>' + t(SIDE_KEYS[i]) + '</button>' +
        '<div class="track" data-side="' + i + '">' + list.map(function (k) {
          return '<button class="seg" data-ret="' + i + ':' + k + '" style="width:' + (k / unit * 100).toFixed(2) + '%;background:' + hue(k) + '"' + (lock ? ' disabled' : '') + '>' + k + '</button>';
        }).join('') + '</div><b class="side-sum">' + filled + (s !== null ? '/' + s : '') + '</b></div>';
    }).join('') + '</div>';
    return h;
  }
  function pickHtml() {
    var lv = state.lv, h = '<div class="pick-grid">';
    for (var n = 1; n <= lv.upTo; n++) {
      var on = !!state.marks[n];
      h += '<button class="pick' + (on ? ' on' : '') + '" data-pick="' + n + '" aria-pressed="' + on + '"' + (locked() ? ' disabled' : '') + '>' + n + '</button>';
    }
    return h + '</div>';
  }
  function countHtml() {
    // 一个小提示画：n = 8 的拼法（配对）
    return '<div class="count-art">' + squareSvg(S.pairing(8), 8, 9) + '<p class="stdiv">1 + 8 · 2 + 7 · 3 + 6 · 4 + 5</p></div>';
  }
  function paintStatus() {
    var el = $('status'), k = kind();
    if (state.review) { el.textContent = ''; return; }
    if (state.status) { el.textContent = t(state.status.key, state.status.vars); el.className = 'status ' + state.status.kind; return; }
    if (state.hintOn && state.lv.hint) { el.textContent = t(state.lv.hint); el.className = 'status info'; return; }
    el.className = 'status soft';
    el.textContent = k === 'build' ? (state.sel ? t('stselected', { k: state.sel }) : t('stpick')) : k === 'pick' ? t('stpickTap') : '';
  }
  function renderReveal() {
    var lv = state.lv, h = '';
    if (lv.ch === 'think') {
      var all = state.revealed || state.review;
      if (state.hintOn || all) h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.key + 'H') + '</p>';
      if (all) h += '<p class="reveal answer-box"><b>' + t('panswerLabel') + '</b>' + t(lv.key + 'A') + '</p>';
      if (state.revealed && state.idx === LAST) h += '<p class="reveal answer-box">' + t('stallClear') + '</p>';
    } else if (state.review) {
      h += '<p class="reveal hint-box"><b>' + t('pshowHint') + '</b>' + t(lv.hint) + '</p>' +
        '<p class="reveal answer-box"><b>' + t('pexplain') + '</b>' + t(lv.tip) + '</p>';
    }
    $('reveal').innerHTML = h;
    $('reveal').hidden = !h;
  }

  /* --- 「高斯求和」：没有游戏的一页 --- */
  function renderRead() {
    var paras = t('streadB').split('\n'), para = function (x) { return '<p class="lesson-text">' + x + '</p>'; };
    $('board').className = 'pboard read-board';
    $('board').innerHTML = '<div class="lesson">' + MG.portrait('gauss') + para(paras[0]) + para(paras[1]) +
      '<div class="read-squares"><figure>' + squareSvg(S.pairing(8), 8, 9) + '<figcaption>n = 8</figcaption></figure>' +
      '<figure>' + squareSvg(S.pairing(15), 15, 30) + '<figcaption>n = 15</figcaption></figure></div>' +
      paras.slice(2).map(para).join('') + '</div>';
    $('reveal').hidden = true;
    $('status').textContent = '';
  }

  /* ---------- 操作 ---------- */
  function pickStick(k) {
    if (locked()) return;
    state.sel = state.sel === k ? null : k;
    state.status = null;
    MG.sound.play('tap');
    render();
  }
  function placeOn(i) {
    if (locked() || !state.sel) return;
    var s = sideLen(), room = (s === null ? S.total(state.lv.n) / 4 : s) - sum(state.sides[i]);
    if (state.sel > room) {
      state.fails++;
      state.status = { key: 'stnoRoom', vars: { r: Math.max(0, Math.round(room * 100) / 100) }, kind: 'warn' };
      MG.sound.play('untap');
      return render();
    }
    state.sides[i].push(state.sel);
    state.sel = null; state.status = null;
    MG.sound.play('take');
    if (!pile().length && s !== null && state.sides.every(function (l) { return sum(l) === s; })) return win();
    render();
  }
  function takeBack(i, k) {
    if (locked()) return;
    var l = state.sides[i], at = l.indexOf(k);
    if (at >= 0) l.splice(at, 1);
    state.sel = null; state.status = null;
    MG.sound.play('untap');
    render();
  }
  function togglePick(n) {
    if (locked()) return;
    state.marks[n] = !state.marks[n];
    state.status = null;
    MG.sound.play(state.marks[n] ? 'tap' : 'untap');
    render();
  }
  function checkPick() {
    if (locked()) return;
    var wrong = 0;
    for (var n = 1; n <= state.lv.upTo; n++) if (!!state.marks[n] !== S.possible(n, 4)) wrong++;
    if (!wrong) return win();
    fail('stpickWrong', { k: wrong });
  }
  function answerCount() {
    if (locked()) return;
    if (state.val === S.answerOf(state.lv)) return win();
    fail('stnoCount', { n: state.val });
  }
  function fail(key, vars) {
    state.fails++;
    state.status = { key: key, vars: vars, kind: 'warn' };
    MG.sound.play('untap');
    render();
  }
  function pressImpossible() {
    if (locked()) return;
    if (!S.possible(state.lv.n, 4)) return win();
    fail('pcanDo');
  }
  function win() {
    state.done = true; state.sel = null;
    complete();
    MG.sound.play('win');
    MG.confetti('star');
    state.status = null;
    render();
    var lv = state.lv, k = kind(), s = lv.n ? S.sideLen(lv.n, 4) : null;
    $('win-face').innerHTML = k === 'build' && s !== null ? squareSvg(state.sides, lv.n, s)
      : '<div class="win-plus"><b>' + (k === 'pick' ? '7 · 8 · 15 · 16 · 23 · 24' : k === 'build' ? '?' : state.val) + '</b></div>';
    $('win-tip').textContent = (lv.tip ? t(lv.tip) : t(lv.key + 'A')) + (state.idx === LAST ? ' ' + t('stallClear') : '');
    $('win-next').hidden = state.idx === LAST;
    setTimeout(function () { $('dlg-win').showModal(); }, MG.reducedMotion() ? 0 : 450);
  }
  function useHint() { state.hintOn = true; state.status = null; MG.sound.play('hint'); render(); }
  function revealAnswer() {
    var lv = state.lv, k = kind();
    if (state.revealed) return;
    state.revealed = true; state.hintOn = true; state.status = null; state.sel = null;
    if (k === 'build' && S.possible(lv.n, 4)) state.sides = S.pairing(lv.n);
    else if (k === 'count' || k === 'smallest') state.val = S.answerOf(lv);
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
    var art = ['<svg viewBox="0 0 60 40"><line x1="4" y1="20" x2="26" y2="20" stroke="' + hue(3) + '" stroke-width="8"/><line x1="26" y1="20" x2="56" y2="20" stroke="' + hue(5) + '" stroke-width="8"/></svg>',
      squareSvg(S.pairing(7), 7, 7), '<span class="nope-demo">' + MG.ICONS.nope + '</span>'];
    $('rules-list').innerHTML = ['strules1', 'strules2', 'strules3'].map(function (k, i) {
      return '<li><span class="rule-art">' + art[i] + '</span><span>' + t(k) + '</span></li>';
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
      var r = e.target.closest('[data-ret]');
      if (r && !r.disabled) { var p = r.getAttribute('data-ret').split(':'); return takeBack(+p[0], +p[1]); }
      var st = e.target.closest('[data-stick]');
      if (st && !st.disabled) return pickStick(+st.getAttribute('data-stick'));
      var sd = e.target.closest('[data-side]');
      if (sd && !sd.disabled) return placeOn(+sd.getAttribute('data-side'));
      var pk = e.target.closest('[data-pick]');
      if (pk && !pk.disabled) togglePick(+pk.getAttribute('data-pick'));
    });
    [['btn-m100', -100], ['btn-m10', -10], ['btn-m1', -1], ['btn-p1', 1], ['btn-p10', 10], ['btn-p100', 100]].forEach(function (p) {
      $(p[0]).addEventListener('click', function () {
        if (locked()) return;
        state.val = Math.max(1, state.val + p[1]); state.status = null;
        MG.sound.play(p[1] > 0 ? 'tap' : 'untap'); render();
      });
    });
    $('btn-answer').addEventListener('click', answerCount);
    $('btn-check').addEventListener('click', checkPick);
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
    startLevel(MG.prefs.get('stickLevel', 0));
  }

  MG.stickDebug = { start: startLevel, state: function () { return state; }, progress: function () { return progress; } };
  init();
})(window);
