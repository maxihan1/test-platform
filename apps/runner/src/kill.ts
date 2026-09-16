// 타임아웃 때 실행을 끊는다. npx → node → 브라우저까지 한 덩어리로 내려야 한다 (SPEC §5.2)

import type { ChildProcess } from 'node:child_process';

export function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  try {
    // detached로 띄운 자식은 프로세스 그룹의 장이다. 음수 pid는 그 그룹 전체를 뜻한다.
    // 자식만 죽이면 손자가 stdout을 쥔 채 남아 close 이벤트가 오지 않는다
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    // 그룹이 이미 사라졌거나 만들어지지 않은 경우다. 자식만이라도 끊는다
    child.kill('SIGKILL');
  }
}
