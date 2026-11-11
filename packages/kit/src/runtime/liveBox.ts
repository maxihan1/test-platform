// 실시간 장면의 요소 윤곽 — 케이스가 지금 누르거나 확인하는 요소의 자리를 장면 파일 옆(<장면>.box)에 적는다 (SPEC 도메인/러너 §5.2 「요소 윤곽」)
// 러너가 장면과 같이 머리글로 내고 화면이 그림 위에 윤곽을 겹쳐 그린다. 그림에 직접 그리면 장면마다 풀고 다시 묶느라 CPU 를 쓴다(웹 한 장 50ms · 폰 300ms 쯤, 2026-11-11 실측)

import { rename, rm, writeFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';

import { 지금다룬요소 } from './highlight.js';

/** 장면 그림에 대한 비율(0~1) — 그림 크기가 바뀌어도 화면이 그대로 겹친다 */
export interface 비율상자 {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface 자리 {
  x: number;
  y: number;
  width: number;
  height: number;
}

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// 웹 요소 자리를 다시 읽는 틈 — 화면이 장면을 0.25초마다 묻는다
const 따라가기간격ms = 250;
// 자리 읽기가 오래 걸리면 버린다 — 사라지는 요소를 기다리느라 윤곽이 늦게 따라오지 않게
const 자리기다림ms = 200;

/** 화면 밖으로 반쯤 나간 요소는 화면 안만 남긴다. 다 나갔거나 크기가 없으면 윤곽이 없다 */
export function 비율로(자리: 자리, 창: { width: number; height: number }): 비율상자 | null {
  if (창.width <= 0 || 창.height <= 0) return null;
  const x0 = Math.max(0, 자리.x / 창.width);
  const y0 = Math.max(0, 자리.y / 창.height);
  const x1 = Math.min(1, (자리.x + 자리.width) / 창.width);
  const y1 = Math.min(1, (자리.y + 자리.height) / 창.height);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export interface 상자쓰개 {
  쓴다(상자: 비율상자 | null): Promise<void>;
  닫기(): Promise<void>;
}

/** 바뀔 때만 쓴다. 임시 파일에 쓰고 이름을 바꿔 러너가 반쪽 글을 안 읽게 한다. 못 써도 케이스는 그대로 돈다 */
export function 상자쓰개(장면파일: string): 상자쓰개 {
  const 곳 = `${장면파일}.box`;
  const 임시 = `${곳}.tmp`;
  let 앞 = '';
  let 닫힘 = false;
  let 알림 = false;
  let 줄: Promise<void> = Promise.resolve();
  return {
    쓴다(상자) {
      const 새 = 상자 === null ? '' : [상자.x, 상자.y, 상자.w, 상자.h].map((n) => n.toFixed(4)).join(',');
      if (닫힘 || 새 === 앞) return 줄;
      앞 = 새;
      줄 = 줄
        .then(async () => {
          if (새 === '') await rm(곳, { force: true });
          else {
            await writeFile(임시, 새);
            await rename(임시, 곳);
          }
        })
        .catch((err: unknown) => {
          if (!알림) console.warn(`[kit] 장면 윤곽 자리를 못 썼다 (${곳}): ${글(err)}`);
          알림 = true;
        });
      return 줄;
    },
    async 닫기() {
      닫힘 = true;
      await 줄;
      for (const 하나 of [임시, 곳]) await rm(하나, { force: true }).catch(() => undefined);
    },
  };
}

/**
 * 웹 — 0.25초마다 지금 다루는 Locator 의 자리를 읽는다. 이 탭의 요소만이다 — 다른 탭 요소를 이 장면에 그리지 않는다.
 * 자리 읽기(boundingBox)는 Playwright 호출이라 trace 조작 목록에 끼는데 admin 이 부른 자리(이 파일)로 거른다 (traceParse.ts)
 */
export function 웹요소따라가기(page: Page, 창크기: () => { width: number; height: number } | null, 쓰개: 상자쓰개): () => Promise<void> {
  let 멈춤 = false;
  let 깨우기 = () => {};
  const 돌기 = (async () => {
    while (!멈춤 && !page.isClosed()) {
      const 요소 = 지금다룬요소();
      const 창 = 창크기();
      let 상자: 비율상자 | null = null;
      if (typeof 요소 === 'object' && 창 !== null && 요소.page() === page) {
        const 읽은 = await 요소.first().boundingBox({ timeout: 자리기다림ms }).catch(() => null);
        상자 = 읽은 === null ? null : 비율로(읽은, 창);
      }
      if (멈춤) break;
      await 쓰개.쓴다(상자);
      await new Promise<void>((끝) => {
        const 타이머 = setTimeout(끝, 따라가기간격ms);
        깨우기 = () => {
          clearTimeout(타이머);
          끝();
        };
      });
    }
  })();
  return async () => {
    멈춤 = true;
    깨우기();
    await 돌기;
  };
}

/** 폰 요소 자리를 읽는 데 쓰는 것만 — webdriverio 의 driver 가 맞는다. 둘 중 하나라도 없으면 윤곽이 없다 */
export interface 폰자리읽개 {
  getElementRect?(elementId: string): Promise<자리>;
  getWindowRect?(): Promise<{ width: number; height: number }>;
}

/**
 * 앱 — 지금 다루는 요소 번호의 자리를 읽는다. 같은 요소면 다시 안 묻는다 — 묻는 것도 Appium 명령이라 단계 명령을 세운다.
 * 게임 단계는 요소가 Appium 요소가 아니라 윤곽이 없다(control-cli 가 오브젝트 자리를 안 준다)
 */
export function 폰상자읽개(driver: 폰자리읽개): () => Promise<비율상자 | null> {
  let 창: { width: number; height: number } | undefined;
  let 앞: { id: string; 상자: 비율상자 | null } | undefined;
  return async () => {
    const 요소 = 지금다룬요소();
    if (typeof 요소 !== 'string' || driver.getElementRect === undefined || driver.getWindowRect === undefined) return null;
    if (앞?.id === 요소) return 앞.상자;
    try {
      창 ??= await driver.getWindowRect();
      앞 = { id: 요소, 상자: 비율로(await driver.getElementRect(요소), 창) };
    } catch {
      // 사라진 요소 — 같은 번호를 다시 묻지 않는다
      앞 = { id: 요소, 상자: null };
    }
    return 앞.상자;
  };
}
