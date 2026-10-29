// 실패 사진에 문제 요소를 빨간 네모로 그려 넣는다 — 절차 안에서 마지막으로 다룬 요소를 적어 두고 찍을 때 그린다 (SPEC 공통/2-명세선언 「스크린샷」)
// verify 는 값만 받아 어느 요소의 값인지 모른다. 그래서 「그 절차에서 마지막으로 다룬 요소」를 짚는다 — 절차마다 새 문맥이라 앞 절차 요소는 안 짚는다

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { Locator, Page } from '@playwright/test';

import type { AppDriver } from './app.js';
import { stepScope } from './context.js';

export interface 상자 {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface 그림 {
  width: number;
  height: number;
  data: Uint8Array;
}

// ponytail: Playwright 안에 든 pngjs 를 빌려 쓴다(exports 에 공개된 경로) — Playwright 를 올릴 때 이 경로가 없어지면 highlight.test.ts 가 깨진다
const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle') as {
  PNG: { sync: { read(buf: Buffer): 그림; write(png: 그림): Buffer } };
};

const 빨강 = [229, 72, 77] as const;
const 흰색 = [255, 255, 255] as const;

function 적는다(요소: Locator | string | undefined): void {
  const scope = stepScope.getStore();
  if (scope) scope.마지막요소 = 요소;
}

const 감싼것 = new WeakMap<object, object>();
type 틀 = abstract new (...args: never[]) => object;

// Locator 의 메서드를 부르기 전에 그 Locator 를 적는다. 돌려받은 Locator(first · filter · getBy…)도 감싸 사슬 끝까지 따라간다
function 감싼다<T extends object>(대상: T, 요소틀: 틀, 틀들: 틀[]): T {
  const 있던 = 감싼것.get(대상);
  if (있던) return 있던 as T;
  const 판 = new Proxy(대상, {
    get(t, key) {
      const 값 = Reflect.get(t, key, t) as unknown;
      if (typeof 값 !== 'function') return 값;
      return (...args: unknown[]) => {
        if (t instanceof 요소틀) 적는다(t as unknown as Locator);
        const 결과 = (값 as (...a: unknown[]) => unknown).apply(t, args);
        return 틀들.some((c) => 결과 instanceof c) ? 감싼다(결과 as object, 요소틀, 틀들) : 결과;
      };
    },
  });
  감싼것.set(대상, 판);
  return 판;
}

// 번들 속 클래스 이름은 판마다 바뀐다(1.63 은 _Locator) — 그 page 가 만든 것에서 틀을 꺼내 견준다
export function 웹을지켜본다(page: Page): Page {
  // Locator 를 못 만드는 대역(단위 테스트의 가짜 page)은 감싸지 않는다 — 네모만 없고 케이스는 그대로 돈다
  if (typeof page.locator !== 'function' || typeof page.frameLocator !== 'function') return page;
  const 요소틀 = page.locator('html').constructor as 틀;
  return 감싼다(page, 요소틀, [요소틀, page.frameLocator('html').constructor as 틀]);
}

const W3C요소 = 'element-6066-11e4-a52e-4f735466cecf';
interface 명령기록 {
  command: string;
  result?: { value?: unknown };
}
const 지켜보는폰 = new WeakSet<object>();

// WebdriverIO 는 요소 명령 이벤트를 폰 연결에 안 올린다. 대신 찾기(findElement)는 올린다 — 마지막으로 찾은 요소를 적는다.
// 찾기를 시작하면 먼저 비운다 — 못 찾은 요소 자리에 앞 요소를 잘못 짚지 않게
export function 앱을지켜본다(driver: AppDriver): AppDriver {
  if (지켜보는폰.has(driver)) return driver;
  지켜보는폰.add(driver);
  const 폰 = driver as unknown as { on?: (event: string, fn: (e: 명령기록) => void) => void };
  if (typeof 폰.on !== 'function') return driver;
  폰.on('command', (e: 명령기록) => {
    if (e.command.startsWith('findElement')) 적는다(undefined);
  });
  폰.on('result', (e: 명령기록) => {
    if (e.command !== 'findElement') return;
    const 값 = e.result?.value as Record<string, unknown> | undefined;
    const id = 값?.[W3C요소] ?? 값?.ELEMENT;
    if (typeof id === 'string') 적는다(id);
  });
  return driver;
}

// 요소 바깥에 1~3px 빨강, 4px 흰 줄 — 어두운 화면 · 빨간 화면 어디서도 보이게
export function 테두리를그린다(png: 그림, 상자: 상자): void {
  const x0 = Math.round(상자.x);
  const y0 = Math.round(상자.y);
  const x1 = Math.round(상자.x + 상자.width) - 1;
  const y1 = Math.round(상자.y + 상자.height) - 1;
  const 칠한다 = (x: number, y: number, 색: readonly number[]): void => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    png.data[i] = 색[0]!;
    png.data[i + 1] = 색[1]!;
    png.data[i + 2] = 색[2]!;
    png.data[i + 3] = 255;
  };
  for (let d = 1; d <= 4; d++) {
    const 색 = d === 4 ? 흰색 : 빨강;
    for (let x = x0 - d; x <= x1 + d; x++) {
      칠한다(x, y0 - d, 색);
      칠한다(x, y1 + d, 색);
    }
    for (let y = y0 - d; y <= y1 + d; y++) {
      칠한다(x0 - d, y, 색);
      칠한다(x1 + d, y, 색);
    }
  }
}

// 사진 찍기 한 번 안에서 얹고 걷는다 — 따로 부른 스크롤 · 자리 읽기가 trace 조작 목록에 섞이지 않게(admin 은 Screenshot 만 거른다 · traceParse.ts).
// 글자가 비치게 반투명으로 덮는다. 없거나 숨은 요소는 덮을 자리가 없어 맨 사진이 된다 · 여럿이면 다 덮는다
export async function 웹사진(page: Page, path: string, 요소: Locator | undefined): Promise<void> {
  await page.screenshot({ path, ...(요소 === undefined ? {} : { mask: [요소], maskColor: 'rgba(229, 72, 77, 0.4)' }) });
}

export async function 앱사진(driver: AppDriver, path: string, 요소: string | undefined): Promise<void> {
  await driver.saveScreenshot(path);
  if (요소 === undefined) return;
  try {
    const 자리 = await driver.getElementRect(요소);
    const png = PNG.sync.read(await readFile(path));
    // 요소 자리와 사진은 둘 다 실제 화소다. 창 크기를 못 읽으면 그대로 1배로 본다
    const 창 = await driver.getWindowRect().catch(() => undefined);
    const 배 = 창 !== undefined && 창.width > 0 ? png.width / 창.width : 1;
    테두리를그린다(png, { x: 자리.x * 배, y: 자리.y * 배, width: 자리.width * 배, height: 자리.height * 배 });
    await writeFile(path, PNG.sync.write(png));
  } catch (err) {
    console.error(`[kit] 실패 사진에 네모를 그리지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
