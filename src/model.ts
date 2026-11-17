import type { components } from "./api-types";
export type Layer = components["schemas"]["Layer"];
export type MapResult = components["schemas"]["MapResult"];
export type CellResult = components["schemas"]["CellResult"];
export type Capabilities = components["schemas"]["Capabilities"];
export type KnowledgeRequest = components["schemas"]["KnowledgeRequest"];
export type KnowledgeResult = components["schemas"]["KnowledgeResult"];
export const dates = ["2026-06-15", "2026-06-16", "2026-06-17"];
export const layers: Layer[] = [
  {
    id: "probability",
    name: "渔场概率",
    unit: "概率（0–1）",
    source: "P02 模拟预报",
    version: "mock-0.1",
    min: 0,
    max: 1,
  },
  {
    id: "effort",
    name: "捕捞努力量",
    unit: "小时 / 网格 / 日",
    source: "P01 模拟行为",
    version: "mock-0.1",
    min: 0,
    max: 100,
  },
  {
    id: "sst",
    name: "海表温度",
    unit: "°C",
    source: "模拟环境背景",
    version: "mock-0.1",
    min: 24,
    max: 32,
  },
];
export const capabilities: Capabilities = {
  dates,
  layers,
  bbox: [108, 20, 118, 24],
  mode: "mock",
  upstreams: ["P01 行为分析", "P02 渔情预报", "P03 知识库"].map((name) => ({
    name,
    status: "未接入",
  })),
};
export function makeMap(date: string, layerId: string): MapResult {
  const layer = layers.find((l) => l.id === layerId);
  if (!layer || !dates.includes(date)) throw Error("日期或图层不受支持");
  const day = dates.indexOf(date);
  const values = Array.from({ length: 4000 }, (_, i) => {
    const r = Math.floor(i / 100),
      c = i % 100;
    if (i === 1 || ((r * 7 + c * 11) % 97 === 0 && i !== 0)) return null;
    if (i === 0) return 0;
    const x = (c - 45 - day * 7) / 23,
      y = (r - 19) / 13;
    const p = Math.max(
      0,
      Math.min(1, Math.exp(-(x * x + y * y)) * 0.85 + 0.05 * Math.sin(c / 7)),
    );
    return Number(
      (layerId === "sst"
        ? 26 + p * 5
        : layerId === "effort"
          ? p * 100
          : p
      ).toFixed(3),
    );
  });
  return {
    status: "ready",
    message: "固定模拟场，未连接真实数据或模型",
    date,
    layer,
    meta: {
      mode: "mock",
      source: layer.source,
      version: layer.version,
      issued_at: `${date}T00:00:00Z`,
      valid_at: `${date}T00:00:00Z`,
      upstream_status: "not_connected",
    },
    grid: {
      origin: [108, 20],
      step: 0.1,
      rows: 40,
      cols: 100,
      order: "south-to-north-row-major",
      crs: "EPSG:4326",
    },
    values,
    centers: [{ lon: 112.55 + day * 0.7, lat: 21.95, label: "模拟中心渔场" }],
    season: "模拟渔汛摘要：当前窗口为演示场景，不构成实际汛期判断。",
  };
}
export function cellAt(lon: number, lat: number) {
  const c = Math.floor((lon - 108) / 0.1),
    r = Math.floor((lat - 20) / 0.1);
  return r >= 0 && r < 40 && c >= 0 && c < 100 ? `r${r}c${c}` : null;
}
export function makeCell(id: string, date: string, layer: string): CellResult {
  const m = /^r(\d+)c(\d+)$/.exec(id);
  if (!m) throw Error("网格编号无效");
  const r = Number(m[1]),
    c = Number(m[2]);
  if (r >= 40 || c >= 100) throw Error("网格超出研究区");
  const data = makeMap(date, layer);
  return {
    id,
    lon: 108 + (c + 0.5) * 0.1,
    lat: 20 + (r + 0.5) * 0.1,
    value: data.values[r * 100 + c],
    unit: data.layer.unit,
    meta: data.meta,
    behaviours: ["相遇", "徘徊", "挂靠", "AIS 中断"].map((name, i) => ({
      name,
      count: (r + c + i) % 6,
    })),
  };
}
export function explain(input: KnowledgeRequest): KnowledgeResult {
  const known = ["解释当前结果", "这些数据来自哪里？"].includes(
    input.question.trim(),
  );
  return {
    status: known ? "example" : "not_ready",
    mode: "mock",
    context: input.context,
    answer: known
      ? `当前为 ${input.context.date} 的${layers.find((l) => l.id === input.context.layer_id)?.name}模拟结果${input.context.cell_id ? "，选中 " + input.context.cell_id : ""}。颜色表示当前变量的相对分布；概率、努力量和海温含义不同。所有数值由固定演示规则生成，上游尚未接入，不能据此判断实际渔情。`
      : "尚未连接真实知识服务，当前问题不能获得真实知识回答。可使用示例问题体验上下文传递。",
    sources: known
      ? [{ title: "课题四 Mock 场景说明（示例来源）", kind: "example" }]
      : [],
  };
}
export function provenance(data: MapResult) {
  return {
    mode: "mock",
    query: { date: data.date, layer_id: data.layer.id },
    unit: data.layer.unit,
    grid: data.grid,
    meta: data.meta,
    status: data.status,
  };
}
export function csv(data: MapResult) {
  const rows = [
    "mode,date,layer_id,cell_id,longitude,latitude,value,unit,source,version",
  ];
  data.values.forEach((v, i) => {
    const r = Math.floor(i / data.grid.cols),
      c = i % data.grid.cols;
    rows.push(
      [
        "mock",
        data.date,
        data.layer.id,
        `r${r}c${c}`,
        (data.grid.origin[0] + (c + 0.5) * data.grid.step).toFixed(5),
        (data.grid.origin[1] + (r + 0.5) * data.grid.step).toFixed(5),
        v === null ? "" : v,
        data.layer.unit,
        data.meta.source,
        data.meta.version,
      ].join(","),
    );
  });
  return "\uFEFF" + rows.join("\r\n");
}
export function color(t: number) {
  return `rgba(${Math.round(229 - 209 * t)},${Math.round(243 - 92 * t)},${Math.round(241 - 102 * t)},0.84)`;
}
