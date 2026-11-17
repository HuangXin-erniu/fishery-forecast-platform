import { fromLonLat } from "ol/proj.js";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("离线地图、查询、点选、知识与导出", async ({ page }, info) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "渔场概率", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
  await expect(page.locator(".map canvas").first()).toBeVisible();
  await page.getByLabel("有效日期").selectOption("2026-06-16");
  await page.getByRole("button", { name: "▤ 捕捞努力量" }).click();
  await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
  const box = await page.getByTestId("map").boundingBox();
  await page
    .getByTestId("map")
    .click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(page.getByTestId("cell-detail")).toBeVisible();
  const api = await page.evaluate(async () => {
    const m = await fetch("/api/v1/map?date=2026-06-16&layer_id=effort").then(
      (r) => r.json(),
    );
    const id = document.querySelector(".cell-title")!.firstChild!.textContent!;
    const c = await fetch(
      `/api/v1/cells/${id}?date=2026-06-16&layer_id=effort`,
    ).then((r) => r.json());
    return { m, c };
  });
  await expect(page.getByTestId("cell-value")).toContainText(
    String(api.c.value),
  );
  await expect(page.locator(".legend")).toContainText(api.m.layer.unit);
  await page.getByRole("button", { name: "✦ 解释当前结果" }).click();
  await expect(page.getByTestId("answer")).toContainText("2026-06-16");
  await expect(page.getByTestId("answer")).toContainText(api.c.id);
  await expect(page.getByTestId("answer")).toContainText("示例来源");
  await page.getByLabel("渔情问题").fill("明天去哪里捕鱼");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.getByTestId("answer")).toContainText(
    "尚未连接真实知识服务",
  );
  for (const [button, ext] of [
    ["↓ 数据 CSV", "csv"],
    ["↓ 来源 JSON", "json"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: button, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain(`2026-06-16-effort.${ext}`);
    const path = await download.path();
    const text = readFileSync(path!, "utf8");
    expect(text).toContain("mock");
    if (ext === "json")
      expect(JSON.parse(text).query).toEqual({
        date: "2026-06-16",
        layer_id: "effort",
      });
    else expect(text.split("\r\n")).toHaveLength(4001);
  }
  // Browser goes offline after loading static assets; the service worker still serves API calls.
  await page.context().setOffline(true);
  await page.getByLabel("有效日期").selectOption("2026-06-17");
  await page.getByRole("button", { name: "≈ 海表温度" }).click();
  await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "海表温度", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".legend")).toContainText("°C");
  await page.getByRole("button", { name: "✦ 解释当前结果" }).click();
  await expect(page.getByTestId("answer")).toContainText("2026-06-17");
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "⌖ 恢复研究区" }).click();
  await page.screenshot({
    path: info.outputPath("workbench.png"),
    fullPage: true,
  });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  ).toEqual(info.project.use.viewport);
});
for (const scenario of ["empty", "not_ready", "error"])
  test(`状态 ${scenario}`, async ({ page }) => {
    await page.goto("/?scenario=" + scenario);
    if (scenario === "error") {
      await expect(page.getByRole("alert")).toContainText("503");
      await page.getByRole("button", { name: "重试", exact: true }).click();
      await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
      await expect(page.getByRole("alert")).toBeHidden();
      await expect(
        page.getByRole("button", { name: "↓ 数据 CSV", exact: true }),
      ).toBeEnabled();
    } else {
      await expect(page.getByRole("status")).toContainText(
        scenario === "empty" ? "暂无结果" : "尚未就绪",
      );
      await expect(
        page.getByRole("button", { name: "↓ 数据 CSV", exact: true }),
      ).toBeDisabled();
    }
  });
test("快速切换日期不展示过期响应，零和缺测在界面可区分", async ({ page }) => {
  await page.goto("/?scenario=race");
  await page.getByLabel("有效日期").selectOption("2026-06-17");
  await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
  await page.waitForTimeout(1000);
  await expect(page.locator(".times")).toContainText("2026-06-17");
  const values = await page.evaluate(async () =>
    Promise.all(
      ["r0c0", "r0c1"].map((id) =>
        fetch(`/api/v1/cells/${id}?date=2026-06-17&layer_id=probability`).then(
          (r) => r.json(),
        ),
      ),
    ),
  );
  expect(values[0].value).toBe(0);
  expect(values[1].value).toBeNull();
});

test("地图点选显示有效零与缺测", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("正在加载模拟图层…")).toBeHidden();
  await expect(page.locator(".map canvas").first()).toBeVisible();
  const box = (await page.getByTestId("map").boundingBox())!;
  const sw = fromLonLat([108, 20]),
    ne = fromLonLat([118, 24]);
  const res = Math.max(
    (ne[0] - sw[0]) / (box.width - 90),
    (ne[1] - sw[1]) / (box.height - 110),
  );
  for (const [lon, text] of [
    [108.05, "0"],
    [108.15, "无数据"],
  ] as const) {
    const q = fromLonLat([lon, 20.05]);
    await page
      .getByTestId("map")
      .click({
        position: {
          x: box.width / 2 + (q[0] - (sw[0] + ne[0]) / 2) / res,
          y: box.height / 2 - (q[1] - (sw[1] + ne[1]) / 2) / res,
        },
      });
    await expect(page.getByTestId("cell-value")).toContainText(text);
  }
});
