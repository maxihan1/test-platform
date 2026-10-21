// 애플리케이션 종류마다 화면이 다르게 그리는 것 — 도메인/러너 §5.2 「애플리케이션 종류 「Android 앱」」 종류 표를 옮긴 상수 하나
// 화면 곳곳에서 종류를 따로 묻지 않고 이 표를 본다. 게임(GAME)은 여기에 줄 하나를 더한다
// ponytail: 성능 하위(페이지 성능 · 기기 성능) 칸은 없다 — 그 하위가 아직 없다. 만드는 PERF-F1-07 · 09 가 여기에 칸을 더한다

import type { 앱종류 } from './api.js';
import { t, type 언어 } from './i18n.js';
import type { 아이콘이름 } from './icons.js';

interface 종류줄 {
  /** 화면 이름 — 설정 칩 · 헤더 고르개 묶음 제목. 영어 표의 키다 */
  이름: string;
  /** 헤더 고른 칸의 접두사 앞 아이콘. 웹이 대부분이라 웹에는 달지 않는다(화면공통 §8 「껍데기」) */
  아이콘: 아이콘이름 | null;
  /** 케이스 목록의 디바이스 칩 줄. 앱은 고를 것이 하나다 */
  디바이스칩: boolean;
  /** 실행 창 「실행 위치 · 디바이스 팜」을 고른 케이스와 상관없이 늘 띄운다 */
  실행위치늘: boolean;
  /** 작성 새 요청의 「실제 화면과 대조」. 크롤러는 웹만 읽는다(서버도 400 BAD_ENV) */
  대조: boolean;
  /** 작성 새 요청에 「앱 화면 읽기」 안내를 띄운다 */
  앱화면읽기: boolean;
}

const 종류표: Record<앱종류, 종류줄> = {
  SCREEN: { 이름: '웹', 아이콘: null, 디바이스칩: true, 실행위치늘: false, 대조: true, 앱화면읽기: false },
  APP: { 이름: 'Android 앱', 아이콘: 'phone', 디바이스칩: false, 실행위치늘: true, 대조: false, 앱화면읽기: true },
  // API 는 작성 폼을 API 문서 통로가 따로 그린다(AuthoringNewApi) — 대조도 거기서 빠진다
  API: { 이름: 'API', 아이콘: 'api', 디바이스칩: true, 실행위치늘: false, 대조: false, 앱화면읽기: false },
};

/** 설정 칩 · 헤더 묶음의 차례 */
export const 종류차례: readonly 앱종류[] = ['SCREEN', 'APP', 'API'];

/** 옛 응답 · 검사 가짜 행은 종류를 안 담는다 — 서버 기본값과 같이 웹으로 읽는다 */
export const 종류 = (kind: 앱종류 | undefined): 종류줄 => 종류표[kind ?? 'SCREEN'];

/** 화면 이름 — 설정 칩 · 헤더 묶음 제목 · 고른 칸 아이콘의 읽어 주는 이름 */
export const 종류이름 = (kind: 앱종류 | undefined, 언어: 언어): string => t(종류(kind).이름, 언어);
