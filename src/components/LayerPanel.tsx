import type { Capabilities } from "../model";

export default function LayerPanel({
  caps,
  layer,
  onLayerChange,
  centers,
  onCentersChange,
}: {
  caps: Capabilities | null;
  layer: string;
  onLayerChange: (value: string) => void;
  centers: boolean;
  onCentersChange: (value: boolean) => void;
}) {
  return (
    <aside className="layers-panel">
      <div className="section-kicker">WORKSPACE / 01</div>
      <h2>图层与来源</h2>
      <p className="muted">选择一个变量，探索空间分布</p>
      <nav>
        {caps?.layers.map((l, i) => (
          <button
            className={"layer-button " + (layer === l.id ? "active" : "")}
            key={l.id}
            onClick={() => onLayerChange(l.id)}
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
          onChange={(e) => onCentersChange(e.target.checked)}
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
  );
}
