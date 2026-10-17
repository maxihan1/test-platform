// 서비스 가이드 판 · 첨부 표를 읽고 쓴다. 바꿀 때마다 새 판이고 옛 판 · 뺀 파일은 지우지 않는다 (도메인/작성 §3.6 「★ 서비스 가이드」)

import type { GuideFile, GuideSection, GuideVersionRow, ServiceGuide } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { 저장하는사람 } from '../prd/store.js';
import { 변경기록, 지금판파일상한, 통틀어파일상한, type 글셋, type 판파일 } from './rules.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 낡음 = { error: 'GUIDE_STALE'; latest: number };
type 꽉참 = { error: 'GUIDE_FULL' };
type 없음 = { error: 'NOT_FOUND' };

interface 판행 extends 글셋 {
  version: number;
  files: 판파일[];
  saved_by_name: string;
  saved_at: Date;
}

async function 지금판행(손: Pool | PoolClient, 서비스: number): Promise<판행 | null> {
  const r = await 손.query<판행>(
    `SELECT version, intro, policy, rules, files, saved_by_name, saved_at FROM service_guide_version
      WHERE service_id = $1 ORDER BY version DESC LIMIT 1`,
    [서비스],
  );
  return r.rows[0] ?? null;
}

interface 파일행 {
  id: string;
  name: string;
  size: string;
  uploaded_by_name: string;
  uploaded_at: Date;
}

/** 판의 [{ id, section }] 에 이름 · 크기 · 올린 사람을 붙인다. 판 차례를 그대로 둔다 */
async function 판빚기(손: Pool | PoolClient, 서비스: number, 행: 판행): Promise<ServiceGuide> {
  const r = await 손.query<파일행>(
    'SELECT id, name, size, uploaded_by_name, uploaded_at FROM service_guide_file WHERE service_id = $1 AND id = ANY($2::bigint[])',
    [서비스, 행.files.map((f) => f.id)],
  );
  const 표 = new Map(r.rows.map((f) => [Number(f.id), f]));
  const files: GuideFile[] = 행.files.flatMap((f) => {
    const x = 표.get(f.id);
    return x === undefined
      ? []
      : [{ id: f.id, name: x.name, size: Number(x.size), section: f.section, uploadedAt: x.uploaded_at.toISOString(), uploadedByName: x.uploaded_by_name }];
  });
  return {
    version: 행.version,
    intro: 행.intro,
    policy: 행.policy,
    rules: 행.rules,
    files,
    savedAt: 행.saved_at.toISOString(),
    savedByName: 행.saved_by_name,
  };
}

export const 빈가이드: ServiceGuide = { version: 0, intro: '', policy: '', rules: '', files: [], savedAt: null, savedByName: null };

export async function 지금가이드(서비스: number): Promise<ServiceGuide> {
  const 손 = await db();
  const 행 = await 지금판행(손, 서비스);
  return 행 === null ? 빈가이드 : 판빚기(손, 서비스, 행);
}

export async function 판가이드(서비스: number, version: number): Promise<ServiceGuide | null> {
  // version 칸은 INTEGER 다. 넘는 번호를 그대로 넘기면 DB 가 범위 오류로 500 을 낸다 — 없는 판이다
  if (version > 2_147_483_647) return null;
  const 손 = await db();
  const r = await 손.query<판행>(
    'SELECT version, intro, policy, rules, files, saved_by_name, saved_at FROM service_guide_version WHERE service_id = $1 AND version = $2',
    [서비스, version],
  );
  return r.rows[0] === undefined ? null : 판빚기(손, 서비스, r.rows[0]);
}

/** 변경 기록. 글은 md5 만 읽는다 — 판이 쌓여도 목록 한 번에 수백 판의 글을 읽지 않게 */
export async function 기록(서비스: number): Promise<GuideVersionRow[]> {
  const 손 = await db();
  const [판들, 파일들] = await Promise.all([
    손.query<{ version: number; intro: string; policy: string; rules: string; files: 판파일[]; saved_by_name: string; saved_at: Date }>(
      `SELECT version, md5(intro) AS intro, md5(policy) AS policy, md5(rules) AS rules, files, saved_by_name, saved_at
         FROM service_guide_version WHERE service_id = $1`,
      [서비스],
    ),
    손.query<{ id: string; name: string }>('SELECT id, name FROM service_guide_file WHERE service_id = $1', [서비스]),
  ]);
  return 변경기록(
    판들.rows.map((x) => ({
      version: x.version,
      md5: { intro: x.intro, policy: x.policy, rules: x.rules },
      files: x.files,
      savedAt: x.saved_at.toISOString(),
      savedByName: x.saved_by_name,
    })),
    new Map(파일들.rows.map((f) => [Number(f.id), f.name])),
  );
}

/**
 * 그 서비스가 올린 파일 한 건. 파일 행은 판 행과 한 트랜잭션에서만 생기므로 행이 있으면 어느 판엔가 들어 있다 —
 * 「그 서비스의 어느 판에든 든 파일만」(§7)을 서비스 대조 하나로 지킨다
 */
export async function 파일한건(서비스: number, 파일: number): Promise<{ id: number; name: string } | null> {
  const r = await (await db()).query<{ id: string; name: string }>(
    'SELECT id, name FROM service_guide_file WHERE service_id = $1 AND id = $2',
    [서비스, 파일],
  );
  return r.rows[0] === undefined ? null : { id: Number(r.rows[0].id), name: r.rows[0].name };
}

/** 서비스마다 고치기를 한 줄로 세운다 — 표준 기획서 저장과 같은 까닭(prd/store.ts `잠그고`). 잠금 열쇠는 'guide' 로 가른다 */
async function 잠그고<T>(서비스: number, 일: (손: PoolClient) => Promise<T>): Promise<T> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('guide'), ($1::bigint % 2147483647)::int)`, [서비스]);
    const 결과 = await 일(손);
    await 손.query('COMMIT');
    return 결과;
  } catch (err) {
    await 손.query('ROLLBACK');
    throw err;
  } finally {
    손.release();
  }
}

async function 판넣기(손: PoolClient, 서비스: number, 앞: 판행 | null, 글: 글셋, files: 판파일[], 사람: 저장하는사람): Promise<number> {
  const version = (앞?.version ?? 0) + 1;
  await 손.query(
    `INSERT INTO service_guide_version (service_id, version, intro, policy, rules, files, saved_by, saved_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [서비스, version, 글.intro, 글.policy, 글.rules, JSON.stringify(files), 사람.username, 사람.displayName],
  );
  return version;
}

const 앞글 = (앞: 판행 | null): 글셋 => ({ intro: 앞?.intro ?? '', policy: 앞?.policy ?? '', rules: 앞?.rules ?? '' });
const 낡았나 = (앞: 판행 | null, baseVersion: number): 낡음 | null =>
  baseVersion === (앞?.version ?? 0) ? null : { error: 'GUIDE_STALE', latest: 앞?.version ?? 0 };

/** 글 저장. 파일 목록은 지금 판 것을 물려받는다. 글이 지금 판과 같으면 새 판을 안 만든다 */
export async function 글저장(서비스: number, baseVersion: number, 글: 글셋, 사람: 저장하는사람): Promise<{ version: number } | 낡음> {
  return 잠그고(서비스, async (손) => {
    const 앞 = await 지금판행(손, 서비스);
    const 거절 = 낡았나(앞, baseVersion);
    if (거절 !== null) return 거절;
    const 옛 = 앞글(앞);
    if (옛.intro === 글.intro && 옛.policy === 글.policy && 옛.rules === 글.rules) return { version: 앞?.version ?? 0 };
    return { version: await 판넣기(손, 서비스, 앞, 글, 앞?.files ?? [], 사람) };
  });
}

/**
 * 파일 더하기. 잠금 → 낡은 판 · 개수 → 파일 행 → 디스크 쓰기 → 새 판 행 → 커밋 (§7).
 * 어디서든 실패하면 되돌리고 쓴 디스크 파일을 지운다 — 판이 안 가리키는 파일은 아무도 못 열고 지우지도 못한다
 */
export async function 파일더하기(
  서비스: number,
  baseVersion: number,
  section: GuideSection,
  파일: { name: string; 몸: Buffer },
  자리: (파일번호: number) => string,
  사람: 저장하는사람,
): Promise<{ version: number; fileId: number } | 낡음 | 꽉참> {
  let 쓴곳: string | null = null;
  try {
    return await 잠그고(서비스, async (손) => {
      const 앞 = await 지금판행(손, 서비스);
      const 거절 = 낡았나(앞, baseVersion);
      if (거절 !== null) return 거절;
      const 통틀어 = await 손.query<{ n: number }>('SELECT count(*)::int AS n FROM service_guide_file WHERE service_id = $1', [서비스]);
      if ((앞?.files.length ?? 0) >= 지금판파일상한 || (통틀어.rows[0]?.n ?? 0) >= 통틀어파일상한) return { error: 'GUIDE_FULL' as const };
      const r = await 손.query<{ id: string }>(
        'INSERT INTO service_guide_file (service_id, name, size, uploaded_by, uploaded_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [서비스, 파일.name, 파일.몸.length, 사람.username, 사람.displayName],
      );
      const fileId = Number(r.rows[0]!.id);
      쓴곳 = 자리(fileId);
      await mkdir(dirname(쓴곳), { recursive: true });
      await writeFile(쓴곳, 파일.몸);
      const version = await 판넣기(손, 서비스, 앞, 앞글(앞), [...(앞?.files ?? []), { id: fileId, section }], 사람);
      return { version, fileId };
    });
  } catch (err) {
    if (쓴곳 !== null) await rm(쓴곳, { force: true });
    throw err;
  }
}

/** 파일 빼기. 행 · 디스크 파일은 지우지 않는다 — 옛 판이 가리킨다 */
export async function 파일빼기(서비스: number, baseVersion: number, 파일: number, 사람: 저장하는사람): Promise<{ version: number } | 낡음 | 없음> {
  return 잠그고(서비스, async (손) => {
    const 앞 = await 지금판행(손, 서비스);
    const 거절 = 낡았나(앞, baseVersion);
    if (거절 !== null) return 거절;
    if (앞 === null || !앞.files.some((f) => f.id === 파일)) return { error: 'NOT_FOUND' as const };
    return { version: await 판넣기(손, 서비스, 앞, 앞글(앞), 앞.files.filter((f) => f.id !== 파일), 사람) };
  });
}
