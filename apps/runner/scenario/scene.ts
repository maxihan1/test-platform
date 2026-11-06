// E2E 실행의 장면 자리 하나 — 웹 단계는 그 탭에, 앱 · 게임 단계는 폰(Appium)에 장면을 걸고 단계가 바뀌면 앞 것을 끈다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)

import { 장면걸기, 폰장면걸기, type 장면, type 폰찍개 } from '@platform/kit/scenario';
import type { Page } from '@playwright/test';

export function 장면자리() {
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
    // 탭이 바뀌면 새 탭에 다시 건다
    async 탭에(새탭: Page): Promise<void> {
      if (탭 === 새탭) return;
      await 끄기();
      지금 = await 장면걸기(새탭);
      탭 = 새탭;
    },
    // 거는 사이 단계가 닫혔으면(한도에 걸려 끊김) 건 것을 바로 끈다 — 아무도 안 끄는 찍기가 시나리오 끝까지 남지 않게.
    // 폰은 시험 실행(늦추기 값이 온 실행)만 찍는다 — Appium 찍기는 그 단계 명령을 세워 정식 실행을 늦춘다. 정식 실행 화면에는 VISION 링크가 대신 선다
    async 폰에(driver: 폰찍개, 닫혔나: () => boolean): Promise<void> {
      if (폰중 || 닫혔나() || !(Number(process.env.PLATFORM_SLOW_MO) > 0)) return;
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
