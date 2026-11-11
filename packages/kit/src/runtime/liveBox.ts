// 실시간 장면의 요소 윤곽 — 케이스가 지금 누르거나 확인하는 요소의 자리를 장면 파일 옆(<장면>.box)에 적는다 (SPEC 도메인/러너 §5.2 「요소 윤곽」)
// 러너가 장면과 같이 머리글로 내고 화면이 그림 위에 윤곽을 겹쳐 그린다. 그림에 직접 그리면 장면마다 풀고 다시 묶느라 CPU 를 쓴다(웹 한 장 50ms · 폰 300ms 쯤, 2026-11-11 실측)

import { rename, rm, writeFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';

import { 게임원본, type KitGame } from './game.js';
import { 지금게임대상, 지금다룬요소, type 게임대상 } from './highlight.js';

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

// 웹 요소 자리를 다시 볼지 묻는 틈 — 화면이 장면을 0.25초마다 묻는다
const 따라가기간격ms = 250;
// 같은 요소는 1초마다만 다시 읽는다 — 읽기도 trace 에 남고 실제 폰은 터널을 오간다. 스크롤로 움직인 요소는 1초 안에 따라간다
const 같은요소다시ms = 1_000;
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
  // 장면이 안 와 직접 찍는 실제 폰 Chrome 은 창 크기를 알려 줄 장면이 없다 — 한 번 물어 둔다
  let 물은창: { width: number; height: number } | null | undefined;
  let 앞요소: unknown;
  let 앞읽은때 = 0;
  const 돌기 = (async () => {
    while (!멈춤 && !page.isClosed()) {
      const 요소 = 지금다룬요소();
      if (typeof 요소 !== 'object' || 요소.page() !== page) {
        await 쓰개.쓴다(null);
      } else if (요소 !== 앞요소 || Date.now() - 앞읽은때 >= 같은요소다시ms) {
        if (창크기() === null && 물은창 === undefined) 물은창 = await page.evaluate(() => ({ width: innerWidth, height: innerHeight })).catch(() => null);
        const 창 = 창크기() ?? 물은창 ?? null;
        const 읽은 = 창 === null ? null : await 요소.first().boundingBox({ timeout: 자리기다림ms }).catch(() => null);
        if (멈춤) break;
        await 쓰개.쓴다(읽은 === null || 창 === null ? null : 비율로(읽은, 창));
        앞읽은때 = Date.now();
      }
      앞요소 = 요소;
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

// PNG 머리(IHDR)의 가로 · 세로 — 그림을 풀지 않고 읽는다
function png크기(장: Buffer): { width: number; height: number } | null {
  if (장.length < 24 || 장[0] !== 0x89) return null;
  return { width: 장.readUInt32BE(16), height: 장.readUInt32BE(20) };
}

/**
 * 앱 — 찍은 폰 장면에 대해 지금 다루는 요소 번호의 자리를 읽는다. 장면마다 다시 읽는다 — 스크롤 · 키보드로 요소가 움직인다.
 * 비율은 실패 사진 표시(highlight.ts 앱사진)와 같이 「장면 가로 / 창 가로」 배율 하나로 바꾼다 — 창 높이는 시스템 막대를 빼고 올 수 있어 세로를 창으로 나누면 아래로 밀린다.
 * 창 크기는 장면 크기가 바뀔 때(회전)만 다시 묻는다. 게임 오브젝트는 Appium 요소가 아니라 여기서 안 다룬다 — 아래 게임상자읽개가 게임 SDK 에 묻는다
 */
export function 폰상자읽개(driver: 폰자리읽개): (장: Buffer) => Promise<비율상자 | null> {
  let 창: { width: number; height: number } | undefined;
  let 창을물은가로: number | undefined;
  return async (장) => {
    const 요소 = 지금다룬요소();
    const 그림 = png크기(장);
    if (typeof 요소 !== 'string' || 그림 === null || driver.getElementRect === undefined || driver.getWindowRect === undefined) return null;
    try {
      if (창 === undefined || 창을물은가로 !== 그림.width) {
        창 = await driver.getWindowRect();
        창을물은가로 = 그림.width;
      }
      const 배 = 창.width > 0 ? 그림.width / 창.width : 1;
      const 자리 = await driver.getElementRect(요소);
      return 비율로({ x: 자리.x * 배, y: 자리.y * 배, width: 자리.width * 배, height: 자리.height * 배 }, 그림);
    } catch {
      // 사라진 요소 · 닫히는 연결 — 이 장면에는 윤곽이 없다
      return null;
    }
  };
}

/** 게임 오브젝트 자리를 묻는 데 쓰는 것만 — control-cli 의 Game 이 맞는다. caps 는 ping 이 받아 둔 SDK 명령 목록이다 */
export interface 게임자리읽개 {
  caps?: string[];
  find(target: string, o?: { camera?: string }): Promise<{ rect?: [number, number, number, number]; screen?: [number, number] } | null>;
}

// 같은 오브젝트는 3초마다만 다시 묻는다 — 묻기도 팜을 거치는 게임 명령이라 케이스 명령과 같은 길을 쓴다
const 같은게임대상다시ms = 3_000;
// 게임이 장면을 불러오느라 바쁘면 find 가 오래 걸린다 — 장면 찍기를 세우지 않게 2초만 기다린다
const 게임자리기다림ms = 2_000;

/**
 * 게임 — 지금 다루는 오브젝트 주소를 control-cli `find` 로 물어 그 `rect` 를 `screen` 비율로 바꾼다. SDK 가 caps 에 `rect` 를 알릴 때만이다(control-cli 0.8.0 부터 —
 * 옛 SDK 를 넣은 게임은 물어도 사각형이 없다). 게임 좌표는 왼쪽 아래가 0 이라 위아래를 뒤집는다.
 * ponytail: 게임 화면이 폰 화면 전체라고 본다 — 게임이 화면 일부에만 그리면 윤곽이 그만큼 어긋난다. 그런 게임이 생기면 SDK screenshot 으로 장면을 찍는다
 */
export function 게임상자읽개(감싼것: 게임자리읽개, 지금 = Date.now): () => Promise<비율상자 | null> {
  // 감싼 연결로 물으면 그 물음이 케이스가 다룬 것으로 적힌다 — 원본으로 묻는다
  const game = 게임원본(감싼것 as KitGame) as 게임자리읽개;
  let 앞: { 대상: 게임대상; 때: number; 상자: 비율상자 | null } | undefined;
  return async () => {
    const 대상 = 지금게임대상();
    if (대상 === undefined || game.caps?.includes('rect') !== true) return null;
    if (앞 !== undefined && 앞.대상 === 대상 && 지금() - 앞.때 < 같은게임대상다시ms) return 앞.상자;
    const 묻기 = game.find(대상.대상, 대상.camera === undefined ? {} : { camera: 대상.camera }).catch(() => null);
    const 찾음 = await Promise.race([묻기, new Promise<null>((끝) => setTimeout(() => 끝(null), 게임자리기다림ms).unref())]);
    const 상자 = 찾음?.rect === undefined || 찾음.screen === undefined ? null : 게임비율(찾음.rect, 찾음.screen);
    앞 = { 대상, 때: 지금(), 상자 };
    return 상자;
  };
}

function 게임비율([x, y, w, h]: [number, number, number, number], [가로, 세로]: [number, number]): 비율상자 | null {
  return 비율로({ x, y: 세로 - (y + h), width: w, height: h }, { width: 가로, height: 세로 });
}
