const supabase = require("./supabaseClient.js");
const { httpError } = require("./httpError.js");

function trimFields({ name, employee_id, contact }) {
  return { name: name.trim(), employee_id: employee_id.trim(), contact: contact.trim() };
}

async function listRegisteredInspectors() {
  const { data, error } = await supabase
    .from("registered_inspector")
    .select("id, name, employee_id, contact, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw httpError(`Supabase 검사자 명부 조회 실패: ${error.message}`, 502);
  }

  return data;
}

async function findRegisteredInspectorByEmployeeId(employeeId) {
  const { data, error } = await supabase
    .from("registered_inspector")
    .select("id, name, employee_id, contact")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    throw httpError(`Supabase 검사자 명부 조회 실패: ${error.message}`, 502);
  }

  return data;
}

async function createRegisteredInspector(payload) {
  const { name, employee_id, contact } = trimFields(payload);
  const { data, error } = await supabase
    .from("registered_inspector")
    .insert({ name, employee_id, contact })
    .select("id, name, employee_id, contact, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw httpError(`이미 등록된 사번입니다: ${employee_id}`, 400);
    }
    throw httpError(`Supabase 검사자 등록 실패: ${error.message}`, 502);
  }

  return data;
}

async function updateRegisteredInspector(id, payload) {
  const { name, employee_id, contact } = trimFields(payload);
  const { data, error } = await supabase
    .from("registered_inspector")
    .update({ name, employee_id, contact, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, employee_id, contact, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw httpError(`이미 등록된 사번입니다: ${employee_id}`, 400);
    }
    throw httpError(`Supabase 검사자 수정 실패: ${error.message}`, 502);
  }

  if (!data) {
    throw httpError(`ID ${id}인 등록된 검사자가 없습니다.`, 404);
  }

  return data;
}

async function deleteRegisteredInspector(id) {
  const { data, error } = await supabase
    .from("registered_inspector")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw httpError(`Supabase 검사자 삭제 실패: ${error.message}`, 502);
  }

  if (!data) {
    throw httpError(`ID ${id}인 등록된 검사자가 없습니다.`, 404);
  }
}

module.exports = {
  listRegisteredInspectors,
  findRegisteredInspectorByEmployeeId,
  createRegisteredInspector,
  updateRegisteredInspector,
  deleteRegisteredInspector,
};
