import { test, mockApi, signIn } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * 表示確認用のスクリーンショットを e2e/screenshots/ に書き出す。
 * 比較や合否判定はしない（目視確認用）。`npm run e2e:shots` で実行する。
 */

const shot = (name: string, project: string) => `e2e/screenshots/${project}/${name}.png`;

/** 一覧表示の案内モーダルが出ていたら閉じる。 */
async function dismissGuide(page: Page) {
  const close = page.getByRole("button", { name: "閉じる" });
  await close.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  if (await close.isVisible()) {
    await close.click();
    await close.waitFor({ state: "hidden" });
  }
}

test.describe("@screenshot", () => {
  const pages = [
    { path: "/", name: "01-top" },
    { path: "/login", name: "02-login" },
    { path: "/s/demo", name: "03-setlist" },
  ];

  for (const { path, name } of pages) {
    test(name, async ({ page }, testInfo) => {
      await mockApi(page, { trackCount: 20 });
      await page.goto(path);
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot(name, testInfo.project.name), fullPage: true });
    });
  }

  // 一覧表示は「1画面に収まっているか」を見たいので、画面に映る範囲だけを撮る。
  test("04-setlist-list-view", async ({ page }, testInfo) => {
    await mockApi(page, { trackCount: 20 });
    await page.goto("/s/demo?view=list");
    await dismissGuide(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot("04-setlist-list-view", testInfo.project.name) });
  });

  test("05-dashboard", async ({ page }, testInfo) => {
    await signIn(page, { admin: true });
    await page.goto("/dashboard");
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot("05-dashboard", testInfo.project.name), fullPage: true });
  });
});
