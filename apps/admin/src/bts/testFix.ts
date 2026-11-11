// BTS 「테스트 수정」 바퀴의 앞 절반 — 이슈를 맡아 테스트 고침 작성을 세우고, PR 이 열리면 필드 · 댓글을 보낸다 (도메인/BTS §3.12 「테스트 수정 바퀴」 1 · 2)
// 한 번만 한다 — 한 테스트 · 한 대상 서버에 도는 줄은 하나(bts_test_fix 부분 고유 색인)라 같은 알림이 다시 와도 겹치지 않는다

import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

import { 가린다, 긴것부터, 항목비밀 } from '../execution/trial.js';
import { 잠그고 } from '../prd/store.js';
import { BTS부르기, type BTS이슈, type BTS자리, type 부르기함수 } from './client.js';
import { 반영요청세우기, 실패한실행, 이슈글읽기, type 닫기결과, type 닫기연결 } from './close.js';
import { BTS이은프로젝트 } from './link.js';
import { 보낼줄넣기 } from './outbox.js';
import { 도는상태, 되돌림넣기 } from './testFixIssue.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** BTS 알림 몸의 상태 키 — issue.transitioned 만 싣는다(BTS WebhookDispatchWorker) */
export interface 알림상태 {
  from?: string;
  to?: string;
}

const 다시받을 = (s: number) => s >= 500 || s === 408 || s === 429;

/**
 * 이슈를 「테스트 수정」으로 옮긴 사람 — 변경 기록(최근 것부터)에서 상태가 그 키로 바뀐 가장 늦은 줄. 알림 몸에 없다.
 * BTS 가 바쁘면 던진다(알림을 다시 받게). 권한 · 없음 같은 4xx 는 다시 받아도 같아 모르는 채로 간다 — 되돌릴 때 담당자를 못 고를 뿐이다
 */
export async function 옮긴사람(자리: BTS자리, issueKey: string, 상태키: string, 부르기: 부르기함수 = BTS부르기): Promise<{ id: string | null; 이름: string | null }> {
  const r = await 부르기(자리, 'GET', `/api/v1/issues/${encodeURIComponent(issueKey)}/changelog?page=0&size=50`);
  if (다시받을(r.status)) throw new Error(`Issue Bunker 이슈 ${issueKey} 변경 기록을 못 읽었다 (${String(r.status)})`);
  if (r.status !== 200) console.error(`[bts] ${issueKey} 변경 기록을 못 읽어 옮긴 사람 없이 맡는다 (${String(r.status)})`);
  const 줄들 = r.status === 200 ? ((r.json as { content?: unknown } | null)?.content ?? []) : [];
  type 줄 = { actorId?: unknown; actorName?: unknown; items?: { field?: unknown; toValue?: unknown }[] };
  const 찾은 = (Array.isArray(줄들) ? (줄들 as 줄[]) : []).find((g) => (g.items ?? []).some((i) => i.field === 'status' && i.toValue === 상태키));
  return { id: typeof 찾은?.actorId === 'string' ? 찾은.actorId : null, 이름: typeof 찾은?.actorName === 'string' ? 찾은.actorName : null };
}

/**
 * 「QA Hub AI」 자신의 BTS 사람 번호 — 담당자로 넣는다. 바쁘면 던지고(알림을 다시 받게), 권한 · 없음 같은 4xx 면 null — 담당자 바꾸기만 건너뛴다.
 * 수정 AI 의 내번호(bugfixOwner.ts)는 4xx 도 던진다 — 거기선 담당 신호를 놓치면 안 돼서다
 */
async function 봇번호(자리: BTS자리, 부르기: 부르기함수): Promise<string | null> {
  const r = await 부르기(자리, 'GET', '/api/v1/users/me/whoami');
  if (다시받을(r.status)) throw new Error(`Issue Bunker whoami 를 못 읽었다 (${String(r.status)})`);
  const 몸 = r.json as { userId?: unknown; data?: { userId?: unknown } } | null;
  const id = 몸?.userId ?? 몸?.data?.userId;
  if (r.status === 200 && typeof id === 'string') return id;
  console.error(`[bts] 「QA Hub AI」 번호를 못 읽어 담당자를 안 바꾼다 (${String(r.status)})`);
  return null;
}

/** 같은 글이 그 이슈에 이미 들어갔으면 다시 안 넣는다 — 재기동 뒤 같은 알림이 와도 댓글이 겹치지 않게 */
export async function 댓글한번(projectId: number, issueKey: string, body: string): Promise<void> {
  const 있음 = await (await db()).query(`SELECT 1 FROM bts_outbox WHERE project_id = $1 AND kind = 'COMMENT' AND issue_key = $2 AND payload->>'body' = $3`, [projectId, issueKey, body]);
  if ((있음.rowCount ?? 0) === 0) await 보낼줄넣기({ projectId, kind: 'COMMENT', issueKey, payload: { body } });
}

interface 짝줄 {
  tc_id: string;
  env: string;
  first_run: string | null;
}

/** 한 애플리케이션의 열린 짝 줄마다 bts_test_fix 줄을 세우고 고침 요청 하나에 묶는다. 다른 이슈가 이미 고치는 테스트는 그 이슈 키를 돌려준다 */
async function 세우기(
  손: PoolClient,
  연결: 닫기연결,
  issueKey: string,
  서비스: number,
  옮긴: { id: string | null; 이름: string | null },
  글: string,
  결과: 닫기결과,
): Promise<{ 번호: number | null; 다른이슈: string[] }> {
  const 짝들 = (
    await 손.query<짝줄>(
      'SELECT tc_id, env, first_run FROM bts_issue_case WHERE project_id = $1 AND issue_key = $2 AND service_id = $3 AND closed_at IS NULL ORDER BY tc_id',
      [연결.projectId, issueKey, 서비스],
    )
  ).rows;
  const 건들: { runId: number; tcId: string; env: string }[] = [];
  const 줄들: number[] = [];
  const 다른이슈: string[] = [];
  for (const x of 짝들) {
    const 도는 = (
      await 손.query<{ issue_key: string }>('SELECT issue_key FROM bts_test_fix WHERE service_id = $1 AND tc_id = $2 AND env = $3 AND state = ANY($4)', [서비스, x.tc_id, x.env, 도는상태])
    ).rows[0];
    if (도는 !== undefined) {
      if (도는.issue_key !== issueKey) 다른이슈.push(도는.issue_key);
      continue;
    }
    if (x.first_run === null) {
      결과.기록만.push(`${x.tc_id} — 처음 등록한 실행이 삭제됐다`);
      continue;
    }
    const runId = await 실패한실행(손, Number(x.first_run), x.tc_id);
    if (runId === null) {
      결과.기록만.push(`${x.tc_id} — 처음 등록한 실행에 그 케이스의 실패가 없다`);
      continue;
    }
    const 줄 = await 손.query<{ id: string }>(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, moved_by, moved_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING RETURNING id`,
      [연결.projectId, issueKey, 서비스, x.tc_id, x.env, x.first_run, 옮긴.이름, 옮긴.id],
    );
    // 앞 SELECT 와 사이에 다른 알림이 같은 테스트를 막 맡았다 — 고유 색인이 막았다
    if (줄.rows[0] === undefined) {
      결과.기록만.push(`${x.tc_id} — 같은 테스트를 다른 알림이 막 맡았다`);
      continue;
    }
    줄들.push(Number(줄.rows[0].id));
    건들.push({ runId, tcId: x.tc_id, env: x.env });
  }
  if (건들.length === 0) return { 번호: null, 다른이슈 };
  const 번호 = await 반영요청세우기(손, 서비스, issueKey, { testFix: { issueKey, cases: 건들, note: 글 } });
  await 손.query('UPDATE bts_test_fix SET request_id = $2, updated_at = now() WHERE id = ANY($1)', [줄들, 번호]);
  return { 번호, 다른이슈 };
}

/**
 * BTS 알림 하나를 「테스트 수정」 바퀴로 본다. 세운 고침 요청 번호들을 돌려준다.
 * 이슈가 「테스트 수정」을 떠났으면 그 이슈의 도는 줄을 놓는다(열린 PR · 작성은 그대로). 옮겨 왔고 다시 읽어도 그 상태면 맡는다 —
 * Test Commander 가 올린 이슈(짝 줄)만, 옮긴 사람은 변경 기록에서, 이슈 글은 「QA Hub AI」 열쇠로 읽어 고침 자료에 담고, 담당자를 「QA Hub AI」로 바꾼다.
 * 짝 줄은 닫지 않는다 — 이슈가 열려 있어 같은 테스트의 다음 실패는 댓글로 붙는다
 */
export async function 테스트수정처리(연결: 닫기연결, 이슈: BTS이슈, 알림: 알림상태, 부르기: 부르기함수 = BTS부르기): Promise<닫기결과> {
  const 결과: 닫기결과 = { 요청들: [], 기록만: [] };
  const pool = await db();
  const 짝 = (
    await pool.query<{ fix: string | null; review: string | null }>("SELECT status_map->>'TEST_FIX' AS fix, status_map->>'QA_REVIEW' AS review FROM bts_link WHERE project_id = $1", [
      연결.projectId,
    ])
  ).rows[0];
  const 수정 = 짝?.fix ?? '';
  // 짝을 비운 연결은 바퀴가 안 돈다
  if (수정 === '') return 결과;
  // 늦게 다시 온 「떠남」 알림이 그사이 다시 옮겨 와 새로 선 줄을 놓지 않게 지금 상태도 본다
  if (알림.from === 수정 && 알림.to !== 수정 && 이슈.state !== 수정) {
    await pool.query(
      `UPDATE bts_test_fix SET state = 'GAVE_UP', reason = '사람이 이슈를 옮겼어요', updated_at = now() WHERE project_id = $1 AND issue_key = $2 AND state = ANY($3)`,
      [연결.projectId, 이슈.key, 도는상태],
    );
    return 결과;
  }
  if (알림.to !== 수정 || 이슈.state !== 수정) return 결과;
  const 서비스들 = (
    await pool.query<{ service_id: string }>(
      'SELECT DISTINCT service_id FROM bts_issue_case WHERE project_id = $1 AND issue_key = $2 AND closed_at IS NULL ORDER BY service_id',
      [연결.projectId, 이슈.key],
    )
  ).rows.map((r) => Number(r.service_id));
  if (서비스들.length === 0) {
    await 댓글한번(연결.projectId, 이슈.key, 'Test Commander 가 올린 실패 이슈만 테스트를 수정할 수 있어요');
    return 결과;
  }
  // BTS 는 잠금 밖에서 부른다 — 기다리는 동안 그 애플리케이션의 기획서 잠금을 쥐지 않게
  const 자리 = { baseUrl: 연결.baseUrl, 봇: 연결.봇 };
  const [옮긴, 글] = await Promise.all([옮긴사람(자리, 이슈.key, 수정, 부르기), 이슈글읽기(자리, 이슈.key, 부르기)]);
  const 다른이슈 = new Set<string>();
  for (const 서비스 of 서비스들) {
    const 세움 = await 잠그고(서비스, (손) => 세우기(손, 연결, 이슈.key, 서비스, 옮긴, 글, 결과));
    if (세움.번호 !== null) 결과.요청들.push(세움.번호);
    for (const k of 세움.다른이슈) 다른이슈.add(k);
  }
  for (const k of 다른이슈) await 댓글한번(연결.projectId, 이슈.key, `이 테스트는 ${k} 에서 이미 수정 중이에요`);
  // 담당자는 이 이슈에 도는 줄이 있으면 늘 넣는다 — 줄을 세운 뒤 깨져 다시 온 알림도 담당자를 바꾼다. 이미 그 사람이면 보낼 줄이 건너뛴다(outbox.ts)
  const 도나 = await pool.query('SELECT 1 FROM bts_test_fix WHERE project_id = $1 AND issue_key = $2 AND state = ANY($3) LIMIT 1', [연결.projectId, 이슈.key, 도는상태]);
  const 나 = (도나.rowCount ?? 0) > 0 ? await 봇번호(자리, 부르기) : null;
  if (나 !== null) await 보낼줄넣기({ projectId: 연결.projectId, kind: 'ASSIGN', issueKey: 이슈.key, payload: { assigneeId: 나 } });
  // 맡았는데 하나도 못 세웠으면(첫 실행이 지워짐 등) 「테스트 수정」에 그대로 두지 않고 되돌린다 — 아무도 안 고치는 이슈가 남지 않게 (「테스트 수정 바퀴」 5)
  if ((도나.rowCount ?? 0) === 0 && 다른이슈.size === 0 && 결과.기록만.length > 0) {
    await 되돌림넣기(pool, 연결.projectId, 이슈.key, 짝?.review ?? '', 옮긴.id, '테스트를 수정하지 못했어요 — 처음 실패한 실행이 지워졌거나 그 실행에 이 테스트의 실패 기록이 없어요');
  }
  return 결과;
}

const 요약상한 = 500;

export const 걸린까닭들 = ['EXPECTED_CHANGED', 'VERIFY_FEWER', 'MUTATION_MISSED', 'NOT_MEASURED'] as const;
export type 걸린까닭 = (typeof 걸린까닭들)[number];

// 작성 에이전트 끝내기 result.testFix — 고친 곳 한 줄 · 마지막 전체 돌려 보기에서 실제로 돈 횟수 · 자동 병합 판정 (도메인/BTS §7).
// autoMerge · held 는 둘이 같이 오고 autoMerge 는 held 가 빌 때만 true — 판정 칸 없이 온 앞 판 에이전트는 「재지 못함」으로 친다(걸린까닭읽기)
const 결과틀 = z
  .object({ summary: z.string().max(요약상한), reruns: z.number().int().min(0), autoMerge: z.boolean().optional(), held: z.array(z.enum(걸린까닭들)).max(걸린까닭들.length).optional() })
  .refine((v) => (v.held === undefined ? v.autoMerge === undefined : v.autoMerge === (v.held.length === 0)));

/** 자동 병합에 걸린 까닭 — 빈 배열이면 자동 병합한다. 판정 칸이 없거나 꼴이 틀리면 「재지 못함」 (도메인/BTS §3.12 「테스트 수정 바퀴」 3) */
export function 걸린까닭읽기(결과: unknown): 걸린까닭[] {
  const r = 결과틀.safeParse((결과 as { testFix?: unknown } | null)?.testFix);
  return r.success && r.data.held !== undefined ? [...new Set(r.data.held)] : ['NOT_MEASURED'];
}

/** 「테스트 수정」 고침 줄(params.testFix — 재실행 · 이어서 작성은 원본 것을 물려받는다)이고 꼴이 맞을 때만 */
export function 테스트수정결과맞나(params: unknown, 값: unknown): boolean {
  const 고침 = (params as { testFix?: { issueKey?: unknown } } | null)?.testFix;
  return typeof 고침?.issueKey === 'string' && 결과틀.safeParse(값).success;
}

/** 끝내기 result.testFix.summary — 에이전트가 자식 요약의 「고친 곳」을 싣는다 */
function 요약읽기(결과: unknown): string {
  const s = (결과 as { testFix?: { summary?: unknown } } | null)?.testFix?.summary;
  return typeof s === 'string' ? s.trim().slice(0, 요약상한) : '';
}

/** 고친 곳 한 줄을 그 실패 실행의 비밀값으로 가린다 — 밖으로 나가는 댓글은 증적 가림을 거친다(도메인/BTS 「테스트 수정 바퀴」 8) */
async function 요약가리기(뿌리번호: number, 요약: string): Promise<string> {
  if (요약 === '') return 요약;
  const 원본들 = (
    await (await db()).query<{ params: unknown; expected: unknown; param_schema: unknown; expected_schema: unknown }>(
      `SELECT i.params, i.expected, i.param_schema, i.expected_schema
         FROM bts_test_fix f JOIN run_item i ON i.run_id = f.failed_run AND i.tc_id = f.tc_id
        WHERE f.request_id = $1`,
      [뿌리번호],
    )
  ).rows;
  return 가린다(요약, 긴것부터(원본들.flatMap((r) => 항목비밀(r)))) as string;
}

/**
 * 테스트 고침 작성이 PR 을 열면 — 그 줄을 「병합 기다림」으로 두고, 이슈에 「테스트 수정 PR #N 을 열었어요 — <고친 곳>」 댓글과 필드 「테스트 수정 PR」.
 * 재실행 · 이어서 작성이 같은 PR 로 또 끝나도 한 번이다. 테스트 고침 요청이 아니거나 그사이 연결을 끊었으면 아무것도 안 한다.
 * 바퀴 전에 세운 요청(「테스트 문제」로 닫아 세운 것)은 줄이 없어 댓글만 간다
 */
export async function 테스트수정PR열림(요청: { serviceId: number; params: unknown }, 뿌리번호: number, prUrl: string, 결과: unknown): Promise<boolean> {
  const 고침 = (요청.params as { testFix?: { issueKey?: unknown } } | null)?.testFix;
  if (typeof 고침?.issueKey !== 'string') return false;
  const issueKey = 고침.issueKey;
  const 프로젝트 = await BTS이은프로젝트(요청.serviceId);
  if (프로젝트 === null) return false;
  const pool = await db();
  // 단계마다 따로 한 번만 한다 — 중간에 깨진 뒤 같은 PR 로 또 끝나면 남은 단계만 이어 간다
  const 요약 = await 요약가리기(뿌리번호, 요약읽기(결과));
  await pool.query(
    // 병합 전 재실행 · 이어서 작성이 다른 PR 로 끝났으면 그 PR 로 바꾼다 — 안 바꾸면 자동 병합 판정(testFixMerge.ts)이 새 PR 의 줄을 못 찾는다
    `UPDATE bts_test_fix SET pr_url = $2, summary = $3, state = 'WAIT_MERGE', updated_at = now() WHERE request_id = $1 AND (state = 'FIXING' OR (state = 'WAIT_MERGE' AND merge IS NULL))`,
    [뿌리번호, prUrl, 요약 === '' ? null : 요약],
  );
  // 주소 뒤가 줄 끝이거나 글 끝일 때만 같은 PR 이다 — …/pull/1 이 …/pull/12 댓글에 걸리지 않게
  const 보냈나 = async (kind: 'COMMENT' | 'FIELD') =>
    ((
      await pool.query(
        `SELECT 1 FROM bts_outbox WHERE project_id = $1 AND kind = $4 AND issue_key = $2
            AND (strpos(payload::text, '"' || $3 || '"') > 0 OR strpos(payload->>'body', $3 || E'\n') > 0 OR right(payload->>'body', length($3)) = $3)`,
        [프로젝트, issueKey, prUrl, kind],
      )
    ).rowCount ?? 0) > 0;
  let 넣음 = false;
  if (!(await 보냈나('COMMENT'))) {
    const 번호 = /\/pull\/(\d+)/.exec(prUrl)?.[1];
    const 머리 = `테스트 수정 PR ${번호 === undefined ? '' : `#${번호} `}을 열었어요`;
    await 보낼줄넣기({ projectId: 프로젝트, kind: 'COMMENT', issueKey, payload: { body: `${요약 === '' ? 머리 : `${머리} — ${요약}`}\n${prUrl}` } });
    넣음 = true;
  }
  // 필드는 바퀴의 줄이 있을 때만 — 자동 설정이 필드를 못 만든 연결은 건너뛴다. 댓글 뒤에 넣는다: 쓰기 문이 막아(403) 그만둬도 댓글은 이미 갔다
  const 필드 = (await pool.query<{ test_fix_field: string | null }>('SELECT test_fix_field FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0]?.test_fix_field ?? null;
  const 줄있나 = ((await pool.query('SELECT 1 FROM bts_test_fix WHERE request_id = $1 AND pr_url = $2 LIMIT 1', [뿌리번호, prUrl])).rowCount ?? 0) > 0;
  if (줄있나 && 필드 !== null && 필드 !== '' && !(await 보냈나('FIELD'))) {
    await 보낼줄넣기({ projectId: 프로젝트, kind: 'FIELD', issueKey, payload: { customFields: { [필드]: prUrl } } });
    넣음 = true;
  }
  return 넣음;
}
