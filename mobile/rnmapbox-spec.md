# @rnmapbox/maps — Complete API & Capability Reference

> Generated from source code (`@rnmapbox/maps` v10.3.1) and docs analysis.
> iOS SDK: Mapbox Maps SDK v11.23.1 | Android: Mapbox Maps SDK 11.23.1
> Requires React Native ≥ 0.79. **Not available in Expo Go** — needs custom dev client.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Installation & Setup](#2-installation--setup)
3. [Core Module (`Mapbox`)](#3-core-module-mapbox)
4. [`MapView`](#4-mapview)
5. [`Camera`](#5-camera)
6. [`Style`](#6-style)
7. [`Viewport`](#7-viewport)
8. [Sources](#8-sources)
9. [Layers](#9-layers)
10. [Annotations & Overlays](#10-annotations--overlays)
11. [Location & Puck](#11-location--puck)
12. [Atmosphere, Terrain, Light, Weather](#12-atmosphere-terrain-light-weather)
13. [`Images` & `Image`](#13-images--image)
14. [`Models`](#14-models)
15. [`StyleImport`](#15-styleimport)
16. [`CameraGestureObserver`](#16-cameragestureobserver)
17. [Modules (Managers)](#17-modules-managers)
18. [Animation System](#18-animation-system)
19. [Shape Animators (Experimental)](#19-shape-animators-experimental)
20. [Logger](#20-logger)
21. [Web Support](#21-web-support)
22. [Style System / Expressions](#22-style-system--expressions)
23. [Platform Differences](#23-platform-differences)
24. [Deprecated APIs](#24-deprecated-apis)
25. [Limitations & Caveats](#25-limitations--caveats)

---

## 1. Architecture Overview

```
React Native JS Thread
├── MapView (class component, PureComponent)
│   └── extends NativeBridgeComponent(MapView, RNMBXMapViewModule)
├── Camera (memo, forwardRef, functional)
│   └── uses NativeCommands(RNMBXCameraModule)
├── Style (functional component) — converts Mapbox Style JSON → component tree
├── Layers (each extends AbstractLayer<Props, NativeProps> extends PureComponent)
├── Sources (each extends AbstractSource<Props, NativeProps> extends PureComponent)
├── Annotations (PointAnnotation extends NativeBridgeComponent)
├── Viewport (memo, forwardRef, functional)
├── LocationPuck / UserLocation / CustomLocationProvider
└── Visual: Light, Atmosphere, Terrain, SkyLayer, Rain, Snow

Native Layer (iOS/Android)
├── RNMBXMapView (fabric component) — renders native MapView
├── RNMBXCamera (fabric component) — camera perspective controller
├── RNMBX*Layer (fabric components) — each layer type
├── RNMBX*Source (fabric components) — each source type
└── Turbo Modules (RNMBXMapViewModule, RNMBXCameraModule, etc.)
```

- **Bridge pattern**: `NativeBridgeComponent` mixin queues imperative method calls made before the native ref mounts, draining on `_setNativeRef`.
- **Fabric / TurboModules**: All native communication uses React Native's new-architecture codegen.
- **Style system**: `transformStyle()` converts declarative JS style objects → `{ [key]: { styletype, stylevalue } }` for native bridge.
- Colors are processed through `processColor()` for native compatibility.

---

## 2. Installation & Setup

### Dependencies

| Platform | Mapbox SDK Version |
|----------|-------------------|
| iOS      | `~> 11.23.1` (configurable via `$RNMapboxMapsVersion`) |
| Android  | `11.23.1` (configurable via `RNMapboxMapsVersion` in ext) |

### Access Token

```ts
import Mapbox from '@rnmapbox/maps';
Mapbox.setAccessToken('<your_token>');
```

### Expo Config Plugin

```json
{
  "expo": {
    "plugins": [
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsDownloadToken": "your_download_token"
        }
      ]
    ]
  }
}
```

`RNMapboxMapsDownloadToken` is for EAS CI builds. For local builds, use `.netrc` (iOS) or `~/.gradle/gradle.properties` (Android).

### Jest Setup

```ts
// jest.config.js
module.exports = {
  setupFiles: ['@rnmapbox/maps/setup-jest'],
};
```

---

## 3. Core Module (`Mapbox`)

### Import

```ts
import Mapbox, { /* named exports */ } from '@rnmapbox/maps';
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setAccessToken` | `(token: string \| null) => Promise<string \| null>` | Sets the Mapbox access token |
| `getAccessToken` | `() => Promise<string>` | Gets the current access token |
| `setWellKnownTileServer` | `(tileServer: string) => void` | Sets tile server (e.g., Mapbox, MapLibra) |
| `clearData` | `() => Promise<void>` | Clears temporary map data/cache |
| `setTelemetryEnabled` | `(enabled: boolean) => void` | Toggle telemetry |
| `setConnected` | `(connected: boolean) => void` | Toggle network connectivity state |
| `addCustomHeader` | `(name: string, value: string, options?: { urlRegexp?: string }) => void` | Add custom HTTP header (with optional URL regex filter) |
| `removeCustomHeader` | `(name: string) => void` | Remove custom HTTP header |

### StyleURL Enum

```ts
enum StyleURL {
  Street          = 'mapbox://styles/mapbox/streets-v11',
  Dark            = 'mapbox://styles/mapbox/dark-v10',
  Light           = 'mapbox://styles/mapbox/light-v10',
  Outdoors        = 'mapbox://styles/mapbox/outdoors-v11',
  Satellite       = 'mapbox://styles/mapbox/satellite-v9',
  SatelliteStreet = 'mapbox://styles/mapbox/satellite-streets-v11',
  TrafficDay      = 'mapbox://styles/mapbox/navigation-preview-day-v4',
  TrafficNight    = 'mapbox://styles/mapbox/navigation-preview-night-v4',
}
```

### Other Constants

| Export | Type | Description |
|--------|------|-------------|
| `OfflinePackDownloadState` | `{ Inactive, Active, Complete, Unknown }` | Offline pack states |
| `LineJoin` | `{ Bevel, Round, Miter }` | Line join constants |
| `StyleSource` | `{ DefaultSourceID: string }` | Default source ID |
| `TileServers` | `{ Mapbox: string }` | Tile server constants |
| `UserTrackingMode` | `{ Follow, FollowWithHeading, FollowWithCourse }` | Camera follow modes |

### Re-exported Components (Complete List)

**=~ 39 components, 5 module managers, 5 animation classes, 15 style types, utilities**

Components: `MapView`, `Camera`, `Style`, `Viewport`, `Light`, `Atmosphere`, `Terrain`, `Snow`, `Rain`, `SkyLayer` (layer), `PointAnnotation`, `Annotation`, `Callout`, `MarkerView`, `LocationPuck`, `UserLocation`, `CustomLocationProvider`, `StyleImport`, `CameraGestureObserver`, `Images`, `Image`, `Models`, `VectorSource`, `ShapeSource`, `RasterSource`, `RasterArraySource`, `RasterDemSource`, `ImageSource`, `FillLayer`, `FillExtrusionLayer`, `CircleLayer`, `LineLayer`, `SymbolLayer`, `RasterLayer`, `RasterParticleLayer`, `HeatmapLayer`, `BackgroundLayer`, `HillshadeLayer`, `ModelLayer`.

Module managers: `locationManager`, `offlineManager`, `offlineManagerLegacy`, `TileStore`, `snapshotManager`.

---

## 4. `MapView`

The primary map surface — a React Native wrapper around the native Mapbox Maps SDK map view.

### Props

#### Style & Projection

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `styleURL` | `string` | `StyleURL.Street` | Map style URL or JSON string |
| `styleJSON` | `string` | — | Inline JSON style per TileJSON spec (if set without `styleURL`, used as `styleURL`) |
| `projection` | `'mercator' \| 'globe'` | `'mercator'` | Render projection |

#### Gestures

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `zoomEnabled` | `boolean` | — | Enable/disable zoom gestures |
| `scrollEnabled` | `boolean` | `true` | Enable/disable scroll/pan |
| `pitchEnabled` | `boolean` | `true` | Enable/disable pitch |
| `maxPitch` | `number` | — | Maximum allowed pitch (degrees) |
| `rotateEnabled` | `boolean` | `true` | Enable/disable rotation |
| `gestureSettings` | `GestureSettings` | — | Fine-grained gesture control (see below) |

#### `GestureSettings` (all optional)

| Prop | Type | Description |
|------|------|-------------|
| `doubleTapToZoomInEnabled` | `boolean` | Double-tap zooms in |
| `doubleTouchToZoomOutEnabled` | `boolean` | Two-finger tap zooms out |
| `pinchPanEnabled` | `boolean` | Pan during pinch |
| `pinchZoomEnabled` | `boolean` | Pinch zoom |
| `pinchZoomDecelerationEnabled` | `boolean` | Deceleration after pinch-zoom (Android only) |
| `pitchEnabled` | `boolean` | Pitch gesture |
| `quickZoomEnabled` | `boolean` | Quick zoom |
| `rotateEnabled` | `boolean` | Rotate gesture |
| `rotateDecelerationEnabled` | `boolean` | Deceleration after rotate (Android only) |
| `panEnabled` | `boolean` | Single-touch pan |
| `panDecelerationFactor` | `number` | Deceleration factor (iOS: UIScrollView default, Android: 0=off, non-zero=on) |
| `simultaneousRotateAndPinchZoomEnabled` | `boolean` | Rotate with pinch-zoom |
| `zoomAnimationAmount` | `number` | Zoom delta for double-tap (Android, positive, default 1.0) |

#### Ornaments

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `attributionEnabled` | `boolean` | `true` | Show/hide attribution |
| `attributionPosition` | `OrnamentPositonProp` | — | Offset `{ top, left }` etc. |
| `logoEnabled` | `boolean` | `true` | Show/hide Mapbox logo |
| `logoPosition` | `OrnamentPositonProp` | — | Logo offset |
| `compassEnabled` | `boolean` | `false` | Show/hide compass |
| `compassFadeWhenNorth` | `boolean` | `false` | Fade compass when pointing north (v10) |
| `compassPosition` | `OrnamentPositonProp` | — | v10: compass offset |
| `compassViewPosition` | `number` | — | Corner: 0=TL, 1=TR, 2=BL, 3=BR |
| `compassViewMargins` | `{ x: number, y: number }` | — | Compass margins |
| `compassImage` | `string` | — | iOS v10: image key for custom compass icon |
| `scaleBarEnabled` | `boolean` | `true` | Show/hide scale bar (v10) |
| `scaleBarPosition` | `OrnamentPositonProp` | — | Scale bar offset |
| `scaleBarUnits` | `'metric' \| 'imperial' \| 'nautical'` | `'metric'` | Scale bar units |

#### Performance & Rendering

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preferredFramesPerSecond` | `number` | — | iOS: preferred framerate; Android: max framerate |
| `surfaceView` | `boolean` | `true` | Android: GLSurfaceView vs TextureView |
| `requestDisallowInterceptTouchEvent` | `boolean` | `false` | Android: experimental, for ScrollView nesting |

#### Label Localization

`localizeLabels`: `{ locale: string; layerIds?: string[] } | true` (v10 only)

- `true` = current device locale
- `{ locale: 'es' }` = specific locale

#### Other

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `contentInset` | `number \| number[]` | — | **DEPRECATED** — use Camera `padding` |
| `tintColor` | `string \| number[]` | — | Map view tint color |
| `deselectAnnotationOnTap` | `boolean` | `false` | Deselect annotation on tap; if true, suppresses `onPress` for deselecting taps |

### Events / Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onPress` | `(feature: GeoJSON.Feature<Point, ScreenPointPayload>) => void` | Map tap |
| `onLongPress` | `(feature: GeoJSON.Feature<Point, ScreenPointPayload>) => void` | Map long press |
| `onRegionWillChange` | `(feature) => void` | **DEPRECATED** |
| `onRegionIsChanging` | `(feature) => void` | Region changing |
| `onRegionDidChange` | `(feature) => void` | **DEPRECATED** |
| `onCameraChanged` | `(state: MapState) => void` | **Preferred v10+** — camera changed |
| `onMapIdle` | `(state: MapState) => void` | **Preferred v10+** — map is idle |
| `onWillStartLoadingMap` | `() => void` | Map about to load new style |
| `onDidFinishLoadingMap` | `() => void` | Map loaded new style |
| `onDidFailLoadingMap` | `() => void` | **DEPRECATED** — use `onMapLoadingError` |
| `onMapLoadingError` | `() => void` | v10: map load error |
| `onWillStartRenderingFrame` | `() => void` | About to render a frame |
| `onDidFinishRenderingFrame` | `() => void` | Finished rendering a frame |
| `onDidFinishRenderingFrameFully` | `() => void` | Fully finished rendering |
| `onWillStartRenderingMap` | `() => void` | Map about to render |
| `onDidFinishRenderingMap` | `() => void` | Map finished rendering |
| `onDidFinishRenderingMapFully` | `() => void` | Map fully finished rendering |
| `onDidFinishLoadingStyle` | `() => void` | Style finished loading |
| `onUserLocationUpdate` | `(location: Location) => void` | User location updated |

**Debouncing**: `regionWillChangeDebounceTime` (default 10ms, fires immediately), `regionDidChangeDebounceTime` (default 500ms).

**`MapState`** (v10, for `onCameraChanged`/`onMapIdle`):
```ts
type MapState = {
  properties: {
    center: GeoJSON.Position;
    bounds: { ne: GeoJSON.Position; sw: GeoJSON.Position };
    zoom: number;
    heading: number;
    pitch: number;
  };
  gestures: { isGestureActive: boolean };
  timestamp?: number;
};
```

**`RegionPayload`** (for `onRegionIsChanging`):
```ts
type RegionPayload = {
  zoomLevel: number;
  heading: number;
  animated: boolean;
  isUserInteraction: boolean;
  visibleBounds: GeoJSON.Position[];
  pitch: number;
};
```

### Instance Methods (via ref)

All return Promises:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPointInView` | `(coordinate: Position) => Promise<Position>` | `[lng,lat]` → `[x,y]` screen coords |
| `getCoordinateFromView` | `(point: Position) => Promise<Position>` | `[x,y]` → `[lng,lat]` |
| `getVisibleBounds` | `() => Promise<[Position, Position]>` | `[[rightLon, topLat], [leftLon, bottomLat]]` |
| `queryRenderedFeaturesAtPoint` | `(point, filter?, layerIDs?) => Promise<FeatureCollection>` | Features at screen point |
| `queryRenderedFeaturesInRect` | `(bbox, filter?, layerIDs?) => Promise<FeatureCollection>` | Features in screen rect; empty `[]` queries full view |
| `querySourceFeatures` | `(sourceId, filter?, sourceLayerIDs?) => Promise<FeatureCollection>` | Features from a source |
| `queryTerrainElevation` | `(coordinate: Position) => Promise<number>` | Elevation in meters at coords |
| `setSourceVisibility` | `(visible, sourceId, sourceLayerId?) => void` | Show/hide layers from source |
| `setFeatureState` | `(featureId, state, sourceId, sourceLayerId?) => Promise<void>` | Set feature state |
| `getFeatureState` | `(featureId, sourceId, sourceLayerId?) => Promise<object>` | Get feature state |
| `removeFeatureState` | `(featureId, stateKey \| null, sourceId, sourceLayerId?) => Promise<void>` | Remove feature state |
| `getZoom` | `() => Promise<number>` | Current zoom level |
| `getCenter` | `() => Promise<Position>` | Current center `[lon, lat]` |
| `takeSnap` | `(writeToDisk?: boolean) => Promise<string>` | Returns Base64 PNG or file URI |
| `clearData` | `() => Promise<void>` | Clear temporary map data cache |
| `setNativeProps` | `(props: NativeProps) => void` | Directly update native props |

### Supported Children

MapView accepts as children: `Camera`, `Viewport`, any Source component, any Layer component, `Light`, `Atmosphere`, `Terrain`, `Style`, `StyleImport`, `Images`, `Models`, `PointAnnotation`, `MarkerView`, `Callout`, `UserLocation`, `LocationPuck`, `CustomLocationProvider`, `CameraGestureObserver`, `Snow`, `Rain`, `ImageSource`.

---

## 5. `Camera`

Controls the user's perspective of the map. `memo(forwardRef)` functional component.

### Props

All props from `CameraStop` + `CameraFollowConfig` + `CameraMinMaxConfig`:

#### Camera Stop Props (target state)

| Prop | Type | Description |
|------|------|-------------|
| `centerCoordinate` | `Position` | Target center `[lng, lat]` |
| `bounds` | `CameraBoundsWithPadding` | `{ ne, sw }` with optional padding per side |
| `heading` | `number` | Bearing (degrees clockwise from true north) |
| `pitch` | `number` | Pitch (degrees from horizon, 0 = top-down) |
| `zoomLevel` | `number` | Zoom level |
| `padding` | `CameraPadding` | `{ paddingLeft, paddingRight, paddingTop, paddingBottom }` |
| `animationDuration` | `number` | Duration in ms |
| `animationMode` | `CameraAnimationMode` | `'flyTo' \| 'easeTo' \| 'linearTo' \| 'moveTo' \| 'none'` |

#### Follow Config

| Prop | Type | Description |
|------|------|-------------|
| `followUserLocation` | `boolean` | Follow user location |
| `followUserMode` | `UserTrackingMode` | `'normal' \| 'compass' \| 'course'` |
| `followZoomLevel` | `number` | Follow zoom level |
| `followPitch` | `number` | Follow pitch |
| `followHeading` | `number` | Follow heading |
| `followPadding` | `Partial<CameraPadding>` | Follow padding offsets |

#### Min/Max Constraints

| Prop | Type | Description |
|------|------|-------------|
| `minZoomLevel` | `number` | Minimum zoom |
| `maxZoomLevel` | `number` | Maximum zoom |
| `maxBounds` | `{ ne: Position; sw: Position }` | Maximum map bounds |

#### Other Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultSettings` | `CameraStop` | — | Fallback config when no target config specified |
| `allowUpdates` | `boolean` | `true` | If false, `setCamera` is a no-op |
| `triggerKey` | `string \| number` | — | **NOT YET IMPLEMENTED** — changes cause retry |
| `onUserTrackingModeChange` | callback | — | **DEPRECATED** — use `Viewport#onStatusChanged` |

### Imperative Methods (via ref)

| Method | Signature | Defaults | Description |
|--------|-----------|----------|-------------|
| `setCamera` | `(config: CameraStop \| CameraStops) => void` | — | Apply camera config (single or multi-stop animation) |
| `fitBounds` | `(ne, sw, padding?, duration?) => void` | `padding=0, duration=0` | Fit bounds with `easeTo` |
| `flyTo` | `(center, duration?) => void` | `duration=2000` | Fly to coordinate |
| `moveTo` | `(center, duration?) => void` | `duration=0` | Move to coordinate with `easeTo` |
| `zoomTo` | `(zoom, duration?) => void` | `duration=2000` | Zoom with `flyTo` |
| `moveBy` | `(props: {x, y, animationMode?, animationDuration?}) => void` | `linearTo, 0` | Pan by screen offset |
| `scaleBy` | `(props: {x, y, scaleFactor, animationMode?, animationDuration?}) => void` | `linearTo, 0` | Scale/zoom at screen point |

### `CameraStop` Type

```ts
type CameraStop = {
  centerCoordinate?: Position;    // [lng, lat]
  bounds?: CameraBoundsWithPadding;
  heading?: number;
  pitch?: number;
  zoomLevel?: number;
  padding?: CameraPadding;
  animationDuration?: number;
  animationMode?: CameraAnimationMode;
};
```

### `CameraAnimationMode`

`'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none'`

### `UserTrackingMode`

```ts
enum UserTrackingMode {
  Follow = 'normal',
  FollowWithHeading = 'compass',
  FollowWithCourse = 'course',
}
```

---

## 6. `Style`

Declarative bridge from Mapbox GL Style Spec JSON to the rnmapbox component tree.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `json` | `MapboxJSON \| string` (URL) | Yes | Style JSON object or URL to fetch one |

### Behavior

1. If `json` is a string URL, fetches via `fetch()` (with `AbortController` on unmount cleanup).
2. Maps `json.layers[i].type` to corresponding layer components (`circle` → `CircleLayer`, `symbol` → `SymbolLayer`, etc.).
3. Converts kebab-case paint/layout keys → camelCase.
4. Maps `json.sources` to source components (`vector` → `VectorSource`, `geojson` → `ShapeSource`, etc.).
5. Only supports `sources` and `layers` fields; `sprites`, `glyphs`, etc. are ignored.

---

## 7. `Viewport`

Modern v11-style camera viewport management. Replaces the deprecated `onUserTrackingModeChange` pattern. `memo(forwardRef)` functional component.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transitionsToIdleUponUserInteraction` | `boolean` | `true` | Transitions to idle when user gestures |
| `onStatusChanged` | `(event: ViewportStatusChangedEvent) => void` | — | Status change callback |

### Imperative Methods (via ref)

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState` | `() => Promise<string>` | Get current viewport state |
| `idle` | `() => Promise<void>` | Transition to idle |
| `transitionTo` | `(state, transition?) => Promise<boolean>` | Transition to a viewport state |

### Viewport States

```ts
type ViewportState =
  | { kind: 'followPuck'; options?: FollowPuckOptions }
  | { kind: 'overview'; options?: OverviewOptions };
```

**`FollowPuckOptions`**: `{ zoom?: number \| 'keep', pitch?: number \| 'keep', bearing?: 'heading' \| 'course' \| number \| 'keep', padding?: { top?, left?, bottom?, right? } \| 'keep' }`

**`OverviewOptions`**: `{ geometry: GeoJSON.Geometry (required), padding?, bearing?, pitch?, animationDuration?: number (seconds) }`

**`ViewportTransition`**: `{ kind: 'immediate' } | { kind: 'default'; maxDurationMs?: number }`

### Status Event

```ts
type ViewportStatusChangedEvent = {
  from: ViewportStatus;
  to: ViewportStatus;
  reason: 'TransitionStarted' | 'TransitionSucceeded' | 'IdleRequested' | 'UserInteraction';
};
```

---

## 8. Sources

All sources extend `AbstractSource` (which extends `React.PureComponent`). Each renders a native fabric component.

### `VectorSource`

Tiled vector data (Mapbox Vector Tile format).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | `DefaultSourceID` | Source identifier |
| `url` | `string` | — | URL to TileJSON |
| `tileUrlTemplates` | `string[]` | — | Tile URL templates |
| `minZoomLevel` | `number` | `0` | Minimum zoom |
| `maxZoomLevel` | `number` | `22` | Maximum zoom |
| `tms` | `boolean` | — | Invert Y axis (TMS scheme) |
| `attribution` | `string` | — | Attribution string |
| `onPress` | `(event: OnPressEvent) => void` | — | Press callback |
| `hitbox` | `{ width, height }` | `{44,44}` | Touch hitbox |

### `ShapeSource`

Vector shapes from URL or GeoJSON object.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | `DefaultSourceID` | Source identifier |
| `url` | `string` | — | URL to GeoJSON |
| `shape` | `GeoJSON.* \| ShapeAnimatorInterface` | — | GeoJSON shape or animator |
| `cluster` | `boolean` | — | Enable clustering |
| `clusterRadius` | `number` | `50` | Cluster radius (pixels) |
| `clusterMaxZoomLevel` | `number` | `maxZoomLevel - 1` | Max cluster zoom |
| `clusterProperties` | `object` | — | Custom cluster aggregate properties |
| `maxZoomLevel` | `number` | `18` | Max vector tile zoom |
| `minZoomLevel` | `number` | `0` | Min zoom |
| `buffer` | `number` | `128` | Tile buffer (pixels) |
| `tolerance` | `number` | `0.375` | Simplification tolerance |
| `lineMetrics` | `boolean` | `false` | Line distance metrics (for `lineGradient`) |
| `onPress` | `(event: OnPressEvent) => void` | — | Press callback |
| `hitbox` | `{ width, height }` | `{44,44}` | Touch hitbox |

**Cluster methods** (via ref):

| Method | Signature | Description |
|--------|-----------|-------------|
| `getClusterExpansionZoom` | `(feature) => Promise<number>` | Zoom to expand cluster |
| `getClusterLeaves` | `(feature, limit, offset) => Promise<FeatureCollection>` | Points in cluster |
| `getClusterChildren` | `(feature) => Promise<FeatureCollection>` | Children at next zoom |

### `RasterSource`

Raster image tiles.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | `DefaultSourceID` | Source identifier |
| `url` | `string` | — | URL to TileJSON |
| `tileUrlTemplates` | `string[]` | — | Tile URL templates |
| `minZoomLevel` | `number` | `0` | Min zoom |
| `maxZoomLevel` | `number` | `22` | Max zoom |
| `tileSize` | `number` | `256`/`512` | Tile size (pixels) |
| `tms` | `boolean` | — | TMS scheme |
| `attribution` | `string` | — | Attribution |
| `sourceBounds` | `[sw.lng, sw.lat, ne.lng, ne.lat]` | — | Bounding box |

If `url` contains `{z}`, `{bbox-`, or `{quadkey}`, auto-migrated to `tileUrlTemplates`.

### `RasterDemSource`

Digital Elevation Model tiles (for terrain).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | `DefaultSourceID` | Source identifier |
| `url` | `string` | — | URL to TileJSON |
| `tileUrlTemplates` | `string[]` | — | Tile URL templates |
| `minZoomLevel` | `number` | `0` | Min zoom |
| `maxZoomLevel` | `number` | `22` | Max zoom |
| `tileSize` | `number` | `256`/`512` | Tile size |

No `tms`, `attribution`, or `sourceBounds` — barebones DEM source.

### `RasterArraySource`

Multi-band raster array tiles for particle animations. **Experimental, requires v11.4.0+.**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | `DefaultSourceID` | Source identifier |
| `url` | `string` | — | URL to TileJSON |
| `tileUrlTemplates` | `string[]` | — | Tile URL templates |
| `tileSize` | `number` | `512` | Tile size (Android only) |
| `sourceBounds` | array | — | Bounding box (Android only) |

**Platform diff**: `tileSize` and `sourceBounds` not supported on iOS (derived from TileJSON).

### `ImageSource`

A georeferenced raster image.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `url` | `number \| string` | Yes | URL or `require()` path (no GIFs) |
| `coordinates` | `[[lng,lat], ...]` (4 corners) | Yes | TL, TR, BR, BL corners |

### `OnPressEvent` (for VectorSource, ShapeSource)

```ts
type OnPressEvent = {
  features: GeoJSON.Feature[];
  coordinates: { latitude: number; longitude: number };
  point: { x: number; y: number };
};
```

---

## 9. Layers

All layers extend `AbstractLayer` (extends `PureComponent`). Common props:

### Common Layer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | **(required)** Unique layer identifier |
| `existing` | `boolean` | — | Reference existing layer (don't create new) |
| `sourceID` | `string` | `DefaultSourceID` | Source to obtain data from |
| `sourceLayerID` | `string` | — | Layer within the source |
| `aboveLayerID` | `string` | — | Insert above this layer |
| `belowLayerID` | `string` | — | Insert below this layer |
| `layerIndex` | `number` | — | Insert at specific index |
| `filter` | `FilterExpression` | — | Feature filter expression |
| `minZoomLevel` | `number` | — | Min zoom visibility |
| `maxZoomLevel` | `number` | — | Max zoom visibility |
| `style` | `*LayerStyleProps` | — | Style properties for this layer type |
| `slot` | `'bottom' \| 'middle' \| 'top'` | — | v11 slot assignment (not on: Background, FillExtrusion, Sky, Model) |

### Layer Styles Count

| Layer | Style Props Count | v11 `slot` Support | Notes |
|-------|:-----------------:|:------------------:|-------|
| `BackgroundLayer` | 8 | No | Solid background color/pattern |
| `CircleLayer` | 19 | Yes | Filled circles |
| `FillExtrusionLayer` | 32 | No | 3D extruded polygons (min/maxZoomLevel typed required) |
| `FillLayer` | 12 | Yes | Filled polygons |
| `HeatmapLayer` | 7 | Yes | Density heatmap |
| `HillshadeLayer` | 10 | Yes | Hillshading from DEM |
| `LineLayer` | 30 | Yes | Polylines (extensive: gradient, trim, border, elevation, occlusion) |
| `ModelLayer` | 20 | Yes | 3D model rendering |
| `RasterLayer` | 16 | Yes | Raster image tiles + color mapping + elevation |
| `RasterParticleLayer` | 8 | Yes | Particle animation (wind/etc), **requires v11.4.0+** |
| `SkyLayer` | 10 | No | Sky dome (gradient or atmosphere) |
| `SymbolLayer` | 51 | Yes | Icons + text labels (most complex) |

### Key Layer Highlights

#### `SymbolLayer` (most complex — 51 style props)
- **Layout**: `symbolPlacement`, `iconImage`, `iconSize`, `iconAllowOverlap`, `iconPadding`, `iconOffset`, `iconAnchor`, `iconRotate`, `iconTextFit`, `textField`, `textFont`, `textSize`, `textMaxWidth`, `textLineHeight`, `textLetterSpacing`, `textJustify`, `textAnchor`, `textVariableAnchor`, `textRadialOffset`, `textOffset`, `textTransform`, `textWritingMode`, `textAllowOverlap`, `symbolZOrder`, `symbolZElevate`, symbol elevation reference, etc.
- **Paint**: `iconColor`, `iconHaloColor/Width/Blur`, `iconOpacity`, `iconEmissiveStrength`, `iconColorSaturation/Contrast/Brightness`, `textColor`, `textHaloColor/Width/Blur`, `textOpacity`, `textEmissiveStrength`, icon/text translate, `symbolZOffset`, occlusion opacity
- **Deprecated `children` prop**: Previously used to create snapshot-based icons. Use `<Image>` component instead.

#### `LineLayer`
- Supports: `lineCap`, `lineJoin`, `lineMiterLimit`, `lineWidth`, `lineGapWidth`, `lineOffset`, `lineBlur`, `lineDasharray`, `linePattern`, `lineGradient` (requires `lineMetrics: true`), `lineTrimOffset/FadeRange/Color`, `lineBorderWidth/Color`, `lineEmissiveStrength`, `lineOcclusionOpacity`, `lineZOffset`, `lineCrossSlope`, `lineElevationReference`

#### `FillExtrusionLayer` (most complex paint — 32 props)
- Full AO (ambient occlusion) system: intensity, radius, wall radius, ground radius, ground attenuation
- Flood light: color, intensity, wall/ground radius, ground attenuation
- `fillExtrusionEdgeRadius`, `fillExtrusionVerticalScale`, `fillExtrusionRoundedRoof`, `fillExtrusionCutoffFadeRange`, `fillExtrusionLineWidth`
- Height alignment: `'terrain' \| 'flat'`, base alignment, `castShadows`

#### `RasterParticleLayer`
- **Experimental** — requires Mapbox Maps SDK v11.4.0+
- `rasterParticleArrayBand`, `rasterParticleCount` (default 512), `rasterParticleColor`, `rasterParticleMaxSpeed`, `rasterParticleSpeedFactor`, `rasterParticleFadeOpacityFactor`, `rasterParticleResetRateFactor`
- Uses `raster-particle-speed` expression

#### `ModelLayer`
- `modelId`, `modelOpacity`, `modelRotation`, `modelScale`, `modelTranslation`, `modelColor`, `modelColorMixIntensity`
- `modelType`: `'common-3d' \| 'location-indicator'`
- `modelCastShadows`, `modelReceiveShadows`, `modelAmbientOcclusionIntensity`, `modelEmissiveStrength`, `modelRoughness`
- `modelHeightBasedEmissiveStrengthMultiplier`, `modelCutoffFadeRange`, `modelElevationReference`
- Requires models loaded via `<Models>` component

---

## 10. Annotations & Overlays

### `PointAnnotation`

Class component extending `NativeBridgeComponent`. Pin-style annotation with a native callout.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `coordinate` | `Position` | Yes | `[lng, lat]` center point |
| `title` | `string` | — | Annotation title (required for iOS callout) |
| `snippet` | `string` | — | Annotation subtitle |
| `selected` | `boolean` | — | Manually select/deselect |
| `draggable` | `boolean` | — | Enable dragging (default: false) |
| `anchor` | `{x, y}` | — | Anchor `[0,1]x[0,1]` (default `{0.5, 0.5}`) |
| `onSelected` | `(payload) => void` | — | Selected callback |
| `onDeselected` | `(payload) => void` | — | Deselected callback |
| `onDragStart` | `(payload) => void` | — | Drag start |
| `onDrag` | `(payload) => void` | — | Drag in progress |
| `onDragEnd` | `(payload) => void` | — | Drag ended |

**`refresh()` method**: Android-only — re-renders the annotation bitmap (call after `Image#onLoad`).

**Children**: Must include at least one React element (typically a `<Callout>` or custom view). A `SymbolLayer` is also acceptable.

### `Callout`

A popup bubble attached to a `PointAnnotation`.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | **(required)** Text shown in default callout |
| `style` | `ViewStyle` | Style for the animated wrapper |
| `containerStyle` | `ViewStyle` | Style for native container |
| `contentStyle` | `ViewStyle` | Style for content bubble |
| `tipStyle` | `ViewStyle` | Style for triangle tip |
| `textStyle` | `ViewStyle` | Style for title text |

- Default callout: 180px wide, white bubble with tip, centered z-index 9999999.
- Custom callout: If children are provided, renders those instead of the default.

### `MarkerView`

A lightweight, performant marker that renders native React Native views directly on the map.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `coordinate` | `Position` | — | **(required)** `[lng, lat]` |
| `anchor` | `{x, y}` | `{0.5, 0.5}` | Anchor `[0,1]x[0,1]` |
| `allowOverlap` | `boolean` | `false` | Allow marker overlap |
| `allowOverlapWithPuck` | `boolean` | `false` | Overlap with location puck |
| `isSelected` | `boolean` | `false` | Selection state |

- **No dedicated `onPress`** — use `Pressable`/`TouchableOpacity` as children.
- Maximum ~100 views recommended.
- Android Fabric fix: intercepts `onAnnotationPosition` event to sync position with React's touch responder system.

### `Annotation`

Higher-level annotation that wraps children in an `Animated.ShapeSource` with a `Point` geometry.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | **(required)** Unique identifier |
| `coordinates` | `number[]` | — | **(required)** `[lng, lat]` |
| `animated` | `boolean` | `false` | Smooth coordinate transitions |
| `animationDuration` | `number` | `1000` | Animation duration (ms) |
| `animationEasingFunction` | function | `Easing.linear` | Easing function |
| `icon` | `string \| number \| object` | — | Icon image specifier |
| `onPress` | callback | — | Press handler |

- If `icon` is provided, adds a `SymbolLayer` child with `iconImage` set.
- Uses `AnimatedPoint.timing()` for smooth coordinate changes.

---

## 11. Location & Puck

### `LocationPuck` (preferred — replaces `NativeUserLocation`)

`memo` functional component. Shows the user's location as a native puck on the map.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `true` | Puck visibility |
| `puckBearing` | `'heading' \| 'course'` | — | Bearing source for rotation |
| `puckBearingEnabled` | `boolean` | — | Enable puck rotation |
| `topImage` | `string` | — | Image name for top layer (via `Images`) |
| `bearingImage` | `string` | — | Image name for middle layer |
| `shadowImage` | `string` | — | Image name for background layer |
| `scale` | `Value<number>` | — | Scale factor (number or expression) |
| `pulsing` | `PulsingConfig \| 'default'` | — | Pulsing animation config |
| `androidRenderMode` | `'normal' \| 'compass' \| 'gps'` | — | **DEPRECATED** |
| `iosShowsUserHeadingIndicator` | `boolean` | — | **DEPRECATED** |

**`PulsingConfig`**: `{ isEnabled?: boolean; color?: number \| ColorValue; radius?: 'accuracy' \| number }`

### `UserLocation` (deprecated in favor of `LocationPuck`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `true` | Visibility |
| `animated` | `boolean` | `true` | Animate between updates |
| `renderMode` | `UserLocationRenderMode` | `Normal` | `'native'` (→LocationPuck) or `'normal'` (js circles) |
| `children` | `ReactElement[]` | — | Custom location icon (Normal mode) |
| `minDisplacement` | `number` | `0` | Min movement before update (meters) |
| `onUpdate` | `(location: Location) => void` | — | Location update callback |
| `onPress` | `() => void` | — | Press callback |
| `showsUserHeadingIndicator` | `boolean` | `false` | Show heading arrow |
| `requestsAlwaysUse` | `boolean` | `false` | iOS: always permission |

**Normal mode**: Renders three `CircleLayer`s (pulse, white, blue) + optional `HeadingIndicator`. Uses `Annotation` with `animated={true}`.

### `CustomLocationProvider`

Provides custom location data (coordinate + heading) that gets applied to the `LocationPuck`.

| Prop | Type | Description |
|------|------|-------------|
| `coordinate` | `Position` | `[lng, lat]` for custom location |
| `heading` | `number` | Heading/bearing |

Useful for simulating location or providing location from a non-GPS source.

### `HeadingIndicator`

Renders a heading arrow icon from `../assets/heading.png` as a `SymbolLayer`.

| Prop | Type | Description |
|------|------|-------------|
| `heading` | `number` | Rotation angle in degrees |

---

## 12. Atmosphere, Terrain, Light, Weather

### `Light`

Controls scene lighting.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `style` | `LightLayerStyleProps` | Yes | Light style attributes |

Style props: `anchor` (`'map' \| 'viewport'`), `position` (`[r, a, p]`), `color`, `intensity` (0–1), plus transitions.

### `Atmosphere`

Controls atmospheric fog/glow effects.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `style` | `AtmosphereLayerStyleProps` | Yes | Atmosphere style attributes |

Style props: `range`, `color`, `highColor`, `spaceColor`, `horizonBlend`, `starIntensity`, `verticalRange`, plus transitions.

### `Terrain`

Enables 3D terrain from a `RasterDemSource`.

| Prop | Type | Description |
|------|------|-------------|
| `sourceID` | `string` | Name of `RasterDemSource` |
| `exaggeration` | `Value<number>` | **DEPRECATED** — use `style.exaggeration` |
| `style` | `TerrainLayerStyleProps` | Terrain style: `source`, `exaggeration` (0–1000) |

### `Snow`

Snow particle effect. Requires Mapbox Standard-based styles.

| Prop | Type | Description |
|------|------|-------------|
| `style` | `SnowLayerStyleProps` | Snow particle style |

### `Rain`

Rain particle effect. Requires Mapbox Standard-based styles.

| Prop | Type | Description |
|------|------|-------------|
| `style` | `RainLayerStyleProps` | Rain particle style |

**Note**: Default colors use `measure-light("brightness")` expressions only available in Mapbox Standard styles. With legacy/custom styles, set explicitly (`color="#a8adbc" vignetteColor="#464646"`).

---

## 13. `Images` & `Image`

### `Images`

Registers images as sprites available to `SymbolLayer#iconImage`.

| Prop | Type | Description |
|------|------|-------------|
| `images` | `{ [key: string]: ImageEntry }` | Key-value pairs of image name → source |
| `nativeAssetImages` | `NativeImage[]` | Native asset references (iOS/Android drawables) |
| `onImageMissing` | `(imageKey: string) => void` | Callback when layer references missing image |

**`ImageEntry`**: string (URL/path), `ImageSourcePropType`, or `{ url?, image?, resolvedImage?, sdf?, stretchX?, stretchY?, content?, scale? }`.

### `Image`

A child of `<Images>` that renders a React Native view, captures it to a bitmap on Android, and registers it as a map sprite.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Image ID |
| `sdf` | `boolean` | — | SDF icon flag |
| `stretchX` | `[number, number][]` | — | Horizontal stretch areas |
| `stretchY` | `[number, number][]` | — | Vertical stretch areas |
| `content` | `[l, t, r, b]` | — | Content box |
| `scale` | `number` | — | Scale factor |

**`refresh()` method**: Re-captures the view into a bitmap (needed on Android after content changes).

### `Images` with children pattern

```tsx
<Images>
  <Image name="my-icon">
    <View style={{ width: 32, height: 32, backgroundColor: 'red' }} />
  </Image>
</Images>
```

---

## 14. `Models`

Registers 3D models (GLTF/GLB) for use by `ModelLayer`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `models` | `{ [key: string]: string \| number }` | Yes | Name → GLTF/GLB URL path or asset ID (require()) |

- String values → treated as URLs
- Number values (require'd assets) → resolved via `Image.resolveAssetSource()`

---

## 15. `StyleImport`

Configures Mapbox Standard Style imports (v11 only).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Style import ID (e.g., `'basemap'`) |
| `existing` | `boolean` | Yes | Always `true` |
| `config` | `{ [key: string]: string }` | Yes | Config dictionary (e.g., `{ lightPreset: 'night' }`) |

---

## 16. `CameraGestureObserver`

Detects when camera gestures finish (user stopped interacting with the map).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `quietPeriodMs` | `number` | `200` | ms to wait after last camera change before 'steady' |
| `maxIntervalMs` | `number` | — | max ms before emitting 'timeout' during continuous gesture |
| `onMapSteady` | `(event) => void` | — | Callback with `{ reason: 'steady' \| 'timeout', idleDurationMs?, lastGestureType?, timestamp }` |

---

## 17. Modules (Managers)

### `locationManager`

Singleton for location updates.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLastKnownLocation` | `() => Promise<Location \| null>` | Last known location |
| `addListener` | `(listener) => void` | Register location listener |
| `removeListener` | `(listener) => void` | Remove listener |
| `removeAllListeners` | `() => void` | Clear all listeners |
| `start` | `(displacement?) => void` | Start location updates (`-1` = any movement) |
| `stop` | `() => void` | Stop location updates |
| `setMinDisplacement` | `(meters) => void` | Min movement before next event |
| `setRequestsAlwaysUse` | `(bool) => void` | iOS: request always permission |
| `setLocationEventThrottle` | `(ms) => void` | V10 iOS only: bridge throttle (default 0ms) |

### `offlineManager`

Download map regions for offline use (v10 API, uses `TileStore`).

| Method | Signature | Description |
|--------|-----------|-------------|
| `createPack` | `(options, progressCb, errorCb?) => Promise<void>` | Create and download offline pack |
| `invalidatePack` | `(name) => Promise<void>` | Revalidate tiles against server |
| `deletePack` | `(name) => Promise<void>` | Delete a pack |
| `getPacks` | `() => Promise<OfflinePack[]>` | All stored packs |
| `getPack` | `(name) => Promise<OfflinePack \| undefined>` | Pack by name |
| `subscribe` | `(name, progressCb, errorCb?) => Promise<void>` | Subscribe to pack events |
| `unsubscribe` | `(name) => void` | Unsubscribe from pack events |
| `mergeOfflineRegions` | `(path) => Promise<void>` | Sideload offline database |
| `setTileCountLimit` | `(limit) => void` | Max Mapbox-hosted tiles |
| `setMaximumAmbientCacheSize` | `(size) => Promise<void>` | Ambient cache max bytes |
| `setProgressEventThrottle` | `(ms) => void` | Download status throttle (default 300ms) |
| `resetDatabase` | `() => Promise<void>` | Delete and reinitialize database |
| `migrateOfflineCache` | `() => Promise<void>` | Migrate from pre-v10 cache |
| `invalidateAmbientCache` | `() => Promise<void>` | **DEPRECATED v10** |
| `clearAmbientCache` | `() => Promise<void>` | **DEPRECATED v10** |

**`OfflineCreatePackOptions`**:
```ts
{
  name: string;                    // Required
  styleURL: string;                // Required
  bounds: [Position, Position];    // Required [NE, SW]
  tilesets?: string[];
  minZoom?: number;
  maxZoom?: number;
  metadata?: Record<string, unknown>;
}
```

### `offlineManagerLegacy`

Simpler offline API without progress/error listeners (legacy).

Same base methods: `createPack`, `invalidatePack`, `deletePack`, `getPacks`, `getPack`, `setTileCountLimit`, `resetDatabase`, `migrateOfflineCache`.

### `TileStore`

Fine-grained tile download management with disk quota.

| Method | Signature | Description |
|--------|-----------|-------------|
| `shared` | `(path?) => Promise<TileStore>` | Get shared TileStore (empty path = default) |
| `setOption` | `(key, domain, value) => Promise<void>` | Set config option for data type |

**Domains**: `'Maps' \| 'Navigation' \| 'Search' \| 'ADAS'`

### `snapshotManager`

Take static raster map snapshots.

| Method | Signature | Description |
|--------|-----------|-------------|
| `takeSnap` | `(options?) => Promise<string>` | Returns URI (file path or base64) |

**`SnapshotOptions`**:
```ts
{
  centerCoordinate?: Position;
  width?: number;
  height?: number;
  zoomLevel?: number;    // default 16
  pitch?: number;        // default 0
  heading?: number;      // default 0
  styleURL?: string;     // default StyleURL.Street
  writeToDisk?: boolean; // default false
  bounds?: number[][];
  withLogo?: boolean;    // default true
}
```

Requires `centerCoordinate` or `bounds`. pitch/heading/zoom only work with `centerCoordinate`.

---

## 18. Animation System

### `Animated` Component Wrappers

```ts
const Animated = {
  ShapeSource: Animated.createAnimatedComponent(ShapeSource),
  ImageSource: Animated.createAnimatedComponent(ImageSource),
  FillLayer: Animated.createAnimatedComponent(FillLayer),
  FillExtrusionLayer: Animated.createAnimatedComponent(FillExtrusionLayer),
  LineLayer: Animated.createAnimatedComponent(LineLayer),
  CircleLayer: Animated.createAnimatedComponent(CircleLayer),
  SymbolLayer: Animated.createAnimatedComponent(SymbolLayer),
  RasterLayer: Animated.createAnimatedComponent(RasterLayer),
  BackgroundLayer: Animated.createAnimatedComponent(BackgroundLayer),
};
```

### `AnimatedPoint`

Animated GeoJSON Point using `Animated.Value` for lng/lat.

| Method | Description |
|--------|-------------|
| `constructor(point?)` | Create from `{ type: 'Point', coordinates: [lng, lat] }` |
| `setValue(point?)` | Set both coordinates |
| `timing(config?)` | `{ coordinates: [lng, lat], duration?, easing? }` → animated composite |
| `spring(config?)` | Same shape as timing |
| `stopAnimation(cb?)` | Stop animation |
| `__getValue()` | Returns current GeoJSON Point |

### `AnimatedShape`

Animated wrapper for any GeoJSON structure containing `Animated.Node` values. Recursively resolves values in `__getValue()`.

### `AnimatedCoordinatesArray`

Animated array of coordinate pairs. Supports `timing`, `spring`, `decay` animations.

### `AnimatedRouteCoordinatesArray`

Extends `AnimatedCoordinatesArray`. Animates along a route, progressively shortening the displayed route based on progress (distance along line). Uses `@turf` helpers.

### `AnimatedExtractCoordinateFromArray`

Extracts a single coordinate from an `AnimatedCoordinatesArray` at a given index (supports negative indices).

---

## 19. Shape Animators (Experimental)

Exposed via `Mapbox.__experimental`.

### `MovePointShapeAnimator`

| Method | Description |
|--------|-------------|
| `constructor(startCoordinate)` | Initialize at start position |
| `moveTo({ coordinate, durationMs })` | Animate point to new coordinate |

### `ChangeLineOffsetsShapeAnimator`

| Method | Description |
|--------|-------------|
| `constructor({ coordinates, startOffset, endOffset })` | Initialize line |
| `setLineString({ coordinates, startOffset?, endOffset? })` | Update line geometry |
| `setStartOffset({ offset, durationMs })` | Animate start offset |
| `setEndOffset({ offset, durationMs })` | Animate end offset |

Both implement `ShapeAnimatorInterface { __nativeTag: number }` and can be passed as `shape` prop to `ShapeSource`.

---

## 20. Logger

Singleton for logging Mapbox SDK messages to console or custom callback.

`Logger.sharedInstance()` — auto-started on import.

| Method | Description |
|--------|-------------|
| `setLogCallback(callback)` | Custom log callback; if returns falsy, default console logging occurs |
| `setLogLevel(level)` | Set minimum level: `'error' \| 'warning' \| 'info' \| 'debug' \| 'verbose'` |
| `start()` / `stop()` | Reference-counted start/stop |

---

## 21. Web Support

Minimal web implementation using `mapbox-gl` directly.

**Available on web**: `MapView`, `Camera`, `MarkerView`, `Logger`, `LineJoin`, `StyleURL`, `setAccessToken`.

**Not available on web**: All sources, layers (except what `mapbox-gl` renders), annotations, `LocationPuck`, `UserLocation`, offline, viewport, etc.

**Setup**: Add `mapbox-gl` dependency, configure webpack to transpile `@rnmapbox/maps`.

---

## 22. Style System / Expressions

### Style Value Types

Each style property accepts either a literal value or a Mapbox GL expression:

```ts
type Value<T, P extends ExpressionParameters[] = []> = T | Expression;
```

### Expression Parameters

| Parameter | Available In |
|-----------|-------------|
| `zoom` | All layers |
| `feature` / `feature-state` | Circle, Fill, FillExtrusion, Heatmap, Line, Model, Symbol |
| `measure-light` | Background, Circle, Fill, FillExtrusion, Heatmap, Hillshade, Line, Model, Raster, Symbol |
| `line-progress` | Line |
| `heatmap-density` | Heatmap |
| `raster-value` | Raster |
| `raster-particle-speed` | RasterParticle |
| `sky-radial-progress` | Sky |

### Expression Names (~90)

Includes: `['+', '*', '-', '/', '%', '^', 'abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'e', 'floor', 'ln', 'ln2', 'log10', 'log2', 'max', 'min', 'pi', 'round', 'sin', 'sqrt', 'tan', 'zoom', 'heatmap-density', 'line-progress', 'sky-radial-progress', 'accumulated', 'feature-state', 'raster-value', 'raster-particle-speed', 'measure-light', 'geometry-type', 'id', 'properties', 'to-boolean', 'to-color', 'to-number', 'to-string', 'typeof', 'string', 'number', 'boolean', 'object', 'collator', 'format', 'image', 'literal', 'match', 'case', 'step', 'interpolate', 'interpolate-hcl', 'interpolate-lab', 'let', 'var', 'concat', 'downcase', 'is-supported-script', 'resolved-locale', 'upcase', 'distance', 'within', 'all', 'any', 'none', '!', '!=', '<', '<=', '==', '>', '>=', 'array', 'at', 'coalesce', 'get', 'has', 'in', 'index-of', 'length', 'slice', 'config', 'random', 'density', 'max-density']`

### FilterExpression

Alias for `Expression`.

### Transition Type

```ts
interface Transition {
  duration: number;  // ms (default 300)
  delay: number;     // ms (default 0)
}
```

### Layer Style Type Aliases

All exported from `Mapbox`:
- `FillLayerStyle`, `LineLayerStyle`, `SymbolLayerStyle`, `CircleLayerStyle`, `HeatmapLayerStyle`, `FillExtrusionLayerStyle`, `RasterLayerStyle`, `RasterParticleLayerStyle`, `HillshadeLayerStyle`, `BackgroundLayerStyle`, `SkyLayerStyle`, `LightLayerStyle`, `AtmosphereLayerStyle`, `TerrainLayerStyle`, `ModelLayerStyle`

---

## 23. Platform Differences

| Feature | iOS | Android |
|---------|-----|---------|
| `RasterArraySource.tileSize` | Not supported (from TileJSON) | Supported |
| `RasterArraySource.sourceBounds` | Not supported (from TileJSON) | Supported |
| `compassImage` | Supported (v10) | Not supported |
| `PointAnnotation.refresh()` | N/A | Required after view content changes |
| `Image.refresh()` | N/A | Required after content changes (captures view to bitmap) |
| `shapeAnimators` (experimental) | Supported | Supported |
| `panDecelerationFactor` | UIScrollView default | 0=off, non-zero=on |
| `pinchZoomDecelerationEnabled` | Not supported | Supported |
| `rotateDecelerationEnabled` | Not supported | Supported |
| `zoomAnimationAmount` | Not supported | Supported (double-tap zoom delta) |
| `surfaceView` | N/A | GLSurfaceView vs TextureView |
| Event payloads (new arch) | String (serialized JSON) | Object (parsed) |
| `locationManager.setLocationEventThrottle` | V10+ | Not supported |
| `locationManager._simulateHeading` | V10+ | Not supported |
| `OfflinePack.status()` | Returns parsed | Returns parsed |
| `ShapeSource cluster methods` | Return JSON string (iOS new arch) → parsed | Return object directly |

---

## 24. Deprecated APIs

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `NativeUserLocation` | `LocationPuck` | Alias since renamed |
| `UserLocation` (whole component) | `LocationPuck` | Prefer native puck |
| `UserLocationRenderMode.Native` | `LocationPuck` | Use the puck directly |
| `UserTrackingModes` | `UserTrackingMode` | Renamed |
| `AnimatedMapPoint` | `AnimatedPoint` | Wrapper with deprecation warning |
| `Camera#onUserTrackingModeChange` | `Viewport#onStatusChanged` | v11 Viewport API |
| `MapView#contentInset` | `Camera#padding` | — |
| `MapView#onRegionWillChange` | `MapView#onCameraChanged` | v10+ |
| `MapView#onRegionDidChange` | `MapView#onMapIdle` | v10+ |
| `MapView#onDidFailLoadingMap` | `MapView#onMapLoadingError` | v10+ |
| `Terrain#exaggeration` (prop) | `Terrain#style.exaggeration` | — |
| `LocationPuck#androidRenderMode` | `puckBearing` + `bearingImage` | — |
| `LocationPuck#iosShowsUserHeadingIndicator` | `puckBearingEnabled={true} puckBearing="heading"` | Auto-converts with warning |
| `SymbolLayer#children` | `<Image>` component | Snapshot-based icon deprecated |
| `offlineManager.invalidateAmbientCache` | — | Deprecated v10 |
| `offlineManager.clearAmbientCache` | — | Deprecated v10 |

---

## 25. Limitations & Caveats

### Known Limitations

1. **No Expo Go support**: Requires custom dev client or bare workflow.
2. **Web support is minimal**: Only `MapView`, `Camera`, `MarkerView`, `Logger` available. No layers, sources, annotations, or modules on web.
3. **No TypeScript `tsc --noEmit`**: tsconfig `include` scans `node_modules` causing hangs (project-specific).
4. **Style `json` prop**: Only processes `sources` and `layers` fields — `sprites`, `glyphs`, `light`, `terrain`, `fog`, `transition`, `metadata`, `center`, `zoom`, `bearing`, `pitch` are **not** extracted.
5. **`triggerKey`** on Camera: **Not yet implemented** — changes don't retry camera moves.
6. **RasterParticleLayer**: Experimental, requires Mapbox Maps SDK v11.4.0+.
7. **RasterArraySource**: Experimental; `tileSize` and `sourceBounds` iOS-unavailable.
8. **Shape animators**: Experimental (`__experimental`), may change in future releases.
9. **`MarkerView` max ~100 views**: Performance degrades beyond ~100 markers per Mapbox guidance.
10. **`PointAnnotation.draggable`**: Behavior varies — Android renders to canvas bitmap, iOS uses native annotation.
11. **`queryRenderedFeaturesInRect([], ...)`**: Empty array = full viewport query (v10 behavior).
12. **`lineGradient`**: Requires GeoJSON source with `lineMetrics: true`.
13. **Offline packs**: v10 API uses `TileStore`; legacy API still available via `offlineManagerLegacy`.
14. **Rain/Snow default colors**: Use `measure-light("brightness")` expressions only available in Mapbox Standard-based styles (`mapbox://styles/mapbox/standard`, `mapbox://styles/mapbox/standard-satellite`). With legacy styles, set colors explicitly.
15. **Platform-specific gesture settings**: Several `GestureSettings` props are Android-only (deceleration, zoom animation amount).
16. **`followUserMode: 'course'`**: Course (direction of travel) differs from heading (compass direction).
17. **`fitBounds`**: Uses `easeTo` animation. For fly-to-style bounds, use `setCamera` with `animationMode: 'flyTo'` and `bounds`.
18. **Deprecated and current callbacks**: Don't mix `onRegionWillChange`/`onRegionIsChanging`/`onRegionDidChange` with `onCameraChanged`/`onMapIdle` — a warning is shown.
19. **`onMapLoadingError`**: May fire multiple times and is not exclusive of `onDidFinishLoadingMap`.
20. **`Image.resolveAssetSource()` failures**: Can throw at module level for `react-native-maps` assets.

### Performance Considerations

- Use `gestureSettings` to fine-tune which gestures are enabled.
- Use `preferredFramesPerSecond` to cap render frame rate.
- Use `Camera#allowUpdates={false}` when the map is not visible.
- Use `regionDidChangeDebounceTime` to control callback frequency.
- For many markers, prefer `SymbolLayer` with `iconImage` over `MarkerView` or `PointAnnotation`.
- Use clustering (via `ShapeSource#cluster`) for large datasets.
- Android: `surfaceView={false}` uses `TextureView` (can be composited with other views, but may be slower).
- Use `setSourceVisibility` to toggle layer visibility instead of conditional rendering.
- Use `CameraGestureObserver` to detect when gesture-intensive operations can stop.

### Type System Notes

- **Strict mode enabled**: All params and return types must be explicit.
- Use `type` aliases (never `interface`) for type definitions.
- Use `import type` for type-only imports.
- Prefer utility types (`Omit<>`, `ComponentProps<>`, etc.) to derive prop types.
- Style props are all exported as type aliases (e.g., `FillLayerStyle`, `LineLayerStyle`).
