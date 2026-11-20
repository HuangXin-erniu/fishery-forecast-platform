# Mock data

## Purpose

Every value in this repository is synthetic. The mock exists to exercise the interface, the API contract, and the export formats. It is not a forecast, a historical observation, or a calibrated model output.

## Study window and grid

| Property | Value |
|---|---|
| Longitude | 108–118°E |
| Latitude | 20–24°N |
| CRS | EPSG:4326 (WGS84; longitude first) |
| Demonstration resolution | 0.1° × 0.1° |
| Grid shape | 100 columns × 40 rows = 4,000 cells |
| Origin | South-west corner (108, 20) |
| Order | Row-major, south to north |
| Time | UTC; issued and valid time are the same in the mock |

The demonstration resolution is not the native resolution of any upstream product. Cell ids are `r<row>c<column>`, for example `r0c0` and `r39c99`.

## Dates

The fixed demo dates are:

- `2026-06-15`
- `2026-06-16`
- `2026-06-17`

The date selector and the map/cell queries use the same date string. Requests for other dates return HTTP 422.

## Layers

| Layer id | Name | Unit | Mock range | Source label |
|---|---|---|---|---|
| `probability` | 渔场概率 | 概率（0–1） | 0–1 | P02 模拟预报 |
| `effort` | 捕捞努力量 | 小时 / 网格 / 日 | 0–100 | P01 模拟行为 |
| `sst` | 海表温度 | °C | 24–32 | 模拟环境背景 |

The P01/P02/P03 labels identify the conceptual upstreams; they do not indicate that those services are connected.

## Values: missing versus zero

- `null` means **missing** and is displayed as `无数据` / `缺测`.
- `0` is a **valid zero** and is displayed as `0`.
- CSV export uses an empty field for missing and `0` for a valid zero.
- Provenance JSON preserves `null` and `0` as distinct JSON values.

This distinction is part of the contract and is covered by both unit and browser tests.

## How the mock is generated

`makeMap(date, layerId)` uses a deterministic combination of a Gaussian bump and a sine term on the 100 × 40 grid. The centre marker moves slightly by day. A fixed rule marks `r0c1` as missing, `r0c0` as a valid zero, and a sparse set of other cells as missing. `makeCell` derives one cell from the same map; `behaviours` is a synthetic count summary for 相遇、徘徊、挂靠、AIS 中断.

`explain()` returns an `example` answer only for the two canned questions and returns `not_ready` for everything else. The answer text explicitly states that the values are mock results and must not be used for real fishery judgement.

## Exports

The workbench exports:

- **CSV** — a UTF-8 BOM file with one row per cell: `mode,date,layer_id,cell_id,longitude,latitude,value,unit,source,version`.
- **Provenance JSON** — `mode`, `query` (`date`, `layer_id`), `unit`, `grid`, `meta`, and `status`.

Both files are generated in the browser and downloaded locally; nothing is uploaded.

## Basemap

`public/land.geojson` is Natural Earth 1:50m land, a public-domain dataset. Its source URL, terms, and SHA-256 are recorded in [`configs/basemap-source.json`](../configs/basemap-source.json). The browser test verifies the hash.

## Limitations

- Fixed dates and a small demonstration grid.
- No real P01/P02/P03 data, model, or knowledge service.
- No administrative boundaries; the basemap is physical land only.
- No authentication, rate limiting, or persistence.
- The UI is in Chinese; the documentation is in English with a Chinese README.

## Related documents

- [Architecture](architecture.md)
- [API](api.md)
- [Development](development.md)
