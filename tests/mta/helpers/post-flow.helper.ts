import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 알림화면 } from '../pages/notifications.page.js';
import { 글상세화면 } from '../pages/thread.page.js';
import { 글카드 } from '../pages/post-card.page.js';

import { 앱id } from './app.helper.js';
import { 홈으로 } from './nav.helper.js';

export async function 개인멘션글상세열기(driver: AppDriver, 사용자명: string): Promise<boolean> {
  const 알림 = new 알림화면(driver);
  const 글상세 = new 글상세화면(driver);
  if (!(await 알림.열기())) return false;
  await 알림.멘션탭누르기();
  if (!(await 뜰때까지(driver, 알림.개인라벨들, 15_000))) return false;
  const 개수 = (await driver.$$(알림.개인라벨들).getElements()).length;
  for (let 순서 = 0; 순서 < 개수; 순서 += 1) {
    const 라벨 = (await driver.$$(알림.개인라벨들).getElements())[순서];
    if (라벨 === undefined) break;
    await 라벨.click();
    if ((await 글상세.그려질때까지(15_000)) && (await 뜰때까지(driver, 글상세.전체글자포함(`@${사용자명}`), 5_000))) return true;
    await driver.back();
    await 뜰때까지(driver, 알림.개인라벨들, 10_000);
  }
  return false;
}

export async function 목록글을차례로열어보기(driver: AppDriver, 맞는가: () => Promise<boolean>, 쪽 = 3): Promise<boolean> {
  const 카드 = new 글카드(driver);
  const 글상세 = new 글상세화면(driver);
  for (let 한쪽 = 0; 한쪽 < 쪽; 한쪽 += 1) {
    const 개수 = (await driver.$$(카드.시간줄).getElements()).length;
    for (let 순서 = 0; 순서 < 개수; 순서 += 1) {
      const 줄 = (await driver.$$(카드.시간줄).getElements())[순서];
      if (줄 === undefined) break;
      await 줄.click();
      if ((await 글상세.그려질때까지(15_000)) && (await 맞는가())) return true;
      await driver.back();
      await 뜰때까지(driver, 카드.시간줄, 10_000);
    }
    await 카드.한쪽내리기();
  }
  return false;
}

export async function 내프로필열기(driver: AppDriver): Promise<boolean> {
  await 홈으로(driver);
  await driver.$(앱id('tab_profile')).click();
  return 뜰때까지(driver, 앱id('profile_action_btn'), 20_000);
}
