import { 메뉴 } from '../components/menu.component.js';
import { 글카드 } from '../components/status-card.component.js';

import { 앱id, 뜰때까지, type 앱 } from './app.helper.js';

export type 공개범위 = '공개' | '제한적 공개' | '팔로워' | '개인 멘션';

export function 테스트글(꼬리: string): string {
  return `[MTA 자동] ${꼬리} ${Date.now()}`;
}

export async function 글쓰기열기(driver: 앱): Promise<void> {
  await driver.$(앱id('fab')).click();
  await driver.$(앱id('toot_text')).waitForDisplayed({ timeout: 15_000 });
}

export async function 글올리기(driver: 앱, 본문: string): Promise<void> {
  await 글쓰기열기(driver);
  await driver.$(앱id('toot_text')).setValue(본문);
  await driver.$(앱id('publish')).click();
  if (!(await 뜰때까지(driver, 앱id('fab'), 30_000))) throw new Error('글을 올린 뒤 30초 안에 홈으로 돌아오지 않았다');
}

export async function 내글지우기(driver: 앱, 본문조각: string): Promise<void> {
  await driver.$(앱id('tab_profile')).click();
  await driver.$(앱id('profile_action_btn')).waitForDisplayed({ timeout: 20_000 });
  await new 글카드(driver).누르기(본문조각, 'more');
  await new 메뉴(driver).고르기('삭제');
  const 확인 = await driver.$('id=android:id/button1');
  if (await 확인.waitForDisplayed({ timeout: 5_000 }).then(() => true, () => false)) await 확인.click();
}
