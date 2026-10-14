type Vector = [number, number, number];
const normalize = (v: Vector): Vector => { const length = Math.hypot(...v) || 1; return v.map(n => n / length) as Vector; };
const subtract = (a: Vector, b: Vector): Vector => a.map((n, i) => n - b[i]) as Vector;
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function knotGeometry() {
  // At the hero's display size these segments retain the smooth silhouette,
  // while avoiding geometry that cannot be distinguished at a screen pixel.
  const lengthSegments = 192, tubeSegments = 24, tubeRadius = .185;
  const positions: number[] = [], normals: number[] = [], occlusions: number[] = [], indices: number[] = [];
  const center = (t: number): Vector => {
    const radius = .81 + .27 * Math.cos(3 * t);
    return [radius * Math.cos(2 * t), radius * Math.sin(2 * t), .34 * Math.sin(3 * t)];
  };
  const occluders = Array.from({ length: 96 }, (_, index) => ({ phase: index / 96, position: center(index / 96 * Math.PI * 2) }));
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments * Math.PI * 2, p = center(t);
    const tangent = normalize(subtract(center(t + .001), center(t - .001)));
    const radial: Vector = [Math.cos(2 * t), Math.sin(2 * t), 0];
    const binormal = normalize(cross(tangent, radial)), normal = normalize(cross(binormal, tangent));
    for (let j = 0; j <= tubeSegments; j++) {
      const angle = j / tubeSegments * Math.PI * 2;
      const n = normal.map((v, axis) => v * Math.cos(angle) + binormal[axis] * Math.sin(angle)) as Vector;
      const surface = p.map((v, axis) => v + n[axis] * tubeRadius) as Vector;
      // Approximate ambient occlusion from distant sections of the actual tube.
      // Local neighbours are excluded so the silhouette stays clean and bright.
      let obstruction = 0;
      for (const occluder of occluders) {
        const separation = Math.abs(i / lengthSegments - occluder.phase);
        if (Math.min(separation, 1 - separation) < .075) continue;
        const dx = occluder.position[0] - surface[0], dy = occluder.position[1] - surface[1], dz = occluder.position[2] - surface[2];
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        const facing = Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / Math.sqrt(Math.max(distanceSquared, 1e-8)));
        obstruction = Math.max(obstruction, facing * tubeRadius * tubeRadius / (distanceSquared + tubeRadius * tubeRadius));
      }
      normals.push(...n); positions.push(...surface); occlusions.push(1 - Math.min(.18, obstruction * .8));
      if (i < lengthSegments && j < tubeSegments) {
        const a = i * (tubeSegments + 1) + j, b = a + tubeSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), occlusions: new Float32Array(occlusions), indices: new Uint16Array(indices) };
}
