/*
 * 说谎者与诚实者：界面。题目、判断全部来自 liar-logic.js。
 */
(function (root) {
  'use strict';
  var MG = root.MG, Liar = MG.Liar, t = MG.i18n.t;
  var $ = function (id) { return document.getElementById(id); };

  var PROGRESS_KEY = 'mg.liar.v1';
  var progress = MG.store.get(PROGRESS_KEY, null);
  if (!progress || typeof progress !== 'object') progress = {};
  progress.unlocked = Math.min(Math.max(progress.unlocked | 0, 0), Liar.LEVELS.length - 1);
  progress.cleared = progress.cleared && typeof progress.cleared === 'object' ? progress.cleared : {};
  function saveProgress() { MG.store.set(PROGRESS_KEY, progress); }

  var state = {
    level: Math.min(Math.max(MG.prefs.get('liarLevel', progress.unlocked) | 0, 0), progress.unlocked),
    puzzle: null,      // { statements, solution }
    chars: [],         // [{ color, seed }]，第 i 个角色说第 i 句话
    labels: [],        // null | 'H' | 'L'
    locked: [],        // 提示确定下来的角色
    marks: null,       // 检查后的 ✓/✗；改动后清空
    fails: 0,
    skin: MG.getLiarSkin(MG.prefs.get('liarSkin', 'monster')).id,
    done: false
  };

  var MARK_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#13a36b"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var MARK_BAD = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ff5d73"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

  function names() { return t('liarNames').split(','); }
  function nameOf(i) { return names()[state.chars[i].color] || ('#' + (i + 1)); }
  function skin() { return MG.getLiarSkin(state.skin); }
  function levelDef() { return Liar.LEVELS[state.level]; }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  /* ---------- 一句话 → 带小头像的 HTML ---------- */
  function face(i) {
    return '<span class="tok">' + skin().mini(state.chars[i].color) + '<b>' + nameOf(i) + '</b></span>';
  }
  function statementHTML(st) {
    var map = {
      a: st.a != null ? face(st.a) : '',
      b: st.b != null ? face(st.b) : '',
      n: '<b class="num">' + st.n + '</b>',
      H: '<span class="tag h">' + t('chipH') + '</span>',
      L: '<span class="tag l">' + t('chipL') + '</span>',
      Ls: '<span class="tag l">' + t('chipLs') + '</span>'
    };
    return t('st_' + st.type).replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ''; });
  }

  /* ---------- 绘制 ---------- */
  function render() {
    var cast = $('cast');
    var n = state.chars.length;
    cast.setAttribute('data-n', n);
    cast.innerHTML = '';
    state.puzzle.statements.forEach(function (st, i) {
      var label = state.labels[i];
      var mark = state.marks ? state.marks[i] : null;
      var card = document.createElement('div');
      card.className = 'who' + (mark === true ? ' good' : '') + (mark === false ? ' bad' : '') + (state.locked[i] ? ' locked' : '');
      card.innerHTML =
        '<div class="say">' + statementHTML(st) + '</div>' +
        '<button class="fig" data-i="' + i + '" aria-label="' + t('pickFor', { name: nameOf(i) }) + '">' +
          skin().draw(state.chars[i].color, label, state.chars[i].seed) + '</button>' +
        '<div class="name">' + nameOf(i) + '</div>' +
        '<div class="pick" role="group" aria-label="' + t('pickFor', { name: nameOf(i) }) + '">' +
          '<button class="chip h" data-i="' + i + '" data-v="H" aria-pressed="' + (label === 'H') + '"' + (state.locked[i] ? ' disabled' : '') + '>' + MG.ICONS.halo + '<span>' + t('honest') + '</span></button>' +
          '<button class="chip l" data-i="' + i + '" data-v="L" aria-pressed="' + (label === 'L') + '"' + (state.locked[i] ? ' disabled' : '') + '>' + MG.ICONS.horns + '<span>' + t('liar') + '</span></button>' +
        '</div>' +
        (mark === null ? '' : '<span class="mark">' + (mark ? MARK_OK : MARK_BAD) + '</span>');
      cast.appendChild(card);
    });
    paintChrome();
  }

  function paintChrome() {
    $('level-title').textContent = t('level', { n: state.level + 1 });
    $('btn-skin').innerHTML = skin().draw(1, 'H', 3);
    $('btn-check').disabled = state.done || state.labels.some(function (l) { return !l; });
    $('btn-hint').hidden = state.fails < 2 || state.done;
  }

  function setStatus(key, vars) {
    state.status = key ? { key: key, vars: vars } : null;
    $('status').textContent = key ? t(key, vars) : '';
  }

  /* ---------- 流程 ---------- */
  function newPuzzle(idx) {
    if (idx != null) { state.level = idx; MG.prefs.set('liarLevel', idx); }
    var lv = levelDef();
    state.puzzle = Liar.generate(lv);
    var colors = shuffle([0, 1, 2, 3]).slice(0, lv.n).sort();
    state.chars = colors.map(function (c) { return { color: c, seed: (Math.random() * 4294967296) >>> 0 }; });
    state.labels = state.chars.map(function () { return null; });
    state.locked = state.chars.map(function () { return false; });
    state.marks = null; state.fails = 0; state.done = false;
    setStatus(null);
    render();
  }

  function setLabel(i, v) {
    if (state.done || state.locked[i]) return;
    state.labels[i] = state.labels[i] === v ? null : v;
    state.marks = null;
    setStatus(null);
    MG.sound.play(state.labels[i] ? 'tap' : 'untap');
    render();
  }

  function doCheck() {
    if (state.done || state.labels.some(function (l) { return !l; })) return;
    var h = state.labels.map(function (l) { return l === 'H'; });
    state.marks = Liar.check(state.puzzle.statements, h);
    var bad = state.marks.filter(function (m) { return !m; }).length;
    if (bad === 0) {
      // 唯一解：所有人都说得通，一定就是答案
      state.done = true;
      render();
      return win();
    }
    state.fails++;
    MG.sound.play('lose');
    setStatus(bad === 1 ? 'liarWrongOne' : 'liarWrong', { n: bad });
    render();
  }

  function giveHint() {
    if (state.done) return;
    var sol = state.puzzle.solution;
    for (var i = 0; i < sol.length; i++) {
      var right = sol[i] ? 'H' : 'L';
      if (!state.locked[i] && state.labels[i] !== right) {
        state.labels[i] = right; state.locked[i] = true; state.marks = null;
        MG.sound.play('hint');
        setStatus('liarHintUsed');
        render();
        return;
      }
    }
    // 都已经选对了：直接检查
    doCheck();
  }

  function win() {
    var idx = state.level, last = idx === Liar.LEVELS.length - 1;
    progress.cleared[idx] = true;
    if (!last) progress.unlocked = Math.max(progress.unlocked, idx + 1);
    if (last) progress.allClear = true;
    saveProgress();
    MG.sound.play('win');
    MG.confetti('star');
    setStatus(null);
    $('win-tip').textContent = last ? t('lallClear') : t(levelDef().tip);
    $('win-next').hidden = last;
    $('win-math').hidden = !last;
    setTimeout(function () { openDialog('dlg-win'); }, MG.reducedMotion() ? 100 : 700);
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
    d.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDialog(d.id); });
  });

  function openRules() {
    var sk = skin();
    $('lrule-art-1').innerHTML = sk.draw(2, 'H', 11) + MARK_OK;
    $('lrule-art-2').innerHTML = sk.draw(0, 'L', 12) + MARK_BAD;
    $('lrule-art-3').innerHTML = '<span class="chip-demo h">' + MG.ICONS.halo + '</span><span class="chip-demo l">' + MG.ICONS.horns + '</span>';
    $('lrule-art-4').innerHTML = '<span class="one">1</span>';
    MG.prefs.set('liarRulesSeen', true);
    openDialog('dlg-rules');
  }

  function openLevels() {
    var grid = $('levels-grid');
    grid.innerHTML = '';
    Liar.LEVELS.forEach(function (lv, i) {
      var b = document.createElement('button');
      b.className = 'lv-btn' + (progress.cleared[i] ? ' done' : '') + (i === state.level ? ' current' : '');
      b.disabled = i > progress.unlocked;
      b.innerHTML = (i + 1) + '<small>' + new Array(lv.n + 1).join('●') + '</small>';
      b.setAttribute('aria-label', t('level', { n: i + 1 }));
      b.addEventListener('click', function () { closeDialog('dlg-levels'); newPuzzle(i); });
      grid.appendChild(b);
    });
    var row = $('skin-row');
    row.innerHTML = '';
    MG.LIAR_SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'skin-btn';
      b.setAttribute('aria-pressed', String(s.id === state.skin));
      b.innerHTML = s.draw(1, null, 5) + '<span>' + t(s.nameKey) + '</span>';
      b.addEventListener('click', function () { setSkin(s.id); openLevels(); });
      row.appendChild(b);
    });
    $('levels-math').hidden = !progress.allClear;
    openDialog('dlg-levels');
  }

  function openMath() {
    $('math-body').innerHTML = t('lmath');
    openDialog('dlg-math');
  }

  function setSkin(id) { state.skin = id; MG.prefs.set('liarSkin', id); render(); }

  /* ---------- 事件 ---------- */
  $('cast').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (chip) return setLabel(+chip.dataset.i, chip.dataset.v);
    var fig = e.target.closest('.fig');
    if (fig) {
      // 点角色本身：未选 → 诚实 → 说谎 → 未选
      var i = +fig.dataset.i, cur = state.labels[i];
      if (state.locked[i] || state.done) return;
      setLabel(i, cur === null ? 'H' : cur === 'H' ? 'L' : cur);
    }
  });
  $('btn-check').addEventListener('click', doCheck);
  $('btn-hint').addEventListener('click', giveHint);
  $('btn-new').addEventListener('click', function () { MG.sound.play('tap'); newPuzzle(); });
  $('btn-rules').addEventListener('click', function () { MG.sound.play('tap'); openRules(); });
  $('btn-levels').addEventListener('click', openLevels);
  $('btn-skin').addEventListener('click', function () {
    var i = MG.LIAR_SKINS.findIndex(function (s) { return s.id === state.skin; });
    setSkin(MG.LIAR_SKINS[(i + 1) % MG.LIAR_SKINS.length].id);
    MG.sound.play('tap');
  });
  $('levels-math').addEventListener('click', function () { closeDialog('dlg-levels'); openMath(); });
  $('win-again').addEventListener('click', function () { closeDialog('dlg-win'); newPuzzle(); });
  $('win-next').addEventListener('click', function () { closeDialog('dlg-win'); newPuzzle(state.level + 1); });
  $('win-math').addEventListener('click', function () { closeDialog('dlg-win'); newPuzzle(); openMath(); });
  // Esc 关掉通关弹窗：换一道新题
  $('dlg-win').addEventListener('close', function () { if (state.done) newPuzzle(); });
  root.addEventListener('mg:lang', function () {
    render();
    if (state.status) setStatus(state.status.key, state.status.vars);
  });

  $('win-face').innerHTML = MG.getLiarSkin('monster').draw(3, 'H', 8);
  MG.setupTopbar();
  newPuzzle(state.level);
  if (!MG.prefs.get('liarRulesSeen', false)) openRules();

  MG.liarDebug = { state: state, newPuzzle: newPuzzle };
})(window);
