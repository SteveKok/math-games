/*
 * 匿名 analytics：不登录、不收集名字电邮，只用一个随机的访客号码。
 *
 * - 访客号码（vid）：第一次来时随机生成，存在这台机器的浏览器里（localStorage）。清掉浏览器资料就变新访客。
 * - 一次「来访」（session）：30 分钟没有动静就算新的一次。
 * - 来源：网址上的 utm_source / utm_medium / utm_campaign / utm_content，
 *   短链接的 l（哪一条链接），分享人的 r（分享人的访客号码），没有的话看 referrer 和 fbclid。
 * - 读完来源后把网址换成 ?r=自己的号码：孩子或家长直接复制网址转发，也能知道是「人传人」。
 * - 活跃时间：页面在前面、而且 60 秒内有点过或滑过，才算在玩。
 * - 事件攒起来，每 10 秒或离开页面时用 sendBeacon 发一次。
 * - 不想被记录：网址加 ?notrack=1（会一直记住），?notrack=0 取消。自己测试时用。
 *
 * 用法：MG.track('level_start', { game: 'balance', level: 3 })；MG.activeMs() 是这一页累计的活跃毫秒。
 */
(function (root) {
  'use strict';
  var MG = root.MG = root.MG || {};
  var cfg = MG.CONFIG || {};
  var doc = root.document, loc = root.location;

  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 隐私模式：忽略 */ } }
  function lsJson(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function rid(n) {
    var a = new Uint8Array(n), s = '', abc = '0123456789abcdefghijklmnopqrstuvwxyz';
    try { root.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < n; j++) s += abc[a[j] % 36];
    return s;
  }

  /* ---------- 不记录 ---------- */
  var params = new URLSearchParams(loc.search);
  if (params.get('notrack') === '1') lsSet('jf.optout', '1');
  if (params.get('notrack') === '0') lsSet('jf.optout', '');
  var enabled = !!cfg.trackUrl && lsGet('jf.optout') !== '1' && loc.protocol !== 'file:';

  /* ---------- 访客、来访 ---------- */
  var now = Date.now();
  var vid = lsGet('jf.vid');
  var isNewVisitor = !vid;
  if (!vid) { vid = rid(12); lsSet('jf.vid', vid); lsSet('jf.first', String(now)); }
  var sess = lsJson('jf.sess');
  // 带着新的来源标记进来（点了另一条链接），就算一次新的来访，不然这次的来源会被吃掉
  var campaign = params.has('utm_source') || params.has('l') || params.has('fbclid') || (!!params.get('r') && params.get('r') !== vid) || params.get('notrack') === '0';
  var newSession = !sess || now - sess.last > 30 * 60 * 1000 || campaign;
  if (newSession) sess = { id: rid(10), start: now, n: (lsJson('jf.sess') || { n: 0 }).n + 1 };
  sess.last = now;
  lsSet('jf.sess', JSON.stringify(sess));
  var pv = rid(8);   // 这一次打开页面

  /* ---------- 来源 ---------- */
  function refHost() {
    try { var h = new URL(doc.referrer).hostname; return h === loc.hostname ? '' : h; } catch (e) { return ''; }
  }
  function guess(host) {
    if (!host) return null;
    if (/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$/.test(host)) return { src: 'facebook', med: 'referral' };
    if (/(^|\.)instagram\.com$/.test(host)) return { src: 'instagram', med: 'referral' };
    if (/(^|\.)whatsapp\.(com|net)$/.test(host)) return { src: 'whatsapp', med: 'referral' };
    if (/(^|\.)google\./.test(host)) return { src: 'google', med: 'organic' };
    if (/(^|\.)bing\.com$/.test(host)) return { src: 'bing', med: 'organic' };
    if (/(^|\.)t\.co$|twitter\.com$|x\.com$/.test(host)) return { src: 'twitter', med: 'referral' };
    if (/(^|\.)t\.me$|telegram/.test(host)) return { src: 'telegram', med: 'referral' };
    return { src: host, med: 'referral' };
  }
  var source = null;
  if (newSession) {
    var rh = refHost();
    var r = params.get('r');
    if (r === vid) r = '';   // 自己网址上的号码（重新整理页面）不算
    source = {
      src: params.get('utm_source') || '',
      med: params.get('utm_medium') || '',
      camp: params.get('utm_campaign') || '',
      cont: params.get('utm_content') || '',
      link: params.get('l') || '',
      ref: r || '',
      rh: rh,
      fb: params.has('fbclid') ? 1 : 0
    };
    if (!source.src) {
      if (source.ref) { source.src = 'share'; source.med = source.med || 'copy'; }
      else if (source.fb) { source.src = 'facebook'; source.med = 'unknown'; }
      else { var g = guess(rh); if (g) { source.src = g.src; source.med = g.med; } else { source.src = 'direct'; source.med = 'none'; } }
    }
    if (isNewVisitor) lsSet('jf.firstsrc', JSON.stringify(source));
  }
  // 换掉网址上的来源标记：之后复制转发的，都算这个访客介绍来的
  try {
    var keep = new URLSearchParams();
    if (params.get('notrack')) params.delete('notrack');
    keep.set('r', vid);
    if (params.toString() !== keep.toString() && root.history && root.history.replaceState) {
      root.history.replaceState(root.history.state, '', loc.pathname + '?' + keep.toString() + loc.hash);
    }
  } catch (e) { /* 不影响玩 */ }

  /* ---------- 活跃时间 ---------- */
  var active = 0, lastInput = now;
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    root.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    if (doc.visibilityState === 'visible' && Date.now() - lastInput < 60000) active += 1000;
  }, 1000);
  MG.activeMs = function () { return active; };

  /* ---------- 发送 ---------- */
  var queue = [], seq = 0;
  function device() {
    var ua = root.navigator.userAgent || '';
    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function flush() {
    if (!enabled || !queue.length) return;
    var body = JSON.stringify({
      v: vid, s: sess.id, pv: pv, am: active, path: loc.pathname.replace(/^.*\//, '/'),
      lang: (MG.i18n && MG.i18n.lang()) || '', dev: device(), vw: root.innerWidth || 0,
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })(),
      ev: queue.splice(0, 50)
    });
    var sent = false;
    try { if (root.navigator.sendBeacon) sent = root.navigator.sendBeacon(cfg.trackUrl, new Blob([body], { type: 'text/plain' })); } catch (e) { sent = false; }
    if (!sent) { try { root.fetch(cfg.trackUrl, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); } catch (e) { /* 算了 */ } }
    if (queue.length) flush();
  }
  MG.track = function (name, props) {
    if (!enabled) return;
    queue.push({ n: String(name).slice(0, 40), t: Date.now(), q: ++seq, am: active, p: props || {} });
    if (queue.length >= 20) flush();
  };
  MG.visitor = { id: vid, isNew: isNewVisitor, session: sess.id, enabled: enabled };

  setInterval(flush, 10000);
  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') { MG.track('page_hide', {}); flush(); }
  });
  root.addEventListener('pagehide', function () { flush(); });

  // 程序出错也记下来（每页最多 3 个），方便发现某些手机上玩不了
  var errs = 0;
  root.addEventListener('error', function (e) {
    if (errs++ < 3) MG.track('js_error', { msg: String(e.message || '').slice(0, 200), at: String(e.filename || '').replace(/^.*\//, '') + ':' + e.lineno });
  });

  if (newSession) MG.track('session_start', { src: source, visit: sess.n, newVisitor: isNewVisitor, firstSeen: Number(lsGet('jf.first')) || now });
  MG.track('page_view', { hash: loc.hash.slice(0, 20), title: doc.title.slice(0, 80) });
})(window);
