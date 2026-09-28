// 서비스별 권한 칸의 타입과 「이 칸이면 이 일을 할 수 있나」 판정 (SPEC 도메인/인증 §3.5)

export type 기능 = 'cases' | 'runs' | 'authoring';
export type 칸 = 'none' | 'read' | 'write';
export type 서비스권한 = Record<기능, 칸>;
export type 대시보드칸 = 'none' | 'read';

// 쓰기는 읽기를 품는다 — 높이로 비교해야 판정이 칸마다 갈라지지 않는다
export const 칸높이: Record<칸, number> = { none: 0, read: 1, write: 2 };

export function 칸이되나(가진: 칸, 필요: 'read' | 'write'): boolean {
  return 칸높이[가진] >= 칸높이[필요];
}

// admin 은 저장된 칸을 보지 않는다. 배정된 서비스마다 서버가 이 값으로 채운다 (SPEC §7)
export const 관리자권한: Readonly<서비스권한> = { cases: 'write', runs: 'write', authoring: 'write' };
export const 관리자대시보드: 대시보드칸 = 'read';
