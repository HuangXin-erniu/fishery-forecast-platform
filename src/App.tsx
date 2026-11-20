import { useEffect, useRef, useState } from "react";
import { api, download } from "./client";
import { csv, provenance } from "./model";
import type {
  Capabilities,
  MapResult,
  CellResult,
  KnowledgeResult,
} from "./model";
import AppHeader from "./components/AppHeader";
import LayerPanel from "./components/LayerPanel";
import MapPanel from "./components/MapPanel";
import DetailsPanel from "./components/DetailsPanel";
import AppFooter from "./components/AppFooter";

export default function App() {
  const [caps, setCaps] = useState<Capabilities | null>(null),
    [date, setDate] = useState(""),
    [layer, setLayer] = useState("probability"),
    [data, setData] = useState<MapResult | null>(null),
    [cellId, setCellId] = useState<string | null>(null),
    [cell, setCell] = useState<CellResult | null>(null),
    [answer, setAnswer] = useState<KnowledgeResult | null>(null),
    [question, setQuestion] = useState(""),
    [error, setError] = useState(""),
    [cellError, setCellError] = useState(""),
    [knowledgeError, setKnowledgeError] = useState(""),
    [loading, setLoading] = useState(false),
    [asking, setAsking] = useState(false),
    [retry, setRetry] = useState(0),
    [centers, setCenters] = useState(true);
  const queryGeneration = useRef(0),
    knowledgeAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    api<Capabilities>("/capabilities", ctrl.signal)
      .then((c) => {
        setCaps(c);
        setDate(c.dates[0]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [retry]);
  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    queryGeneration.current++;
    knowledgeAbort.current?.abort();
    setAsking(false);
    setData(null);
    setCellId(null);
    setCell(null);
    setAnswer(null);
    setKnowledgeError("");
    setError("");
    setLoading(true);
    api<MapResult>(`/map?date=${date}&layer_id=${layer}`, ctrl.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [date, layer, retry]);
  useEffect(() => {
    setCell(null);
    setCellError("");
    setAnswer(null);
    queryGeneration.current++;
    knowledgeAbort.current?.abort();
    setAsking(false);
    if (!cellId || !data || data.status !== "ready") return;
    const ctrl = new AbortController();
    api<CellResult>(
      `/cells/${cellId}?date=${date}&layer_id=${layer}`,
      ctrl.signal,
    )
      .then(setCell)
      .catch((e) => {
        if (e.name !== "AbortError") setCellError(e.message);
      });
    return () => ctrl.abort();
  }, [cellId, date, layer, data]);
  useEffect(() => () => knowledgeAbort.current?.abort(), []);
  async function ask(text: string) {
    if (!date || !text.trim()) return;
    knowledgeAbort.current?.abort();
    const ctrl = new AbortController();
    knowledgeAbort.current = ctrl;
    const generation = queryGeneration.current;
    setAsking(true);
    setAnswer(null);
    setKnowledgeError("");
    try {
      const result = await api<KnowledgeResult>(
        "/knowledge/query",
        ctrl.signal,
        { question: text, context: { date, layer_id: layer, cell_id: cellId } },
      );
      if (generation === queryGeneration.current) setAnswer(result);
    } catch (e) {
      if (!ctrl.signal.aborted)
        setKnowledgeError(e instanceof Error ? e.message : "知识请求失败");
    } finally {
      if (!ctrl.signal.aborted) setAsking(false);
    }
  }
  const active = caps?.layers.find((l) => l.id === layer);
  const ready = data?.status === "ready";
  function exportData(kind: "csv" | "json") {
    if (!data) return;
    if (kind === "csv") {
      download(
        `fishery-forecast-mock-${date}-${layer}.csv`,
        csv(data),
        "text/csv;charset=utf-8",
      );
    } else {
      download(
        `fishery-forecast-mock-${date}-${layer}.json`,
        JSON.stringify(provenance(data), null, 2),
        "application/json",
      );
    }
  }
  return (
    <div className="app">
      <AppHeader caps={caps} date={date} onDateChange={setDate} />
      <div className="notice">
        本页面使用可复现的模拟数据。P01 / P02 / P03
        尚未接入，结果仅用于界面与接口验证。
      </div>
      <main>
        <LayerPanel
          caps={caps}
          layer={layer}
          onLayerChange={setLayer}
          centers={centers}
          onCentersChange={setCenters}
        />
        <MapPanel
          data={data}
          centers={centers}
          loading={loading}
          error={error}
          ready={ready}
          active={active}
          date={date}
          onRetry={() => setRetry((x) => x + 1)}
          onSelect={(id) => {
            if (ready) setCellId(id);
          }}
        />
        <DetailsPanel
          date={date}
          cell={cell}
          cellId={cellId}
          cellError={cellError}
          data={data}
          answer={answer}
          question={question}
          asking={asking}
          knowledgeError={knowledgeError}
          ready={ready}
          onQuestionChange={setQuestion}
          onAsk={ask}
          onExport={exportData}
        />
      </main>
      <AppFooter />
    </div>
  );
}
