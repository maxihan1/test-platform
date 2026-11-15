import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';

export const 꾸러미 = 'org.joinmastodon.android';
export const 서버 = 'mastodon.maxihan.com';

export function 앱id(이름: string): string {
  return `id=${꾸러미}:id/${이름}`;
}

export function 목록안글자(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
}

export function 목록안글자포함(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 굴려서글자포함(글자: string, 목록 = 'list'): string {
  return `android=new UiScrollable(new UiSelector().resourceId("${꾸러미}:id/${목록}")).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 사용자명(아이디: string): string {
  return 아이디.split('@')[0] ?? 아이디;
}

export function 계정줄(아이디: string): string {
  return `@${사용자명(아이디)}@${서버}`;
}

export async function 누르기(driver: AppDriver, 선택자: string, 시간 = 15_000): Promise<void> {
  if (!(await 뜰때까지(driver, 선택자, 시간))) throw new Error(`「${선택자}」가 ${String(시간)}ms 안에 안 보인다`);
  await driver.$(선택자).click();
}

export async function 글읽기(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<string> {
  if (!(await 뜰때까지(driver, 선택자, 시간))) return '';
  return driver.$(선택자).getText();
}

export async function 있나(driver: AppDriver, 선택자: string): Promise<boolean> {
  return 보이나(driver, 선택자);
}
