// 집기 응답의 역할별 계정 — 가릴 비밀번호 목록 · 길이 점검 · 자식에게 넘길 PLATFORM_ACCOUNTS (도메인/작성 §3.6 「★ 역할별 계정」)
// 비밀번호를 받는 자리는 모두 `비밀번호들` 하나로 목록을 만든다 — 한 자리라도 target 것만 받으면 그 역할 비밀번호가 PR · 로그에 실린다

import { type 대상, 비밀최소 } from './authoring-reverse.js';

/** 집기 응답의 `accounts` 한 줄 (도메인/작성 §7 claim). 대조 · 값을 채운 보류 머지 · 반영 행에만 온다 */
export interface 계정줄 {
  env: string;
  baseUrl: string | null;
  role: string;
  loginId: string;
  loginPassword: string;
}

/**
 * 가릴 비밀번호 전부 — 일반 회원(target)과 역할 계정(accounts). 빈 값 · 같은 값은 뺀다.
 * **긴 것부터** 준다 — 짧은 비밀번호가 긴 것의 일부면 짧은 것을 먼저 가린 자리 뒤에 긴 것의 나머지 글자가 남는다
 */
export function 비밀번호들(것: { target?: Pick<대상, 'loginPassword'>; accounts?: readonly Pick<계정줄, 'loginPassword'>[] }): string[] {
  const 모두 = [것.target?.loginPassword, ...(것.accounts ?? []).map((a) => a.loginPassword)];
  return [...new Set(모두.filter((p): p is string => typeof p === 'string' && p !== ''))].sort((a, b) => b.length - a.length);
}

/**
 * 자식 쪽(크롤러)이 받은 환경 변수로 같은 목록을 만든다 — 에이전트가 넘긴 `TARGET_LOGIN_PASSWORD` · `PLATFORM_ACCOUNTS`.
 * JSON 이 아니면 던진다 — 에이전트가 만든 값이라 깨졌으면 무엇을 가려야 할지 모른다. 문장에 값을 싣지 않는다
 */
export function 환경비밀번호들(env: Record<string, string | undefined>): string[] {
  let 계정들: unknown = [];
  if ((env.PLATFORM_ACCOUNTS ?? '').trim() !== '') {
    try {
      계정들 = JSON.parse(env.PLATFORM_ACCOUNTS ?? '');
    } catch {
      throw new Error('PLATFORM_ACCOUNTS 가 JSON 이 아니다');
    }
  }
  if (!Array.isArray(계정들)) throw new Error('PLATFORM_ACCOUNTS 가 배열이 아니다');
  const 줄들 = 계정들.map((a: unknown) => (a as { loginPassword?: unknown } | null)?.loginPassword);
  return 비밀번호들({
    target: { loginPassword: env.TARGET_LOGIN_PASSWORD },
    accounts: 줄들.map((p) => ({ loginPassword: typeof p === 'string' ? p : '' })),
  });
}

/**
 * 역할 계정 비밀번호도 `대상점검` 과 같은 하한으로 본다 — 짧으면 올리는 글에 새는지 검사할 수 없다. 막으면 사유, 아니면 null.
 * **사유에 계정 값을 싣지 않는다** — 서버 줄 이름과 역할 이름만
 */
export function 계정점검(계정들: readonly 계정줄[] | undefined): string | null {
  // 서버 응답이라 칸이 비어 올 수도 있다 — 글자가 아니면 짧은 것으로 본다
  const 짧은 = (계정들 ?? []).find((a) => typeof a.loginPassword !== 'string' || a.loginPassword.length < 비밀최소);
  if (짧은 === undefined) return null;
  return `대상 서버 「${짧은.env}」 의 「${짧은.role}」 테스트 계정 비밀번호가 ${비밀최소}자보다 짧아 올리는 글에 새는지 검사할 수 없다 — 더 긴 비밀번호로 바꿔라`;
}

/**
 * 자식 · 3회 실행에 넘길 환경 변수. kit 이 `PLATFORM_BASE_URL` 과 출처가 같은 줄로 비어 있는 계정 칸을 채운다 (공통/2-명세선언 §4.1).
 * **값을 프롬프트 · 인자에 싣지 않는다** — `대상환경` 과 같다. 계정이 없으면 키 자체를 안 넣는다
 */
export function 계정환경(계정들: readonly 계정줄[] | undefined): { PLATFORM_ACCOUNTS?: string } {
  if (계정들 === undefined || 계정들.length === 0) return {};
  return { PLATFORM_ACCOUNTS: JSON.stringify(계정들.map(({ baseUrl, role, loginId, loginPassword }) => ({ baseUrl, role, loginId, loginPassword }))) };
}
