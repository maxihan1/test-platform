// 절차 시작을 러너에 알리는 한 줄을 만든다. 킷·러너가 같은 표시자를 봐야 해서 만드는 쪽을 한 자리에 둔다 (SPEC §5.2)

import type { StepProgress } from '../types.js';
import { PROGRESS_MARKER } from './protocol.js';

// 러너가 줄 단위로 가르므로 몸통에 날개행이 섞이면 안 된다 — JSON.stringify가 문자열 속 개행까지 이스케이프한다
export function 진행줄(p: StepProgress): string {
  return `${PROGRESS_MARKER}${JSON.stringify(p)}\n`;
}
