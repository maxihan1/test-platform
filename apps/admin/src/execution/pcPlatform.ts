// 윈도우 PC 게임 디바이스 값 다섯의 화면 · 문서 표기 — 정본은 도메인/게임 §3.10 「윈도우 PC」 표

import type { PcPlatform } from '@platform/kit';

// 디바이스 이름 표 다섯 벌(화면 · 증적 · 엑셀 · 실행 저장)이 같은 말을 하게 여기 한 벌만 둔다
export const PC디바이스글: Record<PcPlatform, string> = {
  windows: 'Windows',
  'windows-ps5': 'Windows · PS5 패드',
  'windows-ps4': 'Windows · PS4 패드',
  'windows-switch': 'Windows · Switch 패드',
  'windows-xbox': 'Windows · Xbox 패드',
};
