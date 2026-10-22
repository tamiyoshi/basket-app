import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import postgres from "postgres";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValue] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = rawValue.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const moduleDir = path.dirname(url.fileURLToPath(import.meta.url));
loadEnvFile(path.join(moduleDir, "..", ".env.local"));
loadEnvFile(path.join(moduleDir, "..", ".env"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL を設定してから再実行してください。");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
});

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const reviewerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const courts = [
  ["11111111-aaaa-4bbb-cccc-000000000001", "代々木公園 オープンコート", "東京都渋谷区代々木神園町2-1", 35.671741, 139.694873, true, 4, "アスファルト", ["照明", "トイレ", "ベンチ", "自販機"], "渋谷エリアに近く、夜間も照明付きで安心してプレーできます。", "6:00 - 21:30"],
  ["11111111-aaaa-4bbb-cccc-000000000002", "東京リバーサイドコート", "東京都江東区豊洲6-4", 35.64477, 139.794134, false, 6, "ウレタン", ["照明", "更衣室", "駐車場"], "ウォーターフロントに位置する有料プレミアムコート。", "8:00 - 22:00"],
  ["11111111-aaaa-4bbb-cccc-000000000003", "大阪スカイラインパーク", "大阪府大阪市北区大淀中1-1", 34.705692, 135.490356, true, 3, "ラバー", ["ベンチ", "駐車場", "自販機"], "梅田スカイビル近くの屋上コート。週末はピックアップゲーム多数。", "9:00 - 20:00"],
  ["11111111-aaaa-4bbb-cccc-000000000004", "名古屋ドームフロントコート", "愛知県名古屋市東区大幸南1-1", 35.185318, 136.947475, false, 5, "アスファルト", ["照明", "トイレ", "更衣室"], "ドーム前のイベントスペースに併設されたコート。イベント時は混雑注意。", "7:00 - 21:00"],
  ["11111111-aaaa-4bbb-cccc-000000000005", "福岡ハーバーサイドコート", "福岡県福岡市博多区築港本町13-6", 33.605118, 130.40376, true, 2, "アスファルト", ["照明", "ベンチ"], "博多港を望むビューポイント。夕方のサンセットタイムが人気です。", "6:30 - 20:30"],
];

const reviewComments = [
  ["木漏れ日が気持ちよく、コートも整備されています。", "休日は混むので早めの時間がおすすめ。"],
  ["ロッカーも完備されていて快適。景色も最高です。", "有料ですがメンテナンスが良く、試合形式で遊べます。"],
  ["アクセス抜群。休日のピックアップが楽しい。", "屋上の景色が最高で風通しも良いです。"],
  ["イベント開催時は利用制限あり。事前確認がおすすめ。", "コートは綺麗で、更衣室も使いやすいです。"],
  ["夕日を眺めながらプレーできて気持ちいいです。", "芝生エリアで休憩もできて清潔です。"],
];

async function main() {
  const courtIds = courts.map(([id]) => id);

  await db.begin(async (tx) => {
    await tx`
      INSERT INTO public.profiles (id, display_name, role)
      VALUES
        (${ownerId}::uuid, 'Seed Owner', 'user'),
        (${reviewerId}::uuid, 'Seed Reviewer', 'user')
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name
    `;

    for (const [id, name, address, latitude, longitude, isFree, hoopCount, surface, tags, notes, openingHours] of courts) {
      await tx`
        INSERT INTO public.courts (
          id, name, address, latitude, longitude, is_free, hoop_count,
          surface, facility_tags, notes, opening_hours, created_by
        ) VALUES (
          ${id}::uuid, ${name}, ${address}, ${latitude}, ${longitude}, ${isFree},
          ${hoopCount}, ${surface}, ${tx.array(tags)}, ${notes}, ${openingHours}, ${ownerId}::uuid
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          is_free = EXCLUDED.is_free,
          hoop_count = EXCLUDED.hoop_count,
          surface = EXCLUDED.surface,
          facility_tags = EXCLUDED.facility_tags,
          notes = EXCLUDED.notes,
          opening_hours = EXCLUDED.opening_hours
      `;
    }

    for (let index = 0; index < courts.length; index += 1) {
      const courtId = courts[index][0];
      for (let authorIndex = 0; authorIndex < 2; authorIndex += 1) {
        await tx`
          INSERT INTO public.reviews (id, court_id, author_id, rating, comment)
          VALUES (
            ${crypto.randomUUID()}::uuid, ${courtId}::uuid,
            ${authorIndex === 0 ? ownerId : reviewerId}::uuid,
            ${authorIndex === 0 ? 5 : 4}, ${reviewComments[index][authorIndex]}
          )
          ON CONFLICT (court_id, author_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            comment = EXCLUDED.comment,
            updated_at = now()
        `;
      }
    }
  });

  const ranking = await db`
    SELECT name, average_rating, review_count
    FROM public.court_with_stats
    ORDER BY average_rating DESC NULLS LAST, review_count DESC, name ASC
    LIMIT 10
  `;
  const taggedCourts = await db`
    SELECT name, facility_tags
    FROM public.court_with_stats
    WHERE '照明' = ANY(facility_tags)
    ORDER BY name
  `;
  const nearby = await db`
    SELECT name,
      ST_Distance(geom, ST_SetSRID(ST_MakePoint(${139.767125}, ${35.681236}), 4326)::geography)::double precision AS distance_m
    FROM public.courts
    WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${139.767125}, ${35.681236}), 4326)::geography, ${6000})
    ORDER BY distance_m
    LIMIT 5
  `;

  console.info("Seed records upserted. Existing non-seed records were left untouched.");
  console.table(ranking.map((row, index) => ({ rank: index + 1, ...row })));
  console.info(`Courts with lighting: ${taggedCourts.length}`);
  console.table(nearby.map((row) => ({ name: row.name, distance_km: (row.distance_m / 1000).toFixed(2) })));
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end({ timeout: 5 });
  });
