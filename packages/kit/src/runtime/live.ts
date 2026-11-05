// 테스트 모드 장면 — 탭(또는 Appium 폰 화면)의 마지막 장면 한 장을 러너가 준 파일에 덮어 쓰고 탭이면 누른 곳을 그린다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
// 이 프로세스는 러너의 손자(Playwright 작업자)라 파일로 넘긴다. 러너가 GET /live/:key 로 그 파일을 낸다

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Page } from '@playwright/test';

// 긴 변 800px(Playwright 기본)에 품질 70 — 글자 많은 화면도 한 장 70KB 안팎이다(2026-11-03 실측, 품질 90 은 107KB)
const 품질 = 70;
// 장면은 1초에 40장쯤 온다. 화면은 0.25초마다 읽으니 0.1초에 한 번만 쓴다
const 쓰기간격ms = 100;

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export interface 장면쓰개 {
  받기(장: Buffer): void;
  // 쓰던 것을 마치고 파일을 지운다. 그 뒤에 온 장면은 버린다
  닫기(): Promise<void>;
}

// 마지막 것만 쓴다 — 쓰는 동안 온 장면은 하나만 들고 있다가 이어 쓰니 마지막 장면을 빠뜨리지 않는다.
// 임시 파일에 쓰고 이름을 바꿔 덮는다 — 러너가 반쪽 그림을 안 내준다
export function 장면쓰개(파일: string, 간격ms = 쓰기간격ms): 장면쓰개 {
  const 임시 = `${파일}.tmp`;
  let 다음: Buffer | undefined;
  let 도는: Promise<void> | undefined;
  let 닫힘 = false;
  let 알림 = false;
  const 돌기 = async (): Promise<void> => {
    try {
      while (다음 !== undefined && !닫힘) {
        const 장 = 다음;
        다음 = undefined;
        await writeFile(임시, 장);
        await rename(임시, 파일);
        await new Promise((끝) => setTimeout(끝, 간격ms));
      }
    } catch (err) {
      // 장면은 보는 것일 뿐 판정과 상관없다. 다음 장면이 다시 써 본다 — 디스크가 차면 장면마다 찍히지 않게 한 번만 알리고, 쉬었다가 다시 받는다
      if (!알림) console.warn(`[kit] 테스트 모드 장면을 못 썼다 (${파일}): ${글(err)}`);
      알림 = true;
      await new Promise((끝) => setTimeout(끝, 간격ms));
    } finally {
      도는 = undefined;
    }
  };
  return {
    받기(장) {
      if (닫힘) return;
      다음 = 장;
      도는 ??= 돌기();
    },
    async 닫기() {
      닫힘 = true;
      await 도는;
      // 못 지워도 단계는 그대로 간다 — 남은 파일은 실행이 끝날 때 러너가 한 번 더 지운다
      for (const 하나 of [임시, 파일]) await rm(하나, { force: true }).catch((err: unknown) => console.warn(`[kit] 테스트 모드 장면을 못 지웠다 (${하나}): ${글(err)}`));
    },
  };
}

export interface 장면 {
  // 탭이 닫혔으면 장면도 이미 멈췄다 — 파일만 지운다
  끄기(): Promise<void>;
}

// 러너가 장면 파일을 준 실행(테스트 모드)에만 건다. 못 걸어도 케이스는 그대로 돈다 — 장면은 보는 것일 뿐이다
export async function 장면걸기(page: Page, 파일 = process.env.PLATFORM_LIVE_FILE): Promise<장면 | undefined> {
  if (!파일) return undefined;
  const 쓰개 = 장면쓰개(파일);
  try {
    await mkdir(dirname(파일), { recursive: true });
    await page.screencast.start({ quality: 품질, onFrame: ({ data }) => 쓰개.받기(data) });
    await page.screencast.showActions();
  } catch (err) {
    console.warn(`[kit] 테스트 모드 장면을 못 걸었다: ${글(err)}`);
  }
  return {
    async 끄기() {
      if (!page.isClosed()) await page.screencast.stop().catch((err: unknown) => console.warn(`[kit] 테스트 모드 장면을 못 멈췄다: ${글(err)}`));
      await 쓰개.닫기();
    },
  };
}

// 폰 화면 한 장 사이에 쉬는 틈. 찍기는 단계 명령과 같은 Appium 세션을 쓴다 — 쉬지 않으면 단계가 찍기 뒤에 줄을 선다
const 폰쉼ms = 1_000;

/** Appium 연결에서 장면을 찍는 데 쓰는 것만 — webdriverio 의 driver 가 맞는다 */
export interface 폰찍개 {
  takeScreenshot(): Promise<string>;
}

/**
 * 앱 · 게임 단계의 장면 — Appium 으로 폰 화면을 찍어(PNG) 같은 파일에 덮어 쓰고 1초 쉬었다 다시 찍는다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」 · 2026-11-05 사용자).
 * ponytail: 같은 Appium 세션이라 찍는 동안 단계 명령이 기다린다(게임은 한 장 1.5초쯤) — 단계가 눈에 띄게 느려지면 VISION 화면 통로(H.264)를 받아 그리는 쪽으로
 */
export async function 폰장면걸기(driver: 폰찍개, 파일 = process.env.PLATFORM_LIVE_FILE, 쉼ms = 폰쉼ms): Promise<장면 | undefined> {
  if (!파일) return undefined;
  try {
    await mkdir(dirname(파일), { recursive: true });
  } catch (err) {
    console.warn(`[kit] 테스트 모드 폰 장면을 못 걸었다: ${글(err)}`);
    return undefined;
  }
  // 한 장 찍는 데 1초 안팎이라 쓰기 간격은 따로 두지 않는다
  const 쓰개 = 장면쓰개(파일, 0);
  let 멈춤 = false;
  let 깨우기 = () => {};
  let 알림 = false;
  const 돌기 = (async () => {
    while (!멈춤) {
      try {
        const 장 = Buffer.from(await driver.takeScreenshot(), 'base64');
        if (!멈춤) 쓰개.받기(장);
      } catch (err) {
        // 앱이 넘어가는 중이거나 연결이 닫히는 중일 수 있다 — 장면은 보는 것일 뿐이라 한 번만 알리고 다음 장을 다시 찍어 본다
        if (!알림 && !멈춤) console.warn(`[kit] 테스트 모드 폰 장면을 못 찍었다: ${글(err)}`);
        알림 = true;
      }
      if (멈춤) break;
      await new Promise<void>((끝) => {
        const 타이머 = setTimeout(끝, 쉼ms);
        깨우기 = () => {
          clearTimeout(타이머);
          끝();
        };
      });
    }
  })();
  return {
    async 끄기() {
      멈춤 = true;
      깨우기();
      await 돌기;
      await 쓰개.닫기();
    },
  };
}
