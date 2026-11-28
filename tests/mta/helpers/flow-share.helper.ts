import type { AppDriver } from '@platform/kit/app';
import { 될때까지 } from '@platform/kit/parts';

import { 글카드 } from '../components/status-card.component.js';
import { 홈화면 } from '../pages/home.page.js';
import type { 글 } from './api.helper.js';
import { 꾸러미 } from './app.helper.js';
import { 글에서버튼누르기, 글열기 } from './flow-compose.helper.js';
import { 화면글자포함있나 } from './flow-status.helper.js';
import { 공유시트떴나 } from './system-ui.helper.js';

export async function 앱이닫힐때까지(driver: AppDriver, 시간 = 15_000): Promise<boolean> {
  return 될때까지(driver, async () => (await driver.getCurrentPackage()) !== 꾸러미, 시간);
}

export async function 글공유시트열기(driver: AppDriver, 대상: 글): Promise<void> {
  await 글열기(driver, 대상);
  await 글에서버튼누르기(driver, 대상, '공유');
  if (!(await 공유시트떴나(driver))) throw new Error('글 「공유」 시트가 안 떴다');
}

export async function 홈에서줄까지내리기(driver: AppDriver, 글자: string, 번 = 14): Promise<boolean> {
  const 홈 = new 홈화면(driver);
  for (let i = 0; i <= 번; i++) {
    if (await 화면글자포함있나(driver, 글자, 2_000)) return true;
    if (i < 번) await 홈.아래로내리기(1);
  }
  return false;
}

export async function 홈에서글보일때까지(driver: AppDriver, 글자: string, 번 = 10): Promise<boolean> {
  const 카드 = new 글카드(driver);
  const 홈 = new 홈화면(driver);
  for (let i = 0; i <= 번; i++) {
    if (await 카드.보이나(글자)) return true;
    if (i < 번) await 홈.아래로내리기(1);
  }
  return false;
}
