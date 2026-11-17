import { describe, expect, it } from "vitest";
import { readCaseImageChanges, validateCaseImageChanges } from "./case-image-form";

function photo(name = "photo.jpg") { return new File(["photo"], name, { type: "image/jpeg" }); }

describe("施工写真の入力", () => {
  it("代表画像と各追加画像の日付・説明を対応させる", () => {
    const form = new FormData();
    form.set("coverImage", photo("cover.jpg"));
    form.append("images", photo("one.jpg"));
    form.append("images", photo("two.jpg"));
    form.set("imageDate:new-0", "2026-10-01");
    form.set("imageDescription:new-0", " 解体を開始 ");
    form.set("imageDate:new-1", "2026-11-01");
    form.set("imageDescription:new-1", "工事が完了");
    const { changes, error } = readCaseImageChanges(form);
    expect(error).toBeUndefined();
    expect(changes.cover?.name).toBe("cover.jpg");
    expect(changes.added).toEqual([{ date: "2026-10-01", description: "解体を開始" }, { date: "2026-11-01", description: "工事が完了" }]);
    expect(validateCaseImageChanges([], changes)).toBeNull();
  });

  it("実在しない日付を拒否し、削除する写真のメタデータは検証対象から外す", () => {
    const form = new FormData();
    form.append("imageIds", "one");
    form.set("imageDate:one", "2026-02-30");
    expect(readCaseImageChanges(form).error).toContain("日付");
    form.append("removeImageIds", "one");
    expect(readCaseImageChanges(form).error).toBeUndefined();
  });

  it("代表画像を含む上限を守り、代表画像なしで追加写真だけを登録させない", () => {
    const form = new FormData();
    form.append("images", photo());
    let changes = readCaseImageChanges(form).changes;
    expect(validateCaseImageChanges([], changes)).toContain("代表画像");
    form.set("coverImage", photo("cover.jpg"));
    changes = readCaseImageChanges(form).changes;
    expect(validateCaseImageChanges(Array.from({ length: 10 }, (_, index) => String(index)), changes)).toContain("10枚まで");
    changes.removedIds = ["1"];
    expect(validateCaseImageChanges(Array.from({ length: 10 }, (_, index) => String(index)), changes)).toBeNull();
  });

  it("写真だけを追加する場合は代表画像を求め、差し替えは枚数を増やさない", () => {
    const form = new FormData();
    form.append("images", photo());
    const { changes } = readCaseImageChanges(form);
    expect(validateCaseImageChanges([], changes)).toContain("代表画像");
    const tenIds = Array.from({ length: 10 }, (_, index) => String(index));
    expect(validateCaseImageChanges(tenIds, changes)).toContain("10枚");
    changes.files = [];
    changes.cover = photo();
    expect(validateCaseImageChanges(tenIds, changes)).toBeNull();
  });
});
