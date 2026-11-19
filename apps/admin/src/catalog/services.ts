// 스캔 · 시나리오 · 작성이 읽는 활성 애플리케이션 목록 — store.ts 가 300줄을 넘어 떼어 냈다 (카탈로그 §3.1)

import type { Pool } from 'pg';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다 — 풀은 실제로 쓸 때 가져온다 (store.ts 와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface ServiceRow {
  id: number;
  prefix: string;
  name: string;
  testsDir: string;
  /** 애플리케이션 종류 — 게임만 게임 지도의 요소를 거친 케이스를 채운다 (도메인/게임 §3.10) */
  kind: string;
  /** 게임 애플리케이션의 플랫폼 — 모바일 게임 'android' · PC 게임 'windows'. 게임이 아니면 null (공통/4 「게임 애플리케이션 플랫폼」) */
  gamePlatform: 'android' | 'windows' | null;
  /** PC 게임이 작성 때 체크한 지원 패드('ps5' · 'ps4' · 'switch' · 'xbox'). 그 밖에는 빈 배열 */
  gamePads: string[];
}

// 서비스는 지우지 않고 비활성으로 내린다. 내려간 서비스의 케이스는 더 훑지 않는다 (SPEC §8.8)
export async function activeServices(): Promise<ServiceRow[]> {
  const pool = await db();
  const rows = await pool.query<{
    id: string;
    prefix: string;
    name: string;
    tests_dir: string;
    kind: string;
    game_platform: 'android' | 'windows' | null;
    game_pads: string[];
  }>('SELECT id, prefix, name, tests_dir, kind, game_platform, game_pads FROM service WHERE is_active ORDER BY prefix');
  return rows.rows.map((r) => ({
    id: Number(r.id),
    prefix: r.prefix,
    name: r.name,
    testsDir: r.tests_dir,
    kind: r.kind,
    gamePlatform: r.game_platform,
    gamePads: r.game_pads,
  }));
}

export async function findService(prefix: string): Promise<ServiceRow | null> {
  const found = await activeServices();
  return found.find((s) => s.prefix === prefix) ?? null;
}
