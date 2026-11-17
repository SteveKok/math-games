/*
 * 鸽子与糖果的图画：只管「长什么样」。规则在 pigeon-logic.js，界面在 pigeon-game.js。
 * 全部是 SVG 字符串：鸽子、窝、糖果、小朋友。
 */
(function (root) {
  'use strict';
  var MG = root.MG;
  var SWEET_COLORS = ['#ff5d73', '#3a86ff', '#ffb627', '#2ec4b6', '#8338ec', '#ff7ab6', '#13a36b'];

  function svg(vb, inner) { return '<svg viewBox="' + vb + '" aria-hidden="true" focusable="false">' + inner + '</svg>'; }

  /** 一颗糖（圆糖 + 高光 + 两端包装纸） */
  function sweet(i) {
    var c = SWEET_COLORS[i % SWEET_COLORS.length];
    return svg('0 0 40 30',
      '<path d="M10 15 L2 7 Q4 15 2 23 Z M30 15 L38 7 Q36 15 38 23 Z" fill="' + c + '" opacity=".75" stroke="#1d2433" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="20" cy="15" r="10" fill="' + c + '" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M14 12 a7 7 0 0 1 6 -4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>');
  }

  /** 一只鸽子（侧面，朝右） */
  var PIGEON_TINTS = ['#c9d3e6', '#b8c4dc', '#d7dce8', '#aebbd6'];
  function pigeon(i) {
    var body = PIGEON_TINTS[i % PIGEON_TINTS.length];
    return svg('0 0 60 50',
      '<path d="M10 30 L1 24 L3 34 Z" fill="#7d8aa8" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="27" cy="31" rx="18" ry="13" fill="' + body + '" stroke="#1d2433" stroke-width="2.4"/>' +
      '<path d="M16 29 Q27 20 36 30 Q27 36 16 29 Z" fill="#8f9cbb" stroke="#1d2433" stroke-width="1.8"/>' +
      '<circle cx="43" cy="19" r="9" fill="' + body + '" stroke="#1d2433" stroke-width="2.4"/>' +
      '<path d="M37 25 Q43 29 48 24" fill="none" stroke="#3fb38f" stroke-width="3"/>' +
      '<path d="M51 18 L58 20 L51 22 Z" fill="#ffb627" stroke="#1d2433" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="45" cy="17" r="2.2" fill="#1d2433"/>' +
      '<path d="M24 43 v5 M30 43 v5" stroke="#ff7a59" stroke-width="2.4" stroke-linecap="round"/>');
  }

  /** 鸟窝（编织的碗） */
  function nest(over) {
    var fill = over ? '#e9a37a' : '#c98d5a', dark = '#7a4b25';
    var weave = '';
    for (var x = 8; x < 92; x += 9) weave += '<path d="M' + x + ' 14 q5 10 0 24" stroke="' + dark + '" stroke-width="2" fill="none" opacity=".45"/>';
    return svg('0 0 100 44',
      '<path d="M3 10 Q50 22 97 10 L88 36 Q50 48 12 36 Z" fill="' + fill + '" stroke="#1d2433" stroke-width="3" stroke-linejoin="round"/>' + weave +
      '<path d="M3 10 Q50 22 97 10" fill="none" stroke="#1d2433" stroke-width="3"/>');
  }

  MG.PIGEON_ART = { item: pigeon, box: nest };

  /** 小朋友的脸（不同发色），第三章的人很多时也用它 */
  var HAIR = ['#3d2b1f', '#e0a526', '#7a3b1d', '#1d2433', '#c2410c', '#6b4f3a', '#d9774b', '#4b3621'];
  var SKIN = ['#ffd9b8', '#f2c29b', '#e0a878', '#c68a5c', '#ffe3c9', '#b97a4f'];
  var SHIRT = ['#ff5d73', '#3a86ff', '#2ec4b6', '#ffb627', '#8338ec', '#13a36b', '#ff7ab6'];
  MG.kidFace = function (i, mood) {
    var hair = HAIR[i % HAIR.length], skin = SKIN[(i * 5 + 1) % SKIN.length], shirt = SHIRT[i % SHIRT.length];
    var mouth = mood === 'same' ? '<path d="M41 62 h18" stroke="#1d2433" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M40 60 q10 9 20 0" fill="none" stroke="#1d2433" stroke-width="3" stroke-linecap="round"/>';
    var hairShape = i % 3 === 0 ? '<path d="M24 46 Q22 18 50 16 Q78 18 76 46 Q70 30 50 30 Q32 30 24 46 Z" fill="' + hair + '"/>'
      : i % 3 === 1 ? '<path d="M22 50 Q20 14 50 14 Q80 14 78 50 L72 40 Q60 26 40 30 Q30 34 28 46 Z" fill="' + hair + '"/><circle cx="22" cy="44" r="7" fill="' + hair + '"/><circle cx="78" cy="44" r="7" fill="' + hair + '"/>'
      : '<path d="M25 44 Q28 18 50 18 Q72 18 75 44 L66 32 L58 38 L50 28 L42 38 L34 32 Z" fill="' + hair + '"/>';
    return svg('0 0 100 100',
      '<path d="M20 100 Q20 74 50 74 Q80 74 80 100 Z" fill="' + shirt + '" stroke="#1d2433" stroke-width="3"/>' +
      '<circle cx="50" cy="47" r="26" fill="' + skin + '" stroke="#1d2433" stroke-width="3"/>' + hairShape +
      '<circle cx="41" cy="48" r="3.4" fill="#1d2433"/><circle cx="59" cy="48" r="3.4" fill="#1d2433"/>' +
      '<circle cx="34" cy="57" r="4" fill="#ff8fa0" opacity=".5"/><circle cx="66" cy="57" r="4" fill="#ff8fa0" opacity=".5"/>' + mouth);
  };
  MG.sweetSvg = sweet;

  MG.ICONS.nope = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M5.8 18.2 18.2 5.8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  MG.ICONS.minus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
  MG.ICONS.plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
  MG.ICONS.trophy = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5a3.5 3.5 0 0 0 4 4M17 5h3.5a3.5 3.5 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14v4M8 21h8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
})(window);
