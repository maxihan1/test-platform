// 타임아웃이 실제로 실행을 끊는지 검사한다. npx만 죽고 손자가 남으면 러너가 timeoutMs를 한참 넘겨 응답한다

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { describe, expect, it } from 'vitest';

import { killTree } from './kill.js';

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function firstLine(stream: NodeJS.ReadableStream): Promise<string> {
  for await (const chunk of stream) return String(chunk).trim().split('\n')[0];
  return '';
}

describe('killTree', () => {
  it('자식이 띄운 손자 프로세스까지 함께 끊는다', async () => {
    const child = spawn('sh', ['-c', 'sleep 30 & echo $!; wait'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const grandchild = Number(await firstLine(child.stdout));
    expect(alive(grandchild)).toBe(true);

    killTree(child);
    await once(child, 'close');
    // 죽은 프로세스가 정리되기까지 한 박자가 있다. 끊겼는지를 보는 것이지 즉시성을 보는 게 아니다
    for (let i = 0; i < 40 && alive(grandchild); i += 1) {
      await new Promise((done) => setTimeout(done, 50));
    }

    expect(alive(grandchild)).toBe(false);
  });
});
