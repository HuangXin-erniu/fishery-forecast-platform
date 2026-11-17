import { describe, it, expect } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import spec from "../configs/openapi.json";
import source from "../configs/basemap-source.json";
import {
  makeMap,
  makeCell,
  cellAt,
  explain,
  csv,
  provenance,
  capabilities,
  dates,
  layers,
} from "../src/model";
const ajv = new Ajv({ strict: false });
addFormats(ajv);
describe("契约与语义", () => {
  it("全部日期和图层响应符合 OpenAPI schema", () => {
    for (const name of [
      "Capabilities",
      "MapResult",
      "CellResult",
      "KnowledgeResult",
    ] as const) {
      const validate = ajv.compile({
        ...spec.components.schemas[name],
        components: spec.components,
      });
      const items =
        name === "Capabilities"
          ? [capabilities]
          : name === "MapResult"
            ? dates.flatMap((d) => layers.map((l) => makeMap(d, l.id)))
            : name === "CellResult"
              ? [
                  makeCell("r0c0", dates[0], "effort"),
                  makeCell("r0c1", dates[0], "effort"),
                ]
              : [
                  explain({
                    question: "解释当前结果",
                    context: {
                      date: dates[0],
                      layer_id: "probability",
                      cell_id: null,
                    },
                  }),
                ];
      for (const item of items)
        expect(validate(item), JSON.stringify(validate.errors)).toBe(true);
    }
  });
  it("零值和缺测可区分，边界网格映射正确", () => {
    expect(makeCell("r0c0", dates[0], "effort").value).toBe(0);
    expect(makeCell("r0c1", dates[0], "effort").value).toBeNull();
    expect(cellAt(108.05, 20.05)).toBe("r0c0");
    expect(cellAt(117.95, 23.95)).toBe("r39c99");
    expect(cellAt(118, 24)).toBeNull();
    expect(() => makeCell("r40c0", dates[0], "effort")).toThrow();
  });
  it("CSV 与来源记录保留模拟状态、单位、日期、版本和空值", () => {
    const data = makeMap(dates[1], "effort"),
      rows = csv(data)
        .replace(/^\uFEFF/, "")
        .split("\r\n");
    expect(rows).toHaveLength(4001);
    expect(rows[1].split(",")[6]).toBe("0");
    expect(rows[2].split(",")[6]).toBe("");
    expect(rows[1]).toContain("mock,2026-06-16,effort");
    expect(provenance(data)).toMatchObject({
      mode: "mock",
      unit: data.layer.unit,
      query: { date: dates[1], layer_id: "effort" },
      meta: { version: "mock-0.1", upstream_status: "not_connected" },
    });
  });
  it("示例回答携带上下文，任意问题不伪造知识回答", () => {
    const context = { date: dates[0], layer_id: "sst", cell_id: "r4c5" };
    expect(explain({ question: "解释当前结果", context })).toMatchObject({
      context,
      status: "example",
      sources: [{ kind: "example" }],
    });
    expect(explain({ question: "明天去哪里捕鱼", context })).toMatchObject({
      status: "not_ready",
      sources: [],
    });
  });
  it("离线底图哈希与登记一致", () =>
    expect(
      createHash("sha256")
        .update(readFileSync("public/land.geojson"))
        .digest("hex"),
    ).toBe(source.sha256));
});
