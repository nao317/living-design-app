import { expect, test } from "@playwright/test";

const pages = [
  ["/", "飯塚で理想のリフォーム＆"],
  ["/search", "検索結果"],
  ["/companies", "企業を探す"],
  ["/contact", "お問い合わせ"],
  ["/login", "ログイン"],
  ["/signup", "新規登録"],
] as const;

const protectedPages = [
  "/mypage",
  "/mypage/favorites",
  "/company/apply",
  "/company",
  "/company/profile/edit",
  "/company/cases/new",
  "/admin",
] as const;

for (const [path, heading] of pages) {
  test(path + " を表示できる", async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  });
}

for (const path of protectedPages) {
  test(path + " は未認証でログインへ誘導する", async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });
}

test("指示にない英語見出しとキャッチコピーを表示しない", async ({ page }) => {
  const forbidden = [
    "IIZUKA RENOVATION GUIDE",
    "FIND YOUR STYLE",
    "FEATURED CASES",
    "START YOUR RENOVATION",
    "WELCOME",
    "YOUR RENOVATION",
    "MY DASHBOARD",
    "RENOVATION COMPANY",
    "飯塚で叶える、わたしらしい住まい。",
    "理想の住まいづくりを、ここから。",
  ];

  for (const [path] of pages) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    for (const copy of forbidden) {
      await expect(page.getByText(copy, { exact: false })).toHaveCount(0);
    }
  }
});

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(viewport.name + "で横方向にはみ出さない", async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const [path] of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path + " has horizontal overflow").toBeLessThanOrEqual(1);
    }
  });
}

test("スマホではメニューが左、ブランドが右にあり、メニューを開ける", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  const brand = page.getByRole("link", { name: "飯塚のリノベ ホーム" });
  const menuBox = await menuButton.boundingBox();
  const brandBox = await brand.boundingBox();

  expect(menuBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(menuBox!.x).toBeLessThan(brandBox!.x);

  await menuButton.click();
  await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
  await expect(page.getByRole("link", { name: "施工事例を探す" })).toBeVisible();
  await expect(page.getByRole("button", { name: "メニューを閉じる" })).toHaveAttribute("aria-expanded", "true");
});

test("ヘッダーはスクロールしても画面上部に残る", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 600));

  const headerBox = await page.locator("header.site-header").boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.y).toBeLessThanOrEqual(1);
});

test("お問い合わせページは共通ヘッダーだけを使い、サイドバーを表示しない", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
  await expect(page.locator("aside.sidebar")).toHaveCount(0);
});

test("企業を探すリンクは企業一覧へ遷移する", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "企業を探す" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByRole("heading", { name: "企業を探す" })).toBeVisible();
});

test("未認証では企業ダッシュボードからログインへ誘導する", async ({ page }) => {
  await page.goto("/company", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?redirectTo=/);
});

test("Google OAuthボタンに公式Gロゴを表示する", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const googleButton = page.getByRole("button", { name: "Googleで続ける" });
  await expect(googleButton.locator('img[src="/google-g-logo.png"]')).toBeVisible();
});
