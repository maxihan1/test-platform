// Page Object · Component 파일에 K7 만 걸리고 케이스 규칙은 안 걸리는지, 그 파일만 모이는지 검사한다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkPageObject, pageObjectFiles } from './pageObject.js';
import { caseFiles } from './scanner.js';

const 깨끗한글 = `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('https://example.com/login');
  }
}
`;

describe('checkPageObject', () => {
  it('깨끗한 글이면 위반이 없다 — defineCase 가 없어도 K1·K3 등은 걸지 않는다', () => {
    expect(checkPageObject('mkt/pages/login.page.ts', 깨끗한글)).toEqual([]);
  });

  it('주석이 있으면 K7 하나를 그 줄로 낸다', () => {
    const 글 = 깨끗한글.replace('  async open', '  // 로그인 화면을 연다\n  async open');
    const found = checkPageObject('mkt/pages/login.page.ts', 글);
    expect(found.map((x) => [x.rule, x.line])).toEqual([['K7', 6]]);
    expect(found[0]?.file).toBe('mkt/pages/login.page.ts');
  });

  it('expect 를 쓰면 K7 이다', () => {
    const 글 = 깨끗한글.replace("await this.page.goto('https://example.com/login');", 'expect(this.page).toBeTruthy();');
    expect(checkPageObject('mkt/pages/login.page.ts', 글).map((x) => x.rule)).toEqual(['K7']);
  });
});

describe('pageObjectFiles', () => {
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
    ]) {
      await writeFile(join(root, file), '');
    }
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('pages 의 .page.ts 와 components 의 .component.ts 만 모은다', async () => {
    expect(await pageObjectFiles(root)).toEqual([
      join(root, 'mkt/components/site-header.component.ts'),
      join(root, 'mkt/pages/login.page.ts'),
    ]);
  });

  it('caseFiles 는 여전히 .spec.ts 만 모은다', async () => {
    expect(await caseFiles(root)).toEqual([join(root, 'mkt/MKT-001.spec.ts')]);
  });
});
