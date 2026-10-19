// 반영에 사람 손이 남았나 — 목록 todo.apply(서버)와 상세 칩 · 반영 칸(화면)이 같이 쓴다. 화면이 가져가므로 DB 를 안 가져온다 (도메인/작성 §7 목록)

export type 반영 = 'WAITING' | 'FAILED' | null;

/** 뿌리의 최신 실행(실패한 반영 포함)으로 정한다 — 반영 요청 전 작성 · 고치기가 끝났거나, 반영이 실패했을 때만 사람 손이 남는다 */
export function 반영할일(최신: { kind: string; status: string }): 반영 {
  if (최신.kind !== 'MERGE' && 최신.status === 'DONE') return 'WAITING';
  if (최신.kind === 'MERGE' && 최신.status === 'FAILED') return 'FAILED';
  return null;
}
