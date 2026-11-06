// 호환성 세트를 읽고 쓰고, 자동 선택 재료(전체 화면 목록 · 고를 수 있는 케이스 · 최근 소요)를 모은다 (도메인/호환성 §3.13 · 데이터모델 「호환성 표」)

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';
import { db } from '../settings/store.js';
import type { 화면, 후보 } from './select.js';

export interface 세트디바이스 {
  serial: string;
  model: string;
  name: string;
}

export interface 세트 {
  id: number;
  serviceId: number;
  name: string;
  onePerModel: boolean;
  devices: 세트디바이스[];
  addedCases: string[];
  isActive: boolean;
}

export interface 재료 {
  전체: 화면[];
  fallback: boolean;
  후보들: (후보 & { 화면수: number })[];
}

// 장소 열쇠(zone:Town)를 화면 기록 꼴로 — 크롤러가 이미 남긴 장소와 한 번만 센다 (데이터모델 「화면 기록 표의 열쇠 꼴」)
const 장소열쇠 = (key: string) => `game:World/${key}`;

/**
 * 고를 수 있는 케이스는 그 애플리케이션의 활성 케이스 가운데 폰에서 도는 것(android · mobile)이다.
 * 보류 케이스는 거르지 않는다 — 값을 안 채운 보류 케이스는 main 에 못 들어간다(K13 `check:tests --no-held`)
 */
export async function 재료읽기(serviceId: number, prefix: string): Promise<재료> {
  const pool = await db();
  const [기록, 장소, 케이스] = await Promise.all([
    // 대상 서버 · 상태를 가리지 않고 같은 틀로 모은다. 이름은 빈 것보다 있는 것
    pool.query<{ url: string; name: string }>(
      `SELECT url, max(name) AS name FROM (
         SELECT url, name FROM screen_found WHERE service_id = $1
         UNION ALL SELECT url, name FROM screen_record WHERE service_id = $1
       ) t GROUP BY url ORDER BY url COLLATE "C"`,
      [serviceId],
    ),
    pool.query<{ key: string; name: string }>(
      `SELECT key, name FROM game_element WHERE service_id = $1 AND kind = 'WORLD' AND key LIKE 'zone:%' ORDER BY key COLLATE "C"`,
      [serviceId],
    ),
    pool.query<{ tc_id: string; name: string }>(
      `SELECT tc_id, name FROM test_case
        WHERE is_active AND split_part(tc_id, '-', 1) = $1 AND (platforms ? 'android' OR platforms ? 'mobile')
        ORDER BY tc_id COLLATE "C"`,
      [prefix],
    ),
  ]);
  const 번호들 = 케이스.rows.map((r) => r.tc_id);
  const [화면줄, 장소줄] = await Promise.all([
    pool.query<{ tc_id: string; screen_url: string | null; name: string | null; open_urls: string[] }>(
      'SELECT tc_id, screen_url, name, open_urls FROM case_screen WHERE tc_id = ANY($1::text[]) ORDER BY tc_id, file',
      [번호들],
    ),
    pool.query<{ tc_id: string; key: string }>(
      `SELECT tc_id, key FROM game_element_case WHERE service_id = $1 AND key LIKE 'zone:%' AND tc_id = ANY($2::text[])`,
      [serviceId, 번호들],
    ),
  ]);

  const 틀모음 = new Map<string, Set<string>>(번호들.map((t) => [t, new Set<string>()]));
  const 케이스화면이름 = new Map<string, string>();
  for (const r of 화면줄.rows) {
    for (const 주소 of [r.screen_url, ...r.open_urls]) {
      const 틀 = 주소 === null ? null : 주소틀(주소);
      if (틀 === null) continue;
      틀모음.get(r.tc_id)?.add(틀);
      if (주소 === r.screen_url && r.name !== null && !케이스화면이름.has(틀)) 케이스화면이름.set(틀, r.name);
    }
  }
  // 화면 개수는 장소를 넣기 전에 센다 — 장소는 찍히는 화면이 아니다(찍힌 화면은 창 줄에 든다)
  const 화면수 = new Map([...틀모음].map(([t, s]) => [t, s.size]));
  for (const r of 장소줄.rows) 틀모음.get(r.tc_id)?.add(장소열쇠(r.key));

  // 크롤 화면 기록이 없으면 케이스가 아는 화면으로 대신한다 — 미커버 화면은 0 이 된다. 장소는 그대로 더한다
  const fallback = 기록.rows.length === 0;
  const 화면들: 화면[] = fallback
    ? [...new Set([...틀모음.values()].flatMap((s) => [...s]).filter((k) => !k.startsWith('game:World/zone:')))].sort().map((key) => ({ key, name: 케이스화면이름.get(key) ?? key }))
    : 기록.rows.map((r) => ({ key: r.url, name: r.name }));
  const 있는열쇠 = new Set(화면들.map((u) => u.key));
  const 장소들 = 장소.rows.map((r) => ({ key: 장소열쇠(r.key), name: r.name })).filter((u) => !있는열쇠.has(u.key));

  return {
    전체: [...화면들, ...장소들],
    fallback,
    후보들: 케이스.rows.map((r) => ({ tcId: r.tc_id, name: r.name, 틀: [...(틀모음.get(r.tc_id) ?? [])], 화면수: 화면수.get(r.tc_id) ?? 0 })),
  };
}

/** 케이스마다 최근 통과 소요 평균(최근 5건). 기록이 없는 케이스는 빠진다 */
export async function 최근소요(tcIds: readonly string[]): Promise<Map<string, number>> {
  if (tcIds.length === 0) return new Map();
  const r = await (await db()).query<{ tc_id: string; avg: string }>(
    `SELECT tc_id, avg(duration_ms) AS avg FROM (
       SELECT tc_id, duration_ms, row_number() OVER (PARTITION BY tc_id ORDER BY started_at DESC) AS n
         FROM run_item WHERE tc_id = ANY($1::text[]) AND status = 'PASS' AND duration_ms > 0
     ) t WHERE n <= 5 GROUP BY tc_id`,
    [tcIds],
  );
  return new Map(r.rows.map((x) => [x.tc_id, Number(x.avg)]));
}

interface 세트행 {
  id: string;
  service_id: string;
  name: string;
  one_per_model: boolean;
  devices: 세트디바이스[];
  added_cases: string[];
  is_active: boolean;
}

const 세트로 = (r: 세트행): 세트 => ({
  id: Number(r.id),
  serviceId: Number(r.service_id),
  name: r.name,
  onePerModel: r.one_per_model,
  devices: r.devices,
  addedCases: r.added_cases,
  isActive: r.is_active,
});

const 칸들 = 'id, service_id, name, one_per_model, devices, added_cases, is_active';

export async function 세트목록(serviceId: number): Promise<세트[]> {
  const r = await (await db()).query<세트행>(`SELECT ${칸들} FROM compat_set WHERE service_id = $1 AND is_active ORDER BY id`, [serviceId]);
  return r.rows.map(세트로);
}

/** 치운 세트도 돌려준다 — 404 를 낼지는 부르는 쪽이 정한다 */
export async function 세트하나(id: number): Promise<세트 | null> {
  const r = await (await db()).query<세트행>(`SELECT ${칸들} FROM compat_set WHERE id = $1`, [id]);
  return r.rows[0] === undefined ? null : 세트로(r.rows[0]);
}

export interface 세트몸 {
  name: string;
  onePerModel: boolean;
  devices: 세트디바이스[];
  addedCases: string[];
}

export async function 세트만들기(serviceId: number, 몸: 세트몸, 누가: string): Promise<number> {
  const r = await (await db()).query<{ id: string }>(
    `INSERT INTO compat_set (service_id, name, one_per_model, devices, added_cases, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [serviceId, 몸.name, 몸.onePerModel, JSON.stringify(몸.devices), 몸.addedCases, 누가],
  );
  return Number(r.rows[0]?.id);
}

/** 치운 세트는 안 고친다 — 고쳤으면 true */
export async function 세트고치기(id: number, 몸: 세트몸): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE compat_set SET name = $2, one_per_model = $3, devices = $4, added_cases = $5, updated_at = now() WHERE id = $1 AND is_active`,
    [id, 몸.name, 몸.onePerModel, JSON.stringify(몸.devices), 몸.addedCases],
  );
  return r.rowCount === 1;
}

/** 지우지 않고 치운다 — 지난 실행이 그 세트를 가리킨다. 치웠으면 true */
export async function 세트치우기(id: number): Promise<boolean> {
  const r = await (await db()).query('UPDATE compat_set SET is_active = false, updated_at = now() WHERE id = $1 AND is_active', [id]);
  return r.rowCount === 1;
}
