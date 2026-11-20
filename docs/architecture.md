# Architecture

## Scope

This repository is a browser-only mock of the fishery-forecast workbench. It demonstrates the interface, the API contract, and the data semantics that a future integrated platform will use. It does not include a backend, a database, real upstream services, or real fishery data.

## Stack

| Layer | Choice |
|---|---|
| UI | React 19.3, TypeScript 5.9 |
| Map | OpenLayers 10.11 |
| Mock API | Mock Service Worker (MSW) 3.0 |
| Build | Vite 8.3 |
| Tests | Vitest 5.1, Playwright 1.65 |

All runtime code is static and client-side. `public/land.geojson` supplies the offline land geometry; `public/mockServiceWorker.js` is the MSW worker.

## Runtime flow

1. `src/main.tsx` starts the MSW worker before rendering `App`.
2. `App` requests `/api/v1/capabilities` and selects the first date.
3. A date or layer change requests `/api/v1/map`; older requests are aborted.
4. Selecting a grid requests `/api/v1/cells/{id}` with the current date and layer.
5. A question posts to `/api/v1/knowledge/query` with the current date, layer, and selected cell.
6. `src/model.ts` generates deterministic mock responses; the UI renders them and can export CSV or provenance JSON.

The browser never calls a third-party service at runtime. The browser tests assert that no non-same-origin request is made.

## Components

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Starts MSW, mounts React. |
| `src/App.tsx` | State, effects, abort handling, request orchestration, export handlers. |
| `src/components/AppHeader.tsx` | Brand, demo badge, date selector. |
| `src/components/LayerPanel.tsx` | Layer list, centre overlay toggle, upstream status, study-area card. |
| `src/components/MapPanel.tsx` | Map heading, `MapView`, loading/error/empty overlays, legend, map footer. |
| `src/components/DetailsPanel.tsx` | Grid details, season/times, knowledge panel, CSV/JSON export. |
| `src/components/AppFooter.tsx` | Static footer. |
| `src/MapView.tsx` | OpenLayers map, raster/grid layers, centre markers, pointer selection. |
| `src/client.ts` | `fetch` wrapper and browser download helper. |
| `src/model.ts` | Mock capabilities, map and cell generation, knowledge answers, CSV/provenance helpers. |
| `src/mocks.ts` | MSW handlers for the four endpoints and scenario switches. |

The component split is intentionally shallow: panels are presentational; `App.tsx` owns the workbench state and request lifecycle. `src/model.ts`, `src/mocks.ts`, `src/client.ts`, `src/MapView.tsx`, and `src/style.css` keep the original mock behavior.

## State and request lifecycle

- **Capabilities**: one request on mount and after a retry.
- **Map**: requests are keyed by `date`, `layer`, and `retry`; the effect aborts the previous request and clears the selected cell and knowledge answer.
- **Cell**: requests are keyed by `cellId`, `date`, `layer`, and `data`; the effect only runs when the map is `ready`.
- **Knowledge**: an `AbortController` is stored in a ref. A generation counter prevents a stale answer from being rendered after a date/layer change.
- **Retry**: increments a counter that re-runs the capabilities and map effects.

## Boundaries

- No backend, database, authentication, or environment secrets.
- No real P01/P02/P03 services; the UI labels them "not connected".
- No real datasets, model weights, or run outputs.
- The Natural Earth land file is a static public-domain asset, not a live tile service.

## Build and serve

`npm run build` type-checks and emits a static `dist/` bundle. The app is served by Vite in development (`npm run dev`). Any static file server can host the built bundle; the mock API is provided by the service worker, so no server-side API process is required.

## Related documents

- [API contract and endpoints](api.md)
- [Mock data semantics](data.md)
- [Development and CI](development.md)
- [Provenance](provenance.md)
