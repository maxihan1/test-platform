// 기기 성능 표 읽고 쓰기 — 1초 숫자 넣기 · 앱 실행 시간 채우기 · 회차와 구간 붙이기 · 읽기 (공통/4-데이터모델 perf_device_metric)

import type { 기기줄원본 } from './deviceRecorder.js';
import { 분포거르기, type 기기줄 } from './deviceStats.js';
import * as 표 from './store.js';

// 숫자가 아닌 값이 한 줄이라도 오면 numeric 변환이 묶음 전체를 버린다 — 그 칸만 비운다
const 수 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const 열상태 = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6 ? v : null);

/** 기록기의 초(켠 때부터)를 실행 기준 초로 옮겨 넣는다. 같은 (실행, 기기, 초)는 먼저 온 줄을 둔다. 메모리는 팜이 소수로 보내도 정수 칸에 들게 반올림한다.
 *  프리징은 음수면 비운다 — 칸 검사(>= 0)에 한 줄이 걸리면 그 묶음의 FPS · CPU · 메모리까지 다 버려진다.
 *  열 상태(0~6)와 프레임 분포도 같은 이유로 걸러서 넣는다. 내 컴퓨터 러너 줄에는 gpu · vramMb 키가 없어 null 이다 */
export async function 줄넣기(runId: number, serial: string, model: string, 오프셋: number, 원본: 기기줄원본[]): Promise<void> {
  if (원본.length === 0) return;
  const rows = 원본.map((r) => ({ ...r, frameHist: 분포거르기(r.frameHist), thermalStatus: 열상태(r.thermalStatus), gpu: 수(r.gpu), vramMb: 수(r.vramMb) }));
  await (await 표.풀()).query(
    `INSERT INTO perf_device_metric (run_id, serial, device, sec, fps, jank_pct, freeze_count, cpu, mem_mb, temp_c, battery_pct, frame_hist, thermal_status, gpu, vram_mb)
     SELECT $1, $2, $3, x.sec + $4, x.fps, x."jankPct", CASE WHEN x."freezeCount" >= 0 THEN round(x."freezeCount") END, x.cpu, round(x."memMb"), x."tempC", x."batteryPct", x."frameHist", x."thermalStatus", x.gpu, round(x."vramMb")
       FROM jsonb_to_recordset($5::jsonb) AS x(sec int, fps numeric, "jankPct" numeric, "freezeCount" numeric, cpu numeric, "memMb" numeric, "tempC" numeric, "batteryPct" numeric, "frameHist" jsonb, "thermalStatus" smallint, gpu numeric, "vramMb" numeric)
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

/** VISION PC 가 준 사양을 실행 설정의 그 기기 칸에 쓴다 — 사양이 다르면 FPS 를 비교할 수 없어 남긴다 (§3.9 「PC 게임」) */
export async function 사양채우기(runId: number, index: number, spec: { cpu: string; gpu: string; resolution: string }): Promise<void> {
  await (await 표.풀()).query(
    `UPDATE perf_run SET config = jsonb_set(config, ARRAY['devices', $2::text, 'spec'], $3::jsonb) WHERE id = $1`,
    [runId, index, JSON.stringify(spec)],
  );
}

export interface 구간표시 {
  loop: number;
  /** 없으면 회차만 붙인다 — 같은 회차면 구간 이름을 건드리지 않고, 앞 회차에 붙은 이름은 지운다 */
  segment: string | null;
  fromSec: number;
  toSec: number;
}

/** 그 초 범위의 줄에 회차 · 구간을 붙인다 — 늦게 온 줄이 있어 끝날 때 한 번 더 붙인다 */
export async function 구간붙이기(runId: number, serial: string, s: 구간표시): Promise<void> {
  await (await 표.풀()).query(
    `UPDATE perf_device_metric SET loop = $3, segment = COALESCE($4, CASE WHEN loop = $3 THEN segment END) WHERE run_id = $1 AND serial = $2 AND sec BETWEEN $5 AND $6`,
    [runId, serial, s.loop, s.segment, s.fromSec, s.toSec],
  );
}

export interface 기기줄행 extends 기기줄 {
  serial: string;
}

/** 이 실행의 기기 줄 — from 초부터(실행 중 화면이 5초마다 부른다 — series 와 같이 from 을 포함한다), serial 을 주면 그 기기만 */
export async function 줄읽기(runId: number, from = 0, serial?: string): Promise<기기줄행[]> {
  const r = await (await 표.풀()).query<기기줄행>(
    `SELECT serial, sec, loop, segment, fps::float AS fps, jank_pct::float AS "jankPct", freeze_count AS "freezeCount", cpu::float AS cpu, mem_mb AS "memMb", temp_c::float AS "tempC", battery_pct::float AS "batteryPct", frame_hist AS "frameHist", thermal_status AS "thermalStatus", gpu::float AS gpu, vram_mb AS "vramMb"
       FROM perf_device_metric WHERE run_id = $1 AND sec >= $2 AND ($3::text IS NULL OR serial = $3) ORDER BY serial, sec`,
    [runId, from, serial ?? null],
  );
  return r.rows;
}
