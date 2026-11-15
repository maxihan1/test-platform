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

  it('Page Object · 도우미의 waitForTimeout · networkidle 도 K15 다', () => {
    const 글 = 깨끗한글.replace(
      "await this.page.goto('https://example.com/login');",
      "await this.page.waitForTimeout(400);\n    await this.page.waitForLoadState('networkidle');",
    );
    const found = checkNonCase('mkt/pages/login.page.ts', 글);
    expect(found.map((x) => [x.rule, x.line])).toEqual([
      ['K15', 7],
      ['K15', 8],
    ]);
  });

  const 몸 = (본문: string): string => 깨끗한글.replace("    await this.page.goto('https://example.com/login');", 본문);
  const k15줄 = (본문: string): number[] =>
    checkNonCase('mkt/pages/login.page.ts', 몸(본문))
      .filter((x) => x.rule === 'K15')
      .map((x) => x.line);

  it('setTimeout 쉬기 약속과 driver.pause 도 K15 다', () => {
    expect(k15줄('    await new Promise((r) => setTimeout(r, 500));')).toEqual([7]);
    expect(k15줄('    await new Promise<void>((풀기) => {\n      setTimeout(풀기, 500);\n    });')).toEqual([7]);
    expect(k15줄('    await driver.pause(1000);')).toEqual([7]);
  });

  it('쉬기 함수는 정의가 아니라 부르는 자리를 본다', () => {
    const 글 = `const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function 쉰다(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
}
export async function 열기(): Promise<void> {
  await 쉬기(300);
  while (Date.now() < 0) await 쉰다();
  await 쉰다();
}
`;
    expect(checkNonCase('mkt/helpers/x.helper.ts', 글).map((x) => [x.rule, x.line])).toEqual([
      ['K15', 6],
      ['K15', 8],
    ]);
  });

  it('내보내는 쉬기 함수는 정의가 걸린다 — 다른 파일에서 부르는 자리는 따라가지 않는다', () => {
    const 글 = `export const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function 쉰다(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
}
`;
    expect(checkNonCase('mkt/helpers/x.helper.ts', 글).map((x) => [x.rule, x.line])).toEqual([
      ['K15', 1],
      ['K15', 3],
    ]);
  });

  it('되풀이 조회 사이 쉬기 · route 안 응답 늦추기 · Promise.race 데드라인 · 인자 없는 pause 는 안 잡는다', () => {
    expect(k15줄('    for (;;) {\n      if (await this.page.isVisible("a")) return;\n      await new Promise((r) => setTimeout(r, 300));\n    }')).toEqual([]);
    expect(k15줄('    await this.page.route("**/api", async (r) => { await new Promise((f) => setTimeout(f, 300)); await r.continue(); });')).toEqual([]);
    expect(k15줄('    const 처리 = async (route: Route) => { await new Promise((f) => setTimeout(f, 300)); await route.continue(); };')).toEqual([]);
    expect(k15줄('    await Promise.race([this.page.waitForEvent("close"), new Promise((r) => setTimeout(r, 5000))]);')).toEqual([]);
    expect(k15줄('    const t = setTimeout(() => controller.abort(), 5000);\n    await this.page.evaluate(() => video.pause());')).toEqual([]);
  });

  it('화살표로 풀기를 부르는 쉬기 · 인자 없는 driver.pause · for…of 안 쉬기 · route: string 함수 안 쉬기도 잡는다', () => {
    expect(k15줄('    await new Promise((r) => setTimeout(() => r(), 500));')).toEqual([7]);
    expect(k15줄('    await driver.pause();')).toEqual([7]);
    expect(k15줄('    for (const 칸 of [1]) {\n      await new Promise((r) => setTimeout(r, 1500));\n    }')).toEqual([8]);
    expect(k15줄('    const 이동 = async (route: string) => { await this.page.goto(route); await new Promise((r) => setTimeout(r, 2000)); };')).toEqual([7]);
  });

  it('반복문 안에 정의한 함수 속 쉬기는 반복문이 지켜 주지 않는다', () => {
    expect(k15줄('    for (const a of [1]) {\n      const f = async () => { await new Promise((r) => setTimeout(r, 300)); await this.page.click("a"); };\n      await f();\n    }')).toEqual([8]);
  });

  it('localhost · host.docker.internal 주소는 K16 이고 일부러 거절되는 127.0.0.1:9 는 아니다', () => {
    const 걸린 = (본문: string): string[] => checkNonCase('mkt/helpers/x.helper.ts', 몸(본문)).map((x) => x.rule);
    expect(걸린("    const a = 'http://localhost:3002';")).toEqual(['K16']);
    expect(걸린('    const a = `http://host.docker.internal:${String(3000)}/api`;')).toEqual(['K16']);
    expect(걸린("    const a = 'http://127.0.0.1:3002/api';")).toEqual(['K16']);
    expect(걸린("    const a = 'http://127.0.0.1:9';")).toEqual([]);
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

  it('kit 공용 부품은 값으로 가져와도 된다 — 그 입구에는 판정 · 절차가 없다. 통째로는 안 된다', () => {
    expect(checkNonCase('mta/helpers/login.helper.ts', `import { 먼저뜨는것, 로그인이어쓰기 } from '@platform/kit/parts';\n${깨끗한글}`)).toEqual([]);
    expect(checkNonCase('mta/helpers/login.helper.ts', `import * as 부품 from '@platform/kit/parts';\n${깨끗한글}`).map((x) => x.rule)).toEqual(['K7']);
    expect(checkNonCase('mta/helpers/login.helper.ts', `import { verify } from '@platform/kit';\n${깨끗한글}`).map((x) => x.rule)).toContain('K7');
    expect(checkNonCase('mta/helpers/login.helper.ts', `import { 뜰때까지 } from '@platform/kit/runtime';\n${깨끗한글}`).map((x) => x.rule)).toEqual(['K7']);
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
