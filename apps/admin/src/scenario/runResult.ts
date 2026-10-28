// 시나리오 실행을 러너에 맡기고 결과를 부품·절차에 적어 실행을 닫는다 (SPEC 도메인/시나리오 §7 「실행 결과를 적는 규칙」)

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart, ScenarioPartResult } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { enqueue } from '../execution/dispatcher.js';
import { 폰차례 } from '../execution/phone.js';
import { callScenarioRunner } from '../execution/runner.js';
import { 기기칸 } from '../execution/runLifecycle.js';
import { jsonb에맞춘다 } from '../jsonbText.js';

import { type 폰앱, 팜폰으로돌린다 } from './phone.js';
import { type 부품기록, 부품비밀, 실패부품trace, 시나리오trace경로, trace를지운다 } from './runTrace.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 케이스 분배와 같은 대기줄을 탄다 — 동시 상한을 나눠 써야 대상 서버가 버틴다 (SPEC §9).
// finishRun 을 안 쓴다: run_item 이 0건이라 부르는 즉시 FINISHED 가 된다.
// 앱 · 게임 단계가 있으면 디바이스 줄 → 동시성 자리 → 팜 폰 차례로 잡는다 — 줄에서 기다리는 동안 웹 실행 자리를 묶지 않게 (§3.7 결정 16)
export function 시나리오분배(runId: number, 요청: ScenarioExecuteRequest, 폰?: 폰앱): Promise<void> {
  const 돌기 = () =>
    enqueue(async () => {
      await 결과저장(runId, 폰 === undefined ? await callScenarioRunner(요청) : await 팜폰으로돌린다(요청, 폰));
    });
  return 폰 === undefined ? 돌기() : 폰차례(돌기);
}

const 빠진부품 = '러너가 이 단계 결과를 돌려주지 않았다';

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

// 꽂은 값(bound)은 응답에서야 안다. 결과 조회(runRoutes.ts)와 같은 비밀 목록으로 가린 뒤 넣는다 — DB 에는 가린 값만 들어간다
// 기록은 덤이다 — 비밀 목록을 못 읽어도 결과는 적는다
async function 실패기록(pool: Pool, runId: number, 응답: ScenarioExecuteResponse): Promise<Map<number, 부품기록>> {
  let 재료;
  try {
    재료 = await pool.query<{ seq: number; part: ScenarioPart; param_schema: unknown; expected_schema: unknown }>(
      'SELECT seq, part, param_schema, expected_schema FROM scenario_run_part WHERE run_id = $1',
      [runId],
    );
  } catch (err) {
    console.error(`[scenario] 실행 ${runId} 의 실패 기록을 만들 재료를 못 읽었다(결과는 적는다)`, err);
    return new Map();
  }
  const 꽂은값 = new Map(응답.parts.map((p) => [p.seq, p.bound ?? {}]));
  const 비밀 = 부품비밀(재료.rows.map((r) => ({ ...r, bound: 꽂은값.get(r.seq) ?? {} })));
  return 실패부품trace(시나리오trace경로({ runId }), 응답, 비밀);
}

async function 적는다(runId: number, 받은응답: ScenarioExecuteResponse): Promise<boolean> {
  // 케이스 결과 저장(execution/runLifecycle.ts finishItem)과 같은 까닭으로 거른다 — 글자 하나에 부품 전부가 NA 가 되지 않게
  const 응답 = jsonb에맞춘다(받은응답);
  const pool = await db();
  // 트랜잭션 밖에서 푼다 — zip 을 푸는 동안 실행 행을 잡고 있지 않게
  const 기록들 = await 실패기록(pool, runId, 응답);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // 실행 행을 먼저 RUNNING 조건으로 닫는다. 재기동 복구가 ABORTED 로 닫은 실행을 늦은 결과가 덮지 않게 한다
    // 폰 판은 앱 · 게임 단계가 있고 연결이 열렸을 때만 온다 — 시나리오에 한 벌이라 실행 행에 둔다 (§3.7 결정 16)
    const 닫힘 = await c.query(
      `UPDATE test_run SET status = 'FINISHED', finished_at = now(), device = $2
        WHERE run_id = $1 AND kind = 'SCENARIO' AND status = 'RUNNING'`,
      [runId, 기기칸(응답.device)],
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
      await 부품적기(c, 행.id, 결과, 기록들.get(행.seq) ?? null);
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
    // 적은 뒤에만 지운다. 늦게 와 버린 결과 · 되돌린 저장이면 zip 이 남아 사람이 열어 볼 수 있다
    await trace를지운다(시나리오trace경로({ runId }), 기록들);
    return true;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

async function 부품적기(c: PoolClient, partId: string, 결과: ScenarioPartResult, 기록: 부품기록 | null): Promise<void> {
  await c.query(
    `UPDATE scenario_run_part SET status = $2, duration_ms = $3, error = $4, mocks = $5, skipped_steps = $6, bound = $7,
                                  trace = $8, finished_at = now()
      WHERE id = $1`,
    [
      partId,
      결과.status,
      결과.durationMs,
      결과.error === undefined ? null : JSON.stringify(결과.error),
      JSON.stringify(결과.mocks),
      JSON.stringify(결과.steps.filter((s) => s.skipped === true).map((s) => s.title)),
      JSON.stringify(결과.bound ?? {}),
      기록 === null ? null : JSON.stringify(기록),
    ],
  );
  // execution/store.ts 의 run_item_step 넣기와 같은 모양이다. 건너뜀 칸이 하나 더 있다
  for (const s of 결과.steps) {
    await c.query(
      `INSERT INTO scenario_run_step (part_id, seq, title, status, skipped, duration_ms, assertions, line, screenshot_path,
                                      http_trace, error, shape_checks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        s.shapeChecks === undefined ? null : JSON.stringify(s.shapeChecks),
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
