// 등급으로 할 수 있는 일을 가른다 (SPEC §3.5). 못 하는 것은 흐리게가 아니라 아예 안 보이게 한다
// 서버 auth/gate.ts 가 같은 것을 다시 막는다 — 여기는 화면이 자리를 안 그리기 위한 것이고 방어가 아니다

export type 등급 = 'viewer' | 'operator' | 'admin';

export type 할일 = '실행' | '멈춤' | '증적만들기' | '증적받기' | '입력값저장' | '설정';

const 높이: Record<등급, number> = { viewer: 0, operator: 1, admin: 2 };

// 받는 것은 읽기이고 만드는 것은 서버에 파일을 남기는 쓰기다 (SPEC §3.5 · §8.4)
const 최소등급: Record<할일, 등급> = {
  증적받기: 'viewer',
  실행: 'operator',
  멈춤: 'operator',
  증적만들기: 'operator',
  입력값저장: 'operator',
  설정: 'admin',
};

export function 할수있나(role: 등급 | null, 무엇: 할일): boolean {
  if (role === null) return false;
  return 높이[role] >= 높이[최소등급[무엇]];
}
