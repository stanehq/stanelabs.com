import { useEffect, useRef, useState } from 'react';

const vertexSource = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute float a_occlusion;
  uniform mat3 u_rotation;
  uniform float u_position_scale;
  uniform float u_aspect;
  varying vec3 v_position;
  varying vec3 v_normal;
  varying float v_occlusion;
  void main() {
    vec3 p = u_rotation * (a_position * u_position_scale);
    v_position = p; v_normal = u_rotation * a_normal; v_occlusion = a_occlusion;
    float depth = 4.8 - p.z;
    gl_Position = vec4(p.x * 3.6 / u_aspect, p.y * 3.6, depth * 1.002 - .2002, depth);
  }
`;
const fragmentSource = `
  precision highp float;
  varying vec3 v_position;
  varying vec3 v_normal;
  varying float v_occlusion;
  uniform vec3 u_key;
  uniform vec3 u_primary;
  uniform vec3 u_background;
  uniform vec3 u_foreground;
  vec3 studio(vec3 direction, vec3 blue, vec3 white, vec3 dark) {
    float horizon = smoothstep(-.85, .85, direction.y);
    vec3 environment = mix(mix(dark, blue, .45), mix(blue, white, .22), horizon);
    float softbox = pow(smoothstep(.15, .96, dot(direction, vec3(-.352180, .616316, .704361))), 1.4);
    float fill = max(dot(direction, vec3(.814378, .152696, .559885)), 0.);
    float fill2 = fill * fill, fill4 = fill2 * fill2;
    float lower = 1. - smoothstep(-.8, -.15, direction.y);
    environment = mix(environment, mix(dark, blue, .62), lower * .32);
    return mix(environment, white, clamp(softbox * .76 + fill4 * fill2 * fill * .22, 0., .88));
  }
  void main() {
    vec3 blue = u_primary, white = u_background, dark = u_foreground;
    vec3 n = normalize(v_normal);
    vec3 view = normalize(vec3(0., 0., 4.8) - v_position);
    float keyLight = max(dot(n, u_key), 0.);
    float fillLight = max(dot(n, vec3(.789935, .091146, .607643)), 0.);
    float facing = 1. - max(dot(n, view), 0.);
    float facing2 = facing * facing;
    float fresnel = facing2 * facing2 * facing;
    float diffuse = clamp(.28 + keyLight * .55 + fillLight * .13, 0., 1.);
    vec3 base = mix(dark, blue, diffuse);
    vec3 reflection = studio(reflect(-view, n), blue, white, dark);
    vec3 color = mix(base, reflection, .28 + fresnel * .38);
    color = mix(mix(dark, blue, .48), color, v_occlusion);
    float halfAngle = max(dot(n, normalize(u_key + view)), 0.);
    float h2 = halfAngle * halfAngle, h4 = h2 * h2, h8 = h4 * h4;
    float h16 = h8 * h8, h32 = h16 * h16;
    float broadHighlight = h16 * h8;
    float satinHighlight = h32 * h16 * h8 * h2;
    float edge = max(dot(n, vec3(.902258, .350878, -.250627)), 0.);
    float edge2 = edge * edge, edge4 = edge2 * edge2, edge8 = edge4 * edge4;
    float edgeLight = edge8 * edge4 * edge2;
    float highlight = 1. - exp(-(.34 * broadHighlight + .30 * satinHighlight + .10 * edgeLight));
    color = mix(color, white, highlight * (.8 + .2 * v_occlusion));
    gl_FragColor = vec4(pow(clamp(color, dark, white), vec3(1. / 2.2)), 1.);
  }
`;

function readLinearColor(name: string): Float32Array {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = value.length === 4 ? `#${value.slice(1).split('').map(channel => channel + channel).join('')}` : value;
  return new Float32Array([1, 3, 5].map(index => (parseInt(hex.slice(index, index + 2), 16) / 255) ** 2.2));
}

export default function LiquidField({ className = '' }: { className?: string }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let cleanup = () => {};
    const initialize = async () => {
      const response = await fetch('/sculpture/knot.bin?v=2', { signal: controller.signal });
      if (!response.ok) throw new Error('Geometry unavailable');
      const data = await response.arrayBuffer();
      if (controller.signal.aborted) return;
      if (data.byteLength < 24 || data.byteLength > 1024 * 1024) throw new Error('Invalid geometry size');
      const header = new DataView(data);
      const vertexCount = header.getUint32(8, true), indexCount = header.getUint32(12, true);
      const positionScale = header.getFloat32(16, true), stride = header.getUint32(20, true);
      const indexOffset = 24 + vertexCount * stride;
      if (header.getUint32(0, true) !== 0x544f4e4b || header.getUint32(4, true) !== 1 || !vertexCount || vertexCount > 65535 || !indexCount || indexCount % 3 || stride !== 14 || !Number.isFinite(positionScale) || positionScale <= 0 || positionScale > 2 || data.byteLength !== indexOffset + indexCount * 2) throw new Error('Invalid geometry layout');
      const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'default', premultipliedAlpha: false });
      if (!gl) { setFallback(true); return; }
      const parallelCompiler = gl.getExtension('KHR_parallel_shader_compile');
      const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = [];
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type); if (!shader) return null;
        gl.shaderSource(shader, source); gl.compileShader(shader);
        shaders.push(shader); return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource), program = gl.createProgram();
      if (!vertex || !fragment || !program) { shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); setFallback(true); return; }
      const releaseResources = () => { buffers.forEach(buffer => gl.deleteBuffer(buffer)); shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); };
      cleanup = releaseResources;
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      // Checking COMPILE_STATUS immediately would force the main thread to
      // wait for the GPU driver. Let supporting drivers compile in parallel.
      if (parallelCompiler) await new Promise<void>((resolve, reject) => {
        let timer: number | undefined;
        const finish = (error?: Error) => { if (timer !== undefined) window.clearTimeout(timer); controller.signal.removeEventListener('abort', abort); if (error) reject(error); else resolve(); };
        const abort = () => finish(new Error('Geometry initialization aborted'));
        const check = () => {
          if (gl.isContextLost()) finish(new Error('WebGL context lost'));
          else if (gl.getProgramParameter(program, parallelCompiler.COMPLETION_STATUS_KHR)) finish();
          else timer = window.setTimeout(check, 16);
        };
        controller.signal.addEventListener('abort', abort, { once: true });
        if (controller.signal.aborted) abort(); else check();
      });
      if (controller.signal.aborted) return;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { releaseResources(); setFallback(true); return; }
      gl.useProgram(program);
      const vertexBuffer = gl.createBuffer(), elementBuffer = gl.createBuffer();
      if (!vertexBuffer || !elementBuffer) {
        if (vertexBuffer) gl.deleteBuffer(vertexBuffer); if (elementBuffer) gl.deleteBuffer(elementBuffer);
        shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); setFallback(true); return;
      }
      buffers.push(vertexBuffer, elementBuffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(data, 24, vertexCount * stride), gl.STATIC_DRAW);
      for (const [name, size, type, offset] of [['a_position', 3, gl.SHORT, 0], ['a_normal', 3, gl.SHORT, 6], ['a_occlusion', 1, gl.UNSIGNED_BYTE, 12]] as const) {
        const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, type, true, stride, offset);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data, indexOffset, indexCount), gl.STATIC_DRAW);
      // This is a closed, clockwise mesh: the back surface cannot be seen.
      gl.enable(gl.CULL_FACE); gl.frontFace(gl.CW); gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
      gl.uniform1f(gl.getUniformLocation(program, 'u_position_scale'), positionScale);
      for (const name of ['primary', 'background', 'foreground']) gl.uniform3fv(gl.getUniformLocation(program, `u_${name}`), readLinearColor(`--${name}`));
      const rotation = gl.getUniformLocation(program, 'u_rotation'), aspect = gl.getUniformLocation(program, 'u_aspect'), key = gl.getUniformLocation(program, 'u_key');
      const matrix = new Float32Array(9);
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const target = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
      let frame = 0, inView = true, disposed = false, lastTime = 0, elapsed = 0, firstDraw = true;
      let cssWidth = 1, cssHeight = 1, baseRatio = 1, quality = 1;
      let sampleFrames = 0, sampleDuration = 0, lateFrames = 0, stableWindows = 0;
      let lastShadowTime = 0, shadowX = '', shadowScale = '';
      let scrollOffset = Math.min(window.scrollY * .0008, .18);
      const sizeBuffer = () => {
        const width = Math.max(1, Math.round(cssWidth * baseRatio * quality)), height = Math.max(1, Math.round(cssHeight * baseRatio * quality));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
        gl.uniform1f(aspect, cssWidth / cssHeight);
      };
      const resetSamples = () => { sampleFrames = sampleDuration = lateFrames = stableWindows = 0; };
      const draw = (timestamp: number) => {
        frame = 0;
        if (disposed || document.hidden || !inView || gl.isContextLost()) return;
        const interval = lastTime ? timestamp - lastTime : 0;
        const step = interval ? Math.min(interval / 1000, .08) : 1 / 60;
        if (!motion.matches) elapsed += step;
        lastTime = timestamp;
        const ease = 1 - Math.exp(-step / .18);
        pointer.x += (target.x - pointer.x) * ease; pointer.y += (target.y - pointer.y) * ease;
        const x = .28 + Math.sin(elapsed * .45) * .12 + pointer.y * .25;
        const y = -.30 + Math.sin(elapsed * .30) * .35 + pointer.x * .40 + (motion.matches ? 0 : scrollOffset);
        const z = -.24 + Math.sin(elapsed * .22) * .10;
        const sx = Math.sin(x), cx = Math.cos(x), sy = Math.sin(y), cy = Math.cos(y), sz = Math.sin(z), cz = Math.cos(z);
        matrix.set([cz * cy, sz * cy, -sy, cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx, cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx]);
        gl.uniformMatrix3fv(rotation, false, matrix);
        const keyX = -2.4 + Math.sin(elapsed * .4) * 1.5, keyLength = Math.hypot(keyX, 3.5, 4);
        gl.uniform3f(key, keyX / keyLength, 3.5 / keyLength, 4 / keyLength);
        // The soft floor shadow does not need DOM writes at display frequency.
        if (firstDraw || timestamp - lastShadowTime >= 100) {
          const nextX = `${Math.max(-12, Math.min(12, (y + .30) * 12)).toFixed(1)}px`, nextScale = (1 - Math.abs(x) * .1).toFixed(2);
          if (nextX !== shadowX) { fieldRef.current?.style.setProperty('--sculpture-shadow-x', nextX); shadowX = nextX; }
          if (nextScale !== shadowScale) { fieldRef.current?.style.setProperty('--sculpture-shadow-scale', nextScale); shadowScale = nextScale; }
          lastShadowTime = timestamp;
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        if (firstDraw) { firstDraw = false; setReady(true); }
        // Match the display's rAF cadence. If rendering misses frames, reduce
        // pixels rather than alternating 33/50 ms draws behind a 30 fps gate.
        if (!motion.matches && interval > 0) {
          sampleFrames++; sampleDuration += Math.min(interval, 80); if (interval > 22) lateFrames++;
          if (sampleFrames >= 90) {
            if (sampleDuration / sampleFrames > 20 || lateFrames > 18) { quality = Math.max(.55, quality * .85); stableWindows = 0; sizeBuffer(); }
            else if (sampleDuration / sampleFrames < 18 && lateFrames < 4 && ++stableWindows >= 3) { quality = Math.min(1, quality * 1.1); stableWindows = 0; sizeBuffer(); }
            sampleFrames = sampleDuration = lateFrames = 0;
          }
        }
        if (!motion.matches) frame = requestAnimationFrame(draw);
      };
      const resume = () => {
        if (frame) cancelAnimationFrame(frame);
        lastTime = 0; resetSamples();
        if (!disposed && !document.hidden && inView) frame = requestAnimationFrame(draw);
      };
      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        cssWidth = Math.max(1, bounds.width); cssHeight = Math.max(1, bounds.height);
        // Bound fragment work, especially on dense mobile screens. Adaptation
        // below can further reduce the buffer without changing the CSS size.
        baseRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt((coarsePointer ? 220000 : 480000) / (cssWidth * cssHeight)));
        sizeBuffer(); resume();
      };
      const move = (event: PointerEvent) => {
        if (motion.matches || event.pointerType === 'touch') return;
        target.x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
        target.y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      };
      const scroll = () => { if (!motion.matches) scrollOffset = Math.max(0, Math.min(window.scrollY * .0008, .18)); };
      const leave = () => { target.x = target.y = 0; };
      const motionChanged = () => { if (!motion.matches) scroll(); if (motion.matches) { target.x = target.y = pointer.x = pointer.y = 0; elapsed = scrollOffset = 0; } resume(); };
      const lost = (event: Event) => { event.preventDefault(); disposed = true; if (frame) cancelAnimationFrame(frame); frame = 0; setFallback(true); };
      const restored = () => setFallback(true);
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }); observer.observe(canvas);
      window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('blur', leave); document.addEventListener('mouseleave', leave); window.addEventListener('scroll', scroll, { passive: true }); document.addEventListener('visibilitychange', resume); motion.addEventListener('change', motionChanged);
      canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored); resize();
      cleanup = () => {
        disposed = true; if (frame) cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect();
        window.removeEventListener('pointermove', move); window.removeEventListener('blur', leave); document.removeEventListener('mouseleave', leave); window.removeEventListener('scroll', scroll); document.removeEventListener('visibilitychange', resume); motion.removeEventListener('change', motionChanged);
        canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored);
        releaseResources();
      };
    };
    initialize().catch(() => { if (!controller.signal.aborted) setFallback(true); });
    return () => { controller.abort(); cleanup(); };
  }, []);
  return <div ref={fieldRef} className={`liquid-field ${className}`} aria-hidden="true"><div className="sculpture-ground" />{!ready && !fallback && <div className="sculpture-fallback is-loading"><span /><span /><span /></div>}<canvas ref={canvasRef} className={fallback ? 'sculpture-canvas is-unavailable' : 'sculpture-canvas'} />{fallback && <div className="sculpture-fallback"><span /><span /><span /></div>}</div>;
}
