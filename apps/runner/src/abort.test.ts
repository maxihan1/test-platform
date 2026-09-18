// 바깥에서 끊는 통로의 단위 테스트. 끊김은 실제 프로세스로만 증명된다 — kill.test.ts와 같은 방식이다

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { abort, running, type Running } from './execute.js';

// 지도를 비우는 책임은 execute()의 finally에만 있고 이 테스트는 그 경로를 안 거친다.
// 남은 항목이 다음 테스트를 거짓 초록불로 만든다. 실패로 중단돼도 치우도록 afterEach다
afterEach(() => running.clear());

// 자식 프로세스 그룹의 장으로 띄운다. 그래야 killTree가 그룹째 내릴 수 있다
function 살아있는_자식(): Running {
  const child = spawn('sh', ['-c', 'sleep 30'], { detached: true, stdio: 'ignore' });
  return { child, killedBy: null };
}

describe('abort', () => {
  it('모르는 historyId를 끊으라면 false다', () => {
    expect(abort(999)).toBe(false);
  });

  it('돌고 있는 자식을 끊고 true를 돌려준다', async () => {
    const entry = 살아있는_자식();
    running.set(1, entry);

    expect(abort(1)).toBe(true);
    expect(entry.killedBy).toBe('ABORTED');
    // close가 오지 않으면 vitest가 제한 시간으로 실패시킨다. 그것이 안 죽었다는 증거다
    await once(entry.child, 'close');
  });
});
