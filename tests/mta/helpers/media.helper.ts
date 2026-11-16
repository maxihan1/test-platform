import type { AppDriver } from '@platform/kit/app';
import { 길게누르기, 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 앱id } from './app.helper.js';

export const 파일선택기목록 = 'id=com.google.android.documentsui:id/dir_list';
export const 첨부조각들 = 앱id('thumb');

export function 선택기파일(이름: string): string {
  return `android=new UiSelector().resourceId("com.google.android.documentsui:id/dir_list").childSelector(new UiSelector().text(${JSON.stringify(이름)}))`;
}

export function 조각순서(이름: 'thumb' | 'title' | 'subtitle' | 'edit' | 'delete', 순서 = 0): string {
  return `android=new UiSelector().resourceId("${앱id('attachments').slice(3)}").childSelector(new UiSelector().resourceId("${앱id(이름).slice(3)}").instance(${String(순서)}))`;
}

export async function 파일선택기열기(driver: AppDriver, 시간 = 15_000): Promise<boolean> {
  await 길게누르기(driver, 앱id('btn_media'));
  return 뜰때까지(driver, 파일선택기목록, 시간);
}

export async function 파일선택기로첨부(driver: AppDriver, 이름: string): Promise<boolean> {
  if (!(await 파일선택기열기(driver))) return false;
  if (!(await 뜰때까지(driver, 선택기파일(이름), 15_000))) return false;
  await driver.$(선택기파일(이름)).click();
  return 사라질때까지(driver, 파일선택기목록, 15_000);
}

export async function 첨부조각수(driver: AppDriver): Promise<number> {
  return (await driver.$$(첨부조각들).getElements()).length;
}

export async function 키보드내리기(driver: AppDriver): Promise<void> {
  if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}
