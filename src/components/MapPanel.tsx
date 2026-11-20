import MapView from "../MapView";
import type { Layer, MapResult } from "../model";

export default function MapPanel({
  data,
  centers,
  loading,
  error,
  ready,
  active,
  date,
  onRetry,
  onSelect,
}: {
  data: MapResult | null;
  centers: boolean;
  loading: boolean;
  error: string;
  ready: boolean;
  active: Layer | undefined;
  date: string;
  onRetry: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="map-panel">
      <div className="map-heading">
        <div>
          <div className="section-kicker">SPATIAL EXPLORER</div>
          <h1>{active?.name ?? "渔情地图"}</h1>
        </div>
        <span className="subtle-badge">{date || "加载中"} · MOCK</span>
      </div>
      <div className="map-stage">
        <MapView data={data} centers={centers} onSelect={onSelect} />
        {loading && (
          <div className="map-overlay" role="status">
            正在加载模拟图层…
          </div>
        )}
        {error && (
          <div className="map-overlay error" role="alert">
            {error}
            <button onClick={onRetry}>重试</button>
          </div>
        )}
        {data && !ready && (
          <div className="map-overlay" role="status">
            <b>{data.status === "empty" ? "暂无结果" : "尚未就绪"}</b>
            <p>{data.message}</p>
            <button onClick={onRetry}>重试</button>
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
  );
}
