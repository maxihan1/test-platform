// 절차 시작과 케이스 판정을 러너에 알리는 줄을 만든다. 킷·러너가 같은 표시자를 봐야 해서 만드는 쪽을 한 자리에 둔다 (SPEC §5.2)

import type { CaseResult, StepProgress, TcId } from '../types.js';
import { CASE_MARKER, PROGRESS_MARKER } from './protocol.js';

// 러너가 줄 단위로 가르므로 몸통에 날개행이 섞이면 안 된다 — JSON.stringify가 문자열 속 개행까지 이스케이프한다
export function 진행줄(p: StepProgress): string {
  return `${PROGRESS_MARKER}${JSON.stringify(p)}\n`;
}

// 앞에 줄바꿈을 하나 둔다 — 케이스 코드가 줄바꿈 없이 찍은 글 뒤에 붙으면 표시자가 줄 첫머리가 아니게 되어 러너가 그 판정을 놓친다
export function 판정줄(result: CaseResult): string {
  return `\n${CASE_MARKER}${JSON.stringify(result)}\n`;
}

// 러너가 안 붙인 채로 돌리면 historyId가 없다. 그때는 알릴 곳이 없으므로 아무 일도 안 한다.
// tcId 는 프로시저만 — 지금 도는 케이스다
export function 알린다(seq: number, title: string, tcId?: TcId): void {
  // 여기만 CLAUDE.md §3(에러를 삼키지 않는다)의 의도된 예외다. 알림은 판정에 끼어들면 안 되는 곁가지라
  // 파이프가 닫혀 write가 던지면 멀쩡히 통과한 절차가 알림 때문에 FAIL로 뒤집힌다
  try {
    const historyId = process.env.PLATFORM_HISTORY_ID;
    if (historyId === undefined) return;
    process.stdout.write(진행줄({ historyId: Number(historyId), seq, title, ...(tcId !== undefined && { tcId }) }));
  } catch {
    // 알림이 못 나간 것은 케이스 결과와 무관하다
  }
}

// 케이스 판정 한 건을 러너에 흘린다. 사람이 손으로 돌릴 때(historyId 없음)는 읽을 쪽이 없어 안 쓴다 — 진행 줄과 같다
export function 판정을알린다(result: CaseResult): void {
  // 위와 같은 의도된 예외다. 여기서 던지면 이미 난 판정 뒤에 예외가 올라가 다음 케이스가 깨진 것으로 갈린다.
  // 못 나간 줄은 러너가 「못 간 케이스 채우기」 표대로 채운다 (도메인/러너 §5.2 「프로시저 실행」)
  try {
    if (process.env.PLATFORM_HISTORY_ID === undefined) return;
    process.stdout.write(판정줄(result));
  } catch {
    // 줄이 못 나간 것은 kit 이 정한 판정과 무관하다
  }
}
