// 요구사항 추적표의 셈 — 요구 하나를 덮는 케이스에서 기능 · UI 건수 · 종류 · 기법 숫자 · 마지막 결과를 낸다 (도메인/작성 §3.6 「메뉴가 곧 요구사항 추적표다」)
// 「PRD 관리」 화면과 추적표 엑셀이 같이 쓴다 — 두 벌이면 화면과 엑셀 숫자가 갈린다

// kit 묶음 입구는 러너 쪽(Playwright)까지 다시 내보낸다 — 화면 번들이 이 파일을 부르므로 타입 파일에서 바로 가져온다
import { TECHNIQUES, type ItemStatus, type Platform, type Technique } from '@platform/kit/types';

/** 지도 ① 한 줄 — 번호 하나를 덮는 활성 케이스. platforms 는 케이스 판정에 쓴다 (도메인/작성 §7 GET /api/prd `cases`) */
export interface 덮는케이스 {
  tcId: string;
  axis: string;
  techniques: string[];
  platforms: Platform[];
}

/** 케이스 하나의 기기별 마지막 판정을 읽는다. 없으면 그 기기는 안 돌았다 */
export type 결과읽기 = (tcId: string, platform: Platform) => ItemStatus | undefined;

export interface 결과셈 {
  통과: number;
  실패: number;
  미실행: number;
}

export interface 추적 {
  /** 기능 · UI 케이스 번호 — 케이스 목록이 `#/cases/<fn·ui>/req/<번호>` 로 거르는 갈래와 같다 */
  기능: string[];
  UI: string[];
  /** 지도 ① 의 축마다 케이스 수. 한 케이스가 축 둘을 덮으면 양쪽에 센다 */
  종류: Record<'정상' | '경계' | '예외' | 'UI', number>;
  /** 기능 케이스의 기법마다 케이스 수 — TECHNIQUES 차례, 0 은 뺀다 */
  기법: [Technique, number][];
  /** 실행 보기 권한이 없으면 null */
  결과: 결과셈 | null;
}

/**
 * 케이스 하나의 마지막 판정 — 기기 한쪽만 깨져도 실패, 기기가 전부 통과여야 통과, 그 밖은 미실행.
 * 케이스 목록(web/catalogView.ts `마지막판정`)도 이것을 탄다
 */
export function 케이스판정(기기별: (ItemStatus | undefined)[]): ItemStatus {
  if (기기별.includes('FAIL')) return 'FAIL';
  if (기기별.length > 0 && 기기별.every((s) => s === 'PASS')) return 'PASS';
  return 'NA';
}

// catalog/rules.ts tcId종류 와 같은 뜻이다. 그 파일은 typescript 를 통째로 불러 화면이 부를 수 없다
const UI번호 = /-UI-\d{3}$/;

export function 추적하기(덮는: 덮는케이스[], 결과: 결과읽기 | null): 추적 {
  const 종류: 추적['종류'] = { 정상: 0, 경계: 0, 예외: 0, UI: 0 };
  for (const c of 덮는) if (c.axis in 종류) 종류[c.axis as keyof typeof 종류] += 1;

  // 지도 ① 은 (번호, 케이스, 축) 이 한 줄이라 같은 케이스가 축마다 다시 온다
  const 케이스 = [...new Map(덮는.map((c) => [c.tcId, c])).values()];
  const 기능 = 케이스.filter((c) => !UI번호.test(c.tcId));
  const 기법 = TECHNIQUES.map((t): [Technique, number] => [t, 기능.filter((c) => c.techniques.includes(t)).length]).filter(([, n]) => n > 0);

  let 셈: 결과셈 | null = null;
  if (결과 !== null) {
    셈 = { 통과: 0, 실패: 0, 미실행: 0 };
    for (const c of 케이스) {
      const 판정 = 케이스판정(c.platforms.map((p) => 결과(c.tcId, p)));
      if (판정 === 'PASS') 셈.통과 += 1;
      else if (판정 === 'FAIL') 셈.실패 += 1;
      else 셈.미실행 += 1;
    }
  }

  return {
    기능: 기능.map((c) => c.tcId),
    UI: 케이스.filter((c) => UI번호.test(c.tcId)).map((c) => c.tcId),
    종류,
    기법,
    결과: 셈,
  };
}

/** 요구 하나의 결과 — 하나라도 실패면 실패, 다 통과면 통과, 그 밖은 미실행. 덮는 케이스가 없으면(안 덮임) null */
export function 요구판정(셈: 결과셈): ItemStatus | null {
  if (셈.통과 + 셈.실패 + 셈.미실행 === 0) return null;
  if (셈.실패 > 0) return 'FAIL';
  return 셈.미실행 === 0 ? 'PASS' : 'NA';
}
