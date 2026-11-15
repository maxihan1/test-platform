import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';

import { 앱id, 굴려서글자포함 } from './app.helper.js';
import { 홈으로 } from './nav.helper.js';

const 메뉴항목 = (글자: string): string => `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;

export function 표시글(머리: string): string {
  return `${머리} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function 내글쓰기(driver: AppDriver, 본문: string): Promise<void> {
  await 홈으로(driver);
  await driver.$(앱id('fab')).click();
  await 뜰때까지(driver, 앱id('toot_text'));
  await 칸에적기(await driver.$(앱id('toot_text')).getElement(), 본문);
  await 뜰때까지(driver, `android=new UiSelector().resourceId("${앱id('publish').slice(3)}").enabled(true)`, 10_000);
  await driver.$(앱id('publish')).click();
  await 뜰때까지(driver, 앱id('fab'), 30_000);
}

export async function 내프로필에서글열기(driver: AppDriver, 본문: string): Promise<void> {
  await 홈으로(driver);
  await driver.$(앱id('tab_profile')).click();
  await 뜰때까지(driver, 앱id('profile_action_btn'), 20_000);
  await driver.$(굴려서글자포함(본문)).click();
  await 뜰때까지(driver, 앱id('reply_btn_text'), 20_000);
}

export async function 글상세에서지우기(driver: AppDriver): Promise<void> {
  await driver.$(앱id('more')).click();
  await 뜰때까지(driver, 메뉴항목('삭제'));
  await driver.$(메뉴항목('삭제')).click();
  if (await 뜰때까지(driver, 'id=android:id/button1', 5_000)) await driver.$('id=android:id/button1').click();
}

export async function 내글지우기(driver: AppDriver, 본문: string): Promise<void> {
  try {
    await 내프로필에서글열기(driver, 본문);
  } catch {
    return;
  }
  await 글상세에서지우기(driver);
  await 뜰때까지(driver, 앱id('profile_action_btn'), 20_000);
}
