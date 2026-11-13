// 그날 정기 실행 묶음(UI · 기능 실행)이 다 끝나면 trace 풀기를 기다려 안정화 표에 한 번 집계한다 — 서버 전체에서 하나씩 (도메인/안정화 §3.15 「집계」)

import { setTimeout as 잠깐 } from 'node:timers/promises';

import type { Pool } from 'pg';

import { 팜logcat있음, 팜증적받는중 } from '../execution/farmEvidence.js';
import { trace줄끝 } from '../execution/traceIngest.js';

import { 앱수집 } from './appCollect.js';
import { 집계를저장한다, type 수집 } from './save.js';
import { 요약일세우기 } from './summary.js';
import { 웹수집 } from './webCollect.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 웹 trace 풀기는 서버 전체 하나씩이라 다른 실행이 밀리면 오래 걸린다 — 시간으로 짧게 끊으면 바쁜 날만 분모가 줄어 추이가 흔들린다 */
export const 웹기다림상한ms = 2 * 60 * 60 * 1000;
/** 팜 파일 하나 받기 상한 10분에 여유를 더했다 — 러너가 못 받으면 logcat 이 영영 안 생긴다 */
export const 앱기다림상한ms = 15 * 60 * 1000;
const 살펴보는간격ms = 15_000;

export type 집계결과 = '대상 아님' | '기다림' | '건너뜀' | '집계함';

interface 묶음행 {
  run_id: string;
  status: string;
  started_at: Date;
  build_no: string | null;
  service_id: string;
  env: string;
  service_kind: string;
  day: string;
  occ: string | null;
  occ_state: string | null;
  occ_lines: number;
}

// 회차 실행은 같은 회차의 UI · 기능 실행이 한 묶음이고 하루는 회차 날짜다 — 앞 세트를 기다리다 자정을 넘겨 시작해도 두 날이 섞이지 않는다.
// 안정화 기준 세트의 회차만 센다. 회차 번호가 빈 옛 정기 실행은 그날 같은 애플리케이션 · 대상 서버의 정기 UI · 기능 실행이 한 묶음이다 (도메인/정기실행 §3.16 「안정화 기준 세트」).
// 옛 정기 실행의 하루는 그 애플리케이션 기준 세트의 시간대다 — 옛 service.schedule_tz 가 옮겨 간 곳이고, 기준 세트가 없으면 UTC 다
export const 묶음SQL = `
  WITH 이 AS (
    SELECT r.service_id, r.env, s.kind AS service_kind, z.tz, r.sched_occurrence_id AS occ, o.state AS occ_state,
           (SELECT count(*) FROM sched_set_item i WHERE i.set_id = o.set_id AND i.kind IN ('UI', 'FN'))::int AS occ_lines,
           COALESCE(o.planned_on, (r.started_at AT TIME ZONE z.tz)::date) AS day
      FROM test_run r JOIN service s ON s.id = r.service_id
      CROSS JOIN LATERAL (SELECT COALESCE((SELECT b.tz FROM sched_set b JOIN sched_set_item bi ON bi.set_id = b.id
                                            WHERE b.is_base AND bi.service_id = r.service_id ORDER BY b.id LIMIT 1), 'UTC') AS tz) z
      LEFT JOIN sched_occurrence o ON o.id = r.sched_occurrence_id
      LEFT JOIN sched_set st ON st.id = o.set_id
     WHERE r.run_id = $1 AND r.origin = 'SCHEDULED' AND r.kind IN ('UI', 'FN') AND (r.sched_occurrence_id IS NULL OR st.is_base))
  SELECT r.run_id, r.status, r.started_at, r.build_no, 이.service_id, 이.env, 이.service_kind, to_char(이.day, 'YYYY-MM-DD') AS day, 이.occ, 이.occ_state, 이.occ_lines
    FROM 이 JOIN test_run r ON r.service_id = 이.service_id AND r.env = 이.env AND r.origin = 'SCHEDULED' AND r.kind IN ('UI', 'FN')
                           AND (CASE WHEN 이.occ IS NULL THEN r.sched_occurrence_id IS NULL AND (r.started_at AT TIME ZONE 이.tz)::date = 이.day
                                     ELSE r.sched_occurrence_id = 이.occ END)
   ORDER BY r.run_id`;

/** 실행 하나가 끝날 때마다 부른다. 묶음의 마지막 실행이 끝났을 때만 집계한다. 상한을 안 주면 종류마다의 기다림 상한이다 */
export async function 집계한다(runId: number, 상한ms?: number, 간격ms = 살펴보는간격ms): Promise<집계결과> {
  const pool = await db();
  const 묶음 = (await pool.query<묶음행>(묶음SQL, [runId])).rows;
  // 웹 · Android 앱 · 게임만 센다 — API 는 메뉴가 없다(결정 13)
  const 종류 = 묶음[0]?.service_kind;
  if (종류 !== 'SCREEN' && 종류 !== 'APP' && 종류 !== 'GAME') return '대상 아님';
  const 회차 = 묶음[0]!;
  // 뒤에 끝나는 실행이 다시 부른다. 회차는 줄을 차례대로 돌려 기능 실행이 끝날 때 UI 실행이 아직 없을 수 있다 — 회차를 닫는 점검이 다시 부른다
  if (묶음.some((r) => r.status === 'RUNNING') || 회차.occ_state === 'QUEUED' || 회차.occ_state === 'RUNNING') return '기다림';
  // 중단 · 준비 실패가 하나라도 있거나 회차가 줄을 다 못 만들고 닫혔으면(6시간 상한 · 못 만든 줄) 그날 점을 비운다 — 반쪽 분모로 점이 튀지 않게
  if (묶음.some((r) => r.status !== 'FINISHED') || (회차.occ !== null && 묶음.length < 회차.occ_lines)) return '건너뜀';

  const 번호들 = 묶음.map((r) => Number(r.run_id));
  const 끝번호 = Math.max(...번호들);
  const 머리 = 묶음[0]!;
  // 이미 했거나 뒤 묶음이 먼저 집계됐다 — 앞 묶음을 뒤에 끼우면 이전 실행 · 최초 발생 · 상태가 뒤집힌다
  const 막힘 = await pool.query('SELECT 1 FROM stab_run WHERE run_id = ANY($1) OR (service_id = $2 AND env = $3 AND run_id > $4) LIMIT 1', [
    번호들,
    머리.service_id,
    머리.env,
    끝번호,
  ]);
  if ((막힘.rowCount ?? 0) > 0) return '건너뜀';

  let 모음: 수집;
  if (종류 === 'APP' || 종류 === 'GAME') {
    // 게임 오류 파일은 kit 이 항목 안에서 남겨 이미 있다 — 러너가 응답 뒤에 받는 logcat 만 기다린다
    await logcat을기다린다(pool, 번호들, 상한ms ?? 앱기다림상한ms, 간격ms);
    모음 = await 앱수집(pool, Number(머리.service_id), 머리.env, 번호들, 종류 === 'GAME');
  } else {
    await trace를기다린다(pool, 번호들, 상한ms ?? 웹기다림상한ms, 간격ms);
    모음 = await 웹수집(pool, Number(머리.service_id), 번호들);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await 집계를저장한다(
      client,
      {
        runId: 끝번호,
        serviceId: Number(머리.service_id),
        env: 머리.env,
        day: 머리.day,
        buildNo: 묶음.map((r) => r.build_no).filter((b) => b !== null).at(-1) ?? null,
        시작: new Date(Math.min(...묶음.map((r) => r.started_at.getTime()))),
      },
      모음,
    );
    // 오류가 없는 날도 세운다 — 「오류 없음」도 한 줄 결론이다
    await 요약일세우기(client, Number(머리.service_id), 끝번호);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return '집계함';
}

/** 모든 항목에 trace 상태 줄이 설 때까지. 상한을 넘긴 항목은 기록 없음으로 센다 */
async function trace를기다린다(pool: Pool, 번호들: number[], 상한ms: number, 간격ms: number): Promise<void> {
  const 마감 = Date.now() + 상한ms;
  const 남은수 = async (): Promise<number> =>
    Number(
      (
        await pool.query<{ n: string }>(
          `SELECT count(*) AS n FROM run_item i
            WHERE i.run_id = ANY($1) AND NOT EXISTS (SELECT 1 FROM run_trace t WHERE t.history_id = i.history_id)`,
          [번호들],
        )
      ).rows[0]!.n,
    );
  const 기록없음 = (n: number, 까닭: string): void =>
    console.warn(`[stability] 실행 ${번호들.join(' · ')} — trace 상태 줄이 없는 항목 ${String(n)}건은 기록 없음으로 센다(${까닭})`);
  for (;;) {
    const 남은 = await 남은수();
    if (남은 === 0) return;
    const 남은시간 = 마감 - Date.now();
    if (남은시간 <= 0) return 기록없음(남은, '기다림 상한');
    // 묶음이 다 끝났으면 항목의 풀기는 이미 줄에 들어갔다 — 줄이 비었는데도 상태 줄이 없으면 앞으로도 안 선다
    // (결과 저장이 깨져 미실행으로 닫힌 항목 · 재기동 때 zip 이 없던 항목). 상한까지 묶여 다른 집계를 막지 않게 바로 끝낸다
    const 줄이빔 = await Promise.race([trace줄끝().then(() => true), 잠깐(Math.min(간격ms, 남은시간), false, { ref: false })]);
    if (줄이빔) {
      const 그래도 = await 남은수();
      if (그래도 > 0) return 기록없음(그래도, '풀 일이 줄에 없다');
      return;
    }
  }
}

/**
 * android 항목마다 logcat 이 생기거나 러너가 받기를 끝낼 때까지. 통과 못 한 항목은 받기를 끝내면(못 받았어도) 세션 번호 파일을 지운다 —
 * 번호 파일도 logcat 도 없으면 더 기다려도 안 생긴다(연결을 못 열었거나 다른 기계 러너). 통과 항목은 「영상 보기」 몫으로 번호 파일이 남아 logcat 만 본다
 */
async function logcat을기다린다(pool: Pool, 번호들: number[], 상한ms: number, 간격ms: number): Promise<void> {
  const 항목 = (
    await pool.query<{ run_id: string; history_id: string }>("SELECT run_id, history_id FROM run_item WHERE run_id = ANY($1) AND platform = 'android'", [번호들])
  ).rows.map((r) => [Number(r.run_id), Number(r.history_id)] as const);
  const 마감 = Date.now() + 상한ms;
  for (;;) {
    // 15초마다 항목 전부를 보므로 이 볼륨의 파일만 본다 — 터널 너머 러너까지 물으면 한 바퀴가 간격보다 길어진다. 번호 파일도 이 볼륨만 본다
    const 남은 = (
      await Promise.all(항목.map(async ([runId, h]) => (!(await 팜logcat있음(runId, h)) && (await 팜증적받는중(runId, h)) ? [h] : [])))
    ).flat();
    if (남은.length === 0) return;
    const 남은시간 = 마감 - Date.now();
    if (남은시간 <= 0) {
      console.warn(`[stability] 실행 ${번호들.join(' · ')} — logcat 이 없는 항목 ${String(남은.length)}건은 logcat 없이 센다(기다림 상한 — 앱은 기록 없음 · 게임은 게임 오류 파일만)`);
      return;
    }
    await 잠깐(Math.min(간격ms, 남은시간), undefined, { ref: false });
  }
}

// 한 번에 하나. 앞 일이 깨져도 줄은 계속 돈다
let 줄: Promise<unknown> = Promise.resolve();

export function 안정화집계를맡긴다(runId: number): Promise<void> {
  const 일 = 줄.then(() => 집계한다(runId)).then(
    () => undefined,
    (err: unknown) => {
      console.error(`[stability] 실행 ${String(runId)} 을 안정화 지표에 집계하지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    },
  );
  줄 = 일;
  return 일;
}

/** 24시간 안에 끝난 정기 실행 중 자기 묶음의 집계 줄이 없는 것 — 시작 차례. 묶음 실행 둘이 다 나와도 집계한다 가 묶음째 걸러 한 번만 한다 */
export async function 빠진집계후보(): Promise<number[]> {
  const pool = await db();
  const r = await pool.query<{ run_id: string }>(
    `SELECT r.run_id FROM test_run r
      WHERE r.origin = 'SCHEDULED' AND r.kind IN ('UI', 'FN') AND r.status = 'FINISHED' AND r.finished_at > now() - interval '24 hours'
        -- 자기 묶음(번호가 같거나 뒤)이 집계됐으면 뺀다 — 묶음의 앞 실행은 집계 줄 번호가 아니라서 그대로 두면 재기동마다 다시 나온다
        AND NOT EXISTS (SELECT 1 FROM stab_run s WHERE s.service_id = r.service_id AND s.env = r.env AND s.run_id >= r.run_id)
        -- 기준 세트가 아닌 회차 실행은 늘 대상 아님이라 한 줄짜리 집계 차례를 잡지 않게 뺀다
        AND (r.sched_occurrence_id IS NULL
             OR EXISTS (SELECT 1 FROM sched_occurrence o JOIN sched_set st ON st.id = o.set_id WHERE o.id = r.sched_occurrence_id AND st.is_base))
      ORDER BY r.started_at, r.run_id`,
  );
  return r.rows.map((row) => Number(row.run_id));
}

/** 관리 서버가 다시 켜지면 빠진 집계를 줄에 넣는다 */
export async function 빠진집계를한다(): Promise<number> {
  const 후보 = await 빠진집계후보();
  for (const runId of 후보) void 안정화집계를맡긴다(runId);
  return 후보.length;
}
