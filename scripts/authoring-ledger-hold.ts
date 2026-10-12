// 요구사항 표의 「제거함(<tcId>)」 줄과 「계정 미등록」 제외 줄에서 계정이 없어 보류된 요구와 역할을 읽는다 (도메인/작성 §3.6 「★ 역할별 계정」)
// 원장 대조(빠짐으로 안 세기)와 스캔(req_hold 채우기)이 이 파싱 하나를 쓴다 — 둘이 다르면 화면의 「보류」와 셈이 어긋난다

import { 번호찾기 } from './authoring-ledger.js';
import { 백틱벗기기, 표읽기 } from './authoring-md-table.js';

const 제거함꼴 = /^제거함\(.+\)$/;
// 출처 칸 「보류 — <역할> 계정 …」 — 역할 이름은 첫 「계정」 앞까지다(일반 회원처럼 띄어 써도 된다)
const 보류역할꼴 = /보류\s*[—–]\s*(.+?)\s*계정/;

export interface 제거함줄 {
  번호들: string[];
  /** 출처 칸에 「보류 — <역할> 계정」이 있으면 그 역할. 없으면(판정 불가로 뺀 것) null */
  역할: string | null;
}

/** 요구사항 표 한 줄이 tcId 칸 「제거함(…)」이면 그 출처 번호들과 역할. 아니면 null */
export function 제거함읽기(행: Record<string, string>): 제거함줄 | null {
  if (!제거함꼴.test(백틱벗기기(행['tcId'] ?? ''))) return null;
  const 출처 = 행['출처'] ?? '';
  return { 번호들: 번호찾기(출처).번호들, 역할: 보류역할꼴.exec(출처)?.[1]?.trim() ?? null };
}

/** 기준(main) 표에서 「제거함」 줄의 출처 번호 전부 — 에이전트가 사람이 제거한 줄만 인정하려고 뽑는다 */
export function 제거함번호들(표글: string): Set<string> {
  return new Set(표읽기(표글, '요구사항').flatMap((행) => 제거함읽기(행)?.번호들 ?? []));
}

/**
 * 계정이 없어 보류된 요구 → 역할. 「계정 미등록」 제외 줄(사유 칸이 역할 이름, 한 줄에 번호 하나)과 역할이 적힌 「제거함」 줄.
 * 케이스로 덮였는지는 보지 않는다 — 부르는 쪽이 가린다
 */
export function 계정보류읽기(표글: string): Map<string, string> {
  const 맵 = new Map<string, string>();
  for (const 행 of 표읽기(표글, '제외')) {
    const 번호들 = 번호찾기(행['요구'] ?? '').번호들;
    const 역할 = (행['사유'] ?? '').trim();
    if ((행['종류'] ?? '').trim() === '계정 미등록' && 번호들.length === 1 && 역할 !== '') 맵.set(번호들[0] ?? '', 역할);
  }
  for (const 행 of 표읽기(표글, '요구사항')) {
    const 줄 = 제거함읽기(행);
    if (줄?.역할 != null) for (const b of 줄.번호들) 맵.set(b, 줄.역할);
  }
  return 맵;
}
