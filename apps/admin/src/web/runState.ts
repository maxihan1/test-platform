// 실행 묶음의 상태 하나를 화면 두 곳이 같은 규칙으로 읽는다 (SPEC §8.3 · §8.7)
// 자동 갱신을 멈출지도, 멈춤 버튼을 보일지도 전부 이 값으로 정한다 — 화면이 따로 상태를 들지 않는다

const 라벨: Record<string, string> = {
  RUNNING: '도는 중',
  FINISHED: '끝남',
  // 사람이 끊어서 끝난 것과 끝까지 돌아서 끝난 것은 증적에서 구분돼야 한다 (SPEC §3.2)
  ABORTED: '중단됨',
};

/**
 * 아직 도는 중인가. 2초 자동 갱신을 이 값으로 멈춘다.
 *
 * 「FINISHED 가 아니면 도는 중」으로 적으면 ABORTED 에서 영원히 안 멈춘다.
 * 모르는 상태도 도는 중으로 보지 않는다 — 틀리는 방향을 「그만 묻는다」 쪽으로 둔다.
 */
export function 도는중(status: string): boolean {
  return status === 'RUNNING';
}

/** 모르는 상태는 그 글자를 그대로 보여준다. 지어내면 무엇이 일어났는지 숨긴다 */
export function 상태라벨(status: string): string {
  return 라벨[status] ?? status;
}
