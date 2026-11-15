import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 보이나 } from '@platform/kit/parts';

import { 글쓰기화면 } from '../pages/compose.page.js';

export function 화면글자포함(글자: string): string {
  return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 화면설명포함(글자: string): string {
  return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().descriptionContains(${JSON.stringify(글자)}))`;
}

export async function 글자나설명이뜰때까지(driver: AppDriver, 글자: string, 시간 = 10_000): Promise<boolean> {
  return 될때까지(driver, async () => (await 보이나(driver, 화면글자포함(글자))) || (await 보이나(driver, 화면설명포함(글자))), 시간);
}

export async function 글자나설명이보이나(driver: AppDriver, 글자: string): Promise<boolean> {
  return (await 보이나(driver, 화면글자포함(글자))) || (await 보이나(driver, 화면설명포함(글자)));
}

export async function 글자나설명누르기(driver: AppDriver, 글자: string): Promise<void> {
  await 글자나설명이뜰때까지(driver, 글자, 10_000);
  const 선택자 = (await 보이나(driver, 화면글자포함(글자))) ? 화면글자포함(글자) : 화면설명포함(글자);
  await driver.$(선택자).click();
}

export function 첫줄앞부분(글: string, 길이 = 16): string {
  return Array.from((글.split('\n')[0] ?? '').trim()).slice(0, 길이).join('');
}

export function 이름앞부분(이름: string, 길이: number): string {
  return Array.from(이름).slice(0, 길이).join('');
}

export function 글자수(글: string): number {
  return Array.from(글).length;
}

export async function 글쓰기닫기(driver: AppDriver): Promise<void> {
  const 글쓰기 = new 글쓰기화면(driver);
  if (!(await 뜰때까지(driver, 글쓰기.본문, 3_000))) return;
  await driver.$(글쓰기.닫기).click();
  if (await 뜰때까지(driver, 'id=android:id/button1', 3_000)) await driver.$('id=android:id/button1').click();
}

export async function 수가될때까지(driver: AppDriver, 읽기: () => Promise<number>, 목표: number, 시간 = 10_000): Promise<boolean> {
  return 될때까지(driver, async () => (await 읽기()) === 목표, 시간);
}
