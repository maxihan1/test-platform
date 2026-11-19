// 윈도우 PC 게임 디바이스 값 다섯의 표기 — 정본은 도메인/게임 §3.10 「윈도우 PC」

// 화면(ui.tsx)도 이 파일을 읽는다 — kit 전체를 부르면 브라우저 묶음에 Playwright 가 끌려 들어와 vite build 가 멈춘다
import { PC_PLATFORM_LABEL } from '@platform/kit/types';

// 디바이스 이름 표 다섯 벌(화면 · 증적 · 엑셀 · 실행 저장)이 kit 과 같은 말을 하게 kit 의 표를 쓴다
export const PC디바이스글 = PC_PLATFORM_LABEL;

