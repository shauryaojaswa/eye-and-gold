/* ============================================================
   eye.js — a shader iris on black.
   Tracks a gaze vector (finger / mouse / gyroscope), blinks,
   and dives into the pupil. Zero dependencies.
   ============================================================ */
(function (global) {
  "use strict";

  var VERT = [
    "attribute vec2 aPos;",
    "void main(){ gl_Position = vec4(aPos,0.0,1.0); }"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform vec2  uRes;",
    "uniform float uOpen;",   // 0..1 lid opening
    "uniform vec2  uGaze;",   // -1..1
    "uniform float uDive;",   // 0..1 push into the pupil
    "uniform float uScale;",  // eye half-width, in min-dimension units
    "uniform float uTime;",

    "float hash21(vec2 p){",
    "  p = fract(p * vec2(123.34,456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",
    "float vnoise(vec2 p){",
    "  vec2 i = floor(p), f = fract(p);",
    "  vec2 u = f*f*(3.0-2.0*f);",
    "  float a = hash21(i);",
    "  float b = hash21(i+vec2(1.0,0.0));",
    "  float c = hash21(i+vec2(0.0,1.0));",
    "  float d = hash21(i+vec2(1.0,1.0));",
    "  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);",
    "}",
    "float fbm3(vec2 p){",
    "  float v = 0.0, a = 0.55;",
    "  for(int i=0;i<3;i++){ v += a*vnoise(p); p = p*2.11 + 7.3; a *= 0.5; }",
    "  return v;",
    "}",

    "void main(){",
    "  float m = min(uRes.x, uRes.y);",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes) / m;",

    /* ---- background: near-black with a breath of warmth ---- */
    "  vec3 bg = vec3(0.014,0.012,0.017);",
    "  bg += vec3(0.030,0.020,0.030) * (1.0 - smoothstep(0.0,0.9,length(p))) * 0.55;",

    /* ---- zoom into the pupil ---- */
    "  float zoom = 1.0 + pow(uDive, 1.7) * 130.0;",
    "  vec2 gc = uGaze * (1.0 - uDive*0.9);",
    "  vec2 e = ((p / uScale) - gc) / zoom + gc;",

    /* ---- the aperture (almond lid opening) ---- */
    "  float open = smoothstep(0.0,1.0,uOpen);",
    "  float axr = abs(e.x);",              // unclamped — used to fade lashes out
    "  float ax = clamp(axr,0.0,1.0);",
    "  float upS = pow(max(0.0,1.0-ax*ax),0.55);",
    "  float loS = pow(max(0.0,1.0-ax*ax),0.82);",
    "  float up = 0.49 * upS * open;",
    "  float lo = -0.43 * loS * open;",
    "  float dUp = up - e.y;",
    "  float dLo = e.y - lo;",
    "  float dIn = min(dUp, dLo);",
    /* outside the almond the two edges collapse onto y=0 — kill that band */
    "  float xEdge = 1.0 - smoothstep(0.997, 1.004, abs(e.x));",
    "  float inside = smoothstep(-0.006, 0.006, dIn) * xEdge;",

    /* ---- iris geometry ---- */
    "  vec2 irisC = vec2(uGaze.x*0.13, 0.045 + uGaze.y*0.07);",
    "  float R = 0.47;",
    "  vec2 ic = e - irisC;",
    "  float t = length(ic) / R;",
    "  vec2 dir = ic / max(length(ic), 1e-5);",

    /* ---- sclera ---- */
    "  vec3 scl = vec3(0.82,0.79,0.765);",
    "  if (t > 1.0) {",
    /* fine horizontal streaks, not blobs */
    "    float vn = vnoise(vec2(e.x*7.0,  e.y*34.0)) * 0.66",
    "             + vnoise(vec2(e.x*16.0 + 4.0, e.y*72.0)) * 0.34;",
    "    float vein = smoothstep(0.72,0.95,vn) * smoothstep(0.7,1.35,t);",
    "    scl = mix(scl, vec3(0.78,0.44,0.42), vein*0.34);",
    "    scl *= mix(1.0, 0.46, smoothstep(1.0,1.55,t));",
    "  }",

    /* ---- iris ---- */
    "  vec3 iris = scl;",
    "  if (t < 1.04) {",
    "    float tt = clamp(t,0.0,1.0);",
    "    vec3 col = mix(vec3(0.19,0.085,0.033), vec3(0.63,0.36,0.13), smoothstep(0.10,0.55,tt));",
    "    col = mix(col, vec3(0.30,0.15,0.055), smoothstep(0.58,1.0,tt));",

    /* wander the sampling angle so the fibres are organic, not a sunburst */
    /* the sampling angle also drifts with radius, so rays bend instead of radiating */
    "    float wob = (fbm3(dir*2.3 + 5.0) - 0.5) * 0.50 + (fbm3(dir*6.4 + 1.0) - 0.5) * 0.18",
    "              + (fbm3(dir*3.9 + tt*2.7 + 11.0) - 0.5) * 0.55;",
    "    float cw = cos(wob), sw = sin(wob);",
    "    vec2 dw = vec2(dir.x*cw - dir.y*sw, dir.x*sw + dir.y*cw);",
    "    float n1 = fbm3(dir*5.0 + tt*1.1);",
    "    float n2 = vnoise(dw*17.0 + vec2(tt*3.4, -tt*2.2));",
    "    float n3 = vnoise(dw*44.0 + vec2(tt*6.5, -tt*4.2));",
    /* gate the fine detail so it never forms continuous spokes */
    "    float spoke = 0.45 + 0.55*vnoise(dir*7.0 + tt*2.0 + 3.0);",
    "    float fib = (n1-0.5)*0.62 + (n2-0.5)*0.66*spoke + (n3-0.5)*0.26*spoke;",
    "    col *= 1.0 + fib*0.84;",

    "    float crypt = smoothstep(0.54,0.90, n1 + tt*0.14);",
    "    col *= 1.0 - crypt*0.44*smoothstep(0.22,0.78,tt);",

    "    float coll = 1.0 - smoothstep(0.0,0.10, abs(tt - (0.42 + 0.06*fbm3(dir*4.5+2.0))));",
    "    col += vec3(0.32,0.20,0.07) * coll * 0.95;",

    "    col = mix(col, vec3(0.045,0.022,0.014), smoothstep(0.86,1.0,tt)*0.95);",

    "    float fleck = smoothstep(0.74,0.96, vnoise(dir*27.0+31.0)) * smoothstep(0.3,0.9,tt) * (1.0-smoothstep(0.84,1.0,tt));",
    "    col += vec3(0.60,0.40,0.13) * fleck * 0.55;",

    "    float pr = 0.345 + 0.11*smoothstep(0.0,0.45,uDive);",
    "    float pupil = 1.0 - smoothstep(pr-0.012, pr+0.012, tt);",
    "    col = mix(col, vec3(0.004,0.003,0.005), pupil);",
    "    col += vec3(0.17,0.11,0.04) * (1.0 - smoothstep(pr, pr+0.11, tt)) * (1.0-pupil) * 0.55;",

    "    iris = mix(scl, col, 1.0 - smoothstep(0.965,1.0,tt));",
    "  }",

    /* ---- catchlights + corneal sheen ---- */
    "  vec2 h1 = irisC + vec2(-0.14,0.16);",
    "  vec2 h2 = irisC + vec2(0.105,-0.105);",
    "  float c1 = 1.0 - smoothstep(0.010,0.074, length((e-h1)*vec2(1.0,1.15)));",
    "  float c2 = 1.0 - smoothstep(0.005,0.034, length(e-h2));",
    "  float sheen = 1.0 - smoothstep(0.0,0.6, length((e-irisC-vec2(-0.06,0.11))/vec2(0.62,0.42)));",
    "  vec3 eyeball = iris + vec3(1.0)*(c1*0.95 + c2*0.5) + vec3(0.85,0.90,1.0)*sheen*0.10;",

    /* ---- lid shading ---- */
    "  eyeball *= mix(0.44,1.0, smoothstep(0.0,0.27,dUp));",
    "  eyeball *= mix(0.76,1.0, smoothstep(0.0,0.15,dLo));",

    /* ---- the dark around the eye ---- */
    /* true distance from the almond: beyond the corners it must fall off
       radially, otherwise the collapsed edges leave a line to the screen edge */
    "  float ext = max(0.0, abs(e.x) - 1.0);",
    "  float outD = length(vec2(ext, max(0.0, -dIn)));",
    "  vec3 skin = vec3(0.088,0.054,0.050);",
    "  vec3 surround = mix(bg, skin, exp(-outD*4.2));",
    "  surround += vec3(0.030,0.020,0.020) * exp(-outD*7.0) * smoothstep(-0.35,0.30,e.y+0.32);",

    "  vec3 col = mix(surround, eyeball, inside);",

    /* ---- lashes: a tapered liner + a fine, irregular fringe ---- */
    "  float outerAmt = 1.0 - smoothstep(-0.95, 0.95, e.x);",   // 1 at the outer corner
    "  float lashEnv = mix(0.30, 1.0, outerAmt);",
    "  float wing = 0.040 * smoothstep(0.5,1.0,outerAmt) * open;",
    "  float uTh = mix(0.013, 0.050, outerAmt);",
    "  float linerU = (1.0 - smoothstep(0.0, uTh, dUp)) * step(-(0.004+wing), dUp);",
    "  float fFreq = 26.0 + 9.0*vnoise(vec2(e.x*1.6 + 9.0, 4.0));",
    "  float fAmp  = (0.026 + 0.050*vnoise(vec2(e.x*2.7 + 3.0, 1.7))) * lashEnv * open;",
    "  float fSpike = fAmp * pow(abs(sin(e.x*fFreq + 1.1)), 15.0);",
    "  float fringeU = step(-fSpike, dUp) * (1.0 - step(0.0001, dUp));",

    "  float lTh = mix(0.024, 0.011, outerAmt);",
    "  float linerL = (1.0 - smoothstep(0.0, lTh, dLo)) * step(-0.003, dLo);",
    "  float gFreq = 30.0 + 8.0*vnoise(vec2(e.x*1.9 + 21.0, 7.0));",
    "  float gAmp  = (0.011 + 0.020*vnoise(vec2(e.x*3.1 + 12.0, 2.5))) * open;",
    "  float gSpike = gAmp * pow(abs(sin(e.x*gFreq + 2.4)), 16.0);",
    "  float fringeL = step(-gSpike, dLo) * (1.0 - step(0.0001, dLo));",

    "  float taper = 1.0 - smoothstep(0.93, 1.12, axr);",
    "  float closedLine = (1.0-open) * (1.0 - smoothstep(0.003,0.030,abs(e.y))) * (1.0 - smoothstep(0.86,1.04,axr));",
    "  float lash = max(max(linerU*taper, fringeU*taper),",
    "                  max(max(linerL*taper, fringeL*taper), closedLine));",
    "  lash *= xEdge;",   // nothing beyond the corners
    "  col = mix(col, vec3(0.010,0.007,0.009), lash*0.97);",

    /* ---- dissolve into the tunnel ---- */
    "  col = mix(col, bg, smoothstep(0.70,1.0,uDive));",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function Eye(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.open = 0;
    this.gaze = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.dive = 0;
    this.time = 0;

    var gl = null;
    try {
      gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "high-performance" })
        || canvas.getContext("experimental-webgl", { alpha: false });
    } catch (err) { gl = null; }
    if (!gl) return;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.gl = gl;
    this.u = {
      res:   gl.getUniformLocation(prog, "uRes"),
      open:  gl.getUniformLocation(prog, "uOpen"),
      gaze:  gl.getUniformLocation(prog, "uGaze"),
      dive:  gl.getUniformLocation(prog, "uDive"),
      scale: gl.getUniformLocation(prog, "uScale"),
      time:  gl.getUniformLocation(prog, "uTime")
    };
    this.ok = true;
    this.resize();
  }

  Eye.prototype.resize = function () {
    if (!this.ok) return;
    var c = this.canvas;
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.75 : 2);
    var w = Math.max(1, Math.round(c.clientWidth * dpr));
    var h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w; c.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    var aspect = (c.clientWidth || 1) / (c.clientHeight || 1);
    this.scale = Math.min(0.78, 0.47 * (1 + 0.5 * Math.max(0, aspect - 1)));
  };

  Eye.prototype.render = function (dt) {
    if (!this.ok) return;
    var gl = this.gl;
    this.time += dt;

    // ease the gaze toward its target
    var k = 1 - Math.pow(0.001, dt);
    this.gaze.x += (this.target.x - this.gaze.x) * k;
    this.gaze.y += (this.target.y - this.gaze.y) * k;

    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.open, this.open);
    gl.uniform2f(this.u.gaze, this.gaze.x, this.gaze.y);
    gl.uniform1f(this.u.dive, this.dive);
    gl.uniform1f(this.u.scale, this.scale || 0.47);
    gl.uniform1f(this.u.time, this.time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  global.Eye = Eye;
})(window);
