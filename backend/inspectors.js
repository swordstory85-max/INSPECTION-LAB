const supabase = require("./supabaseClient.js");
const { httpError } = require("./httpError.js");

const LOOKUP_CHUNK_SIZE = 200;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function insertInspector({
  inspection_id,
  inspector_name,
  inspector_id,
  inspector_contact,
}) {
  const { error } = await supabase
    .from("inspector")
    .insert({ inspection_id, inspector_name, inspector_id, inspector_contact });

  if (error) {
    throw httpError(`Supabase 검사자 정보 저장 실패: ${error.message}`, 502);
  }
}

async function getInspectorsByInspectionIds(inspectionIds) {
  const byInspectionId = new Map();
  if (inspectionIds.length === 0) {
    return byInspectionId;
  }

  for (const idsChunk of chunk(inspectionIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("inspector")
      .select("inspection_id, inspector_name, inspector_id, inspector_contact")
      .in("inspection_id", idsChunk);

    if (error) {
      throw httpError(`Supabase 검사자 정보 조회 실패: ${error.message}`, 502);
    }

    for (const row of data) {
      byInspectionId.set(row.inspection_id, {
        inspector_name: row.inspector_name,
        inspector_id: row.inspector_id,
        inspector_contact: row.inspector_contact,
      });
    }
  }

  return byInspectionId;
}

module.exports = { insertInspector, getInspectorsByInspectionIds };
