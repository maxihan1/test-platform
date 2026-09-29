// 보류 케이스가 Playwright 에 건너뛰기로 등록되는지 검사한다. Playwright 는 가짜로 바꿔 끼운다

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;

const pw = vi.hoisted(() => ({
  registered: [] as Body[],
  skip: vi.fn((condition: boolean) => {
    if (condition) throw new Error('skipped');
  }),
}));

vi.mock('@playwright/test', () => ({
  test: Object.assign(
    (_title: string, body: Body) => {
      pw.registered.push(body);
    },
    { skip: pw.skip },
  ),
}));

const { defineCase } = await import('./defineCase.js');
const { test } = await import('./test.js');

beforeEach(() => {
  pw.registered.length = 0;
  pw.skip.mockClear();
});

describe('test', () => {
  it('보류 케이스는 사유를 달고 본문을 돌리지 않는다', async () => {
    const spec = defineCase({
      tcId: 'DEMO-H01',
      name: '보류 케이스',
      precondition: [],
      params: null,
      expected: null,
      held: '보류 — 값이 없다',
    });
    const body = vi.fn();
    test(spec, body);

    await expect(pw.registered[0]({ page: {}, request: {} }, { project: { name: 'desktop' } })).rejects.toThrow('skipped');
    expect(pw.skip).toHaveBeenCalledWith(true, '보류 — 값이 없다');
    expect(body).not.toHaveBeenCalled();
  });
});
