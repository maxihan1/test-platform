// 실패 사진의 빨간 네모 — 실제 Chromium 으로 웹 감싸기 · 그리기, 가짜 폰 연결로 앱 요소 적기, 그림 칠하기를 본다 (SPEC 공통/2-명세선언 「스크린샷」)
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium, type Locator, type Page } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDriver } from './app.js';
import { stepScope, type RunScope, type StepScope } from './context.js';
import { PNG, 앱을지켜본다, 웹사진, 웹을지켜본다, 테두리를그린다 } from './highlight.js';
import { runStep } from './step.js';
import { verify } from './verify.js';

const 색 = (png: { width: number; data: Uint8Array }, x: number, y: number): number[] => {
  const i = (y * png.width + x) * 4;
  return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
};
const 빨간가 = (c: number[]): boolean => c[0]! - c[1]! > 40 && c[0]! - c[2]! > 40;

describe('웹 — 실패 절차의 마지막 요소에 네모', () => {
  let browser: Browser;
  let page: Page;
  let 폴더: string;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    await page.setContent(
      '<body style="margin:0;background:#fff"><button style="position:absolute;left:100px;top:100px;width:80px;height:30px">저장</button>' +
        '<ul><li>하나</li><li>둘</li></ul></body>',
    );
    폴더 = await mkdtemp(join(tmpdir(), 'kit-highlight-'));
  }, 30_000);

  afterAll(async () => {
    await browser.close();
  });

  const 돌린다 = async (body: (p: Page) => Promise<void>, options?: { capture: true }) => {
    const 받은: (Locator | string | undefined)[] = [];
    let 사진 = '';
    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      capture: async (seq, 요소) => {
        받은.push(요소);
        사진 = join(폴더, `${받은.length}-${seq}.png`);
        await 웹사진(page, 사진, typeof 요소 === 'object' ? 요소 : undefined);
        return 사진;
      },
      emit: async () => undefined,
    };
    await runStep(run, '절차', () => body(웹을지켜본다(page)), options);
    return { 받은, 사진: 사진 === '' ? undefined : PNG.sync.read(await readFile(사진)) };
  };

  it('누른 버튼의 값이 틀리면 그 버튼 자리가 빨갛게 덮이고, 조작은 사진 찍기 한 번뿐이다', async () => {
    const { 받은, 사진 } = await 돌린다(async (p) => {
      await p.getByRole('button', { name: '저장' }).click();
      await verify('저장 뒤 글이 바뀐다', '저장', '완료');
    });
    expect(받은).toHaveLength(1);
    expect(빨간가(색(사진!, 140, 115))).toBe(true);
    expect(빨간가(색(사진!, 60, 115))).toBe(false);
  }, 30_000);

  it('사슬 끝 요소(first)를 짚는다', async () => {
    const { 받은 } = await 돌린다(async (p) => {
      await p.getByRole('listitem').first().textContent();
      await verify('첫 줄', '하나', '둘');
    });
    expect(String(받은[0])).toContain('first');
  }, 30_000);

  it('없는 요소를 눌러 실패하면 네모 없이 사진만 남는다', async () => {
    const { 받은, 사진 } = await 돌린다(async (p) => {
      await p.getByRole('button', { name: '없는 단추' }).click({ timeout: 300 });
    });
    expect(받은[0]).toBeDefined();
    expect(빨간가(색(사진!, 140, 115))).toBe(false);
  }, 30_000);

  it('처음 실패한 때의 요소를 짚는다 — 그 뒤 다른 요소를 다뤄도 옮겨 가지 않는다', async () => {
    const { 받은 } = await 돌린다(async (p) => {
      await p.getByRole('button', { name: '저장' }).click();
      await verify('저장 글', '저장', '완료');
      await p.getByRole('listitem').first().textContent();
    });
    expect(String(받은[0])).toContain('button');
  }, 30_000);

  it('page 에서 바로 부르면 짚을 요소를 비운다', async () => {
    const { 받은 } = await 돌린다(async (p) => {
      await p.getByRole('button', { name: '저장' }).click();
      await verify('주소', p.url(), 'https://없는.test/');
    });
    expect(받은).toEqual([undefined]);
  }, 30_000);

  it('동작이 실패해도 스택 맨 위는 kit 이 아니라 부른 자리다', async () => {
    const 스택 = await 웹을지켜본다(page)
      .getByRole('button', { name: '없는 단추' })
      .click({ timeout: 200 })
      .then(() => '', (e: Error) => e.stack ?? '');
    expect(스택.split('\n').find((l) => l.includes(' at '))).not.toContain('highlight.ts');
  }, 30_000);

  it('덮기가 깨지는 선택자여도 맨 사진은 남는다', async () => {
    const 사진 = join(폴더, 'bad.png');
    await 웹사진(page, 사진, page.locator('button:has-text('));
    expect(PNG.sync.read(await readFile(사진)).width).toBe(400);
  }, 30_000);

  it('통과한 증적 절차에는 요소를 넘기지 않는다', async () => {
    const { 받은 } = await 돌린다(async (p) => {
      await p.getByRole('button', { name: '저장' }).click();
    }, { capture: true });
    expect(받은).toEqual([undefined]);
  }, 30_000);
});

describe('앱 — 마지막으로 찾은 요소 번호', () => {
  const 가짜폰 = () => {
    const 듣기: Record<string, ((e: unknown) => void)[]> = {};
    const 폰 = { on: (이름: string, fn: (e: unknown) => void) => (듣기[이름] ??= []).push(fn) };
    const 쏜다 = (이름: string, e: unknown) => 듣기[이름]?.forEach((fn) => fn(e));
    return { driver: 폰 as unknown as AppDriver, 쏜다, 듣기 };
  };
  const 절차안 = (fn: (scope: StepScope) => void): StepScope => {
    const scope: StepScope = { assertions: [] };
    stepScope.run(scope, () => fn(scope));
    return scope;
  };

  it('찾은 요소 번호를 적고, 새 찾기가 실패하면 비운다 · 한 연결에 한 번만 듣는다', () => {
    const { driver, 쏜다, 듣기 } = 가짜폰();
    앱을지켜본다(driver);
    앱을지켜본다(driver);
    expect(듣기.result).toHaveLength(1);

    const 찾음 = 절차안(() => {
      쏜다('command', { command: 'findElement' });
      쏜다('result', { command: 'findElement', result: { value: { 'element-6066-11e4-a52e-4f735466cecf': 'el-1' } } });
      쏜다('command', { command: 'elementClick' });
    });
    expect(찾음.마지막요소).toBe('el-1');

    const 못찾음 = 절차안((scope) => {
      scope.마지막요소 = 'el-1';
      쏜다('command', { command: 'findElement' });
      쏜다('result', { command: 'findElement', result: { error: new Error('no such element') } });
    });
    expect(못찾음.마지막요소).toBeUndefined();
  });
});

describe('테두리를그린다', () => {
  it('요소 바깥 1~3화소는 빨강, 4화소는 흰색, 안과 그림 밖은 그대로다', () => {
    const png = { width: 20, height: 20, data: new Uint8Array(20 * 20 * 4) };
    테두리를그린다(png, { x: 5, y: 5, width: 5, height: 5 });
    expect(색(png, 4, 7)).toEqual([229, 72, 77]);
    expect(색(png, 2, 7)).toEqual([229, 72, 77]);
    expect(색(png, 1, 7)).toEqual([255, 255, 255]);
    expect(색(png, 7, 7)).toEqual([0, 0, 0]);
    테두리를그린다(png, { x: -3, y: -3, width: 30, height: 30 });
  });
});
