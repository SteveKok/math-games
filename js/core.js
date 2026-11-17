/*
 * 所有游戏共用的小工具：本地存储、伪随机数、多语言、音效。
 * 用普通 <script> 加载（不用 ES module），这样双击 index.html（file://）也能玩。
 */
(function (root) {
  'use strict';
  var MG = root.MG = root.MG || {};

  /* ---------- 本地存储（只存在本机浏览器里，读写都包 try/catch） ---------- */
  MG.store = {
    get: function (key, fallback) {
      try {
        var raw = root.localStorage.getItem(key);
        if (raw == null) return fallback;
        var val = JSON.parse(raw);
        return val == null ? fallback : val;
      } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { root.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式等：忽略 */ }
    }
  };

  var PREFS_KEY = 'mg.prefs.v1';
  var prefs = MG.store.get(PREFS_KEY, {});
  MG.prefs = {
    get: function (k, d) { return prefs[k] === undefined ? d : prefs[k]; },
    set: function (k, v) { prefs[k] = v; MG.store.set(PREFS_KEY, prefs); }
  };

  /* ---------- 可复现的伪随机数（同一个 seed 永远画出同一个形状） ---------- */
  MG.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- 多语言 ---------- */
  // 字符串表在 strings.js 里：MG.STRINGS = { zh: {...}, en: {...}, ms: {...} }
  // LANGS 里 enabled:false 的语言不会出现在切换按钮里。三种语言：华语、英语、马来文。
  MG.LANGS = [
    { id: 'zh', label: '中文', html: 'zh-Hans', enabled: true },
    { id: 'en', label: 'EN', html: 'en', enabled: true },
    { id: 'ms', label: 'BM', html: 'ms', enabled: true }
  ];
  function enabledLangs() { return MG.LANGS.filter(function (l) { return l.enabled; }); }
  function detectLang() {
    var nav = (root.navigator && (root.navigator.language || '')) .toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    if (nav.indexOf('ms') === 0 || nav.indexOf('id') === 0) return 'ms';
    return nav ? 'en' : 'zh';
  }
  var lang = MG.prefs.get('lang', null);
  if (!enabledLangs().some(function (l) { return l.id === lang; })) lang = detectLang();

  MG.i18n = {
    lang: function () { return lang; },
    /** 取字符串：当前语言 → 英文 → 中文 → key 本身；{name} 占位替换 */
    t: function (key, vars) {
      var S = MG.STRINGS || {};
      var s = (S[lang] && S[lang][key]) || (S.en && S.en[key]) || (S.zh && S.zh[key]) || key;
      if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
      return s;
    },
    next: function () {
      var list = enabledLangs();
      var i = list.findIndex(function (l) { return l.id === lang; });
      return list[(i + 1) % list.length];
    },
    set: function (id) {
      lang = id; MG.prefs.set('lang', id); MG.i18n.apply();
      root.dispatchEvent(new CustomEvent('mg:lang'));
    },
    /** 把页面上 data-i18n="key" 的元素填上文字；data-i18n-aria 填 aria-label */
    apply: function (scope) {
      scope = scope || root.document;
      var info = MG.LANGS.filter(function (l) { return l.id === lang; })[0];
      root.document.documentElement.lang = info ? info.html : lang;
      scope.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = MG.i18n.t(el.getAttribute('data-i18n'));
      });
      scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        var label = MG.i18n.t(el.getAttribute('data-i18n-aria'));
        el.setAttribute('aria-label', label);
        el.setAttribute('title', label);
      });
      scope.querySelectorAll('[data-lang-next]').forEach(function (el) {
        el.textContent = MG.i18n.next().label;
      });
    }
  };

  /* ---------- 音效：WebAudio 现场合成，短促，可静音 ---------- */
  var ctx = null;
  var muted = MG.prefs.get('muted', false);
  function audio() {
    if (muted) return null;
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    var c = audio(); if (!c) return;
    var t0 = c.currentTime + start;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  MG.sound = {
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; MG.prefs.set('muted', muted); if (!muted) MG.sound.play('tap'); return muted; },
    play: function (name) {
      switch (name) {
        case 'tap': tone(660, 0, 0.08, 'triangle', 0.12); break;
        case 'untap': tone(440, 0, 0.07, 'triangle', 0.08); break;
        case 'take': tone(520, 0, 0.18, 'sine', 0.12, 1040); break;
        case 'cpu': tone(300, 0, 0.16, 'square', 0.04, 220); break;
        case 'win': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.13); }); break;
        case 'lose': tone(392, 0, 0.2, 'sine', 0.1); tone(330, 0.18, 0.3, 'sine', 0.1); break;
        case 'hint': tone(880, 0, 0.1, 'sine', 0.1); tone(1175, 0.08, 0.14, 'sine', 0.1); break;
      }
    }
  };

  MG.reducedMotion = function () {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  /* ---------- 共用的顶栏按钮：语言、静音 ---------- */
  MG.ICONS = {
    soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h4.5v-5h3v5H18v-9.5" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.2-5.1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4 3.5v5h5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor"/></svg>',
    hand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11V3.8a1.5 1.5 0 0 1 3 0V11V5a1.5 1.5 0 0 1 3 0v7.5V8.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-.5a7 7 0 0 1-5.6-2.8L3.6 14.6a1.6 1.6 0 0 1 2.5-2z" fill="currentColor"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7V17h6v-1c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z" fill="currentColor"/><rect x="9" y="18.5" width="6" height="2" rx="1" fill="currentColor"/><rect x="10" y="21.2" width="4" height="1.6" rx=".8" fill="currentColor"/></svg>',
    glasses: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.5" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10.5 13.5c1-1 2-1 3 0M2.5 13 4 7.5M21.5 13 20 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 9a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3v.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.8" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.5v13" stroke="currentColor" stroke-width="2"/></svg>'
  };

  MG.ICONS.trophy = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5a3.5 3.5 0 0 0 4 4M17 5h3.5a3.5 3.5 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14v4M8 21h8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  MG.ICONS.undo = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 4 10l5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

  MG.setupTopbar = function () {
    var doc = root.document;
    doc.querySelectorAll('[data-sound-toggle]').forEach(function (btn) {
      function paint() {
        btn.innerHTML = MG.sound.isMuted() ? MG.ICONS.soundOff : MG.ICONS.soundOn;
        btn.setAttribute('aria-pressed', String(!MG.sound.isMuted()));
      }
      paint();
      btn.addEventListener('click', function () { MG.sound.toggle(); paint(); });
    });
    doc.querySelectorAll('[data-lang-next]').forEach(function (btn) {
      btn.addEventListener('click', function () { MG.i18n.set(MG.i18n.next().id); });
    });
    doc.querySelectorAll('[data-icon]').forEach(function (el) {
      el.insertAdjacentHTML('afterbegin', MG.ICONS[el.getAttribute('data-icon')] || '');
    });
    MG.i18n.apply();
  };
})(window);
