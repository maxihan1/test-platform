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

export interface 탭장면 extends 장면 {
  // 장면 · 영상 · 받쳐 찍기를 멈추고 파일은 남긴다 — 실제 폰 Chrome 고정물이 영상을 마무리할 때 쓴다. 파일은 러너가 실행 끝에 지운다
  멈추기(): Promise<void>;
}

// 폰 화면 한 장 사이에 쉬는 틈. 찍기는 단계 명령과 같은 Appium 세션을 쓴다 — 쉬지 않으면 단계가 찍기 뒤에 줄을 선다
const 폰쉼ms = 1_000;
// 끌 때 찍던 장을 기다리는 상한 — 게임 한 장(1.5초쯤)은 기다린다
const 끄기기다림ms = 2_000;

// 받쳐 찍기의 틈 — 첫 장을 기다리는 시간과 찍는 간격. 간격은 앱 폰 장면과 같다
export interface 받침틈 {
  첫장ms: number;
  찍기ms: number;
}
const 기본받침틈: 받침틈 = { 첫장ms: 2_000, 찍기ms: 폰쉼ms };

/**
 * 장면이 첫장ms 동안 한 장도 안 오면 탭을 직접 찍는다. Playwright 는 Chromium 의 장면 걸기(Page.startScreencast) 실패를 삼켜
 * start 가 성공해도 장면이 안 올 수 있다 — 실제 폰 Chrome 시험 실행 17번 중 16번이 그랬다 (2026-11-05 운영 기록 · WEB-F9-11).
 * 장면이 오기 시작하면 멈춘다. ponytail: 찍는 동안 그 탭의 단계가 기다릴 수 있다 — 느려지면 폰 화면 통로(VISION)로 바꾼다
 */
function 찍어받친다(page: Page, 쓰개: 장면쓰개, 받았나: () => boolean, 틈: 받침틈): () => Promise<void> {
  let 멈춤 = false;
  let 깨우기 = () => {};
  const 쉬기 = (ms: number) => new Promise<void>((끝) => {
    const 타이머 = setTimeout(끝, ms);
    깨우기 = () => {
      clearTimeout(타이머);
      끝();
    };
  });
  const 그만 = (): boolean => 멈춤 || 받았나() || page.isClosed();
  const 돌기 = (async () => {
    await 쉬기(틈.첫장ms);
    if (그만()) return;
    console.warn(`[kit] 테스트 모드 장면이 ${String(틈.첫장ms)}ms 동안 한 장도 안 와 탭을 직접 찍는다`);
    let 알림 = false;
    while (!그만()) {
      try {
        // 커서를 감추려고 탭에 스타일을 넣지 않게 caret 을 그대로 둔다 — 케이스가 보는 화면을 건드리지 않는다
        const 장 = await page.screenshot({ type: 'jpeg', quality: 품질, scale: 'css', caret: 'initial', timeout: 5_000 });
        if (!그만()) 쓰개.받기(장);
      } catch (err) {
        // 탭이 넘어가는 중일 수 있다 — 한 번만 알리고 다음 장을 다시 찍어 본다
        if (!알림 && !그만()) console.warn(`[kit] 테스트 모드 장면을 못 찍었다: ${글(err)}`);
        알림 = true;
      }
      await 쉬기(틈.찍기ms);
    }
  })();
  page.once('close', () => {
    멈춤 = true;
    깨우기();
  });
  return async () => {
    멈춤 = true;
    깨우기();
    await Promise.race([돌기, new Promise((끝) => setTimeout(끝, 끄기기다림ms))]);
  };
}

// 러너가 장면 파일을 준 실행에만 건다. 못 걸어도 케이스는 그대로 돈다 — 장면은 보는 것일 뿐이다.
// 실제 폰 Chrome 정식 실행은 증거 영상도 같이 받는다 — screencast 는 탭마다 하나라 영상(path)과 장면(onFrame)을 한 호출에 준다 (러너 §5.2 「테스트 모드 — 실시간 장면」)
export async function 장면걸기(page: Page, 파일 = process.env.PLATFORM_LIVE_FILE, 영상?: string, 틈: 받침틈 = 기본받침틈): Promise<탭장면 | undefined> {
  if (!파일 && !영상) return undefined;
  const 쓰개 = 파일 ? 장면쓰개(파일) : undefined;
  let 받음 = false;
  let 걸림 = true;
  let 장면됨 = 쓰개 !== undefined;
  try {
    for (const 곳 of [파일, 영상]) if (곳) await mkdir(dirname(곳), { recursive: true });
    await page.screencast.start({
      ...(쓰개 !== undefined && {
        quality: 품질,
        onFrame: ({ data }: { data: Buffer }) => {
          받음 = true;
          쓰개.받기(data);
        },
      }),
      ...(영상 && { path: 영상 }),
    });
  } catch (err) {
    장면됨 = false;
    console.warn(`[kit] ${쓰개 === undefined ? '폰 화면 영상' : '테스트 모드 장면'}을 못 걸었다: ${글(err)}`);
    // 영상이 증적이다 — 장면과 같이 못 걸었으면 영상만 다시 건다. 장면은 아래 받쳐 찍기가 맡는다
    걸림 = Boolean(영상 && 쓰개 !== undefined && (await page.screencast.start({ path: 영상 }).then(() => true, (e: unknown) => (console.warn(`[kit] 폰 화면 영상을 못 걸었다: ${글(e)}`), false))));
    if (!걸림 && 쓰개 === undefined) return undefined;
  }
  const 받침멈추기 = 쓰개 === undefined ? undefined : 찍어받친다(page, 쓰개, () => 받음, 틈);
  // 누른 곳 표시는 시험 실행(러너가 늦추기 값을 준 실행)의 서버 러너 브라우저에만 건다 — 정식 실행은 화면만 찍고,
  // 실제 폰 Chrome(PLATFORM_CDP_URL)에서는 확인하지 않았다 (러너 §5.2 「테스트 모드 — 실시간 장면」)
  if (장면됨 && Number(process.env.PLATFORM_SLOW_MO) > 0 && !process.env.PLATFORM_CDP_URL) {
    await page.screencast.showActions().catch((err: unknown) => console.warn(`[kit] 누른 곳 표시를 못 걸었다: ${글(err)}`));
  }
  const 멈추기 = async (): Promise<void> => {
    await 받침멈추기?.();
    if (걸림 && !page.isClosed()) await page.screencast.stop().catch((err: unknown) => console.warn(`[kit] 테스트 모드 장면을 못 멈췄다: ${글(err)}`));
    걸림 = false;
  };
  return {
    멈추기,
    async 끄기() {
      await 멈추기();
      await 쓰개?.닫기();
    },
  };
}

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
      // 찍던 장은 끝까지 안 기다린다 — 매달린 Appium 명령 뒤에 줄 선 찍기가 단계 한도 실패를 더 늦추지 않게. 늦게 온 장은 멈춤을 보고 버린다
      await Promise.race([돌기, new Promise((끝) => setTimeout(끝, 끄기기다림ms))]);
      await 쓰개.닫기();
    },
  };
}
