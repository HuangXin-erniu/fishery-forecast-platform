import type { CellResult, KnowledgeResult, MapResult } from "../model";

export default function DetailsPanel({
  date,
  cell,
  cellId,
  cellError,
  data,
  answer,
  question,
  asking,
  knowledgeError,
  ready,
  onQuestionChange,
  onAsk,
  onExport,
}: {
  date: string;
  cell: CellResult | null;
  cellId: string | null;
  cellError: string;
  data: MapResult | null;
  answer: KnowledgeResult | null;
  question: string;
  asking: boolean;
  knowledgeError: string;
  ready: boolean;
  onQuestionChange: (value: string) => void;
  onAsk: (text: string) => void;
  onExport: (kind: "csv" | "json") => void;
}) {
  return (
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
          onClick={() => onAsk("解释当前结果")}
        >
          ✦ 解释当前结果
        </button>
        <button
          className="example-question"
          disabled={!ready || asking}
          onClick={() => onAsk("这些数据来自哪里？")}
        >
          这些数据来自哪里？
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAsk(question);
          }}
        >
          <textarea
            aria-label="渔情问题"
            placeholder="输入与当前渔情相关的问题…"
            value={question}
            maxLength={1000}
            onChange={(e) => onQuestionChange(e.target.value)}
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
        <button disabled={!ready} onClick={() => onExport("csv")}>
          ↓ 数据 CSV
        </button>
        <button disabled={!ready} onClick={() => onExport("json")}>
          ↓ 来源 JSON
        </button>
      </div>
    </aside>
  );
}
