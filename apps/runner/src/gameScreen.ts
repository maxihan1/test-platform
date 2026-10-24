// 폰에 게임을 한 번 띄워 게임 SDK 가 주는 첫 화면 트리를 줄여 돌려준다 (SPEC 도메인/러너 §5.2 「게임 화면 읽기」 · 도메인/게임 §7 「게임 첫 화면」)

import { openGame } from '@platform/kit/game';

import { type 앱화면요청, 앱을켜서읽는다 } from './appScreen.js';

/**
 * 설치 · 실행은 앱 화면 읽기처럼 Appium 이 하고, 화면은 게임 포트에서 읽는다 — Unity 화면은 Appium 에게 빈 판 하나로만 보인다.
 * 폰 번호를 받았으면 디바이스 팜이 잡아 준 폰이라 팜의 게임 명령 주소로, 없으면 이 컴퓨터에 USB 로 꽂힌 폰으로 닿는다.
 * 줄인 꼴은 control-cli snapshot 그대로다 — AI 가 이어서 CLI 로 읽는 화면과 같은 글이라야 주소를 바로 이어 쓴다
 */
export async function 게임화면을읽는다(req: 앱화면요청, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  // 게임 케이스와 같은 연결 설정이다 — 기본 60초면 게임이 뜨기를 기다리는 동안(Appium 명령이 없다) 연결이 끊긴다
  return 앱을켜서읽는다(
    req,
    env,
    { PLATFORM_ENGINE: 'GAME' },
    async () => {
      const game = await openGame({
        ...env,
        PLATFORM_DEVICE_UDID: req.udid ?? env.PLATFORM_DEVICE_UDID,
        PLATFORM_GAME_LINK: req.udid === undefined ? 'usb' : 'farm',
      });
      const { snapshot } = await import('control-cli');
      return snapshot(await game.tree()).text;
    },
    // noReset 이면 Appium 이 같은 패키지가 깔린 폰에 넘긴 APK 를 깔지 않는다 — 판을 견주지 않는다. 폰에 남은 옛 판(SDK 없음)이 켜져
    // 게임 포트가 120초 내내 연결을 거부했다(2026-10-24 GAME-F1-14 · 팜 세션 14287f6f). noReset 만 끄면 깔린 판이 같거나 높을 때 또 안 깐다
    // (2026-10-25 팜 실측 「0.1.39 >= 0.1.39 — no need to install」). 화면 읽기는 연결 하나뿐이라 늘 넘긴 APK 를 다시 깐다
    { 'appium:noReset': false, 'appium:enforceAppInstall': true },
  );
}
