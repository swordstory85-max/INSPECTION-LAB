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
