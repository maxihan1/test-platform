// 케이스 목록이 android 로 거르고, 서비스에 앱 케이스가 있는지 검색 조건과 상관없이 알려 주는지 본다 (카탈로그 §7 · §8.1 · APP-F1-04)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec, Platform } from '@platform/kit';

import { 디바이스읽기 } from './routes.js';
import { listCases, save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XPL-001', 'XPL-002', 'XPL-UI-001'];

describe('디바이스읽기', () => {
  it('세 디바이스는 거르고, 없거나 빈 값은 안 거르고, 모르는 값은 null', () => {
    expect(['desktop', 'mobile', 'android', undefined, '', 'ios', 'Android'].map(디바이스읽기)).toEqual([
      'desktop', 'mobile', 'android', undefined, undefined, null, null,
    ]);
  });
});

function spec(tcId: string, platforms: Platform[]): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms,
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xpl/${tcId}.spec.ts`,
  };
}

describe.skipIf(연결 === undefined)('android 거르기 · hasApp', () => {
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 지우기 = async () => {
    const 서비스 = (await q("SELECT id FROM service WHERE prefix = 'XPL'")).rows.map((r) => r.id);
    await q('DELETE FROM req_case WHERE service_id = ANY($1)', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q("DELETE FROM service WHERE prefix = 'XPL'");
  };
  const 목록 = (over: Partial<Parameters<typeof listCases>[0]> = {}) =>
    listCases({ service: 'XPL', q: '', activeOnly: true, page: 1, pageSize: 50, ...over });

  beforeAll(지우기);
  afterAll(지우기);

  it('웹만 있으면 hasApp 이 거짓이다', async () => {
    await save([spec('XPL-001', ['desktop', 'mobile'])], false, 'XPL');
    expect((await 목록()).hasApp).toBe(false);
  });

  it('android 로 거르면 앱 케이스만 · hasApp 은 다른 디바이스로 걸러도 참이다', async () => {
    await save([spec('XPL-001', ['desktop', 'mobile']), spec('XPL-002', ['android'])], false, 'XPL');
    const 앱 = await 목록({ platform: 'android' });
    const 웹 = await 목록({ platform: 'desktop' });
    expect([앱.items.map((c) => c.tcId), 웹.items.map((c) => c.tcId), 웹.hasApp]).toEqual([['XPL-002'], ['XPL-001'], true]);
  });

  it('hasApp 은 종류를 따른다 — 앱 케이스가 UI 뿐이면 기능 목록에서는 거짓이다', async () => {
    await save([spec('XPL-001', ['desktop']), spec('XPL-UI-001', ['android'])], false, 'XPL');
    expect([(await 목록({ kind: 'UI' })).hasApp, (await 목록({ kind: 'FN' })).hasApp]).toEqual([true, false]);
  });

  it('hasApp 은 활성 여부를 따른다 — 꺼진 앱 케이스는 「전체」를 볼 때만 센다', async () => {
    await save([spec('XPL-001', ['desktop']), spec('XPL-002', ['android'])], false, 'XPL');
    await q("UPDATE test_case SET is_active = false WHERE tc_id = ANY($1)", [['XPL-002', 'XPL-UI-001']]);
    expect([(await 목록()).hasApp, (await 목록({ activeOnly: false })).hasApp]).toEqual([false, true]);
  });
});
