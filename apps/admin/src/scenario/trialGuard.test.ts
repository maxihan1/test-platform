// trial 의 시험 실행 조립 거르기 — API 호출 · 모킹 단계를 저장된 시나리오와 견준다 (SPEC 도메인/인증 §3.5 「테스트 모드」)

import type { ScenarioPart } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 저장안된단계 } from './trialGuard.js';

const 연결 = process.env.DATABASE_URL;

// fixture — 서비스 XTG · 남의 서비스 XTGB (apps/admin/CLAUDE.md)
const 접두사들 = ['XTG', 'XTGB'];

const 케이스: ScenarioPart = { kind: 'case', tcId: 'XTG-001', params: {}, expected: {}, skipSteps: [] };
const 모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/pay', status: 200, contentType: 'application/json', body: '{"ok":true}' };
const API: ScenarioPart = { kind: 'api', method: 'POST', path: '/api/cart', body: { sku: 'A', qty: 1 }, expectStatus: 201, auth: 'qa' };
const 치운모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/old', status: 500, contentType: 'text/plain', body: 'x' };
const 남의모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/other', status: 200, contentType: 'text/html', body: '<p>남</p>' };

describe.skipIf(연결 === undefined)('trial 시험 실행 조립 거르기', () => {
  const 서비스id: Record<string, number> = {};

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 거르기 = async (parts: ScenarioPart[], service = 'XTG') => {
    const { pool } = await import('../db/index.js');
    return 저장안된단계(pool, service, parts);
  };

  async function 시나리오(prefix: string, parts: ScenarioPart[], 활성 = true): Promise<void> {
    const r = await q(`INSERT INTO scenario (service_id, name, is_active, created_by) VALUES ($1, 'xtg', $2, 'xtg') RETURNING id`, [
      서비스id[prefix],
      활성,
    ]);
    await q(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, $2, 'xtg', 'xtg')`, [
      (r.rows[0] as { id: string }).id,
      JSON.stringify(parts),
    ]);
  }

  const 치우기 = async () => {
    const 번호들 = (await q('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들])).rows.map((r) => (r as { id: string }).id);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [번호들]);
    await q('DELETE FROM scenario WHERE service_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = ANY($1)', [번호들]);
  };

  beforeAll(async () => {
    await 치우기();
    for (const prefix of 접두사들) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $1, '#3A5FCD', '', 'xtg') RETURNING id`,
        [prefix],
      );
      서비스id[prefix] = Number((r.rows[0] as { id: string }).id);
    }
    await 시나리오('XTG', [케이스, API, 모킹]);
    await 시나리오('XTG', [치운모킹], false);
    await 시나리오('XTGB', [남의모킹]);
  });

  afterAll(치우기);

  it('케이스 · 대기 단계만 있으면 저장된 시나리오와 안 견주고 통과다', async () => {
    expect(await 거르기([케이스, { kind: 'wait', ms: 500 }, 케이스])).toBeNull();
  });

  it('저장된 시나리오에 똑같이 든 API 호출 · 모킹 단계는 칸 차례가 달라도 통과다', async () => {
    const 차례바꾼API = { auth: 'qa', expectStatus: 201, body: { qty: 1, sku: 'A' }, path: '/api/cart', method: 'POST', kind: 'api' } as ScenarioPart;
    expect(await 거르기([모킹, 케이스, 차례바꾼API])).toBeNull();
  });

  it('본문을 고친 모킹 · 인증을 바꾼 API 는 몇 번 단계인지 사유에 싣는다', async () => {
    const 고친모킹 = { ...모킹, contentType: 'text/html', body: '<script>fetch("http://admin:3000")</script>' } as ScenarioPart;
    const 바꾼API = { ...API, auth: 'admin' } as ScenarioPart;
    expect(await 거르기([케이스, 고친모킹, 바꾼API])).toBe(
      '2번 단계(모킹) · 3번 단계(API 호출)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다',
    );
  });

  it('치운 시나리오 · 다른 애플리케이션 시나리오에만 있는 단계는 막는다', async () => {
    expect(await 거르기([치운모킹])).toBe('1번 단계(모킹)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다');
    expect(await 거르기([남의모킹])).toBe('1번 단계(모킹)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다');
    expect(await 거르기([남의모킹], 'XTGB')).toBeNull();
  });
});
