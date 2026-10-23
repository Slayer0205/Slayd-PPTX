begin;
create table if not exists public.payment_orders(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
  slides integer not null check(slides between 1 and 1000),
  amount_uzs integer generated always as (slides*750) stored,
  receipt_path text unique not null,
  status text not null default 'submitted' check(status in('submitted','approved','rejected')),
  rejection_reason text,bank_reference text unique,reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),reviewed_at timestamptz
);
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon,authenticated;
grant select on public.payment_orders to authenticated;
drop policy if exists payment_owner_read on public.payment_orders;
create policy payment_owner_read on public.payment_orders for select to authenticated using(user_id=auth.uid());
create table if not exists public.payment_audit(
  id bigint generated always as identity primary key,order_id uuid not null references public.payment_orders(id),
  actor uuid not null references auth.users(id),event text not null,created_at timestamptz not null default now()
);
alter table public.payment_audit enable row level security;
revoke all on public.payment_audit from anon,authenticated;

create or replace function public.create_payment_order(p_user uuid,p_slides integer,p_receipt text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare order_id uuid;
begin
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'unverified_account'; end if;
  if p_slides is null or p_slides not between 1 and 1000 or p_receipt is null
    or p_receipt !~ ('^'||p_user::text||'/[0-9a-f-]{36}\.(png|jpg|pdf)$') then raise exception 'invalid_order'; end if;
  insert into public.payment_orders(user_id,slides,receipt_path) values(p_user,p_slides,p_receipt) returning id into order_id;
  insert into public.payment_audit(order_id,actor,event) values(order_id,p_user,'submitted');return order_id;
end $$;
create or replace function public.review_payment(p_order uuid,p_admin uuid,p_approve boolean,p_bank_reference text default null,p_reason text default null,p_bank_confirmed boolean default false)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.payment_orders; ref text;
begin
  if not exists(select 1 from public.admin_memberships where user_id=p_admin) then raise exception 'unauthorized'; end if;
  if p_approve is null then raise exception 'invalid_decision'; end if;
  select * into o from public.payment_orders where id=p_order for update;
  if not found then raise exception 'order_not_found'; end if;
  if p_approve then
    ref:=upper(regexp_replace(trim(coalesce(p_bank_reference,'')),'\s+','','g'));
    if p_bank_confirmed is distinct from true or length(ref) not between 6 and 100 then raise exception 'bank_confirmation_required'; end if;
    if o.status='approved' and o.bank_reference=ref then return 'approved'; end if;
    if o.status<>'submitted' then raise exception 'already_reviewed'; end if;
    if exists(select 1 from public.payment_orders where bank_reference=ref) then raise exception 'duplicate_bank_reference'; end if;
    -- Unique reference and wallet allocation commit together or not at all.
    update public.payment_orders set status='approved',bank_reference=ref,reviewed_by=p_admin,reviewed_at=now() where id=o.id;
    insert into public.wallets(user_id) values(o.user_id) on conflict do nothing;
    update public.wallets set paid_remaining=paid_remaining+o.slides where user_id=o.user_id;
    insert into public.payment_audit(order_id,actor,event) values(o.id,p_admin,'approved_after_bank_confirmation');
    return 'approved';
  else
    if length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'reason_required'; end if;
    if o.status='rejected' and o.rejection_reason=trim(p_reason) then return 'rejected'; end if;
    if o.status<>'submitted' then raise exception 'already_reviewed'; end if;
    update public.payment_orders set status='rejected',rejection_reason=trim(p_reason),reviewed_by=p_admin,reviewed_at=now() where id=o.id;
    insert into public.payment_audit(order_id,actor,event) values(o.id,p_admin,'rejected');return 'rejected';
  end if;
end $$;
revoke all on function public.create_payment_order(uuid,integer,text),public.review_payment(uuid,uuid,boolean,text,text,boolean) from public,anon,authenticated;
grant execute on function public.create_payment_order(uuid,integer,text),public.review_payment(uuid,uuid,boolean,text,text,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-receipts','payment-receipts',false,5000000,array['image/jpeg','image/png','application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists receipts_owner_insert on storage.objects;
create policy receipts_owner_insert on storage.objects for insert to authenticated with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
-- No public read or update policy. URLs are signed server-side after ownership checks.
drop policy if exists receipts_owner_cleanup on storage.objects;
create policy receipts_owner_cleanup on storage.objects for delete to authenticated using(bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.payment_orders where receipt_path=name));
commit;
