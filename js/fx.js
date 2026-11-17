/* 通关时撒糖果 / 星星（canvas，纯代码绘制） */
(function (root) {
  'use strict';
  var MG = root.MG;
  var COLORS = ['#ff5d73', '#ffb627', '#2ec4b6', '#3a86ff', '#8338ec', '#ff7ab6', '#7bd389'];

  function drawStar(c, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }
  function drawCandy(c, r) {
    c.beginPath(); c.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(-r * 1.7, -r * 0.6); c.lineTo(-r * 1.7, r * 0.6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 1.7, -r * 0.6); c.lineTo(r * 1.7, r * 0.6); c.closePath(); c.fill();
  }

  MG.confetti = function (kind) {
    var canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    document.body.appendChild(canvas);
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var W = root.innerWidth, H = root.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    var count = MG.reducedMotion() ? 24 : 90, parts = [];
    for (var i = 0; i < count; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10,
        r: 7 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length], star: kind === 'star' || (kind !== 'candy' && i % 2 === 0)
      });
    }
    var start = performance.now();
    function frame(now) {
      var t = now - start;
      c.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.globalAlpha = Math.max(0, 1 - t / 2600);
        c.fillStyle = p.color;
        if (p.star) drawStar(c, p.r); else drawCandy(c, p.r * 0.7);
        c.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else canvas.remove();
    }
    requestAnimationFrame(frame);
  };
})(window);
