# HoopSpotter

全国の屋外バスケットコートを検索・投稿できるWebアプリです。Next.jsのServer ComponentsとServer Actionsを使い、アプリサーバーからPostgreSQLへ直接接続します。SupabaseはGoogle認証と写真の保存に利用します。

## 構成

- Next.js 15 / React 19 / TypeScript
- PostgreSQL + PostGIS（アプリデータ、距離検索）
- Supabase Auth（Google OAuth）
- Supabase Storage（公開写真バケット）
- Google Maps JavaScript API

データベース接続情報はサーバー専用の`DATABASE_URL`です。ブラウザーにPostgreSQL接続情報を渡さず、データ取得・更新は`src/lib/db.ts`を経由します。SupabaseのPostgRESTやDB RPCは使いません。

## セットアップ

1. Node.js 18.18以上とPostgreSQLを用意し、対象データベースでPostGIS拡張を利用できるようにします。
2. 依存パッケージを入れます。

   ```bash
   npm install
   ```

3. `.env.local`を作成します。

   ```env
   DATABASE_URL=postgresql://basket_app:password@localhost:5432/basket_app
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_GOOGLE_API_KEY=...
   ```

   `DATABASE_URL`にはテーブル作成権限を持つ管理者ではなく、必要な読み書きだけを許可したアプリ用ロールを使ってください。TLSが必要な本番環境では`sslmode=require`を接続URLに含めます。

4. PostgreSQLに初期スキーマを適用します。

   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_initial.sql
   ```

   アプリ用ロールはマイグレーション後に作成し、必要な読み書き権限だけを付与します。`role`列はアプリ用ロールから更新できないようにします。

   ```sql
   create role basket_app login password 'replace-with-a-secret';
   grant connect on database basket_app to basket_app;
   grant usage on schema public to basket_app;
   grant select on public.profiles, public.courts, public.court_photos, public.reviews, public.court_with_stats to basket_app;
   grant insert (id, display_name, avatar_url) on public.profiles to basket_app;
   grant update (display_name, avatar_url) on public.profiles to basket_app;
   grant insert (id, name, address, latitude, longitude, is_free, hoop_count, surface, facility_tags, notes, opening_hours, created_by) on public.courts to basket_app;
   grant insert (id, court_id, storage_path, uploaded_by) on public.court_photos to basket_app;
   grant insert (id, court_id, author_id, rating, comment) on public.reviews to basket_app;
   ```

   `DATABASE_URL`にはこのロールの接続URLを設定します。`npm run seed:dummy`は固定のダミー行を更新するため、必要な書き込み権限を持つ開発用接続先で実行してください。

5. Supabase AuthでGoogle Providerを有効にし、Redirect URLに`http://localhost:3000/auth/callback`と本番URLを登録します。Storageに`court-photos`という公開バケットを作り、次のポリシーを適用します。

   ```sql
   create policy "Public court photos are readable"
     on storage.objects for select
     using (bucket_id = 'court-photos');

   create policy "Signed-in users upload their own court photos"
     on storage.objects for insert
     with check (
       bucket_id = 'court-photos'
       and auth.uid()::text = (storage.foldername(name))[1]
     );

   create policy "Users delete their own court photos"
     on storage.objects for delete
     using (
       bucket_id = 'court-photos'
       and auth.uid()::text = (storage.foldername(name))[1]
     );
   ```

6. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

## データ移行

既存Supabaseデータベースから別のPostgreSQLへ移す場合、先に新しいDBへ上記スキーマを適用し、SupabaseのPostgreSQL接続先から4つの公開テーブルをデータのみで出力して取り込みます。`profiles.id`とSupabase AuthのユーザーIDは同じUUIDを保ってください。

```bash
pg_dump --data-only --column-inserts \
  -t public.profiles -t public.courts -t public.court_photos -t public.reviews \
  "$OLD_SUPABASE_DATABASE_URL" > basket-data.sql
psql "$DATABASE_URL" -f basket-data.sql
```

重複レビューがあると新スキーマの`(court_id, author_id)`一意制約に合わないため、移行前に重複を確認して1件に整理してください。写真ファイルはStorageに残るため、既存の`storage_path`を保持すれば引き続き表示できます。

## ディレクトリ

- `src/app/` … ページとOAuthコールバック
- `src/components/` … 地図、投稿フォーム、レビューなどのUI
- `src/lib/db.ts` … PostgreSQL接続プール
- `src/lib/courts.ts` … パラメーター化したSQLによる読み取り
- `src/lib/actions/courts.ts` … 認証確認後の投稿処理
- `src/lib/supabase/` … AuthとStorage用クライアントのみ
- `db/migrations/` … PostgreSQLのスキーマ
- `scripts/seed-dummy-data.mjs` … ダミー情報の投入

## コマンド

- `npm run dev` … 開発サーバー
- `npm run build` … 本番ビルド
- `npm run lint` … ESLint
- `npm run seed:dummy` … PostgreSQLへダミーコートとレビューを追加・更新
