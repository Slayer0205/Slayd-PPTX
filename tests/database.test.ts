import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { newProject } from '../src/domain';
const a = 'b3edb9a1-182b-499d-8d79-2e87456cfafa',
  b = '79b7c3b4-b39a-423b-aae9-545fc54a32f0';
const migration = readFileSync(
  new URL('../supabase/migrations/001_slidecraft.sql', import.meta.url),
  'utf8',
);
let db: PGlite;
async function asUser(user: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('set role authenticated');
}
async function asServer() {
  await db.exec('reset role; set role service_role');
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,created_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant insert,select,delete on storage.objects to authenticated;create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`,
  );
  await db.exec(migration);
  await db.exec(
    readFileSync(new URL('../supabase/migrations/002_payments.sql', import.meta.url), 'utf8'),
  );
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/003_telegram_admins.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(
    readFileSync(new URL('../supabase/migrations/004_referrals.sql', import.meta.url), 'utf8'),
  );
}, 30000);
beforeEach(async () => {
  await db.exec(
    'reset role;truncate public.projects,public.wallets,public.admin_memberships,auth.users cascade',
  );
  await db.query(
    "insert into auth.users(id,email_confirmed_at,created_at) values($1,now(),now()-interval '2 days'),($2,now(),now()-interval '1 day')",
    [a, b],
  );
});
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL policies and transactional RPCs', () => {
  it('enforces project ownership and rejects stale revisions', async () => {
    const p = newProject('Private');
    await asUser(a);
    expect(
      (await db.query('select save_project($1,0,$2::jsonb) rev', [p.id, JSON.stringify(p)]))
        .rows[0],
    ).toEqual({ rev: 1 });
    await expect(
      db.query('select save_project($1,0,$2::jsonb)', [
        p.id,
        JSON.stringify({ ...p, title: 'Stale' }),
      ]),
    ).rejects.toThrow('revision_conflict');
    await asUser(b);
    expect((await db.query('select * from projects')).rows).toHaveLength(0);
    await expect(
      db.query('select save_project($1,0,$2::jsonb)', [p.id, JSON.stringify(p)]),
    ).rejects.toThrow('revision_conflict');
    await asUser(a);
    expect(
      (
        await db.query('select save_project($1,1,$2::jsonb) rev', [
          p.id,
          JSON.stringify({ ...p, title: 'New' }),
        ])
      ).rows[0],
    ).toEqual({ rev: 2 });
  });
  it('prevents client writes and privilege escalation', async () => {
    await asUser(a);
    await expect(db.query('insert into admin_memberships values($1)', [a])).rejects.toThrow(
      'permission denied',
    );
    await expect(
      db.query('select reserve_generation($1,1,gen_random_uuid())', [a]),
    ).rejects.toThrow('permission denied');
    await expect(db.query('update wallets set paid_remaining=1000')).rejects.toThrow(
      'permission denied',
    );
    await expect(db.query('select release_stale_generations()')).rejects.toThrow(
      'permission denied',
    );
  });
  it('shares only an opted-in snapshot without notes, with revocation and expiry', async () => {
    const p = newProject('Shared');
    p.slides[0].notes = 'Private speaker notes';
    await asUser(a);
    await db.query('select save_project($1,0,$2::jsonb)', [p.id, JSON.stringify(p)]);
    const { rows } = await db.query<{ token: string }>('select create_project_share($1) token', [
      p.id,
    ]);
    const token = rows[0].token;
    expect(token).toHaveLength(64);
    await db.exec('reset role;set role anon');
    const shared = await db.query<{ doc: typeof p }>('select read_shared_project($1) doc', [token]);
    expect(shared.rows[0].doc.slides[0].notes).toBe('');
    expect(
      (await db.query<{ doc: unknown }>('select read_shared_project($1) doc', ['wrong'])).rows[0]
        .doc,
    ).toBeNull();
    await expect(db.query('select * from project_shares')).rejects.toThrow('permission denied');
    await asUser(b);
    await expect(db.query('select revoke_project_shares($1)', [p.id])).rejects.toThrow(
      'unauthorized',
    );
    await asUser(a);
    await db.query('select revoke_project_shares($1)', [p.id]);
    expect(
      (await db.query<{ doc: unknown }>('select read_shared_project($1) doc', [token])).rows[0].doc,
    ).toBeNull();
    const second = (
      await db.query<{ token: string }>('select create_project_share($1) token', [p.id])
    ).rows[0].token;
    await db.exec("reset role;update project_shares set expires_at=now()-interval '1 day'");
    expect(
      (await db.query<{ doc: unknown }>('select read_shared_project($1) doc', [second])).rows[0]
        .doc,
    ).toBeNull();
  });
  it('reserves exactly 15 free slides, blocks overspend, and refunds once', async () => {
    await asServer();
    const request = crypto.randomUUID();
    const r = (
      await db.query<{ id: string }>('select reserve_generation($1,15,$2) id', [a, request])
    ).rows[0].id;
    await expect(
      db.query('select reserve_generation($1,1,gen_random_uuid())', [a]),
    ).rejects.toThrow('quota_exceeded');
    await expect(db.query('select reserve_generation($1,15,$2)', [a, request])).rejects.toThrow(
      'duplicate_request',
    );
    await db.query('select finish_generation($1,$2,false)', [r, a]);
    await db.query('select finish_generation($1,$2,false)', [r, a]);
    await db.exec('reset role');
    expect(
      (await db.query('select free_remaining,paid_remaining from wallets where user_id=$1', [a]))
        .rows[0],
    ).toEqual({ free_remaining: 15, paid_remaining: 0 });
    expect(
      (await db.query('select event from generation_audit where reservation_id=$1', [r])).rows,
    ).toEqual([{ event: 'reserved' }, { event: 'refunded' }]);
  });
  it('settles paid quota atomically and cannot refund completed work', async () => {
    await db.query('insert into wallets(user_id,free_remaining,paid_remaining) values($1,2,5)', [
      a,
    ]);
    await asServer();
    const r = (
      await db.query<{ id: string }>('select reserve_generation($1,5,gen_random_uuid()) id', [a])
    ).rows[0].id;
    await db.query('select finish_generation($1,$2,true)', [r, a]);
    await db.query('select finish_generation($1,$2,true)', [r, a]);
    await expect(db.query('select finish_generation($1,$2,false)', [r, a])).rejects.toThrow(
      'already_finalized',
    );
    await db.exec('reset role');
    expect(
      (await db.query('select free_remaining,paid_remaining from wallets where user_id=$1', [a]))
        .rows[0],
    ).toEqual({ free_remaining: 0, paid_remaining: 2 });
  });
  it('supports server-managed unlimited admins and recovers stranded reservations', async () => {
    await db.query('insert into admin_memberships values($1)', [a]);
    await asServer();
    await db.query('select reserve_generation($1,20,gen_random_uuid())', [a]);
    await db.query('select reserve_generation($1,20,gen_random_uuid())', [a]);
    await db.exec(
      "reset role;update generation_reservations set created_at=now()-interval '2 hours'",
    );
    await asServer();
    expect((await db.query('select release_stale_generations() n')).rows[0]).toEqual({ n: 2 });
    expect((await db.query('select release_stale_generations() n')).rows[0]).toEqual({ n: 0 });
    await db.exec('reset role');
    expect(
      (await db.query('select free_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ free_remaining: 15 });
  });
  it('can reapply the migration without resetting user balances', async () => {
    await db.query('insert into wallets(user_id,free_remaining) values($1,7)', [a]);
    await db.exec(migration);
    for (const file of ['002_payments.sql', '003_telegram_admins.sql', '004_referrals.sql'])
      await db.exec(
        readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'),
      );
    expect(
      (await db.query('select free_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ free_remaining: 7 });
  });
});

describe('payment ledger and private receipts', () => {
  async function order(user = a, slides = 10) {
    return (
      await db.query<{ id: string }>('select create_payment_order($1,$2,$3) id', [
        user,
        slides,
        `${user}/${crypto.randomUUID()}.png`,
      ])
    ).rows[0].id;
  }
  it('allocates credits once only after authorized bank confirmation', async () => {
    await db.query('insert into admin_memberships values($1)', [b]);
    await asServer();
    const o = await order();
    await expect(
      db.query('select review_payment($1,$2,true,$3,null,true)', [o, a, 'BANK-10001']),
    ).rejects.toThrow('unauthorized');
    await expect(
      db.query('select review_payment($1,$2,true,$3,null,false)', [o, b, 'BANK-10001']),
    ).rejects.toThrow('bank_confirmation_required');
    await db.query('select review_payment($1,$2,true,$3,null,true)', [o, b, 'BANK-10001']);
    await db.query('select review_payment($1,$2,true,$3,null,true)', [o, b, 'bank-10001']);
    await db.exec('reset role');
    expect(
      (await db.query('select paid_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ paid_remaining: 10 });
    expect(
      (await db.query("select * from payment_audit where event='approved_after_bank_confirmation'"))
        .rows,
    ).toHaveLength(1);
  });
  it('rejects reused bank references transactionally', async () => {
    await db.query('insert into admin_memberships values($1)', [b]);
    await asServer();
    const first = await order(),
      second = await order(a, 20);
    await db.query('select review_payment($1,$2,true,$3,null,true)', [first, b, 'REF-00001']);
    await expect(
      db.query('select review_payment($1,$2,true,$3,null,true)', [second, b, ' REF-00001 ']),
    ).rejects.toThrow('duplicate_bank_reference');
    await db.exec('reset role');
    expect(
      (await db.query('select paid_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ paid_remaining: 10 });
    expect(
      (await db.query('select status from payment_orders where id=$1', [second])).rows[0],
    ).toEqual({ status: 'submitted' });
  });
  it('shows rejection reason to the owner and hides all cross-user orders', async () => {
    await db.query('insert into admin_memberships values($1)', [b]);
    await asServer();
    const o = await order();
    await db.query('select review_payment($1,$2,false,null,$3,false)', [
      o,
      b,
      'Bank tushumi topilmadi',
    ]);
    await asUser(a);
    expect((await db.query('select rejection_reason from payment_orders')).rows[0]).toEqual({
      rejection_reason: 'Bank tushumi topilmadi',
    });
    await expect(
      db.query('select review_payment($1,$2,true,$3,null,true)', [o, b, 'REF-99999']),
    ).rejects.toThrow('permission denied');
    await asUser(b);
    expect((await db.query('select * from payment_orders')).rows).toHaveLength(0);
  });
  it('enforces private receipt upload paths and denies direct receipt reads', async () => {
    await asUser(a);
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'payment-receipts',
        `${b}/file.png`,
      ]),
    ).rejects.toThrow('row-level security');
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
      'payment-receipts',
      `${a}/file.png`,
    ]);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
  });
});

describe('referral reward qualification', () => {
  it('never rewards link clicks or a claim; rewards one verified completed generation once', async () => {
    await asUser(a);
    const code = (await db.query<{ code: string }>('select get_referral_code() code')).rows[0].code;
    await expect(db.query('select claim_referral($1)', [code])).rejects.toThrow('invalid_referral');
    await asUser(b);
    await db.query('select claim_referral($1)', [code]);
    await db.query('select claim_referral($1)', [code]);
    await db.exec('reset role');
    expect((await db.query('select * from wallets where user_id=$1', [a])).rows).toHaveLength(0);
    await asServer();
    const r = (
      await db.query<{ id: string }>('select reserve_generation($1,1,gen_random_uuid()) id', [b])
    ).rows[0].id;
    await db.query('select finish_generation($1,$2,true)', [r, b]);
    await db.query('select finish_generation($1,$2,true)', [r, b]);
    const r2 = (
      await db.query<{ id: string }>('select reserve_generation($1,1,gen_random_uuid()) id', [b])
    ).rows[0].id;
    await db.query('select finish_generation($1,$2,true)', [r2, b]);
    await db.exec('reset role');
    expect(
      (await db.query('select paid_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ paid_remaining: 5 });
  });
  it('denies unverified and existing users, prevents referral cycles', async () => {
    await asUser(b);
    const code = (await db.query<{ code: string }>('select get_referral_code() code')).rows[0].code;
    await asUser(a);
    await expect(db.query('select claim_referral($1)', [code])).rejects.toThrow('invalid_referral');
    await db.exec('reset role');
    await db.query('update auth.users set email_confirmed_at=null where id=$1', [b]);
    await asUser(b);
    await expect(db.query('select get_referral_code()')).rejects.toThrow('unverified_account');
    await db.exec('reset role');
    await db.query(
      "update auth.users set email_confirmed_at=now(),created_at=now()-interval '30 days' where id=$1",
      [b],
    );
    await asUser(b);
    await expect(db.query('select claim_referral($1)', [code])).rejects.toThrow('not_eligible');
  });
  it('caps rewards at ten qualified referrals', async () => {
    await asUser(a);
    const code = (await db.query<{ code: string }>('select get_referral_code() code')).rows[0].code;
    for (let i = 0; i < 11; i++) {
      const uid = crypto.randomUUID();
      await db.exec('reset role');
      await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())', [uid]);
      await asUser(uid);
      await db.query('select claim_referral($1)', [code]);
      await asServer();
      const r = (
        await db.query<{ id: string }>('select reserve_generation($1,1,gen_random_uuid()) id', [
          uid,
        ])
      ).rows[0].id;
      await db.query('select finish_generation($1,$2,true)', [r, uid]);
    }
    await db.exec('reset role');
    expect(
      (await db.query('select paid_remaining from wallets where user_id=$1', [a])).rows[0],
    ).toEqual({ paid_remaining: 50 });
  });
});
