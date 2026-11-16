import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';

import { 서버, 앱id, 굴려서글자포함, 목록안글자 } from './app.helper.js';

export const 검색입력칸 = `android=new UiSelector().resourceId("${앱id('toolbar').slice(3)}").childSelector(new UiSelector().className("android.widget.EditText"))`;
export const URL열기줄 = 목록안글자('마스토돈에서 URL 열기');

export async function 홈으로(driver: AppDriver): Promise<void> {
  for (let 남음 = 5; 남음 > 0; 남음 -= 1) {
    if (await 뜰때까지(driver, 앱id('tab_home'), 2_000)) break;
    await driver.back();
  }
  await driver.$(앱id('tab_home')).click();
  await 뜰때까지(driver, 앱id('fab'));
}

export async function 검색화면열기(driver: AppDriver): Promise<void> {
  await driver.$(앱id('tab_search')).click();
  await 뜰때까지(driver, 앱id('search_text'));
  await driver.$(앱id('search_text')).click();
  await 뜰때까지(driver, 검색입력칸);
}

export async function 검색어적기(driver: AppDriver, 글: string): Promise<void> {
  await 칸에적기(await driver.$(검색입력칸).getElement(), 글);
}

export async function 주소열기(driver: AppDriver, 주소: string): Promise<void> {
  await 검색화면열기(driver);
  await 검색어적기(driver, 주소);
  await 뜰때까지(driver, URL열기줄, 15_000);
  await driver.$(URL열기줄).click();
}

export function 검색해시태그줄(태그: string): string {
  return `android=new UiSelector().resourceId("${앱id('list').slice(3)}").childSelector(new UiSelector().resourceId("${앱id('title').slice(3)}").text(${JSON.stringify(태그)}))`;
}

export async function 해시태그열기(driver: AppDriver, 태그: string): Promise<boolean> {
  await 검색화면열기(driver);
  await 검색어적기(driver, `#${태그}`);
  if (!(await 뜰때까지(driver, 검색해시태그줄(태그), 15_000))) return false;
  await driver.$(검색해시태그줄(태그)).click();
  return 뜰때까지(driver, 앱id('profile_action_btn'), 20_000);
}

export async function 프로필열기(driver: AppDriver, 사용자명: string): Promise<void> {
  await 주소열기(driver, `https://${서버}/@${사용자명}`);
  await 뜰때까지(driver, 앱id('profile_action_btn'), 20_000);
}

export async function 프로필에서글열기(driver: AppDriver, 글자: string): Promise<void> {
  const 글 = 굴려서글자포함(글자);
  await driver.$(글).click();
  await 뜰때까지(driver, 앱id('reply_btn_text'), 20_000);
}

export async function 글상세열기(driver: AppDriver, 사용자명: string, 글자: string): Promise<void> {
  await 프로필열기(driver, 사용자명);
  await 프로필에서글열기(driver, 글자);
}
