#!/usr/bin/env node
// PreToolUse hook: backlog.json을 Read/Edit/Write 도구로 직접 건드리는 것을 막는다.
// tools/backlog.mjs(list/set/validate)로만 읽고 쓰게 강제한다.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const raw = readStdin();

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;

if (typeof filePath === "string" && basename(filePath) === "backlog.json") {
  const message = "백로그는 tools/backlog.mjs로만 읽고 수정할 수 있습니다. list/set/validate를 쓰세요.";
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: message,
    },
    systemMessage: message,
  }));
}

process.exit(0);
