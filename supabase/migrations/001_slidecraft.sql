-- Additive migration. Review and apply to a NEW Supabase project only.
-- This is a new implementation, not a migration of the legacy commercial app.
begin;

create table if not exists public.projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists projects_owner_read on public.projects;
create policy projects_owner_read on public.projects for select to authenticated using (owner_id=auth.uid());
revoke all on public.projects from anon, authenticated;
grant select on public.projects to authenticated;

create or replace function public.save_project(p_id uuid,p_expected_revision integer,p_document jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision integer; result_revision integer; who uuid:=auth.uid();
begin
  if who is null then raise exception 'unauthorized'; end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'invalid_revision'; end if;
  if p_document is null or jsonb_typeof(p_document)<>'object' or p_document->>'id' is distinct from p_id::text
     or p_document->>'schemaVersion' is distinct from '1' or jsonb_typeof(p_document->'slides') is distinct from 'array'
     or length(coalesce(p_document->>'title','')) not between 1 and 160 or octet_length(p_document::text)>20000000 then raise exception 'invalid_document'; end if;
  if jsonb_array_length(p_document->'slides') not between 1 and 100 then raise exception 'invalid_slide_count'; end if;
  -- Serialize first-save races as well as updates. An ID never changes ownership.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select revision into current_revision from public.projects where id=p_id and owner_id=who for update;
  if found then
    if current_revision<>p_expected_revision then raise exception 'revision_conflict'; end if;
    update public.projects set document=p_document,revision=revision+1,updated_at=now() where id=p_id returning revision into result_revision;
  else
    if p_expected_revision<>0 or exists(select 1 from public.projects where id=p_id) then raise exception 'revision_conflict'; end if;
    insert into public.projects(id,owner_id,document) values(p_id,who,p_document) returning revision into result_revision;
  end if;
  return result_revision;
end $$;
revoke all on function public.save_project(uuid,integer,jsonb) from public;
grant execute on function public.save_project(uuid,integer,jsonb) to authenticated;

create table if not exists public.project_shares (
  token_hash text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
alter table public.project_shares enable row level security;
revoke all on public.project_shares from anon,authenticated;
create or replace function public.create_project_share(p_project uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare token text; doc jsonb;
begin
  select document into doc from public.projects where id=p_project and owner_id=auth.uid();
  if not found then raise exception 'unauthorized'; end if;
  -- Notes are private; share an immutable snapshot of slide content only.
  doc:=jsonb_set(doc,'{slides}',(select jsonb_agg(s.value||'{"notes":""}'::jsonb) from jsonb_array_elements(doc->'slides') s));
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.project_shares(token_hash,project_id,owner_id,snapshot,expires_at)
    values(encode(sha256(convert_to(token,'UTF8')),'hex'),p_project,auth.uid(),doc,now()+interval '7 days');
  return token;
end $$;
create or replace function public.read_shared_project(p_token text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select snapshot from public.project_shares where length(p_token)=64
    and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now();
$$;
create or replace function public.revoke_project_shares(p_project uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not exists(select 1 from public.projects where id=p_project and owner_id=auth.uid()) then raise exception 'unauthorized'; end if;
  update public.project_shares set revoked_at=now() where project_id=p_project and owner_id=auth.uid() and revoked_at is null;
end $$;
revoke all on function public.create_project_share(uuid),public.read_shared_project(text),public.revoke_project_shares(uuid) from public;
grant execute on function public.create_project_share(uuid),public.revoke_project_shares(uuid) to authenticated;
grant execute on function public.read_shared_project(text) to anon,authenticated;

-- Administration is an explicit server-managed role, never an email/client flag.
create table if not exists public.admin_memberships(user_id uuid primary key references auth.users(id));
alter table public.admin_memberships enable row level security;
revoke all on public.admin_memberships from anon,authenticated;
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id),
  free_remaining integer not null default 15 check(free_remaining between 0 and 15),
  paid_remaining integer not null default 0 check(paid_remaining>=0)
);
alter table public.wallets enable row level security;
revoke all on public.wallets from anon,authenticated;
grant select on public.wallets to authenticated;
drop policy if exists wallet_owner_read on public.wallets;
create policy wallet_owner_read on public.wallets for select to authenticated using(user_id=auth.uid());
create table if not exists public.generation_reservations (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
  request_id uuid not null, free_used integer not null check(free_used>=0), paid_used integer not null check(paid_used>=0),
  status text not null default 'pending' check(status in ('pending','completed','refunded')),
  created_at timestamptz not null default now(),settled_at timestamptz, unique(user_id,request_id)
);
alter table public.generation_reservations enable row level security;
revoke all on public.generation_reservations from anon,authenticated;
create table if not exists public.generation_audit (
  id bigint generated always as identity primary key,reservation_id uuid not null references public.generation_reservations(id),
  event text not null check(event in('reserved','completed','refunded')),created_at timestamptz not null default now()
);
alter table public.generation_audit enable row level security;
revoke all on public.generation_audit from anon,authenticated;

create or replace function public.reserve_generation(p_user uuid,p_count integer,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare w public.wallets; f integer; p integer; reservation uuid;
begin
  if p_user is null or p_request is null or p_count is null or p_count not between 1 and 20 then raise exception 'invalid_count'; end if;
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'unverified_account'; end if;
  insert into public.wallets(user_id) values(p_user) on conflict(user_id) do nothing;
  select * into w from public.wallets where user_id=p_user for update;
  if exists(select 1 from public.generation_reservations where user_id=p_user and request_id=p_request) then raise exception 'duplicate_request'; end if;
  if exists(select 1 from public.admin_memberships where user_id=p_user) then f:=0;p:=0;
  else f:=least(w.free_remaining,p_count);p:=p_count-f;
    if w.paid_remaining<p then raise exception 'quota_exceeded'; end if;
    update public.wallets set free_remaining=free_remaining-f,paid_remaining=paid_remaining-p where user_id=p_user;
  end if;
  insert into public.generation_reservations(user_id,request_id,free_used,paid_used) values(p_user,p_request,f,p) returning id into reservation;
  insert into public.generation_audit(reservation_id,event) values(reservation,'reserved');
  return reservation;
end $$;
create or replace function public.finish_generation(p_reservation uuid,p_user uuid,p_success boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.generation_reservations; target text;
begin
  if p_success is null then raise exception 'invalid_success'; end if;
  -- Same lock order as reserve_generation; wallet always exists for a valid reservation.
  perform 1 from public.wallets where user_id=p_user for update;
  select * into r from public.generation_reservations where id=p_reservation and user_id=p_user for update;
  if not found then raise exception 'invalid_reservation'; end if;
  target:=case when p_success then 'completed' else 'refunded' end;
  if r.status=target then return; end if;
  if r.status<>'pending' then raise exception 'already_finalized'; end if;
  if not p_success then update public.wallets set free_remaining=free_remaining+r.free_used,paid_remaining=paid_remaining+r.paid_used where user_id=p_user; end if;
  update public.generation_reservations set status=target,settled_at=now() where id=r.id;
  insert into public.generation_audit(reservation_id,event) values(r.id,target);
end $$;
-- Interrupted workers can leave reservations pending. Run via a trusted scheduler.
create or replace function public.release_stale_generations()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; released integer:=0;
begin
  for r in select id,user_id from public.generation_reservations where status='pending' and created_at<now()-interval '1 hour' order by user_id,id loop
    perform public.finish_generation(r.id,r.user_id,false);released:=released+1;
  end loop;
  return released;
end $$;
revoke all on function public.reserve_generation(uuid,integer,uuid),public.finish_generation(uuid,uuid,boolean),public.release_stale_generations() from public,anon,authenticated;
grant execute on function public.reserve_generation(uuid,integer,uuid),public.finish_generation(uuid,uuid,boolean),public.release_stale_generations() to service_role;
commit;
