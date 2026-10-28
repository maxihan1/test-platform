// 폰 연결 하나를 연다 — 앱을 Appium 으로 깔고 켜고, 게임이면 게임 SDK 에도 붙는다. 단독 항목 fixture 와 E2E 시나리오가 같이 쓴다

import type { DeviceInfo } from '../types.js';

import { closeApp, openApp, readDevice, type AppDriver } from './app.js';
import { isGame, openGame, type KitGame } from './game.js';

/**
 * 앱을 깔고 켜고(Appium) 게임이면 게임 SDK 에도 붙는다. 단독 항목 fixture 와 E2E 시나리오의 폰 연결이 같이 쓴다 (도메인/시나리오 §3.7 결정 16).
 * 판을 못 읽어도 연결은 그대로 쓴다. 게임에 못 붙으면 연 연결을 아무도 모르니 여기서 닫는다 — 못 닫아도 러너가 번호 파일로 닫는다
 */
export async function 폰을연다(env: Record<string, string | undefined>): Promise<{ driver: AppDriver; game?: KitGame; device?: DeviceInfo }> {
  const driver = await openApp(env);
  let device: DeviceInfo | undefined;
  try {
    device = await readDevice(driver);
  } catch (err) {
    console.error(`[kit] 기기 정보를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!isGame(env)) return { driver, ...(device && { device }) };
  try {
    return { driver, game: await openGame(env), ...(device && { device }) };
  } catch (err) {
    await closeApp(driver).catch((e: unknown) => console.error(`[kit] Appium 연결을 닫지 못했다: ${e instanceof Error ? e.message : String(e)}`));
    throw err;
  }
}
