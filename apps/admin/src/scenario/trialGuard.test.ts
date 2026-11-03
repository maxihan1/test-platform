// trial 의 시험 실행 조립 거르기 — 단계를 저장된 시나리오 최신 버전과 견준다 (SPEC 도메인/인증 §3.5 「테스트 모드」)

import type { ScenarioPart } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 저장안된단계 } from './trialGuard.js';

const 연결 = process.env.DATABASE_URL;

// fixture — 서비스 XTG · 남의 서비스 XTGB (apps/admin/CLAUDE.md)
const 접두사들 = ['XTG', 'XTGB'];

const 케이스 = (params: Record<string, unknown> = {}): ScenarioPart => ({ kind: 'case', tcId: 'XTG-001', params, expected: {}, skipSteps: [] });
const 모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/pay', status: 200, contentType: 'application/json', body: '{"ok":true}' };
const API: ScenarioPart = { kind: 'api', method: 'POST', path: '/api/cart', body: { sku: 'A', qty: 1 }, expectStatus: 201, auth: 'qa' };
const 값받는API: ScenarioPart = {
  kind: 'api',
  method: 'DELETE',
  path: '/api/users/{id}',
  expectStatus: 204,
  auth: 'admin',
  values: [{ name: 'id', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/users', jsonPath: '$.id' } }],
};
const 옛모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/v1', status: 200, contentType: 'text/html', body: '<script>1</script>' };
const 치운모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/old', status: 500, contentType: 'text/plain', body: 'x' };
const 남의모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/other', status: 200, contentType: 'text/html', body: '<p>남</p>' };
const 단계사유 = (n: number) => `${n}번 단계(모킹)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다`;
const 순서사유 = '앞 단계 값을 받아 쓰는 단계(API 호출 값 넣기 · 케이스 이어 주기)가 있으면 저장된 시나리오를 순서 그대로 시험 실행할 수 있습니다';

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

  async function 시나리오(prefix: string, 버전들: ScenarioPart[][], 활성 = true): Promise<void> {
    const r = await q(`INSERT INTO scenario (service_id, name, is_active, created_by) VALUES ($1, 'xtg', $2, 'xtg') RETURNING id`, [
      서비스id[prefix],
      활성,
    ]);
    for (const [i, parts] of 버전들.entries()) {
      await q(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, $2, $3, 'xtg', 'xtg')`, [
        (r.rows[0] as { id: string }).id,
        i + 1,
        JSON.stringify(parts),
      ]);
    }
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
    await 시나리오('XTG', [[옛모킹, 케이스()], [케이스(), API, 모킹]]);
    await 시나리오('XTG', [[케이스({ name: 'a' }), 값받는API]]);
    await 시나리오('XTG', [[치운모킹]], false);
    await 시나리오('XTGB', [[남의모킹]]);
  });

  afterAll(치우기);

  it('케이스 · 대기 단계만 있으면 저장된 시나리오와 안 견주고 통과다', async () => {
    expect(await 거르기([케이스(), { kind: 'wait', ms: 500 }, 케이스()])).toBeNull();
  });

  it('최신 버전에 똑같이 든 API 호출 · 모킹 단계는 칸 차례가 달라도 · 케이스를 넣고 빼도 통과다', async () => {
    const 차례바꾼API = { auth: 'qa', expectStatus: 201, body: { qty: 1, sku: 'A' }, path: '/api/cart', method: 'POST', kind: 'api' } as ScenarioPart;
    expect(await 거르기([모킹, 케이스(), 케이스(), 차례바꾼API])).toBeNull();
  });

  it('본문을 고친 모킹 · 인증을 바꾼 API 는 몇 번 단계인지 사유에 싣는다', async () => {
    const 고친모킹 = { ...모킹, contentType: 'text/html', body: '<script>fetch("http://admin:3000")</script>' } as ScenarioPart;
    const 바꾼API = { ...API, auth: 'admin' } as ScenarioPart;
    expect(await 거르기([케이스(), 고친모킹, 바꾼API])).toBe(
      '2번 단계(모킹) · 3번 단계(API 호출)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다',
    );
  });

  it('옛 버전에서 뺀 단계 · 치운 시나리오 · 다른 애플리케이션 시나리오에만 있는 단계는 막는다', async () => {
    expect(await 거르기([옛모킹])).toBe(단계사유(1));
    expect(await 거르기([치운모킹])).toBe(단계사유(1));
    expect(await 거르기([남의모킹])).toBe(단계사유(1));
    expect(await 거르기([남의모킹], 'XTGB')).toBeNull();
  });

  it('앞 단계 값을 받아 쓰는 API 는 저장된 순서 그대로일 때만 — 케이스 입력값만 바꿀 수 있다', async () => {
    expect(await 거르기([케이스({ name: '다른 사람' }), 값받는API])).toBeNull();
    expect(await 거르기([케이스(), 케이스(), 값받는API])).toBe(순서사유);
    expect(await 거르기([{ ...케이스(), tcId: 'XTG-002' } as ScenarioPart, 값받는API])).toBe(순서사유);
  });

  it('이어 주기를 단 케이스도 저장된 순서 그대로일 때만이다', async () => {
    const 바꿔보내기: ScenarioPart = {
      ...케이스(),
      links: [
        {
          kind: 'rewrite',
          method: 'POST',
          urlPattern: '**/api/cart',
          to: { method: 'PUT', path: '/api/admin/users/{}', value: { fromSeq: 1, method: 'POST', urlPattern: '**/x', jsonPath: '$.id' } },
        },
      ],
    } as ScenarioPart;
    expect(await 거르기([케이스(), 바꿔보내기])).toBe(순서사유);
  });
});
