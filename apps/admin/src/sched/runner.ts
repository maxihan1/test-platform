// 정기 실행 1분 점검 — 회차를 세우고 프로젝트마다 하나씩 줄 세워 줄 차례로 실행을 만든다 (도메인/정기실행 §3.16 「회차」)
// HTTP 를 거치지 않는다 — 로그인 없이 실행을 시키는 문을 내지 않으려고 admin 프로세스 안에서 만든다 (도메인/인증 §7 「인증 적용 범위」)

import type { FastifyInstance } from 'fastify';

import { pool } from '../db/index.js';
import { 안정화집계를맡긴다 } from '../stability/aggregate.js';
import { 줄앱 } from './check.js';
import { 줄돌리기 } from './make.js';
import { 세트들읽기, 재료읽기 } from './store.js';

export interface 로그 {
  info: (말: string) => void;
  error: (말: string) => void;
}

const 글 = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * 그날 회차를 세운다. 켜짐 · 오늘(세트 시간대)이 반복에 듦 · 지금이 정한 시각부터 1시간 안(자정을 넘지 않는다) · 정한 시각이 마지막 저장 뒤.
 * 그날 하나는 UNIQUE 가 막는다. 지금은 DB 시계다 — 실행의 started_at 도 DB 가 적는다 (§3.16 「회차를 세운다」 · 공통/6-인프라 §9.2)
 */
export async function 회차세우기(지금: Date | null = null): Promise<number> {
  const r = await pool.query(
    `WITH 기준 AS (SELECT COALESCE($1::timestamptz, now()) AS t),
          세트 AS (SELECT s.id, s.at, s.tz, s.days, s.once_on, s.updated_at, (기준.t AT TIME ZONE s.tz) AS 현지 FROM sched_set s, 기준 WHERE s.is_on)
     INSERT INTO sched_occurrence (set_id, planned_on, planned_at)
     SELECT id, 현지::date, (현지::date + at) AT TIME ZONE tz FROM 세트
      WHERE 현지::time - at >= interval '0' AND 현지::time - at < interval '1 hour'
        AND (once_on = 현지::date OR extract(dow FROM 현지)::smallint = ANY(days))
        AND (현지::date + at) AT TIME ZONE tz > updated_at
     ON CONFLICT (set_id, planned_on) DO NOTHING`,
    [지금],
  );
  return r.rowCount ?? 0;
}

/**
 * 프로젝트마다 RUNNING 회차가 없으면 기다리는 회차 가운데 정한 시각이 가장 이른 것(같으면 세트 번호 차례)을 시작한다.
 * 프로젝트 줄을 잠그고 본다 — 회차에 프로젝트 칸이 없어 DB 가 「프로젝트마다 하나」를 못 건다 (공통/4-데이터모델 「정기 실행 표」)
 */
export async function 회차시작(): Promise<void> {
  const 프로젝트 = await pool.query<{ project_id: string }>(
    "SELECT DISTINCT s.project_id FROM sched_occurrence o JOIN sched_set s ON s.id = o.set_id WHERE o.state = 'QUEUED'",
  );
  for (const { project_id } of 프로젝트.rows) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT 1 FROM project WHERE id = $1 FOR UPDATE', [project_id]);
      await c.query(
        `UPDATE sched_occurrence SET state = 'RUNNING', started_at = now()
          WHERE id = (SELECT o.id FROM sched_occurrence o JOIN sched_set s ON s.id = o.set_id
                       WHERE s.project_id = $1 AND o.state = 'QUEUED' ORDER BY o.planned_at, o.set_id LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM sched_occurrence o JOIN sched_set s ON s.id = o.set_id WHERE s.project_id = $1 AND o.state = 'RUNNING')`,
        [project_id],
      );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }
}

type 남길말 = { kind: string | null; service: string | null; reason: string };

async function 닫기(id: number, 말: 남길말 | null): Promise<void> {
  await pool.query(
    "UPDATE sched_occurrence SET state = 'DONE', finished_at = now(), notes = notes || $2::jsonb WHERE id = $1 AND state = 'RUNNING'",
    [id, JSON.stringify(말 === null ? [] : [말])],
  );
  // 기준 세트 회차를 닫으면 안정화 집계를 맡긴다 — 실행이 끝날 때마다 부르는 집계는 회차가 도는 동안 기다리기만 했다 (§3.16 「회차가 끝난다」)
  const r = await pool.query<{ run_id: string }>(
    `SELECT max(r.run_id) AS run_id FROM test_run r JOIN sched_occurrence o ON o.id = r.sched_occurrence_id JOIN sched_set s ON s.id = o.set_id
      WHERE o.id = $1 AND s.is_base AND r.kind IN ('UI', 'FN')`,
    [id],
  );
  if (r.rows[0]?.run_id != null) void 안정화집계를맡긴다(Number(r.rows[0].run_id));
}

/**
 * 도는 회차 하나를 한 걸음 민다. cur_seq 는 실행을 만들었거나 건너뛴 마지막 줄이다 — 그 줄의 실행은 회차의 가장 최근 실행이다.
 * 실행이 아직 돌면 기다리고, 끝났으면 다음 줄을 만든다. 빠지거나 못 만든 줄은 까닭을 남기고 바로 다음 줄로 간다 (§3.16 「줄 차례로」)
 */
async function 회차밀기(occ: { id: number; set_id: number; cur_seq: number | null; 넘김: boolean }, 로그: 로그): Promise<void> {
  // 도는 실행은 멈추지 않는다. 실행 하나가 끝나지 않아 프로젝트의 정기 실행이 다 멈추는 것을 막는다 (§3.16 「회차 상한」)
  if (occ.넘김) return 닫기(occ.id, { kind: null, service: null, reason: '6시간이 지나 다음 세트를 이어 돌렸습니다' });
  if (occ.cur_seq !== null) {
    const 최근 = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE sched_occurrence_id = $1 ORDER BY run_id DESC LIMIT 1', [occ.id]);
    if (최근.rows[0]?.status === 'RUNNING') return;
  }
  // 고친 내용은 시작하는 줄부터 쓴다 — 줄에 서서 기다리던 회차도 시작할 때의 세트로 만든다 (§3.16 「고친 내용」)
  const set = (await 세트들읽기({ id: occ.set_id }))[0]!;
  const 재 = await 재료읽기(set.projectId, set.줄들);
  for (let seq = (occ.cur_seq ?? 0) + 1; seq <= set.줄들.length; seq += 1) {
    const x = set.줄들[seq - 1]!;
    const 결과 = await 줄돌리기(x, set.고름, 재, { occurrenceId: occ.id, setName: set.name, base: set.isBase }, (말) => 로그.error(말));
    // ponytail: 실행을 만든 뒤 cur_seq 를 적기 전에 서버가 꺼지면 다시 켰을 때 그 줄을 한 번 더 만든다 — 줄 번호를 실행에 박는 칸이 생기면 그것으로 짝짓는다
    const 남김 = 'reason' in 결과 ? [{ kind: x.kind, service: 줄앱(x, 재)?.prefix ?? null, reason: 결과.reason }] : [];
    await pool.query('UPDATE sched_occurrence SET cur_seq = $2, notes = notes || $3::jsonb WHERE id = $1', [occ.id, seq, JSON.stringify(남김)]);
    if ('runId' in 결과) {
      로그.info(`[sched] 세트 ${set.name} 회차 ${String(occ.id)} 줄 ${String(seq)} → 실행 ${String(결과.runId)}`);
      return;
    }
    로그.info(`[sched] 세트 ${set.name} 회차 ${String(occ.id)} 줄 ${String(seq)} 건너뜀 — ${결과.reason}`);
  }
  await 닫기(occ.id, null);
}

/** 1분마다 부른다. 관리 서버가 다시 켜져도 같은 함수가 RUNNING · QUEUED 회차를 이어 간다 — 지난 시각의 회차는 1시간 창 밖이라 안 선다 */
export async function 정기실행점검(로그: 로그, 지금: Date | null = null): Promise<void> {
  await 회차세우기(지금);
  // 회차 하나가 다 끝나면 같은 점검에서 다음 회차를 바로 시작한다 — 실행 없이 닫힌 회차 뒤에 1분씩 쉬지 않게
  for (let 바퀴 = 0; 바퀴 < 3; 바퀴 += 1) {
    await 회차시작();
    const 도는 = await pool.query<{ id: string; set_id: string; cur_seq: number | null; 넘김: boolean }>(
      "SELECT id, set_id, cur_seq, started_at < now() - interval '6 hours' AS 넘김 FROM sched_occurrence WHERE state = 'RUNNING' ORDER BY planned_at, set_id",
    );
    for (const o of 도는.rows) {
      try {
        await 회차밀기({ id: Number(o.id), set_id: Number(o.set_id), cur_seq: o.cur_seq, 넘김: o.넘김 }, 로그);
      } catch (err) {
        // 한 회차가 깨져도 다른 프로젝트 회차는 돈다. 다음 점검이 같은 줄을 다시 본다
        로그.error(`[sched] 회차 ${o.id} 를 밀지 못했다: ${글(err)}`);
      }
    }
    const 남음 = await pool.query("SELECT 1 FROM sched_occurrence WHERE state = 'QUEUED' LIMIT 1");
    if (남음.rowCount === 0) return;
  }
}

/** admin 이 뜰 때 건다(app.ts 기동 경로 — 라우트를 띄우는 검사가 진짜 실행을 만들지 않게). 앞 점검이 안 끝났으면 이번 점검은 건너뛴다 */
export function 정기실행켜기(app: FastifyInstance): void {
  const 로그: 로그 = { info: (말) => app.log.info(말), error: (말) => app.log.error(말) };
  let 도는중 = false;
  const 점검 = setInterval(() => {
    if (도는중) return;
    도는중 = true;
    void 정기실행점검(로그)
      .catch((err: unknown) => 로그.error(`[sched] 점검이 깨졌다: ${글(err)}`))
      .finally(() => {
        도는중 = false;
      });
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}
