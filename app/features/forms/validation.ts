import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export function validationErrors(error: ZodError): FieldErrors {
  return Object.fromEntries(error.issues.map((issue) => {
    let message = "入力内容を確認してください。";
    if (/[ぁ-んァ-ン一-龠]/.test(issue.message)) message = issue.message;
    else if (issue.code === "too_small") message = `${issue.minimum}文字以上で入力してください。`;
    else if (issue.code === "too_big") message = `${issue.maximum}文字以内で入力してください。`;
    else if (issue.code === "invalid_format" && issue.format === "email") message = "メールアドレスの形式を確認してください。";
    else if (issue.code === "invalid_format" && issue.format === "url") message = "https:// から始まるURLを入力してください。";
    else if (issue.path[0] === "companyId") message = "問い合わせ先の企業を選択してください。";
    return [String(issue.path[0]), message];
  }));
}

export function priceErrors(min: string, max: string): FieldErrors {
  const errors: FieldErrors = {};
  for (const [name, value] of [["priceMin", min], ["priceMax", max]]) {
    if (value && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 2_147_483_647)) {
      errors[name] = "0〜2,147,483,647円の整数で入力してください。";
    }
  }
  if (!Object.keys(errors).length && min && max && Number(min) > Number(max)) {
    errors.priceMin = "費用の下限は上限以下にしてください。";
    errors.priceMax = "費用の上限は下限以上にしてください。";
  }
  return errors;
}
