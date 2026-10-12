// 비밀값 칸이 어느 역할의 아이디 · 비밀번호인지 가리고 대상 서버 계정으로 빈 칸을 채운다 (도메인/작성 §3.6 「★ 역할별 계정」)
// 서버(실행을 만들 때)와 kit 실행(PLATFORM_ACCOUNTS)이 이 함수 하나를 탄다 — 둘로 두면 한쪽만 고쳐진다

/** 대상 서버 줄의 옛 칸(login_id · login_password) 계정의 역할 이름. `account` 꼬리표가 없는 칸이 이것을 쓴다 */
export const 기본역할 = '일반 회원';

export interface 역할계정 {
  role: string;
  loginId: string | null;
  loginPassword: string | null;
}

/** 칸 꼬리표 — JSON Schema 칸(`secret` · `account`)이나 zod `.meta()` 값 */
export interface 칸꼬리표 {
  secret?: unknown;
  account?: unknown;
}

export interface 계정자리 {
  role: string;
  칸: 'loginId' | 'loginPassword';
}

/**
 * 비밀값 칸이면 역할과 아이디 · 비밀번호 가운데 어느 칸인지. 계정 칸이 아니면 null.
 * ponytail: 칸 이름으로 가른다 — 이름이 둘 다 아닌 비밀값(토큰 같은)은 계정으로 안 채운다. 틀리면 케이스가 「비어 있다」로 드러낸다
 */
export function 계정칸(이름: string, 꼬리표: 칸꼬리표 | undefined): 계정자리 | null {
  if (꼬리표?.secret !== true) return null;
  const 칸 = /pass|pw/i.test(이름) ? 'loginPassword' : /id$|user|email|account|login/i.test(이름) ? 'loginId' : null;
  if (칸 === null) return null;
  const role = typeof 꼬리표.account === 'string' && 꼬리표.account.trim() !== '' ? 꼬리표.account.trim() : 기본역할;
  return { role, 칸 };
}

/**
 * 값이 없는(키가 없거나 undefined) 계정 칸만 그 역할 계정으로 채운 새 객체.
 * 빈 글자는 그대로 둔다 — 사람이 일부러 지운 칸이다(도메인/실행 §3.2 저장값과 같은 규칙). 그 역할 계정 값이 비었으면 안 채운다
 */
export function 계정채우기(
  칸들: Record<string, 칸꼬리표 | undefined>,
  값: Record<string, unknown>,
  계정들: readonly 역할계정[],
): Record<string, unknown> {
  const 채운것 = { ...값 };
  for (const [이름, 꼬리표] of Object.entries(칸들)) {
    if (채운것[이름] !== undefined) continue;
    const 자리 = 계정칸(이름, 꼬리표);
    if (자리 === null) continue;
    const 넣을것 = 계정들.find((a) => a.role === 자리.role)?.[자리.칸];
    if (넣을것 !== null && 넣을것 !== undefined && 넣을것 !== '') 채운것[이름] = 넣을것;
  }
  return 채운것;
}
