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

/**
 * 실행이 끝났다고 이미 알린 것들.
 *
 * **한 번 닫은 알림은 그 실행에 대해 다시 뜨지 않는다. 새로고침해도 마찬가지다** (SPEC §8.9).
 * 완료 모달과 §8 알림 줄이 **같은 자리를 본다** — 그 실행 화면에 있던 사람은
 * 모달로 이미 알았으므로 다른 화면으로 옮겼을 때 줄이 또 뜨면 두 번 알리는 것이다.
 */
const 본것키 = '끝난실행';

function 본것들(): Set<number> {
  try {
    const 값 = sessionStorage.getItem(본것키);
    return new Set<number>(값 === null ? [] : (JSON.parse(값) as number[]));
  } catch {
    // 브라우저가 저장을 막아도 알림 자체는 떠야 한다. 새로고침에 다시 뜰 뿐이다
    return new Set();
  }
}

export function 알림본적있나(runId: number): boolean {
  return 본것들().has(runId);
}

export function 본것으로적는다(runId: number): void {
  try {
    const 것들 = 본것들();
    것들.add(runId);
    sessionStorage.setItem(본것키, JSON.stringify([...것들]));
  } catch {
    // 위와 같다
  }
}

/**
 * 「끝났습니다」를 알릴 때인가 (SPEC §8.9).
 *
 * **도는 중이던 것이 끝났을 때만이다.** 처음부터 끝나 있던 실행을 열었다면
 * 그것은 새 소식이 아니라 기록이다 — 알리면 매번 뜬다.
 * 사람이 멈춘 것(`ABORTED`)도 끝난 것으로 친다.
 */
export function 끝났다고알릴까(그것: { 전: string; 후: string; runId: number }): boolean {
  if (!도는중(그것.전)) return false;
  if (도는중(그것.후)) return false;
  return !알림본적있나(그것.runId);
}

/**
 * 실행자로 적을 이름 (SPEC §3.5 · §8.7).
 *
 * **박제된 이름을 쓴다.** 로그인 아이디가 아니다 — 계정 이름이 바뀌거나 계정이 지워져도
 * 과거 증적은 흔들리지 않아야 한다.
 *
 * 인증 이전 실행에는 확인된 실행자가 없다. 이름 칸이 비어 있는 것이 그 표시다.
 * **값을 지어내 채우지 않는다** — 모르는 것은 모른다고 적는 것이 기록이다.
 *
 * 정기 실행은 따로 가르지 않는다. `scripts/run-scheduled.ts` 가 이름을 `스케줄러` 로 박아 넣는다.
 */
export function 실행자이름(run: { triggeredBy: string; triggeredByName: string | null }): string {
  const 이름 = run.triggeredByName;
  return 이름 === null || 이름 === '' ? '실행자 미상 (인증 도입 이전)' : 이름;
}
