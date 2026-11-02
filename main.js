/* ============================================================
   main.js — the choreography.
   act 1 the eye · act 2 the dive · act 3 the heart · act 4 the gift
   Zero dependencies.
   ============================================================ */
(function () {
  "use strict";

  /* ──────────────────────────────────────────────────────────
     EDIT THIS BEFORE YOU SEND THE LINK
     ────────────────────────────────────────────────────────── */
  var CFG = {
    arrival: "Saturday, 7 November"   // when the tulips + chocolate reach her door
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var touch = !!(window.matchMedia && window.matchMedia("(hover: none)").matches);

  /* ── easing + tween engine ─────────────────────────────── */
  var easeOutCubic = function (k) { return 1 - Math.pow(1 - k, 3); };
  var easeInQuad = function (k) { return k * k; };
  var easeInOut = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

  var tweens = [];
  function tween(o) {
    o.t = -(o.delay || 0);
    o.from = o.get();
    o.ease = o.ease || easeOutCubic;
    tweens.push(o);
    return o;
  }
  function stepTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      var k = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function frame() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }

  /* ── seeded rng so the heart looks the same every load ─── */
  var seed = 20261102;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  /* ── elements ──────────────────────────────────────────── */
  var body = document.body;
  var cinematic = $("#cinematic");
  var eyeCanvas = $("#eyeCanvas");
  var heartLayer = $("#heartLayer");
  var goldBloom = $("#goldBloom");
  var gift = $("#gift");
  var arrivalEl = $("#arrivalDate");
  var acts = [null, $("#act1"), $("#act2"), $("#act3")];
  var toastEl = $("#toast");

  arrivalEl.textContent = CFG.arrival;

  /* ══════════════════════════════════════════════════════
     FX CANVAS — tears that become light, and the tunnel
     ══════════════════════════════════════════════════════ */
  var Fx = (function () {
    var cv = $("#fxCanvas"), ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1, glow = null;
    var drops = [], motes = [], tunnel = 0;

    function makeGlow() {
      var s = document.createElement("canvas"); s.width = s.height = 64;
      var c = s.getContext("2d");
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.22, "rgba(255,238,200,.8)");
      g.addColorStop(0.55, "rgba(255,196,96,.28)");
      g.addColorStop(1, "rgba(255,180,70,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      return s;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function newMote(atCentre) {
      return {
        a: rnd() * Math.PI * 2,
        r: atCentre ? 0.01 + Math.random() * 0.05 : Math.random() * 0.55,
        sp: 0.10 + Math.random() * 0.34,
        size: 2 + Math.random() * 7,
        tw: Math.random() * 6.283
      };
    }

    function seedMotes() {
      motes.length = 0;
      for (var i = 0; i < 78; i++) motes.push(newMote(false));
    }

    function tear(x, y) {
      drops.push({ x: x, y: y, vy: 40, vx: 0, r: 5.2 + Math.random() * 2.2, wob: Math.random() * 6.283, state: 0, life: 0 });
    }

    function step(dt, time) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, m = Math.min(W, H);

      /* tunnel of drifting light */
      if (tunnel > 0.001) {
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < motes.length; i++) {
          var p = motes[i];
          p.r += p.sp * dt * (0.3 + p.r * 2.6);
          if (p.r > 1.25) { motes[i] = newMote(true); continue; }
          var tw = 0.7 + 0.3 * Math.sin(time * 2.1 + p.tw);
          var a = tunnel * tw * Math.min(1, p.r * 7) * (1 - Math.max(0, (p.r - 0.72) / 0.5));
          if (a <= 0.004) continue;
          var rr = p.size * (0.35 + p.r * 2.4);
          ctx.globalAlpha = Math.max(0, a);
          ctx.drawImage(glow, cx + Math.cos(p.a) * p.r * m * 0.62 - rr, cy + Math.sin(p.a) * p.r * m * 0.62 - rr, rr * 2, rr * 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      /* tears — falling, then turning into light */
      for (var j = drops.length - 1; j >= 0; j--) {
        var d = drops[j];
        d.life += dt;
        if (d.state === 0) {
          d.vy += 620 * dt;
          d.y += d.vy * dt;
          d.wob += dt * 5;
          d.x += Math.sin(d.wob) * 16 * dt;
          if (d.vy > 300) {
            d.state = 1; d.vy = 74; d.r = 7.5;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.95;
            ctx.drawImage(glow, d.x - d.r * 3, d.y - d.r * 3, d.r * 6, d.r * 6);
            ctx.globalCompositeOperation = "source-over";
          } else {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = "rgba(214,236,255,.85)";
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.15, 0, 0, 6.2832);
            ctx.fill();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "rgba(255,255,255,.9)";
            ctx.beginPath();
            ctx.ellipse(d.x - d.r * 0.25, d.y - d.r * 0.35, d.r * 0.24, d.r * 0.3, 0, 0, 6.2832);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else {
          d.vy += 26 * dt;
          d.y += d.vy * dt;
          d.x += Math.sin(d.wob + d.life * 2) * 12 * dt;
          d.r = Math.max(1.5, d.r - 3.4 * dt);
          var fade = 1 - Math.min(1, (d.life - 0.35) / 1.5);
          if (fade <= 0 || d.y > H + 60) { drops.splice(j, 1); continue; }
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = Math.max(0, fade) * 0.95;
          ctx.drawImage(glow, d.x - d.r * 3.4, d.y - d.r * 3.4, d.r * 6.8, d.r * 6.8);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
    }

    glow = makeGlow();
    resize();
    seedMotes();
    return {
      resize: resize, step: step, tear: tear,
      setTunnel: function (v) { tunnel = v; },
      reseed: seedMotes
    };
  })();

  /* ══════════════════════════════════════════════════════
     THE EYE
     ══════════════════════════════════════════════════════ */
  var eye = new window.Eye(eyeCanvas);
  var eyeOn = true;
  var blinking = false;
  var act = 0;

  function setAct(n) { act = n; body.dataset.act = String(n); }

  /* gaze input: finger / mouse, with the gyroscope taking over on a phone */
  var gazePointer = { x: 0, y: 0 }, gazeGyro = { x: 0, y: 0 }, gyroSeen = 0, gyroOn = false;

  function onPointer(e) {
    var x = (e.clientX / window.innerWidth - 0.5) * 2;
    var y = (0.5 - e.clientY / window.innerHeight) * 2;
    gazePointer.x = Math.max(-1, Math.min(1, x * 1.15));
    gazePointer.y = Math.max(-1, Math.min(1, y * 1.05));
  }
  function onGyro(e) {
    if (e.gamma === null || e.beta === null) return;
    gyroOn = true; gyroSeen = performance.now();
    gazeGyro.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 26));
    gazeGyro.y = Math.max(-1, Math.min(1, -((e.beta || 0) - 52) / 34));
  }
  function listenGyro() {
    window.addEventListener("deviceorientation", onGyro, true);
  }
  function askGyro() {
    if (gyroOn) return;
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") listenGyro(); }).catch(function () {});
      } else if (window.DeviceOrientationEvent) {
        listenGyro();
      }
    } catch (err) { /* ignore */ }
  }

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });

  function updateGaze() {
    if (!eye.ok) return;
    var useGyro = gyroOn && (performance.now() - gyroSeen < 600);
    var src = useGyro ? gazeGyro : gazePointer;
    eye.target.x += (src.x - eye.target.x) * (useGyro ? 0.16 : 0.22);
    eye.target.y += (src.y - eye.target.y) * (useGyro ? 0.16 : 0.22);
  }

  /* blink + tear */
  function blink(withTear) {
    if (!eye.ok || blinking || act > 1) return;
    blinking = true;
    tween({
      get: function () { return eye.open; }, set: function (v) { eye.open = v; },
      to: 0, dur: 0.085, ease: easeInQuad,
      done: function () {
        if (withTear) spawnTear();
        tween({
          get: function () { return eye.open; }, set: function (v) { eye.open = v; },
          to: 1, dur: 0.18, done: function () { blinking = false; }
        });
      }
    });
  }

  function spawnTear() {
    if (!eye.ok) return;
    var w = eyeCanvas.clientWidth, h = eyeCanvas.clientHeight, m = Math.min(w, h);
    var s = eye.scale || 0.47;
    var x = w / 2 + eye.gaze.x * 0.13 * s * m;
    var y = h / 2 + 0.40 * s * m;
    Fx.tear(x, y);
  }

  /* idle blinks keep it alive */
  var idleTimer = null;
  function scheduleIdleBlink() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (act === 1 && !document.hidden) blink(false);
      scheduleIdleBlink();
    }, 4200 + Math.random() * 4200);
  }

  /* ══════════════════════════════════════════════════════
     THE KINTSUGI HEART
     ══════════════════════════════════════════════════════ */
  var HEART_D = "M50 90 C 46 82, 26 66, 14 52 C 4 40, 3 26, 10 17 C 17 8, 30 7, 38 14 C 45 20, 49 27, 50 33 C 51 27, 55 20, 62 14 C 70 7, 83 8, 90 17 C 97 26, 96 40, 86 52 C 74 66, 54 82, 50 90 Z";
  var VB_W = 100, VB_H = 94, CX = 50, CY = 46;

  function buildHeart(host) {
    var COLS = 4, ROWS = 4;
    var i, j;
    var vx = [], vy = [];
    for (i = 0; i <= COLS; i++) {
      vx[i] = []; vy[i] = [];
      for (j = 0; j <= ROWS; j++) {
        var x = (i / COLS) * VB_W;
        var y = (j / ROWS) * VB_H;
        if (i > 0 && i < COLS) x += (rnd() - 0.5) * 15;
        else if (i === 0) x = 0; else x = VB_W;
        if (j > 0 && j < ROWS) y += (rnd() - 0.5) * 13;
        else if (j === 0) y = 0; else y = VB_H;
        if ((i === 0 || i === COLS) && j > 0 && j < ROWS) y += (rnd() - 0.5) * 9;
        if ((j === 0 || j === ROWS) && i > 0 && i < COLS) x += (rnd() - 0.5) * 11;
        vx[i][j] = x; vy[i][j] = y;
      }
    }

    var tris = [];
    for (i = 0; i < COLS; i++) {
      for (j = 0; j < ROWS; j++) {
        var a = [vx[i][j], vy[i][j]], b = [vx[i + 1][j], vy[i + 1][j]];
        var c = [vx[i + 1][j + 1], vy[i + 1][j + 1]], d = [vx[i][j + 1], vy[i][j + 1]];
        if ((i + j) % 2 === 0) { tris.push([a, b, c]); tris.push([a, c, d]); }
        else { tris.push([a, b, d]); tris.push([b, c, d]); }
      }
    }

    /* unique interior edges → gold seams */
    var seen = {}, edges = [];
    function addEdge(p, q) {
      var k1 = p[0].toFixed(2) + "," + p[1].toFixed(2);
      var k2 = q[0].toFixed(2) + "," + q[1].toFixed(2);
      var key = k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1;
      if (seen[key]) return;
      seen[key] = 1;
      if (onBorder(p) && onBorder(q)) return;
      edges.push([p, q]);
    }
    function onBorder(p) {
      return p[0] <= 0.01 || p[0] >= VB_W - 0.01 || p[1] <= 0.01 || p[1] >= VB_H - 0.01;
    }
    for (i = 0; i < tris.length; i++) {
      var t = tris[i];
      addEdge(t[0], t[1]); addEdge(t[1], t[2]); addEdge(t[2], t[0]);
    }
    /* drop seams that live entirely outside the heart bbox of interest */
    edges = edges.filter(function (e) {
      var mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2;
      return mx > 3 && mx < 97 && my > 2 && my < 91;
    });

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);
    svg.setAttribute("class", "heart-svg");
    svg.setAttribute("aria-hidden", "true");

    var defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML =
      '<clipPath id="heartClip"><path d="' + HEART_D + '"/></clipPath>' +
      '<linearGradient id="goldGrad" gradientUnits="userSpaceOnUse" x1="14" y1="6" x2="88" y2="88">' +
      '<stop offset="0" stop-color="#fff0bd"/><stop offset=".4" stop-color="#f7c948"/>' +
      '<stop offset=".75" stop-color="#e8a52a"/><stop offset="1" stop-color="#ffe08a"/>' +
      "</linearGradient>" +
      '<linearGradient id="glassGrad" gradientUnits="userSpaceOnUse" x1="20" y1="6" x2="80" y2="90">' +
      '<stop offset="0" stop-color="#e8879a"/><stop offset=".32" stop-color="#bd4a63"/>' +
      '<stop offset=".7" stop-color="#7d2342"/><stop offset="1" stop-color="#3d1128"/>' +
      "</linearGradient>" +
      '<radialGradient id="sheenGrad" gradientUnits="userSpaceOnUse" cx="31" cy="17" r="64">' +
      '<stop offset="0" stop-color="#ffffff" stop-opacity=".5"/>' +
      '<stop offset=".5" stop-color="#ffffff" stop-opacity=".07"/>' +
      '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
      "</radialGradient>";
    svg.appendChild(defs);

    var fill = document.createElementNS(svgNS, "path");
    fill.setAttribute("d", HEART_D);
    fill.setAttribute("fill", "url(#glassGrad)");
    fill.setAttribute("class", "heart-fill");
    fill.setAttribute("opacity", "0");
    svg.appendChild(fill);

    var shardsG = document.createElementNS(svgNS, "g");
    shardsG.setAttribute("class", "shards");
    var shards = [];
    for (i = 0; i < tris.length; i++) {
      var t2 = tris[i];
      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "shard");
      var pts = t2.map(function (p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ");
      var poly = document.createElementNS(svgNS, "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", "url(#glassGrad)");
      poly.setAttribute("clip-path", "url(#heartClip)");
      g.appendChild(poly);
      var mx = (t2[0][0] + t2[1][0] + t2[2][0]) / 3;
      var my = (t2[0][1] + t2[1][1] + t2[2][1]) / 3;
      g.style.transformOrigin = mx.toFixed(2) + "px " + my.toFixed(2) + "px";
      g._mx = mx; g._my = my;
      shardsG.appendChild(g);
      shards.push(g);
    }
    svg.appendChild(shardsG);

    /* glass cues — a soft sheen and a lit rim, only while it is whole */
    var sheen = document.createElementNS(svgNS, "path");
    sheen.setAttribute("d", HEART_D);
    sheen.setAttribute("fill", "url(#sheenGrad)");
    sheen.setAttribute("class", "heart-sheen");
    svg.appendChild(sheen);

    var rim = document.createElementNS(svgNS, "path");
    rim.setAttribute("d", HEART_D);
    rim.setAttribute("class", "heart-rim");
    svg.appendChild(rim);

    var seamsG = document.createElementNS(svgNS, "g");
    seamsG.setAttribute("class", "seams");
    var seams = [];
    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      var pth = document.createElementNS(svgNS, "path");
      pth.setAttribute("d", "M" + e[0][0].toFixed(2) + " " + e[0][1].toFixed(2) +
        "L" + e[1][0].toFixed(2) + " " + e[1][1].toFixed(2));
      pth.setAttribute("class", "seam");
      pth.setAttribute("clip-path", "url(#heartClip)");   /* keep the cracks inside the heart */
      seamsG.appendChild(pth);
      var emx = (e[0][0] + e[1][0]) / 2, emy = (e[0][1] + e[1][1]) / 2;
      pth._d = Math.hypot(emx - CX, emy - CY);
      seams.push(pth);
    }
    svg.appendChild(seamsG);

    host.appendChild(svg);

    /* order: gold spreads outward from the middle */
    shards.sort(function (a, b) { return Math.hypot(a._mx - CX, a._my - CY) - Math.hypot(b._mx - CX, b._my - CY); });
    seams.sort(function (a, b) { return a._d - b._d; });

    /* measure the seams so they can be drawn on */
    for (i = 0; i < seams.length; i++) {
      var len = 0;
      try { len = seams[i].getTotalLength(); } catch (err) { len = 20; }
      if (!len || !isFinite(len)) len = 20;
      seams[i].style.strokeDasharray = len.toFixed(2);
      seams[i].style.strokeDashoffset = len.toFixed(2);
      seams[i].style.transitionDelay = (i * 0.035).toFixed(3) + "s";
    }

    return { svg: svg, shards: shards, seams: seams };
  }

  /* ══════════════════════════════════════════════════════
     ACT 1 · the eye opens
     ══════════════════════════════════════════════════════ */
  function showBtn(btn) {
    btn.hidden = false;
    frame().then(function () { btn.classList.add("is-in"); });
  }
  function line(id, delay) {
    return wait(delay).then(function () { var el = $(id); if (el) el.classList.add("is-in"); });
  }

  async function startEye() {
    setAct(1);
    acts[1].classList.add("is-on");
    $("#eyeHint").querySelector(".hint-main").textContent =
      touch ? "move your finger" : "move your mouse";

    if (eye.ok) {
      tween({ get: function () { return eye.open; }, set: function (v) { eye.open = v; }, to: 1, dur: 1.9, delay: 0.35 });
    }
    await line("#l1a", 1250);
    await line("#l1b", 1150);
    await wait(700);
    $("#eyeHint").classList.add("is-in");
    scheduleIdleBlink();
    await wait(1350);
    showBtn($("#next1"));
  }

  /* ══════════════════════════════════════════════════════
     ACT 2 · dive into the pupil
     ══════════════════════════════════════════════════════ */
  async function dive() {
    if (act !== 1) return;
    setAct(2);
    clearTimeout(idleTimer);
    $("#eyeHint").classList.remove("is-in");
    acts[1].classList.remove("is-on");
    acts[2].hidden = false;
    await frame();
    acts[2].classList.add("is-on");

    Fx.reseed();
    Fx.setTunnel(0);
    tween({
      get: function () { return Fx._t || 0; }, set: function (v) { Fx._t = v; Fx.setTunnel(v); },
      to: 1, dur: 1.4, delay: 0.5, ease: easeOutCubic
    });
    tween({ get: function () { return eye.dive; }, set: function (v) { eye.dive = v; }, to: 1, dur: 2.5, delay: 0.15, ease: easeInOut });

    await line("#l2a", 1950);
    await line("#l2b", 1150);
    await line("#l2c", 1150);
    await wait(900);
    showBtn($("#next2"));
  }

  /* ══════════════════════════════════════════════════════
     ACT 3 · the heart breaks, then mends in gold
     ══════════════════════════════════════════════════════ */
  var H = null;

  async function heartAct() {
    if (act !== 2) return;
    setAct(3);
    acts[2].classList.remove("is-on");
    acts[3].hidden = false;
    await frame();
    acts[3].classList.add("is-on");

    /* let the eye go */
    eyeCanvas.style.transition = "opacity 1.1s ease";
    eyeCanvas.style.opacity = "0";
    eyeOn = false;
    tween({ get: function () { return Fx._t || 0; }, set: function (v) { Fx._t = v; Fx.setTunnel(v); }, to: 0, dur: 1.3, ease: easeOutCubic });

    if (!H) H = buildHeart(heartLayer);
    var svg = H.svg;
    svg.classList.remove("is-gold", "is-broken");
    H.seams.forEach(function (s) {
      var len = parseFloat(s.style.strokeDasharray) || 20;
      s.style.transition = "none";
      s.style.strokeDashoffset = len;
    });
    H.shards.forEach(function (g) { g.style.transition = "none"; g.style.transform = "none"; g.style.opacity = "1"; });
    svg.style.transition = "none";
    svg.style.transform = "translateY(-52%) rotate(-7deg) scale(.94)";
    heartLayer.style.transition = "opacity .55s ease";
    heartLayer.style.opacity = "1";
    await frame(); await frame();

    /* fall */
    svg.style.transition = "transform 1.05s cubic-bezier(.55,.02,.9,.5)";
    svg.style.transform = "translateY(0) rotate(0deg) scale(1)";
    await wait(1050);

    /* impact → shatter */
    svg.classList.add("is-broken");
    H.shards.forEach(function (g, i) {
      var dx = g._mx - CX, dy = g._my - CY;
      var len = Math.hypot(dx, dy) || 1;
      var dist = 11 + rnd() * 30;
      var tx = (dx / len) * dist + (rnd() - 0.5) * 20;
      var ty = (dy / len) * dist + (rnd() - 0.5) * 20 + 12;
      var rot = (rnd() - 0.5) * 150;
      var delay = (i * 0.011).toFixed(3);
      g.style.transition = "transform 1.45s cubic-bezier(.16,.84,.44,1) " + delay + "s, opacity 1.1s ease " + delay + "s";
      g.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg)";
      g.style.opacity = "0.78";
    });

    /* silence */
    await wait(2100);

    /* drift back */
    H.shards.forEach(function (g, i) {
      var delay = ((H.shards.length - 1 - i) * 0.009).toFixed(3);
      g.style.transition = "transform 1.05s cubic-bezier(.42,0,.18,1) " + delay + "s, opacity .8s ease " + delay + "s";
      g.style.transform = "none";
      g.style.opacity = "1";
    });
    await wait(1050 + H.shards.length * 0.009 + 250);

    /* whole again — the glass rim and sheen come back, then the gold */
    svg.classList.remove("is-broken");

    /* gold */
    H.seams.forEach(function (s) { s.style.transition = "stroke-dashoffset 1.35s cubic-bezier(.4,0,.2,1)"; });
    svg.classList.add("is-gold");
    await wait(1500);

    await line("#l3a", 250);
    await line("#l3b", 900);
    await wait(1100);
    showBtn($("#next3"));
  }

  /* ══════════════════════════════════════════════════════
     ACT 4 · the gift
     ══════════════════════════════════════════════════════ */
  async function goGift() {
    if (act >= 4) { gift.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    setAct(4);
    clearTimeout(idleTimer);

    goldBloom.style.transition = "opacity .85s ease, transform 1.4s cubic-bezier(.3,0,.2,1)";
    goldBloom.style.transform = "scale(.55)";
    goldBloom.style.opacity = "0";
    await frame();
    goldBloom.style.opacity = "1";
    goldBloom.style.transform = "scale(1.6)";

    await wait(820);
    gift.hidden = false;
    await frame();
    gift.classList.add("is-in");
    window.scrollTo(0, 0);
    await wait(700);
    goldBloom.style.opacity = "0";
    if (!reduced) cinematic.style.display = "none";
  }

  /* ══════════════════════════════════════════════════════
     wiring
     ══════════════════════════════════════════════════════ */
  $("#next1").addEventListener("click", dive);
  $("#next2").addEventListener("click", heartAct);
  $("#next3").addEventListener("click", goGift);
  $("#replayBtn").addEventListener("click", function () { window.location.reload(); });
  $(".skip-link").addEventListener("click", function (e) { e.preventDefault(); goGift(); });

  acts[1].addEventListener("click", function (e) {
    if (e.target.closest("button")) return;
    askGyro();
    blink(true);
  });

  window.addEventListener("resize", function () {
    if (eye.ok) eye.resize();
    Fx.resize();
  });

  /* ── reduced motion: everything, still, and readable ──── */
  function bootReduced() {
    body.classList.add("reduced");
    setAct(4);
    document.querySelectorAll(".line").forEach(function (el) { el.classList.add("is-in"); });
    document.querySelectorAll(".next, .hint").forEach(function (el) { el.hidden = true; });
    var host = document.createElement("div");
    host.className = "heart-static";
    acts[3].insertBefore(host, acts[3].querySelector(".copy"));
    var r = buildHeart(host);
    r.svg.classList.add("is-broken", "is-gold");
    r.seams.forEach(function (s) { s.style.strokeDashoffset = "0"; });
    if (eye.ok) { eye.open = 1; eye.render(0); }
    eyeCanvas.style.opacity = "1";
    gift.hidden = false;
    gift.classList.add("is-in");
    cinematic.style.display = "";
    body.style.overflow = "auto";
  }

  /* ── boot ─────────────────────────────────────────────── */
  function boot() {
    if (eye.ok) { eye.open = 0; eye.render(0); }
    if (reduced) { bootReduced(); return; }
    startEye();
    requestAnimationFrame(loop);
  }

  var last = performance.now(), t0 = last;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    stepTweens(dt);
    if (act <= 3) {
      updateGaze();
      if (eye.ok && eyeOn) eye.render(dt);
      Fx.step(dt, (now - t0) / 1000);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
