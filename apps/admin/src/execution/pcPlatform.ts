// 윈도우 PC 게임 디바이스 값 다섯의 표기 · 실행 항목 거르기 — 정본은 도메인/게임 §3.10 「윈도우 PC」

import { PC_PLATFORM_LABEL, PC항목인가, type Platform } from '@platform/kit';

// 디바이스 이름 표 다섯 벌(화면 · 증적 · 엑셀 · 실행 저장)이 kit 과 같은 말을 하게 kit 의 표를 쓴다
export const PC디바이스글 = PC_PLATFORM_LABEL;

/**
 * 실행 항목에서 윈도우 PC 값을 뺀다 — 디바이스가 그것뿐인 케이스는 통째로 빠진다.
 * ponytail: admin 이 PC 를 잡고 게임을 깔아 싣는 길(진행판 GAME-F4-03)이 없는 동안의 막음이다. 안 빼면 windows 를 선언한 게임 케이스가
 * 정기 · 빌드 실행마다 engine · udid · app 없는 항목으로 러너에 가 400 으로 미실행이 쌓인다. GAME-F4-03 이 PC 줄을 만들면 이 함수를 지운다
 */
export function PC항목을뺀다<T extends { platforms: Platform[] }>(items: readonly T[]): T[] {
  return items.map((i) => ({ ...i, platforms: i.platforms.filter((p) => !PC항목인가(p)) })).filter((i) => i.platforms.length > 0);
}
