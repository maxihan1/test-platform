// 공용 부품 밖 CSS · XPath 를 K17 로 막는지, 기존 개수까지는 봐 주는지 검사한다

import { sep } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { k17 as k17검사, 공용부품인가 } from './cssLocator.js';
import { checkNonCase } from './pageObject.js';
import { checkSource } from './rules.js';

const k17 = (xs: { rule: string; line: number }[]): number[] => xs.filter((x) => x.rule === 'K17').map((x) => x.line);

const 화면 = (몸통: string): string => `import type { Page } from '@playwright/test';

export class P {
  constructor(private readonly page: Page) {}
${몸통}
}
`;

describe('K17 공용 부품 밖 CSS · XPath', () => {
  it('Page Object 의 CSS · XPath 를 줄마다 짚는다', () => {
    const 글 = 화면(`  a = () => this.page.locator('.toast');
  b = () => this.page.locator("#modal");
  c = () => this.page.locator('//div');
  d = () => this.page.locator('css=a');
  e = () => this.page.locator('xpath=//a');
  f = () => this.page.locator('[name="q"]');`);
    expect(k17(checkNonCase('new/pages/home.page.ts', 글))).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it('역할 · 라벨 · test id 로 찾으면 걸리지 않는다', () => {
    const 글 = 화면(`  a = () => this.page.getByRole('button', { name: '게시' });
  b = () => this.page.locator('[data-testid="x"]');`);
    expect(k17(checkNonCase('new/pages/home.page.ts', 글))).toEqual([]);
  });

  it('components · helpers 안은 공용 부품이라 봐 준다', () => {
    const 글 = 화면(`  a = () => this.page.locator('.toast');`);
    expect(k17(checkNonCase('new/components/toast.component.ts', 글))).toEqual([]);
    expect(k17(checkNonCase('new/helpers/login.helper.ts', 글))).toEqual([]);
  });

  it('케이스 파일에서도 짚는다', () => {
    const 글 = `import { test } from '@playwright/test';

test('x', async ({ page }) => {
  await page.locator('.compose-form button').click();
});
`;
    expect(k17(checkSource('new/NEW-FN-001.spec.ts', 글).violations)).toEqual([4]);
  });

  it('기존 개수까지는 봐 주고 늘면 그 파일의 것을 다 짚는다', () => {
    const 기존 = { 'old/pages/home.page.ts': 1 };
    const 읽기 = (글: string): ts.SourceFile => ts.createSourceFile('x.ts', 글, ts.ScriptTarget.Latest, true);
    expect(k17검사('old/pages/home.page.ts', 읽기(화면(`  a = () => this.page.locator('.a');`)), 기존)).toEqual([]);
    const 두개 = 읽기(화면(`  a = () => this.page.locator('.a');
  b = () => this.page.locator('.b');`));
    const 위반 = k17검사('old/pages/home.page.ts', 두개, 기존);
    expect(위반.map((x) => x.line)).toEqual([5, 6]);
    expect(위반[0]?.what).toContain('기존 1개까지 봐 준다 — 지금 2개');
  });

  it('윈도 경로의 components 도 공용 부품으로 읽는다', () => {
    expect(공용부품인가(['new', 'components', 'toast.component.ts'].join(sep))).toBe(true);
  });
});
