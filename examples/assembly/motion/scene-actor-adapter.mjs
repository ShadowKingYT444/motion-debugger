// packages/core/scene-adapter.ts
var matrix = (value) => {
  const result = Array.from(value.elements);
  if (result.length !== 16 || !result.every(Number.isFinite)) throw new Error("Scene matrices must contain 16 finite column-major numbers");
  return result;
};
var transform = (m, p) => Array.from({ length: 4 }, (_, row) => m[row] * p[0] + m[row + 4] * p[1] + m[row + 8] * p[2] + m[row + 12] * p[3]);
function createSceneActorAdapter(sink) {
  const registrations = /* @__PURE__ */ new Map();
  let disposed = false;
  return {
    register(actor) {
      if (disposed) throw new Error("Scene actor adapter is disposed");
      if (!/^[\w.-]{1,80}$/.test(actor.id) || registrations.has(actor.id)) throw new Error("Scene actor IDs must be unique stable IDs");
      if (registrations.size >= 16) throw new Error("At most 16 scene actors may be observed");
      registrations.set(actor.id, actor);
      return () => {
        if (registrations.get(actor.id) === actor) registrations.delete(actor.id);
      };
    },
    afterRender(camera, viewport, renderTimestampMs = performance.now()) {
      if (disposed) return false;
      if (![viewport.width, viewport.height, viewport.x ?? 0, viewport.y ?? 0, renderTimestampMs].every(Number.isFinite) || viewport.width <= 0 || viewport.height <= 0) throw new Error("Viewport and render clock must be finite, CSS pixel dimensions positive");
      const cameraWorldMatrix = matrix(camera.matrixWorld), view = matrix(camera.matrixWorldInverse), cameraProjectionMatrix = matrix(camera.projectionMatrix);
      const batch = [];
      for (const { id, object, localBounds } of registrations.values()) {
        const world = matrix(object.matrixWorld), points = localBounds ? [localBounds.min.x, localBounds.max.x].flatMap((x2) => [localBounds.min.y, localBounds.max.y].flatMap((y2) => [localBounds.min.z, localBounds.max.z].map((z) => [x2, y2, z, 1]))) : [[0, 0, 0, 1]];
        const projected = points.map((point) => transform(cameraProjectionMatrix, transform(view, transform(world, point)))).filter((point) => point[3] > 0 && point.every(Number.isFinite)).map((point) => ({ x: (viewport.x ?? 0) + (point[0] / point[3] + 1) * viewport.width / 2, y: (viewport.y ?? 0) + (1 - point[1] / point[3]) * viewport.height / 2 }));
        const xs = projected.map((point) => point.x), ys = projected.map((point) => point.y), x = Math.min(...xs), y = Math.min(...ys);
        batch.push({ actorId: id, visible: object.visible && projected.length === points.length, screen: projected.length === points.length ? { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y } : null, transform: world, worldPosition: { x: world[12], y: world[13], z: world[14] }, ...object.rotation ? { orientationRadians: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z } } : {}, cameraWorldMatrix: [...cameraWorldMatrix], cameraProjectionMatrix: [...cameraProjectionMatrix] });
      }
      const consumer = sink ?? (typeof window === "undefined" ? void 0 : window.__motionActors?.publish);
      return consumer?.(batch, renderTimestampMs) ?? false;
    },
    clear() {
      registrations.clear();
    },
    dispose() {
      registrations.clear();
      disposed = true;
    }
  };
}
export {
  createSceneActorAdapter
};
