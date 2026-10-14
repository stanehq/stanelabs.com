import { useEffect, useRef, useState } from 'react';

const vertexSource = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute float a_occlusion;
  uniform vec2 u_rotation;
  uniform float u_roll;
  uniform float u_aspect;
  varying vec3 v_position;
  varying vec3 v_normal;
  varying float v_occlusion;
  mat3 rotation() {
    float x = u_rotation.x, y = u_rotation.y, z = u_roll;
    mat3 rx = mat3(1.,0.,0., 0.,cos(x),sin(x), 0.,-sin(x),cos(x));
    mat3 ry = mat3(cos(y),0.,-sin(y), 0.,1.,0., sin(y),0.,cos(y));
    mat3 rz = mat3(cos(z),sin(z),0., -sin(z),cos(z),0., 0.,0.,1.);
    return rz * ry * rx;
  }
  void main() {
    mat3 r = rotation();
    vec3 p = r * a_position;
    v_position = p; v_normal = r * a_normal; v_occlusion = a_occlusion;
    float depth = 4.8 - p.z;
    gl_Position = vec4(p.x * 3.6 / u_aspect, p.y * 3.6, depth * 1.002 - .2002, depth);
  }
`;
const fragmentSource = `
  precision highp float;
  varying vec3 v_position;
  varying vec3 v_normal;
  varying float v_occlusion;
  uniform float u_time;
  uniform vec3 u_primary;
  uniform vec3 u_background;
  uniform vec3 u_foreground;
  vec3 linearColor(vec3 color) {
    return pow(color, vec3(2.2));
  }
  vec3 studio(vec3 direction, vec3 blue, vec3 white, vec3 dark) {
    float horizon = smoothstep(-.85, .85, direction.y);
    vec3 environment = mix(mix(dark, blue, .45), mix(blue, white, .22), horizon);
    float softbox = pow(smoothstep(.15, .96, dot(direction, normalize(vec3(-.8, 1.4, 1.6)))), 1.4);
    float fill = pow(max(dot(direction, normalize(vec3(1.6, .3, 1.1))), 0.), 7.);
    float lower = 1. - smoothstep(-.8, -.15, direction.y);
    environment = mix(environment, mix(dark, blue, .62), lower * .32);
    return mix(environment, white, clamp(softbox * .76 + fill * .22, 0., .88));
  }
  void main() {
    vec3 blue = linearColor(u_primary);
    vec3 white = linearColor(u_background);
    vec3 dark = linearColor(u_foreground);
    vec3 n = normalize(v_normal);
    vec3 view = normalize(vec3(0., 0., 4.8) - v_position);
    vec3 key = normalize(vec3(-2.4 + sin(u_time * .4) * 1.5, 3.5, 4.));
    vec3 fill = normalize(vec3(2.6, .3, 2.));
    float keyLight = max(dot(n, key), 0.);
    float fillLight = max(dot(n, fill), 0.);
    float facing = max(dot(n, view), 0.);
    float fresnel = pow(1. - facing, 5.);
    float diffuse = clamp(.28 + keyLight * .55 + fillLight * .13, 0., 1.);
    vec3 base = mix(dark, blue, diffuse);
    vec3 reflection = studio(reflect(-view, n), blue, white, dark);
    vec3 color = mix(base, reflection, .28 + fresnel * .38);
    color = mix(mix(dark, blue, .48), color, v_occlusion);
    float halfAngle = max(dot(n, normalize(key + view)), 0.);
    float broadHighlight = pow(halfAngle, 24.);
    float satinHighlight = pow(halfAngle, 58.);
    float edgeLight = pow(max(dot(n, normalize(vec3(1.8, .7, -.5))), 0.), 14.);
    // Compress highlight energy before mixing, preserving soft tonal transitions.
    float highlight = 1. - exp(-(.34 * broadHighlight + .30 * satinHighlight + .10 * edgeLight));
    color = mix(color, white, highlight * (.8 + .2 * v_occlusion));
    gl_FragColor = vec4(pow(clamp(color, dark, white), vec3(1. / 2.2)), 1.);
  }
`;

function readColor(name: string): Float32Array {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = value.length === 4 ? `#${value.slice(1).split('').map(channel => channel + channel).join('')}` : value;
  return new Float32Array([1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255));
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
      const response = await fetch('/sculpture/knot.bin', { signal: controller.signal });
      if (!response.ok) throw new Error('Geometry unavailable');
      const data = await response.arrayBuffer();
      if (controller.signal.aborted) return;
      if (data.byteLength < 16 || data.byteLength > 1024 * 1024) throw new Error('Invalid geometry size');
      const header = new DataView(data);
      const lengths = [0, 4, 8, 12].map(offset => header.getUint32(offset, true));
      const [positions, normals, occlusions, indices] = lengths;
      if (!positions || !indices || positions % 3 || normals !== positions || occlusions !== positions / 3 || indices % 3 || data.byteLength !== 16 + (positions + normals + occlusions) * 4 + indices * 2) throw new Error('Invalid geometry layout');
      const geometry = { positions: new Float32Array(data, 16, positions), normals: new Float32Array(data, 16 + positions * 4, normals), occlusions: new Float32Array(data, 16 + (positions + normals) * 4, occlusions), indices: new Uint16Array(data, 16 + (positions + normals + occlusions) * 4, indices) };
      const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: false });
      if (!gl) { setFallback(true); return; }
      const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = [];
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type); if (!shader) return null;
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
        shaders.push(shader); return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource), program = gl.createProgram();
      if (!vertex || !fragment || !program) { shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); setFallback(true); return; }
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); setFallback(true); return; }
      gl.useProgram(program);
      for (const [name, data, size] of [['a_position', geometry.positions, 3], ['a_normal', geometry.normals, 3], ['a_occlusion', geometry.occlusions, 1]] as const) {
        const buffer = gl.createBuffer(); if (buffer) buffers.push(buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      }
      const elementBuffer = gl.createBuffer(); if (elementBuffer) buffers.push(elementBuffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
      gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
      for (const name of ['primary', 'background', 'foreground']) gl.uniform3fv(gl.getUniformLocation(program, `u_${name}`), readColor(`--${name}`));
      const rotation = gl.getUniformLocation(program, 'u_rotation'), roll = gl.getUniformLocation(program, 'u_roll'), aspect = gl.getUniformLocation(program, 'u_aspect'), time = gl.getUniformLocation(program, 'u_time');
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const target = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
      let frame = 0, inView = true, disposed = false, lastTime = 0, elapsed = 0, lastDraw = 0, firstDraw = true;
      let scrollOffset = Math.min(window.scrollY * .0008, .18);
      const draw = (timestamp: number) => {
        frame = 0;
        if (disposed || document.hidden || !inView || gl.isContextLost()) return;
        if (timestamp - lastDraw >= 1000 / 30 || motion.matches) {
          const step = lastTime ? Math.min((timestamp - lastTime) / 1000, .08) : 1 / 30;
          if (!motion.matches) elapsed += step;
          lastTime = timestamp; lastDraw = timestamp;
          const ease = 1 - Math.exp(-step / .28);
          pointer.x += (target.x - pointer.x) * ease; pointer.y += (target.y - pointer.y) * ease;
          const x = .28 + Math.sin(elapsed * .45) * .12 + pointer.y * .25;
          const y = -.30 + Math.sin(elapsed * .30) * .35 + pointer.x * .40 + (motion.matches ? 0 : scrollOffset);
          gl.uniform2f(rotation, x, y);
          gl.uniform1f(roll, -.24 + Math.sin(elapsed * .22) * .10);
          gl.uniform1f(time, elapsed);
          fieldRef.current?.style.setProperty('--sculpture-shadow-x', `${(Math.max(-12, Math.min(12, (y + .30) * 12))).toFixed(2)}px`);
          fieldRef.current?.style.setProperty('--sculpture-shadow-scale', (1 - Math.abs(x) * .1).toFixed(3));
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
          if (firstDraw) { firstDraw = false; setReady(true); }
        }
        if (!motion.matches) frame = requestAnimationFrame(draw);
      };
      const resume = () => { if (frame) cancelAnimationFrame(frame); lastTime = lastDraw = 0; if (!disposed && !document.hidden && inView) frame = requestAnimationFrame(draw); };
      const resize = () => {
        const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(1, Math.round(bounds.width * ratio)); canvas.height = Math.max(1, Math.round(bounds.height * ratio));
        gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform1f(aspect, canvas.width / canvas.height); resume();
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
        buffers.forEach(buffer => gl.deleteBuffer(buffer)); shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program);
      };
    };
    initialize().catch(() => { if (!controller.signal.aborted) setFallback(true); });
    return () => { controller.abort(); cleanup(); };
  }, []);
  return <div ref={fieldRef} className={`liquid-field ${className}`} aria-hidden="true"><div className="sculpture-ground" />{!ready && !fallback && <div className="sculpture-fallback is-loading"><span /><span /><span /></div>}<canvas ref={canvasRef} className={fallback ? 'sculpture-canvas is-unavailable' : 'sculpture-canvas'} />{fallback && <div className="sculpture-fallback"><span /><span /><span /></div>}</div>;
}
