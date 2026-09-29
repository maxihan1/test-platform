// 케이스 부품 재료 — 카탈로그 행과 소스를 한 번씩 읽어 조립 검사·점검·case-parts 에 나눠 준다 (SPEC 도메인/시나리오 §7)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 케이스재료 } from './parts.js';

const 연결 = process.env.DATABASE_URL;

const 만들기모양 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSP-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('상품을 담는다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('장바구니에 한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('케이스 부품 재료', () => {
  const 번호들 = ['XSP-001', 'XSP-002', 'XSP-003', 'XSP-004', 'XSP-005'];
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  let 뿌리 = '';

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 케이스넣기 = (tcId: string, filePath: string, isActive = true) =>
    q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
       VALUES ($1, $1 || ' 이름', '["desktop","mobile"]', '["로그인했다"]', $2, '{"type":"object"}', '{}', $3)
       ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = EXCLUDED.is_active`,
      [tcId, filePath, isActive],
    );

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsp-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsp'));
    await writeFile(join(뿌리, 'xsp', 'a.spec.ts'), 만들기모양);
    await writeFile(join(뿌리, 'xsp', 'broken.spec.ts'), `${만들기모양}\ntest.step('닫히지 않은 (`);
    await 케이스넣기('XSP-001', 'xsp/a.spec.ts');
    await 케이스넣기('XSP-002', 'xsp/없는파일.spec.ts');
    await 케이스넣기('XSP-003', 'xsp/a.spec.ts', false);
    await 케이스넣기('XSP-004', '../밖.spec.ts');
    await 케이스넣기('XSP-005', 'xsp/broken.spec.ts');
  });

  afterAll(async () => {
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('활성 케이스는 조립 재료와 case-parts 재료를 같이 준다 — line 은 없다', async () => {
    const { 카탈로그, 부품재료 } = await 케이스재료(['XSP-001', 'XSP-001']);
    expect(카탈로그.get('XSP-001')).toEqual({
      platforms: ['desktop', 'mobile'],
      isActive: true,
      skippable: ['상품을 담는다'],
    });
    expect(부품재료.get('XSP-001')).toEqual({
      tcId: 'XSP-001',
      name: 'XSP-001 이름',
      platforms: ['desktop', 'mobile'],
      precondition: ['로그인했다'],
      paramSchema: { type: 'object' },
      expectedSchema: {},
      steps: [
        { title: '상품을 담는다', skippable: true },
        { title: '장바구니에 한 건이다', skippable: false },
      ],
      r16: true,
      usesRequest: false,
    });
  });

  it('없는 케이스 · 비활성 · 파일을 못 읽는 케이스는 재료가 없다 — 비활성으로 친다', async () => {
    const { 카탈로그, 부품재료 } = await 케이스재료(['XSP-999', 'XSP-002', 'XSP-003']);
    expect(카탈로그.size).toBe(0);
    expect(부품재료.size).toBe(0);
  });

  it('다른 서비스를 주면 그 접두사의 케이스만 읽는다', async () => {
    const { 카탈로그 } = await 케이스재료(['XSP-001'], 'XSQ');
    expect(카탈로그.size).toBe(0);
  });

  it('파일이 tests 뿌리 밖이면 던지지 않고 두 맵에서 빠진다 — 비활성으로 친다', async () => {
    const { 카탈로그, 부품재료 } = await 케이스재료(['XSP-004', 'XSP-001']);
    expect([...카탈로그.keys()]).toEqual(['XSP-001']);
    expect([...부품재료.keys()]).toEqual(['XSP-001']);
  });

  it('문법이 깨진 소스는 건너뛸 수 있는 절차가 없다', async () => {
    const { 카탈로그, 부품재료 } = await 케이스재료(['XSP-005']);
    expect(카탈로그.get('XSP-005')?.skippable).toEqual([]);
    expect(부품재료.get('XSP-005')?.r16).toBe(false);
  });
});
