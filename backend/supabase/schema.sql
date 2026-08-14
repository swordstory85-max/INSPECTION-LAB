-- Supabase(Postgres) 프로젝트 agent_test(vurxbbcucdcbrpxrayva)에 적용된 스키마.
-- 실제 적용은 Supabase MCP apply_migration으로 이미 실행됨 — 이 파일은 재현/참고용 기록이다.

create table public.inspector (
  id bigint generated always as identity primary key,
  inspection_id bigint not null unique,
  inspector_name text not null,
  inspector_id text not null,
  inspector_contact text not null,
  recorded_at timestamptz not null default now()
);

-- 백엔드는 service_role 키로만 접근한다(RLS를 우회). anon/publishable 키로는
-- 정책이 없어 아무 것도 읽거나 쓸 수 없다 — 검사자 이름/사번/연락처가 개인정보라
-- 공개 키로 직접 노출하지 않기 위함.
alter table public.inspector enable row level security;
alter table public.inspector force row level security;

-- 검사 입력 화면에서 선택할 수 있는 "등록된 검사자" 목록. inspector 테이블(검사
-- 건당 1행, append-only 이력)과 달리 이 테이블은 수정/삭제가 허용되는 살아있는
-- 명부다 — employee_id(사번)를 유니크 키로 검사 저장 시 "등록된 사번인지"를 검증한다.
create table public.registered_inspector (
  id bigint generated always as identity primary key,
  name text not null,
  employee_id text not null unique,
  contact text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registered_inspector enable row level security;
alter table public.registered_inspector force row level security;
