// 윈도우 PC 게임 디바이스 값 다섯의 표기 — 정본은 도메인/게임 §3.10 「윈도우 PC」

// 화면(RunListRow)도 읽어서 맨 앞 입구(runtime · Playwright 까지 내보낸다)가 아니라 types 에서 읽는다 — 안 그러면 vite build 가 깨진다
import { PC_PLATFORM_LABEL } from '@platform/kit/types';

// 디바이스 이름 표 다섯 벌(화면 · 증적 · 엑셀 · 실행 저장)이 kit 과 같은 말을 하게 kit 의 표를 쓴다
export const PC디바이스글 = PC_PLATFORM_LABEL;
