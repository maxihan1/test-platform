// 고른 서비스의 권한 칸으로 할 수 있는 일을 가른다 (도메인/인증 §3.5). 못 하는 것은 흐리게가 아니라 아예 안 보이게 한다
// 서버 auth/gate.ts 가 같은 것을 다시 막는다 — 여기는 화면이 자리를 안 그리기 위한 것이고 방어가 아니다

import type { User } from './api.js';

export type 등급 = 'member' | 'admin';
export type 기능 = 'cases' | 'runs' | 'authoring';
export type 칸 = 'none' | 'read' | 'write';
export type 권한칸 = Record<기능, 칸>;

export type 할일 =
  | '실행'
  | '멈춤'
  | '증적만들기'
  | '증적받기'
  | '입력값저장'
  | '다시스캔'
  | '작성요청'
  | '작성머지'
  | '설정';

/** 화면 조각이 받는 판정. 사람과 고른 서비스를 이미 물고 있다 */
export type 판정 = (무엇: 할일) => boolean;

const 높이: Record<칸, number> = { none: 0, read: 1, write: 2 };

// 받는 것은 읽기이고 만드는 것은 서버에 파일을 남기는 쓰기다 (도메인/인증 §3.5 · §8.4)
const 필요: Record<할일, { 기능: 기능; 칸: 'read' | 'write' } | 'admin'> = {
  증적받기: { 기능: 'runs', 칸: 'read' },
  실행: { 기능: 'runs', 칸: 'write' },
  멈춤: { 기능: 'runs', 칸: 'write' },
  증적만들기: { 기능: 'runs', 칸: 'write' },
  입력값저장: { 기능: 'cases', 칸: 'write' },
  다시스캔: { 기능: 'cases', 칸: 'write' },
  // 작성 요청의 결과는 **초안 PR** 이라 마음에 안 들면 버리면 된다.
  // 머지는 **저장소를 영구히 바꾼다.** 둘을 같은 칸에 두면
  // 「작성을 요청할 수 있는 사람 = 저장소를 고칠 수 있는 사람」이 된다 (도메인/작성 §3.6)
  작성요청: { 기능: 'authoring', 칸: 'write' },
  작성머지: 'admin',
  설정: 'admin',
};

/** tcId 접두사가 곧 서비스다 (SPEC §1). `-` 가 없으면 모른다 */
export function 케이스서비스(tcId: string): string | null {
  const 자리 = tcId.indexOf('-');
  return 자리 > 0 ? tcId.slice(0, 자리) : null;
}

/** 고른 서비스의 칸. 배정 안 받은 서비스거나 서비스를 안 골랐으면 null */
export function 서비스권한(user: User | null, prefix: string | null): 권한칸 | null {
  return user?.services.find((s) => s.prefix === prefix)?.permissions ?? null;
}

// admin 은 배정된 서비스에서 전부 쓴다 — 서버가 이미 채워 보내지만, 서비스 0건인 첫 운영자도
// 자리를 봐야 설정으로 가서 자기를 배정할 수 있어 칸을 보지 않는다
function 칸이되나(user: User | null, prefix: string | null, 어느: 기능, 최소: 칸): boolean {
  if (user === null) return false;
  if (user.role === 'admin') return true;
  const 권한 = 서비스권한(user, prefix);
  return 권한 !== null && 높이[권한[어느]] >= 높이[최소];
}

export function 할수있나(user: User | null, prefix: string | null, 무엇: 할일): boolean {
  const 조건 = 필요[무엇];
  if (조건 === 'admin') return user?.role === 'admin';
  return 칸이되나(user, prefix, 조건.기능, 조건.칸);
}

/** 기능이 `none` 이면 그 자리 전체가 없다 (화면공통 §8 「자리 목록」) */
export function 기능보나(user: User | null, prefix: string | null, 어느: 기능): boolean {
  return 칸이되나(user, prefix, 어느, 'read');
}

export function 판정을만든다(user: User | null, prefix: string | null): 판정 {
  return (무엇) => 할수있나(user, prefix, 무엇);
}
