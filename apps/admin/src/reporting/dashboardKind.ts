// 대시보드 종류별 칸 — 애플리케이션 하나의 이번 창 접은 줄을 종류마다의 단위(브라우저 · 기기 · 창 · 엔드포인트)로 나눈다 (도메인/리포팅 §8.12 「종류별 칸」)

import type { Pool } from 'pg';

import { API틀 } from '../prd/apiMap.js';
import type { 접은줄 } from './dashboardShape.js';

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
       FROM run_item WHERE run_id = ANY($1::bigint[])
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
  for (const r of 지도.rows) {
    const 이름 = `${r.method} ${r.path}`;
    틀이름.set(`${r.method}\u0000${r.host}\u0000${r.path}`, 이름);
    if (r.tc_id !== null) 케이스.set(r.tc_id, [...(케이스.get(r.tc_id) ?? []), 이름]);
  }
  // ponytail: 이번 창 요청 기록을 다 읽는다 — 실행이 수천 건으로 커져 느리면 걸린 시간을 지도 줄에 모아 둔다
  const 기록 = await pool.query<{ method: string; url: string; duration_ms: number }>(
    `SELECT n.method, n.url, n.duration_ms FROM run_network n JOIN run_item i ON i.history_id = n.history_id
      WHERE i.run_id = ANY($1::bigint[]) AND n.duration_ms IS NOT NULL`,
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
export async function 종류칸읽기(pool: Pool, serviceId: number, kind: 애플리케이션종류, 줄들: 접은줄[]): Promise<종류칸> {
  const runIds = [...new Set(줄들.map((줄) => 줄.runId))];
  if (kind === 'SCREEN') return { kind, rows: 종류줄을센다(줄들, (줄) => [줄.platform]) };
  if (kind === 'APP') {
    const 기기 = await 기기들(pool, runIds);
    return { kind, rows: 종류줄을센다(줄들, (줄) => [기기.get(줄키(줄.runId, 줄.tcId, 줄.platform)) ?? null]) };
  }
  if (kind === 'GAME') {
    const 창 = await 창들(pool, [...new Set(줄들.map((줄) => 줄.tcId))]);
    return { kind, rows: 종류줄을센다(줄들, (줄) => [창.get(줄.tcId) ?? null]) };
  }
  const { 케이스, 걸린시간 } = await 엔드포인트들(pool, serviceId, runIds);
  // 지도에 없는 케이스는 「엔드포인트 정보 없음」 한 줄로 — 빼면 지도를 아직 안 쌓은 애플리케이션이 「결과가 없습니다」로 읽힌다
  return { kind, rows: 종류줄을센다(줄들, (줄) => 케이스.get(줄.tcId) ?? [null], 걸린시간) };
}

/** 서비스의 종류를 읽어 종류별 칸을 짓는다. 없는 서비스면 null */
export async function 고른종류칸(pool: Pool, serviceId: number, 줄들: 접은줄[]): Promise<종류칸 | null> {
  const { rows } = await pool.query<{ kind: 애플리케이션종류 }>('SELECT kind FROM service WHERE id = $1', [serviceId]);
  const kind = rows[0]?.kind;
  return kind === undefined ? null : 종류칸읽기(pool, serviceId, kind, 줄들);
}
