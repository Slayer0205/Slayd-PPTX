begin;
create table if not exists public.telegram_admins(
  telegram_user_id bigint primary key,
  user_id uuid not null references public.admin_memberships(user_id) on delete cascade
);
alter table public.telegram_admins enable row level security;
revoke all on public.telegram_admins from anon,authenticated;
grant select on public.admin_memberships,public.wallets,public.payment_orders,public.telegram_admins to service_role;
commit;
