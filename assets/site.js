/* Dennis Ray Filho, portfolio: the scroll stage and the timing chart.
   Everything reads without this script; it only adds motion.

   The stage, adapted from the Hook site: 120 frames rendered in Blender from the CAD, the earhook
   turning from -65 to +65 degrees. Frames 0-71 are the render (seq/r###), frames 48-119 the line
   drawing (seq/l###); between frames 54 and 66 the drawing wipes down over the render.
   With reduced motion the stage does not pin: one still frame, every chapter in order. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) document.documentElement.classList.add('calm');

  /* ---------- the timing chart: the playhead sweeps once when the chart comes into view ---------- */
  var chart = document.querySelector('.chart');
  if (chart && !reduce) {
    var head = chart.querySelector('.playhead');
    var bursts = Array.prototype.slice.call(chart.querySelectorAll('.burst'));
    var running = 0;
    var play = function () {
      if (running) cancelAnimationFrame(running);
      chart.classList.add('is-playing');
      bursts.forEach(function (b) { b.classList.remove('is-hit'); });
      var t0 = performance.now(), DUR = 3600;          // under 5 s, and it stops by itself
      var step = function (now) {
        var k = Math.min(1, (now - t0) / DUR), x = 40 + 580 * k;
        head.setAttribute('x1', x); head.setAttribute('x2', x);
        bursts.forEach(function (b) { if (x >= +b.getAttribute('data-x')) b.classList.add('is-hit'); });
        if (k < 1) running = requestAnimationFrame(step);
        else { running = 0; chart.classList.remove('is-playing'); }
      };
      running = requestAnimationFrame(step);
    };
    var replay = chart.querySelector('[data-replay]');
    if (replay) replay.addEventListener('click', play);
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { play(); cio.disconnect(); }
      }, { threshold: 0.6 });
      cio.observe(chart);
    }
  }

  /* ---------- the scroll stage ---------- */
  var root = document.querySelector('[data-scrub]');
  if (!root) return;
  var canvas = root.querySelector('.scrub__view canvas');
  var first = root.querySelector('.scrub__first');
  if (reduce) { canvas.hidden = true; return; }   // the plain first frame in the HTML stays

  var ctx = canvas.getContext('2d');
  var svg = root.querySelector('.scrub__view svg');
  var chaps = Array.prototype.slice.call(root.querySelectorAll('.scrub__chap'));
  var meter = Array.prototype.slice.call(root.querySelectorAll('.scrub__meter i'));
  var N = 120, R_END = 71, L_START = 48, WIPE_A = 54, WIPE_B = 66;
  var small = Math.min(window.innerWidth, window.innerHeight * 1.2) < 700;
  var base = root.getAttribute('data-seq') || 'assets/img/';
  var dir = base + (small ? 'seq-s/' : 'seq/');
  var PX = small ? 600 : 1000;
  canvas.width = PX; canvas.height = PX;
  var pts = window.HOOK_POINTS || [];

  var render = new Array(N), line = new Array(N), cur = 0, curP = 0;
  function pad(i) { return ('00' + i).slice(-3); }
  function load(set, i) {
    var arr = set === 'r' ? render : line;
    if (arr[i]) return;
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { im._ok = true; if (Math.abs(i - cur) < 3) draw(curP); };
    im.src = dir + set + pad(i) + '.webp';
    arr[i] = im;
  }
  function nearest(arr, i, lo, hi) {
    for (var d = 0; d <= N; d++) {
      var a = i - d, b = i + d;
      if (a >= lo && arr[a] && arr[a]._ok) return arr[a];
      if (b <= hi && arr[b] && arr[b]._ok) return arr[b];
      if (a < lo && b > hi) break;
    }
    return null;
  }
  /* the first frame now, then every 8th, then the rest */
  load('r', 0);
  var order = [];
  [8, 4, 2, 1].forEach(function (s) {
    for (var i = 0; i < N; i += s) {
      if (i <= R_END && order.indexOf('r' + i) < 0) order.push('r' + i);
      if (i >= L_START && order.indexOf('l' + i) < 0) order.push('l' + i);
    }
  });
  var qi = 0;
  function pump() {
    for (var k = 0; k < 6 && qi < order.length; k++, qi++) load(order[qi][0], +order[qi].slice(1));
    if (qi < order.length) setTimeout(pump, 60);
  }
  if (document.readyState === 'complete') setTimeout(pump, 150);
  else window.addEventListener('load', function () { setTimeout(pump, 150); });

  /* one callout, drawn over the line drawing: the over-ear arm */
  var NS = 'http://www.w3.org/2000/svg';
  var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'co');
  var pl = document.createElementNS(NS, 'polyline');
  var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '7');
  var tx = document.createElementNS(NS, 'text'); tx.textContent = 'TPU over-ear arm'; tx.setAttribute('text-anchor', 'end');
  g.appendChild(pl); g.appendChild(c); g.appendChild(tx); svg.appendChild(g);

  function ready() { if (first) { canvas.classList.add('is-ready'); first.hidden = true; first = null; } }
  function draw(p) {
    curP = p;
    var f = p * (N - 1), i = Math.round(f);
    cur = i;
    ctx.fillStyle = '#f7f8f8';
    ctx.fillRect(0, 0, PX, PX);
    if (f < WIPE_A) {
      var a = nearest(render, Math.min(i, R_END), 0, R_END); if (a) { ctx.drawImage(a, 0, 0, PX, PX); ready(); }
    } else if (f > WIPE_B) {
      var b = nearest(line, Math.max(i, L_START), L_START, N - 1); if (b) { ctx.drawImage(b, 0, 0, PX, PX); ready(); }
    } else {
      var t = (f - WIPE_A) / (WIPE_B - WIPE_A);
      var ri = nearest(render, i, 0, R_END), li = nearest(line, i, L_START, N - 1);
      if (ri) ctx.drawImage(ri, 0, 0, PX, PX);
      if (ri || li) ready();
      if (li) {
        var y = Math.round(PX * (0.1 + 0.8 * t));
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PX, y); ctx.clip();
        ctx.drawImage(li, 0, 0, PX, PX); ctx.restore();
        ctx.fillStyle = '#13294b'; ctx.fillRect(0, y - 1, PX, 2);
      }
    }
    var on = -1;
    chaps.forEach(function (ch, k) {
      var a = +ch.getAttribute('data-from'), b = +ch.getAttribute('data-to');
      var hit = (p >= a && p < b) || (k === chaps.length - 1 && p >= a);
      if (hit) on = k;
      ch.classList.toggle('is-on', hit);
      if (hit) ch.removeAttribute('aria-hidden'); else ch.setAttribute('aria-hidden', 'true');
      ch.inert = !hit;                         // links in a hidden chapter are out of the tab order
    });
    meter.forEach(function (m, k) { m.classList.toggle('is-on', k <= on); });
    var fr = pts[i] && pts[i].arm;
    var showArm = !!(fr && f > WIPE_B && fr[2] > 0.25 && on >= 0 && chaps[on].getAttribute('data-co') === 'arm');
    g.classList.toggle('is-on', showArm);
    if (fr) {
      var x = fr[0] * 1000, yy = fr[1] * 1000;
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', yy.toFixed(1));
      pl.setAttribute('points', (x + 7).toFixed(1) + ',' + yy.toFixed(1) + ' 960,' + yy.toFixed(1));
      tx.setAttribute('x', 960); tx.setAttribute('y', (yy + 38).toFixed(1));   // below the line, clear of the arm
    }
  }

  /* ?p=0.6 holds the stage at one point (for checking frames) */
  var qp = /[?&]p=([\d.]+)/.exec(location.search);
  if (qp) {
    var fixed = Math.min(1, +qp[1]);
    for (var z = 0; z < N; z++) { if (z <= R_END) load('r', z); if (z >= L_START) load('l', z); }
    var hold = function () { draw(fixed); };
    window.addEventListener('load', function () { hold(); setTimeout(hold, 400); });
    hold();
    return;
  }
  var tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () {
      tick = false;
      var r = root.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      draw(Math.max(0, Math.min(1, -r.top / span)));
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  draw(0);
  onScroll();
})();
