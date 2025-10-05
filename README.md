# HoopSpotter (MVP)

全国の屋外バスケットコートを検索・投稿できるコミュニティWebアプリのMVPセットアップです。Next.js(App Router)とSupabaseを中心に、要件定義書のスコープを実装できる基盤を整えています。SSRコート一覧・詳細表示、Supabase Authを使ったGoogleログイン、投稿ページのログイン制御まで備えた状態から開発を進められます。

## 技術スタック
- Next.js 15 (App Router, TypeScript, SSR中心)
- Tailwind CSS 3系 + shadcn/ui構成（`components.json` 設定済み）
- Supabase (Auth / Postgres + PostGIS / Storage) クライアント初期化ユーティリティ
- UIユーティリティ: class-variance-authority, tailwind-merge, lucide-react
- フォーム/バリデーション: react-hook-form, zod, @hookform/resolvers

## セットアップ手順
1. 必要なNode.jsバージョン: **Node.js 18.18以上**
2. 依存パッケージのインストール
   ```bash
   npm install
   ```
3. `.env.local` を作成し、以下の環境変数を設定
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_GOOGLE_API_KEY=...
   ```
   - Google Maps API Keyは`NEXT_PUBLIC_google_api_key`でも参照できるよう互換変数を同梱
   - Supabase AuthのRedirect URLに `http://localhost:3000/auth/callback` と本番URLを登録
4. 開発サーバーを起動
   ```bash
   npm run dev
   ```
5. `http://localhost:3000` へアクセスして動作確認

## 主要機能（MVP段階）
- `/` : Supabaseの`courts`テーブルからSSRで一覧を取得（無料/有料フィルタ、地図プレースホルダー付き）
- `/courts/[id]` : コートの基本情報・写真・レビューをSSRで取得し、レビューリストを表示
- `/submit` : ログイン済みユーザーのみ投稿フォームを表示。画像（JPEG/PNG/WebP, 5MB以下）付きでコート情報を投稿
- `/login` : Google OAuthによるログイン/ログアウト導線（`/auth/callback`でセッション交換）
- `/auth/callback` : Supabaseから返却されたAuthorization CodeをCookieセッションに変換
  - 投稿フォームはServer Action経由で`courts`テーブルに書き込み、レビューは`reviews`テーブルへ即時保存
  - 位置情報利用時はSupabase RPC `courts_nearby` を利用し、PostGIS距離検索で近隣コートを表示

## ディレクトリ構成ハイライト
- `src/app/page.tsx` … SSRコート一覧とフィルタUI
- `src/app/courts/[id]/page.tsx` … コート詳細ページ（写真・レビュー表示）
- `src/app/submit/page.tsx` … 投稿フォーム枠（ログイン判定付き）
- `src/app/login/page.tsx` … ログイン状態確認とGoogleサインイン
- `src/app/auth/callback/route.ts` … Supabase OAuthコールバック処理
- `src/components/courts/court-card.tsx` … コートカードUI
- `src/components/courts/court-submit-form.tsx` … React Hook Form + Server Actionによる投稿フォーム
- `src/components/reviews/review-card.tsx` … レビュー表示コンポーネント
- `src/components/reviews/review-form.tsx` … レビュー投稿フォーム
- `src/components/auth/google-sign-in-button.tsx` … Googleサインインボタン
- `src/components/layout/site-header.tsx` … ログイン状態を反映した共通ヘッダー
- `src/lib/courts.ts` … コート/レビュー取得のデータアクセス層
- `src/lib/actions/courts.ts` … コート/レビュー投稿Server Action
- `src/lib/auth.ts` … セッション・プロフィール取得ヘルパー
- `src/lib/actions/auth.ts` … サインアウトServer Action
- `src/lib/validation.ts` … zodベースのバリデーションスキーマ
- `src/lib/supabase/*` … Supabaseクライアント初期化ユーティリティ
- `src/types/database.ts` … 要件定義書を元にしたテーブル定義（型）
- `components.json` … shadcn/ui CLI互換設定

## Supabase設定メモ
- Auth: Google Providerを有効化し、Redirect URLに `http://localhost:3000/auth/callback` と本番URLを登録
- Postgres: `profiles`, `courts`, `court_photos`, `reviews` を作成し、PostGIS拡張とGISTインデックスで近傍検索を最適化
- RLS: 投稿・レビューそれぞれ `auth.uid()` と `created_by / author_id` を紐付け、閲覧はPublicに開放
- Storage: `court-photos` バケットをPublic扱いで作成し、アップロード権限は認証ユーザーに限定
- StorageのCORS/Content-Typeを調整し、JPEG/PNG/WebPのアップロードを許可
- 型同期: `supabase gen types typescript --project-id <project>` を実行し、`src/types/database.ts` を最新化

## Supabase スキーマ適用手順
1. Supabase CLI をインストールし、プロジェクトとリンク
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
2. 付属の SQL を適用
   ```bash
   supabase db push supabase/schema.sql
   supabase db push supabase/policies.sql
   ```
   もしくは Supabase ダッシュボードの SQL Editor で `supabase/` 以下のファイルを貼り付けて実行。
   ※ `schema.sql` には PostGIS 拡張と RPC `courts_nearby` の定義を含みます。
3. 型定義を最新化
   ```bash
   supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
   ```
4. Storage バケット `court-photos` を作成し、RLS / ポリシーの適用を確認。

## 今後の実装ガイド
- `getCourts` をPostGISベースのRPC（例: `courts_nearby`）に切り替え、距離フィルタを有効化
- 投稿フォームにServer Actionを実装し、Storageアップロードと近傍検索用ジオメトリ登録を行う
- 写真アップロード時のサムネイル生成や画像最適化ワークフローを追加
- レビュー投稿フォームを追加し、平均評価/件数をSupabase側で集計するビューを作成
- Google Maps APIを用いたClient Componentで地図ピン表示と現在地検索を実装
- shadcn/uiコンポーネントをインポートしてフォーム/ダイアログ/モーダルを整備

## コマンド
- `npm run dev` … 開発サーバー (Turbopack)
- `npm run build` … プロダクションビルド
- `npm run start` … ビルド済みアプリの起動
- `npm run lint` … ESLint

ベースセットアップは完了しているため、このまま機能開発・Supabase連携・UI整備を進めてください。
