import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import { worker } from "./mocks";
worker
  .start({ onUnhandledFrame: "bypass" })
  .then(() => createRoot(document.getElementById("root")!).render(<App />))
  .catch(() => {
    document.getElementById("root")!.textContent =
      "模拟服务初始化失败，请刷新页面重试。";
  });
