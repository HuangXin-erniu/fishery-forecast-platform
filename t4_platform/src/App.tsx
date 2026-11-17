import { useEffect, useRef, useState } from "react";
import MapView from "./MapView";
import { api, download } from "./client";
import { csv, provenance } from "./model";
import type {
  Capabilities,
  MapResult,
  CellResult,
  KnowledgeResult,
} from "./model";
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
  return (
    <div className="app">
      <header>
        <div className="brand-icon">M</div>
        <div className="brand">
          <b>
            MERMAN <span>渔情研究工作台</span>
          </b>
          <small>课题四 · 数据、模型与知识集成</small>
        </div>
        <span className="demo-badge">● 模拟演示</span>
        <div className="query">
          <label>
            有效日期{" "}
            <select
              aria-label="有效日期"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {caps?.dates.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <span className="time-info">UTC · 固定演示日期</span>
        </div>
      </header>
      <div className="notice">
        本页面使用可复现的模拟数据。P01 / P02 / P03
        尚未接入，结果仅用于界面与接口验证。
      </div>
      <main>
        <aside className="layers-panel">
          <div className="section-kicker">WORKSPACE / 01</div>
          <h2>图层与来源</h2>
          <p className="muted">选择一个变量，探索空间分布</p>
          <nav>
            {caps?.layers.map((l, i) => (
              <button
                className={"layer-button " + (layer === l.id ? "active" : "")}
                key={l.id}
                onClick={() => setLayer(l.id)}
              >
                <span className="layer-symbol">{["◈", "▤", "≈"][i]}</span>
                <span>
                  <b>{l.name}</b>
                  <small>{l.source}</small>
                </span>
                <span className="radio">{layer === l.id ? "●" : "○"}</span>
              </button>
            ))}
          </nav>
          <label className="toggle">
            <input
              type="checkbox"
              checked={centers}
              onChange={(e) => setCenters(e.target.checked)}
            />
            叠加中心渔场
          </label>
          <div className="separator" />
          <h3>真实服务接入</h3>
          {caps?.upstreams.map((u) => (
            <div className="upstream" key={u.name}>
              <span>{u.name}</span>
              <span className="status-dot">{u.status}</span>
            </div>
          ))}
          <div className="scope-card">
            <b>研究范围</b>
            <p>近海研究窗口</p>
            <code>
              108–118°E
              <br />
              20–24°N
            </code>
            <small>
              演示网格 0.1° × 0.1°
              <br />
              不代表上游原生分辨率
            </small>
          </div>
        </aside>
        <section className="map-panel">
          <div className="map-heading">
            <div>
              <div className="section-kicker">SPATIAL EXPLORER</div>
              <h1>{active?.name ?? "渔情地图"}</h1>
            </div>
            <span className="subtle-badge">{date || "加载中"} · MOCK</span>
          </div>
          <div className="map-stage">
            <MapView
              data={data}
              centers={centers}
              onSelect={(id) => {
                if (ready) setCellId(id);
              }}
            />
            {loading && (
              <div className="map-overlay" role="status">
                正在加载模拟图层…
              </div>
            )}
            {error && (
              <div className="map-overlay error" role="alert">
                {error}
                <button onClick={() => setRetry((x) => x + 1)}>重试</button>
              </div>
            )}
            {data && !ready && (
              <div className="map-overlay" role="status">
                <b>{data.status === "empty" ? "暂无结果" : "尚未就绪"}</b>
                <p>{data.message}</p>
                <button onClick={() => setRetry((x) => x + 1)}>重试</button>
              </div>
            )}
          </div>
          <div className="legend">
            <span>{active?.unit}</span>
            <div className="legend-scale">
              <div className="gradient" />
              <div>
                <span>{active?.min}</span>
                <span>{active?.max}</span>
              </div>
            </div>
            <span>
              缺测 <i className="missing" />
            </span>
          </div>
          <div className="map-footer">
            <span>点击网格查看详情 · 缩放或拖动探索</span>
            <span>{data?.meta.version ?? "mock-0.1"}</span>
          </div>
        </section>
        <aside className="details-panel">
          <div className="detail-scroll">
            <div className="section-kicker">INSPECTOR / 02</div>
            <h2>网格详情</h2>
            {cellError && <p role="alert">{cellError}</p>}
            {cell ? (
              <div data-testid="cell-detail">
                <div className="cell-title">
                  {cell.id}
                  <span className="subtle-badge">模拟</span>
                </div>
                <div className="value" data-testid="cell-value">
                  {cell.value === null ? "无数据" : cell.value}
                  <small>{cell.unit}</small>
                </div>
                <dl>
                  <dt>经纬度</dt>
                  <dd>
                    {cell.lon.toFixed(3)}°E / {cell.lat.toFixed(3)}°N
                  </dd>
                  <dt>有效日期</dt>
                  <dd>{date}</dd>
                  <dt>来源</dt>
                  <dd>{cell.meta.source}</dd>
                  <dt>版本</dt>
                  <dd>{cell.meta.version}</dd>
                  <dt>可用状态</dt>
                  <dd>
                    {cell.value === null ? "缺测" : "模拟可用"} · 真实服务未接入
                  </dd>
                </dl>
                <h3>
                  聚合行为摘要 <small>模拟 · 次 / 日</small>
                </h3>
                <div className="behaviours">
                  {cell.behaviours.map((b) => (
                    <div key={b.name}>
                      <span>{b.name}</span>
                      <b>{b.count}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-cell">
                <span>⊞</span>
                <p>{cellId ? "正在加载网格…" : "在地图中选择一个网格"}</p>
                <small>查看数值、行为摘要和来源</small>
              </div>
            )}
            <div className="separator" />
            <h3>时间与渔汛</h3>
            <p className="small-text">
              {data?.season ?? "查询后显示模拟摘要。"}
            </p>
            {data && (
              <div className="times">
                起报：{data.meta.issued_at}
                <br />
                有效：{data.meta.valid_at}
              </div>
            )}
            <div className="separator" />
            <div className="knowledge-title">
              <h2>知识解释</h2>
              <span className="subtle-badge">未接入</span>
            </div>
            <p className="small-text muted">关联当前日期、图层及所选网格</p>
            <button
              className="example-question"
              disabled={!ready || asking}
              onClick={() => ask("解释当前结果")}
            >
              ✦ 解释当前结果
            </button>
            <button
              className="example-question"
              disabled={!ready || asking}
              onClick={() => ask("这些数据来自哪里？")}
            >
              这些数据来自哪里？
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <textarea
                aria-label="渔情问题"
                placeholder="输入与当前渔情相关的问题…"
                value={question}
                maxLength={1000}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                className="primary"
                disabled={!ready || asking || !question.trim()}
              >
                {asking ? "正在获取解释…" : "发送问题 ↗"}
              </button>
            </form>
            {knowledgeError && <p role="alert">{knowledgeError}</p>}
            {answer && (
              <div className="answer" data-testid="answer">
                <b>{answer.status === "example" ? "模拟回答" : "服务未接入"}</b>
                <p>{answer.answer}</p>
                <small>
                  上下文：{answer.context.date} / {answer.context.layer_id} /{" "}
                  {answer.context.cell_id ?? "研究区"}
                </small>
                {answer.sources.map((s) => (
                  <div className="source" key={s.title}>
                    ↗ {s.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="export">
            <button
              disabled={!ready}
              onClick={() =>
                data &&
                download(
                  `merman-mock-${date}-${layer}.csv`,
                  csv(data),
                  "text/csv;charset=utf-8",
                )
              }
            >
              ↓ 数据 CSV
            </button>
            <button
              disabled={!ready}
              onClick={() =>
                data &&
                download(
                  `merman-mock-${date}-${layer}.json`,
                  JSON.stringify(provenance(data), null, 2),
                  "application/json",
                )
              }
            >
              ↓ 来源 JSON
            </button>
          </div>
        </aside>
      </main>
      <footer>
        MER­MAN / P04
        <span>非商业科研原型 · 本地 Mock 演示 · 无真实业务服务</span>
      </footer>
    </div>
  );
}
