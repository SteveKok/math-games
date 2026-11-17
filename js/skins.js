/*
 * 皮肤：只负责「长什么样」，不碰规则。
 * 每个皮肤提供 draw(seed, uid) → SVG 字符串（viewBox 0 0 100 100）。
 * 同一个 seed 永远画出同一个形状，所以拿走别的物品时，剩下的不会「变脸」。
 * 新皮肤（水果、宝石……）照这个接口加一个对象即可。
 */
(function (root) {
  'use strict';
  var MG = root.MG;

  function f(n) { return Math.round(n * 10) / 10; }
  function svg(inner, rot) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g transform="rotate(' + f(rot || 0) + ' 50 50)">' + inner + '</g></svg>';
  }
  function hsl(h, s, l) { return 'hsl(' + Math.round(h) + ' ' + Math.round(s) + '% ' + Math.round(l) + '%)'; }

  /* ---------- 糖果：椭圆糖身 + 两端包装纸三角 + 斜纹 ---------- */
  var CANDY_HUES = [350, 15, 42, 140, 195, 220, 275, 315];
  var candy = {
    id: 'candy', nameKey: 'skinCandy',
    draw: function (seed, uid) {
      var r = MG.rng(seed);
      var h = CANDY_HUES[Math.floor(r() * CANDY_HUES.length)] + (r() * 16 - 8);
      var body = hsl(h, 82, 58), dark = hsl(h, 75, 40), wrap = hsl(h, 70, 72);
      var stripe = r() < 0.5 ? '#fff' : hsl(h + 180, 80, 70);
      var id = 'c' + uid;
      var stripes = '';
      for (var x = -30; x < 130; x += 13) {
        stripes += '<path d="M' + x + ' 75 L' + (x + 22) + ' 25" stroke="' + stripe + '" stroke-width="5" stroke-linecap="round" opacity=".75"/>';
      }
      var inner =
        // 包装纸：两端的三角，带一个小褶
        '<path d="M27 50 L6 31 Q11 50 6 69 Z" fill="' + wrap + '" stroke="' + dark + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M73 50 L94 31 Q89 50 94 69 Z" fill="' + wrap + '" stroke="' + dark + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M12 40 L22 47 M12 60 L22 53 M88 40 L78 47 M88 60 L78 53" stroke="' + dark + '" stroke-width="2" opacity=".5"/>' +
        '<clipPath id="' + id + '"><ellipse cx="50" cy="50" rx="27" ry="21"/></clipPath>' +
        '<ellipse cx="50" cy="50" rx="27" ry="21" fill="' + body + '"/>' +
        '<g clip-path="url(#' + id + ')">' + stripes + '</g>' +
        '<ellipse cx="50" cy="50" rx="27" ry="21" fill="none" stroke="' + dark + '" stroke-width="3"/>' +
        '<ellipse cx="41" cy="41" rx="8" ry="4" fill="#fff" opacity=".7" transform="rotate(-20 41 41)"/>';
      return svg(inner, r() * 40 - 20);
    }
  };

  /* ---------- 石头：半径随机抖动的多边形 + 渐变阴影，每块都不一样 ---------- */
  var STONE_TONES = [[30, 12], [25, 22], [210, 8], [40, 18], [15, 14], [190, 10]];
  var stone = {
    id: 'stone', nameKey: 'skinStone',
    draw: function (seed, uid) {
      var r = MG.rng(seed);
      var tone = STONE_TONES[Math.floor(r() * STONE_TONES.length)];
      var h = tone[0], s = tone[1], l = 52 + r() * 14;
      var n = 8 + Math.floor(r() * 5), pts = [], a0 = r() * Math.PI * 2;
      var squash = 0.72 + r() * 0.22;
      for (var i = 0; i < n; i++) {
        var a = a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.35;
        var rad = 32 + r() * 9;
        pts.push(f(50 + Math.cos(a) * rad) + ',' + f(52 + Math.sin(a) * rad * squash));
      }
      var id = 's' + uid;
      var inner =
        '<defs><radialGradient id="' + id + '" cx="35%" cy="30%" r="80%">' +
        '<stop offset="0" stop-color="' + hsl(h, s, l + 18) + '"/>' +
        '<stop offset=".55" stop-color="' + hsl(h, s, l) + '"/>' +
        '<stop offset="1" stop-color="' + hsl(h, s, l - 26) + '"/></radialGradient></defs>' +
        '<ellipse cx="52" cy="' + f(56 + 34 * squash) + '" rx="34" ry="5" fill="#000" opacity=".18"/>' +
        '<polygon points="' + pts.join(' ') + '" fill="url(#' + id + ')" stroke="' + hsl(h, s, l - 34) + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        // 几道小裂纹/斑点，让质感更像石头
        '<path d="M' + f(40 + r() * 10) + ' ' + f(45 + r() * 8) + ' q6 4 12 1" fill="none" stroke="' + hsl(h, s, l - 28) + '" stroke-width="1.8" opacity=".55"/>' +
        '<circle cx="' + f(58 + r() * 10) + '" cy="' + f(56 + r() * 6) + '" r="2" fill="' + hsl(h, s, l - 22) + '" opacity=".5"/>';
      return svg(inner, 0);
    }
  };

  /* ---------- 星星 ---------- */
  var STAR_HUES = [45, 38, 52, 30, 200, 320];
  var star = {
    id: 'star', nameKey: 'skinStar',
    draw: function (seed, uid) {
      var r = MG.rng(seed);
      var h = STAR_HUES[Math.floor(r() * STAR_HUES.length)];
      var pts = [], inner = 0.44 + r() * 0.08;
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var rad = i % 2 ? 38 * inner : 40;
        pts.push(f(50 + Math.cos(a) * rad) + ',' + f(53 + Math.sin(a) * rad));
      }
      var id = 'st' + uid;
      var g =
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + hsl(h, 95, 72) + '"/><stop offset="1" stop-color="' + hsl(h, 90, 50) + '"/></linearGradient></defs>' +
        '<polygon points="' + pts.join(' ') + '" fill="url(#' + id + ')" stroke="' + hsl(h, 80, 34) + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="42" cy="46" r="3.2" fill="#1d2433"/><circle cx="58" cy="46" r="3.2" fill="#1d2433"/>' +
        '<path d="M44 56 q6 5 12 0" fill="none" stroke="#1d2433" stroke-width="2.6" stroke-linecap="round"/>';
      return svg(g, r() * 24 - 12);
    }
  };

  MG.SKINS = [candy, stone, star];
  MG.getSkin = function (id) {
    return MG.SKINS.filter(function (s) { return s.id === id; })[0] || MG.SKINS[0];
  };
})(window);
