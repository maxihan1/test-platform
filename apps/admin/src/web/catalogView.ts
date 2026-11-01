// 케이스 목록 화면이 쓰는 판단 (SPEC §8.1). 화면 조각은 CaseList.tsx, 판단은 여기
// 이름이 CaseList.ts 가 아닌 이유 — macOS 에서 대소문자만 다르면 같은 파일로 친다.
// 검색 조건은 전부 서버가 거른다 — 마지막 결과도 2026-10-19 ⑫ 부터다(도메인/카탈로그 §7 `?last=`). 앞 판은 그것만 화면이 받은 쪽 안에서 걸러 2쪽의 실패가 안 보였다

import { 케이스판정 } from '../prd/trace.js';
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
  return 케이스판정(row.platforms.map((platform) => last[keyOf(row.tcId, platform)]?.status));
}

export interface 빈화면 {
  무엇: string;
  왜: string;
  버튼: string;
}

/**
 * 목록이 비었을 때 네 갈래 (SPEC §8.1).
 *
 * 하나로 뭉뚱그리면 **검색한 적 없는 사람에게도 「찾는 케이스가 없습니다」라고 말한다.**
 * 이 화면은 이 도구를 처음 켠 사람이 만나는 자리다 — 여기서 막히면 도구가 고장난 것처럼 보인다.
 *
 * 갈래를 가르는 값은 응답에 이미 있다(스캔 결과는 `?service=` 로 받는다). 새 API 가 필요하지 않다.
 */
export function 빈이유(
  형편: {
    scannedAt: string | null;
    /** 지금 보는 서비스의 스캔에 겹친 번호 · 읽지 못한 파일이 있나 */
    스캔문제: boolean;
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
        '케이스 파일을 훑어 실행할 수 있는 케이스 목록을 만듭니다. 목록은 그때마다 코드에서 새로 만듭니다',
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

  // 문제 없이 0건이면 아직 테스트를 안 쓴 서비스다(폴더가 없어도 스캔은 문제로 안 친다) — 할 일은 작성이다 (PRD-F9-19)
  if (!형편.스캔문제) {
    return {
      무엇: t('아직 테스트가 없습니다', 언어),
      왜: t('「테스트 작성」에서 처음 작성을 시작합니다', 언어),
      버튼: t('다시 스캔', 언어),
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
