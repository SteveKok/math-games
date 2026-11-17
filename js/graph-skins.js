/*
 * 一笔画与涂地图的皮肤：只是一组颜色，画法在 graph-game.js 里，规则在 graph-logic.js 里。
 */
(function (root) {
  'use strict';
  var MG = root.MG;

  var paper = {
    id: 'paper', nameKey: 'skinPaper',
    bg: '#fffdf6', grid: '#ece4d0', ink: '#1d2433',
    guide: '#a39b8b', node: '#ffffff', current: '#ffd23f', start: '#1d2433',
    trail: function (i, n) { return 'hsl(' + Math.round((350 + i * 300 / Math.max(n, 1)) % 360) + ' 80% 46%)'; },
    water: '#bfe3ff', waterEdge: '#7fbde8',
    sea: '#cfeaff', land: '#f1ebdd', border: '#1d2433',
    colors: ['#ff5d73', '#3a86ff', '#ffd23f', '#2fb67c']
  };
  var chalk = {
    id: 'chalk', nameKey: 'skinChalk',
    bg: '#1f4d3a', grid: '#285b45', ink: '#f6f3ea',
    guide: 'rgba(246,243,234,.5)', node: '#1f4d3a', current: '#ffe36e', start: '#f6f3ea',
    trail: function (i, n) { return 'hsl(' + Math.round((350 + i * 300 / Math.max(n, 1)) % 360) + ' 90% 74%)'; },
    water: '#2f6f8f', waterEdge: '#5fa3c4',
    sea: '#15392b', land: '#3f7660', border: '#f6f3ea',
    colors: ['#ff8fa0', '#86b8ff', '#ffe36e', '#86e3b0']
  };

  MG.GRAPH_SKINS = [paper, chalk];
  MG.getGraphSkin = function (id) {
    return MG.GRAPH_SKINS.filter(function (s) { return s.id === id; })[0] || paper;
  };
  /** 皮肤按钮上的小图：一个三角形一笔画 */
  MG.graphSkinIcon = function (s) {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="9" fill="' + s.bg + '" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M20 8 L8 31 L32 31 Z" fill="none" stroke="' + s.trail(1, 3) + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      [[20, 8], [8, 31], [32, 31]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.6" fill="' + s.node + '" stroke="' + s.ink + '" stroke-width="2"/>'; }).join('') +
      '</svg>';
  };

  MG.ICONS.undo = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 4 10l5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  MG.ICONS.nope = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M5.8 18.2 18.2 5.8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  MG.ICONS.eraser = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5 21 10l-9 9H7l-4-4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 9l6.5 6.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 20.5h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
})(window);
