// 케이스 목록 화면이 쓰는 판단 (SPEC §8.1). 화면 조각은 CaseList.tsx, 판단은 여기
// 이름이 CaseList.ts 가 아닌 이유 — macOS 에서 대소문자만 다르면 같은 파일로 친다. 검색 조건 넷 중 화면이 거르는 것은 하나뿐이다
//
// | # | 조건 | 거르는 곳 |
// |---|------|----------|
// | 1 | 글자 | 서버 (`?q=`) |
// | 3 | 디바이스 | 서버 (`?platform=`) |
// | 4 | 활성 여부 | 서버 (`?active=`) |
// | 5 | 마지막 결과 | **화면** — 실행할 때마다 바뀌는 값이라 카탈로그가 알지 못한다 |
//
// 2번(기능 영역)은 2026-09-17 에 조건에서 빠졌다. 목록이 한 서비스로 좁혀지면
// 그 안의 접두사는 전부 같아 거를 것이 없다 (§8)

import type { CaseRow, ItemStatus, LastResult, Platform } from './api.js';
import { t, type 언어 } from './i18n.js';

export type LastMap = Record<string, LastResult | undefined>;

export const keyOf = (tcId: string, platform: Platform): string => `${tcId}:${platform}`;

/**
 * 케이스 한 줄의 마지막 결과.
 *
 * 디바이스가 둘인 케이스에서 **한쪽만 깨져도 실패**로 본다 —
 * 목록을 훑는 사람이 「이건 괜찮다」고 넘기면 안 된다.
 * 한 번도 안 돌린 것은 미실행이다.
 */
export function 마지막판정(row: CaseRow, last: LastMap): ItemStatus {
  const 것들 = row.platforms.map((platform) => last[keyOf(row.tcId, platform)]?.status);
  if (것들.includes('FAIL')) return 'FAIL';
  if (것들.length > 0 && 것들.every((status) => status === 'PASS')) return 'PASS';
  return 'NA';
}

/** 집계 띠가 받는 네 숫자 */
export interface 판정셈 {
  전체: number;
  통과: number;
  실패: number;
  미실행: number;
}

/**
 * 목록을 열자마자 「지금 이 서비스가 어떤 상태인가」를 말하는 네 숫자.
 *
 * **마지막 결과 배지 하나만 있을 때는 실패가 어제부터인지 2주 전부터인지 알 수 없었다.**
 * 세는 규칙은 `마지막판정` 그대로다 — 디바이스 한쪽만 깨져도 실패다.
 * 세는 일을 기계에 맡긴다. 화면이 손으로 세면 조건이 바뀔 때 조용히 틀려진다.
 */
export function 판정개수(rows: CaseRow[], last: LastMap): 판정셈 {
  const 셈: 판정셈 = { 전체: rows.length, 통과: 0, 실패: 0, 미실행: 0 };
  for (const row of rows) {
    const 판정 = 마지막판정(row, last);
    if (판정 === 'PASS') 셈.통과 += 1;
    else if (판정 === 'FAIL') 셈.실패 += 1;
    else 셈.미실행 += 1;
  }
  return 셈;
}

/**
 * 마지막 결과 칩 (SPEC §8.1 조건 5).
 *
 * **이것만 화면이 거른다.** 나머지 셋은 케이스의 속성이라 서버가 건다 —
 * 이 값은 실행할 때마다 바뀌어서 카탈로그가 알 수 없다 (§3.1 컨텍스트 경계).
 */
export function 마지막결과로거른다(rows: CaseRow[], last: LastMap, 칩: ItemStatus | 'ALL'): CaseRow[] {
  if (칩 === 'ALL') return rows;
  return rows.filter((row) => 마지막판정(row, last) === 칩);
}

export interface 빈화면 {
  무엇: string;
  왜: string;
  버튼: string;
}

/**
 * 목록이 비었을 때 세 갈래 (SPEC §8.1).
 *
 * 하나로 뭉뚱그리면 **검색한 적 없는 사람에게도 「찾는 케이스가 없습니다」라고 말한다.**
 * 이 화면은 이 도구를 처음 켠 사람이 만나는 자리다 — 여기서 막히면 도구가 고장난 것처럼 보인다.
 *
 * 세 갈래를 가르는 값은 응답에 이미 있다. 새 API 가 필요하지 않다.
 */
export function 빈이유(
  형편: {
    scannedAt: string | null;
    전체건수: number;
    건조건: boolean;
    친글자: string;
  },
  언어: 언어,
): 빈화면 {
  if (형편.scannedAt === null) {
    return {
      무엇: t('아직 케이스를 불러오지 않았습니다', 언어),
      왜: t(
        '테스트 코드를 훑어 실행할 수 있는 케이스 목록을 만듭니다. 코드가 진실의 원천이라 목록은 그때마다 새로 만들어집니다',
        언어,
      ),
      버튼: t('케이스 불러오기', 언어),
    };
  }

  if (형편.건조건) {
    return {
      // 친 글자는 사람이 넣은 것이라 번역하지 않는다. 낫표는 따옴표와 달리 검사기의 글자 훑기를 가르지 않는다
      무엇:
        형편.친글자 === ''
          ? t('조건에 맞는 케이스가 없습니다', 언어)
          : t('「{친글자}」에 맞는 케이스가 없습니다', 언어, { 친글자: 형편.친글자 }),
      왜: t('거른 조건을 지우면 전체가 다시 보입니다', 언어),
      버튼: t('조건 초기화', 언어),
    };
  }

  return {
    무엇: t('불러왔지만 케이스가 하나도 없습니다', 언어),
    // 「하나도 없다」만 말하고 왜인지 안 말하면 사람이 할 수 있는 일이 없다 (SPEC §8.1).
    // 사유(중복 tcId·규칙 위반)는 화면 위 스캔 결과 줄이 이미 보여준다
    왜: t('테스트 폴더가 비었거나 규칙에 걸려 읽지 못한 파일이 있습니다. 사유는 위 스캔 결과에 있습니다', 언어),
    버튼: t('다시 스캔', 언어),
  };
}
