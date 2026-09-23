import { expect, test } from "@playwright/test";

const pages = [
  ["/", "飯塚で理想のリフォーム＆"],
  ["/search", "検索結果"],
  ["/contact", "お問い合わせ"],
  ["/cases/1", "キッチンを中心にしたリノベーション"],
  ["/login", "ログイン"],
  ["/signup", "新規登録"],
  ["/mypage", "飯塚でリノベーションを探す"],
  ["/mypage/favorites", "お気に入り"],
  ["/company", "リノベーションを通して、住む人すべてを豊かに。"],
  ["/company/profile/edit", "企業情報の編集"],
  ["/company/cases/new", "施工事例の編集"],
  ["/companies/1", "株式会社リビングデザイン"],
] as const;

for (const [path, heading] of pages) {
  test(path + " を表示できる", async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
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

test("お気に入り状態を画面上で切り替えられる", async ({ page }) => {
  await page.goto("/cases/1", { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "お気に入りに追加" });
  await button.click();
  await expect(page.getByRole("button", { name: "お気に入りから削除" })).toHaveAttribute("aria-pressed", "true");
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

test("お問い合わせページは共通ヘッダーだけを使い、サイドバーを表示しない", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
  await expect(page.locator("aside.sidebar")).toHaveCount(0);
});

test("ダッシュボードのサイドバーには固有の操作だけを表示する", async ({ page }) => {
  await page.goto("/company", { waitUntil: "domcontentloaded" });

  const sidebar = page.getByRole("complementary", { name: "企業メニュー" });
  await expect(sidebar.getByRole("link", { name: "ダッシュボード" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "企業情報の編集" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "施工事例の追加" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "問い合わせ" })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "飯塚のリノベ" })).toHaveCount(0);
});

test("Google OAuthボタンに公式Gロゴを表示する", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const googleButton = page.getByRole("button", { name: "Googleで続ける" });
  await expect(googleButton.locator('img[src="/google-g-logo.png"]')).toBeVisible();
});
