#!/usr/bin/env node
// backlog.json 관리 스크립트. 외부 패키지 없이 Node 표준 기능만 사용한다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BACKLOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "backlog.json");

const REQUIRED_FIELDS = [
  "id", "status", "priority", "category", "title", "summary",
  "where", "parent", "deps", "doc", "done_at", "note",
];
const ID_PATTERN = /^LB-\d{3}$/;

function loadBacklog() {
  const raw = readFileSync(BACKLOG_PATH, "utf8");
  return JSON.parse(raw);
}

function saveBacklog(data) {
  writeFileSync(BACKLOG_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function cmdList(data) {
  for (const t of data.tasks) {
    console.log(`${t.id}\t${t.status}\t${t.title}`);
  }
}

function cmdShow(data, id) {
  if (!id) {
    console.error("사용법: node tools/backlog.mjs show <id>");
    process.exit(1);
  }
  const task = data.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`거부: id "${id}"를 가진 작업을 찾을 수 없습니다.`);
    process.exit(1);
  }
  console.log(JSON.stringify(task, null, 2));
}

function cmdSet(data, id, status) {
  if (!id || !status) {
    console.error("사용법: node tools/backlog.mjs set <id> <status>");
    process.exit(1);
  }
  const allowed = data.enums?.status ?? [];
  if (!allowed.includes(status)) {
    console.error(`거부: "${status}"는 허용되지 않는 status 값입니다. 허용값: ${allowed.join(", ")}`);
    process.exit(1);
  }
  const task = data.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`거부: id "${id}"를 가진 작업을 찾을 수 없습니다.`);
    process.exit(1);
  }
  const prev = task.status;
  task.status = status;
  saveBacklog(data);
  console.log(`${id}: ${prev} -> ${status}`);
}

function cmdAdd(data, jsonArg) {
  if (!jsonArg) {
    console.error("사용법: node tools/backlog.mjs add '<json>'");
    console.error("  필수 필드: id, priority, category, title, summary, where, note");
    console.error("  선택 필드: deps(배열, 기본 []), parent(기본 null), doc(기본 null)");
    console.error("  status는 항상 \"todo\"로 생성된다. 바꾸려면 set 명령을 쓴다.");
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(jsonArg);
  } catch (err) {
    console.error(`거부: JSON 파싱 실패 - ${err.message}`);
    process.exit(1);
  }

  const REQUIRED_INPUT_FIELDS = ["id", "priority", "category", "title", "summary", "where", "note"];
  for (const field of REQUIRED_INPUT_FIELDS) {
    if (typeof input[field] !== "string" || input[field].trim() === "") {
      console.error(`거부: "${field}"는 비어 있지 않은 문자열이어야 합니다.`);
      process.exit(1);
    }
  }

  if (!ID_PATTERN.test(input.id)) {
    console.error(`거부: id 형식이 LB-숫자3자리(예: LB-101)가 아닙니다. (입력값: ${input.id})`);
    process.exit(1);
  }
  if (data.tasks.some((t) => t.id === input.id)) {
    console.error(`거부: id "${input.id}"는 이미 존재합니다.`);
    process.exit(1);
  }

  const enums = data.enums ?? {};
  if (!(enums.priority ?? []).includes(input.priority)) {
    console.error(`거부: priority "${input.priority}"는 허용되지 않습니다. 허용값: ${(enums.priority ?? []).join(", ")}`);
    process.exit(1);
  }
  if (!(enums.category ?? []).includes(input.category)) {
    console.error(`거부: category "${input.category}"는 허용되지 않습니다. 허용값: ${(enums.category ?? []).join(", ")}`);
    process.exit(1);
  }

  if (input.deps !== undefined && !Array.isArray(input.deps)) {
    console.error('거부: "deps"는 배열이어야 합니다.');
    process.exit(1);
  }
  for (const dep of input.deps ?? []) {
    if (!data.tasks.some((t) => t.id === dep)) {
      console.error(`거부: deps에 있는 id "${dep}"가 backlog에 없습니다.`);
      process.exit(1);
    }
  }

  const task = {
    id: input.id,
    status: "todo",
    priority: input.priority,
    category: input.category,
    title: input.title,
    summary: input.summary,
    where: input.where,
    parent: input.parent ?? null,
    deps: input.deps ?? [],
    doc: input.doc ?? null,
    done_at: null,
    note: input.note,
  };

  data.tasks.push(task);
  saveBacklog(data);
  console.log(`추가됨: ${task.id}\t${task.status}\t${task.title}`);
}

function cmdValidate(data) {
  const issues = [];

  if (!data.enums) {
    issues.push("최상위 enums 객체가 없습니다.");
  }
  if (!Array.isArray(data.tasks)) {
    issues.push("최상위 tasks 배열이 없습니다.");
    printValidateResult(issues);
    return;
  }

  const enums = data.enums ?? {};
  const seenIds = new Set();

  data.tasks.forEach((t, idx) => {
    const label = t && typeof t.id === "string" ? t.id : `tasks[${idx}]`;

    for (const field of REQUIRED_FIELDS) {
      if (!t || !(field in t)) {
        issues.push(`${label}: 필수 필드 "${field}"가 없습니다.`);
      }
    }
    if (!t) return;

    if (typeof t.id !== "string" || !ID_PATTERN.test(t.id)) {
      issues.push(`${label}: id 형식이 LB-숫자3자리(예: LB-101)가 아닙니다. (현재: ${JSON.stringify(t.id)})`);
    } else if (seenIds.has(t.id)) {
      issues.push(`${label}: id가 중복되었습니다.`);
    } else {
      seenIds.add(t.id);
    }

    if (enums.status && !enums.status.includes(t.status)) {
      issues.push(`${label}: status "${t.status}"는 enums.status에 없습니다. 허용값: ${enums.status.join(", ")}`);
    }
    if (enums.priority && !enums.priority.includes(t.priority)) {
      issues.push(`${label}: priority "${t.priority}"는 enums.priority에 없습니다. 허용값: ${enums.priority.join(", ")}`);
    }
    if (enums.category && !enums.category.includes(t.category)) {
      issues.push(`${label}: category "${t.category}"는 enums.category에 없습니다. 허용값: ${enums.category.join(", ")}`);
    }

    for (const field of ["title", "summary", "where", "note"]) {
      if (t[field] !== undefined && (typeof t[field] !== "string" || t[field].trim() === "")) {
        issues.push(`${label}: "${field}"는 비어 있지 않은 문자열이어야 합니다.`);
      }
    }
    if (t.deps !== undefined && !Array.isArray(t.deps)) {
      issues.push(`${label}: "deps"는 배열이어야 합니다.`);
    }
  });

  printValidateResult(issues);
}

function printValidateResult(issues) {
  if (issues.length === 0) {
    console.log("VALID");
    return;
  }
  console.log(`INVALID (${issues.length}건)`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  process.exitCode = 1;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const data = loadBacklog();

  switch (command) {
    case "list":
      cmdList(data);
      break;
    case "show":
      cmdShow(data, args[0]);
      break;
    case "set":
      cmdSet(data, args[0], args[1]);
      break;
    case "add":
      cmdAdd(data, args[0]);
      break;
    case "validate":
      cmdValidate(data);
      break;
    default:
      console.error("사용법:");
      console.error("  node tools/backlog.mjs list");
      console.error("  node tools/backlog.mjs show <id>");
      console.error("  node tools/backlog.mjs set <id> <status>");
      console.error("  node tools/backlog.mjs add '<json>'");
      console.error("  node tools/backlog.mjs validate");
      process.exit(1);
  }
}

main();
