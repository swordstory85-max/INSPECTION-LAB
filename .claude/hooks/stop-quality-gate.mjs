#!/usr/bin/env node
// Stop hook: 응답을 끝내기 전에 lint/build/타입체크/파일 길이(300줄)를 검사한다.
// 하나라도 실패하면 종료를 막고(decision: block) 실패 내용을 reason으로 돌려준다.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { spawnSync } from "node:child_process";

const MAX_LINES = 300;
const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function runScript(npmScript) {
  const result = spawnSync("npm", ["run", "--silent", npmScript], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, output };
}

function findOversizedFiles(rootDir) {
  const offenders = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))) {
        let lineCount;
        try {
          const content = readFileSync(fullPath, "utf8");
          lineCount = content.split("\n").length;
        } catch {
          continue;
        }
        if (lineCount > MAX_LINES) {
          offenders.push({ path: relative(rootDir, fullPath), lineCount });
        }
      }
    }
  }

  walk(rootDir);
  return offenders;
}

const raw = readStdin();

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  payload = {};
}

// stop_hook_active가 true면 이미 이 Stop 훅이 한 번 개입해 재개된 상태다.
// 같은 실패로 무한 반복되는 것을 막기 위해 다시 막지 않고 그대로 종료한다.
if (payload?.stop_hook_active === true) {
  process.exit(0);
}

const failures = [];

const lint = runScript("lint");
if (!lint.ok) {
  failures.push(`[lint 실패]\n${lint.output}`);
}

const typecheck = runScript("typecheck");
if (!typecheck.ok) {
  failures.push(`[타입체크 실패]\n${typecheck.output}`);
}

const build = runScript("build");
if (!build.ok) {
  failures.push(`[build 실패]\n${build.output}`);
}

const oversized = findOversizedFiles(process.cwd());
if (oversized.length > 0) {
  const list = oversized
    .map((f) => `  - ${f.path} (${f.lineCount}줄, 최대 ${MAX_LINES}줄)`)
    .join("\n");
  failures.push(`[파일 길이 초과]\n${list}`);
}

if (failures.length > 0) {
  const reason = [
    "Stop 훅 품질 검사 실패 — 아래 항목을 해결한 뒤 다시 시도하세요.",
    ...failures,
  ].join("\n\n");
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

process.exit(0);
