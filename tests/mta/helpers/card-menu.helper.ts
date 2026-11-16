import type { AppDriver } from '@platform/kit/app';

import { 글자들 } from '@platform/kit/parts';

import { 글카드 } from '../pages/post-card.page.js';

import { 앱id } from './app.helper.js';

export const 뮤트메뉴항목 = 'android=new UiSelector().className("android.widget.TextView").textMatches(".+ 뮤트")';

export async function 카드더보기열기(driver: AppDriver, 사용자명: string, 쪽수 = 5): Promise<boolean> {
  const 카드 = new 글카드(driver);
  for (let 쪽 = 0; 쪽 < 쪽수; 쪽 += 1) {
    const 줄들 = await 글자들(driver, 앱id('time_and_username'));
    const 순서 = 줄들.findIndex((줄) => 줄.includes(`@${사용자명}`));
    if (순서 >= 0) {
      const 버튼 = (await driver.$$(카드.더보기).getElements())[순서];
      if (버튼 !== undefined) {
        await 버튼.click();
        return true;
      }
    }
    await 카드.한쪽내리기();
  }
  return false;
}
