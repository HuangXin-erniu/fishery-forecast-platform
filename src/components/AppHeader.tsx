import type { Capabilities } from "../model";

export default function AppHeader({
  caps,
  date,
  onDateChange,
}: {
  caps: Capabilities | null;
  date: string;
  onDateChange: (value: string) => void;
}) {
  return (
    <header>
      <div className="brand-icon">渔</div>
      <div className="brand">
        <b>
          近海渔情预报平台 <span>渔情研究工作台</span>
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
            onChange={(e) => onDateChange(e.target.value)}
          >
            {caps?.dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <span className="time-info">UTC · 固定演示日期</span>
      </div>
    </header>
  );
}
