import { http, HttpResponse, delay } from "msw";
import { setupWorker } from "msw/browser";
import { capabilities, makeMap, makeCell, explain } from "./model";
import type { KnowledgeRequest } from "./model";
let failed = false;
const parameters = (url: string) => {
  const s = new URL(url).searchParams;
  return [s.get("date") ?? "", s.get("layer_id") ?? ""] as const;
};
export const worker = setupWorker(
  http.get("/api/v1/capabilities", () => HttpResponse.json(capabilities)),
  http.get("/api/v1/map", async ({ request }) => {
    const [date, layer] = parameters(request.url);
    const scenario = new URLSearchParams(location.search).get("scenario");
    await delay(scenario === "race" && date === "2026-06-15" ? 800 : 90);
    try {
      const data = makeMap(date, layer);
      if (scenario === "error" && !failed) {
        failed = true;
        return HttpResponse.json(
          { message: "模拟服务暂时不可用" },
          { status: 503 },
        );
      }
      if (scenario === "empty" || scenario === "not_ready") {
        data.status = scenario;
        data.values = [];
        data.centers = [];
        data.message =
          scenario === "empty" ? "当前日期没有结果" : "该图层尚未就绪";
      }
      return HttpResponse.json(data);
    } catch {
      return HttpResponse.json(
        { message: "日期或图层不受支持" },
        { status: 422 },
      );
    }
  }),
  http.get("/api/v1/cells/:id", async ({ params, request }) => {
    await delay(40);
    try {
      return HttpResponse.json(
        makeCell(String(params.id), ...parameters(request.url)),
      );
    } catch {
      return HttpResponse.json(
        { message: "网格查询参数无效" },
        { status: 422 },
      );
    }
  }),
  http.post("/api/v1/knowledge/query", async ({ request }) => {
    try {
      const body = (await request.json()) as KnowledgeRequest;
      if (
        typeof body.question !== "string" ||
        !body.question.trim() ||
        body.question.length > 1000 ||
        !body.context ||
        !capabilities.dates.includes(body.context.date) ||
        !capabilities.layers.some((l) => l.id === body.context.layer_id)
      )
        throw Error();
      await delay(150);
      return HttpResponse.json(explain(body));
    } catch {
      return HttpResponse.json(
        { message: "问题或上下文参数无效" },
        { status: 422 },
      );
    }
  }),
);
