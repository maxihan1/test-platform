// 게임 시나리오 도구(정리 자리 · 로그 구간 · 미션 멈춤 · 로그 견주기 · 표시)를 절차 문맥만 흉내내어 검사한다

import { describe, expect, it, vi } from 'vitest';

import type { StepResult } from '../types.js';
import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
import { cleanup, gameLog, repeatUntil, 게임시나리오인가, 끝정리 } from './gameScenario.js';
import { step } from './step.js';
import { verify } from './verify.js';

function 판(): { run: RunScope; 남은: StepResult[] } {
  const 남은: StepResult[] = [];
  const run: RunScope = { seq: 0, failed: false, stopped: false, capture: async () => undefined, emit: async (r) => { 남은.push(r); } };
  return { run, 남은 };
}

describe('게임시나리오인가', () => {
  it('-GS- 번호만 게임 시나리오다', () => {
    expect(게임시나리오인가('ARG-GS-001')).toBe(true);
    expect(게임시나리오인가('ARG-FN-001')).toBe(false);
    expect(게임시나리오인가('ARG-001')).toBe(false);
  });
});

describe('test.cleanup', () => {
  it('부른 자리에서 한 번, 끝 정리에서 한 번 더 돈다', async () => {
    const { run, 남은 } = 판();
    const fn = vi.fn(async () => {});
    await runScope.run(run, () => cleanup('부른 임프 치우기', fn));
    await 끝정리(run);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(남은.map((s) => [s.seq, s.title, s.status])).toEqual([
      [1, '시작 정리 — 부른 임프 치우기', 'PASS'],
      [2, '끝 정리 — 부른 임프 치우기', 'PASS'],
    ]);
  });

  it('정리가 실패하면 NA 와 까닭만 남기고 던지지 않으며 항목 판정을 안 바꾼다', async () => {
    const { run, 남은 } = 판();
    await runScope.run(run, () => cleanup('무적 끄기', async () => { throw new Error('GM 명령이 거절됐다'); }));
    await 끝정리(run);
    expect(남은.map((s) => s.status)).toEqual(['NA', 'NA']);
    expect(남은[0]?.error?.message).toBe('GM 명령이 거절됐다');
    expect(run.failed).toBe(false);
    expect(run.stopped).toBe(false);
  });

  it('케이스 밖에서 부르면 던진다', async () => {
    await expect(cleanup('치우기', async () => {})).rejects.toThrow('케이스 밖');
  });

  it('정리 안의 verify · test.step 은 판정 · 순번을 바꾸지 않고 정리를 NA 로 남긴다', async () => {
    const { run, 남은 } = 판();
    await runScope.run(run, async () => {
      await cleanup('판정하는 정리', async () => { await verify('삭제 응답 200', 500, 200); });
      await cleanup('절차를 여는 정리', async () => { await step('지운다', async () => {}); });
    });
    expect(남은.map((s) => [s.title, s.status])).toEqual([
      ['시작 정리 — 판정하는 정리', 'NA'],
      ['시작 정리 — 절차를 여는 정리', 'NA'],
    ]);
    expect(남은[0]?.error?.message).toContain('정리 안에서');
    expect(남은[1]?.error?.message).toContain('정리 안에서');
    expect(run.failed).toBe(false);
    expect(run.seq).toBe(2);
  });
});

describe('gameLog', () => {
  it('부른 순간의 마지막 번호를 시작으로 적고 그 뒤 줄을 받아 온다', async () => {
    const read = vi.fn(async (since: number | null) => (since === null ? { last: 40, lines: ['앞 줄'] } : { last: 43, lines: ['41', '42', '43'] }));
    const 구간 = await gameLog(read);
    expect(구간.start).toBe(40);
    expect(await 구간.lines()).toEqual(['41', '42', '43']);
    expect(read).toHaveBeenLastCalledWith(40);
  });

  it('번호가 시작보다 작아지면 게임 서버가 다시 켜진 것이라 던진다', async () => {
    const 구간 = await gameLog(async (since) => (since === null ? { last: 40, lines: [] } : { last: 3, lines: [] }));
    await expect(구간.lines()).rejects.toThrow('게임 로그 번호가 처음부터 다시 시작됐습니다 (시작 40 · 지금 3)');
  });
});

describe('repeatUntil', () => {
  it('진행 값이 목표에 닿으면 그 값을 돌려준다', async () => {
    let 처치 = 0;
    const act = vi.fn(async () => { 처치 += 1; });
    expect(await repeatUntil(act, { progress: async () => 처치, goal: 3, stallMs: 1_000 })).toBe(3);
    expect(act).toHaveBeenCalledTimes(3);
  });

  it('진행 값이 정한 시간 동안 안 늘면 미션 멈춤으로 던진다', async () => {
    await expect(repeatUntil(async () => {}, { progress: async () => 1, goal: 3, stallMs: 0 })).rejects.toThrow(
      '미션이 0초 동안 나아가지 않았습니다 (진행 1 / 목표 3)',
    );
  });

  it('조작이 던지면 그대로 던진다', async () => {
    await expect(repeatUntil(async () => { throw new Error('적이 없다'); }, { progress: async () => 0, goal: 1, stallMs: 1_000 })).rejects.toThrow('적이 없다');
  });
});

describe('verify.log', () => {
  const s = (): StepScope => ({ assertions: [] });

  it('줄이 최소 줄 수 이상이고 전부 기대값이면 통과한다', async () => {
    const 칸 = s();
    expect(await stepScope.run(칸, () => verify.log('준 피해는 12다 (R-3)', [12, 12, 12], 12, { least: 3 }))).toBe(true);
    expect(칸.assertions[0]).toEqual({
      statement: '준 피해는 12다 (R-3)', status: 'PASS', actual: { 줄수: 3, 벗어난값: [] }, expected: { 값: 12, 최소줄수: 3 },
    });
  });

  it('범위 밖 값이 하나라도 있으면 실패하고 벗어난 값을 남긴다', async () => {
    const 칸 = s();
    expect(await stepScope.run(칸, () => verify.log('받은 피해는 10~14다', [11, 15, 9], { min: 10, max: 14 }))).toBe(false);
    expect(칸.assertions[0]).toMatchObject({ status: 'FAIL', actual: { 줄수: 3, 벗어난값: [15, 9] }, expected: { 범위: { min: 10, max: 14 }, 최소줄수: 1 } });
  });

  it('최소 줄 수보다 적으면 실패한다', async () => {
    const 칸 = s();
    expect(await stepScope.run(칸, () => verify.log('처치 줄이 3줄이다', [1, 1], 1, { least: 3 }))).toBe(false);
  });

  it('한 줄도 없으면 「확인 못 함」 머리를 단 실패다 — 최소 줄 수를 0 으로 줘도', async () => {
    const 칸 = s();
    expect(await stepScope.run(칸, () => verify.log('준 피해는 12다', [], 12, { least: 0 }))).toBe(false);
    expect(칸.assertions[0]).toMatchObject({ statement: '확인 못 함 — 준 피해는 12다', status: 'FAIL' });
  });
});

describe('verify.note', () => {
  it('판정에 안 드는 NA 문장을 남긴다', async () => {
    const 칸: StepScope = { assertions: [] };
    await stepScope.run(칸, () => verify.note('설명 안 되는 줄 — 인원 보정', { 줄: 7 }));
    expect(칸.assertions).toEqual([{ statement: '설명 안 되는 줄 — 인원 보정', status: 'NA', actual: { 줄: 7 }, expected: null }]);
  });

  it('절차 밖에서 부르면 던진다', async () => {
    await expect(verify.note('설명 안 되는 줄', 1)).rejects.toThrow('절차 밖');
  });
});
