export interface MiotVacuumMapPoint {
  x: number;
  y: number;
  phi?: number;
  update?: number;
}

export interface MiotVacuumMapRoom {
  roomId: number;
  name?: string;
  polygon?: MiotVacuumMapPoint[];
}

export interface MiotVacuumMapZone {
  polygon?: MiotVacuumMapPoint[];
}

export interface MiotVacuumMapData {
  mapInfo?: {
    sizeX: number;
    sizeY: number;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
    resolution?: number;
  };
  mapData?: string;
  rooms?: MiotVacuumMapRoom[];
  robot?: MiotVacuumMapPoint | null;
  chargeStation?: MiotVacuumMapPoint | null;
  virtualWalls?: MiotVacuumMapZone[];
  cleanZones?: MiotVacuumMapZone[];
  cleaningPath?: MiotVacuumMapPoint[];
  cleaningPathSegments?: MiotVacuumMapPoint[][];
  trackPath?: MiotVacuumMapPoint[];
  trackPathSegments?: MiotVacuumMapPoint[][];
  mapExtInfo?: {
    radian?: number;
    mapVersion?: number | string;
    boundaryInfo?: {
      vMinX: number;
      vMaxX: number;
      vMinY: number;
      vMaxY: number;
    };
  };
  fetched_at?: number;
}

export interface MiotVacuumMapViewport {
  zoom?: number;
  panX?: number;
  panY?: number;
  redraw?: () => void;
}

interface MiotVacuumMapScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface MiotVacuumMapLabelPlacement extends MiotVacuumMapPoint {
  opacity: number;
}

interface MiotVacuumMapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface MiotVacuumStaticLayer {
  key: string;
  canvas: HTMLCanvasElement;
}

interface MiotVacuumCanvasRenderState {
  key?: string;
  staticLayer?: MiotVacuumStaticLayer;
  lastDynamicMap?: MiotVacuumMapData;
}

const ROBOT_ICON =
  "data:image/png;base64,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";

const CHARGE_ICON =
  "data:image/png;base64,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";

const ROOM_COLORS = [
  [255, 180, 100],
  [100, 200, 255],
  [100, 220, 140],
  [255, 200, 80],
  [200, 120, 255],
  [255, 140, 180],
  [80, 220, 220],
  [240, 230, 100],
  [120, 180, 240],
  [160, 230, 120],
  [200, 160, 255],
  [255, 180, 120],
];

const imageCache = new Map<string, HTMLImageElement>();

export function drawMiotVacuumMap(
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport = {}
): void {
  const info = map.mapInfo;
  if (!info?.sizeX || !info?.sizeY || !map.mapData) return;

  const sx = info.sizeX;
  const sy = info.sizeY;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width || canvas.clientWidth || sx), 1);
  const height = Math.max(
    Math.round(rect.height || canvas.clientHeight || (width * sy) / sx),
    1
  );
  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.round(width * dpr);
  const targetHeight = Math.round(height * dpr);
  if (canvas.width !== targetWidth) {
    canvas.width = targetWidth;
  }
  if (canvas.height !== targetHeight) {
    canvas.height = targetHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const dprPanX = (viewport.panX ?? 0) * dpr;
  const dprPanY = (viewport.panY ?? 0) * dpr;
  const zoom = Math.max(viewport.zoom ?? 1, 1);

  const radian = map.mapExtInfo?.radian;
  const rotateAngle = radian ? -radian : 0;

  // Apply radian rotation around map center
  const cx = sx / 2;
  const cy = sy / 2;
  const scale = Math.max(canvas.width / sx, canvas.height / sy) * zoom;
  const offsetX = (canvas.width - sx * scale) / 2 + dprPanX;
  const offsetY = (canvas.height - sy * scale) / 2 + dprPanY;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(offsetX + cx * scale, offsetY + cy * scale);
  ctx.rotate(rotateAngle);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  const mapTransform = ctx.getTransform();

  drawCachedMiotMap(
    canvas,
    ctx,
    map,
    viewport,
    mapTransform,
    zoom,
    dpr,
    sx,
    sy
  );
  scheduleRobotPulse(canvas, map, viewport);
}

function drawCachedMiotMap(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number,
  sx: number,
  sy: number
): void {
  const state = getCanvasRenderState(canvas);
  const staticLayer = getStaticLayer(
    canvas,
    state,
    map,
    viewport,
    mapTransform,
    zoom,
    sx,
    sy
  );
  const canReuseDynamicLayer =
    state.key === staticLayer.key && Boolean(state.lastDynamicMap);
  const dirtyRect = canReuseDynamicLayer
    ? getDirtyRect(
        state.lastDynamicMap!,
        map,
        mapTransform,
        zoom,
        dpr,
        canvas.width,
        canvas.height
      )
    : undefined;

  if (
    dirtyRect &&
    getRectArea(dirtyRect) < canvas.width * canvas.height * 0.85
  ) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(
      dirtyRect.left,
      dirtyRect.top,
      dirtyRect.right - dirtyRect.left,
      dirtyRect.bottom - dirtyRect.top
    );
    ctx.clip();
    ctx.clearRect(
      dirtyRect.left,
      dirtyRect.top,
      dirtyRect.right - dirtyRect.left,
      dirtyRect.bottom - dirtyRect.top
    );
    ctx.drawImage(staticLayer.canvas, 0, 0);
    drawDynamicLayer(ctx, canvas, map, viewport, mapTransform, zoom, dpr);
    ctx.restore();
  } else {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticLayer.canvas, 0, 0);
    ctx.restore();
    drawDynamicLayer(ctx, canvas, map, viewport, mapTransform, zoom, dpr);
  }

  state.key = staticLayer.key;
  state.lastDynamicMap = map;
}

function getStaticLayer(
  canvas: HTMLCanvasElement,
  state: MiotVacuumCanvasRenderState,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  mapTransform: DOMMatrix,
  zoom: number,
  sx: number,
  sy: number
): MiotVacuumStaticLayer {
  const key = getStaticLayerKey(canvas, map, viewport, zoom);
  if (
    state.staticLayer?.key === key &&
    state.staticLayer.canvas.width === canvas.width &&
    state.staticLayer.canvas.height === canvas.height
  ) {
    return state.staticLayer;
  }

  const layer = document.createElement("canvas");
  layer.width = canvas.width;
  layer.height = canvas.height;
  const layerCtx = layer.getContext("2d");
  if (!layerCtx) {
    state.staticLayer = { key, canvas: layer };
    return state.staticLayer;
  }
  layerCtx.imageSmoothingEnabled = false;
  layerCtx.clearRect(0, 0, layer.width, layer.height);
  layerCtx.setTransform(mapTransform);
  drawStaticLayer(layerCtx, canvas, map, viewport, zoom, sx, sy);
  state.staticLayer = { key, canvas: layer };
  return state.staticLayer;
}

function drawStaticLayer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  zoom: number,
  sx: number,
  sy: number
): void {
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = sx;
  mapCanvas.height = sy;
  const mapCtx = mapCanvas.getContext("2d");
  if (!mapCtx || !map.mapData) return;
  mapCtx.fillStyle = "rgb(195,195,195)";
  mapCtx.fillRect(0, 0, sx, sy);
  mapCtx.imageSmoothingEnabled = false;

  for (const room of map.rooms ?? []) {
    const polygon = room.polygon ?? [];
    if (polygon.length < 3) continue;
    const color = ROOM_COLORS[Math.abs(room.roomId) % ROOM_COLORS.length];
    mapCtx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    drawPolygon(mapCtx, polygon);
    mapCtx.fill();
  }

  const pixels = decodeBase64(map.mapData);
  correctRawPixels(pixels, sx, sy);
  let image = mapCtx.getImageData(0, 0, sx, sy);
  for (let y = 0; y < sy; y += 1) {
    for (let x = 0; x < sx; x += 1) {
      const sourceIndex = (sy - 1 - y) * sx + x;
      if (sourceIndex >= pixels.length) break;
      let value = pixels[sourceIndex];
      if (value > 127) value -= 256;
      const target = (y * sx + x) * 4;
      if (value < 0) {
        image.data[target] = 65;
        image.data[target + 1] = 65;
        image.data[target + 2] = 65;
      } else if (value > 0) {
        image.data[target] *= 0.88;
        image.data[target + 1] *= 0.88;
        image.data[target + 2] *= 0.88;
      }
      image.data[target + 3] = 255;
    }
  }
  image = removeIsolatedWallPixels(image);
  image = shaveWallSpurs(image);
  mapCtx.putImageData(image, 0, 0);
  ctx.drawImage(mapCanvas, 0, 0, sx, sy);

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;
  for (const room of map.rooms ?? []) {
    if (!room.polygon || room.polygon.length < 3) continue;
    drawPolygon(ctx, room.polygon);
    ctx.stroke();
  }
  ctx.restore();

  drawZones(
    ctx,
    map.cleanZones ?? [],
    "rgba(78, 154, 241, 0.18)",
    "#4e9af1",
    zoom
  );
  drawZones(
    ctx,
    map.virtualWalls ?? [],
    "rgba(255, 70, 70, 0.6)",
    "#c61f1f",
    zoom
  );
  drawMarker(
    ctx,
    map.chargeStation,
    CHARGE_ICON,
    "#25b95f",
    11,
    canvas,
    map,
    viewport
  );
}

function drawDynamicLayer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number
): void {
  ctx.setTransform(mapTransform);
  drawPathSegments(ctx, getCleaningPathSegments(map), zoom);
  drawRobot(ctx, map.robot, canvas, map, viewport);
  drawRoomLabels(ctx, map.rooms ?? [], mapTransform, dpr);
}

function getCanvasRenderState(
  canvas: HTMLCanvasElement
): MiotVacuumCanvasRenderState {
  const target = canvas as HTMLCanvasElement & {
    __miotVacuumMapRenderState?: MiotVacuumCanvasRenderState;
  };
  target.__miotVacuumMapRenderState ??= {};
  return target.__miotVacuumMapRenderState;
}

function getStaticLayerKey(
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  zoom: number
): string {
  const chargeReady = imageCache.get(CHARGE_ICON)?.complete ? 1 : 0;
  return [
    canvas.width,
    canvas.height,
    zoom.toFixed(4),
    (viewport.panX ?? 0).toFixed(2),
    (viewport.panY ?? 0).toFixed(2),
    map.fetched_at ?? "",
    map.mapExtInfo?.mapVersion ?? "",
    map.mapExtInfo?.radian ?? "",
    map.mapData?.length ?? 0,
    map.rooms?.length ?? 0,
    map.cleanZones?.length ?? 0,
    map.virtualWalls?.length ?? 0,
    map.chargeStation?.x ?? "",
    map.chargeStation?.y ?? "",
    chargeReady,
  ].join("|");
}

function getDynamicBounds(
  map: MiotVacuumMapData,
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number,
  canvasWidth: number,
  canvasHeight: number
): MiotVacuumMapRect | undefined {
  const points: MiotVacuumMapPoint[] = [];
  for (const segment of getCleaningPathSegments(map)) {
    points.push(...segment);
  }
  if (map.robot) {
    points.push(map.robot);
  }
  if (!points.length) return undefined;

  let rect: MiotVacuumMapRect | undefined;
  for (const point of points) {
    const screen = transformPoint(mapTransform, point.x, point.y);
    rect = includePointInRect(rect, screen.x, screen.y);
  }
  const margin = getDynamicMargin(mapTransform, zoom, dpr);
  return clampRect(expandRect(rect!, margin), canvasWidth, canvasHeight);
}

function getDirtyRect(
  previousMap: MiotVacuumMapData,
  currentMap: MiotVacuumMapData,
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number,
  canvasWidth: number,
  canvasHeight: number
): MiotVacuumMapRect | undefined {
  const pathDelta = getPathDeltaBounds(previousMap, currentMap, mapTransform);
  if (pathDelta.fullRedraw) {
    return getDirtyRectForFullDynamicLayer(
      previousMap,
      currentMap,
      mapTransform,
      zoom,
      dpr,
      canvasWidth,
      canvasHeight
    );
  }

  const rect = unionRects(
    unionRects(
      getPointScreenBounds(previousMap.robot, mapTransform),
      getPointScreenBounds(currentMap.robot, mapTransform)
    ),
    pathDelta.rect
  );
  if (!rect) return undefined;
  return clampRect(
    expandRect(rect, getDynamicMargin(mapTransform, zoom, dpr)),
    canvasWidth,
    canvasHeight
  );
}

function getDirtyRectForFullDynamicLayer(
  previousMap: MiotVacuumMapData,
  currentMap: MiotVacuumMapData,
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number,
  canvasWidth: number,
  canvasHeight: number
): MiotVacuumMapRect | undefined {
  return unionRects(
    getDynamicBounds(
      previousMap,
      mapTransform,
      zoom,
      dpr,
      canvasWidth,
      canvasHeight
    ),
    getDynamicBounds(
      currentMap,
      mapTransform,
      zoom,
      dpr,
      canvasWidth,
      canvasHeight
    )
  );
}

function getPathDeltaBounds(
  previousMap: MiotVacuumMapData,
  currentMap: MiotVacuumMapData,
  mapTransform: DOMMatrix
): { rect?: MiotVacuumMapRect; fullRedraw: boolean } {
  const previousSegments = getCleaningPathSegments(previousMap);
  const currentSegments = getCleaningPathSegments(currentMap);
  let rect: MiotVacuumMapRect | undefined;

  for (
    let segmentIndex = 0;
    segmentIndex < currentSegments.length;
    segmentIndex += 1
  ) {
    const previous = previousSegments[segmentIndex] ?? [];
    const current = currentSegments[segmentIndex];
    if (current.length < previous.length) {
      return { fullRedraw: true };
    }

    for (let pointIndex = 0; pointIndex < previous.length; pointIndex += 1) {
      if (!isSameMapPoint(previous[pointIndex], current[pointIndex])) {
        return { fullRedraw: true };
      }
    }

    if (current.length > previous.length) {
      const startIndex = Math.max(previous.length - 1, 0);
      rect = includeSegmentScreenBounds(
        rect,
        current.slice(startIndex),
        mapTransform
      );
    }
  }

  for (
    let segmentIndex = currentSegments.length;
    segmentIndex < previousSegments.length;
    segmentIndex += 1
  ) {
    if (previousSegments[segmentIndex].length) {
      return { fullRedraw: true };
    }
  }

  return { rect, fullRedraw: false };
}

function getPointScreenBounds(
  point: MiotVacuumMapPoint | null | undefined,
  mapTransform: DOMMatrix
): MiotVacuumMapRect | undefined {
  if (!point) return undefined;
  const screen = transformPoint(mapTransform, point.x, point.y);
  return includePointInRect(undefined, screen.x, screen.y);
}

function includeSegmentScreenBounds(
  rect: MiotVacuumMapRect | undefined,
  segment: MiotVacuumMapPoint[],
  mapTransform: DOMMatrix
): MiotVacuumMapRect | undefined {
  let next = rect;
  for (const point of segment) {
    const screen = transformPoint(mapTransform, point.x, point.y);
    next = includePointInRect(next, screen.x, screen.y);
  }
  return next;
}

function getDynamicMargin(
  mapTransform: DOMMatrix,
  zoom: number,
  dpr: number
): number {
  const scale = Math.hypot(mapTransform.a, mapTransform.b);
  return Math.max(18 * scale, 12 * dpr, 8 / zoom);
}

function isSameMapPoint(
  a: MiotVacuumMapPoint | undefined,
  b: MiotVacuumMapPoint | undefined
): boolean {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function includePointInRect(
  rect: MiotVacuumMapRect | undefined,
  x: number,
  y: number
): MiotVacuumMapRect {
  if (!rect) return { left: x, top: y, right: x, bottom: y };
  return {
    left: Math.min(rect.left, x),
    top: Math.min(rect.top, y),
    right: Math.max(rect.right, x),
    bottom: Math.max(rect.bottom, y),
  };
}

function unionRects(
  a: MiotVacuumMapRect | undefined,
  b: MiotVacuumMapRect | undefined
): MiotVacuumMapRect | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function expandRect(
  rect: MiotVacuumMapRect,
  margin: number
): MiotVacuumMapRect {
  return {
    left: rect.left - margin,
    top: rect.top - margin,
    right: rect.right + margin,
    bottom: rect.bottom + margin,
  };
}

function clampRect(
  rect: MiotVacuumMapRect,
  canvasWidth: number,
  canvasHeight: number
): MiotVacuumMapRect {
  return {
    left: Math.floor(clamp(rect.left, 0, canvasWidth)),
    top: Math.floor(clamp(rect.top, 0, canvasHeight)),
    right: Math.ceil(clamp(rect.right, 0, canvasWidth)),
    bottom: Math.ceil(clamp(rect.bottom, 0, canvasHeight)),
  };
}

function getRectArea(rect: MiotVacuumMapRect): number {
  return (
    Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top)
  );
}

function removeIsolatedWallPixels(src: ImageData): ImageData {
  const w = src.width;
  const h = src.height;
  const dst = new ImageData(new Uint8ClampedArray(src.data), w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!isWallPixel(src.data, idx)) continue;
      let wallNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < w &&
            ny >= 0 &&
            ny < h &&
            isWallPixel(src.data, ny * w + nx)
          ) {
            wallNeighbors += 1;
          }
        }
      }
      if (wallNeighbors === 0) {
        dst.data[idx * 4] = 195;
        dst.data[idx * 4 + 1] = 195;
        dst.data[idx * 4 + 2] = 195;
        dst.data[idx * 4 + 3] = 255;
      }
    }
  }
  return dst;
}

function shaveWallSpurs(src: ImageData): ImageData {
  const w = src.width;
  const h = src.height;
  const dst = new ImageData(new Uint8ClampedArray(src.data), w, h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!isWallPixel(src.data, idx)) continue;
      let cardinalWalls = 0;
      if (isWallPixel(src.data, (y - 1) * w + x)) cardinalWalls += 1;
      if (isWallPixel(src.data, (y + 1) * w + x)) cardinalWalls += 1;
      if (isWallPixel(src.data, y * w + (x - 1))) cardinalWalls += 1;
      if (isWallPixel(src.data, y * w + (x + 1))) cardinalWalls += 1;
      if (cardinalWalls <= 1) {
        dst.data[idx * 4] = 195;
        dst.data[idx * 4 + 1] = 195;
        dst.data[idx * 4 + 2] = 195;
        dst.data[idx * 4 + 3] = 255;
      }
    }
  }
  return dst;
}

function isWallPixel(d: Uint8ClampedArray | Uint8Array, idx: number): boolean {
  return d[idx * 4] < 100 && d[idx * 4 + 1] < 100 && d[idx * 4 + 2] < 100;
}

// Correct raw map pixels before rendering.
// Operates on the raw pixel buffer (unsigned 0-255, where values >127 become negative).
function correctRawPixels(pixels: Uint8Array, w: number, h: number): void {
  const get = (x: number, y: number): number => {
    const v = pixels[y * w + x];
    return v > 127 ? v - 256 : v;
  };
  const set = (x: number, y: number, v: number) => {
    pixels[y * w + x] = v < 0 ? v + 256 : v;
  };
  const isWall = (x: number, y: number) => get(x, y) === -1;
  const isObstacle = (x: number, y: number) => get(x, y) === -9;
  const isBackground = (x: number, y: number) => get(x, y) === 0;
  const isRoom = (x: number, y: number) => {
    const v = get(x, y);
    return v >= 10 && v <= 59;
  };

  // 1. Remove isolated wall/obstacle pixels (single pixel with zero wall neighbors)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!isWall(x, y) && !isObstacle(x, y)) continue;
      let nonWall = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!isWall(x + dx, y + dy) && !isObstacle(x + dx, y + dy)) nonWall++;
        }
      }
      if (nonWall === 8) {
        set(x, y, 0);
      }
    }
  }

  // 2. Remove 1-pixel wall spurs (wall pixel with only diagonal connections)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!isWall(x, y)) continue;
      const cardinal =
        (isWall(x - 1, y) ? 1 : 0) +
        (isWall(x + 1, y) ? 1 : 0) +
        (isWall(x, y - 1) ? 1 : 0) +
        (isWall(x, y + 1) ? 1 : 0);
      if (cardinal <= 1) {
        const roomVotes: Record<number, number> = {};
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const v = get(x + dx, y + dy);
            if (v >= 10) roomVotes[v] = (roomVotes[v] ?? 0) + 1;
          }
        }
        let bestRoom = 0,
          bestCount = 0;
        for (const [room, count] of Object.entries(roomVotes)) {
          if (count > bestCount) {
            bestCount = count;
            bestRoom = Number(room);
          }
        }
        set(x, y, bestRoom > 0 ? bestRoom : 0);
      }
    }
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: MiotVacuumMapPoint[]
): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

function drawZones(
  ctx: CanvasRenderingContext2D,
  zones: MiotVacuumMapZone[],
  fill: string,
  stroke: string,
  zoom: number
): void {
  ctx.save();
  const lineWidth = 1.4 / zoom;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  for (const zone of zones) {
    const polygon = zone.polygon ?? [];
    if (polygon.length < 2) continue;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    if (polygon.length >= 3) {
      drawPolygon(ctx, polygon);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(polygon[0].x, polygon[0].y);
      ctx.lineTo(polygon[1].x, polygon[1].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getCleaningPathSegments(
  map: MiotVacuumMapData
): MiotVacuumMapPoint[][] {
  if (map.cleaningPathSegments?.length) {
    return map.cleaningPathSegments.filter((segment) => segment.length >= 2);
  }
  return map.cleaningPath?.length ? [map.cleaningPath] : [];
}

function drawPathSegments(
  ctx: CanvasRenderingContext2D,
  segments: MiotVacuumMapPoint[][],
  zoom: number
): void {
  if (!segments.length) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 1.2 / zoom;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const points of segments) {
    if (points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoomLabels(
  ctx: CanvasRenderingContext2D,
  rooms: MiotVacuumMapRoom[],
  mapTransform: DOMMatrix,
  dpr: number
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(28,28,28,0.84)";
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2 * dpr;
  ctx.lineJoin = "round";
  ctx.font = `bold ${13 * dpr}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const viewport = {
    left: 0,
    top: 0,
    right: ctx.canvas.width,
    bottom: ctx.canvas.height,
  };
  for (const room of rooms) {
    if (!room.name || !room.polygon?.length) continue;
    const xs = room.polygon.map((point) => point.x);
    const ys = room.polygon.map((point) => point.y);
    const mapX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const mapY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const preferred = transformPoint(mapTransform, mapX, mapY);
    const labelPoint = getRoomLabelPoint(
      ctx,
      room,
      mapTransform,
      viewport,
      preferred,
      dpr
    );
    if (!labelPoint) continue;
    ctx.save();
    ctx.globalAlpha *= labelPoint.opacity;
    ctx.strokeText(room.name, labelPoint.x, labelPoint.y);
    ctx.fillText(room.name, labelPoint.x, labelPoint.y);
    ctx.restore();
  }
  ctx.restore();
}

function getRoomLabelPoint(
  ctx: CanvasRenderingContext2D,
  room: MiotVacuumMapRoom,
  mapTransform: DOMMatrix,
  viewport: MiotVacuumMapScreenRect,
  preferred: MiotVacuumMapPoint,
  dpr: number
): MiotVacuumMapLabelPlacement | undefined {
  if (!room.name || !room.polygon?.length) return undefined;
  const screenPolygon = room.polygon.map((point) =>
    transformPoint(mapTransform, point.x, point.y)
  );
  const visiblePolygon = clipPolygonToRect(screenPolygon, viewport);
  if (visiblePolygon.length < 3) return undefined;

  const metrics = ctx.measureText(room.name);
  const textHeight = Math.max(
    (metrics.actualBoundingBoxAscent || 0) +
      (metrics.actualBoundingBoxDescent || 0),
    13 * dpr
  );
  const strokeMargin = ctx.lineWidth / 2;
  const margin = 3 * dpr + strokeMargin;
  const halfWidth = metrics.width / 2 + margin;
  const halfHeight = textHeight / 2 + margin;
  const bounds = getPolygonBounds(visiblePolygon);
  const opacity = getLabelOpacity(screenPolygon, visiblePolygon);
  if (opacity <= 0) return undefined;

  const allowed = {
    left: Math.max(bounds.left, viewport.left) + halfWidth,
    right: Math.min(bounds.right, viewport.right) - halfWidth,
    top: Math.max(bounds.top, viewport.top) + halfHeight,
    bottom: Math.min(bounds.bottom, viewport.bottom) - halfHeight,
  };
  if (allowed.left > allowed.right || allowed.top > allowed.bottom) {
    return undefined;
  }

  const clampedPreferred = {
    x: clamp(preferred.x, allowed.left, allowed.right),
    y: clamp(preferred.y, allowed.top, allowed.bottom),
  };
  if (isPointInPolygon(clampedPreferred, visiblePolygon)) {
    return { ...clampedPreferred, opacity };
  }

  const centroid = getPolygonCentroid(visiblePolygon);
  const clampedCentroid = {
    x: clamp(centroid.x, allowed.left, allowed.right),
    y: clamp(centroid.y, allowed.top, allowed.bottom),
  };
  if (isPointInPolygon(clampedCentroid, visiblePolygon)) {
    return { ...clampedCentroid, opacity };
  }

  const visiblePoint = findVisibleLabelPoint(
    visiblePolygon,
    allowed,
    preferred
  );
  return visiblePoint ? { ...visiblePoint, opacity } : undefined;
}

function getLabelOpacity(
  screenPolygon: MiotVacuumMapPoint[],
  visiblePolygon: MiotVacuumMapPoint[]
): number {
  const fullArea = Math.abs(getPolygonArea(screenPolygon));
  if (fullArea < 1) return 1;
  const visibleArea = Math.abs(getPolygonArea(visiblePolygon));
  const visibleRatio = visibleArea / fullArea;
  if (visibleRatio >= 0.995) return 1;
  return clamp((visibleRatio - 0.2) / 0.35, 0, 1);
}

function transformPoint(
  matrix: DOMMatrix,
  x: number,
  y: number
): MiotVacuumMapPoint {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function clipPolygonToRect(
  polygon: MiotVacuumMapPoint[],
  rect: MiotVacuumMapScreenRect
): MiotVacuumMapPoint[] {
  return clipPolygonEdge(
    clipPolygonEdge(
      clipPolygonEdge(
        clipPolygonEdge(
          polygon,
          (point) => point.x >= rect.left,
          (a, b) => intersectVertical(a, b, rect.left)
        ),
        (point) => point.x <= rect.right,
        (a, b) => intersectVertical(a, b, rect.right)
      ),
      (point) => point.y >= rect.top,
      (a, b) => intersectHorizontal(a, b, rect.top)
    ),
    (point) => point.y <= rect.bottom,
    (a, b) => intersectHorizontal(a, b, rect.bottom)
  );
}

function clipPolygonEdge(
  polygon: MiotVacuumMapPoint[],
  isInside: (point: MiotVacuumMapPoint) => boolean,
  intersect: (
    a: MiotVacuumMapPoint,
    b: MiotVacuumMapPoint
  ) => MiotVacuumMapPoint
): MiotVacuumMapPoint[] {
  if (!polygon.length) return [];
  const clipped: MiotVacuumMapPoint[] = [];
  let previous = polygon[polygon.length - 1];
  let previousInside = isInside(previous);

  for (const current of polygon) {
    const currentInside = isInside(current);
    if (currentInside !== previousInside) {
      clipped.push(intersect(previous, current));
    }
    if (currentInside) {
      clipped.push(current);
    }
    previous = current;
    previousInside = currentInside;
  }
  return clipped;
}

function intersectVertical(
  a: MiotVacuumMapPoint,
  b: MiotVacuumMapPoint,
  x: number
): MiotVacuumMapPoint {
  const t = (x - a.x) / (b.x - a.x || 1);
  return { x, y: a.y + (b.y - a.y) * t };
}

function intersectHorizontal(
  a: MiotVacuumMapPoint,
  b: MiotVacuumMapPoint,
  y: number
): MiotVacuumMapPoint {
  const t = (y - a.y) / (b.y - a.y || 1);
  return { x: a.x + (b.x - a.x) * t, y };
}

function getPolygonBounds(
  polygon: MiotVacuumMapPoint[]
): MiotVacuumMapScreenRect {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function getPolygonCentroid(polygon: MiotVacuumMapPoint[]): MiotVacuumMapPoint {
  const area = getPolygonArea(polygon);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const cross = current.x * next.y - next.x * current.y;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  if (Math.abs(area) < 0.0001) {
    return {
      x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
      y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
    };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function getPolygonArea(polygon: MiotVacuumMapPoint[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function isPointInPolygon(
  point: MiotVacuumMapPoint,
  polygon: MiotVacuumMapPoint[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function findVisibleLabelPoint(
  polygon: MiotVacuumMapPoint[],
  allowed: MiotVacuumMapScreenRect,
  preferred: MiotVacuumMapPoint
): MiotVacuumMapPoint | undefined {
  let best: MiotVacuumMapPoint | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  const steps = 6;
  for (let yStep = 0; yStep <= steps; yStep += 1) {
    const y = allowed.top + ((allowed.bottom - allowed.top) * yStep) / steps;
    for (let xStep = 0; xStep <= steps; xStep += 1) {
      const x = allowed.left + ((allowed.right - allowed.left) * xStep) / steps;
      const point = { x, y };
      if (!isPointInPolygon(point, polygon)) continue;
      const distance =
        (point.x - preferred.x) ** 2 + (point.y - preferred.y) ** 2;
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
  }
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  point: MiotVacuumMapPoint | null | undefined,
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport
): void {
  if (!point) return;
  drawRobotPulse(ctx, point);
  const rotation = typeof point.phi === "number" ? -point.phi : undefined;
  drawMarker(
    ctx,
    point,
    ROBOT_ICON,
    "#1687ff",
    10,
    canvas,
    map,
    viewport,
    rotation
  );
}

function drawRobotPulse(
  ctx: CanvasRenderingContext2D,
  point: MiotVacuumMapPoint
): void {
  const t = Date.now() % 1600;
  // t:  0.....600.....800............1600
  //     expand  hold    fade out
  if (t > 800) {
    const fadeProgress = (t - 800) / 800;
    const opacity = Math.max(0, 0.5 * (1 - fadeProgress));
    if (opacity <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (t > 600) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const progress = t / 600;
  const radius = 4 + progress * 5;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  point: MiotVacuumMapPoint | null | undefined,
  icon: string,
  fallbackColor: string,
  size: number,
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport,
  rotation?: number
): void {
  if (!point) return;
  const image = loadImage(
    icon,
    viewport.redraw ?? (() => drawMiotVacuumMap(canvas, map, viewport))
  );
  if (image.complete && image.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(point.x, point.y);
    if (typeof rotation === "number") {
      ctx.rotate(rotation);
    }
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = fallbackColor;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function scheduleRobotPulse(
  canvas: HTMLCanvasElement,
  map: MiotVacuumMapData,
  viewport: MiotVacuumMapViewport
): void {
  if (!map.robot) return;
  const key = "__miotVacuumMapPulseFrame";
  const target = canvas as HTMLCanvasElement & Record<string, number>;
  if (target[key]) {
    cancelAnimationFrame(target[key]);
  }
  target[key] = requestAnimationFrame(() => {
    if (!canvas.isConnected) {
      target[key] = 0;
      return;
    }
    if (viewport.redraw) {
      viewport.redraw();
      return;
    }
    drawMiotVacuumMap(canvas, map, viewport);
  });
}

function loadImage(src: string, onload: () => void): HTMLImageElement {
  let image = imageCache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    imageCache.set(src, image);
  }
  if (!image.complete) {
    image.onload = onload;
  }
  return image;
}
