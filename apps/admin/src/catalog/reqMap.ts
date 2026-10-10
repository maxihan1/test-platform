// 요구사항 표 출처 칸에서 지도 ①(요구 ↔ 케이스)을 뽑아 req_case 의 그 서비스 몫을 다시 채운다 (카탈로그 §3.1 「지도」)

import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Pool } from 'pg';

import { 요구줄들 } from '../../../../scripts/authoring-ledger-check.js';
import { 번호찾기 } from '../../../../scripts/authoring-ledger.js';
import { TCID } from './rules.js';

export interface 지도줄 {
  reqId: string;
  tcId: string;
  axis: '정상' | '경계' | '예외' | 'UI';
}

const 축들: ReadonlySet<string> = new Set(['정상', '경계', '예외', 'UI']);

// 작성 에이전트가 표를 쓰는 자리(docs/cases/<접두사>.md)와 같은 뿌리다 (도메인/작성 §3.6 · 공통/6-인프라 §9)
export function casesRoot(): string {
  return process.env.PLATFORM_CASES_DIR ?? resolve(process.cwd(), 'docs', 'cases');
}

/**
 * 「요구사항」 표에서 (요구 번호, tcId, 축)을 뽑는다. 번호는 원장 대조와 같은 함수로 읽는다 —
 * 같은 출처 칸을 두 곳이 다르게 읽으면 「덮었다」는 셈과 지도가 어긋난다
 */
export function 지도줄들(표글: string, prefix: string): 지도줄[] {
  const 모음 = new Map<string, 지도줄>();
  for (const 줄 of 요구줄들(표글)) {
    // 「제거함(…)」 · 「—」 · 남의 접두사 · 넷 밖 축은 건너뛴다. 넣으면 축 제약 한 줄에 그 서비스 지도 전체가 안 바뀐다
    if (!TCID.test(줄.tcId) || !줄.tcId.startsWith(`${prefix}-`) || !축들.has(줄.축)) continue;
    for (const reqId of 번호찾기(줄.출처).번호들) {
      const 한줄: 지도줄 = { reqId, tcId: 줄.tcId, axis: 줄.축 as 지도줄['axis'] };
      모음.set(`${reqId} ${한줄.tcId} ${한줄.axis}`, 한줄);
    }
  }
  return [...모음.values()];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 그 서비스 몫을 지우고 표에서 다시 채운다(사본이라 손으로 안 고친다). 표 파일이 없으면 비운다 — 덮는 것이 없다.
 * 뿌리 폴더가 없거나 다른 읽기 오류면 던진다 — 부르는 쪽이 옛 지도를 둔 채 스캔 문제로 남긴다
 */
export async function 지도채우기(serviceId: number, prefix: string): Promise<number> {
  let 표글 = '';
  try {
    표글 = await readFile(join(casesRoot(), `${prefix}.md`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // 뿌리가 통째로 없으면 표가 없는 것이 아니라 마운트 · 작업 폴더가 틀린 것이다. 비우면 모든 서비스 지도가 말없이 사라진다
    await stat(casesRoot());
  }
  const 줄들 = 지도줄들(표글, prefix);

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 기동 스캔과 「다시 스캔」이 겹치면 뒤엣것의 넣기가 앞엣것이 넣은 줄과 부딪혀 거짓 실패가 난다. 서비스마다 차례로 세운다
    await client.query("SELECT pg_advisory_xact_lock(hashtext('req_case'), $1::int)", [serviceId]);
    await client.query('DELETE FROM req_case WHERE service_id = $1', [serviceId]);
    await client.query(
      `INSERT INTO req_case (service_id, req_id, tc_id, axis)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[])`,
      [serviceId, 줄들.map((x) => x.reqId), 줄들.map((x) => x.tcId), 줄들.map((x) => x.axis)],
    );
    await client.query('COMMIT');
    return 줄들.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
