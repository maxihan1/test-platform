// 절차 시작을 러너에 알리는 한 줄을 만든다. 킷·러너가 같은 표시자를 봐야 해서 만드는 쪽을 한 자리에 둔다 (SPEC §5.2)

import type { StepProgress } from '../types.js';
import { PROGRESS_MARKER } from './protocol.js';

// 러너가 줄 단위로 가르므로 몸통에 날개행이 섞이면 안 된다 — JSON.stringify가 문자열 속 개행까지 이스케이프한다
export function 진행줄(p: StepProgress): string {
  return `${PROGRESS_MARKER}${JSON.stringify(p)}\n`;
}

// 러너가 안 붙인 채로 돌리면 historyId가 없다. 그때는 알릴 곳이 없으므로 아무 일도 안 한다
export function 알린다(seq: number, title: string): void {
  // 여기만 CLAUDE.md §3(에러를 삼키지 않는다)의 의도된 예외다. 알림은 판정에 끼어들면 안 되는 곁가지라
  // 파이프가 닫혀 write가 던지면 멀쩡히 통과한 절차가 알림 때문에 FAIL로 뒤집힌다
  try {
    const historyId = process.env.PLATFORM_HISTORY_ID;
    if (historyId === undefined) return;
    process.stdout.write(진행줄({ historyId: Number(historyId), seq, title }));
  } catch {
    // 알림이 못 나간 것은 케이스 결과와 무관하다
  }
}
