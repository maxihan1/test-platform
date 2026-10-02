// 케이스가 아닌 .ts 파일에 K7 만 걸리고 케이스 규칙은 안 걸리는지, 그 파일이 빠짐없이 모이는지 검사한다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkNonCase, nonCaseFiles } from './pageObject.js';
import { caseFiles } from './scanner.js';

const 깨끗한글 = `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('https://example.com/login');
  }
}
`;

describe('checkNonCase', () => {
  it('깨끗한 글이면 위반이 없다 — defineCase 가 없어도 K1·K3 등은 걸지 않는다', () => {
    expect(checkNonCase('mkt/pages/login.page.ts', 깨끗한글)).toEqual([]);
  });

  it('주석이 있으면 K7 하나를 그 줄로 낸다', () => {
    const 글 = 깨끗한글.replace('  async open', '  // 로그인 화면을 연다\n  async open');
    const found = checkNonCase('mkt/pages/login.page.ts', 글);
    expect(found.map((x) => [x.rule, x.line])).toEqual([['K7', 6]]);
    expect(found[0]?.file).toBe('mkt/pages/login.page.ts');
  });

  it('expect 를 쓰면 K7 이다', () => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", 'expect(this.page).toBeTruthy();');
    expect(checkNonCase('mkt/pages/login.page.ts', 글).map((x) => x.rule)).toEqual(['K7']);
  });

  it('test.step 을 부르면 K7 이다', () => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", "await test.step('로그인', async () => {});");
    const found = checkNonCase('mkt/pages/login.page.ts', 글);
    expect(found.map((x) => [x.rule, x.what])).toEqual([['K7', '케이스가 아닌 파일에서 test.step 을 부른다']]);
  });

  it('verify 를 부르면 K7 이다', () => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", "verify('제목이 맞다', a, b);");
    const found = checkNonCase('mkt/pages/login.page.ts', 글);
    expect(found.map((x) => [x.rule, x.what])).toEqual([['K7', '케이스가 아닌 파일에서 verify 를 부른다']]);
  });

  // 이름을 바꿔 부르면 위의 두 검사를 피한다. E2E 「만들기」 판별이 Page Object 를 믿는 근거라 가져오는 자리에서 막는다
  it.each([
    ['이름을 바꿔 가져온 verify', "import { verify as 확인 } from '@platform/kit';"],
    ['이름을 바꿔 가져온 test', "import { test as t } from '@platform/kit';"],
    ['통째로 가져오기', "import * as kit from '@platform/kit';"],
    ['다시 내보내기', "export { verify } from '@platform/kit';"],
    ['통째로 다시 내보내기', "export * from '@platform/kit';"],
  ])('케이스가 아닌 파일이 kit 의 판정 · 절차를 가져오면 K7 이다 — %s', (_, line) => {
    const found = checkNonCase('mkt/pages/login.page.ts', `${line}\n${깨끗한글}`);
    expect(found.map((x) => [x.rule, x.line])).toEqual([['K7', 1]]);
  });

  it.each([
    ['kit 하위 경로', "import { verify as ok } from '@platform/kit/runtime';"],
    ['tests 밖 상대 경로', "import { verify } from '../../../packages/kit/src/runtime/verify.js';"],
    ['다른 패키지', "import { readFileSync } from 'node:fs';"],
    ['playwright 의 test', "import { test as t } from '@playwright/test';"],
    ['playwright 의 expect', "import { expect as e } from '@playwright/test';"],
    ['playwright 통째로', "import * as pw from '@playwright/test';"],
    ['import = require', "import k = require('@platform/kit');"],
    ['tests 밖을 다시 내보냄', "export { LoginPage } from '../../../packages/x.js';"],
  ])('케이스가 아닌 파일은 허용한 곳에서만 가져온다 — %s', (_, line) => {
    const found = checkNonCase('mkt/pages/login.page.ts', `${line}\n${깨끗한글}`);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((x) => x.rule === 'K7' && x.line === 1)).toBe(true);
  });

  it.each([
    ['require', "const k = require('@platform/kit');"],
    ['변수 경로 동적 import', 'await import(m);'],
  ])('부르는 자리에서 가져와도 K7 이다 — %s', (_, call) => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", call);
    expect(checkNonCase('mkt/pages/login.page.ts', 글).map((x) => x.rule)).toEqual(['K7']);
  });

  it.each([
    ['playwright 타입', "import type { Locator } from '@playwright/test';"],
    ['playwright 이름 하나만 타입', "import { type Locator } from '@playwright/test';"],
    ['같은 서비스 Component', "import { 머리 } from '../components/site-header.component.js';"],
  ])('허용한 곳에서 가져오는 것은 괜찮다 — %s', (_, line) => {
    expect(checkNonCase('mkt/pages/login.page.ts', `${line}\n${깨끗한글}`)).toEqual([]);
  });

  it('kit 을 동적으로 가져와도 K7 이다', () => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", "await import('@platform/kit');");
    expect(checkNonCase('mkt/pages/login.page.ts', 글).map((x) => x.rule)).toEqual(['K7']);
  });

  it('kit 에서 판정 · 절차 말고 다른 것만 가져오는 것은 괜찮다', () => {
    expect(checkNonCase('mkt/pages/login.page.ts', `import type { CaseSpec } from '@platform/kit';\n${깨끗한글}`)).toEqual([]);
  });

  it('tests 아래 JS 파일은 K7 이다 — 검사를 안 받고 import 로 풀린다', () => {
    expect(checkNonCase('mkt/pages/login.page.js', 'export class LoginPage {}\n').map((x) => [x.rule, x.line])).toEqual([['K7', 1]]);
  });
});

describe('nonCaseFiles', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'page-object-'));
    await mkdir(join(root, 'mkt/pages/a'), { recursive: true });
    await mkdir(join(root, 'mkt/components'), { recursive: true });
    for (const file of [
      'mkt/MKT-001.spec.ts',
      'mkt/pages/login.page.ts',
      'mkt/components/site-header.component.ts',
      'mkt/pages/a/b.page.ts',
      'mkt/helper.ts',
      'mkt/pages/x.ts',
      'mkt/pages/y.page.js',
      'mkt/pages/z.mjs',
    ]) {
      await writeFile(join(root, file), '');
    }
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('.spec.ts 가 아닌 .ts 와 JS 파일을 깊이와 이름 꼴에 상관없이 모은다', async () => {
    expect(await nonCaseFiles(root)).toEqual([
      join(root, 'mkt/components/site-header.component.ts'),
      join(root, 'mkt/helper.ts'),
      join(root, 'mkt/pages/a/b.page.ts'),
      join(root, 'mkt/pages/login.page.ts'),
      join(root, 'mkt/pages/x.ts'),
      join(root, 'mkt/pages/y.page.js'),
      join(root, 'mkt/pages/z.mjs'),
    ]);
  });

  it('node_modules 아래는 모으지 않는다', async () => {
    await mkdir(join(root, 'node_modules/pkg'), { recursive: true });
    await writeFile(join(root, 'node_modules/pkg/index.ts'), '');
    expect((await nonCaseFiles(root)).some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('caseFiles 는 여전히 .spec.ts 만 모은다', async () => {
    expect(await caseFiles(root)).toEqual([join(root, 'mkt/MKT-001.spec.ts')]);
  });
});
