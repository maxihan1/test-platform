// 대상 서버 줄의 역할 계정 이름 규칙 — 설정 API(400 BAD_ROLE)와 설정 화면(못 보내는 이유)이 같이 쓴다 (도메인/인증 §7 「envs[] 한 줄」)
// fastify · pg 를 끌어오지 않는다 — 화면 번들이 그대로 가져다 쓴다 (선례 rules.ts)

import { 기본역할 } from '@platform/kit/accounts';

/** 이름만으로 운영 줄로 보는 규칙 — 마이그레이션 20261012000003 과 같다. 새 줄의 「운영 서버」 처음 값이다. 잘못 켜지면 작성이 BAD_ENV 로 멈출 뿐이다 */
export const 운영이름인가 = (env: string): boolean => ['prod', 'production'].includes(env.trim().toLowerCase()) || env.trim() === '운영';

export const 역할최대글자 = 40;
export const 역할최대개수 = 20;

export type 역할까닭 = '빈칸' | '일반회원' | '길이' | '겹침' | '개수';

/**
 * 한 줄의 역할 이름들이 어긋난 첫 까닭. 맞으면 null. 이름은 앞뒤 공백을 떼고 본다 — 서버가 뗀 이름으로 저장한다.
 * 「일반 회원」을 막는 까닭 — 케이스의 `account` 꼬리표가 없는 칸이 그 이름이라 역할 계정이 일반 회원 칸을 덮는다
 */
export function 역할까닭찾기(역할들: readonly string[]): 역할까닭 | null {
  if (역할들.length > 역할최대개수) return '개수';
  const 본것 = new Set<string>();
  for (const 원래 of 역할들) {
    const 역할 = 원래.trim();
    if (역할 === '') return '빈칸';
    if (역할.length > 역할최대글자) return '길이';
    if (역할 === 기본역할) return '일반회원';
    if (본것.has(역할)) return '겹침';
    본것.add(역할);
  }
  return null;
}
