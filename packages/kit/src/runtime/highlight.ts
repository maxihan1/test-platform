// 실패 사진에 문제 요소를 빨갛게 표시한다 — 절차 안에서 마지막으로 다룬 요소를 적어 두고 찍을 때 그린다 (SPEC 공통/2-명세선언 「스크린샷」)
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
export const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle') as {
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

// Locator · FrameLocator 를 돌려주는 동기 메서드 — 이것만 감싸 결과를 사슬 끝까지 따라간다
const 만드는이름 = new Set(['locator', 'frameLocator', 'first', 'last', 'nth', 'filter', 'and', 'or', 'owner', 'contentFrame']);
const 만든다 = (key: PropertyKey): boolean => typeof key === 'string' && (key.startsWith('getBy') || 만드는이름.has(key));

// 동작 · 읽기 메서드는 꺼내는 순간 적고 원래 함수를 묶어 넘긴다 — 감싼 함수가 스택 맨 위에 끼면 trace 조작 위치 · 실패 줄이 kit 을 가리킨다.
// page 에서 바로 부른 것(page.fill('#x') · page.url())은 짚을 Locator 가 없어 비운다 — 앞 요소를 잘못 짚지 않게
function 감싼다<T extends object>(대상: T, 요소틀: 틀, 틀들: 틀[]): T {
  const 있던 = 감싼것.get(대상);
  if (있던) return 있던 as T;
  const 요소 = 대상 instanceof 요소틀 ? (대상 as unknown as Locator) : undefined;
  const 판 = new Proxy(대상, {
    get(t, key) {
      const 값 = Reflect.get(t, key, t) as unknown;
      if (typeof 값 !== 'function') return 값;
      const 함수 = 값 as (...a: unknown[]) => unknown;
      if (만든다(key)) {
        return (...args: unknown[]) => {
          const 결과 = 함수.apply(t, args);
          return 틀들.some((c) => 결과 instanceof c) ? 감싼다(결과 as object, 요소틀, 틀들) : 결과;
        };
      }
      적는다(요소);
      return 함수.bind(t);
    },
  });
  감싼것.set(대상, 판);
  return 판;
}

// 번들 속 클래스 이름은 판마다 바뀐다(1.63 은 _Locator) — 그 page 가 만든 것에서 틀을 꺼내 견준다
export function 웹을지켜본다(page: Page): Page {
  // Locator 를 못 만드는 대역(단위 테스트의 가짜 page)은 감싸지 않는다 — 표시만 없고 케이스는 그대로 돈다
  if (typeof page.locator !== 'function' || typeof page.frameLocator !== 'function') return page;
  const 요소틀 = page.locator('html').constructor as 틀;
  return 감싼다(page, 요소틀, [요소틀, page.frameLocator('html').constructor as 틀]);
}

const 지켜보는폰 = new WeakSet<object>();
const W3C요소 = 'element-6066-11e4-a52e-4f735466cecf';
const 요소주소 = /\/element\/([^/]+)\//;
interface 명령기록 {
  command: string;
  endpoint?: string;
  body?: { args?: unknown[] };
  result?: { value?: unknown };
}

// WebdriverIO 는 요소가 내는 명령 이벤트도 폰 연결로 올린다(요소의 emit 이 연결의 것이다).
// 요소 주소로 가는 명령(누르기 · 글 읽기 · 보이나 …)은 그 요소 번호를 적는다 — $$ 목록 · 이어 찾은 요소도 짚는다.
// 찾기를 시작하면 비우고 찾으면 적는다 — 못 찾은 요소 자리에 앞 요소를 잘못 짚지 않게
export function 앱을지켜본다(driver: AppDriver): AppDriver {
  if (지켜보는폰.has(driver)) return driver;
  지켜보는폰.add(driver);
  const 폰 = driver as unknown as { on?: (event: string, fn: (e: 명령기록) => void) => void };
  if (typeof 폰.on !== 'function') return driver;
  폰.on('command', (e: 명령기록) => {
    if (e.command.startsWith('findElement')) {
      적는다(undefined);
      return;
    }
    const id = 요소주소.exec(e.endpoint ?? '')?.[1];
    if (id !== undefined) {
      적는다(decodeURIComponent(id));
      return;
    }
    // 요소 번호를 실어 보내는 손짓 명령(driver.execute('mobile: clickGesture', { elementId }))도 그 요소를 다룬 것이다
    const 실은번호 = (e.body?.args?.[0] as { elementId?: unknown } | undefined)?.elementId;
    if (typeof 실은번호 === 'string') 적는다(실은번호);
  });
  폰.on('result', (e: 명령기록) => {
    if (e.command !== 'findElement' && e.command !== 'findElementFromElement') return;
    const 값 = e.result?.value as Record<string, unknown> | undefined;
    const id = 값?.[W3C요소] ?? 값?.ELEMENT;
    if (typeof id === 'string') 적는다(id);
  });
  return driver;
}

const 덮는세기 = 0.4;
const 웹덮개색 = `rgba(${빨강.join(', ')}, ${덮는세기})`;

// 웹(mask)과 같은 반투명 빨강으로 덮고 둘레에 빨간 테두리 · 흰 바깥줄 — 폰 해상도에서도 보이게 굵기는 사진 크기에 맞춘다
export function 표시를그린다(png: 그림, 상자: 상자): void {
  const x0 = Math.round(상자.x);
  const y0 = Math.round(상자.y);
  const x1 = Math.round(상자.x + 상자.width) - 1;
  const y1 = Math.round(상자.y + 상자.height) - 1;
  const 칠한다 = (x: number, y: number, 색: readonly number[], 세기: number): void => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    for (let k = 0; k < 3; k++) png.data[i + k] = Math.round(png.data[i + k]! * (1 - 세기) + 색[k]! * 세기);
    png.data[i + 3] = 255;
  };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) 칠한다(x, y, 빨강, 덮는세기);
  // 짧은 변 기준 — 가로 화면이라고 테두리가 두 배로 굵어지지 않게
  const 굵기 = Math.max(3, Math.round(Math.min(png.width, png.height) / 270));
  for (let d = 1; d <= 굵기 + 1; d++) {
    const 색 = d > 굵기 ? 흰색 : 빨강;
    for (let x = x0 - d; x <= x1 + d; x++) {
      칠한다(x, y0 - d, 색, 1);
      칠한다(x, y1 + d, 색, 1);
    }
    for (let y = y0 - d; y <= y1 + d; y++) {
      칠한다(x0 - d, y, 색, 1);
      칠한다(x1 + d, y, 색, 1);
    }
  }
}

// 사진 찍기 한 번 안에서 얹고 걷는다 — 따로 부른 스크롤 · 자리 읽기가 trace 조작 목록에 섞이지 않게(admin 은 Screenshot 만 거른다 · traceParse.ts).
// 글자가 비치게 반투명으로 덮는다. 없거나 숨은 요소는 덮을 자리가 없어 맨 사진이 된다 · 여럿이면 다 덮는다
export async function 웹사진(page: Page, path: string, 요소: Locator | undefined): Promise<void> {
  if (요소 === undefined) {
    await page.screenshot({ path });
    return;
  }
  // 덮기가 깨지면(틀린 선택자 · 떨어진 iframe) 맨 사진으로 다시 찍는다 — 표시 때문에 사진을 잃지 않는다
  await page.screenshot({ path, mask: [요소], maskColor: 웹덮개색 }).catch(() => page.screenshot({ path }));
}

export async function 앱사진(driver: AppDriver, path: string, 요소: string | undefined): Promise<void> {
  await driver.saveScreenshot(path);
  if (요소 === undefined) return;
  try {
    // 요소 자리와 사진은 둘 다 실제 화소다. 창 크기를 못 읽으면 그대로 1배로 본다
    const [자리, 창] = await Promise.all([driver.getElementRect(요소), driver.getWindowRect().catch(() => undefined)]);
    const png = PNG.sync.read(await readFile(path));
    const 배 = 창 !== undefined && 창.width > 0 ? png.width / 창.width : 1;
    표시를그린다(png, { x: 자리.x * 배, y: 자리.y * 배, width: 자리.width * 배, height: 자리.height * 배 });
    await writeFile(path, PNG.sync.write(png));
  } catch (err) {
    console.error(`[kit] 실패 사진에 표시를 그리지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
