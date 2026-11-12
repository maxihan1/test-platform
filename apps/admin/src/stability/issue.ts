// 오류 종류 하나를 Issue Bunker 이슈로 올리는 줄을 보내기 줄에 넣는다 — 종류 STAB_CREATE · 한 종류에 한 번 (도메인/안정화 §3.15 「Issue Bunker 등록」)

import type { Pool } from 'pg';

import { 본문상한, 제목상한 } from '../bts/failBody.js';
import { 등록기다림SQL, 오류상세, 오류읽기, type 오류행 } from './detail.js';
import type { 상태 } from './state.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 상태말: Record<상태, string> = { NEW: '신규', UP: '증가', REOPENED: '재발', ONGOING: '기존' };
const 견본상한 = 3_000;
const 케이스줄상한 = 30;

type 상세 = NonNullable<Awaited<ReturnType<typeof 오류상세>>>;

const 바이트 = (s: string): number => Buffer.byteLength(s, 'utf8');

/** 견본 안의 ``` 가 울타리를 닫지 않게 — 글 안에서 가장 긴 백틱 줄보다 하나 긴 울타리를 쓴다(CommonMark) */
function 울타리(글: string): string[] {
  const 가장긴 = Math.max(0, ...(글.match(/`+/g) ?? []).map((m) => m.length));
  const 줄 = '`'.repeat(Math.max(3, 가장긴 + 1));
  return [줄, 글, 줄];
}

/** 이슈 본문 — 상태 · 최초 발생 · 발생 케이스와 단계 · 견본 하나 · AI 요약 · Test Commander 상세 링크. 실패 등록과 같은 크기 상한 안으로 */
export function 등록본문(e: 오류행, d: 상세, 공개주소: string): string {
  // 발생 줄은 디바이스 · 반복 항목마다라 케이스로 묶는다 — 한 케이스가 여러 번 나오지 않게
  const 케이스 = new Map<string, { name: string; seq: number | null; crash: boolean }>();
  for (const o of d.occurrences) {
    const 있던 = 케이스.get(o.tcId);
    케이스.set(o.tcId, { name: o.name, seq: 있던?.seq ?? o.seq, crash: (있던?.crash ?? false) || o.crash });
  }
  const 케이스줄 = [...케이스].map(([tc, c]) => `- ${tc} ${c.name}${c.seq === null ? '' : ` · ${String(c.seq)}단계 직후`}${c.crash ? ' · 크래시 발생' : ''}`);
  const 링크 = 공개주소 === '' ? [] : ['', `Test Commander 오류 상세 — ${공개주소}/#/stability/errors/${String(d.id)}?service=${e.prefix}`];
  const 견본 = d.samples[0];
  const 만들기 = (케이스수: number, 견본글: string | null): string =>
    [
      `Test Commander 안정화 지표 — 정기 실행에서 남은 오류입니다`,
      `상태: ${상태말[d.state]} · 대상 서버 ${e.env}`,
      `최초 발생: ${d.firstDay}${d.firstBuildNo === null ? '' : ` · 빌드 ${d.firstBuildNo}`} · 실행 #${String(d.firstRunId)}`,
      `발생 케이스 ${String(d.kpis.cases)}건 (실행 #${String(d.runId)} · 케이스 ${String(d.kpis.runCases)}건 중)`,
      ...케이스줄.slice(0, 케이스수),
      ...(케이스줄.length > 케이스수 ? [`- 외 ${String(케이스줄.length - 케이스수)}건`] : []),
      ...(견본글 === null ? [] : ['', '견본', ...울타리(견본글)]),
      ...(d.ai === null ? [] : ['', `AI 요약: ${d.ai.headline}`, `영향: ${d.ai.impact}`, `원인 추정(코드 미확인): ${d.ai.cause}`]),
      ...링크,
    ].join('\n');
  // 상한을 넘으면 견본부터 줄이고 그다음 케이스 줄을 줄인다 — 링크는 늘 남는다
  for (const 견본글 of [견본?.text.slice(0, 견본상한) ?? null, 견본?.text.slice(0, 500) ?? null, null]) {
    for (let n = Math.min(케이스줄.length, 케이스줄상한); n >= 0; n = n > 5 ? 5 : n - 1) {
      const 글 = 만들기(n, 견본글);
      if (바이트(글) <= 본문상한) return 글;
    }
  }
  return 만들기(0, null);
}

export type 등록결과 = 'PENDING' | 'ALREADY_REGISTERED' | 'BTS_NOT_LINKED' | 'NOT_FOUND';

/** 줄만 넣는다 — 키는 보낸 뒤 보내기 줄이 stab_error.issue_key 에 채운다 */
export async function 등록줄넣기(errorId: number): Promise<등록결과> {
  const e = await 오류읽기(errorId);
  if (e === undefined) return 'NOT_FOUND';
  if (e.base_url === null || e.bts_project === null) return 'BTS_NOT_LINKED';
  if (e.issue_key !== null) return 'ALREADY_REGISTERED';
  // 본문은 잠그기 전에 만든다 — 잠근 채 다른 연결로 질의를 여럿 돌리면 연결이 모자랄 때 막힌다
  const d = await 오류상세(e, null);
  if (d === null) return 'NOT_FOUND';
  const 공개주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const payload = JSON.stringify({
    projectKey: e.bts_project,
    summary: `[${e.service_name}] ${e.title}`.slice(0, 제목상한),
    description: 등록본문(e, d, 공개주소),
    labels: ['QA Hub', '안정화 지표'],
    stabErrorId: errorId,
  });

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 두 번 눌러도 줄이 하나만 서게 그 종류 행을 잡고 다시 본다
    const 잠근 = await client.query<{ issue_key: string | null }>('SELECT issue_key FROM stab_error WHERE id = $1 FOR UPDATE', [errorId]);
    let 결과: 등록결과 = 'PENDING';
    if (잠근.rows[0] === undefined) 결과 = 'NOT_FOUND';
    else if (잠근.rows[0].issue_key !== null || ((await client.query(등록기다림SQL, [errorId])).rowCount ?? 0) > 0) 결과 = 'ALREADY_REGISTERED';
    else {
      await client.query(`INSERT INTO bts_outbox (project_id, kind, payload, service_id, env) VALUES ($1, 'STAB_CREATE', $2, $3, $4)`, [
        e.project_id,
        payload,
        e.service_id,
        e.env,
      ]);
    }
    await client.query(결과 === 'PENDING' ? 'COMMIT' : 'ROLLBACK');
    return 결과;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
