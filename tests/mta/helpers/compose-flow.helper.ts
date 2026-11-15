import type { AppDriver } from '@platform/kit/app';
import { 먼저뜨는것, 될때까지, 뜰때까지, 보이나, 스크롤해서찾기, 토스트글 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

import { 앱id, 목록안글자 } from './app.helper.js';
import { 글상세열기 } from './nav.helper.js';
import { 내글지우기, 내프로필에서글열기 } from './post.helper.js';

const 화면내용 = 'resourceId("android:id/content")';

export function 화면글정확(글자: string): string {
  return `android=new UiSelector().${화면내용}.childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
}

export function 화면글포함(글자: string): string {
  return `android=new UiSelector().${화면내용}.childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 화면글시작(글자: string): string {
  return `android=new UiSelector().${화면내용}.childSelector(new UiSelector().textStartsWith(${JSON.stringify(글자)}))`;
}

export function 화면이름포함(글자: string): string {
  return `android=new UiSelector().${화면내용}.childSelector(new UiSelector().descriptionContains(${JSON.stringify(글자)}))`;
}

export async function 문구가보이나(driver: AppDriver, 문구: string, 시간 = 10_000): Promise<boolean> {
  return 될때까지(
    driver,
    async () => {
      if (await 보이나(driver, 화면글포함(문구))) return true;
      if (await 보이나(driver, 화면이름포함(문구))) return true;
      if ((await 토스트글(driver, 앱id('snackbar_text'), 300)).includes(문구)) return true;
      return (await 토스트글(driver, '//android.widget.Toast', 300)).includes(문구);
    },
    시간,
  );
}

export async function 글자굴려찾기(driver: AppDriver, 글자: string): Promise<boolean> {
  if (await 보이나(driver, 화면글포함(글자))) return true;
  try {
    return await (await 스크롤해서찾기(driver, 글자)).isDisplayed();
  } catch {
    return false;
  }
}

export async function 인용글쓰기열기(driver: AppDriver, 사용자명: string, 글일부: string): Promise<void> {
  await 글상세열기(driver, 사용자명, 글일부);
  await driver.$(앱id('boost_btn')).click();
  const 인용하기 = 목록안글자('인용하기');
  await 뜰때까지(driver, 인용하기, 10_000);
  await driver.$(인용하기).click();
  const 뜬것 = await 먼저뜨는것(driver, { 본문: 앱id('toot_text'), 창: 'id=android:id/buttonPanel' }, 15_000);
  if (뜬것 === '창') {
    await driver.$('android=new UiSelector().resourceId("android:id/buttonPanel").childSelector(new UiSelector().text("무시"))').click();
    await 뜰때까지(driver, 앱id('toot_text'), 15_000);
  }
}

export async function 프로필첫글열기(driver: AppDriver): Promise<void> {
  const 첫글 = `android=new UiSelector().resourceId("${앱id('list').slice(3)}").childSelector(new UiSelector().resourceId("${앱id('text').slice(3)}").instance(0))`;
  await 뜰때까지(driver, 첫글, 20_000);
  await driver.$(첫글).click();
  await 뜰때까지(driver, 앱id('reply_btn_text'), 20_000);
}

export async function 내글수정열기(driver: AppDriver, 본문: string): Promise<void> {
  await 내프로필에서글열기(driver, 본문);
  await driver.$(앱id('more')).click();
  await new 뜨는메뉴(driver).고르기('수정');
  await 뜰때까지(driver, 앱id('toot_text'), 15_000);
}

export async function 내글모두지우기(driver: AppDriver, 본문: string): Promise<void> {
  for (let 남음 = 2; 남음 > 0; 남음 -= 1) {
    await 내글지우기(driver, 본문);
  }
}
