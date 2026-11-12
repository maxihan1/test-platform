// 오류 종류 하나를 Issue Bunker 이슈로 올리는 줄을 보내기 줄에 넣는다 — 종류 STAB_CREATE · 한 종류에 한 번 (도메인/안정화 §3.15 「Issue Bunker 등록」)

import type { Pool } from 'pg';

import { 등록기다림SQL, 오류상세, 오류읽기, type 오류행 } from './detail.js';
import type { 상태 } from './state.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 상태말: Record<상태, string> = { NEW: '신규', UP: '증가', REOPENED: '재발', ONGOING: '기존' };
const 견본상한 = 3_000;

type 상세 = NonNullable<Awaited<ReturnType<typeof 오류상세>>>;

/** 이슈 본문 — 상태 · 최초 발생 · 발생 케이스와 단계 · 견본 하나 · AI 요약 · Test Commander 상세 링크 */
export function 등록본문(e: 오류행, d: 상세, 공개주소: string): string {
  const 케이스 = d.occurrences.map((o) => `- ${o.tcId} ${o.name}${o.seq === null ? '' : ` · ${String(o.seq)}단계 직후`}${o.crash ? ' · 크래시 발생' : ''}`);
  const 견본 = d.samples[0];
  return [
    `Test Commander 안정화 지표 — 정기 실행에서 남은 오류입니다`,
    `상태: ${상태말[d.state]} · 대상 서버 ${e.env}`,
    `최초 발생: ${d.firstDay}${d.firstBuildNo === null ? '' : ` · 빌드 ${d.firstBuildNo}`} · 실행 #${String(d.firstRunId)}`,
    `발생 케이스 ${String(d.kpis.cases)}건 (실행 #${String(d.runId)} · 케이스 ${String(d.kpis.runCases)}건 중)`,
    ...케이스,
    ...(견본 === undefined ? [] : ['', '견본', '```', 견본.text.slice(0, 견본상한), '```']),
    ...(d.ai === null ? [] : ['', `AI 요약: ${d.ai.headline}`, `영향: ${d.ai.impact}`, `원인 추정(코드 미확인): ${d.ai.cause}`]),
    ...(공개주소 === '' ? [] : ['', `Test Commander 오류 상세 — ${공개주소}/#/stability/errors/${String(d.id)}?service=${e.service_id}`]),
  ].join('\n');
}

export type 등록결과 = 'PENDING' | 'ALREADY_REGISTERED' | 'BTS_NOT_LINKED';

/** 줄만 넣는다 — 키는 보낸 뒤 보내기 줄이 stab_error.issue_key 에 채운다 */
export async function 등록줄넣기(errorId: number): Promise<등록결과> {
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 두 번 눌러도 줄이 하나만 서게 그 종류 행을 잡고 본다
    await client.query('SELECT 1 FROM stab_error WHERE id = $1 FOR UPDATE', [errorId]);
    const e = await 오류읽기(errorId);
    if (e === undefined) throw new Error(`안정화 오류 ${String(errorId)} 이 사라졌다`);
    if (e.base_url === null || e.bts_project === null) {
      await client.query('ROLLBACK');
      return 'BTS_NOT_LINKED';
    }
    if (e.issue_key !== null || ((await client.query(등록기다림SQL, [errorId])).rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      return 'ALREADY_REGISTERED';
    }
    const d = await 오류상세(e, null);
    if (d === null) throw new Error(`안정화 오류 ${String(errorId)} 이 남은 실행이 없다`);
    const 공개주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
    await client.query(
      `INSERT INTO bts_outbox (project_id, kind, payload, service_id, env) VALUES ($1, 'STAB_CREATE', $2, $3, $4)`,
      [
        e.project_id,
        JSON.stringify({
          projectKey: e.bts_project,
          summary: `[${e.service_name}] ${e.title}`,
          description: 등록본문(e, d, 공개주소),
          labels: ['QA Hub', '안정화 지표'],
          stabErrorId: errorId,
        }),
        e.service_id,
        e.env,
      ],
    );
    await client.query('COMMIT');
    return 'PENDING';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
