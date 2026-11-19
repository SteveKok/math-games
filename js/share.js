/*
 * 分享（考考朋友）。分享出去的网址带来源标记，朋友点进来就知道是「人传人」，还知道是谁分享的（匿名号码）：
 *   balance.html?utm_source=share&utm_medium=native&r=分享人号码#cover
 * 手机有系统分享（navigator.share）就用它；没有就在手机开 WhatsApp，电脑上复制链接。
 */
(function (root) {
  'use strict';
  var MG = root.MG = root.MG || {};

  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2700);
  }
  function link(game, medium, hash) {
    var u = new URL(game + '.html', root.location.href);
    u.search = '';
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', medium);
    if (MG.visitor) u.searchParams.set('r', MG.visitor.id);
    u.hash = hash ? '#' + hash : '';
    return u.toString();
  }
  function done(channel, game) { if (MG.track) MG.track('share_done', { game: game, channel: channel }); }

  /** opts: { game, hash, text, title } */
  MG.share = function (opts) {
    var nav = root.navigator, mobile = /Mobi|iPhone|Android/i.test(nav.userAgent || '');
    if (nav.share) {
      var url = link(opts.game, 'native', opts.hash);
      nav.share({ title: opts.title, text: opts.text, url: url })
        .then(function () { done('native', opts.game); })
        .catch(function () { if (MG.track) MG.track('share_cancel', { game: opts.game }); });
      return;
    }
    if (mobile) {
      var wurl = link(opts.game, 'whatsapp', opts.hash);
      done('whatsapp', opts.game);
      root.location.href = 'https://wa.me/?text=' + encodeURIComponent(opts.text + ' ' + wurl);
      return;
    }
    var curl = link(opts.game, 'copy', opts.hash);
    var copied = function () { done('copy', opts.game); toast(MG.i18n ? MG.i18n.t('shareCopied') : curl); };
    if (nav.clipboard && nav.clipboard.writeText) nav.clipboard.writeText(opts.text + ' ' + curl).then(copied, function () { root.prompt('', curl); });
    else root.prompt('', curl);
  };
  MG.shareLink = link;
})(window);
