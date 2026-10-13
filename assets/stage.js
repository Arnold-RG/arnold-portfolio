(function () {
  var canvas = document.getElementById("stage");
  if (!canvas) return;

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches) return;

  var gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  if (!gl) return;

  var vert = [
    "attribute vec2 a;",
    "void main(){ gl_Position = vec4(a, 0.0, 1.0); }"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform vec2 uPointer;",
    "uniform float uDark;",
    "uniform float uShift;",
    "uniform float uScale;",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float sdTorus(vec3 p, vec2 t){",
    "  vec2 q = vec2(length(p.xz) - t.x, p.y);",
    "  return length(q) - t.y;",
    "}",
    "float map(vec3 p){",
    "  p.x -= uShift;",
    "  p *= uScale;",
    "  float t = uTime * 0.12;",
    "  vec3 a = p; a.xz *= rot(t); a.xy *= rot(0.55 + t * 0.35);",
    "  float d = sdTorus(a, vec2(1.22, 0.06));",
    "  vec3 b = p; b.yz *= rot(1.15 + t * 0.45);",
    "  d = min(d, sdTorus(b, vec2(0.82, 0.032)));",
    "  vec3 c = p; c.xy *= rot(-0.7 + t * 0.28); c.xz *= rot(t * 0.2);",
    "  d = min(d, sdTorus(c, vec2(1.58, 0.02)));",
    "  vec3 e = p; e.xz *= rot(-t * 0.55); e.yz *= rot(0.35);",
    "  d = min(d, sdTorus(e, vec2(0.48, 0.026)));",
    "  return d;",
    "}",
    "vec3 normal(vec3 p){",
    "  vec2 e = vec2(0.004, 0.0);",
    "  return normalize(vec3(",
    "    map(p + e.xyy) - map(p - e.xyy),",
    "    map(p + e.yxy) - map(p - e.yxy),",
    "    map(p + e.yyx) - map(p - e.yyx)));",
    "}",
    "void main(){",
    "  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;",
    "  vec3 ro = vec3(0.0, 0.05, 3.35);",
    "  vec3 rd = normalize(vec3(uv, -1.45));",
    "  float t = 0.0;",
    "  float hit = 0.0;",
    "  float glow = 0.0;",
    "  for (int i = 0; i < 64; i++){",
    "    vec3 p = ro + rd * t;",
    "    float d = map(p);",
    "    glow += exp(-abs(d) * 22.0);",
    "    if (d < 0.002){ hit = 1.0; break; }",
    "    t += max(d * 0.82, 0.004);",
    "    if (t > 7.5) break;",
    "  }",
    "  vec3 brass = mix(vec3(0.62, 0.44, 0.18), vec3(0.93, 0.78, 0.46), uDark);",
    "  float haze = clamp(glow * 0.008, 0.0, 0.42) * (0.55 + 0.45 * uDark);",
    "  if (hit < 0.5){",
    "    gl_FragColor = vec4(brass, haze);",
    "    return;",
    "  }",
    "  vec3 p = ro + rd * t;",
    "  vec3 n = normal(p);",
    "  vec3 light = normalize(vec3(uPointer.x * 1.4 + 0.35, 0.85 + uPointer.y * 0.4, 1.2));",
    "  float diff = clamp(dot(n, light), 0.0, 1.0);",
    "  vec3 h = normalize(light - rd);",
    "  float spec = pow(clamp(dot(n, h), 0.0, 1.0), 46.0);",
    "  float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.1);",
    "  vec3 deep = mix(vec3(0.11, 0.13, 0.18), vec3(0.20, 0.14, 0.07), uDark);",
    "  vec3 specCol = mix(vec3(1.0, 0.94, 0.82), vec3(0.78, 0.88, 1.0), clamp(n.y * 0.5 + 0.5, 0.0, 1.0));",
    "  vec3 col = deep * 0.12 + brass * (0.58 + diff * 0.62) + specCol * spec * 0.95 + brass * rim * 0.5;",
    "  float ang = atan(p.z, p.x);",
    "  float groove = smoothstep(0.07, 0.0, abs(fract(ang * 5.0) - 0.5) - 0.45);",
    "  col = mix(col, col * 0.8, groove * 0.4);",
    "  float fade = smoothstep(0.0, 0.42, gl_FragCoord.y / uRes.y);",
    "  gl_FragColor = vec4(col, (0.94 - haze * 0.2) * fade);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vs = compile(gl.VERTEX_SHADER, vert);
  var fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uPointer = gl.getUniformLocation(prog, "uPointer");
  var uDark = gl.getUniformLocation(prog, "uDark");
  var uShift = gl.getUniformLocation(prog, "uShift");
  var uScale = gl.getUniformLocation(prog, "uScale");

  var pointer = { x: 0.15, y: 0.1 };
  var target = { x: 0.15, y: 0.1 };
  var start = performance.now();
  var running = true;
  var width = 0;
  var height = 0;

  function darkValue() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0;
  }

  function resize() {
    var scale = Math.min(window.devicePixelRatio || 1, 1.35);
    if (window.innerWidth < 800) scale = Math.min(scale, 1);
    var w = Math.max(2, Math.floor(canvas.clientWidth * scale * 0.72));
    var h = Math.max(2, Math.floor(canvas.clientHeight * scale * 0.72));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function frame(now) {
    if (!running) return;
    resize();
    pointer.x += (target.x - pointer.x) * 0.06;
    pointer.y += (target.y - pointer.y) * 0.06;
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uDark, darkValue());
    gl.uniform1f(uShift, window.innerWidth < 860 ? 0.0 : 1.28);
    gl.uniform1f(uScale, window.innerWidth < 860 ? 1.42 : 1.0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", function (event) {
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = 1 - (event.clientY / window.innerHeight) * 2;
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    var hidden = document.hidden;
    if (hidden) {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });

  window.addEventListener("resize", resize);
  document.documentElement.setAttribute("data-stage", "on");
  requestAnimationFrame(frame);
})();
