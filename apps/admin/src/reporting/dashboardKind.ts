// 대시보드 종류별 칸 — 애플리케이션 하나의 이번 창 접은 줄을 종류마다의 단위(브라우저 · 기기 · 창 · 엔드포인트)로 나눈다 (도메인/리포팅 §8.12 「종류별 칸」)

import type { Pool } from 'pg';

import { 지금항목 } from '../execution/single.js';
import { API틀 } from '../prd/apiMap.js';
import { 낮은FPS, type 접은줄 } from './dashboardShape.js';

export type 애플리케이션종류 = 'SCREEN' | 'APP' | 'GAME' | 'API';

export interface 종류줄 {
  /** 단위를 모르는 줄(기기 · 창 정보 없음)은 null 한 줄로 모은다 */
  label: string | null;
  pass: number;
  fail: number;
  notRun: number;
  /** API 만 찬다. 요청 기록이 없으면 null */
  p95Ms: number | null;
}

export interface 종류칸 {
  kind: 애플리케이션종류;
  rows: 종류줄[];
  /** 그 단위 하나에서만 실패한 케이스 수 — 웹은 모바일만, 앱은 기기마다. 많은 차례이고 0 인 단위는 없다 */
  onlyFail: { label: string; count: number }[];
  /** 게임만 — 이번 창 게임 성능 측정의 1초 FPS. below 는 떨어짐을 센 선(`낮은FPS`)이다. 측정이 없으면 null */
  fps: { runs: number; avg: number; drops: number; below: number } | null;
}

/**
 * 실패한 단위가 딱 하나이고 다른 단위에서는 통과한 케이스를 그 단위 몫으로 센다.
 * 단위를 모르는 줄(null)은 보지 않는다 — 어느 기기인지 모르면 「거기서만」을 말할 수 없다
 */
export function 한곳에서만실패(줄들: readonly 접은줄[], 단위: (줄: 접은줄) => string | null): { label: string; count: number }[] {
  const 케이스 = new Map<string, { 실패: Set<string>; 통과: Set<string> }>();
  for (const 줄 of 줄들) {
    const label = 단위(줄);
    if (label === null || 줄.verdict === 'NA') continue;
    const 칸 = 케이스.get(줄.tcId) ?? { 실패: new Set<string>(), 통과: new Set<string>() };
    케이스.set(줄.tcId, 칸);
    (줄.verdict === 'FAIL' ? 칸.실패 : 칸.통과).add(label);
  }
  const 셈 = new Map<string, number>();
  for (const { 실패, 통과 } of 케이스.values()) {
    const [하나] = 실패;
    if (실패.size === 1 && [...통과].some((x) => x !== 하나)) 셈.set(하나!, (셈.get(하나!) ?? 0) + 1);
  }
  return [...셈].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface 창 {
  tz: string;
  from: string;
  today: string;
}

// 기능 테스트는 아직 FPS 를 안 남겨 같은 창의 끝난(DONE) 게임 성능 측정 1초 숫자를 쓴다 — 도는 · 멈춘 측정은 반쪽 숫자라 뺀다.
// 떨어짐은 선 위에서 아래로 넘어간 번수다 — 머문 초를 세면 한 번 끊긴 것도 수십 번이 된다. 빈 FPS 를 거르기 전에 앞 숫자를 읽어 빈 칸을 건너 잇지 않는다
async function 게임FPS(pool: Pool, serviceId: number, { tz, from, today }: 창): Promise<종류칸['fps']> {
  const { rows } = await pool.query<{ runs: number; avg: number | null; drops: number }>(
    `WITH s AS (
       SELECT m.run_id, m.fps, LAG(m.fps) OVER (PARTITION BY m.run_id, m.serial ORDER BY m.sec) AS prev
         FROM perf_device_metric m JOIN perf_run r ON r.id = m.run_id
        WHERE r.service_id = $1 AND r.kind = 'DEVICE' AND r.status = 'DONE'
          AND (r.started_at AT TIME ZONE $2::text)::date BETWEEN $3::date AND $4::date)
     SELECT COUNT(DISTINCT run_id)::int AS runs, ROUND(AVG(fps), 1)::float AS avg, COUNT(*) FILTER (WHERE fps < $5 AND prev >= $5)::int AS drops
       FROM s WHERE fps IS NOT NULL`,
    [serviceId, tz, from, today, 낮은FPS],
  );
  const r = rows[0]!;
  return r.avg === null ? null : { runs: r.runs, avg: r.avg, drops: r.drops, below: 낮은FPS };
}

/** 가장 가까운 순위로 고른 95번째 백분위수 */
export function 백분위95(값들: number[]): number | null {
  if (값들.length === 0) return null;
  const 정렬 = [...값들].sort((a, b) => a - b);
  return 정렬[Math.ceil(0.95 * 정렬.length) - 1] ?? null;
}

/**
 * 줄마다 `단위` 가 준 이름들에 판정을 하나씩 더한다. 빈 배열이면 어느 줄에도 안 센다(API 지도에 없는 케이스).
 * 차례는 이름 순이고 null 은 맨 뒤다
 */
export function 종류줄을센다(
  줄들: readonly 접은줄[],
  단위: (줄: 접은줄) => readonly (string | null)[],
  걸린시간: ReadonlyMap<string, number[]> = new Map(),
): 종류줄[] {
  const 칸 = new Map<string | null, 종류줄>();
  for (const 줄 of 줄들) {
    for (const label of new Set(단위(줄))) {
      const 한줄 = 칸.get(label) ?? { label, pass: 0, fail: 0, notRun: 0, p95Ms: null };
      칸.set(label, 한줄);
      if (줄.verdict === 'PASS') 한줄.pass += 1;
      else if (줄.verdict === 'FAIL') 한줄.fail += 1;
      else 한줄.notRun += 1;
    }
  }
  for (const 한줄 of 칸.values()) if (한줄.label !== null) 한줄.p95Ms = 백분위95(걸린시간.get(한줄.label) ?? []);
  return [...칸.values()].sort((a, b) => (a.label === null ? 1 : b.label === null ? -1 : a.label.localeCompare(b.label)));
}

const 줄키 = (runId: number, tcId: string, platform: string) => `${String(runId)}\u0000${tcId}\u0000${platform}`;

// 회차마다 기기가 다르면 모델 글자 차례로 앞선 것이다 — 접은 줄 하나가 한 줄에만 들게
async function 기기들(pool: Pool, runIds: number[]): Promise<Map<string, string | null>> {
  const { rows } = await pool.query<{ run_id: string; tc_id: string; platform: string; device: { model?: unknown; osVersion?: unknown } | null }>(
    `SELECT run_id, tc_id, platform,
            (array_agg(device ORDER BY device->>'model') FILTER (WHERE device->>'model' <> ''))[1] AS device
       FROM ${지금항목('o.run_id = ANY($1::bigint[])')} i
      GROUP BY run_id, tc_id, platform`,
    [runIds],
  );
  return new Map(
    rows.map((r) => {
      const model = typeof r.device?.model === 'string' && r.device.model !== '' ? r.device.model : null;
      const os = typeof r.device?.osVersion === 'string' && r.device.osVersion !== '' ? ` · Android ${r.device.osVersion}` : '';
      return [줄키(Number(r.run_id), r.tc_id, r.platform), model === null ? null : model + os];
    }),
  );
}

// 케이스 목록 묶음과 같은 규칙 — `.page.ts` 가운데 주소(없으면 파일) 차례로 앞선 하나 (catalog/context.ts 맥락짓기)
async function 창들(pool: Pool, tcIds: string[]): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ tc_id: string; file: string; screen_url: string | null; name: string | null }>(
    `SELECT tc_id, file, screen_url, name FROM case_screen WHERE tc_id = ANY($1::text[]) AND file LIKE '%.page.ts'`,
    [tcIds],
  );
  rows.sort((a, b) => (a.screen_url ?? a.file).localeCompare(b.screen_url ?? b.file) || a.file.localeCompare(b.file));
  const 결과 = new Map<string, string>();
  for (const r of rows) if (!결과.has(r.tc_id)) 결과.set(r.tc_id, r.name ?? r.file.split('/').at(-1)!.replace(/\.page\.ts$/, ''));
  return 결과;
}

/**
 * 「GET /v1/devices/dev_dmn_none_x」 꼴 이름을 지도에 이미 있는 틀(「GET /v1/devices/:n」)로 접는다 — 방식 · 마디 수가 같고 틀이 `:` 칸인 자리만 다르면 그 틀이다.
 * 지도 규칙(`API틀`)이 영문 섞인 id 를 번호로 못 알아봐 실제 id 줄이 열 개 넘게 따로 섰다 (2026-10-31 시험 f7). 맞는 틀이 없으면 그대로 둔다
 */
// ponytail: 숫자나 밑줄이 든 8자 이상 마디만 id 로 본다 — `me` · `search` 같은 이름 경로는 옆 `:id` 틀에 안 접힌다. 이름에 밑줄 · 숫자가 든 경로가 나오면 규칙을 좁힌다
const id꼴 = (마디: string): boolean => !마디.startsWith(':') && 마디.length >= 8 && /[\d_]/.test(마디);

export function 틀로접는다(이름들: readonly string[]): Map<string, string> {
  const 쪼갬 = (이름: string) => {
    const [method = '', ...경로] = 이름.split(' ');
    return { method, 마디: 경로.join(' ').split('/') };
  };
  const 틀들 = 이름들.map(쪼갬).filter((x) => x.마디.some((m) => m.startsWith(':')));
  const 결과 = new Map<string, string>();
  for (const 이름 of 이름들) {
    const { method, 마디 } = 쪼갬(이름);
    const 틀 = 틀들.find(
      (x) => x.method === method && x.마디.length === 마디.length && x.마디.every((m, i) => m === 마디[i] || (m.startsWith(':') && id꼴(마디[i]!))),
    );
    결과.set(이름, 틀 === undefined ? 이름 : `${틀.method} ${틀.마디.join('/')}`);
  }
  return 결과;
}

// 서비스 지도의 엔드포인트 틀마다 거친 케이스와, 이번 창 요청 기록을 같은 틀로 접은 걸린 시간
async function 엔드포인트들(
  pool: Pool,
  serviceId: number,
  runIds: number[],
): Promise<{ 케이스: Map<string, string[]>; 걸린시간: Map<string, number[]> }> {
  const 지도 = await pool.query<{ method: string; host: string; path: string; tc_id: string | null }>(
    `SELECT a.method, a.host, a.path, u.tc_id
       FROM service_api a LEFT JOIN service_api_use u ON u.api_id = a.id AND u.tc_id IS NOT NULL
      WHERE a.service_id = $1`,
    [serviceId],
  );
  const 케이스 = new Map<string, string[]>();
  const 틀이름 = new Map<string, string>();
  const 접기 = 틀로접는다([...new Set(지도.rows.map((r) => `${r.method} ${r.path}`))]);
  for (const r of 지도.rows) {
    const 이름 = 접기.get(`${r.method} ${r.path}`)!;
    틀이름.set(`${r.method}\u0000${r.host}\u0000${r.path}`, 이름);
    if (r.tc_id !== null) 케이스.set(r.tc_id, [...(케이스.get(r.tc_id) ?? []), 이름]);
  }
  // ponytail: 이번 창 요청 기록을 다 읽는다 — 실행이 수천 건으로 커져 느리면 걸린 시간을 지도 줄에 모아 둔다
  const 기록 = await pool.query<{ method: string; url: string; duration_ms: number }>(
    `SELECT n.method, n.url, n.duration_ms FROM run_network n JOIN ${지금항목('o.run_id = ANY($1::bigint[])')} i ON i.history_id = n.history_id
      WHERE n.duration_ms IS NOT NULL`,
    [runIds],
  );
  const 걸린시간 = new Map<string, number[]>();
  for (const r of 기록.rows) {
    const 틀 = API틀(r.url);
    const 이름 = 틀 === null ? undefined : 틀이름.get(`${r.method.toUpperCase()}\u0000${틀.host}\u0000${틀.path}`);
    if (이름 !== undefined) 걸린시간.set(이름, [...(걸린시간.get(이름) ?? []), r.duration_ms]);
  }
  return { 케이스, 걸린시간 };
}

/** 이번 창 접은 줄(그 서비스 것만)을 받아 종류별 칸을 짓는다 */
export async function 종류칸읽기(pool: Pool, serviceId: number, kind: 애플리케이션종류, 줄들: 접은줄[], 창: 창): Promise<종류칸> {
  const runIds = [...new Set(줄들.map((줄) => 줄.runId))];
  const 칸 = { kind, onlyFail: [], fps: null };
  if (kind === 'SCREEN') {
    // 시안이 묻는 것은 「모바일에서만」이다 — PC 에서만 실패한 쪽은 세지 않는다
    return { ...칸, rows: 종류줄을센다(줄들, (줄) => [줄.platform]), onlyFail: 한곳에서만실패(줄들, (줄) => 줄.platform).filter((x) => x.label === 'mobile') };
  }
  if (kind === 'APP') {
    const 기기 = await 기기들(pool, runIds);
    const 이름 = (줄: 접은줄) => 기기.get(줄키(줄.runId, 줄.tcId, 줄.platform)) ?? null;
    return { ...칸, rows: 종류줄을센다(줄들, (줄) => [이름(줄)]), onlyFail: 한곳에서만실패(줄들, 이름) };
  }
  if (kind === 'GAME') {
    const [창이름, fps] = await Promise.all([창들(pool, [...new Set(줄들.map((줄) => 줄.tcId))]), 게임FPS(pool, serviceId, 창)]);
    return { ...칸, rows: 종류줄을센다(줄들, (줄) => [창이름.get(줄.tcId) ?? null]), fps };
  }
  const { 케이스, 걸린시간 } = await 엔드포인트들(pool, serviceId, runIds);
  // 지도에 없는 케이스는 「엔드포인트 정보 없음」 한 줄로 — 빼면 지도를 아직 안 쌓은 애플리케이션이 「결과가 없습니다」로 읽힌다
  return { ...칸, rows: 종류줄을센다(줄들, (줄) => 케이스.get(줄.tcId) ?? [null], 걸린시간) };
}

/** 서비스의 종류를 읽어 종류별 칸을 짓는다. 없는 서비스면 null */
export async function 고른종류칸(pool: Pool, serviceId: number, 줄들: 접은줄[], 창: 창): Promise<종류칸 | null> {
  const { rows } = await pool.query<{ kind: 애플리케이션종류 }>('SELECT kind FROM service WHERE id = $1', [serviceId]);
  const kind = rows[0]?.kind;
  return kind === undefined ? null : 종류칸읽기(pool, serviceId, kind, 줄들, 창);
}
