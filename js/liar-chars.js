/*
 * 说谎者与诚实者的角色皮肤（只管画图）。
 * draw(color, label, seed, uid) → SVG（viewBox 0 0 100 120）
 *   label: null（还没选）| 'H'（诚实：头顶光环）| 'L'（说谎：一对小角）
 * mini(color) → 嵌在对话框里的小头像
 */
(function (root) {
  'use strict';
  var MG = root.MG;

  // 四个角色的颜色。名字（红红/Red……）在 strings.js 的 liarNames 里，顺序对应。
  MG.LIAR_COLORS = [
    { fill: '#ff5d73', dark: '#b8233a' },
    { fill: '#3a86ff', dark: '#1d4fa8' },
    { fill: '#2fb67c', dark: '#147248' },
    { fill: '#ffb627', dark: '#a86c00' }
  ];

  function f(n) { return Math.round(n * 10) / 10; }

  var HALO = '<ellipse cx="50" cy="13" rx="22" ry="6.5" fill="none" stroke="#f5b400" stroke-width="5"/>' +
    '<ellipse cx="50" cy="13" rx="22" ry="6.5" fill="none" stroke="#fff3b0" stroke-width="1.6"/>';
  function horns(y) {
    return '<path d="M30 ' + (y + 8) + ' L24 ' + (y - 14) + ' L41 ' + (y + 2) + ' Z" fill="#7a1fa2" stroke="#1d2433" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M70 ' + (y + 8) + ' L76 ' + (y - 14) + ' L59 ' + (y + 2) + ' Z" fill="#7a1fa2" stroke="#1d2433" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  function wrap(inner, label) {
    return '<svg viewBox="0 0 100 120" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* ---------- 小怪兽：随机抖动的圆滚滚身体 ---------- */
  var monster = {
    id: 'monster', nameKey: 'skinMonster',
    draw: function (color, label, seed) {
      var r = MG.rng(seed), c = MG.LIAR_COLORS[color];
      var n = 9, pts = [];
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 - Math.PI / 2;
        var rad = 33 + r() * 6;
        pts.push([50 + Math.cos(a) * rad, 74 + Math.sin(a) * rad * 0.92]);
      }
      var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
      var m0 = mid(pts[n - 1], pts[0]);
      var d = 'M' + f(m0[0]) + ' ' + f(m0[1]);
      for (var k = 0; k < n; k++) {
        var p = pts[k], m = mid(p, pts[(k + 1) % n]);
        d += ' Q' + f(p[0]) + ' ' + f(p[1]) + ' ' + f(m[0]) + ' ' + f(m[1]);
      }
      var oneEye = r() < 0.3;
      var eyes = oneEye
        ? '<circle cx="50" cy="66" r="11" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><circle cx="51" cy="67" r="5" fill="#1d2433"/>'
        : '<circle cx="39" cy="66" r="8" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><circle cx="61" cy="66" r="8" fill="#fff" stroke="#1d2433" stroke-width="2.5"/>' +
          '<circle cx="40" cy="67" r="3.6" fill="#1d2433"/><circle cx="62" cy="67" r="3.6" fill="#1d2433"/>';
      var mouth = label === 'L'
        ? '<path d="M38 86 q6 6 12 0 q6 -6 12 0" fill="none" stroke="#1d2433" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M40 84 q10 10 20 0" fill="none" stroke="#1d2433" stroke-width="3" stroke-linecap="round"/>';
      var inner =
        '<ellipse cx="38" cy="110" rx="9" ry="5" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2.5"/>' +
        '<ellipse cx="62" cy="110" rx="9" ry="5" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2.5"/>' +
        (label === 'L' ? horns(46) : '') +
        '<path d="' + d + 'Z" fill="' + c.fill + '" stroke="#1d2433" stroke-width="3"/>' +
        '<ellipse cx="36" cy="54" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-25 36 54)"/>' +
        eyes + mouth +
        '<circle cx="30" cy="80" r="4" fill="#fff" opacity=".35"/><circle cx="70" cy="80" r="4" fill="#fff" opacity=".35"/>' +
        (label === 'H' ? HALO : '');
      return wrap(inner);
    },
    mini: function (color) {
      var c = MG.LIAR_COLORS[color];
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="' + c.fill + '" stroke="#1d2433" stroke-width="2"/>' +
        '<circle cx="8.5" cy="11" r="2.2" fill="#fff"/><circle cx="15.5" cy="11" r="2.2" fill="#fff"/>' +
        '<circle cx="8.8" cy="11.3" r="1" fill="#1d2433"/><circle cx="15.8" cy="11.3" r="1" fill="#1d2433"/></svg>';
    }
  };

  /* ---------- 机器人 ---------- */
  var robot = {
    id: 'robot', nameKey: 'skinRobot',
    draw: function (color, label, seed) {
      var r = MG.rng(seed), c = MG.LIAR_COLORS[color];
      var w = 50 + Math.floor(r() * 10), x = 50 - w / 2;
      var round = r() < 0.5;
      var eyes = round
        ? '<circle cx="39" cy="68" r="7" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><circle cx="61" cy="68" r="7" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><circle cx="39" cy="68" r="3" fill="#1d2433"/><circle cx="61" cy="68" r="3" fill="#1d2433"/>'
        : '<rect x="31" y="62" width="15" height="11" rx="3" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><rect x="54" y="62" width="15" height="11" rx="3" fill="#fff" stroke="#1d2433" stroke-width="2.5"/><rect x="36" y="65" width="5" height="5" fill="#1d2433"/><rect x="59" y="65" width="5" height="5" fill="#1d2433"/>';
      var mouth = label === 'L'
        ? '<path d="M38 88 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke="#1d2433" stroke-width="2.6" stroke-linejoin="round"/>'
        : '<rect x="38" y="83" width="24" height="7" rx="3.5" fill="#fff" stroke="#1d2433" stroke-width="2.4"/>';
      var inner =
        '<rect x="34" y="104" width="10" height="10" rx="2" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2.5"/>' +
        '<rect x="56" y="104" width="10" height="10" rx="2" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2.5"/>' +
        '<line x1="50" y1="44" x2="50" y2="31" stroke="#1d2433" stroke-width="3"/>' +
        '<circle cx="50" cy="29" r="5" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2.5"/>' +
        (label === 'L' ? horns(48) : '') +
        '<rect x="' + x + '" y="44" width="' + w + '" height="60" rx="12" fill="' + c.fill + '" stroke="#1d2433" stroke-width="3"/>' +
        '<rect x="' + (x - 5) + '" y="64" width="6" height="16" rx="3" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2"/>' +
        '<rect x="' + (x + w - 1) + '" y="64" width="6" height="16" rx="3" fill="' + c.dark + '" stroke="#1d2433" stroke-width="2"/>' +
        eyes + mouth +
        (label === 'H' ? HALO : '');
      return wrap(inner);
    },
    mini: function (color) {
      var c = MG.LIAR_COLORS[color];
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="5" fill="' + c.fill + '" stroke="#1d2433" stroke-width="2"/>' +
        '<rect x="6" y="9" width="4" height="4" rx="1" fill="#fff"/><rect x="14" y="9" width="4" height="4" rx="1" fill="#fff"/></svg>';
    }
  };

  MG.LIAR_SKINS = [monster, robot];
  MG.getLiarSkin = function (id) {
    return MG.LIAR_SKINS.filter(function (s) { return s.id === id; })[0] || MG.LIAR_SKINS[0];
  };

  /* 选身份按钮上的小图标 */
  MG.ICONS.halo = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="#f5b400" stroke-width="2.6"/><circle cx="12" cy="15" r="6.5" fill="currentColor"/></svg>';
  MG.ICONS.horns = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11 L4 2 L10 8 Z M18 11 L20 2 L14 8 Z" fill="#7a1fa2" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="15" r="6.5" fill="currentColor"/></svg>';
})(window);
