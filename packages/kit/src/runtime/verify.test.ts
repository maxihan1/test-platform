// verify의 실패 규칙(SPEC §4)을 절차 문맥만 흉내내어 검사한다. Playwright 없이 돌아야 한다

import { describe, expect, it } from 'vitest';

import { stepScope, type StepScope } from './context.js';
import { BlockerStop, verify } from './verify.js';

function scope(): StepScope {
  return { assertions: [] };
}

describe('verify', () => {
  it('실제값과 기대값이 같으면 PASS 문장을 남긴다', async () => {
    const s = scope();
    const passed = await stepScope.run(s, () => verify('응답 코드가 정상이다', 200, 200));

    expect(passed).toBe(true);
    expect(s.assertions).toEqual([
      { statement: '응답 코드가 정상이다', status: 'PASS', actual: 200, expected: 200 },
    ]);
  });

  it('값이 다르면 FAIL로 남기되 던지지 않는다 — 다음 문장이 계속 돌아야 한다', async () => {
    const s = scope();
    const passed = await stepScope.run(s, async () => {
      const first = await verify('토큰이 발급된다', false, true);
      await verify('응답 코드가 정상이다', 200, 200);
      return first;
    });

    expect(passed).toBe(false);
    expect(s.assertions.map((a) => a.status)).toEqual(['FAIL', 'PASS']);
  });

  it('blocker 문장이 실패하면 절차를 멈추는 신호를 던진다', async () => {
    const s = scope();
    await expect(
      stepScope.run(s, () => verify('로그인에 성공한다', 401, 200, { blocker: true })),
    ).rejects.toBeInstanceOf(BlockerStop);

    expect(s.assertions[0]).toMatchObject({ status: 'FAIL', blocker: true });
  });

  it('blocker 문장이라도 통과하면 멈추지 않고 blocker 표시도 남기지 않는다', async () => {
    const s = scope();
    await stepScope.run(s, () => verify('로그인에 성공한다', 200, 200, { blocker: true }));

    expect(s.assertions[0]).toEqual({
      statement: '로그인에 성공한다',
      status: 'PASS',
      actual: 200,
      expected: 200,
    });
  });

  it('객체는 깊은 값 비교로 판정한다', async () => {
    const s = scope();
    await stepScope.run(s, () => verify('응답 본문이 기대와 같다', { id: 1, tags: ['a'] }, { id: 1, tags: ['a'] }));

    expect(s.assertions[0].status).toBe('PASS');
  });

  it('절차 밖에서 부르면 에러를 던진다', async () => {
    await expect(verify('절차 밖 문장', 1, 1)).rejects.toThrow(/절차/);
  });

  it('첫 실패 문장의 소스 줄 번호를 절차 문맥에 남긴다', async () => {
    const s = scope();
    await stepScope.run(s, async () => {
      await verify('첫 번째 실패', 1, 2);
      await verify('두 번째 실패', 3, 4);
    });

    expect(s.line).toBeTypeOf('number');
  });
});
