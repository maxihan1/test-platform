// 스캔이 케이스 파일에서 읽은 단계 제목을 test_case.step_titles 에 저장하고 다시 스캔하면 덮는다 (카탈로그 §3.1 「단계 제목」 · WEB-F9-15)
// DB 검사는 DATABASE_URL 이 있을 때만 돈다

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { 단계제목들 } from './scanRun.js';
import { save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XTT-001', 'XTT-002', 'XTT-003'];

function spec(tcId: string): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xtt/${tcId}.spec.ts`,
  };
}

const 케이스글 = (단계: string): string => `import { defineCase, test } from '@platform/kit';
export const spec = defineCase({ tcId: 'XTT-001', name: 'x', precondition: [], params: null, expected: null });
test(spec, async ({ page }) => {
${단계}
});
`;

describe('단계제목들', () => {
  let 뿌리 = '';
  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xtt-'));
    await writeFile(join(뿌리, 'a.spec.ts'), 케이스글(`  await test.step('연다', async () => { await page.goto('/'); });`));
    await writeFile(join(뿌리, 'b.spec.ts'), 케이스글(`  for (const x of [1]) await test.step('연다', async () => {});`));
  });
  afterAll(async () => {
    await rm(뿌리, { recursive: true, force: true });
  });

  it('케이스마다 제목을 읽고, 못 세거나 파일이 사라졌으면 null 이다', async () => {
    const 제목들 = await 단계제목들(뿌리, [
      { ...spec('XTT-001'), filePath: 'a.spec.ts' },
      { ...spec('XTT-002'), filePath: 'b.spec.ts' },
      { ...spec('XTT-003'), filePath: '없는.spec.ts' },
    ]);
    expect(Object.fromEntries(제목들)).toEqual({ 'XTT-001': ['연다'], 'XTT-002': null, 'XTT-003': null });
  });
});

describe.skipIf(연결 === undefined)('단계 제목 저장', () => {
  const 읽기 = async (): Promise<Record<string, string[] | null>> => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ tc_id: string; step_titles: string[] | null }>(
      'SELECT tc_id, step_titles FROM test_case WHERE tc_id = ANY($1)',
      [번호들],
    );
    return Object.fromEntries(r.rows.map((x) => [x.tc_id, x.step_titles]));
  };
  const 지우기 = async (): Promise<void> => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  };

  beforeAll(지우기);
  afterAll(지우기);

  it('제목 · 빈 목록 · 모름(null)을 그대로 담는다', async () => {
    const 제목들 = new Map<string, string[] | null>([
      ['XTT-001', ['연다', '누른다']],
      ['XTT-002', []],
      ['XTT-003', null],
    ]);
    await save(번호들.map(spec), false, 'XTT', 제목들);
    expect(await 읽기()).toEqual({ 'XTT-001': ['연다', '누른다'], 'XTT-002': [], 'XTT-003': null });
  });

  it('다시 스캔하면 덮는다 — 못 읽은 케이스는 옛 제목을 남기지 않고 NULL 이다', async () => {
    await save(번호들.map(spec), false, 'XTT', new Map([['XTT-002', ['닫는다']]]));
    expect(await 읽기()).toEqual({ 'XTT-001': null, 'XTT-002': ['닫는다'], 'XTT-003': null });
  });
});
