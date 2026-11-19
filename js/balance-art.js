/*
 * 天平找相等：水果和天平的 SVG（代码绘制，和分享封面 og/balance.svg 同一个画风）。
 * MG.BalanceArt.fruit(code) → 以 (0,0) 为中心、大约 60×60 的 <g> 内容
 * MG.BalanceArt.scale(left, right, opts) → 整个天平的 <svg>
 */
(function (root) {
  'use strict';
  var INK = '#1d2433';

  function durian() {
    var pts = [], n = 18, r = 22;
    for (var i = 0; i < n * 2; i++) {
      var a = Math.PI * 2 * i / (n * 2), rr = i % 2 === 0 ? r + 6 : r;
      pts.push((rr * 1.12 * Math.cos(a)).toFixed(1) + ',' + (rr * Math.sin(a) + 4).toFixed(1));
    }
    return '<rect x="-3" y="-28" width="6" height="10" rx="2" fill="#7a5230" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="#9ccc3a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-10 -2q5 8 0 16M2 -6q5 10 0 20M13 -2q5 8 0 16" stroke="#6f9a1f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }
  function pineapple() {
    return '<path d="M0 -14l-11-16 8 4 3-12 3 12 8-4z" fill="#2fb67c" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="0" cy="8" rx="15" ry="20" fill="#ffd23f" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M-10 -2l20 20M-13 10l12 12M-3 -9l14 14M10 -2l-20 20M13 10l-12 12M3 -9l-14 14" stroke="#d9a400" stroke-width="2"/>';
  }
  function mango() {
    return '<path d="M-17 4C-19 -18 12 -22 19 -3C24 14 -2 21 -17 4z" fill="#ff9f1c" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M12 -17q9-9 17-3q-7 9-17 3z" fill="#2fb67c" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  function banana() {
    return '<path d="M-24 -8Q-2 28 25 -12Q22 -4 18 0Q-2 18 -18 -2z" fill="#ffe14d" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M22 -14l5-3" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
  }
  function guava() {
    return '<circle cx="0" cy="3" r="19" fill="#b5e061" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="-7" cy="-4" rx="5" ry="3.5" fill="#e3f5b5"/>' +
      '<path d="M-4 -16l4 4 4-4" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  function starfruit() {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + Math.PI * i / 5, r = i % 2 ? 10 : 22;
      pts.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a) + 3).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="#f6e04a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="0" cy="3" r="3" fill="#c9b400"/>';
  }
  function watermelon() {
    return '<ellipse cx="0" cy="3" rx="26" ry="20" fill="#3aa655" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M-14 -13q-6 16 0 32M0 -17q-6 20 0 40M14 -13q-6 16 0 32" stroke="#1f6e35" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  }
  var DRAW = { M: mango, K: banana, P: pineapple, G: guava, S: starfruit, W: watermelon, D: durian };
  // 画在盘子上时每种水果占多宽
  var WIDTH = { M: 42, K: 52, P: 36, G: 42, S: 46, W: 56, D: 60 };

  function fruit(code) { return DRAW[code](); }
  /** 单独一个水果的小 <svg>（按钮、文字里用） */
  function icon(code, size) {
    size = size || 36;
    return '<svg class="fruit-icon" viewBox="-30 -30 60 60" width="' + size + '" height="' + size + '" aria-hidden="true">' + fruit(code) + '</svg>';
  }

  /** 把一盘水果排成几行（最多 rowW 宽），返回 [{code, x, y, i}]，x、y 相对盘子中心、盘底 */
  function layout(items, rowW, scale) {
    var rows = [[]], w = 0;
    items.forEach(function (c, i) {
      var cw = WIDTH[c] * scale;
      if (w + cw > rowW && rows[rows.length - 1].length) { rows.push([]); w = 0; }
      rows[rows.length - 1].push({ code: c, w: cw, i: i });
      w += cw;
    });
    var out = [];
    rows.forEach(function (row, r) {
      var total = row.reduce(function (s, it) { return s + it.w; }, 0), x = -total / 2;
      row.forEach(function (it) {
        out.push({ code: it.code, i: it.i, x: x + it.w / 2, y: -24 * scale - r * 46 * scale, row: r });
        x += it.w;
      });
    });
    return out;
  }

  /**
   * 整个天平。opts：
   *   angle：倾斜角度（度，左边重为正）
   *   held：天平被手按住（还没放手）
   *   small：线索用的小天平
   *   tapRight：右盘的水果可以点（data-right-i）
   *   question：右盘放一个大问号（封面那种）
   */
  function scale(left, right, opts) {
    opts = opts || {};
    var W = 460, H = opts.small ? 220 : 250, px = 230, py = 64, arm = 140;
    var a = (opts.angle || 0) * Math.PI / 180;
    var lx = px - arm * Math.cos(a), ly = py + arm * Math.sin(a);
    var rx = px + arm * Math.cos(a), ry = py - arm * Math.sin(a);
    var hang = 72, panW = 80, sc = opts.small ? 0.85 : 0.9;
    var lays = [layout(left, panW * 2 - 10, sc), layout(right, panW * 2 - 10, sc)];
    var maxRows = 1 + Math.max.apply(null, lays[0].concat(lays[1]).map(function (it) { return it.row; }).concat([0]));
    var top = -10 - Math.max(0, maxRows - 2) * 46 * sc;   // 很多水果时往上留位置
    var s = '<svg class="scale-svg' + (opts.small ? ' small' : '') + '" viewBox="0 ' + top + ' ' + W + ' ' + (H - top) + '" role="img">';
    // 底座
    s += '<path d="M' + px + ' ' + py + 'L' + (px - 34) + ' ' + (py + 150) + 'L' + (px + 34) + ' ' + (py + 150) + 'z" fill="#fff" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>';
    s += '<rect x="' + (px - 70) + '" y="' + (py + 146) + '" width="140" height="14" rx="7" fill="#e9d2b4" stroke="' + INK + '" stroke-width="4"/>';
    // 横杆
    s += '<line class="beam" x1="' + lx + '" y1="' + ly + '" x2="' + rx + '" y2="' + ry + '" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>';
    [[lx, ly, lays[0], 'l'], [rx, ry, lays[1], 'r']].forEach(function (p) {
      var cx = p[0], cy = p[1] + hang;
      s += '<path d="M' + p[0] + ' ' + p[1] + 'L' + (cx - panW + 12) + ' ' + cy + 'M' + p[0] + ' ' + p[1] + 'L' + (cx + panW - 12) + ' ' + cy + '" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<path d="M' + (cx - panW) + ' ' + cy + 'L' + (cx + panW) + ' ' + cy + 'Q' + cx + ' ' + (cy + 30) + ' ' + (cx - panW) + ' ' + cy + 'z" fill="#ffe9c7" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>';
      if (p[3] === 'r' && opts.question) {
        s += '<circle cx="' + cx + '" cy="' + (cy - 26) + '" r="24" fill="#ff5d73" stroke="' + INK + '" stroke-width="4"/>' +
          '<text x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">?</text>';
        return;
      }
      p[2].forEach(function (it) {
        var tap = p[3] === 'r' && opts.tapRight;
        s += '<g transform="translate(' + (cx + it.x).toFixed(1) + ' ' + (cy + it.y).toFixed(1) + ') scale(' + sc.toFixed(2) + ')"' +
          (tap ? ' class="tap-fruit" data-right-i="' + it.i + '"' : '') + '>' + fruit(it.code) + '</g>';
      });
    });
    s += '<circle cx="' + px + '" cy="' + py + '" r="9" fill="#ff5d73" stroke="' + INK + '" stroke-width="4"/>';
    if (opts.held) {
      // 一只手从上面按住横杆的中间：还没放手
      s += '<g class="hold-hand" transform="translate(' + px + ' ' + (py - 24) + ')">' +
        '<rect x="-16" y="-34" width="32" height="40" rx="10" fill="#ffd8b0" stroke="' + INK + '" stroke-width="3.5"/>' +
        '<path d="M-16 -6h32" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-10 6v14M-3 6v16M4 6v16M11 6v14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/></g>';
    }
    return s + '</svg>';
  }

  root.MG.BalanceArt = { fruit: fruit, icon: icon, scale: scale, layout: layout };
})(window);
