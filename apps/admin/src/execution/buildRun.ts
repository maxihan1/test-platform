// 빌드로 실행을 건다 — 앞 빌드의 시작 안 한 실행 건너뛰기 · 스모크 먼저 · 스모크가 다 통과하면 회귀 (도메인/실행 §3.11 「빌드마다 돌리기」)

import type { Pool } from 'pg';

import { 최신빌드 } from './buildFile.js';
import { markAborted } from './dispatcher.js';
import { abortRunner } from './runner.js';
import { 정기실행을만든다, type 로그, type 만든정기실행 } from './scheduled.js';
import { abortRun, unfinishedItems } from './store.js';

export interface 올린빌드 {
  id: number;
  serviceId: number;
  prefix: string;
  env: string;
  buildNo: string;
  username: string;
  displayName: string;
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 콘솔: 로그 = { info: (말) => console.log(말), error: (말) => console.error(말) };

// 분배는 안 기다린다. 깨지면 잡을 곳이 없어 프로세스가 죽으니 로그로만 남긴다 — 정기실행점검과 같다
function 분배를맡긴다(결과: 만든정기실행, 빌드번호: string, 로그: 로그): 만든정기실행 {
  void 결과.끝.catch((err: unknown) => 로그.error(`[build ${빌드번호}] 분배가 깨졌다: ${err instanceof Error ? err.message : String(err)}`));
  return 결과;
}

/**
 * 같은 줄의 앞 빌드 실행 가운데 끝난 항목이 하나도 없는 것을 멈춘다 — 새 빌드가 왔으니 옛 빌드를 깔아 돌 까닭이 없다.
 * 항목 하나라도 끝난 실행은 그대로 둔다(결과가 이미 쌓이고 있다)
 */
async function 앞빌드건너뛰기(빌드: 올린빌드): Promise<void> {
  const r = await (await db()).query<{ run_id: string }>(
    `SELECT run_id FROM test_run t
      WHERE service_id = $1 AND env = $2 AND origin = 'BUILD' AND status = 'RUNNING' AND build_id IS DISTINCT FROM $3
        AND NOT EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = t.run_id AND i.finished_at IS NOT NULL)`,
    [빌드.serviceId, 빌드.env, 빌드.id],
  );
  for (const { run_id } of r.rows) {
    const runId = Number(run_id);
    const 미완 = await unfinishedItems(runId);
    const 결과 = await abortRun(runId);
    if (결과 === null || 결과 === 'SCENARIO') continue;
    markAborted(runId);
    await Promise.all(미완.map((i) => abortRunner(i.historyId)));
    콘솔.info(`[build ${빌드.buildNo}] 앞 빌드에서 끝난 항목이 없는 실행 ${String(runId)}을 멈췄다`);
  }
}

/** 올린 빌드로 실행을 건다. 스모크 케이스가 있으면 스모크만, 없거나 돌 곳이 없으면 바로 회귀다. 만든 실행 번호를 돌려준다 */
export async function 빌드실행을건다(빌드: 올린빌드, 로그: 로그 = 콘솔): Promise<number[]> {
  await 앞빌드건너뛰기(빌드);
  const 스모크 = 분배를맡긴다(await 정기실행을만든다(빌드.prefix, 빌드.env, 로그, { ...빌드, stage: 'SMOKE' }), 빌드.buildNo, 로그);
  // 스모크를 반만 만들었으면 회귀로 넘어가지 않는다 — 부르는 쪽(빌드 올리기)이 빌드를 지우고 CI 가 다시 부른다
  if (스모크.실패) throw new Error('스모크 실행을 다 만들지 못했다');
  if (스모크.runIds.length > 0) return 스모크.runIds;
  return 분배를맡긴다(await 정기실행을만든다(빌드.prefix, 빌드.env, 로그, { ...빌드, stage: 'FULL' }), 빌드.buildNo, 로그).runIds;
}

// 스모크 실행 둘(UI · 기능)이 거의 같이 끝나면 둘 다 「남은 스모크 없음」을 보고 회귀를 두 번 건다 — 빌드마다 한 줄로 세운다
// ponytail: admin 프로세스 하나 안의 잠금이다. admin 을 여럿 띄우면 DB 잠금(pg_advisory_lock)으로 바꾼다
const 줄 = new Map<number, Promise<void>>();

/** 실행이 끝날 때마다 부른다(dispatcher). 빌드 스모크의 마지막 실행이 다 통과로 끝났으면 회귀를 건다 */
export async function 스모크뒤(runId: number, 로그: 로그 = 콘솔): Promise<void> {
  const pool = await db();
  const r = await pool.query<{ build_id: string | null; build_stage: string | null; build_no: string; env: string; service_id: string; prefix: string; triggered_by: string; triggered_by_name: string | null }>(
    `SELECT t.build_id, t.build_stage, t.build_no, t.env, t.service_id, s.prefix, t.triggered_by, t.triggered_by_name
       FROM test_run t JOIN service s ON s.id = t.service_id WHERE t.run_id = $1`,
    [runId],
  );
  const 행 = r.rows[0];
  if (행 === undefined || 행.build_stage !== 'SMOKE' || 행.build_id === null) return;
  const buildId = Number(행.build_id);

  const 앞 = 줄.get(buildId) ?? Promise.resolve();
  const 이번 = 앞.then(async () => {
    const 스모크 = await pool.query<{ status: string; 안통과: boolean }>(
      `SELECT t.status, EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = t.run_id AND i.status <> 'PASS') AS "안통과"
         FROM test_run t WHERE t.build_id = $1 AND t.build_stage = 'SMOKE'`,
      [buildId],
    );
    if (스모크.rows.some((s) => s.status === 'RUNNING')) return;
    // 실패 · 해당 없음 · 멈춤이 하나라도 있으면 회귀는 안 돈다. 알림은 실행 끝 Slack 이 이미 보냈다
    if (스모크.rows.some((s) => s.status !== 'FINISHED' || s.안통과)) {
      로그.info(`[build ${행.build_no}] ${행.prefix} 스모크가 통과하지 못해 회귀를 돌리지 않는다`);
      return;
    }
    const 회귀 = await pool.query('SELECT 1 FROM test_run WHERE build_id = $1 AND build_stage = $2', [buildId, 'FULL']);
    if ((회귀.rowCount ?? 0) > 0) return;
    const 최신 = await 최신빌드(pool, Number(행.service_id), 행.env);
    if (최신?.id !== buildId) {
      로그.info(`[build ${행.build_no}] ${행.prefix} 새 빌드가 와서 이 빌드의 회귀는 건너뛴다`);
      return;
    }
    분배를맡긴다(
      await 정기실행을만든다(행.prefix, 행.env, 로그, {
        id: buildId,
        buildNo: 행.build_no,
        stage: 'FULL',
        username: 행.triggered_by,
        displayName: 행.triggered_by_name ?? 행.triggered_by,
      }),
      행.build_no,
      로그,
    );
  });
  const 꼬리 = 이번.catch(() => undefined);
  줄.set(buildId, 꼬리);
  try {
    await 이번;
  } finally {
    // 내 뒤에 줄 선 것이 없을 때만 치운다 — 있으면 그쪽이 끝나며 치운다
    if (줄.get(buildId) === 꼬리) 줄.delete(buildId);
  }
}
