# Vercel Skillsをインストールした後の再点検

`npx skills add` でVercelの3スキルをプロジェクトにインストールし、前回のUI/UX修正を再点検した。初回のレビューはGitHubのスキル本文を参照したもので、CLIによるインストールは今回行った。

## インストールと確認

実行したコマンド：

```bash
npx --yes skills add vercel-labs/agent-skills \
  --skill web-design-guidelines vercel-react-best-practices vercel-composition-patterns \
  --agent codex --yes

npx --yes skills list --agent codex
```

インストール先は `.agents/skills/`。配布元、スキルのパス、内容のハッシュは [`skills-lock.json`](../skills-lock.json) に記録されている。CLIの一覧でも、下記3件のSourceが `vercel-labs/agent-skills`、AgentsがCodexであることを確認した。保存したスキルは次回以降もこのプロジェクトで利用できる。

- [web-design-guidelines](../.agents/skills/web-design-guidelines/SKILL.md)
- [vercel-react-best-practices](../.agents/skills/vercel-react-best-practices/SKILL.md)
- [vercel-composition-patterns](../.agents/skills/vercel-composition-patterns/SKILL.md)

インストールした各 `SKILL.md` と、適用するルールの詳細ファイルを読んだ。`web-design-guidelines` の指示に従い、再点検の際に指定先の[最新ガイドライン](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)も取得した。

## 追加で修正した箇所

| 適用したスキル・ルール | 修正箇所と内容 |
| --- | --- |
| web-design-guidelines：Images | `app/features/media/storage-image.tsx:4` — 画像の幅・高さを必須にし、全呼び出し元とGoogleロゴに表示領域の寸法を指定 |
| web-design-guidelines：Accessibility | `app/components/organisms/index.tsx` など — 文字の横にある装飾アイコンを `aria-hidden` で読み上げ対象から除外 |
| web-design-guidelines：Navigation & State | `app/components/molecules/index.tsx` — 未ログイン時のお気に入り導線を通常のリンクに変更。詳細URLに検索の戻り先を含め、別タブや共有URLでも条件を保持 |
| web-design-guidelines：Navigation & State | `app/components/molecules/index.tsx` — 検索語が変わったときに検索欄をURLに合わせて更新。「条件をクリア」後も以前の入力が残る問題を修正 |
| web-design-guidelines：Forms | `app/features/forms/managed-form.tsx` — 最初のエラーへの移動を送信イベントで行い、別の欄を修正中にフォーカスを奪わないよう修正 |
| web-design-guidelines：Forms | `app/components/molecules/index.tsx` — 既存の入力欄IDと説明の関連付けを維持。非認証項目の自動入力設定、入力例、認証中表示を補完 |
| web-design-guidelines：Content Handling | `app/routes/company-detail.tsx` — 事例0件の案内を追加し、URL未登録のホームページリンクを表示しないよう修正 |
| web-design-guidelines：Touch / Typography / Performance | `app/app.css`、`app/root.tsx` — タップ時の表示、無効なボタンのカーソル、見出しの折り返し、画像配信元への事前接続を追加 |
| vercel-react-best-practices：client-event-listeners / client-swr-dedup | `app/features/auth/auth-context.tsx` — ヘッダーとお気に入りが認証購読・取得を共有。初期セッション通知とトークン更新で同じ取得を重複実行しないよう修正 |
| vercel-react-best-practices：rerender-functional-setstate / rerender-split-combined-hooks | `app/features/forms/managed-form.tsx` — 入力のたびに同じ編集状態を作り直す処理を削減。エラーと送信中のContextを分離 |
| vercel-react-best-practices：rerender-derived-state-no-effect | `app/features/media/storage-image.tsx` — バケット・パス・画像サイズ指定・URLの組み合わせが変わると画像状態をリセット。同じパスの別バケット画像へ切り替えても古い署名URLを表示しないよう修正 |
| vercel-react-best-practices：async-parallel | `app/features/cases/public-data.client.ts` — 独立した企業情報・画像・分類の取得を並列化。企業画像の署名URLと企業の事例一覧も並列に取得 |
| vercel-react-best-practices：rendering-content-visibility | `app/app.css` — 件数が増える管理事例・問い合わせ・企業の施工事例で、画面外の描画を遅延 |
| vercel-composition-patterns：state-lift-state / state-decouple-implementation / state-context-interface | `app/features/auth/auth-context.tsx`、`app/features/favorites/favorites-context.tsx` — 認証の取得をProviderへ集約し、UIは `state` と `meta` のインターフェースを参照。お気に入りの更新通知は利用者IDでも確認 |
| vercel-composition-patterns：architecture-compound-components / react19-no-forwardref | `app/features/forms/managed-form.tsx` — エラー表示と送信ボタンを必要なContextで構成。未保存の変更の保護を独立させ、保護不要なフォームには購読を追加しない。Contextの参照にはReact 19の `use()` を使用 |

## 適用範囲

このアプリはReact RouterのSSR構成で、Next.jsやReact Server Componentsは使っていない。Next.js専用の設定・APIは導入していない。通信の重複防止は既存のProviderとReact Routerの仕組みで対応し、そのためだけにSWRを追加してはいない。

`bundle-barrel-imports` の詳細には、型定義のない深いパスを `lucide-react` で使うことへの注意がある。導入済みバージョンの型定義を維持し、アイコンのインポートを非公開パスへ機械的に置き換える変更はしていない。

これは適用ルールと修正内容の記録であり、全ガイドラインの適合認証や、実測した高速化率を示すものではない。実DBへの保存と実際のメール配送、iOS実機、スクリーンリーダーの読み上げは未確認。

## 検証結果

- `npm run lint`：成功
- `npm run typecheck`：成功
- `npm run test`：16ファイル・48件成功
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/lvd-ui-audit-browsers npm run test:e2e -- --workers=2`：ビルド成功、Chromiumの30件成功

追加したテストでは、認証の購読・取得がヘッダーと複数のお気に入り表示で1回に共有されること、トークン更新時の重複取得、利用者を切り替えた後の状態、入力中のフォーカス、画像ソースの切り替え、詳細URLの戻り先を確認した。E2Eでは既存の公開画面・モバイル操作に加え、企業検索をクリアした際に入力欄も空になることを確認した。
