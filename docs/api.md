# Mock API

## Contract

The proposed contract is [`configs/openapi.json`](../configs/openapi.json) (OpenAPI 3.1). TypeScript types are generated into [`src/api-types.ts`](../src/api-types.ts) by:

```sh
npm run generate
```

Do not edit `src/api-types.ts` by hand. The mock service implements the contract in [`src/mocks.ts`](../src/mocks.ts).

This is a proposed contract for the mock prototype. It does not represent an interface that P01/P02/P03 have already delivered, and it does not define a production SLA.

## Endpoints

All endpoints are relative to `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/capabilities` | Dates, layers, study bbox, mode, upstream statuses. |
| `GET` | `/map?date=<date>&layer_id=<layer>` | Mock field, grid metadata, centres, season summary. |
| `GET` | `/cells/{cell_id}?date=<date>&layer_id=<layer>` | One native grid cell. |
| `POST` | `/knowledge/query` | Mock explanation for a question and map context. |

### `GET /capabilities`

Returns the fixed demo dates, the three layers, the study bbox, and the upstream status list. The first date is selected by the UI.

### `GET /map`

Returns `status` (`ready`, `empty`, or `not_ready`), `message`, `date`, `layer`, `meta`, `grid`, `values`, `centers`, and `season`. `values` is a row-major array of 4,000 entries (100 columns × 40 rows), south to north. `null` is missing; `0` is a valid zero.

### `GET /cells/{cell_id}`

Returns `id`, `lon`, `lat`, `value`, `unit`, `meta`, and a synthetic `behaviours` summary. Cell ids use `r<row>c<column>`, for example `r0c0`.

### `POST /knowledge/query`

Request:

```json
{
  "question": "解释当前结果",
  "context": {
    "date": "2026-06-16",
    "layer_id": "probability",
    "cell_id": "r4c5"
  }
}
```

Response:

```json
{
  "status": "example",
  "mode": "mock",
  "context": {
    "date": "2026-06-16",
    "layer_id": "probability",
    "cell_id": "r4c5"
  },
  "answer": "...",
  "sources": [{ "title": "课题四 Mock 场景说明（示例来源）", "kind": "example" }]
}
```

Only the two example questions produce an `example` answer. Any other question returns `not_ready` with no fabricated sources. This is deliberate: the mock does not pretend to have a real knowledge service.

## Scenarios

Append one of these to the page URL:

| Scenario | Behavior |
|---|---|
| `?scenario=empty` | The map returns `status: "empty"` with no values or centres. |
| `?scenario=not_ready` | The map returns `status: "not_ready"`. |
| `?scenario=error` | The first map request returns HTTP 503; retry succeeds. |
| `?scenario=race` | A date change is delayed to exercise stale-response protection. |

## Errors

- `422` for an unsupported date or layer, or an invalid knowledge request.
- `503` for the one-shot error scenario.
- The UI exposes a retry action for map errors and disables export until the map is ready.

## Replacing the mock

Keep the contract and generated types. Replace the MSW handlers in `src/mocks.ts` with real `fetch` calls, or run a real service at `/api/v1`. The UI and contract tests can remain unchanged as long as the response shapes stay compatible. Real data must not be committed to this repository.

## Related documents

- [Architecture](architecture.md)
- [Mock data semantics](data.md)
- [Development](development.md)
