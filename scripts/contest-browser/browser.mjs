import { chromium } from "playwright";
import { startPreview } from "./server.mjs";
import { mkdir } from "node:fs/promises";
const artifacts =
  process.env.CONTEST_BROWSER_ARTIFACTS || "/tmp/contest-mode-browser";
await mkdir(artifacts, { recursive: true });
const server = await startPreview();
import assert from "node:assert/strict";
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => { errors.push(e.message); console.error("Browser error:",e.message); });
  await page.goto("http://127.0.0.1:4178/teacher/problems/new");
  await page.getByLabel("Tên bài", { exact: true }).fill("Tổng ba số");
  assert.equal(
    await page.getByLabel("Slug", { exact: true }).inputValue(),
    "tong-ba-so",
  );
  await page
    .getByLabel("Đề bài", { exact: true })
    .fill("Tính tổng ba số nguyên.");
  await page.getByLabel("Dữ liệu vào", { exact: true }).fill("Ba số nguyên.");
  await page.getByLabel("Dữ liệu ra", { exact: true }).fill("Tổng ba số.");
  await page
    .getByRole("button", { name: "+ Thêm Sample", exact: true })
    .click();
  assert.equal(
    await page.getByRole("button", { name: /Xóa Sample/ }).count(),
    2,
  );
  await page.getByRole("button", { name: "Xóa Sample 2", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Thêm Hidden test", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xóa Hidden test 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByLabel("Tôi đã kiểm tra preview").check();
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await page.waitForURL("**/teacher/problems");
  await page
    .getByRole("heading", { name: "Tổng ba số", exact: true })
    .waitFor();
  console.log("PASS visual authoring + sample/hidden controls + preview/save");
  await page.goto("http://127.0.0.1:4178/teacher/problems/new");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải mẫu JSON" }).click();
  const download = await downloadPromise;
  await download.saveAs(`${artifacts}/template.json`);
  await page
    .getByLabel("Import bài từ JSON")
    .setInputFiles(`${artifacts}/template.json`);
  await page.getByRole("heading", { name: "Preview học sinh" }).waitFor();
  assert.equal(await page.getByLabel("Trạng thái").inputValue(), "false");
  assert.equal(
    await page.getByLabel("Tôi đã kiểm tra preview").isChecked(),
    false,
  );
  await page.getByLabel("Tôi đã kiểm tra preview").check();
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await page.waitForURL("**/teacher/problems");
  console.log(
    "PASS download JSON template + import draft + explicit preview/save",
  );
  await page.goto("http://127.0.0.1:4178/teacher/contests/new");
  await page.getByLabel("Tên contest", { exact: true }).fill("Browser Contest");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "+ Thêm bài", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page
      .locator(".contest-picker select")
      .nth(i)
      .selectOption(`p${i + 1}`);
  await page.getByLabel("Điểm", { exact: true }).nth(1).fill("150");
  await page.getByRole("button", { name: "↑", exact: true }).nth(2).click();
  assert.equal(
    await page.locator(".contest-picker select").nth(1).inputValue(),
    "p3",
  );
  await page.getByLabel("Trạng thái").selectOption("published");
  await page.getByRole("button", { name: "Lưu contest", exact: true }).click();
  await page.waitForURL("**/teacher/contests");
  await page
    .getByRole("heading", { name: "Browser Contest", exact: true })
    .waitFor();
  console.log("PASS contest builder A/B/C + reorder + points + publish");
  await page.evaluate(() => localStorage.setItem("test-role", "student"));
  const studentResponses = [];
  page.on("response", async (r) => {
    if (r.url().endsWith("/api/mock")) studentResponses.push(await r.text());
  });
  await page.goto("http://127.0.0.1:4178/contests");
  await page
    .getByRole("link", { name: "Demo HSG running", exact: true })
    .click();
  await page.getByRole("link", { name: "A · Bài p1", exact: true }).click();
  await page.locator(".monaco-editor textarea").first().waitFor();
  await page.locator(".monaco-editor textarea").first().click({ force: true });
  await page.keyboard.press("Control+a");
  await page.keyboard.type("// WA");
  await page.getByRole("button", { name: "▷ Run", exact: true }).click();
  await page.getByRole("heading", { name: "Accepted", exact: true }).waitFor();
  await page.getByRole("button", { name: "Submit ↑", exact: true }).click();
  await page.getByText("Điểm lần nộp: 0/100", { exact: false }).waitFor();
  await page.locator(".monaco-editor textarea").first().click({ force: true });
  await page.keyboard.press("Control+a");
  await page.keyboard.type("// AC");
  await page.getByRole("button", { name: "Submit ↑", exact: true }).click();
  await page.getByText("Điểm lần nộp: 100/100", { exact: false }).waitFor();
  assert.equal(await page.getByText("AI Tutor", { exact: false }).count(), 0);
  await page.screenshot({
    path: `${artifacts}/workspace-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Bài thi & lịch sử", exact: true })
    .click();
  await page.getByText("Student demo", { exact: true }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 6);
  await page.getByRole("link", { name: "Leaderboard", exact: true }).click();
  await page.getByText("AC · 100 / 100", { exact: true }).waitFor();
  assert.ok(
    studentResponses.every(
      (text) =>
        !text.includes("hiddenTests") && !text.includes("problemSecrets"),
    ),
  );
  console.log(
    "PASS student list/workspace Monaco + Run + WA/AC + history + leaderboard + no secret fields/AI",
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/teacher/problems/new",
      "/teacher/contests/new",
      "/contest/running",
      "/contest/running/scoreboard",
      "/contest/running/problem/p1",
    ]) {
      await page.evaluate(
        (teacher) =>
          localStorage.setItem("test-role", teacher ? "teacher" : "student"),
        route.startsWith("/teacher/"),
      );
      await page.goto(`http://127.0.0.1:4178${route}`);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${route} overflows at ${width}`);
    }
    console.log(`PASS responsive ${width}px`);
  }
  await page.screenshot({
    path: `${artifacts}/workspace-mobile.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log("PASS no browser runtime errors");
} finally {
  await browser?.close();
  await server.close();
}
