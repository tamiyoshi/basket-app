import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [rawKey, ...rawRest] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = rawRest.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const moduleDir = path.dirname(url.fileURLToPath(import.meta.url));
loadEnvFile(path.join(moduleDir, "..", ".env.local"));
loadEnvFile(path.join(moduleDir, "..", ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL が設定されていません。");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY を設定してから再実行してください。");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureUser(email, displayName) {
  const { data: usersResult, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw listError;
  }

  let user = usersResult?.users?.find((item) => item.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const tempPassword = crypto.randomBytes(12).toString("base64url");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (error || !data?.user) {
      throw error ?? new Error("Failed to create user for seeding");
    }

    user = data.user;
    console.info(`👤 Created seed user ${email} (temporary password: ${tempPassword})`);
  } else {
    console.info(`👤 Reusing seed user ${email}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      role: "admin",
      avatar_url: null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  return user;
}

function buildSeedCourts(ownerId) {
  return [
    {
      id: "11111111-aaaa-4bbb-cccc-000000000001",
      name: "代々木公園 オープンコート",
      address: "東京都渋谷区代々木神園町2-1",
      latitude: 35.671741,
      longitude: 139.694873,
      is_free: true,
      hoop_count: 4,
      surface: "アスファルト",
      facility_tags: ["照明", "トイレ", "ベンチ", "自販機"],
      notes: "渋谷エリアに近く、夜間も照明付きで安心してプレーできます。",
      opening_hours: "6:00 - 21:30",
      created_by: ownerId,
    },
    {
      id: "11111111-aaaa-4bbb-cccc-000000000002",
      name: "東京リバーサイドコート",
      address: "東京都江東区豊洲6-4",
      latitude: 35.64477,
      longitude: 139.794134,
      is_free: false,
      hoop_count: 6,
      surface: "ウレタン",
      facility_tags: ["照明", "更衣室", "駐車場"],
      notes: "ウォーターフロントに位置する有料プレミアムコート。",
      opening_hours: "8:00 - 22:00",
      created_by: ownerId,
    },
    {
      id: "11111111-aaaa-4bbb-cccc-000000000003",
      name: "大阪スカイラインパーク",
      address: "大阪府大阪市北区大淀中1-1",
      latitude: 34.705692,
      longitude: 135.490356,
      is_free: true,
      hoop_count: 3,
      surface: "ラバー",
      facility_tags: ["ベンチ", "駐車場", "自販機"],
      notes: "梅田スカイビル近くの屋上コート。週末はピックアップゲーム多数。",
      opening_hours: "9:00 - 20:00",
      created_by: ownerId,
    },
    {
      id: "11111111-aaaa-4bbb-cccc-000000000004",
      name: "名古屋ドームフロントコート",
      address: "愛知県名古屋市東区大幸南1-1",
      latitude: 35.185318,
      longitude: 136.947475,
      is_free: false,
      hoop_count: 5,
      surface: "アスファルト",
      facility_tags: ["照明", "トイレ", "更衣室"],
      notes: "ドーム前のイベントスペースに併設されたコート。イベント時は混雑注意。",
      opening_hours: "7:00 - 21:00",
      created_by: ownerId,
    },
    {
      id: "11111111-aaaa-4bbb-cccc-000000000005",
      name: "福岡ハーバーサイドコート",
      address: "福岡県福岡市博多区築港本町13-6",
      latitude: 33.605118,
      longitude: 130.40376,
      is_free: true,
      hoop_count: 2,
      surface: "アスファルト",
      facility_tags: ["照明", "ベンチ"],
      notes: "博多港を望むビューポイント。夕方のサンセットタイムが人気です。",
      opening_hours: "6:30 - 20:30",
      created_by: ownerId,
    },
  ];
}

function buildSeedReviews(primaryAuthorId, collaboratorId) {
  return [
    {
      courtId: "11111111-aaaa-4bbb-cccc-000000000001",
      entries: [
        { rating: 5, authorId: primaryAuthorId, comment: "木漏れ日が気持ちよく、コートも整備されています。" },
        { rating: 5, authorId: collaboratorId, comment: "代々木公園の散歩帰りにプレー。夜も明るくて◎" },
        { rating: 4, authorId: primaryAuthorId, comment: "休日は混むので早めの時間がおすすめ。" },
      ],
    },
    {
      courtId: "11111111-aaaa-4bbb-cccc-000000000002",
      entries: [
        { rating: 5, authorId: collaboratorId, comment: "ロッカーも完備されていて快適。景色も最高です。" },
        { rating: 4, authorId: primaryAuthorId, comment: "有料だけどメンテが良く、試合形式で遊べる。" },
        { rating: 4, authorId: collaboratorId, comment: "ナイトゲームでも視認性が高くて安心。" },
      ],
    },
    {
      courtId: "11111111-aaaa-4bbb-cccc-000000000003",
      entries: [
        { rating: 4, authorId: primaryAuthorId, comment: "アクセス抜群。休日のピックアップが楽しい。" },
        { rating: 4, authorId: collaboratorId, comment: "屋上の景色が最高で風通しも良いです。" },
      ],
    },
    {
      courtId: "11111111-aaaa-4bbb-cccc-000000000004",
      entries: [
        { rating: 3, authorId: primaryAuthorId, comment: "イベント開催時は利用制限あり。事前確認推奨。" },
        { rating: 4, authorId: collaboratorId, comment: "コートは綺麗。更衣室も使いやすい。" },
        { rating: 3, authorId: primaryAuthorId, comment: "週末は予約が必要でした。" },
      ],
    },
    {
      courtId: "11111111-aaaa-4bbb-cccc-000000000005",
      entries: [
        { rating: 5, authorId: collaboratorId, comment: "夕日を眺めながらプレーできて気持ちいい！" },
        { rating: 5, authorId: primaryAuthorId, comment: "芝生エリアで休憩もできて清潔です。" },
        { rating: 4, authorId: collaboratorId, comment: "リングの高さが正確でシュート練習に最適。" },
      ],
    },
  ];
}

async function seedCourts(ownerId) {
  const courts = buildSeedCourts(ownerId);
  const courtIds = courts.map((court) => court.id);

  const { error: deleteError } = await supabase.from("courts").delete().in("id", courtIds);
  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await supabase.from("courts").insert(courts);
  if (insertError) {
    throw insertError;
  }

  console.info(`🏀 Inserted ${courts.length} courts`);
  return courts;
}

async function seedReviews(primaryAuthorId, collaboratorId) {
  const reviewSets = buildSeedReviews(primaryAuthorId, collaboratorId);
  const courtIds = reviewSets.map((item) => item.courtId);

  const { error: deleteError } = await supabase.from("reviews").delete().in("court_id", courtIds);
  if (deleteError) {
    throw deleteError;
  }

  const rows = reviewSets.flatMap((item) =>
    item.entries.map((entry) => ({
      id: crypto.randomUUID(),
      court_id: item.courtId,
      author_id: entry.authorId,
      rating: entry.rating,
      comment: entry.comment,
    })),
  );

  const { error: insertError } = await supabase.from("reviews").insert(rows);
  if (insertError) {
    throw insertError;
  }

  console.info(`📝 Inserted ${rows.length} reviews`);
}

async function inspectRanking() {
  const { data, error } = await supabase
    .from("court_with_stats")
    .select("name, average_rating, review_count")
    .order("average_rating", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) {
    throw error;
  }

  console.info("📊 Ranking preview");
  console.table(
    (data ?? []).map((row, index) => ({
      rank: index + 1,
      name: row.name,
      average: row.average_rating ? Number(row.average_rating).toFixed(2) : null,
      reviews: row.review_count,
    })),
  );
}

async function inspectTagFilter(tag) {
  const { data, error } = await supabase
    .from("court_with_stats")
    .select("name, facility_tags")
    .contains("facility_tags", [tag]);

  if (error) {
    throw error;
  }

  console.info(`🏷️ Courts with tag "${tag}"`);
  console.table(
    (data ?? []).map((row) => ({
      name: row.name,
      tags: row.facility_tags?.join(", "),
    })),
  );
}

async function inspectNearby(lat, lng) {
  const { data, error } = await supabase.rpc("courts_nearby", {
    lat,
    lng,
    radius_m: 6000,
    limit_count: 5,
  });

  if (error) {
    throw error;
  }

  console.info("🧭 Nearby lookup sample");
  console.table(
    (data ?? []).map((row) => ({
      name: row.name,
      distance_km: row.distance_m ? (row.distance_m / 1000).toFixed(2) : null,
    })),
  );
}

async function main() {
  console.info("🚀 Seeding Supabase with dummy courts…");

  const seedOwner = await ensureUser("maps-seed-owner@example.com", "Seed Owner");
  const seedReviewer = await ensureUser("maps-reviewer@example.com", "Seed Reviewer");

  await seedCourts(seedOwner.id);
  await seedReviews(seedOwner.id, seedReviewer.id);

  await inspectRanking();
  await inspectTagFilter("照明");
  await inspectTagFilter("駐車場");
  await inspectNearby(35.681236, 139.767125); // 東京駅周辺

  console.info("✅ Dummy data ready. Check the dashboard or run the app to confirm.");
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
