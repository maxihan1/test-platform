// 실행 묶음의 상태 하나를 화면 두 곳이 같은 규칙으로 읽는다 (SPEC §8.3 · §8.7)
// 자동 갱신을 멈출지도, 멈춤 버튼을 보일지도 전부 이 값으로 정한다 — 화면이 따로 상태를 들지 않는다

import { 할수있나, type 등급 } from './role.js';

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

/**
 * 멈춤 버튼을 보일지 (SPEC §8.3 · §3.5).
 *
 * **버튼을 보일지도 자동 갱신을 멈출지도 같은 값(`status`)으로 정한다.**
 * 화면이 따로 상태를 들지 않는다.
 * 보기만 등급에게는 흐리게가 아니라 **아예 없다** (§8).
 */
export function 멈출수있나(status: string, role: 등급 | null): boolean {
  return 도는중(status) && 할수있나(role, '멈춤');
}

/** 서버가 사람의 중단을 이 값으로 저장한다 (`store.ts` 의 `CLOSE_UNFINISHED`) */
const 사람이멈춤 = 'ABORTED';

/**
 * 돌지 못한 항목 옆에 적을 사유 (SPEC §8.3).
 *
 * **사유 없이 미실행으로 두면 러너 고장과 구분되지 않는다.**
 * 서버는 대부분 이미 한국어를 넣어 준다 (`러너에 닿지 못했습니다`) —
 * 화면이 바꾸는 것은 `ABORTED` 하나뿐이다.
 *
 * **원문 오류(스택·주소·포트)는 목록에 쓰지 않는다.** 이 도구의 전제는 「코드를 몰라도 쓴다」다.
 * 못 알아볼 값이 오면 러너에 닿지 못한 것으로 적고 원문은 상세의 접힌 자리에 남긴다.
 */
export function 미실행사유(error: { message: string } | null): string | null {
  if (error === null) return null;
  if (error.message === 사람이멈춤) return '사용자가 멈춤';
  // 한국어 문장이면 서버가 사람이 읽으라고 넣은 것이다. 영문·기호로 시작하면 원문 오류다
  return /^[가-힣]/.test(error.message) ? error.message : '러너에 닿지 못했습니다';
}
