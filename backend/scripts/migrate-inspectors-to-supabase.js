// 1회성 백필 스크립트. 로컬 SQLite inspection 테이블에 남아 있던 검사자 컬럼을
// Supabase inspector 테이블로 옮기고 그 컬럼들을 drop한다. 이미 이 저장소에서
// 한 번 실행되어 완료된 상태이며(하단 hasInspectorColumns 가드로 재실행해도
// 안전하게 no-op), 이후 다른 환경에서 구버전 data.sqlite를 이어받았을 때를 위해 남겨둔다.
const db = require("../db.js");
const supabase = require("../supabaseClient.js");

async function migrate() {
  const hasInspectorColumns = db
    .prepare(`PRAGMA table_info(inspection)`)
    .all()
    .some((column) => column.name === "inspector_name");

  if (!hasInspectorColumns) {
    console.log("이미 마이그레이션되어 있습니다 (inspector_name 컬럼 없음).");
    return;
  }

  const rows = db
    .prepare(
      `SELECT id, inspector_name, inspector_id, inspector_contact FROM inspection ORDER BY id`,
    )
    .all();

  if (rows.length > 0) {
    const { error } = await supabase.from("inspector").upsert(
      rows.map((row) => ({
        inspection_id: row.id,
        inspector_name: row.inspector_name,
        inspector_id: row.inspector_id,
        inspector_contact: row.inspector_contact,
      })),
      { onConflict: "inspection_id" },
    );

    if (error) {
      throw new Error(`Supabase 백필 실패: ${error.message}`);
    }
  }

  db.exec(`
    ALTER TABLE inspection DROP COLUMN inspector_name;
    ALTER TABLE inspection DROP COLUMN inspector_id;
    ALTER TABLE inspection DROP COLUMN inspector_contact;
  `);

  console.log(`마이그레이션 완료: 검사자 정보 ${rows.length}건을 Supabase로 이전`);
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { migrate };
