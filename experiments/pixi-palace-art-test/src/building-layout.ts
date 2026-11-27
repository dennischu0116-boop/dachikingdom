export type Point = { x: number; y: number };
export type BuildingSpec = Point & {
  id: string;
  width: number;
  height: number;
  labelOffset: Point;
  // Normalized silhouette: x/y are fractions from the sprite's top-left corner.
  polygon: readonly Point[];
};
export type BuildingState = BuildingSpec & { depth: number; labelPosition: Point };
export const LAYOUT_STORAGE_KEY = 'dachikingdom:pixi-palace:building-layout:v1';
export type LayoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function bounded(p: Point, spec: BuildingSpec, width: number, height: number): Point {
  return {
    x: Math.max(spec.width / 2, Math.min(width - spec.width / 2, p.x)),
    y: Math.max(spec.height, Math.min(height, p.y)),
  };
}
function contains(p: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export class BuildingLayout {
  readonly buildings: BuildingState[];
  private drag: { building: BuildingState; origin: Point; offset: Point } | null = null;
  private readonly defaults: BuildingSpec[];
  readonly width: number;
  readonly height: number;
  constructor(specs: BuildingSpec[], width: number, height: number) {
    this.width = width; this.height = height;
    this.defaults = specs.map(s => ({ ...s }));
    this.buildings = specs.map(s => ({ ...s, depth: s.y, labelPosition: { x: s.x + s.labelOffset.x, y: s.y + s.labelOffset.y } }));
  }
  private position(b: BuildingState, p: Point) {
    const next = bounded(p, b, this.width, this.height);
    b.x = next.x; b.y = next.y; b.depth = next.y;
    b.labelPosition = { x: next.x + b.labelOffset.x, y: next.y + b.labelOffset.y };
  }
  pick(p: Point, frontToBack?: readonly string[]): BuildingState | undefined {
    // Pixi's equal-depth order can change after sorting previous drag positions.
    // Runtime callers supply the current display list; pure callers use initial order.
    const ordered = frontToBack
      ? frontToBack.map(id => this.buildings.find(b => b.id === id)).filter((b): b is BuildingState => !!b)
      : this.buildings.map((b, order) => ({ b, order }))
        .sort((a, b) => b.b.depth - a.b.depth || b.order - a.order).map(({ b }) => b);
    return ordered.find(b => contains({ x: (p.x - b.x) / b.width + .5, y: (p.y - b.y) / b.height + 1 }, b.polygon));
  }
  begin(id: string, p: Point) {
    const b = this.buildings.find(b => b.id === id);
    if (b) this.drag = { building: b, origin: { x: b.x, y: b.y }, offset: { x: p.x - b.x, y: p.y - b.y } };
  }
  move(p: Point) {
    if (this.drag) this.position(this.drag.building, { x: p.x - this.drag.offset.x, y: p.y - this.drag.offset.y });
  }
  finish(): boolean {
    const d = this.drag; this.drag = null;
    return !!d && (d.origin.x !== d.building.x || d.origin.y !== d.building.y);
  }
  cancel() {
    if (this.drag) this.position(this.drag.building, this.drag.origin);
    this.drag = null;
  }
  reset() {
    this.drag = null;
    this.buildings.forEach((b, i) => this.position(b, this.defaults[i]));
  }
  restore(raw: string | null): boolean {
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data?.version !== 1 || data.scene !== 'art-remake-2' || !data.positions || typeof data.positions !== 'object') return false;
      // Validate the whole record before applying anything. Never partially restore corrupt data.
      const positions = this.buildings.map(b => data.positions[b.id]);
      if (!positions.every(p => p && typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y))) return false;
      this.buildings.forEach((b, i) => this.position(b, positions[i]));
      return true;
    } catch { return false; }
  }
  serialize(): string {
    return JSON.stringify({ version: 1, scene: 'art-remake-2', positions: Object.fromEntries(this.buildings.map(b => [b.id, { x: b.x, y: b.y }])) });
  }
}

export function loadLayout(model: BuildingLayout, storage: LayoutStorage | null): 'restored' | 'default' | 'unavailable' {
  try { return storage ? (model.restore(storage.getItem(LAYOUT_STORAGE_KEY)) ? 'restored' : 'default') : 'unavailable'; }
  catch { return 'unavailable'; }
}
export function saveLayout(model: BuildingLayout, storage: LayoutStorage | null): boolean {
  try { if (!storage) return false; storage.setItem(LAYOUT_STORAGE_KEY, model.serialize()); return true; }
  catch { return false; }
}
export function clearLayout(storage: LayoutStorage | null): boolean {
  try { if (!storage) return false; storage.removeItem(LAYOUT_STORAGE_KEY); return true; }
  catch { return false; }
}
