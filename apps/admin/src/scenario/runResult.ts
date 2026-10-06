// 시나리오 실행을 러너에 맡기고 결과를 부품·절차에 적어 실행을 닫는다 (SPEC 도메인/시나리오 §7 「실행 결과를 적는 규칙」)

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPartResult } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { enqueue } from '../execution/dispatcher.js';
import { callScenarioRunner } from '../execution/runner.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 케이스 분배와 같은 대기줄을 탄다 — 동시 상한을 나눠 써야 대상 서버가 버틴다 (SPEC §9).
// finishRun 을 안 쓴다: run_item 이 0건이라 부르는 즉시 FINISHED 가 된다
export function 시나리오분배(runId: number, 요청: ScenarioExecuteRequest): Promise<void> {
  return enqueue(async () => {
    await 결과저장(runId, await callScenarioRunner(요청));
  });
}

const 빠진부품 = '러너가 이 부품 결과를 돌려주지 않았다';

// 규칙의 정본은 도메인/시나리오 §7 「실행 결과를 적는 규칙」. false 면 결과를 적지 못했다(늦게 왔거나 저장이 깨졌다)
export async function 결과저장(runId: number, 응답: ScenarioExecuteResponse): Promise<boolean> {
  try {
    return await 적는다(runId, 응답);
  } catch (err) {
    // 원문은 부품 error 에도 남지만 운영자는 로그부터 본다 — 닫고 나서도 한 줄 남긴다.
    // 뒷정리도 같이 버려지므로 어느 삭제가 실패했는지는 이 로그에만 남는다
    console.error(`[scenario] 실행 ${runId} 결과를 저장하지 못했다`, err, { cleanup: 응답.cleanup ?? [] });
    await 저장실패로닫기(runId, err);
    return false;
  }
}

async function 적는다(runId: number, 응답: ScenarioExecuteResponse): Promise<boolean> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    // 실행 행을 먼저 RUNNING 조건으로 닫는다. 재기동 복구가 ABORTED 로 닫은 실행을 늦은 결과가 덮지 않게 한다
    const 닫힘 = await c.query(
      `UPDATE test_run SET status = 'FINISHED', finished_at = now()
        WHERE run_id = $1 AND kind = 'SCENARIO' AND status = 'RUNNING'`,
      [runId],
    );
    if (닫힘.rowCount === 0) {
      await c.query('ROLLBACK');
      // 러너가 대상 서버에 이미 보낸 삭제다. 결과를 버리면 어느 데이터가 지워졌는지는 이 로그에만 남는다
      console.warn(`[scenario] 실행 ${runId} 결과가 늦게 와 버린다`, { cleanup: 응답.cleanup ?? [] });
      return false;
    }

    // 겹친 seq 는 첫 것만 믿는다. 모르는 seq 는 짝 지을 행이 없어 저절로 버려진다
    const 결과들 = new Map<number, ScenarioPartResult>();
    for (const p of 응답.parts) if (!결과들.has(p.seq)) 결과들.set(p.seq, p);

    const 행들 = await c.query<{ id: string; seq: number }>(
      'SELECT id, seq FROM scenario_run_part WHERE run_id = $1 AND finished_at IS NULL',
      [runId],
    );
    for (const 행 of 행들.rows) {
      const 결과 = 결과들.get(행.seq);
      if (결과 === undefined) {
        // 러너 거절·끊김이면 응답 error 가 사유다 — 부품마다 같은 문장이 남아야 한다 (§7)
        await c.query(
          `UPDATE scenario_run_part SET status = 'NA', duration_ms = COALESCE(duration_ms, 0),
                  error = jsonb_build_object('message', $2::text), finished_at = now()
            WHERE id = $1`,
          [행.id, 응답.error?.message ?? 빠진부품],
        );
        continue;
      }
      await 부품적기(c, 행.id, 결과);
    }

    // 뒷정리는 실행 한 벌로 온다. 러너가 그 부품 결과를 안 줬어도 이미 보낸 삭제는 그 행에 남아야 한다 (§7)
    const 뒷정리 = new Map<number, Omit<ScenarioCleanup, 'fromSeq'>[]>();
    for (const { fromSeq, ...줄 } of 응답.cleanup ?? []) {
      const 묶음 = 뒷정리.get(fromSeq) ?? [];
      묶음.push(줄);
      뒷정리.set(fromSeq, 묶음);
    }
    for (const [seq, 줄들] of 뒷정리) {
      const r = await c.query('UPDATE scenario_run_part SET cleanup = $3 WHERE run_id = $1 AND seq = $2', [
        runId,
        seq,
        JSON.stringify(줄들),
      ]);
      if (r.rowCount === 0) console.warn(`[scenario] 실행 ${runId} 뒷정리 줄 fromSeq ${seq} 짝 없음 — 버림`);
    }

    await c.query('COMMIT');
    return true;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

async function 부품적기(c: PoolClient, partId: string, 결과: ScenarioPartResult): Promise<void> {
  await c.query(
    `UPDATE scenario_run_part SET status = $2, duration_ms = $3, error = $4, mocks = $5, skipped_steps = $6, bound = $7,
                                  finished_at = now()
      WHERE id = $1`,
    [
      partId,
      결과.status,
      결과.durationMs,
      결과.error === undefined ? null : JSON.stringify(결과.error),
      JSON.stringify(결과.mocks),
      JSON.stringify(결과.steps.filter((s) => s.skipped === true).map((s) => s.title)),
      JSON.stringify(결과.bound ?? {}),
    ],
  );
  // execution/store.ts 의 run_item_step 넣기와 같은 모양이다. 건너뜀 칸이 하나 더 있다
  for (const s of 결과.steps) {
    await c.query(
      `INSERT INTO scenario_run_step (part_id, seq, title, status, skipped, duration_ms, assertions, line, screenshot_path,
                                      http_trace, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (part_id, seq) DO NOTHING`,
      [
        partId,
        s.seq,
        s.title,
        s.status,
        s.skipped === true,
        s.durationMs,
        JSON.stringify(s.assertions),
        s.line ?? null,
        s.screenshotPath ?? null,
        s.httpTrace === undefined ? null : JSON.stringify(s.httpTrace),
        s.error === undefined ? null : JSON.stringify(s.error),
      ],
    );
  }
}

// 그대로 두면 재기동 때까지 RUNNING 으로 남는다 (§7). 한 문장이라 실행과 부품이 같이 닫히거나 같이 안 닫힌다
async function 저장실패로닫기(runId: number, err: unknown): Promise<void> {
  const 원문 = err instanceof Error ? err.message : String(err);
  try {
    await (await db()).query(
      `WITH r AS (
         UPDATE test_run SET status = 'FINISHED', finished_at = now()
          WHERE run_id = $1 AND kind = 'SCENARIO' AND status = 'RUNNING' RETURNING run_id)
       UPDATE scenario_run_part SET status = 'NA', duration_ms = COALESCE(duration_ms, 0),
              error = jsonb_build_object('message', $2::text), finished_at = now()
        WHERE run_id IN (SELECT run_id FROM r) AND finished_at IS NULL`,
      [runId, `결과를 저장하지 못했다: ${원문}`],
    );
  } catch (닫기실패) {
    // 여기까지 깨지면 남은 그물은 재기동 복구뿐이다. 원인 둘을 다 남긴다
    console.error(`시나리오 실행 ${runId} 결과 저장 실패를 닫지도 못했다`, err, 닫기실패);
  }
}
