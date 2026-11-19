// 윈도우 PC 게임 항목의 앞뒤 — VISION 에 게임을 켜고 끄라고 부탁한다. Appium 연결은 열지 않는다 (공통/3-공유계약 「윈도우 PC 게임」 · 도메인/러너 §5.2 「윈도우 PC 게임 항목」)

import type { DeviceInfo } from '../types.js';
import { openGame, 팜원점, type KitGame } from './game.js';

type Env = Record<string, string | undefined>;

function PC자리(env: Env): { farm: { base: string; headers: Record<string, string> }; serial: string } {
  const serial = env.PLATFORM_DEVICE_UDID;
  const appium = env.PLATFORM_APPIUM_URL;
  // 내 컴퓨터 러너의 USB 길은 PC 에 없다 — 러너가 udid 없는 windows 항목을 400 으로 막지만 사람이 직접 돌릴 때를 위해 여기서도 던진다
  if (!serial || !appium) throw new Error('윈도우 PC 항목은 VISION 이 잡아 준 PC 번호(PLATFORM_DEVICE_UDID)와 VISION 주소(PLATFORM_APPIUM_URL)가 있어야 돈다');
  return { farm: 팜원점(appium, env.PLATFORM_APPIUM_TOKEN), serial };
}

/**
 * 앞 항목이 남긴 게임을 끄고(폰의 「끄고 켜기」와 같다) 켠 뒤 게임이 ping 에 답하고 패드를 정할 때까지 기다린다.
 * 기기 칸은 못 읽은 것을 지어내지 않는다 — 모델은 VISION 기기 이름, 앱 판은 비운다
 */
export async function PC를연다(env: Env): Promise<{ game: KitGame; device: DeviceInfo }> {
  const 게임이름 = env.PLATFORM_PC_GAME;
  if (!게임이름) throw new Error('윈도우 PC 항목인데 켤 게임 이름(PLATFORM_PC_GAME)이 없다');
  const { farm, serial } = PC자리(env);
  const { pcLaunch, pcStop } = await import('control-cli');
  await pcStop(farm, serial);
  await pcLaunch(farm, serial, 게임이름);
  try {
    const game = await openGame(env);
    return { game, device: { model: serial, osVersion: 'Windows', appVersion: null, appBuild: null } };
  } catch (err) {
    // 몸통이 못 돌았어도 켠 게임은 끈다 — 정리 단계는 연 것이 없으면 아무것도 안 한다
    await PC를끈다(env);
    throw err;
  }
}

/** 끄기 실패는 판정에 안 넣고 로그만 남긴다 — 놓을 때 VISION 이 끈다 */
export async function PC를끈다(env: Env): Promise<void> {
  try {
    const { farm, serial } = PC자리(env);
    const { pcStop } = await import('control-cli');
    await pcStop(farm, serial);
  } catch (err) {
    console.error(`[kit] PC 게임을 끄지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
