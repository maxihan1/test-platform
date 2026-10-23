// verify의 실패 규칙(SPEC §4)을 절차 문맥만 흉내내어 검사한다. Playwright 없이 돌아야 한다

import { describe, expect, it } from 'vitest';

import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
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

function 게임실행(): RunScope {
  return { seq: 0, failed: false, stopped: false, capture: async () => undefined, emit: async () => {}, elementChecks: [], apiCalls: [] };
}

describe('verify.element', () => {
  it('서버 값을 기획서 값과 견주고 게임 항목이면 지도 줄을 남긴다', async () => {
    const s = scope();
    const run = 게임실행();
    const passed = await runScope.run(run, () =>
      stepScope.run(s, async () => {
        await verify.element('긴 검 공격력이 기획서와 같다', 'item:sword_long', 12, 12);
        return verify.element('짧은 검 공격력이 기획서와 같다', 'item:sword_short', 9, 8);
      }),
    );

    expect(passed).toBe(false);
    expect(run.elementChecks).toEqual([
      { key: 'item:sword_long', serverValue: 12, same: true },
      { key: 'item:sword_short', serverValue: 9, same: false },
    ]);
    expect(s.assertions.map((a) => [a.status, a.actual, a.expected])).toEqual([
      ['PASS', 12, 12],
      ['FAIL', 9, 8],
    ]);
    expect(s.line).toBeTypeOf('number');
  });

  it('절차 밖에서 부르면 던지고 지도 줄을 남기지 않는다', async () => {
    const run = 게임실행();
    await expect(runScope.run(run, () => verify.element('값', 'item:a', 1, 1))).rejects.toThrow('절차 밖에서 불렀다');
    expect(run.elementChecks).toEqual([]);
  });
});

describe('verify.rates', () => {
  it('결과마다 비율이 기대 확률 ± 허용 오차 안이면 통과다', async () => {
    const s = scope();
    const passed = await stepScope.run(s, () =>
      verify.rates('강화 성공 확률이 표대로다', { 성공: 532, 실패: 468 }, { 성공: 0.55, 실패: 0.45 }, 0.03),
    );

    expect(passed).toBe(true);
    expect(s.assertions[0]).toEqual({
      statement: '강화 성공 확률이 표대로다',
      status: 'PASS',
      actual: { 시도: 1000, 비율: { 성공: 0.532, 실패: 0.468 } },
      expected: { 확률: { 성공: 0.55, 실패: 0.45 }, 허용오차: 0.03 },
    });
  });

  it('허용 오차 밖이거나 기대에 없는 결과가 나오면 실패다', async () => {
    const s = scope();
    await stepScope.run(s, async () => {
      await verify.rates('밖', { 성공: 500, 실패: 500 }, { 성공: 0.55, 실패: 0.45 }, 0.03);
      await verify.rates('없는 결과', { 성공: 550, 실패: 440, 파괴: 10 }, { 성공: 0.55, 실패: 0.45 }, 0.03);
      await verify.rates('시도 0', {}, { 성공: 1 }, 0.03);
    });

    expect(s.assertions.map((a) => a.status)).toEqual(['FAIL', 'FAIL', 'FAIL']);
  });

  it('허용 오차 · 확률 · 횟수가 틀린 꼴이면 판정 대신 던진다', async () => {
    await expect(stepScope.run(scope(), () => verify.rates('a', { 성공: 1 }, { 성공: 1 }, 0))).rejects.toThrow('허용 오차는 0 과 1 사이');
    await expect(stepScope.run(scope(), () => verify.rates('a', { 성공: 1 }, { 성공: 55 }, 0.03))).rejects.toThrow('기대 확률 성공');
    await expect(stepScope.run(scope(), () => verify.rates('a', { 성공: 1.5 }, { 성공: 1 }, 0.03))).rejects.toThrow('횟수 성공');
  });
});
