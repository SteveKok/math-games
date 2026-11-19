/*
 * 网站设定。trackUrl 是收集 analytics 事件的网址（JomFikir 的 Cloudflare Worker）。
 * 留空就完全不发送任何东西。
 */
(function (root) {
  'use strict';
  var host = root.location.hostname;
  var local = host === 'localhost' || host === '127.0.0.1';
  root.MG = root.MG || {};
  root.MG.CONFIG = {
    // 本机开发：wrangler dev 跑在 8787；正式：jomfikir.com
    trackUrl: local ? root.location.protocol + '//' + host + ':8787/e' : 'https://jomfikir.com/e'
  };
})(window);
