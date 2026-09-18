import { test, expect, mockApi, signIn } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * スマホ表示・PC表示でレイアウトが壊れていないことを確認する。
 * プロジェクト（mobile-small / mobile / desktop）ごとに同じテストが走る。
 */

/** 横方向にはみ出している量（px）。0 なら横スクロールは発生しない。 */
function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

/** 縦方向にはみ出している量（px）。0 なら1画面に収まっている。 */
function verticalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollHeight - root.clientHeight;
  });
}

test.describe("横スクロールが発生しない", () => {
  const publicPages = [
    { path: "/", name: "トップ" },
    { path: "/login", name: "ログイン" },
    { path: "/signup", name: "新規登録" },
    { path: "/s/demo", name: "公開セットリスト" },
    { path: "/terms", name: "利用規約" },
  ];

  for (const { path, name } of publicPages) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "setnote" })).toBeVisible();

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test("ダッシュボード（管理者）", async ({ page }) => {
    await signIn(page, { admin: true });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("ヘッダー", () => {
  // メニューが最も多くなる管理者ログイン時が、いちばん崩れやすい。
  test("ロゴとメニューが重ならない", async ({ page }) => {
    await signIn(page, { admin: true });
    await page.goto("/dashboard");

    const brand = page.locator("header a", { has: page.getByRole("heading", { name: "setnote" }) });
    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: "管理" })).toBeVisible();

    const brandBox = (await brand.boundingBox())!;
    const navBox = (await nav.boundingBox())!;

    const overlapsHorizontally =
      brandBox.x < navBox.x + navBox.width && navBox.x < brandBox.x + brandBox.width;
    const overlapsVertically =
      brandBox.y < navBox.y + navBox.height && navBox.y < brandBox.y + brandBox.height;

    expect(overlapsHorizontally && overlapsVertically).toBe(false);
  });

  test("メニューが画面の外に出ない", async ({ page }) => {
    await signIn(page, { admin: true });
    await page.goto("/dashboard");
    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: "管理" })).toBeVisible();

    const navBox = (await nav.boundingBox())!;
    const width = page.viewportSize()!.width;

    expect(navBox.x).toBeGreaterThanOrEqual(0);
    expect(navBox.x + navBox.width).toBeLessThanOrEqual(width);
  });
});

test.describe("公開ページの一覧表示", () => {
  // スクリーンショットで全曲を見渡すための表示なので、スクロールが出たら用をなさない。
  test("20曲のセットが1画面に収まる", async ({ page }) => {
    await mockApi(page, { trackCount: 20 });
    await page.goto("/s/demo?view=list");
    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    expect(await verticalOverflow(page)).toBeLessThanOrEqual(0);
  });

  // 一覧表示はそのままスクリーンショットを撮るための表示なので、サイトの装飾は出さない。
  test("サイトのヘッダーとフッターを出さない", async ({ page }) => {
    await page.goto("/s/demo?view=list");
    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);
  });
});
