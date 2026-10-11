import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  drawMiotVacuumMap,
  MiotVacuumMapData,
  MiotVacuumMapPoint,
} from "../miot-vacuum-map";

const MIOT_MAP_MIN_ZOOM = 1;
const MIOT_MAP_MAX_ZOOM = 5;
const MIOT_MAP_FOLLOW_ZOOM = 2.4;
const MIOT_MAP_FOLLOW_RESUME_MS = 5000;
const MIOT_MAP_FOLLOW_ANIMATION_MS = 260;
const MIOT_MAP_GESTURE_ZOOM_ANIMATION_MS = 70;
const MIOT_MAP_BUTTON_ANIMATION_MS = 130;
const MIOT_MAP_TRACK_ANIMATION_MS = 10000;
const MIOT_MAP_TRACK_ANIMATION_MULTIPLIER = 2;
const MIOT_MAP_DIRECTION_LOOKAHEAD = 5;
const MIOT_MAP_DIRECTION_BLEND_DISTANCE = 8;
const MIOT_MAP_DIRECTION_MIN_DISTANCE = 1.5;

interface MiotMapTrackAnimation {
  startTime: number;
  duration: number;
  previousCleaningSegments: MiotVacuumMapPoint[][];
  connectRouteToPrevious: boolean;
  targetMap: MiotVacuumMapData;
  route: MiotVacuumMapPoint[];
  routeLength: number;
}

interface MiotMapZoomAnimation {
  startTime: number;
  duration: number;
  startZoom: number;
  targetZoom: number;
  mapX: number;
  mapY: number;
  centerX: number;
  centerY: number;
}

interface MiotMapViewportAnimation {
  startTime: number;
  duration: number;
  startZoom: number;
  targetZoom: number;
  startPanX: number;
  targetPanX: number;
  startPanY: number;
  targetPanY: number;
}

@customElement("miot-map-miot-vacuum-map-control")
export class MiotVacuumMapControl extends LitElement {
  @property({ attribute: false }) public map?: MiotVacuumMapData;

  private _zoom = 1;

  private _panX = 0;

  private _panY = 0;

  private _targetZoom = 1;

  private _targetPanX = 0;

  private _targetPanY = 0;

  private _zoomFrame?: number;

  private _zoomAnimation?: MiotMapZoomAnimation;

  private _viewportFrame?: number;

  private _viewportAnimation?: MiotMapViewportAnimation;

  private _resumeFollowTimer?: number;

  private _autoFollow = true;

  private _trackAnimation?: MiotMapTrackAnimation;

  private _animatedRobot?: MiotVacuumMapPoint;

  private _pointers = new Map<number, { x: number; y: number }>();

  private _pinchDistance?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._pointers.clear();
    this._pinchDistance = undefined;
    if (this._zoomFrame) {
      window.cancelAnimationFrame(this._zoomFrame);
      this._zoomFrame = undefined;
    }
    if (this._viewportFrame) {
      window.cancelAnimationFrame(this._viewportFrame);
      this._viewportFrame = undefined;
    }
    if (this._resumeFollowTimer) {
      window.clearTimeout(this._resumeFollowTimer);
      this._resumeFollowTimer = undefined;
    }
    this._zoomAnimation = undefined;
    this._viewportAnimation = undefined;
    this._trackAnimation = undefined;
    this._animatedRobot = undefined;
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("map")) {
      this._startTrackAnimation(
        changedProperties.get("map") as MiotVacuumMapData | undefined,
        this.map
      );
    }
    this._draw();
  }

  protected render() {
    if (!this.map) return nothing;
    return html`
      <canvas
        @pointerdown=${this._handlePointerDown}
        @pointermove=${this._handlePointerMove}
        @pointerup=${this._handlePointerEnd}
        @pointercancel=${this._handlePointerEnd}
        @wheel=${this._handleWheel}
      ></canvas>
      <div
        class="zoom"
        @pointerdown=${this._stopEvent}
        @click=${this._stopEvent}
      >
        <button type="button" title="Zoom in" @click=${this._handleZoomIn}>
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
        <button type="button" title="Zoom out" @click=${this._handleZoomOut}>
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
      </div>
    `;
  }

  private _draw(): void {
    if (!this.map) return;
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) return;
    const displayMap = this._getDisplayMap();
    if (
      this._autoFollow &&
      !this._pointers.size &&
      !this._viewportAnimation &&
      displayMap.robot
    ) {
      this._syncFollowToRobot(displayMap.robot);
    }
    try {
      drawMiotVacuumMap(canvas, displayMap, {
        zoom: this._zoom,
        panX: this._panX,
        panY: this._panY,
        redraw: () => this._draw(),
      });
    } catch (_err) {
      // Map rendering should never block the vacuum controls.
    }
  }

  private _getDisplayMap(): MiotVacuumMapData {
    const animation = this._trackAnimation;
    if (!animation) return this.map!;

    const progress = Math.min(
      1,
      (performance.now() - animation.startTime) / animation.duration
    );
    if (progress >= 1) {
      this._trackAnimation = undefined;
      this._animatedRobot = animation.targetMap.robot ?? undefined;
      return animation.targetMap;
    }

    const distance = animation.routeLength * progress;
    const robot = getPointAtDistance(animation.route, distance);
    const partialRoute = trimRoute(animation.route, distance);
    this._animatedRobot = robot;
    return {
      ...animation.targetMap,
      robot,
      cleaningPath: undefined,
      cleaningPathSegments: mergeCleaningPathSegments(
        animation.previousCleaningSegments,
        getCleaningSegmentsFromRoute(partialRoute),
        animation.connectRouteToPrevious
      ),
    };
  }

  private _getCanvas(): HTMLCanvasElement | null {
    return this.renderRoot.querySelector<HTMLCanvasElement>("canvas");
  }

  private _handlePointerDown(ev: PointerEvent): void {
    if (!this.map) return;
    this._pauseAutoFollow(false);
    ev.preventDefault();
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    target.setPointerCapture(ev.pointerId);
    this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    this._pinchDistance = this._getPinchDistance();
  }

  private _handlePointerMove(ev: PointerEvent): void {
    const previous = this._pointers.get(ev.pointerId);
    if (!previous) return;
    ev.preventDefault();
    ev.stopPropagation();
    this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (this._pointers.size >= 2) {
      const distance = this._getPinchDistance();
      const center = this._getPinchCenter();
      if (distance && center && this._pinchDistance) {
        this._zoomBy(distance / this._pinchDistance, center, 0);
      }
      this._pinchDistance = distance;
      return;
    }

    this._setPan(
      this._targetPanX + ev.clientX - previous.x,
      this._targetPanY + ev.clientY - previous.y
    );
  }

  private _handlePointerEnd(ev: PointerEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    if (target.hasPointerCapture(ev.pointerId)) {
      target.releasePointerCapture(ev.pointerId);
    }
    this._pointers.delete(ev.pointerId);
    this._pinchDistance = this._getPinchDistance();
    if (!this._pointers.size) {
      this._scheduleAutoFollowResume();
    }
  }

  private _handleWheel(ev: WheelEvent): void {
    if (!this.map) return;
    this._pauseAutoFollow();
    ev.preventDefault();
    ev.stopPropagation();
    const canvas = this._getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this._zoomBy(
      ev.deltaY < 0 ? 1.15 : 0.87,
      { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
      MIOT_MAP_GESTURE_ZOOM_ANIMATION_MS
    );
  }

  private _handleZoomIn(ev: Event): void {
    this._stopEvent(ev);
    this._pauseAutoFollow();
    this._zoomBy(1.25, undefined, MIOT_MAP_BUTTON_ANIMATION_MS);
  }

  private _handleZoomOut(ev: Event): void {
    this._stopEvent(ev);
    this._pauseAutoFollow();
    this._zoomBy(0.8, undefined, MIOT_MAP_BUTTON_ANIMATION_MS);
  }

  private _stopEvent(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  private _zoomBy(
    factor: number,
    center?: { x: number; y: number },
    duration = MIOT_MAP_GESTURE_ZOOM_ANIMATION_MS
  ): void {
    const canvas = this._getCanvas();
    const info = this.map?.mapInfo;
    if (!canvas || !info?.sizeX || !info?.sizeY) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const oldZoom = this._zoom;
    const newZoom = Math.min(
      MIOT_MAP_MAX_ZOOM,
      Math.max(MIOT_MAP_MIN_ZOOM, this._targetZoom * factor)
    );
    if (newZoom === this._targetZoom) return;

    const baseScale = Math.max(
      rect.width / info.sizeX,
      rect.height / info.sizeY
    );
    const oldScale = baseScale * oldZoom;
    const x = center?.x ?? rect.width / 2;
    const y = center?.y ?? rect.height / 2;
    const oldOffsetX = (rect.width - info.sizeX * oldScale) / 2 + this._panX;
    const oldOffsetY = (rect.height - info.sizeY * oldScale) / 2 + this._panY;
    const mapX = (x - oldOffsetX) / oldScale;
    const mapY = (y - oldOffsetY) / oldScale;
    const pan = this._getAnchoredPan(newZoom, mapX, mapY, x, y);

    this._setViewport(newZoom, pan.x, pan.y, duration, {
      mapX,
      mapY,
      centerX: x,
      centerY: y,
    });
  }

  private _setViewport(
    zoom: number,
    panX: number,
    panY: number,
    duration: number,
    anchor?: { mapX: number; mapY: number; centerX: number; centerY: number }
  ): void {
    this._cancelViewportAnimation();
    const viewport = this._clampViewport(zoom, panX, panY);
    this._targetZoom = viewport.zoom;
    this._targetPanX = viewport.panX;
    this._targetPanY = viewport.panY;

    if (duration <= 0 || !anchor) {
      this._zoom = viewport.zoom;
      this._panX = viewport.panX;
      this._panY = viewport.panY;
      this._zoomAnimation = undefined;
      if (this._zoomFrame) {
        window.cancelAnimationFrame(this._zoomFrame);
        this._zoomFrame = undefined;
      }
      this._draw();
      return;
    }

    this._zoomAnimation = {
      startTime: performance.now(),
      duration,
      startZoom: this._zoom,
      targetZoom: viewport.zoom,
      ...anchor,
    };
    this._requestZoomFrame();
  }

  private _setPan(panX: number, panY: number): void {
    this._cancelViewportAnimation();
    const viewport = this._clampViewport(this._targetZoom, panX, panY);
    this._targetPanX = viewport.panX;
    this._targetPanY = viewport.panY;
    this._panX = viewport.panX;
    this._panY = viewport.panY;
    this._draw();
  }

  private _startTrackAnimation(
    previousMap: MiotVacuumMapData | undefined,
    nextMap: MiotVacuumMapData | undefined
  ): void {
    const currentAnimation = this._trackAnimation;
    const currentDisplayMap = currentAnimation
      ? this._getDisplayMap()
      : undefined;
    const activeAnimation =
      currentAnimation && this._trackAnimation ? currentAnimation : undefined;
    const now = performance.now();

    if (!nextMap?.robot) {
      this._trackAnimation = undefined;
      this._animatedRobot = undefined;
      return;
    }

    const targetTrackSegments = getTrackSegments(nextMap);
    if (!previousMap || !targetTrackSegments.length) {
      this._trackAnimation = undefined;
      this._animatedRobot = nextMap.robot;
      return;
    }

    const previousTrackSegments = getTrackSegments(previousMap);
    const previousCleaningSegments = getPathSegments(
      currentDisplayMap ?? previousMap
    );
    const routeInfo = getTrackRoute(previousTrackSegments, targetTrackSegments);
    let route = routeInfo.route;
    let connectRouteToPrevious = routeInfo.connectToPrevious;
    let duration = getTrackAnimationDuration(previousMap, nextMap);

    if (activeAnimation && currentDisplayMap?.robot) {
      const elapsed = Math.max(0, now - activeAnimation.startTime);
      const progress = Math.min(1, elapsed / activeAnimation.duration);
      const remainingRoute = getRouteFromDistance(
        activeAnimation.route,
        activeAnimation.routeLength * progress
      );
      if (remainingRoute.length) {
        remainingRoute[0].phi = currentDisplayMap.robot.phi;
      }
      route = appendRoutes(remainingRoute, route);
      connectRouteToPrevious = true;
    }

    const lastRoutePoint = route[route.length - 1];
    if (!lastRoutePoint || !isSamePoint(lastRoutePoint, nextMap.robot)) {
      route.push({ ...nextMap.robot });
    }

    if (route.length < 2) {
      this._trackAnimation = undefined;
      this._animatedRobot = nextMap.robot;
      return;
    }

    const routeLength = getPathLength(route);
    if (routeLength <= 0) {
      this._trackAnimation = undefined;
      this._animatedRobot = nextMap.robot;
      return;
    }

    this._trackAnimation = {
      startTime: now,
      duration,
      previousCleaningSegments,
      connectRouteToPrevious,
      targetMap: nextMap,
      route,
      routeLength,
    };
  }

  private _pauseAutoFollow(scheduleResume = true): void {
    this._autoFollow = false;
    this._cancelViewportAnimation();
    this._targetZoom = this._zoom;
    this._targetPanX = this._panX;
    this._targetPanY = this._panY;
    if (this._resumeFollowTimer) {
      window.clearTimeout(this._resumeFollowTimer);
      this._resumeFollowTimer = undefined;
    }
    if (scheduleResume) {
      this._scheduleAutoFollowResume();
    }
  }

  private _scheduleAutoFollowResume(): void {
    if (this._resumeFollowTimer) {
      window.clearTimeout(this._resumeFollowTimer);
    }
    this._resumeFollowTimer = window.setTimeout(() => {
      this._resumeFollowTimer = undefined;
      if (this._pointers.size) {
        return;
      }
      this._autoFollow = true;
      this._followRobot(MIOT_MAP_FOLLOW_ANIMATION_MS);
    }, MIOT_MAP_FOLLOW_RESUME_MS);
  }

  private _followRobot(duration: number): void {
    const robot = this._animatedRobot ?? this._getDisplayMap().robot;
    if (!robot) return;
    const pan = this._getPanToCenterPoint(robot, MIOT_MAP_FOLLOW_ZOOM);
    if (!pan) return;
    this._setViewportAnimated(MIOT_MAP_FOLLOW_ZOOM, pan.x, pan.y, duration);
  }

  private _syncFollowToRobot(robot: MiotVacuumMapPoint): void {
    const pan = this._getPanToCenterPoint(robot, MIOT_MAP_FOLLOW_ZOOM);
    if (!pan) return;
    const viewport = this._clampViewport(MIOT_MAP_FOLLOW_ZOOM, pan.x, pan.y);
    this._targetZoom = viewport.zoom;
    this._targetPanX = viewport.panX;
    this._targetPanY = viewport.panY;
    this._zoom = viewport.zoom;
    this._panX = viewport.panX;
    this._panY = viewport.panY;
  }

  private _setViewportAnimated(
    zoom: number,
    panX: number,
    panY: number,
    duration: number
  ): void {
    this._zoomAnimation = undefined;
    if (this._zoomFrame) {
      window.cancelAnimationFrame(this._zoomFrame);
      this._zoomFrame = undefined;
    }
    const viewport = this._clampViewport(zoom, panX, panY);
    this._targetZoom = viewport.zoom;
    this._targetPanX = viewport.panX;
    this._targetPanY = viewport.panY;

    if (duration <= 0) {
      this._zoom = viewport.zoom;
      this._panX = viewport.panX;
      this._panY = viewport.panY;
      this._draw();
      return;
    }

    this._viewportAnimation = {
      startTime: performance.now(),
      duration,
      startZoom: this._zoom,
      targetZoom: viewport.zoom,
      startPanX: this._panX,
      targetPanX: viewport.panX,
      startPanY: this._panY,
      targetPanY: viewport.panY,
    };
    this._requestViewportFrame();
  }

  private _cancelViewportAnimation(): void {
    this._viewportAnimation = undefined;
    if (this._viewportFrame) {
      window.cancelAnimationFrame(this._viewportFrame);
      this._viewportFrame = undefined;
    }
  }

  private _requestZoomFrame(): void {
    if (this._zoomFrame) return;
    this._zoomFrame = window.requestAnimationFrame((time) =>
      this._stepZoomAnimation(time)
    );
  }

  private _requestViewportFrame(): void {
    if (this._viewportFrame) return;
    this._viewportFrame = window.requestAnimationFrame((time) =>
      this._stepViewportAnimation(time)
    );
  }

  private _stepViewportAnimation(time: number): void {
    this._viewportFrame = undefined;
    const animation = this._viewportAnimation;
    if (!animation) return;

    const progress = Math.min(
      1,
      (time - animation.startTime) / animation.duration
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    this._zoom =
      animation.startZoom +
      (animation.targetZoom - animation.startZoom) * eased;
    this._panX =
      animation.startPanX +
      (animation.targetPanX - animation.startPanX) * eased;
    this._panY =
      animation.startPanY +
      (animation.targetPanY - animation.startPanY) * eased;
    this._draw();

    if (progress < 1) {
      this._requestViewportFrame();
      return;
    }
    this._zoom = animation.targetZoom;
    this._panX = animation.targetPanX;
    this._panY = animation.targetPanY;
    this._viewportAnimation = undefined;
  }

  private _stepZoomAnimation(time: number): void {
    this._zoomFrame = undefined;
    const animation = this._zoomAnimation;
    if (!animation) return;

    const progress = Math.min(
      1,
      (time - animation.startTime) / animation.duration
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    const zoom =
      animation.startZoom +
      (animation.targetZoom - animation.startZoom) * eased;
    const pan = this._getAnchoredPan(
      zoom,
      animation.mapX,
      animation.mapY,
      animation.centerX,
      animation.centerY
    );
    const viewport = this._clampViewport(zoom, pan.x, pan.y);
    this._zoom = viewport.zoom;
    this._panX = viewport.panX;
    this._panY = viewport.panY;
    this._draw();

    if (progress < 1) {
      this._requestZoomFrame();
      return;
    }
    this._zoom = animation.targetZoom;
    this._panX = this._targetPanX;
    this._panY = this._targetPanY;
    this._zoomAnimation = undefined;
  }

  private _getAnchoredPan(
    zoom: number,
    mapX: number,
    mapY: number,
    centerX: number,
    centerY: number
  ): { x: number; y: number } {
    const canvas = this._getCanvas();
    const info = this.map?.mapInfo;
    if (!canvas || !info?.sizeX || !info?.sizeY) {
      return { x: this._panX, y: this._panY };
    }
    const rect = canvas.getBoundingClientRect();
    const baseScale = Math.max(
      rect.width / info.sizeX,
      rect.height / info.sizeY
    );
    const scale = baseScale * zoom;
    return {
      x: centerX - mapX * scale - (rect.width - info.sizeX * scale) / 2,
      y: centerY - mapY * scale - (rect.height - info.sizeY * scale) / 2,
    };
  }

  private _getPanToCenterPoint(
    point: MiotVacuumMapPoint,
    zoom: number
  ): { x: number; y: number } | undefined {
    const canvas = this._getCanvas();
    const info = this.map?.mapInfo;
    if (!canvas || !info?.sizeX || !info?.sizeY) return undefined;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;

    const scale =
      Math.max(rect.width / info.sizeX, rect.height / info.sizeY) * zoom;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mapCenterX = info.sizeX / 2;
    const mapCenterY = info.sizeY / 2;
    const radian = this.map?.mapExtInfo?.radian;
    const angle = typeof radian === "number" ? -radian : 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - mapCenterX;
    const dy = point.y - mapCenterY;
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    return {
      x:
        centerX -
        ((rect.width - info.sizeX * scale) / 2 +
          mapCenterX * scale +
          rotatedX * scale),
      y:
        centerY -
        ((rect.height - info.sizeY * scale) / 2 +
          mapCenterY * scale +
          rotatedY * scale),
    };
  }

  private _clampViewport(
    zoom: number,
    panX: number,
    panY: number
  ): { zoom: number; panX: number; panY: number } {
    const canvas = this._getCanvas();
    const info = this.map?.mapInfo;
    const clampedZoom = Math.min(
      MIOT_MAP_MAX_ZOOM,
      Math.max(MIOT_MAP_MIN_ZOOM, zoom)
    );
    if (!canvas || !info?.sizeX || !info?.sizeY) {
      return { zoom: clampedZoom, panX, panY };
    }
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { zoom: clampedZoom, panX, panY };
    }

    const baseScale = Math.max(
      rect.width / info.sizeX,
      rect.height / info.sizeY
    );
    const mapWidth = info.sizeX * baseScale * clampedZoom;
    const mapHeight = info.sizeY * baseScale * clampedZoom;
    const maxPanX = Math.max(0, (mapWidth - rect.width) / 2);
    const maxPanY = Math.max(0, (mapHeight - rect.height) / 2);
    return {
      zoom: clampedZoom,
      panX: Math.min(maxPanX, Math.max(-maxPanX, panX)),
      panY: Math.min(maxPanY, Math.max(-maxPanY, panY)),
    };
  }

  private _getPinchDistance(): number | undefined {
    const points = [...this._pointers.values()];
    if (points.length < 2) return undefined;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  private _getPinchCenter(): { x: number; y: number } | undefined {
    const canvas = this._getCanvas();
    const points = [...this._pointers.values()];
    if (!canvas || points.length < 2) return undefined;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (points[0].x + points[1].x) / 2 - rect.left,
      y: (points[0].y + points[1].y) / 2 - rect.top,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        position: relative;
        display: block;
        flex: 1 1 180px;
        height: clamp(120px, 36vh, 300px);
        min-height: 0;
        margin: 0 var(--spacing) var(--spacing);
        overflow: hidden;
        border-radius: 8px;
        background: var(--card-background-color);
        box-shadow: inset 0 0 0 1px var(--divider-color);
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        overscroll-behavior: contain;
        user-select: none;
      }
      :host(:active) {
        cursor: grabbing;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        overscroll-behavior: contain;
      }
      .zoom {
        position: absolute;
        right: var(--spacing);
        bottom: var(--spacing);
        z-index: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 8px;
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.24));
        background: var(--card-background-color);
        pointer-events: auto;
      }
      .zoom button {
        width: 34px;
        height: 32px;
        border: 0;
        border-bottom: 1px solid var(--divider-color);
        margin: 0;
        padding: 0;
        color: var(--primary-text-color);
        background: transparent;
        cursor: pointer;
      }
      .zoom ha-icon {
        --mdc-icon-size: 20px;
      }
      .zoom button:last-child {
        border-bottom: 0;
      }
      .zoom button:active {
        background: rgba(var(--rgb-primary-text-color), 0.12);
      }
    `;
  }
}

function getPathSegments(map: MiotVacuumMapData): MiotVacuumMapPoint[][] {
  if (map.cleaningPathSegments?.length) {
    return map.cleaningPathSegments
      .filter((segment) => segment.length)
      .map((segment) => segment.map((point) => ({ ...point })));
  }
  return map.cleaningPath?.length
    ? [map.cleaningPath.map((point) => ({ ...point }))]
    : [];
}

function getTrackSegments(map: MiotVacuumMapData): MiotVacuumMapPoint[][] {
  if (map.trackPathSegments?.length) {
    return map.trackPathSegments
      .filter((segment) => segment.length)
      .map((segment) => segment.map((point) => ({ ...point })));
  }
  return map.trackPath?.length
    ? [map.trackPath.map((point) => ({ ...point }))]
    : getPathSegments(map);
}

function mergeCleaningPathSegments(
  previousSegments: MiotVacuumMapPoint[][],
  partialSegments: MiotVacuumMapPoint[][],
  connectRouteToPrevious: boolean
): MiotVacuumMapPoint[][] {
  const segments = previousSegments
    .filter((segment) => segment.length)
    .map((segment) => segment.map((point) => ({ ...point })));
  if (!partialSegments.length) return segments;

  const [firstPartialSegment, ...restPartialSegments] = partialSegments;
  const lastSegment = segments[segments.length - 1];
  if (
    connectRouteToPrevious &&
    lastSegment?.length &&
    firstPartialSegment.length &&
    isSamePoint(lastSegment[lastSegment.length - 1], firstPartialSegment[0])
  ) {
    lastSegment.push(
      ...firstPartialSegment.slice(1).map((point) => ({ ...point }))
    );
  } else if (firstPartialSegment.length) {
    segments.push(firstPartialSegment.map((point) => ({ ...point })));
  }

  for (const segment of restPartialSegments) {
    if (segment.length) {
      segments.push(segment.map((point) => ({ ...point })));
    }
  }
  return segments;
}

function getCleaningSegmentsFromRoute(
  route: MiotVacuumMapPoint[]
): MiotVacuumMapPoint[][] {
  const segments: MiotVacuumMapPoint[][] = [];
  let current: MiotVacuumMapPoint[] = [];
  for (const point of route) {
    if (point.update === 1 || point.update === undefined) {
      current.push({ ...point });
      continue;
    }
    if (current.length >= 2) {
      segments.push(current);
    }
    current = [];
  }
  if (current.length >= 2) {
    segments.push(current);
  }
  return segments;
}

function getTrackRoute(
  previousSegments: MiotVacuumMapPoint[][],
  targetSegments: MiotVacuumMapPoint[][]
): { route: MiotVacuumMapPoint[]; connectToPrevious: boolean } {
  for (
    let segmentIndex = 0;
    segmentIndex < targetSegments.length;
    segmentIndex += 1
  ) {
    const targetSegment = targetSegments[segmentIndex];
    const previousSegment = previousSegments[segmentIndex] ?? [];
    let pointIndex = 0;
    while (
      pointIndex < targetSegment.length &&
      pointIndex < previousSegment.length &&
      isSamePoint(targetSegment[pointIndex], previousSegment[pointIndex])
    ) {
      pointIndex += 1;
    }
    if (pointIndex < targetSegment.length) {
      const startIndex = pointIndex > 0 ? pointIndex - 1 : pointIndex;
      return {
        route: targetSegment.slice(startIndex).map((point) => ({ ...point })),
        connectToPrevious: pointIndex > 0,
      };
    }
  }

  const lastPoint = getLastPathPoint(targetSegments);
  return {
    route: lastPoint ? [{ ...lastPoint }] : [],
    connectToPrevious: Boolean(lastPoint),
  };
}

function getLastPathPoint(
  segments: MiotVacuumMapPoint[][]
): MiotVacuumMapPoint | undefined {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment.length) return segment[segment.length - 1];
  }
  return undefined;
}

function trimRoute(
  route: MiotVacuumMapPoint[],
  distance: number
): MiotVacuumMapPoint[] {
  if (!route.length) return [];
  if (distance <= 0) return [route[0]];

  const points = [{ ...route[0] }];
  let remaining = distance;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const segmentLength = getPointDistance(previous, current);
    if (segmentLength <= remaining) {
      points.push({ ...current });
      remaining -= segmentLength;
      continue;
    }

    const ratio = segmentLength > 0 ? remaining / segmentLength : 0;
    points.push(interpolatePoint(previous, current, ratio));
    break;
  }
  return points;
}

function getPointAtDistance(
  route: MiotVacuumMapPoint[],
  distance: number
): MiotVacuumMapPoint {
  if (!route.length) return { x: 0, y: 0 };
  const totalLength = getPathLength(route);
  return withAngle(
    getRoutePointAtDistance(route, distance),
    getRouteAngleAtDistance(route, distance, totalLength)
  );
}

function getRouteFromDistance(
  route: MiotVacuumMapPoint[],
  distance: number
): MiotVacuumMapPoint[] {
  if (!route.length) return [];
  if (distance <= 0) return route.map((point) => ({ ...point }));

  let remaining = distance;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const segmentLength = getPointDistance(previous, current);
    if (segmentLength <= remaining) {
      remaining -= segmentLength;
      continue;
    }

    const ratio = segmentLength > 0 ? remaining / segmentLength : 0;
    return [
      interpolatePoint(previous, current, ratio),
      ...route.slice(index).map((point) => ({ ...point })),
    ];
  }

  return [{ ...route[route.length - 1] }];
}

function appendRoutes(
  first: MiotVacuumMapPoint[],
  second: MiotVacuumMapPoint[]
): MiotVacuumMapPoint[] {
  if (!first.length) return second.map((point) => ({ ...point }));
  if (!second.length) return first.map((point) => ({ ...point }));

  const overlap = getRouteOverlap(first, second);
  if (overlap) {
    return [
      ...first
        .slice(0, overlap.firstIndex + overlap.length)
        .map((point) => ({ ...point })),
      ...second
        .slice(overlap.secondIndex + overlap.length)
        .map((point) => ({ ...point })),
    ];
  }

  const route = first.map((point) => ({ ...point }));
  const startIndex = getNearestRoutePointIndex(second, first[0]);
  const appendStart =
    startIndex !== undefined &&
    getPointDistance(second[startIndex], first[0]) <
      MIOT_MAP_DIRECTION_LOOKAHEAD
      ? startIndex + 1
      : 0;
  for (const point of second.slice(appendStart)) {
    if (!route.length || !isSamePoint(route[route.length - 1], point)) {
      route.push({ ...point });
    }
  }
  return route;
}

function getRouteOverlap(
  first: MiotVacuumMapPoint[],
  second: MiotVacuumMapPoint[]
): { firstIndex: number; secondIndex: number; length: number } | undefined {
  let best:
    | { firstIndex: number; secondIndex: number; length: number }
    | undefined;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      let length = 0;
      while (
        firstIndex + length < first.length &&
        secondIndex + length < second.length &&
        isSamePoint(first[firstIndex + length], second[secondIndex + length])
      ) {
        length += 1;
      }
      if (
        length > 0 &&
        (!best ||
          length > best.length ||
          (length === best.length && firstIndex > best.firstIndex))
      ) {
        best = { firstIndex, secondIndex, length };
      }
    }
  }
  return best;
}

function getNearestRoutePointIndex(
  route: MiotVacuumMapPoint[],
  point: MiotVacuumMapPoint
): number | undefined {
  let nearestIndex: number | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < route.length; index += 1) {
    const distance = getPointDistance(route[index], point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function interpolatePoint(
  from: MiotVacuumMapPoint,
  to: MiotVacuumMapPoint,
  ratio: number
): MiotVacuumMapPoint {
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
    update: from.update === to.update ? from.update : to.update,
  };
}

function getRoutePointAtDistance(
  route: MiotVacuumMapPoint[],
  distance: number
): MiotVacuumMapPoint {
  if (!route.length) return { x: 0, y: 0 };
  if (distance <= 0) return { ...route[0] };

  let remaining = distance;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const segmentLength = getPointDistance(previous, current);
    if (segmentLength <= remaining) {
      remaining -= segmentLength;
      continue;
    }
    const ratio = segmentLength > 0 ? remaining / segmentLength : 0;
    return interpolatePoint(previous, current, ratio);
  }

  return { ...route[route.length - 1] };
}

function getRouteAngleAtDistance(
  route: MiotVacuumMapPoint[],
  distance: number,
  totalLength: number
): number | undefined {
  if (route.length < 2 || totalLength <= 0) return getPointAngle(route[0]);
  const clampedDistance = Math.min(Math.max(distance, 0), totalLength);
  const before = getRoutePointAtDistance(
    route,
    Math.max(0, clampedDistance - MIOT_MAP_DIRECTION_LOOKAHEAD)
  );
  const after = getRoutePointAtDistance(
    route,
    Math.min(totalLength, clampedDistance + MIOT_MAP_DIRECTION_LOOKAHEAD)
  );
  const pathAngle =
    getSegmentAngle(before, after, MIOT_MAP_DIRECTION_MIN_DISTANCE) ??
    getStableSegmentAngle(route, clampedDistance);
  const startAngle = getPointAngle(route[0]);

  if (pathAngle === undefined) return startAngle;
  if (
    startAngle !== undefined &&
    clampedDistance < MIOT_MAP_DIRECTION_BLEND_DISTANCE
  ) {
    return interpolateAngle(
      startAngle,
      pathAngle,
      clampedDistance / MIOT_MAP_DIRECTION_BLEND_DISTANCE
    );
  }
  return pathAngle;
}

function getPointAngle(point: MiotVacuumMapPoint): number | undefined {
  return typeof point.phi === "number" ? -point.phi : undefined;
}

function getSegmentAngle(
  from: MiotVacuumMapPoint,
  to: MiotVacuumMapPoint,
  minDistance = MIOT_MAP_DIRECTION_MIN_DISTANCE
): number | undefined {
  if (getPointDistance(from, to) < minDistance) return undefined;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return Number.isFinite(angle) ? angle : undefined;
}

function getStableSegmentAngle(
  route: MiotVacuumMapPoint[],
  distance: number
): number | undefined {
  let travelled = 0;
  let closestAngle: number | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const segmentLength = getPointDistance(previous, current);
    const angle = getSegmentAngle(previous, current);
    if (angle !== undefined) {
      const segmentCenter = travelled + segmentLength / 2;
      const segmentDistance = Math.abs(segmentCenter - distance);
      if (segmentDistance < closestDistance) {
        closestDistance = segmentDistance;
        closestAngle = angle;
      }
    }
    travelled += segmentLength;
  }
  return closestAngle;
}

function interpolateAngle(from: number, to: number, ratio: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * Math.min(1, Math.max(0, ratio));
}

function withAngle(
  point: MiotVacuumMapPoint,
  angle: number | undefined
): MiotVacuumMapPoint {
  return {
    ...point,
    phi: angle !== undefined && Number.isFinite(angle) ? -angle : point.phi,
  };
}

function getPathLength(points: MiotVacuumMapPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += getPointDistance(points[index - 1], points[index]);
  }
  return length;
}

function getPointDistance(
  a: MiotVacuumMapPoint,
  b: MiotVacuumMapPoint
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isSamePoint(a: MiotVacuumMapPoint, b: MiotVacuumMapPoint): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function getTrackAnimationDuration(
  previousMap: MiotVacuumMapData,
  nextMap: MiotVacuumMapData
): number {
  const previous = previousMap.fetched_at;
  const next = nextMap.fetched_at;
  if (previous && next && next > previous) {
    return Math.min(
      24000,
      Math.max(
        2000,
        (next - previous) * 1000 * MIOT_MAP_TRACK_ANIMATION_MULTIPLIER
      )
    );
  }
  return MIOT_MAP_TRACK_ANIMATION_MS;
}
