export type CameraState = { x: number; y: number; scale: number };
export type Point = { x: number; y: number };
/** Preserve the world point underneath a gesture, even when zoom hits a limit. */
export function zoomTransform(camera: CameraState, factor: number, point: Point, min: number, max: number): CameraState {
  const scale = Math.max(min, Math.min(max, camera.scale * factor));
  const ratio = scale / camera.scale;
  return { x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio, scale };
}
/** Center smaller scenes; prevent revealing empty space for larger scenes. */
export function cameraBounds(camera: CameraState, viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number): CameraState {
  const w = worldWidth * camera.scale, h = worldHeight * camera.scale;
  return { ...camera, x: w <= viewportWidth ? (viewportWidth-w)/2 : Math.max(viewportWidth-w,Math.min(0,camera.x)), y: h <= viewportHeight ? (viewportHeight-h)/2 : Math.max(viewportHeight-h,Math.min(0,camera.y)) };
}
