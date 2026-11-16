import type { AppDriver } from '@platform/kit/app';

import { 글카드 } from '../pages/post-card.page.js';

export async function 본문아래재생버튼누르기(driver: AppDriver, 본문: string, 쪽 = 3): Promise<boolean> {
  const 카드 = new 글카드(driver);
  for (let 한쪽 = 0; 한쪽 < 쪽; 한쪽 += 1) {
    const 본문자리 = (await driver.$(카드.굴려서글자포함(본문)).getLocation()).y;
    let 가장가까운: { y: number; 누르기: () => Promise<void> } | undefined;
    for (const 버튼 of await driver.$$(카드.오디오재생버튼들).getElements()) {
      const y = (await 버튼.getLocation()).y;
      if (y > 본문자리 && (가장가까운 === undefined || y < 가장가까운.y)) 가장가까운 = { y, 누르기: () => 버튼.click() };
    }
    if (가장가까운 !== undefined) {
      await 가장가까운.누르기();
      return true;
    }
    await 카드.한쪽내리기();
  }
  return false;
}
