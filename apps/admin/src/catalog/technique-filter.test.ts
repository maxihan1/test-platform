// 스캔 저장 · 목록 · 단건이 설계 기법을 싣고 거르는지 본다 (SPEC 도메인/카탈로그 §3.1 「설계 기법」 · §7 `?technique=` · PR #158)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec, Technique } from '@platform/kit';

import { 기법읽기 } from './routes.js';
import { findCase, listCases, save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XTQ-001', 'XTQ-002', 'XTQ-003'];

describe('기법읽기', () => {
  it('목록 안 낱말과 none 은 거르고, 없거나 빈 값은 안 거르고, 모르는 값은 null', () => {
    expect(['경계값 분석', 'none', undefined, '', '경계값', 'NONE'].map(기법읽기)).toEqual([
      '경계값 분석', 'none', undefined, undefined, null, null,
    ]);
  });
});

function spec(tcId: string, over: Partial<CaseSpec> = {}): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xtq/${tcId}.spec.ts`,
    ...over,
  };
}

describe.skipIf(연결 === undefined)('설계 기법 저장 · 거르기', () => {
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 지우기 = () => q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);

  beforeAll(지우기);
  afterAll(지우기);

  const 기법 = async (tcId: string) => (await findCase(tcId))?.techniques;

  it('스캔 저장이 기법을 쓰고, 바꿔 다시 저장하면 바뀌고, 지우면 빈 배열이다', async () => {
    await save([spec('XTQ-001', { techniques: ['경계값 분석'] })], false, 'XTQ');
    expect(await 기법('XTQ-001')).toEqual(['경계값 분석']);
    await save([spec('XTQ-001', { techniques: ['동등 분할', '결정 테이블'] })], false, 'XTQ');
    expect(await 기법('XTQ-001')).toEqual(['동등 분할', '결정 테이블']);
    await save([spec('XTQ-001')], false, 'XTQ');
    expect(await 기법('XTQ-001')).toEqual([]);
  });

  const 목록 = (technique?: Technique | 'none') =>
    listCases({ service: 'XTQ', q: '', activeOnly: true, page: 1, pageSize: 50, technique });

  it('목록 항목에 기법 배열이 늘 실린다 — 없으면 빈 배열', async () => {
    await save(
      [
        spec('XTQ-001', { techniques: ['경계값 분석'] }),
        spec('XTQ-002', { techniques: ['경계값 분석', '상태 전이'] }),
        spec('XTQ-003', { unconfirmed: 'XTQ 사유' }),
      ],
      false,
      'XTQ',
    );
    expect((await 목록()).items.map((c) => [c.tcId, c.techniques])).toEqual([
      ['XTQ-001', ['경계값 분석']],
      ['XTQ-002', ['경계값 분석', '상태 전이']],
      ['XTQ-003', []],
    ]);
  });

  it('기법이면 그 기법을 가진 것만 · none 이면 빈 것만 · 안 주면 전부', async () => {
    const 번호 = async (t?: Technique | 'none') => (await 목록(t)).items.map((c) => c.tcId);
    expect(await 번호('경계값 분석')).toEqual(['XTQ-001', 'XTQ-002']);
    expect(await 번호('상태 전이')).toEqual(['XTQ-002']);
    expect(await 번호('none')).toEqual(['XTQ-003']);
    expect(await 번호()).toEqual(번호들);
  });

  it('미확정 요약은 기법을 안 따른다 — 검색 조건이다', async () => {
    expect((await 목록('경계값 분석')).unconfirmed.count).toBe(1);
  });
});
