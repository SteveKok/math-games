/*
 * 取石子（Nim）界面。规则全部来自 nim-logic.js；这里只管画图、动画和交互。
 * 皮肤只决定 item 的 SVG，换皮肤不影响任何规则。
 */
(function (root) {
  'use strict';
  var MG = root.MG, Nim = MG.Nim, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };

  var PROGRESS_KEY = 'mg.nim.v1';
  var progress = MG.store.get(PROGRESS_KEY, null);
  if (!progress || typeof progress !== 'object') progress = {};
  progress.unlocked = Math.min(Math.max(progress.unlocked | 0, 0), Nim.LEVELS.length - 1);
  progress.cleared = progress.cleared && typeof progress.cleared === 'object' ? progress.cleared : {};
  function saveProgress() { MG.store.set(PROGRESS_KEY, progress); }

  var GLASSES_FROM = 4; // 第 5 关（第一次 3 堆）起给「分组眼镜」

  var state = {
    level: Math.min(Math.max(MG.prefs.get('nimLevel', progress.unlocked) | 0, 0), progress.unlocked),
    piles: [],          // 每堆是 [{seed}]，seed 决定形状，拿走别的也不会变
    turn: 'kid',        // kid | cpu | over
    sel: null,          // { pile, from }：选中 from 到这一堆末尾
    busy: false,
    losses: 0,
    bubble: { key: 'yourTurn' },
    skin: MG.getSkin(MG.prefs.get('skin', 'candy')).id,
    glasses: !!MG.prefs.get('nimGlasses', false),
    hintMove: null,
    uid: 0
  };

  var board = $('board');

  /* ---------- 头像（代码绘制） ---------- */
  var ROBOT = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#dbe8ff"/>' +
    '<line x1="32" y1="8" x2="32" y2="16" stroke="#1d2433" stroke-width="3"/><circle cx="32" cy="7" r="4" fill="#ff5d73" stroke="#1d2433" stroke-width="2"/>' +
    '<rect x="12" y="16" width="40" height="34" rx="10" fill="#3a86ff" stroke="#1d2433" stroke-width="3"/>' +
    '<rect x="18" y="23" width="28" height="14" rx="7" fill="#fff"/><circle cx="25" cy="30" r="3.5" fill="#1d2433"/><circle cx="39" cy="30" r="3.5" fill="#1d2433"/>' +
    '<path d="M24 43h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
  var KID = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#fff1d6"/>' +
    '<circle cx="32" cy="36" r="20" fill="#ffcf9e" stroke="#1d2433" stroke-width="3"/>' +
    '<path d="M12 32c2-14 12-20 20-20s18 6 20 20c-6-6-14-8-20-8s-14 2-20 8z" fill="#3b2a20" stroke="#1d2433" stroke-width="2"/>' +
    '<circle cx="25" cy="37" r="3" fill="#1d2433"/><circle cx="39" cy="37" r="3" fill="#1d2433"/>' +
    '<circle cx="20" cy="44" r="3" fill="#ff9aa8"/><circle cx="44" cy="44" r="3" fill="#ff9aa8"/>' +
    '<path d="M26 46q6 5 12 0" fill="none" stroke="#1d2433" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var ROBOT_HAPPY = ROBOT.replace('M24 43h16', 'M23 41q9 7 18 0');
  var KID_STAR = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<polygon points="32,3 40,23 61,24 45,37 50,58 32,47 14,58 19,37 3,24 24,23" fill="#ffd23f" stroke="#1d2433" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="26" cy="30" r="2.6" fill="#1d2433"/><circle cx="38" cy="30" r="2.6" fill="#1d2433"/>' +
    '<path d="M25 37q7 6 14 0" fill="none" stroke="#1d2433" stroke-width="2.6" stroke-linecap="round"/></svg>';
  $('cpu-avatar').innerHTML = ROBOT;
  $('kid-avatar').innerHTML = KID;
  $('win-face').innerHTML = KID_STAR;
  $('lose-face').innerHTML = ROBOT_HAPPY;

  /* ---------- 工具 ---------- */
  function counts() { return state.piles.map(function (p) { return p.length; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, MG.reducedMotion() ? Math.min(ms, 200) : ms); }); }
  function levelDef() { return Nim.LEVELS[state.level]; }
  function glassesOn() { return state.glasses && state.level >= GLASSES_FROM; }
  function newSeed() { return (Math.random() * 4294967296) >>> 0; }
  function nextUid() { return ++state.uid; }

  function setBubble(key, vars) { state.bubble = { key: key, vars: vars }; $('cpu-bubble').textContent = t(key, vars); }

  function setTurn(turn) {
    state.turn = turn;
    $('cpu-row').classList.toggle('active', turn === 'cpu');
    $('kid-row').classList.toggle('active', turn === 'kid');
    board.classList.toggle('locked', turn !== 'kid' || state.busy);
  }

  /* ---------- 绘制 ---------- */
  function itemSize() {
    var max = Math.max.apply(null, levelDef().piles);
    var w = board.clientWidth || root.innerWidth - 32;
    var small = root.innerWidth <= 520;
    var gap = small ? 3 : 6;
    var reserved = (small ? 34 + 6 + 10 + 12 : 44 + 10 + 16 + 24) + (glassesOn() ? 4 * 12 : 0);
    var s = Math.floor((w - reserved - (max - 1) * (gap + 4)) / max);
    return Math.max(42, Math.min(88, s)); // 太窄时宁可换行，也要保证手指点得准
  }

  function renderPile(pile, i, skin, opts) {
    var n = pile.length;
    var el = document.createElement('div');
    el.className = 'pile' + (n ? '' : ' empty');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t('pileLabel', { n: i + 1, c: n }));
    var html = '<span class="count" aria-hidden="true">' + n + '</span><div class="items">';
    var groups = opts.glasses ? Nim.splitPowers(n) : (n ? [n] : []);
    var k = 0;
    groups.forEach(function (size) {
      html += '<span class="group"' + (opts.glasses ? ' data-size="' + size + '"' : '') + '>';
      for (var g = 0; g < size; g++, k++) {
        var it = pile[k];
        html += opts.static
          ? '<span class="item">' + skin.draw(it.seed, it.uid) + '</span>'
          : '<button class="item" data-pile="' + i + '" data-idx="' + k + '" aria-label="' + t('itemLabel') + ' (' + (n - k) + ')">' + skin.draw(it.seed, it.uid) + '</button>';
      }
      html += '</span>';
    });
    el.innerHTML = html + '</div>';
    return el;
  }

  function render() {
    var skin = MG.getSkin(state.skin);
    board.innerHTML = '';
    board.style.setProperty('--item', itemSize() + 'px');
    $('game').classList.toggle('glasses-on', glassesOn());
    state.piles.forEach(function (pile, i) { board.appendChild(renderPile(pile, i, skin, { glasses: glassesOn() })); });
    paintSelection();
  }

  function paintSelection() {
    var sel = state.sel;
    board.querySelectorAll('.item').forEach(function (el) {
      var p = +el.dataset.pile, k = +el.dataset.idx;
      var on = !!sel && p === sel.pile && k >= sel.from;
      el.classList.toggle('selected', on && state.turn === 'kid');
      el.classList.toggle('cpu-pick', on && state.turn === 'cpu');
      var hm = state.hintMove;
      el.classList.toggle('hint', !!hm && p === hm.pile && k >= state.piles[p].length - hm.count);
    });
    var n = sel ? state.piles[sel.pile].length - sel.from : 0;
    $('btn-take').disabled = !(state.turn === 'kid' && !state.busy && n > 0);
    $('take-label').textContent = n > 0 ? t('takeN', { n: n }) : t('take');
  }

  function paintChrome() {
    $('level-title').textContent = t('level', { n: state.level + 1 });
    $('cpu-bubble').textContent = t(state.bubble.key, state.bubble.vars);
    var skinBtn = $('btn-skin');
    skinBtn.innerHTML = MG.getSkin(state.skin).draw(7, 'btn');
    $('btn-glasses').hidden = state.level < GLASSES_FROM;
    $('btn-glasses').setAttribute('aria-pressed', String(state.glasses));
    $('btn-glasses').classList.toggle('hint', state.level === GLASSES_FROM && !progress.cleared[state.level] && !state.glasses);
    $('btn-hint').hidden = !(state.losses >= 2 && state.turn === 'kid');
    paintSelection();
  }

  /* ---------- 流程 ---------- */
  function startLevel(idx, keepLosses) {
    state.level = idx;
    MG.prefs.set('nimLevel', idx);
    if (!keepLosses) state.losses = 0;
    state.piles = levelDef().piles.map(function (n) {
      var arr = [];
      for (var i = 0; i < n; i++) arr.push({ seed: newSeed(), uid: nextUid() });
      return arr;
    });
    state.sel = null; state.hintMove = null; state.busy = false;
    setTurn('kid');
    setBubble(idx === 0 && !progress.cleared[0] ? 'howTo' : 'yourTurn');
    if (idx === GLASSES_FROM && !progress.cleared[idx]) state.glasses = false;
    render(); paintChrome();
    // 第一关：轻轻闪一下，告诉孩子「可以点这里」
    if (idx === 0 && !progress.cleared[0]) {
      var first = board.querySelector('.pile .item:last-child');
      if (first) first.classList.add('hint');
    }
  }

  function flyAway(els, dir) {
    if (!els.length) return Promise.resolve();
    var anims = els.map(function (el, i) {
      el.classList.add('fly');
      if (!el.animate || MG.reducedMotion()) { el.style.opacity = 0; return Promise.resolve(); }
      var rot = (Math.random() - 0.5) * 120;
      var a = el.animate([
        { transform: 'translateY(-8px) scale(1.06)', opacity: 1 },
        { transform: 'translate(' + ((Math.random() - 0.5) * 60) + 'px,' + (dir * 40) + 'px) scale(1.2)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + ((Math.random() - 0.5) * 120) + 'px,' + (dir * 260) + 'px) rotate(' + rot + 'deg) scale(.3)', opacity: 0 }
      ], { duration: 520, delay: i * 45, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'forwards' });
      return a.finished.catch(function () {});
    });
    return Promise.all(anims);
  }

  function doMove(move, who) {
    var pileEls = board.querySelectorAll('.pile')[move.pile];
    var all = pileEls.querySelectorAll('.item');
    var n = state.piles[move.pile].length;
    var els = Array.prototype.slice.call(all, n - move.count);
    MG.sound.play(who === 'kid' ? 'take' : 'cpu');
    return flyAway(els, who === 'kid' ? 1 : -1).then(function () {
      // 规则只在这里生效：用 Nim.applyMove 校验并计算新局面
      var next = Nim.applyMove(counts(), move);
      state.piles[move.pile].length = next[move.pile];
      state.sel = null; state.hintMove = null;
      render();
      return Nim.isOver(next);
    });
  }

  function kidTake() {
    if (state.turn !== 'kid' || state.busy || !state.sel) return;
    var n = state.piles[state.sel.pile].length;
    var move = { pile: state.sel.pile, count: n - state.sel.from };
    if (!Nim.isLegal(counts(), move.pile, move.count)) return;
    state.busy = true; setTurn('kid'); paintChrome();
    doMove(move, 'kid').then(function (over) {
      if (over) return win();
      return cpuTurn();
    });
  }

  function cpuTurn() {
    state.busy = true;
    setTurn('cpu'); paintChrome();
    setBubble('cpuThinking');
    var move;
    return wait(750).then(function () {
      move = Nim.computerMove(counts(), levelDef().skill);
      state.sel = { pile: move.pile, from: state.piles[move.pile].length - move.count };
      paintSelection();
      MG.sound.play('tap');
      return wait(850);
    }).then(function () {
      return doMove(move, 'cpu');
    }).then(function (over) {
      setBubble('cpuTook', { n: move.count });
      if (over) return lose();
      state.busy = false;
      setTurn('kid'); paintChrome();
      return wait(900).then(function () {
        if (state.turn === 'kid' && !state.busy && state.bubble.key === 'cpuTook') setBubble('yourTurn');
      });
    });
  }

  function win() {
    state.busy = false; setTurn('over');
    var idx = state.level, last = idx === Nim.LEVELS.length - 1;
    progress.cleared[idx] = true;
    if (!last) progress.unlocked = Math.max(progress.unlocked, idx + 1);
    if (last) progress.allClear = true;
    saveProgress();
    MG.sound.play('win');
    MG.confetti(state.skin === 'star' ? 'star' : 'candy');
    $('win-tip').textContent = last ? t('allClear') : t(levelDef().tip);
    $('win-next').hidden = last;
    $('win-math').hidden = !last;
    $('win-math').classList.toggle('secondary', !last);
    openDialog('dlg-win');
  }

  function lose() {
    state.busy = false; setTurn('over');
    state.losses++;
    MG.sound.play('lose');
    openDialog('dlg-lose');
  }

  /* ---------- 弹窗 ---------- */
  function openDialog(id) {
    var d = $(id);
    MG.i18n.apply(d);
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  }
  function closeDialog(id) {
    var d = $(id);
    if (d.close) { if (d.open) d.close(); } else d.removeAttribute('open');
  }
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeDialog(d.id);
    });
  });
  // 用 Esc 关掉结果弹窗时，直接重开这一关
  ['dlg-win', 'dlg-lose'].forEach(function (id) {
    $(id).addEventListener('close', function () { if (state.turn === 'over') startLevel(state.level, true); });
  });

  function openLevels() {
    var grid = $('levels-grid');
    grid.innerHTML = '';
    Nim.LEVELS.forEach(function (lv, i) {
      var b = document.createElement('button');
      b.className = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.level ? ' current' : '');
      b.disabled = i > progress.unlocked;
      b.innerHTML = (i + 1) + '<small>' + lv.piles.map(function () { return '●'; }).join('') + '</small>';
      b.setAttribute('aria-label', t('level', { n: i + 1 }));
      b.addEventListener('click', function () { closeDialog('dlg-levels'); startLevel(i); });
      grid.appendChild(b);
    });
    var row = $('skin-row');
    row.innerHTML = '';
    MG.SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'skin-btn';
      b.setAttribute('aria-pressed', String(s.id === state.skin));
      b.innerHTML = s.draw(3, 'pick' + s.id) + '<span>' + t(s.nameKey) + '</span>';
      b.addEventListener('click', function () { setSkin(s.id); openLevels(); });
      row.appendChild(b);
    });
    $('levels-math').hidden = !progress.allClear;
    openDialog('dlg-levels');
  }

  function openMath() {
    var body = $('math-body');
    body.innerHTML = t('math');
    var skin = MG.getSkin(state.skin);
    body.querySelectorAll('[data-math-demo]').forEach(function (holder) {
      holder.className = 'demo glasses-on';
      holder.setAttribute('aria-hidden', 'true');
      holder.getAttribute('data-math-demo').split(',').forEach(function (s, i) {
        var pile = [];
        for (var k = 0; k < +s; k++) pile.push({ seed: 100 + i * 10 + k, uid: 'demo' + i + '_' + k });
        holder.appendChild(renderPile(pile, i, skin, { glasses: true, static: true }));
      });
    });
    openDialog('dlg-math');
  }

  function setSkin(id) {
    state.skin = id; MG.prefs.set('skin', id);
    render(); paintChrome();
  }

  /* ---------- 事件 ---------- */
  board.addEventListener('click', function (e) {
    var el = e.target.closest('.item');
    if (!el || state.turn !== 'kid' || state.busy) return;
    var p = +el.dataset.pile, k = +el.dataset.idx;
    board.querySelectorAll('.item.hint').forEach(function (h) { h.classList.remove('hint'); });
    state.hintMove = null;
    if (state.sel && state.sel.pile === p && state.sel.from === k) {
      state.sel = null; MG.sound.play('untap');
    } else {
      state.sel = { pile: p, from: k }; MG.sound.play('tap');
      // 重新触发弹跳动画
      board.querySelectorAll('.item.selected').forEach(function (s) { s.classList.remove('selected'); });
      void board.offsetWidth;
    }
    paintSelection();
  });

  $('btn-take').addEventListener('click', kidTake);
  $('btn-levels').addEventListener('click', openLevels);
  $('levels-math').addEventListener('click', function () { closeDialog('dlg-levels'); openMath(); });
  $('btn-skin').addEventListener('click', function () {
    var i = MG.SKINS.findIndex(function (s) { return s.id === state.skin; });
    setSkin(MG.SKINS[(i + 1) % MG.SKINS.length].id);
    MG.sound.play('tap');
  });
  $('btn-glasses').addEventListener('click', function () {
    state.glasses = !state.glasses; MG.prefs.set('nimGlasses', state.glasses);
    MG.sound.play('tap');
    render(); paintChrome();
  });
  $('btn-hint').addEventListener('click', function () {
    if (state.turn !== 'kid' || state.busy) return;
    var moves = Nim.winningMoves(counts());
    MG.sound.play('hint');
    if (!moves.length) { setBubble('hintNone'); return; }
    var m = moves[0];
    state.hintMove = m;
    state.sel = { pile: m.pile, from: state.piles[m.pile].length - m.count };
    paintSelection();
  });
  $('win-again').addEventListener('click', function () { var l = state.level; state.turn = 'kid'; closeDialog('dlg-win'); startLevel(l); });
  $('win-next').addEventListener('click', function () { var l = state.level + 1; state.turn = 'kid'; closeDialog('dlg-win'); startLevel(l); });
  $('win-math').addEventListener('click', function () { state.turn = 'kid'; closeDialog('dlg-win'); startLevel(state.level); openMath(); });
  $('lose-again').addEventListener('click', function () { state.turn = 'kid'; closeDialog('dlg-lose'); startLevel(state.level, true); });

  var resizeTimer;
  root.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (!state.busy) render(); }, 120);
  });
  root.addEventListener('mg:lang', function () { render(); paintChrome(); });

  MG.setupTopbar();
  startLevel(state.level);

  // 方便调试：在控制台里看局面
  MG.nimDebug = { state: state, counts: counts, startLevel: startLevel };
})(window);
