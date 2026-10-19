// 케이스 목록이 마지막 결과를 쪽이 아니라 전체에서 거르고 세는지 본다 (도메인/카탈로그 §7 `?last=` · 점검 7.1 · 7.2)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec, ItemStatus, Platform } from '@platform/kit';

import type { LastResult } from '../execution/history.js';
import { 마지막읽기, 판정으로 } from './last.js';
import { listCases, save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = Array.from({ length: 5 }, (_, i) => `XLF-00${i + 1}`);

describe('마지막읽기', () => {
  it('pass · fail · na 는 판정으로, 없거나 빈 값은 안 거르고, 모르는 값은 null', () => {
    expect(['pass', 'fail', 'na', undefined, '', 'FAIL', 'x'].map(마지막읽기)).toEqual(['PASS', 'FAIL', 'NA', undefined, undefined, null, null]);
  });
});

const 결과 = (tcId: string, platform: Platform, status: ItemStatus): LastResult => ({
  tcId, platform, status, historyId: 1, runId: 1, durationMs: 1, finishedAt: '2026-10-19T00:00:00Z', recent: [status],
});

describe('판정으로', () => {
  const 판정 = 판정으로(new Map([
    ['A', [결과('A', 'desktop', 'PASS'), 결과('A', 'mobile', 'FAIL')]],
    ['B', [결과('B', 'desktop', 'PASS'), 결과('B', 'mobile', 'FAIL')]],
    ['C', [결과('C', 'desktop', 'PASS')]],
  ]));

  it('기기 한쪽만 깨져도 실패 · 지원 기기가 다 통과여야 통과 · 안 돈 기기가 있으면 미실행', () => {
    expect(판정('A', ['desktop', 'mobile'])).toBe('FAIL');
    expect(판정('C', ['desktop', 'mobile'])).toBe('NA');
    expect(판정('D', ['desktop'])).toBe('NA');
  });

  it('지원에서 뺀 기기의 옛 결과는 판정에 안 든다', () => {
    expect(판정('B', ['desktop'])).toBe('PASS');
  });
});

function spec(tcId: string): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xlf/${tcId}.spec.ts`,
  };
}

describe.skipIf(연결 === undefined)('마지막 결과 거르기 · 셈', () => {
  const 지우기 = async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  };

  beforeAll(async () => {
    await 지우기();
    await save(번호들.map(spec), false, 'XLF');
  });
  afterAll(지우기);

  // 1 · 4 실패, 2 · 3 통과, 5 는 안 돌았다
  const 판정 = (tcId: string): ItemStatus => ({ 'XLF-001': 'FAIL', 'XLF-004': 'FAIL', 'XLF-002': 'PASS', 'XLF-003': 'PASS' } as Record<string, ItemStatus>)[tcId] ?? 'NA';
  const 목록 = (last?: ItemStatus, pageSize = 2) =>
    listCases({ service: 'XLF', q: '', activeOnly: true, page: 1, pageSize, 마지막: { 판정, last } });

  it('실패를 걸면 쪽 크기와 상관없이 전체에서 거른다 — 첫 쪽에 둘 다 온다', async () => {
    const 받은 = await 목록('FAIL');
    expect(받은.items.map((c) => c.tcId)).toEqual(['XLF-001', 'XLF-004']);
    expect(받은.total).toBe(2);
  });

  it('셈은 last 를 뺀 조건에 맞은 전부다 — 칩을 걸어도 그대로다', async () => {
    const 셈 = { total: 5, pass: 2, fail: 2, na: 1 };
    expect((await 목록()).lastCounts).toEqual(셈);
    expect((await 목록('NA')).lastCounts).toEqual(셈);
    expect((await 목록('NA')).items.map((c) => c.tcId)).toEqual(['XLF-005']);
  });

  it('판정을 안 주면(실행 read 없음) 거르지도 세지도 않는다', async () => {
    const 받은 = await listCases({ service: 'XLF', q: '', activeOnly: true, page: 1, pageSize: 50 });
    expect(받은.total).toBe(5);
    expect(받은.lastCounts).toBeNull();
  });
});
