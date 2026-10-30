// 기기 성능 표 읽고 쓰기 — 1초 숫자 넣기 · 앱 실행 시간 채우기 · 회차와 구간 붙이기 · 읽기 (공통/4-데이터모델 perf_device_metric)

import type { 기기줄원본 } from './deviceRecorder.js';
import type { 기기줄 } from './deviceStats.js';
import * as 표 from './store.js';

/** 기록기의 초(켠 때부터)를 실행 기준 초로 옮겨 넣는다. 같은 (실행, 기기, 초)는 먼저 온 줄을 둔다. 메모리는 팜이 소수로 보내도 정수 칸에 들게 반올림한다 */
export async function 줄넣기(runId: number, serial: string, model: string, 오프셋: number, rows: 기기줄원본[]): Promise<void> {
  if (rows.length === 0) return;
  await (await 표.풀()).query(
    `INSERT INTO perf_device_metric (run_id, serial, device, sec, fps, jank_pct, freeze_count, cpu, mem_mb, temp_c, battery_pct)
     SELECT $1, $2, $3, x.sec + $4, x.fps, x."jankPct", round(x."freezeCount"), x.cpu, round(x."memMb"), x."tempC", x."batteryPct"
       FROM jsonb_to_recordset($5::jsonb) AS x(sec int, fps numeric, "jankPct" numeric, "freezeCount" numeric, cpu numeric, "memMb" numeric, "tempC" numeric, "batteryPct" numeric)
      WHERE x.sec + $4 >= 0
     ON CONFLICT (run_id, serial, sec) DO NOTHING`,
    [runId, serial, model, 오프셋, JSON.stringify(rows)],
  );
}

/** 앱 실행 시간을 실행 설정의 그 기기 칸에 쓴다 */
export async function 실행시간채우기(runId: number, index: number, ms: number): Promise<void> {
  await (await 표.풀()).query(
    `UPDATE perf_run SET config = jsonb_set(config, ARRAY['devices', $2::text, 'launchMs'], to_jsonb($3::int)) WHERE id = $1`,
    [runId, index, Math.round(ms)],
  );
}

export interface 구간표시 {
  loop: number;
  /** 없으면 회차만 붙인다(구간 이름은 건드리지 않는다) */
  segment: string | null;
  fromSec: number;
  toSec: number;
}

/** 그 초 범위의 줄에 회차 · 구간을 붙인다 — 늦게 온 줄이 있어 끝날 때 한 번 더 붙인다 */
export async function 구간붙이기(runId: number, serial: string, s: 구간표시): Promise<void> {
  await (await 표.풀()).query(
    `UPDATE perf_device_metric SET loop = $3, segment = COALESCE($4, segment) WHERE run_id = $1 AND serial = $2 AND sec BETWEEN $5 AND $6`,
    [runId, serial, s.loop, s.segment, s.fromSec, s.toSec],
  );
}

export interface 기기줄행 extends 기기줄 {
  serial: string;
}

/** 이 실행의 기기 줄 — from 초부터(실행 중 화면이 5초마다 부른다 — series 와 같이 from 을 포함한다), serial 을 주면 그 기기만 */
export async function 줄읽기(runId: number, from = 0, serial?: string): Promise<기기줄행[]> {
  const r = await (await 표.풀()).query<기기줄행>(
    `SELECT serial, sec, loop, segment, fps::float AS fps, jank_pct::float AS "jankPct", freeze_count AS "freezeCount", cpu::float AS cpu, mem_mb AS "memMb", temp_c::float AS "tempC", battery_pct::float AS "batteryPct"
       FROM perf_device_metric WHERE run_id = $1 AND sec >= $2 AND ($3::text IS NULL OR serial = $3) ORDER BY serial, sec`,
    [runId, from, serial ?? null],
  );
  return r.rows;
}
