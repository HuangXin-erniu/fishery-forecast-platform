# Merman Platform · 渔情研究工作台

集成渔情预报、捕捞努力量、海表温度和知识解释的电脑端地图原型。当前交付为**接口契约与 Mock 前端**：所有业务数据均为明确标注的模拟结果，尚未连接真实上游服务。

## 功能

- 离线自然地理底图、研究区浏览、日期与图层切换、网格点选。
- 模拟中心渔场、聚合行为摘要及渔汛说明。
- 携带地图上下文的模拟知识解释与自由提问入口。
- 当前图层 CSV 与来源 JSON 导出。
- OpenAPI 3.1 中文契约及生成的 TypeScript 类型。

## 仓库结构

本仓库是独立前端项目，所有 npm 命令在仓库根目录执行。仓库名及 npm 包名统一为 `merman-platform`。

```text
merman-platform/
├── src/                 页面、地图、HTTP 客户端和 Mock
├── public/              离线底图与 Mock Service Worker
├── configs/             OpenAPI 契约及底图来源
├── tests/               契约与浏览器测试
├── package.json
├── package-lock.json
├── source-manifest.json          来源提交及原始／当前文件哈希
└── README.md
```

## 本机运行

使用 Node.js 24（已验证 24.15.0）和 npm 11（已验证 11.12.1）：

```sh
git clone https://github.com/HuangXin-erniu/merman-platform.git
cd merman-platform
npm ci
npm run dev
```

浏览器打开 http://127.0.0.1:5173 ，Ctrl+C 停止。端口占用时启动失败。首次安装依赖需要网络；页面加载后的地图与 Mock 查询不依赖外网服务、密钥、后端或数据库。

## 验证

```sh
npm run generate
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

已验证 5 项单元／契约测试、12 项浏览器测试，覆盖 1280×800 和 1920×1080、查询与导出、断网、异常重试、请求竞态、零值及缺测显示。

## 接口与数据含义

契约见 [configs/openapi.json](configs/openapi.json)。接口位于 `/api/v1`：`capabilities`、`map`、`cells/{cell_id}`、`knowledge/query`。全部构建均为 Mock 原型，真实接入需要单独实现。

固定演示日期为 2026-06-15、16、17；研究区为 20–24°N、108–118°E。WGS84 经度在前；0.1° 演示网格自南向北逐行排列，原点为西南角，100 列 × 40 行。时间使用 UTC，模拟起报与有效时间相同。null 表示缺测，0 表示有效零；演示分辨率不代表真实上游原生分辨率。

知识回答与来源均标记为示例。任意问题提示真实知识服务尚未连接。开发验证可使用 `?scenario=empty`、`not_ready`、`error`、`race`；error 场景首次请求失败，重试后恢复。

## 底图与发布范围

Natural Earth 1:50m 陆地数据随前端离线提供，属于 public domain。来源、使用条款和 SHA256 见 [底图登记](configs/basemap-source.json)。

这是课题四的独立前端仓库，初始代码由课题四 Mock 原型导出，后续可在本仓库根目录独立开发、测试和版本管理。仓库仅包含前端原型及自然地理底图。公开文件已独立放置在仓库根目录，保留原有提交历史。来源记录中的 `source_files_sha256` 保留原始课题路径与哈希，`files_sha256` 记录当前仓库路径与哈希（不含来源记录自身）。来源提交与逐文件 SHA256 见 [source-manifest.json](source-manifest.json)。真实科研数据、模型、运行产物、AgentHub 状态以及课题一、二、三代码均未发布。源项目的权威仓库及集成流程保持独立。
