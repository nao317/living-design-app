import { expect, test } from "@playwright/test";

const pages = [
  ["/", "飯塚で理想のリフォーム＆"],
  ["/search", "検索結果"],
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
