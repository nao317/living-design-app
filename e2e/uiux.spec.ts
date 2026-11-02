import { expect, test } from "@playwright/test";

test("クライアントデータの読込前に誤った空状態をSSRしない", async ({ request }) => {
  for (const [path, loadingText, falseEmptyText] of [
    ["/companies", "企業情報を読み込んでいます", "登録されている企業がありません"],
    ["/contact", "お問い合わせ先を読み込んでいます", "問い合わせ可能な企業が登録されていません"],
    ["/cases/00000000-0000-0000-0000-000000000000", "施工事例を読み込んでいます", "施工事例が見つかりません"],
  ]) {
    const response = await request.get(path);
    const body = await response.text();
    expect(body).toContain(loadingText);
    expect(body).not.toContain(falseEmptyText);
  }
});

test("公開画面にページタイトルと本文へのリンクがある", async ({ page }) => {
  for (const [path, title] of [["/companies", "企業を探す"], ["/contact", "お問い合わせ"], ["/login", "ログイン"], ["/signup", "新規登録"], ["/forgot-password", "パスワードの再設定"], ["/reset-password", "新しいパスワードを設定"]]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(new RegExp(title));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "本文へ移動" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  }
});

test("スマホの検索条件を開閉し、検索後は結果を先に表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "検索条件を指定" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect((await page.getByRole("heading", { name: "検索結果", exact: true }).boundingBox())!.y).toBeLessThan(250);
  await toggle.click();
  await page.getByRole("textbox", { name: "キーワード" }).fill("収納");
  await page.getByRole("button", { name: "検索する" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole("button", { name: /検索条件（1件指定）/ })).toHaveAttribute("aria-expanded", "false");
  await page.getByLabel("適用中の検索条件").getByRole("link", { name: "条件をクリア" }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test("モバイルメニューのフォーカスが背景へ移らずEscapeで閉じる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await expect(page.getByRole("navigation", { name: "メインメニュー" }).getByRole("link", { name: "施工事例を探す" })).toBeFocused();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press(index % 3 === 0 ? "Shift+Tab" : "Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest(".header-nav, .menu-button")))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "メニューを開く" })).toBeFocused();
  await expect(page.locator("#page-content")).not.toHaveAttribute("inert");
});

test("企業検索欄のフォーカスと動きを減らす設定に対応する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/companies", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox").focus();
  expect(await page.getByRole("textbox").evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  expect(await page.locator(".header-nav").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});

test("再設定メールの入力エラーを項目の横で案内する", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "パスワードを忘れた方" }).click();
  await page.getByRole("button", { name: "再設定メールを送る" }).click();
  await expect(page.getByRole("textbox", { name: "メールアドレス" })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "メールアドレス" })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveText("入力してください。");
});

test("検索0件の案内と企業宛てフォームの内容が正しい", async ({ page }) => {
  await page.goto("/companies?q=zzzz-no-match", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "条件に合う企業がありません" })).toBeVisible();
  await page.getByRole("link", { name: "条件をクリア" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByRole("textbox", { name: "企業名や所在地を検索" })).toHaveValue("");
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("option", { name: "会員登録・アカウントについて" })).toHaveCount(0);
  await expect(page.getByText("施工や見積もりのご相談を、選択した企業へ直接送信します。")).toBeVisible();
});

test("320px幅でも文字と操作が画面内に収まる", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const path of ["/", "/search", "/companies", "/contact", "/login", "/signup", "/forgot-password", "/reset-password"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(1);
  }
});
