// E2E 실행의 장면 자리 하나 — 웹 단계는 그 탭에, 앱 · 게임 단계는 폰(Appium)에 장면을 걸고 단계가 바뀌면 앞 것을 끈다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)

import { 장면걸기, 폰장면걸기, type 장면, type 폰찍개 } from '@platform/kit/scenario';
import type { Page } from '@playwright/test';

export function 장면자리() {
  // 실제 폰 Chrome 첫 탭 — 창을 열 때 증거 영상과 장면을 한 호출로 이미 걸었다(realPhone.ts 폰창을연다). screencast 는 탭마다 하나라 다시 안 건다
  let 건탭: Page | undefined;
  let 탭: Page | undefined;
  let 지금: 장면 | undefined;
  let 폰중 = false;
  const 끄기 = async (): Promise<void> => {
    const 앞 = 지금;
    지금 = undefined;
    탭 = undefined;
    폰중 = false;
    await 앞?.끄기();
  };
  return {
    끄기,
    이미건탭(p: Page): void {
      건탭 = p;
    },
    // 탭이 바뀌면 새 탭에 다시 건다
    async 탭에(새탭: Page): Promise<void> {
      if (탭 === 새탭) return;
      await 끄기();
      if (새탭 === 건탭) return;
      지금 = await 장면걸기(새탭);
      탭 = 새탭;
    },
    // 거는 사이 단계가 닫혔으면(한도에 걸려 끊김) 건 것을 바로 끈다 — 아무도 안 끄는 찍기가 시나리오 끝까지 남지 않게.
    // 정식 실행도 찍는다 — Appium 찍기가 그 단계 명령을 잠깐 세우지만 2026-11-11 사용자가 정식 실행에도 폰 화면을 보이게 했다 (SPEC 도메인/실행 §3.2)
    async 폰에(driver: 폰찍개, 닫혔나: () => boolean): Promise<void> {
      if (폰중 || 닫혔나()) return;
      폰중 = true;
      const 건 = await 폰장면걸기(driver);
      if (!폰중 || 닫혔나()) {
        await 건?.끄기();
        return;
      }
      지금 = 건;
    },
  };
}
