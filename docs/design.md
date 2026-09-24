# Living Design アプリケーション設計書

## 1. 概要

本書は Issue の技術要件と [`docs/pages/page-design.md`](./pages/page-design.md) の画面案を実装可能な設計へ落とし込む。住宅の施工事例・施工企業を検索し、一般ユーザーがお気に入りを保存でき、企業ユーザーが自社情報と施工事例を管理できる Web アプリケーションとする。

独立したバックエンドプロジェクトは作らず、React Router の server 機能と Supabase を利用する。

## 2. 技術構成

| 項目 | 技術 | 方針 |
| --- | --- | --- |
| アプリ | React 19 / React Router 8 / TypeScript | 現在の Framework 構成を継続 |
| UI | Tailwind CSS | Atomic Design で構成 |
| BaaS | Supabase | Auth、PostgreSQL、Storage |
| ORM | Prisma Client | server loader/action だけで利用 |
| 検証 | Zod | フォーム、URL、環境変数、server 入力 |
| テスト | Vitest / Testing Library | 単体、UI、結合テスト |
| E2E | Playwright | 主要利用経路を検証 |
| 静的解析 | ESLint | TypeScript、React、Hooks、テストを検査 |

```text
Browser (React)
  ├─ Supabase Auth / Storage
  └─ React Router loader/action
       ├─ Zod
       ├─ Auth・権限検査
       └─ Prisma Client ─ Supabase PostgreSQL
```

Prisma Client はブラウザへバンドルせず、`.server.ts` または loader/action からのみ呼び出す。Supabase Auth と Storage は SDK、DB の読み書きは原則 Prisma に集約する。

## 3. ユーザーと権限

Supabase Auth ユーザーを全アカウントの基礎とする。企業アカウントは別の認証方式ではなく、一般アカウントへ企業所属と権限を付与する。

| ロール | 操作 |
| --- | --- |
| ゲスト | ホーム、検索、施工事例・企業詳細の閲覧、認証 |
| 一般ユーザー | ゲストの操作、お気に入り、マイページ |
| 企業ユーザー | 自社情報の編集、施工事例の作成・編集。お気に入りは利用不可 |
| 全体管理者 | 全ユーザーのロール管理、企業申請の承認・却下、全施工事例の編集・削除。お気に入りは利用不可 |

企業権限は `company_members` で判断し、全体管理者は `profiles.account_role = 'ADMIN'` で判断する。ブラウザから送信された role や company ID を信用せず、server 側とRLSで所属・所有権を検査する。

## 4. 画面・ルート設計

| 画面設計 | URL | 公開範囲 | 主な機能 |
| --- | --- | --- | --- |
| ホーム | `/` | 公開 | 検索導線、おすすめ・新着事例 |
| 検索／検索結果 | `/search` | 公開 | 絞り込み、結果一覧、ページング |
| 検索結果詳細 | `/cases/:caseId` | 公開 | 画像・属性・企業、お気に入り |
| 企業詳細 | `/companies/:companyId` | 公開 | 企業情報、対応地域、公開事例 |
| ログイン | `/login` | 未認証 | ログイン |
| アカウント作成 | `/signup` | 未認証 | 一般アカウント作成 |
| ユーザーダッシュボード | `/mypage` | 一般ユーザー | プロフィールと利用導線、企業申請 |
| お気に入り一覧 | `/mypage/favorites` | 一般ユーザー | 一覧・解除 |
| 企業ダッシュボード | `/company` | 企業 | 自社情報、事例、公開状態 |
| 企業アカウント申請 | `/company/apply` | 一般ユーザー | 企業情報を入力して管理者へ申請 |
| 企業情報編集 | `/company/profile/edit` | 企業 | 自社情報と画像の編集 |
| 施工事例作成 | `/company/cases/new` | 企業 | 新規登録 |
| 施工事例編集 | `/company/cases/:caseId/edit` | 所有企業 | 編集、公開、アーカイブ |
| 管理者ダッシュボード | `/admin` | 全体管理者 | ユーザー、企業、施工事例の管理 |

未認証で保護ルートへアクセスした場合は `/login?redirectTo=<元URL>` へ移動する。権限不足では情報漏えいを避けるため原則 404 を返す。

検索条件 `q`、`area`、`category`、`style`、`page`、`sort` は URL search params に保持する。Zod で検証し、不正値は既定値へ正規化する。公開画面には公開済み企業・施工事例だけを返す。全画面で読み込み、0件、入力エラー、通信エラー、送信中、成功の状態を用意する。

## 5. Atomic Design

| 階層 | 責務 | 例 |
| --- | --- | --- |
| Atoms | 最小 UI | Button、Input、Select、Icon、Badge |
| Molecules | 小さな操作単位 | FormField、SearchField、FavoriteButton、Pagination |
| Organisms | 意味のある画面領域 | Header、SearchFilters、CaseList、CompanyForm |
| Templates | 共通配置 | PublicLayout、AuthLayout、DashboardLayout、DetailLayout |
| Pages | URL とデータを UI へ接続 | SearchPage、CaseDetailPage、CompanyDashboardPage |

Atoms、Molecules、Templates は DB を参照しない。Organisms は値と callback を props で受け、Page または feature hook がデータ処理と接続する。業務固有部品は feature 内へ置く。

## 6. ディレクトリ設計

```text
app/
  components/{atoms,molecules,organisms,templates}/
  features/{auth,search,cases,companies,favorites}/
  lib/{auth.server.ts,db.server.ts,env.server.ts,supabase.client.ts,errors.ts}
  routes/
prisma/{schema.prisma,migrations/}
supabase/migrations/       # RLS・Storage policy 等
e2e/
docs/{pages/,design.md}
```

feature は必要に応じて `components`、`schemas`、`services`、`types`、`utils` を持つ。server/browser 専用モジュールに `.server.ts` / `.client.ts` を付ける。

## 7. データモデル

| テーブル | 用途 |
| --- | --- |
| `profiles` | 全ユーザーのプロフィール |
| `companies` | 企業名、説明、ロゴ、URL、公開状態 |
| `company_members` | ユーザーの企業所属と role |
| `company_applications` | 一般ユーザーからの企業アカウント申請と審査状態 |
| `company_service_areas` | 企業の対応地域 |
| `construction_cases` | 企業、題名、説明、公開状態、公開日時 |
| `case_images` | Storage path、代替テキスト、表示順 |
| `categories` / `styles` | 検索マスタ |
| `case_categories` / `case_styles` | 多対多の中間テーブル |
| `favorites` | ユーザーと施工事例のお気に入り |

主キーは UUID、日時は `created_at` / `updated_at` を基本とする。`favorites(user_id, case_id)` は一意制約を付ける。企業は `DRAFT/PUBLISHED/SUSPENDED`、事例は `DRAFT/PUBLISHED/ARCHIVED` の状態を持つ。

テーブル・index・外部キーは Prisma migration を正本とする。RLS、Storage policy、`auth.users` 連携 trigger は `supabase/migrations` で管理し、同じ DDL を重複生成しない。本番で `prisma db push` は使わない。

## 8. 認証・セキュリティ

- Supabase access token を server 側で検証し、`auth.users.id` を操作主体にする。
- 全更新で企業権限と施工事例の所有権を確認する。
- 公開 schema は RLS を有効化する。Prisma が RLS を迂回する場合も server 認可を省略しない。
- browser へ公開するのは Supabase URL と publishable/anon key だけとする。
- DB URL、Service Role Key は server 環境変数に限定する。
- upload 時に MIME type、拡張子、容量、枚数を検証する。
- 入力を HTML として直接描画せず、秘密値・token・個人情報をログへ出さない。
- upload 後に DB 更新が失敗した場合、孤立ファイルを削除または定期 cleanup する。

## 9. Zod・エラー処理

Zod schema を外部入力の正本とし、`z.infer` で型を導出する。フォーム、route/search params、環境変数、upload metadata、action 入力を検証する。browser で検証済みでも server で再検証し、必須・一意・参照整合性は DB 制約でも保証する。

下位エラーを `VALIDATION_ERROR`、`UNAUTHENTICATED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`NETWORK_ERROR`、`INTERNAL_ERROR` へ変換する。UI には安全な文言と復旧操作、server log には request ID と原因を記録する。

## 10. テスト設計

### Vitest

- Unit: Zod、変換、検索条件、権限判定の正常・境界・異常値。
- Component: role、label、表示文言、利用者操作を Testing Library で検証。
- Integration: テスト DB で loader/action、Prisma、認証、CRUD、制約、権限拒否を検証。
- テストは対象付近へ `*.test.ts(x)` として置く。

### E2E

1. ホームから検索し、施工事例詳細・企業詳細へ移動する。
2. 一般ユーザーがログインし、お気に入りを追加・解除する。
3. 保護画面からログイン後に元 URL へ戻る。
4. 企業ユーザーが自社情報を編集する。
5. 施工事例を作成し、画像追加、公開、編集、アーカイブする。
6. 一般ユーザーと別企業が企業機能・他社データを更新できない。
7. 入力不正、0件、404、通信失敗を正しく表示する。

Playwright のデータは worker ごとに一意にし、本番では実行しない。失敗時の trace と screenshot を CI artifact に保存する。

## 11. ESLint・CI

ESLint は TypeScript、React、React Hooks、accessibility、import、Vitest、Playwright を対象とする。

```text
npm ci → lint → typecheck → unit/component test → build
       → test DB migration → integration test → E2E
```

pull request では lint、型検査、単体・UIテスト、build を必須とする。

## 12. 実装順序

1. ESLint、Vitest、Playwright、Zod、Supabase SDK、Prisma を導入する。
2. DB schema、migration、RLS、Auth session、権限 helper を作る。
3. design token、Atoms、共通 Templates、Header を作る。
4. ホーム、検索、施工事例詳細、企業詳細を完成させる。
5. 認証、マイページ、お気に入りを実装する。
6. 企業ダッシュボード、企業情報・施工事例編集を実装する。
7. E2E、アクセシビリティ、レスポンシブ、権限境界を横断確認する。

## 13. 完了条件

- `docs/pages` の10画面と必要な作成・エラー・空状態が実装済み。
- 一般・企業ユーザーの権限差を server 側で強制済み。
- Atomic Design に沿い、汎用 UI に DB 処理が混在していない。
- Supabase と Prisma の責務、browser/server 境界が分離済み。
- Zod 検証と DB 制約を実装済み。
- ESLint、型検査、Vitest、build、主要 E2E が CI で成功する。
- 秘密情報が browser bundle、repository、log に含まれない。

## 14. 実装前の確認事項

- 検索条件、選択肢、並び順、おすすめの算出方法
- 企業権限を付与・解除する管理フローと複数所属の可否
- 企業・施工事例の公開審査が必要か
- 画像の形式、最大容量、枚数、変換サイズ、保存期間
- 対応ブラウザ、breakpoint、アクセシビリティ達成基準
- 問い合わせ、資料請求、通知を初期リリースへ含めるか
