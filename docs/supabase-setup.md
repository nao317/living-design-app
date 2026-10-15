# Supabase セットアップ

この手順は、開発者がSupabase Dashboardで一度だけ行います。`supabase/` はGitの追跡対象外です。必要なSQLファイルは管理者から別途入手してください。

## 1. データベースを作成する

Supabase Dashboardの「SQL Editor」で、別途管理されている `supabase/setup.sql` の全内容を実行してください。
続けて `supabase/search.sql` を実行してください。既存環境では `supabase/search.sql` だけを実行すれば、施工事例検索用の関数を追加できます。

検索項目の変更申請を使う環境では、アプリの更新前に、このリポジトリに含まれる [`docs/sql/taxonomy-requests.sql`](./sql/taxonomy-requests.sql) をSQL Editorで実行してください。既存のカテゴリ・スタイルに公開状態を追加し、企業申請、管理者審査、承認時の反映を設定します。既存の項目は公開状態のまま保持されます。削除承認は項目を非表示にし、既存の施工事例との関連は残します。

SQLには次の内容が含まれます。

- プロフィール、企業、企業メンバー、企業申請、施工事例、カテゴリ、スタイル、お気に入り
- Authユーザー作成時のプロフィール自動生成
- updated_at の自動更新
- 一般ユーザー／企業メンバー／管理者向けのRLS
- 企業画像と施工画像のprivate Storage bucketおよびアクセス制御

`supabase/setup.sql` には `company-assets`（企業のメイン画像・ロゴ）と `case-images`（施工事例画像）の2つのStorage bucket作成も含まれます。既にデータベースを作成済みの環境でも、今回の変更を反映するためSQL Editorでファイル全体をもう一度実行してください。既存の企業アカウントが一覧に出ない問題も、この実行で承認済み企業を公開状態へ補正します。

画像はアップロード時に、必要に応じて最大辺 2000px の WebP に変換します。保存する画像は1枚1MB以内、施工写真は1事例につき10枚までです。変換後も1MBを超える画像は登録できません。Storage bucketの1ファイル上限も1MBに設定しています。既存環境へ反映するには `supabase/setup.sql` をSQL Editorで再実行してください。既存画像は削除されません。公開画面では一覧・詳細に合わせたサイズの画像変換 URL を使います。Supabase の Image Transformations を利用できない環境では元画像に切り替わります。既存画像も軽く表示するには、Pro プラン以上の Supabase プロジェクトで Image Transformations を有効にしてください。

企業を作成したユーザーには、SQL内のトリガーが company_members の OWNER 権限を自動付与します。
Service Role Keyをブラウザへ公開してはいけません。

一般ユーザーは `/company/apply` から企業申請を送り、管理者が `/admin` で承認すると企業アカウントへ変更されます。管理者がユーザーを企業ロールへ変更する場合は所属企業も指定します。企業ユーザーは所属企業の情報と施工事例だけを編集でき、管理者は全ユーザーと全施工事例を管理できます。企業・管理者ロールではお気に入りのRLS操作も拒否されます。

全体管理者には `nao.yellowtail.1729@gmail.com` を設定します。既存ユーザーへ反映する場合は、Supabase SQL Editorで次を実行してください。一般ユーザーが自分で管理者へ昇格できないよう、通常のプロフィール更新では `account_role` を変更できません。

```sql
update public.profiles
set account_role = 'ADMIN'
where id in (
  select id from auth.users
  where lower(email) = lower('nao.yellowtail.1729@gmail.com')
);
```

## 2. アプリの接続情報を設定する

.env.example を .env としてコピーし、Supabase Dashboardの「Project Settings > API」にある値を設定します。

~~~dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
~~~

旧形式のプロジェクトでは VITE_SUPABASE_ANON_KEY も利用できます。Service Role Keyは設定しないでください。

## 3. Email認証を設定する

Supabase Dashboardの「Authentication > Providers > Email」でEmail Providerを有効にします。

メール確認を有効にする場合、確認メールから /auth/callback に戻ったあとマイページへ遷移します。開発時に確認メールを省略する場合は「Confirm email」を無効にできます。

## 4. Google OAuthを設定する

1. Google Auth PlatformでWeb applicationのOAuth Clientを作成します。
2. Google側の「Authorized JavaScript origins」にアプリのoriginを追加します（例: http://localhost:5173）。
3. Google側の「Authorized redirect URIs」にSupabase DashboardのGoogle Provider画面に表示されるcallback URLを追加します。通常は https://<project-ref>.supabase.co/auth/v1/callback です。
4. Supabase Dashboardの「Authentication > Providers > Google」にClient IDとClient Secretを設定して有効化します。
5. Supabase Dashboardの「Authentication > URL Configuration」で次を設定します。
   - Site URL: 本番では https://living-design-app.vercel.app
   - Redirect URLs:
     - https://living-design-app.vercel.app/auth/callback
     - http://localhost:5173/auth/callback
   - Vercel Preview Deploymentを使う場合は、必要に応じてPreview URLの `/auth/callback` も追加

GoogleのClient SecretはSupabase Dashboardだけに保存し、.env やリポジトリには追加しません。

## 5. お問い合わせ通知を設定する

お問い合わせは外部メールサービスを使わず、`contact_messages` テーブルへ保存します。送信者が選択した企業のダッシュボードにメッセージが表示され、企業ユーザーは内容を確認して既読にできます。ログインしていないユーザーからも送信できます。

企業ごとのメールアドレス登録は問い合わせ送信には不要です。企業プロフィールに登録したメールアドレスは、企業情報として表示するために利用できます。

企業間のメッセージが見えないよう、SQL内で次のRLSを設定しています。

- 企業ユーザーは自社宛てのメッセージだけ閲覧可能
- 管理者は全企業のメッセージを閲覧可能
- 公開フォームは停止されていない企業へだけ保存可能
- 既読化は所属企業のメンバーまたは管理者だけ可能

## 6. 動作確認

~~~bash
npm run dev
~~~

- /signup: メールアドレスとパスワードで登録
- /login: メールアドレスとパスワードでログイン
- 「Googleで続ける」: Google OAuth
- ログイン後の共通ヘッダー: マイページとログアウトを表示
- `/contact`: 企業を必須選択して問い合わせを登録
- `/company`: 自社宛て問い合わせの確認と既読化
- `/company/cases/new`: 事例の登録時に「登録後に公開する」を選ぶか、登録後の編集画面で公開状態を「公開」にする。下書き・アーカイブの事例は公開検索に表示されません。
- `/search`: 公開事例について、キーワード・施工箇所・こだわり条件で絞り込めることを確認する。検索用SQL関数をまだ適用していない環境でも、アプリは公開テーブルから検索します。
- `/company/tags`: リノベーション箇所・こだわり条件の追加、名称変更、削除を申請し、履歴を確認する。
- `/admin/tags`: 申請を承認・却下する。承認前は検索画面に反映されず、承認後は選択肢に反映される。却下理由は申請企業に表示される。

施工地域は自由入力、予算は数値入力、施工期間は事例では自由入力・検索では固定の期間選択、並び順は検索操作です。これらの入力方式や絞り込みロジックの変更は、共通タグの変更申請とは別の設計が必要です。
