// 테스트 모드 장면 — 탭의 마지막 장면 한 장을 러너가 준 파일에 덮어 쓰고 누른 곳을 그린다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
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
      await rm(임시, { force: true });
      await rm(파일, { force: true });
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
