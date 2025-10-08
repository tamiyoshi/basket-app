# HoopSpotter (MVP)

全国の屋外バスケットコートを検索・投稿できるコミュニティWebアプリのMVPセットアップです。Next.js(App Router)とSupabaseを中心に、要件定義書のスコープを実装できる基盤を整えています。SSRコート一覧・詳細表示、Supabase Authを使ったGoogleログイン、投稿ページのログイン制御まで備えた状態から開発を進められます。

## 技術スタック
- Next.js 15 (App Router, TypeScript, SSR中心)
- Tailwind CSS 3系 + shadcn/ui構成（`components.json` 設定済み）
- Supabase (Auth / Postgres + PostGIS / Storage) クライアント初期化ユーティリティ
- UIユーティリティ: class-variance-authority, tailwind-merge, lucide-react
- 地図表示: Google Maps JavaScript API (`@googlemaps/js-api-loader`)
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
- `/` : 中央にフルサイズのGoogle Mapsヒーローを配置しつつ、Supabaseの`courts`テーブルからSSRで一覧を取得（無料/有料・設備タグフィルタ付き）
- 地図コンポーネントがGoogle Maps APIでコート位置をプロットし、位置情報許可時は現在地を中心に表示。ロケーションカードで半径を切り替え可能
- `/courts/[id]` : コートの基本情報・写真・レビューをSSRで取得し、レビューリストを表示
- `/submit` : ログイン済みユーザーのみ投稿フォームを表示。画像（JPEG/PNG/WebP, 5MB以下）付きでコート情報を投稿し、設備タグを複数指定可能
- `/login` : Google OAuthによるログイン/ログアウト導線（`/auth/callback`でセッション交換）
- `/auth/callback` : Supabaseから返却されたAuthorization CodeをCookieセッションに変換
  - 投稿フォームはServer Action経由で`courts`テーブルに書き込み、レビューは`reviews`テーブルへ即時保存
  - 位置情報利用時はSupabase RPC `courts_nearby` を利用し、PostGIS距離検索で近隣コートを表示
  - `/ranking` : レビュー平均点と件数をもとにした人気コートランキング

## ディレクトリ構成ハイライト
- `src/app/page.tsx` … SSRコート一覧とフィルタUI
- `src/app/courts/[id]/page.tsx` … コート詳細ページ（写真・レビュー表示）
- `src/app/submit/page.tsx` … 投稿フォーム枠（ログイン判定付き・地図ピッカーあり）
- `src/app/login/page.tsx` … ログイン状態確認とGoogleサインイン
- `src/app/auth/callback/route.ts` … Supabase OAuthコールバック処理
- `src/components/courts/court-card.tsx` … コートカードUI
- `src/components/courts/court-submit-form.tsx` … React Hook Form + Server Actionによる投稿フォーム（地図ピッカー・設備タグ入力付き）
- `src/app/ranking/page.tsx` … レビュー平均点順のコートランキングページ
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

## ダミーデータ投入と動作確認
Supabase上でランキングやタグフィルタの挙動を検証するためのシードスクリプトを追加しています。

### 前提
- `.env.local` または環境変数に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定済み
- サービスロールキーを `SUPABASE_SERVICE_ROLE_KEY` として用意（SupabaseプロジェクトのSettings → APIで取得）

### 実行手順
1. ターミナルでサービスロールキーをエクスポート  
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxx
   ```
2. ダミーデータと検証を実行  
   ```bash
   npm run seed:dummy
   ```
   - `scripts/seed-dummy-data.mjs` が `.env.local` を読み込み、専用のSeedユーザーを作成
   - 東京/大阪/名古屋/福岡の5コートとレビューを挿入し、`court_with_stats` ビューに平均点・レビュー件数を反映
3. スクリプト終了時のコンソールログで以下を確認
   - 人気ランキング（平均点→レビュー件数の順）に期待通り並んでいるか
   - タグフィルタ（`照明` / `駐車場`）で該当コートが抽出されるか
   - `courts_nearby` RPCで東京駅周辺の距離ソートが成功するか

### 確認ポイント
- `/` を開くとマップ中央にシード済みコートが表示され、リストにも反映される
- `/?tag=照明` などで設備タグフィルタが機能する
- `/ranking` で平均点が高い順に並び替わる（同点の場合はレビュー件数が多い順）

## Google Maps の設定メモ
- `.env.local` と Vercel 環境変数に `NEXT_PUBLIC_GOOGLE_API_KEY`（必要なら `NEXT_PUBLIC_google_api_key`）を設定
- API Console で Maps JavaScript API を有効化し、ドメイン制限を設定
- 位置情報フィルタは HTTPS 環境でのみ動作。ブラウザに現在地利用を許可すると `/` ページの地図とリストが更新されます
- 投稿フォームの地図ピッカーでピンを置くか「現在地を設定」を押すと緯度・経度が自動入力されます

## 今後のロードマップ
- 位置情報エクスペリエンス: `courts_nearby` RPC を本番導線に組み込み、距離フィルタUI（現在は Coming soon チップ）を有効化。地図上のピン選択とリストハイライトの連動を実装
- 投稿/レビューまわり: 投稿フォームのサーバーアクション実装、Storageアップロードとサムネイル生成、レビュー投稿フォーム＆重複防止ロジックの追加
- 品質とモデレーション: コート編集履歴・承認フロー、報告機能、監視用のモニタリング/ロギングセットアップ
- UI/UX 改善: マーカークラスタリングやサイドパネルのピン留め、検索オートコンプリート、モバイル向けレイアウト最適化
- テストと計測: Supabase エンドポイントの契約テスト、Playwright 等によるE2E確認、Lighthouse計測の自動化

## CI/CD オートメーション検討メモ
- GitHub Actions で Supabase CLI を利用し、マイグレーション適用（`supabase db push`）をリリースブランチで自動化。`SUPABASE_ACCESS_TOKEN` と `SUPABASE_DB_PASSWORD`（または `SERVICE_ROLE_KEY`）をリポジトリシークレットに設定
- 同ワークフロー内で `supabase gen types typescript --project-id ... > src/types/database.ts` を実行し、差分があれば `git diff --quiet` で検出 → bot PR を作成
- プレビュー環境向けには `supabase db remote commit` で branch 別にテンポラリマイグレーションを適用し、Vercel Preview URL に対して最新スキーマを維持
- Maps API キーや Supabase 環境変数は Vercel の `Environment Variables` と GitHub Actions の `env` を同期管理し、ローテーション時の自動更新手順をドキュメント化

## 拡張要件アイデア
- コート主催イベント/ピックアップゲームの募集機能と参加管理
- オフライン対応（PWA）と位置情報キャッシュで電波が弱いエリアでも利用可能に
- コミュニティ貢献度やレビュー信頼度を可視化するスコアリング
- 画像認識によるコート状態チェックや混雑度のリアルタイム共有
- 英語版UIの提供と訪日プレイヤー向けの多言語サポート

## コマンド
- `npm run dev` … 開発サーバー (Turbopack)
- `npm run build` … プロダクションビルド
- `npm run start` … ビルド済みアプリの起動
- `npm run lint` … ESLint
- `npm run seed:dummy` … サービスロールキーを利用してダミーコート/レビューを投入し、ランキングとタグフィルタを検証
