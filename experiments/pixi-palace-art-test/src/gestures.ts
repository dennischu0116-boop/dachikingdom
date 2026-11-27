import type { Point } from './building-layout';
export type GestureHooks = {
  toWorld(p: Point): Point;
  pick(p: Point): string | undefined;
  begin(id: string, world: Point): void;
  move(world: Point): void;
  finish(): void;
  cancel(): void;
  pan(dx: number, dy: number): void;
  zoom(factor: number, at: Point): void;
  tap(p: Point): void;
};

/** Routes pointer gestures so a second finger can never keep dragging a building. */
export class SceneGestures {
  readonly pointers = new Map<number, Point>();
  editing = false;
  private start: Point | null = null;
  private moved = false;
  private pinched = false;
  private building = false;
  private hooks: GestureHooks;
  constructor(hooks: GestureHooks) { this.hooks = hooks; }
  down(id: number, p: Point) {
    if (this.pointers.has(id)) return;
    this.pointers.set(id, p);
    if (this.pointers.size === 1) {
      this.start = p; this.moved = false; this.pinched = false;
      const world = this.hooks.toWorld(p);
      const target = this.editing ? this.hooks.pick(world) : undefined;
      this.building = target !== undefined;
      if (target !== undefined) this.hooks.begin(target, world);
    } else {
      if (this.building) this.hooks.finish();
      this.building = false; this.pinched = true; this.moved = true;
    }
  }
  move(id: number, p: Point) {
    const previous = this.pointers.get(id);
    if (!previous) return;
    if (this.pointers.size === 2) {
      const other = [...this.pointers].find(([key]) => key !== id)![1];
      const distance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const before = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
      const after = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      if (distance > 1) {
        this.hooks.zoom(Math.hypot(p.x - other.x, p.y - other.y) / distance, before);
        this.hooks.pan(after.x - before.x, after.y - before.y);
      }
    } else if (this.pointers.size === 1 && !this.pinched && this.start) {
      const wasMoved = this.moved;
      this.moved ||= Math.hypot(p.x - this.start.x, p.y - this.start.y) > 5;
      if (this.moved) {
        if (this.building) this.hooks.move(this.hooks.toWorld(p));
        else { const origin = wasMoved ? previous : this.start; this.hooks.pan(p.x - origin.x, p.y - origin.y); }
      }
    }
    this.pointers.set(id, p);
  }
  up(id: number, p: Point) {
    if (!this.pointers.has(id)) return;
    // Some touch devices deliver the last position only with pointerup.
    this.move(id, p);
    if (this.pointers.size === 1 && !this.pinched) {
      if (this.building) this.hooks.finish();
      if (!this.moved) this.hooks.tap(p);
    }
    this.building = false;
    this.pointers.delete(id);
    if (!this.pointers.size) this.start = null;
  }
  finish() {
    if (this.building) this.hooks.finish();
    this.clear();
  }
  cancel() {
    if (this.building) this.hooks.cancel();
    this.clear();
  }
  private clear() { this.pointers.clear(); this.building = false; this.start = null; this.moved = false; this.pinched = false; }
}
