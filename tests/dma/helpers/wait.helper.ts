import { 토스트 } from '../components/toast.component.js';
import type { 앱, 요소 } from './app.helper.js';

export async function 토스트글읽기(driver: 앱): Promise<string> {
  const 상자 = new 토스트(driver);
  await 상자.뜰때까지().catch(() => undefined);
  return (await 상자.보이나()) ? 상자.글() : '';
}

export async function 토스트비우기(driver: 앱): Promise<void> {
  const 상자 = new 토스트(driver);
  if (await 상자.보이나()) await 상자.사라질때까지();
}

export async function 될때까지기다려보기(driver: 앱, 조건: () => Promise<boolean>, timeout = 10000): Promise<void> {
  await driver.waitUntil(조건, { timeout, interval: 300 }).catch(() => undefined);
}

export async function 보이는글(칸: 요소): Promise<string> {
  return (await 칸.isDisplayed()) ? 칸.getText() : '';
}
