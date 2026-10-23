begin;
create table if not exists public.referral_codes(user_id uuid primary key references auth.users(id),code text unique not null);
create table if not exists public.referrals(
  referred_id uuid primary key references auth.users(id),inviter_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),rewarded_at timestamptz,check(referred_id<>inviter_id)
);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.referral_codes,public.referrals from anon,authenticated;
grant select on public.referral_codes,public.referrals to authenticated;
drop policy if exists referral_code_owner on public.referral_codes;
create policy referral_code_owner on public.referral_codes for select to authenticated using(user_id=auth.uid());
drop policy if exists referrals_owner on public.referrals;
create policy referrals_owner on public.referrals for select to authenticated using(inviter_id=auth.uid() or referred_id=auth.uid());
create or replace function public.get_referral_code()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare code_value text;
begin
  if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'unverified_account'; end if;
  insert into public.referral_codes(user_id,code) values(auth.uid(),replace(gen_random_uuid()::text,'-','')) on conflict(user_id) do nothing;
  select code into code_value from public.referral_codes where user_id=auth.uid();return code_value;
end $$;
create or replace function public.claim_referral(p_code text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare inviter uuid; joined timestamptz;
begin
  select created_at into joined from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if not found or joined<now()-interval '7 days' then raise exception 'not_eligible'; end if;
  select c.user_id into inviter from public.referral_codes c join auth.users u on u.id=c.user_id
    where c.code=p_code and u.email_confirmed_at is not null and u.created_at<joined;
  if not found or inviter=auth.uid() then raise exception 'invalid_referral'; end if;
  insert into public.wallets(user_id) values(auth.uid()) on conflict do nothing;
  perform 1 from public.wallets where user_id=auth.uid() for update;
  if exists(select 1 from public.generation_reservations where user_id=auth.uid() and status='completed') then raise exception 'claim_before_first_generation'; end if;
  insert into public.referrals(referred_id,inviter_id) values(auth.uid(),inviter) on conflict(referred_id) do nothing;
  if not exists(select 1 from public.referrals where referred_id=auth.uid() and inviter_id=inviter) then raise exception 'already_claimed'; end if;
end $$;
create or replace function public.award_qualified_referral()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare inviter uuid;
begin
  if new.status<>'completed' or old.status<>'pending' then return new; end if;
  select inviter_id into inviter from public.referrals where referred_id=new.user_id and rewarded_at is null;
  if inviter is null or not exists(select 1 from auth.users where id=new.user_id and email_confirmed_at is not null) then return new; end if;
  insert into public.wallets(user_id) values(inviter) on conflict do nothing;
  perform 1 from public.wallets where user_id=inviter for update;
  -- The wallet lock serializes concurrent awards, including the lifetime reward cap.
  if (select count(*) from public.referrals where inviter_id=inviter and rewarded_at is not null)>=10 then return new; end if;
  update public.referrals set rewarded_at=now() where referred_id=new.user_id and rewarded_at is null;
  if found then update public.wallets set paid_remaining=paid_remaining+5 where user_id=inviter; end if;
  return new;
end $$;
drop trigger if exists qualified_referral_reward on public.generation_reservations;
create trigger qualified_referral_reward after update of status on public.generation_reservations for each row execute function public.award_qualified_referral();
revoke all on function public.get_referral_code(),public.claim_referral(text),public.award_qualified_referral() from public,anon,authenticated;
grant execute on function public.get_referral_code(),public.claim_referral(text) to authenticated;
commit;
