import type { CaseBodyArgs, GameDriver } from '@platform/kit';

import { 로그인화면 } from '../pages/login.page.js';
import { 메인메뉴로 } from './login.helper.js';

type 앱드라이버 = CaseBodyArgs<unknown, unknown>['driver'];

export const 게임패키지 = 'com.maxihan.bossroom';

export async function 와이파이(driver: 앱드라이버, 켬: boolean): Promise<void> {
  await driver.execute('mobile: setConnectivity', { wifi: 켬 });
}

export async function 게임다시켜기(driver: 앱드라이버, game: GameDriver): Promise<로그인화면> {
  if ((await game.find(로그인화면.게임시작)) === null) await 메인메뉴로(game);
  return 게임강제다시켜기(driver, game);
}

export async function 게임강제다시켜기(driver: 앱드라이버, game: GameDriver): Promise<로그인화면> {
  await driver.terminateApp(게임패키지);
  await driver.activateApp(게임패키지);
  await game.waitForValue(로그인화면.게임시작, 'Button.interactable', true, { timeoutMs: 120_000 });
  return 로그인화면.열기(game);
}
