// BTS 「테스트 수정」 바퀴의 뒤 절반 — 반영이 끝나면 다시 실행을 걸고, 끝나면 이슈를 닫거나 「QA 검토」로 되돌린다 (도메인/BTS §3.12 「테스트 수정 바퀴」 4 · 5 · 6)
// 반영 끝(agentRoutes) · 실행 끝(dispatcher)이 부르고, 놓쳤거나 Issue Bunker 에 못 닿은 단계는 60초 점검(testFixSweep.ts)이 다시 부른다

import type { Platform } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { 사슬식 } from '../authoring/chainSql.js';
import { 팜을본다 } from '../execution/location.js';
import { BTS부르기, type 부르기함수 } from './client.js';
import { BTS요청자, 실패한실행 } from './close.js';
import { 그만두기, 다시받을, 도는상태, 되돌림넣기, 이슈잠그고, 이슈확인, 줄넣기, type 이슈자리 } from './testFixIssue.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 줄 extends 이슈자리 {
  id: string;
  project_id: string;
  tc_id: string;
  env: string;
  failed_run: string | null;
  moved_by_id: string | null;
  request_id: string | null;
  pr_url: string | null;
  merge: string | null;
  held: string[];
  rerun_id: string | null;
  state: string;
  resolution_map: Record<string, string> | null;
}

export async function 줄읽기(id: number | string): Promise<줄 | undefined> {
  return (
    await (await db()).query<줄>(
      `SELECT f.id, f.project_id, f.issue_key, f.tc_id, f.env, f.failed_run, f.moved_by_id, f.request_id, f.pr_url, f.merge, f.held, f.rerun_id, f.state,
              l.base_url, l.bot_username, l.status_map, l.resolution_map
         FROM bts_test_fix f LEFT JOIN bts_link l ON l.project_id = f.project_id WHERE f.id = $1`,
      [id],
    )
  ).rows[0];
}

/** 끝을 적고 「QA 검토」로 되돌린다. 같은 이슈의 다른 도는 줄도 놓는다 — 되돌린 이슈를 그 줄이 뒤늦게 닫지 않게 */
export async function 되돌리기(줄: 줄, 까닭: string): Promise<void> {
  await 이슈잠그고(줄.project_id, 줄.issue_key, async (손) => {
    const 끝 = await 손.query(`UPDATE bts_test_fix SET state = 'FAILED', reason = $2, updated_at = now() WHERE id = $1 AND state = ANY($3)`, [줄.id, 까닭, 도는상태]);
    if (끝.rowCount !== 1) return;
    await 손.query(
      `UPDATE bts_test_fix SET state = 'GAVE_UP', reason = '같은 이슈의 다른 테스트를 되돌렸어요', updated_at = now() WHERE project_id = $1 AND issue_key = $2 AND state = ANY($3)`,
      [줄.project_id, 줄.issue_key, 도는상태],
    );
    await 되돌림넣기(손, 줄.project_id, 줄.issue_key, 줄.status_map?.QA_REVIEW ?? '', 줄.moved_by_id, 까닭);
  });
}

/** 다음 단계 전 다시 읽기 — 이어 갈 때만 true. 사람이 옮겼으면 줄을 놓는다 */
export async function 이어가나(줄: 줄, 부르기: 부르기함수): Promise<boolean> {
  const 확인 = await 이슈확인(줄, 부르기);
  if (확인 === '이어감') return true;
  if (확인 !== '다시') await 그만두기(줄.id, 확인.그만);
  return false;
}

/** 고침 작성의 반영이 끝났나 — 사슬에 끝난 반영이 있다 */
async function 반영끝났나(뿌리: string): Promise<boolean> {
  const r = await (await db()).query(
    `WITH RECURSIVE ${사슬식('id = $1')} SELECT 1 FROM 사슬 s JOIN authoring_request a ON a.id = s.id WHERE a.kind = 'MERGE' AND a.status = 'DONE' LIMIT 1`,
    [뿌리],
  );
  return (r.rowCount ?? 0) > 0;
}

interface 실행재료 {
  items: { tcId: string; platforms: Platform[]; params: Record<string, never>; expected: Record<string, never> }[];
  mobileOn: 'server' | 'vision';
  rerunOf?: number;
}

/**
 * 처음 실패한 디바이스와 그 실행에서 통과한 디바이스 — 실패한 쪽만 고치다 통과하던 쪽을 깨뜨리지 않았는지 같이 본다. 처음 실패가 실제 폰이면 실제 폰으로.
 * 입력값은 비워 케이스 저장값으로 채운다(실행 창의 한 건 실행과 같다)
 */
// ponytail: 실패가 한 건 실행에 있으면 rerunOf 를 못 싣는다(한 건에는 못 붙는다 — execution/runOrigin.ts) — 그때는 붙을 곳을 실행 쪽이 고른다(execution/single.ts)
async function 실행재료(줄: 줄): Promise<실행재료 | null> {
  if (줄.failed_run === null) return null;
  const pool = await db();
  const 실패 = await 실패한실행(pool, Number(줄.failed_run), 줄.tc_id);
  if (실패 === null) return null;
  const 항목 = (
    await pool.query<{ platform: Platform; status: string; real: boolean }>(
      `SELECT platform, status, device IS NOT NULL AS real FROM run_item WHERE run_id = $1 AND tc_id = $2 AND status IN ('PASS', 'FAIL') ORDER BY platform`,
      [실패, 줄.tc_id],
    )
  ).rows;
  const 실제폰 = 항목.some((i) => i.platform === 'mobile' && i.status === 'FAIL' && i.real);
  const 한건 = (await pool.query<{ origin: string }>('SELECT origin FROM test_run WHERE run_id = $1', [실패])).rows[0]?.origin === 'SINGLE';
  return {
    items: [{ tcId: 줄.tc_id, platforms: [...new Set(항목.map((i) => i.platform))], params: {}, expected: {} }],
    mobileOn: 실제폰 ? 'vision' : 'server',
    ...(!한건 && { rerunOf: 실패 }),
  };
}

/** 반영이 끝난 줄에 한 건 실행을 건다 — 실행자는 Issue Bunker 이름. 반영 끝 알림과 60초 점검이 같이 와도 줄을 먼저 차지한 쪽만 건다 */
export async function 다시실행걸기(id: number | string, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const 줄 = await 줄읽기(id);
  if (줄 !== undefined) await 걸기(줄, 부르기);
}

export async function 걸기(줄: 줄, 부르기: 부르기함수): Promise<void> {
  if (줄.state !== 'WAIT_MERGE' || 줄.request_id === null || !(await 반영끝났나(줄.request_id))) return;
  if (!(await 이어가나(줄, 부르기))) return;
  const pool = await db();
  const 차지 = await pool.query(`UPDATE bts_test_fix SET state = 'RERUNNING', updated_at = now() WHERE id = $1 AND state = 'WAIT_MERGE'`, [줄.id]);
  if (차지.rowCount !== 1) return;
  const 재료 = await 실행재료(줄);
  if (재료 === null) return 되돌리기(줄, '처음 실패한 실행이 지워져 다시 실행하지 못했어요');
  // 폰이 다른 실행에 쓰이는 중이면 보통 실행처럼 차례를 기다린다 — 팜이 아예 없을 때만 되돌린다
  if (팜을본다(재료.items, process.env, 재료.mobileOn) !== null) return 되돌리기(줄, '실제 폰을 못 잡아 확인하지 못했어요');
  try {
    // 실행 쪽이 bts 를 가져오므로(실행 끝 실패 등록) 부를 때 가져온다
    const { createRun } = await import('../execution/store.js');
    const { dispatch } = await import('../execution/dispatcher.js');
    const { 누가, 이름 } = BTS요청자(줄.issue_key);
    const 실행 = await createRun({ origin: 'MANUAL', env: 줄.env, triggeredBy: 누가, triggeredByName: 이름, ...재료 });
    // 분배 전에 적는다 — 실행 끝 실패 등록이 이 실행을 건너뛰고(failReport.ts) 끝 판정이 이 줄을 찾게
    await pool.query('UPDATE bts_test_fix SET rerun_id = $2, updated_at = now() WHERE id = $1', [줄.id, 실행.runId]);
    void dispatch(실행.runId, 실행.items).catch((err: unknown) => console.error(`[bts] ${줄.issue_key} 다시 실행 ${String(실행.runId)} 분배가 깨졌다: ${String(err)}`));
  } catch (err) {
    console.error(`[bts] ${줄.issue_key} 다시 실행을 걸지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    await 되돌리기(줄, '다시 실행을 걸지 못했어요');
  }
}

const 디바이스이름 = (platform: string, real: boolean): string => (platform === 'desktop' ? 'PC' : platform === 'android' ? 'Android 앱' : real ? '실제 폰' : '모바일');

/** 다시 실행 결과로 가는 고리 — 한 건 실행은 결과 화면이 없어 붙은 실행 화면으로 건다 */
function 실행고리(실행: string, 붙은: string | null): string {
  const 주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return 주소 === '' ? '' : `\n${주소}/#/runs/${붙은 ?? 실행}`;
}

/** 「테스트 문제」 해결 상태의 Issue Bunker 번호 — 연결은 이름을 적어 둔다. 못 닿으면 '다시', 못 찾으면 null(해결 상태 없이 옮긴다) */
async function 해결번호(줄: 줄, 부르기: 부르기함수): Promise<string | null | '다시'> {
  const 이름 = (줄.resolution_map?.TEST_PROBLEM ?? '').trim().toLowerCase();
  if (이름 === '' || 줄.base_url === null) return null;
  try {
    const r = await 부르기({ baseUrl: 줄.base_url, 봇: 줄.bot_username ?? '' }, 'GET', '/api/v1/resolutions');
    if (다시받을(r.status)) return '다시';
    const 찾은 = ((r.json as { data?: { id?: unknown; name?: unknown }[] } | null)?.data ?? []).find((d) => typeof d.name === 'string' && d.name.trim().toLowerCase() === 이름);
    if (typeof 찾은?.id !== 'string') console.error(`[bts] ${줄.issue_key} — 해결 상태 「${이름}」 번호를 못 찾아 해결 상태 없이 닫는다 (${String(r.status)})`);
    return typeof 찾은?.id === 'string' ? 찾은.id : null;
  } catch {
    return '다시';
  }
}

/**
 * 다시 실행이 끝난 줄 — 모든 항목이 통과면 「닫힘 · 테스트 문제」로 닫고 짝 줄을 TEST_PROBLEM 으로, 하나라도 실패 · 미실행이면 되돌린다.
 * 같은 이슈의 다른 테스트가 아직 돌면 이 줄만 통과로 두고 닫기는 마지막 줄이 한다
 */
export async function 다시실행끝(id: number | string, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const 줄 = await 줄읽기(id);
  if (줄 !== undefined) await 끝보기(줄, 부르기);
}

export async function 끝보기(줄: 줄, 부르기: 부르기함수): Promise<void> {
  if (줄.state !== 'RERUNNING') return;
  const pool = await db();
  const 실행 =
    줄.rerun_id === null ? undefined : (await pool.query<{ status: string; rerun_of: string | null }>('SELECT status, rerun_of FROM test_run WHERE run_id = $1', [줄.rerun_id])).rows[0];
  if (실행?.status === 'RUNNING') return;
  const 항목 =
    실행 === undefined
      ? []
      : (await pool.query<{ platform: string; status: string; real: boolean }>('SELECT platform, status, device IS NOT NULL AS real FROM run_item WHERE run_id = $1 ORDER BY platform DESC', [줄.rerun_id]))
          .rows;
  const 통과 = 항목.length > 0 && 항목.every((i) => i.status === 'PASS');
  const 다른줄도나 = async (손: Pick<PoolClient, 'query'>) =>
    ((await 손.query('SELECT 1 FROM bts_test_fix WHERE project_id = $1 AND issue_key = $2 AND id <> $3 AND state = ANY($4)', [줄.project_id, 줄.issue_key, 줄.id, 도는상태])).rowCount ?? 0) > 0;
  const 통과만적기 = (손: Pick<PoolClient, 'query'>) => 손.query(`UPDATE bts_test_fix SET state = 'PASSED', updated_at = now() WHERE id = $1 AND state = 'RERUNNING'`, [줄.id]);
  const 기다림 = async (손: PoolClient): Promise<boolean> => {
    if (!(await 다른줄도나(손))) return false;
    await 통과만적기(손);
    return true;
  };
  if (통과 && (await 이슈잠그고(줄.project_id, 줄.issue_key, 기다림))) return;
  if (!(await 이어가나(줄, 부르기))) return;
  const 번호 = 줄.rerun_id ?? '';
  const 디바이스 = [...new Set(항목.filter((i) => 통과 || i.status !== 'PASS').map((i) => 디바이스이름(i.platform, i.real)))].join(' · ');
  const 고리 = 실행 === undefined ? '' : 실행고리(번호, 실행.rerun_of);
  if (!통과) {
    return 되돌리기(줄, 실행 === undefined || 항목.length === 0 ? '다시 실행 기록이 없어 확인하지 못했어요' : `${디바이스} 에서 통과하지 못했어요 · RUN ${번호}${고리}`);
  }
  const 해결 = await 해결번호(줄, 부르기);
  if (해결 === '다시') return;
  await 이슈잠그고(줄.project_id, 줄.issue_key, async (손) => {
    if ((await 기다림(손)) || (await 통과만적기(손)).rowCount !== 1) return;
    await 손.query(`UPDATE bts_issue_case SET closed_at = now(), resolution = 'TEST_PROBLEM' WHERE project_id = $1 AND issue_key = $2 AND closed_at IS NULL`, [
      줄.project_id,
      줄.issue_key,
    ]);
    await 줄넣기(손, 줄.project_id, 'TRANSITION', 줄.issue_key, {
      toStatusKey: 줄.status_map?.CLOSED ?? '',
      ...(해결 !== null && { resolutionId: 해결 }),
      comment: `${디바이스} 에서 통과했어요 · RUN ${번호}${고리}`,
    });
  });
}

/** 반영이 끝나면(작성 에이전트 끝내기 · MERGE DONE) 그 작성의 병합 기다림 줄마다 다시 실행 */
export async function 테스트수정반영뒤(뿌리번호: number, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const 줄들 = await (await db()).query<{ id: string }>(`SELECT id FROM bts_test_fix WHERE request_id = $1 AND state = 'WAIT_MERGE'`, [뿌리번호]);
  for (const { id } of 줄들.rows) await 다시실행걸기(id, 부르기);
}

/** 실행이 끝날 때마다 부른다(dispatcher) — 바퀴의 다시 실행이면 끝 판정 */
export async function 테스트수정실행뒤(runId: number, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const 줄들 = await (await db()).query<{ id: string }>(`SELECT id FROM bts_test_fix WHERE rerun_id = $1 AND state = 'RERUNNING'`, [runId]);
  for (const { id } of 줄들.rows) await 다시실행끝(id, 부르기);
}
