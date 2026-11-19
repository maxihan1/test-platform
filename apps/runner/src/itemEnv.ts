// 실행 항목 하나가 자식 프로세스에 넘기는 환경값 중 디바이스 · 게임에 따라 갈리는 것 (도메인/러너 §5.2)

import { PC항목인가, type ExecuteRequest } from '@platform/kit';

// trace 는 정식 실행에서만 켠다. 테스트 실행(runId 0)은 기록이 없고, 앱 · 윈도우 PC 실행은 브라우저가 없다 (SPEC 도메인/실행 §3.2 「trace」)
export function traceEnv(req: Pick<ExecuteRequest, 'runId' | 'platform'>): '0' | '1' {
  return req.runId > 0 && req.platform !== 'android' && !PC항목인가(req.platform) ? '1' : '0';
}

// 폰 · VISION 기기에 붙는 항목 — 팜 토큰 · 기기 번호를 받는다. 윈도우 PC 는 VISION 기기지만 Appium 을 안 쓴다 (도메인/러너 §5.2 「윈도우 PC 게임 항목」)
export const 기기항목인가 = (platform: ExecuteRequest['platform']): boolean => platform === 'android' || PC항목인가(platform);

export function gameEnv(req: Pick<ExecuteRequest, 'platform' | 'engine' | 'udid' | 'adminKey' | 'app' | 'gamePopups'>): Record<string, string> {
  const 게임 = 기기항목인가(req.platform) && req.engine === 'GAME';
  const pc = PC항목인가(req.platform);
  return {
    PLATFORM_ENGINE: 게임 ? 'GAME' : '',
    PLATFORM_GAME_LINK: 게임 ? (req.udid === undefined ? 'usb' : 'farm') : '',
    PLATFORM_ADMIN_KEY: req.adminKey === undefined ? '' : JSON.stringify(req.adminKey),
    // 게임 항목만 — 게임 드라이버가 막힌 동작에서 이 창들을 닫고 한 번 더 한다. 늘 적어 셸의 값을 물려받지 않게 (도메인/게임 §3.10 결정 31)
    PLATFORM_GAME_POPUPS: 게임 && req.gamePopups !== undefined && req.gamePopups.length > 0 ? JSON.stringify(req.gamePopups) : '',
    // 둘 다 늘 적는다 — 러너를 켠 셸의 값을 자식이 물려받아 폰 항목이 PC 길을 타지 않게. 패드 없음은 빈 값이다 (공통/3-공유계약 「윈도우 PC 게임」)
    PLATFORM_PC_GAME: pc ? (req.app ?? '') : '',
    PLATFORM_PAD: pc && req.platform !== 'windows' ? req.platform.slice('windows-'.length) : '',
  };
}
