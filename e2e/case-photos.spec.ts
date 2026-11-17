import { expect, test } from "@playwright/test";

// Run with a test Supabase URL/key; every data request is fulfilled locally below.
test.skip(!process.env.VITE_SUPABASE_URL, "写真のE2Eにはテスト用Supabase設定が必要です。");

const companyId = "11111111-1111-4111-8111-111111111111";
const caseIds = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
const company = { id: companyId, name: "青空工務店", address: "飯塚市", logo_path: null, cover_image_path: null };
const cases = caseIds.map((id, index) => ({ id, company_id: companyId, title: `${index + 1} 階の台所とリビングを改修`, summary: "収納と断熱を改善しました。", area: "福岡県飯塚市", price_min: 1500000, price_max: 2500000, construction_period: "2か月", published_at: "2026-11-01", status: "PUBLISHED" }));
const images = caseIds.flatMap((case_id, index) => [
  { id: `${index}-cover`, case_id, storage_path: `${index}-cover.jpg`, display_order: 0, taken_on: null, description: "" },
  { id: `${index}-done`, case_id, storage_path: `${index}-done.jpg`, display_order: 1, taken_on: "2026-11-01", description: "キッチンの設置が完了しました。" },
  { id: `${index}-start`, case_id, storage_path: `${index}-start.jpg`, display_order: 2, taken_on: "2026-10-01", description: "工事を開始しました。" },
]);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/rest/v1/**", async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    const id = url.searchParams.get("id")?.replace("eq.", "");
    let data: unknown = [];
    if (table === "search_public_cases") data = { items: cases, total: cases.length };
    if (table === "companies") data = [company];
    if (table === "case_images") data = images;
    if (table === "construction_cases") data = id ? cases.find(item => item.id === id) : cases;
    await route.fulfill({ json: data, headers: { "content-range": "0-1/2" } });
  });
  await page.route("**/storage/v1/**", async route => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { signedURL: "/object/sign/case-images/test.jpg?token=test" } });
    } else {
      await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#99b3a4"/><rect x="100" y="80" width="400" height="450" fill="#d9e3d8"/><rect x="570" y="160" width="330" height="370" fill="#8d785d"/></svg>' });
    }
  });
});

for (const width of [1280, 390, 320]) {
  test(`${width}pxで一覧を2列にし、文字を画像に重ねる`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/search");
    const cards = page.locator('article[class*="case-list-item"]');
    await expect(cards).toHaveCount(2);
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first!.y).toBe(second!.y);
    expect(second!.x).toBeGreaterThan(first!.x);
    const card = cards.first();
    const image = await card.getByRole("img").boundingBox();
    const heading = await card.getByRole("heading").boundingBox();
    expect(image!.height).toBe(first!.height);
    expect(heading!.y).toBeGreaterThan(image!.y);
    expect(heading!.y + heading!.height).toBeLessThanOrEqual(image!.y + image!.height);
    expect(await card.getByRole("heading").evaluate(node => getComputedStyle(node).textShadow)).not.toBe("none");
    expect(await card.evaluate(node => getComputedStyle(node).borderRadius)).toBe("10px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/case-list-${width}.png`, fullPage: true });
  });
}

test("ホームのショーケースでも画像を枠いっぱいに使う", async ({ page }) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "参加企業の所在地" });
  await expect(map.getByRole("img")).toHaveAttribute("src", "/maps/iizuka-openstreetmap.png");
  await expect(map.getByRole("link", { name: "© OpenStreetMap contributors" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  const pin = map.getByRole("link", { name: "1：株式会社リビングデザインのホームページへ", exact: true });
  await expect(pin).toHaveAttribute("href", "https://living-d-f.com/");
  await expect(pin).toHaveText("1");
  const companyList = map.getByRole("list", { name: "参加企業一覧" });
  await expect(companyList.getByRole("link", { name: "1 リビングデザイン" })).toHaveAttribute("href", "https://living-d-f.com/");
  await expect(pin.locator("svg")).toHaveCSS("fill", "rgb(210, 56, 52)");
  const circle = await pin.locator("..").boundingBox();
  expect(circle!.width).toBeCloseTo(circle!.height, 0);
  const companyListBox = await companyList.boundingBox();
  expect(companyListBox!.x).toBeGreaterThan(circle!.x + circle!.width);
  await expect(page.getByText("ピンを押すと企業のホームページへ移動します。")).toHaveCount(0);
  const mapBox = await map.boundingBox();
  const searchBox = await page.getByRole("heading", { name: "検索", exact: true }).boundingBox();
  expect(mapBox!.y + mapBox!.height).toBeLessThan(searchBox!.y);
  const card = page.locator('article[class*="case-card"]').first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const image = await card.getByRole("img").boundingBox();
  expect(image!.height).toBe(box!.height);
  await expect(card.getByText("￥1,500,000〜￥2,500,000")).toBeVisible();
  await page.screenshot({ path: "/tmp/home-showcase-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileCircle = await pin.locator("..").boundingBox();
  const mobileList = await companyList.boundingBox();
  expect(mobileList!.y).toBeGreaterThan(mobileCircle!.y + mobileCircle!.height);
  await page.screenshot({ path: "/tmp/home-showcase-mobile.png", fullPage: true });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  const viewport = page.getByLabel("施工事例を横にスクロール");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(viewport).toHaveAttribute("data-ready", "true");
    for (const progress of [.2, .8]) {
      await viewport.evaluate(async (element, position) => {
        // Freeze the real animation near the entry/exit boundaries for visual review.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const animations = element.getAnimations({ subtree: true });
        const timing = animations[0]?.effect?.getTiming();
        if (!timing || typeof timing.duration !== "number") throw new Error("ショーケースのアニメーションが見つかりません。");
        const time = (timing.delay ?? 0) + timing.duration * position;
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = time;
        }
      }, progress);
      await viewport.locator("..").screenshot({ path: `/tmp/home-showcase-boundary-${width}-${progress}.png` });
    }
  }
});

test("詳細の追加画像を日付順に説明とともに表示できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/cases/${caseIds[0]}`);
  await expect(page.getByRole("heading", { name: cases[0].title })).toBeVisible();
  const timeline = page.getByRole("region", { name: "施工の記録" });
  const entries = timeline.getByRole("listitem");
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0).locator("time")).toHaveAttribute("datetime", "2026-10-01");
  await expect(entries.nth(0)).toContainText("工事を開始しました。");
  await expect(entries.nth(1)).toContainText("キッチンの設置が完了しました。");
  await entries.first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("heading", { name: cases[0].title }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/case-timeline-mobile.png", fullPage: true });
});
