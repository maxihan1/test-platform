// 지도 ② — 케이스 파일이 가져오는 화면 파일 · 그 파일의 화면 주소 값을 읽고 서비스 몫을 다시 채운다 (카탈로그 §3.1 「지도」)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { 가져온화면파일, 화면주소, 화면지도줄들 } from './screenMap.js';

describe('가져온화면파일', () => {
  it('pages · components 를 가져온 줄만 — helpers · 타입만 · 다른 자리 · 꼴이 틀린 이름은 뺀다', () => {
    const 글 = [
      "import { test } from '@platform/kit';",
      "import { CartPage } from './pages/cart.page.js';",
      "import { SiteHeader } from './components/site-header.component';",
      "import { 로그인 } from './helpers/session.helper.js';",
      "import type { LoginPage } from './pages/login.page.js';",
      "import { type JoinPage } from './pages/join.page.js';",
      "import { type OrderPage, OrderList } from './pages/order.page.js';",
      "import { Other } from '../xcs/pages/other.page.js';",
      "import { Bad } from './pages/Bad.page.js';",
      "import { CartPage as 또 } from './pages/cart.page.js';",
    ].join('\n');
    expect(가져온화면파일(글)).toEqual(['pages/cart.page.ts', 'components/site-header.component.ts', 'pages/order.page.ts']);
  });
});

describe('화면주소', () => {
  it('클래스의 static 주소 값을 글자 그대로 읽는다', () => {
    expect(화면주소("export class CartPage {\n  static readonly 주소 = '/cart';\n  constructor(private page: Page) {}\n}")).toBe('/cart');
    expect(화면주소('export class A {\n  static readonly 주소 = `/a`;\n}')).toBe('/a');
  });

  it('값이 없거나 계산식이거나 static 이 아니면 모른다', () => {
    expect(화면주소('export class SiteHeader {\n  constructor(private page: Page) {}\n}')).toBeNull();
    expect(화면주소("const 뿌리 = '/x';\nexport class A {\n  static readonly 주소 = 뿌리 + '/a';\n}")).toBeNull();
    expect(화면주소("export class A {\n  readonly 주소 = '/a';\n}")).toBeNull();
  });
});

describe('화면지도줄들', () => {
  let 뿌리 = '';

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xcs-'));
    await mkdir(join(뿌리, 'xcs', 'pages'), { recursive: true });
    await mkdir(join(뿌리, 'xcs', 'components'), { recursive: true });
    await writeFile(join(뿌리, 'xcs', 'pages', 'cart.page.ts'), "export class CartPage {\n  static readonly 주소 = '/cart';\n}");
    await writeFile(join(뿌리, 'xcs', 'components', 'site-header.component.ts'), 'export class SiteHeader {}');
    await writeFile(
      join(뿌리, 'xcs', 'XCS-001.spec.ts'),
      "import { CartPage } from './pages/cart.page.js';\nimport { SiteHeader } from './components/site-header.component.js';",
    );
    await writeFile(join(뿌리, 'xcs', 'XCS-002.spec.ts'), "import { CartPage } from './pages/cart.page.js';");
  });

  afterAll(async () => {
    await rm(뿌리, { recursive: true, force: true });
  });

  it('케이스마다 화면 파일을 저장소 뿌리 기준 경로로 잇고 주소를 붙인다', async () => {
    const 명세 = (tcId: string) => ({ tcId, filePath: `xcs/${tcId}.spec.ts` }) as CaseSpec;
    expect(await 화면지도줄들(뿌리, [명세('XCS-001'), 명세('XCS-002')])).toEqual([
      { tcId: 'XCS-001', file: 'tests/xcs/pages/cart.page.ts', screenUrl: '/cart' },
      { tcId: 'XCS-001', file: 'tests/xcs/components/site-header.component.ts', screenUrl: null },
      { tcId: 'XCS-002', file: 'tests/xcs/pages/cart.page.ts', screenUrl: '/cart' },
    ]);
  });
});

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('화면지도채우기', () => {
  let 서비스 = 0;
  let 뿌리 = '';
  const 케이스들 = ['XCS-001', 'XCS-002'];

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 지도 = async () =>
    (await q<{ tc_id: string; file: string; screen_url: string | null }>(
      'SELECT tc_id, file, screen_url FROM case_screen WHERE tc_id = ANY($1) ORDER BY tc_id, file',
      [케이스들],
    )).rows.map((r) => `${r.tc_id} ${r.file} ${r.screen_url ?? '-'}`);
  const 명세 = (tcId: string) => ({ tcId, filePath: `xcs/${tcId}.spec.ts` }) as CaseSpec;
  const 채우기 = async (tcIds: string[], 전부읽음 = true) =>
    (await import('./screenMap.js')).화면지도채우기(서비스, 'XCS', 뿌리, tcIds.map(명세), 전부읽음);

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xcs-db-'));
    await mkdir(join(뿌리, 'xcs', 'pages'), { recursive: true });
    await writeFile(join(뿌리, 'xcs', 'pages', 'cart.page.ts'), "export class CartPage {\n  static readonly 주소 = '/cart';\n}");
    await writeFile(join(뿌리, 'xcs', 'pages', 'login.page.ts'), "export class LoginPage {\n  static readonly 주소 = '/login';\n}");
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XCS', '화면 지도 검사', '#888888', 'https://example.com/xcs', 'xcs') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    for (const tcId of 케이스들) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema)
         VALUES ($1, '화면 지도', $2, '{}', '{}')`,
        [tcId, `xcs/${tcId}.spec.ts`],
      );
    }
  });

  afterAll(async () => {
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
  });

  it('스캔마다 그 서비스 몫을 지우고 다시 채운다 — 가져오기를 뺀 화면 · 읽지 않은 케이스는 지도에서 빠진다', async () => {
    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { CartPage } from './pages/cart.page.js';");
    await writeFile(join(뿌리, 'xcs', 'XCS-002.spec.ts'), "import { LoginPage } from './pages/login.page.js';");
    expect(await 채우기(케이스들)).toBe(2);
    expect(await 지도()).toEqual(['XCS-001 tests/xcs/pages/cart.page.ts /cart', 'XCS-002 tests/xcs/pages/login.page.ts /login']);

    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { LoginPage } from './pages/login.page.js';");
    await 채우기(['XCS-001']);
    expect(await 지도()).toEqual(['XCS-001 tests/xcs/pages/login.page.ts /login']);
  });

  it('케이스 파일을 다 읽지 못한 스캔은 읽은 케이스 몫만 바꾸고 못 읽은 케이스의 줄은 둔다', async () => {
    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { CartPage } from './pages/cart.page.js';");
    await writeFile(join(뿌리, 'xcs', 'XCS-002.spec.ts'), "import { LoginPage } from './pages/login.page.js';");
    await 채우기(케이스들);

    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { LoginPage } from './pages/login.page.js';");
    await 채우기(['XCS-001'], false);
    expect(await 지도()).toEqual(['XCS-001 tests/xcs/pages/login.page.ts /login', 'XCS-002 tests/xcs/pages/login.page.ts /login']);
  });

  it('화면 파일을 못 읽으면 던지고 옛 지도를 그대로 둔다', async () => {
    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { CartPage } from './pages/cart.page.js';");
    await 채우기(['XCS-001']);
    await writeFile(join(뿌리, 'xcs', 'XCS-001.spec.ts'), "import { GonePage } from './pages/gone.page.js';");
    await expect(채우기(['XCS-001'])).rejects.toThrow();
    expect(await 지도()).toEqual(['XCS-001 tests/xcs/pages/cart.page.ts /cart']);
  });
});
