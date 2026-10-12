// 요구 하나의 보류를 「아직 계정이 없는 역할」과 「계정은 넣었고 이어 작성만 남은 역할」로 가른다 — 화면 줄과 추적표 엑셀이 같이 쓴다 (도메인/작성 §3.6 「★ 역할별 계정」 「보이는 셋」)

/** 원장 대조의 제외 종류 이름 — 셈 `excluded` 의 키. 화면 글자가 아니라 서버가 주는 값이다 */
export const 계정미등록종류 = '계정 미등록';

export interface 보류모양 {
  reqs: Record<string, string[]>;
  roles: { role: string; registered: boolean }[];
}

export interface 줄보류 {
  미등록: string[];
  등록됨: string[];
}

/** 이 요구가 보류가 아니면 null */
export function 줄보류of(held: 보류모양, reqId: string): 줄보류 | null {
  const 역할들 = held.reqs[reqId];
  if (역할들 === undefined || 역할들.length === 0) return null;
  const 등록 = new Set(held.roles.filter((r) => r.registered).map((r) => r.role));
  return { 미등록: 역할들.filter((r) => !등록.has(r)), 등록됨: 역할들.filter((r) => 등록.has(r)) };
}
