# Supabase セットアップ

この手順は、開発者がSupabase Dashboardで一度だけ行います。

## 1. データベースを作成する

Supabase Dashboardの「SQL Editor」で supabase/setup.sql の全内容を実行してください。

SQLには次の内容が含まれます。

- プロフィール、企業、企業メンバー、施工事例、カテゴリ、スタイル、お気に入り
- Authユーザー作成時のプロフィール自動生成
- updated_at の自動更新
- 一般ユーザー／企業メンバー／管理者向けのRLS
- 企業画像と施工画像のprivate Storage bucketおよびアクセス制御

企業を作成したユーザーには、SQL内のトリガーが company_members の OWNER 権限を自動付与します。
Service Role Keyをブラウザへ公開してはいけません。

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
   - Site URL: 開発時は http://localhost:5173
   - Redirect URLs: http://localhost:5173/auth/callback
   - 本番URLの https://<your-domain>/auth/callback も追加

GoogleのClient SecretはSupabase Dashboardだけに保存し、.env やリポジトリには追加しません。

## 5. 動作確認

~~~bash
npm run dev
~~~

- /signup: メールアドレスとパスワードで登録
- /login: メールアドレスとパスワードでログイン
- 「Googleで続ける」: Google OAuth
- ログイン後の共通ヘッダー: マイページとログアウトを表示
