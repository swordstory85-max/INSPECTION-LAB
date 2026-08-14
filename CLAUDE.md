# CLAUDE.md

## 명령어

- 아직 `package.json`이 없다 — 등록된 npm 명령어가 없다 (LB-101 완료 전까지는 정상 상태).
- `node tools/backlog.mjs list` — backlog.json 작업을 id/상태/제목으로 한 줄씩 출력한다.
- `node tools/backlog.mjs set <id> <status>` — 작업 상태를 바꿔 backlog.json에 저장한다.
- `node tools/backlog.mjs validate` — backlog.json 형식을 검사해 VALID 또는 문제 목록을 출력한다.

## 구조

- `BRIEF.md` — 최초 요구사항 원본. 배경·목표 문구의 기준.
- `SPEC.md` — 화면 흐름·데이터 구조(필드명)·저장 제약·완료 조건의 기준. BRIEF.md와 다르면 SPEC.md를 따른다.
- `backlog.json` — 작업 목록과 각 작업 상태의 기준(SSOT).
- `tools/backlog.mjs` — backlog.json을 읽고 쓰는 유일한 스크립트.
- `.claude/rules/점검기록-데이터.md` — `data/` 파일을 다룰 때 적용되는 저장 규칙(추가만 가능, 필수 항목, NG 메모 등)의 기준.

## 항상 지킬 것

- 검사 기록은 추가만 한다. 저장된 기록을 수정하거나 삭제하지 않는다.
- 화면 판정이 NG면 조치 메모 없이는 저장하지 않는다.
- 외부 DB나 사내 계정 로그인을 연동하지 않는다.
- `backlog.json`을 직접 편집하지 않는다. `node tools/backlog.mjs`의 list/set/validate로만 읽고 쓴다.

## backlog.json 작업 관련 코드를 수정한 뒤에는 항상

1. `code-reviewer` 서브에이전트를 호출해 변경된 파일을 검토한다.
2. 지적사항은 사용자에게 묻지 않고 전부 직접 반영한다(Critical/High/Low 가리지 않고 전부 고친다). 반영 후 변경 폭이 크면 다시 code-reviewer를 부를지는 상황에 따라 판단한다.
3. 이번에 구현한 게 backlog.json에 이미 있는 LB 작업이 아니라 사용자가 즉석에서 새로 요청한 기능/변경이면, `backlog-recorder` 서브에이전트를 호출해 backlog.json에 새 LB 항목으로 등록하고 done 처리한다.
4. 커밋 여부를 묻지 않고 바로 `git-committer` 서브에이전트를 호출한다(다만 push는 git-committer 자체 규칙상 하지 않는다 — push는 별도로 명시적 요청이 있을 때만 한다).
5. frontend 쪽 변경(화면/스타일)이었다면, 커밋 후 바로 재배포한다: `cd frontend && vercel deploy --prod --yes`. 배포 주소는 항상 https://frontend-kappa-two-64.vercel.app 로 고정된다(alias). 재배포 후에는 반드시 `cd ..`로 저장소 루트로 돌아온다 — 안 돌아오면 다음 Stop 훅이 잘못된 경로에서 실행되어 실패한다.
6. 이 1~5 과정 전체를 사용자 확인 없이 스스로 끝까지 진행한다(사용자가 "앞으로 묻지 말고 다 적용해줘"라고 명시적으로 요청함, 2026-08-14). 단, 요구사항 자체가 불명확하거나 여러 갈래로 해석되는 경우, 또는 기존 규칙(append-only, 외부 DB 금지 등)과 충돌하는 경우에는 예외적으로 먼저 확인한다.

## 배포

- frontend만 Vercel에 배포되어 있다: https://frontend-kappa-two-64.vercel.app (Vercel 프로젝트 swordstory85-maxs-projects/frontend). backend는 외부 DB 금지 규칙 때문에 로컬 SQLite를 유지해야 해서 Vercel에 올리지 않는다.
- backend는 로컬 PC에서 `cd backend && npm run dev`로 띄운 뒤, Cloudflare Tunnel(`cloudflared tunnel --url http://localhost:4000`)로 외부에 노출한다. 터널 URL은 실행할 때마다 바뀌므로, 바뀌면 Vercel 프로젝트의 `VITE_API_BASE_URL` 환경변수와 backend의 `CORS_ORIGIN` 환경변수(콤마로 여러 origin 허용)를 새 URL로 맞춰야 한다.
- 로컬 backend와 터널이 꺼져 있으면 배포된 사이트는 화면만 뜨고 API 호출은 실패한다. 배포 주소를 사용자에게 안내할 때는 이 전제를 함께 알려준다.
- 프론트만 재배포하면 되는 상황(코드 변경만 있고 API 주소/CORS는 그대로)에서는 `cd frontend && vercel deploy --prod --yes` 한 번이면 충분하다.

## 막히면

- `node tools/backlog.mjs validate`를 실행해 VALID인지 먼저 확인한다.
- `package.json`이 있는지 확인한다. 없으면 LB-101이 아직 끝나지 않은 것이다.
- `node -v`로 Node 버전을 확인한다 (fs/path/url 표준 모듈만 쓰므로 최신 LTS면 충분하다).
- 포트 충돌을 확인한다: backend는 4000, frontend는 5173을 쓴다 (backlog.json LB-102, LB-104 참고).
- `node tools/backlog.mjs list`로 지금 어떤 작업까지 done인지 확인하고 그 다음 작업부터 진행한다.
