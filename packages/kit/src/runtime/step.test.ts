// 절차 실행 규칙(SPEC §4 verify 실패 규칙)을 Playwright 없이 검사한다. 스크린샷과 결과 전달은 가짜 함수로 바꿔 끼운다

import { describe, expect, it } from 'vitest';

import type { StepResult } from '../types.js';
import type { RunScope } from './context.js';
import { recordHttpTrace } from './http.js';
import { runStep } from './step.js';
import { verify } from './verify.js';

function makeRun(shot: string | null = 'artifacts/runs/1/1/SEQ.png') {
  const emitted: StepResult[] = [];
  const run: RunScope = {
    seq: 0,
    failed: false,
    stopped: false,
    capture: async (seq) => (shot === null ? undefined : shot.replace('SEQ', String(seq))),
    emit: async (result) => {
      emitted.push(result);
    },
  };
  return { run, emitted };
}

describe('runStep', () => {
  it('검증이 전부 통과하면 PASS 절차를 남기고 스크린샷은 찍지 않는다', async () => {
    const { run, emitted } = makeRun();

    const outcome = await runStep(run, '메인 화면을 연다', async () => {
      await verify('제목이 보인다', true, true);
    });

    expect(outcome.stopped).toBe(false);
    expect(run.failed).toBe(false);
    expect(emitted[0]).toMatchObject({ seq: 1, title: '메인 화면을 연다', status: 'PASS' });
    expect(emitted[0].assertions).toHaveLength(1);
    expect(emitted[0].durationMs).toBeTypeOf('number');
    expect(emitted[0].screenshotPath).toBeUndefined();
  });

  it('검증이 실패해도 절차는 끝까지 돌고 다음 절차로 넘어간다', async () => {
    const { run, emitted } = makeRun();

    const outcome = await runStep(run, '토큰을 검증한다', async () => {
      await verify('토큰이 발급된다', false, true);
      await verify('응답 코드가 정상이다', 200, 200);
    });

    expect(outcome.stopped).toBe(false);
    expect(run.failed).toBe(true);
    expect(emitted[0].status).toBe('FAIL');
    expect(emitted[0].assertions.map((a) => a.status)).toEqual(['FAIL', 'PASS']);
    expect(emitted[0].line).toBeTypeOf('number');
  });

  it('실패한 절차는 스크린샷을 찍어 경로를 남긴다', async () => {
    const { run, emitted } = makeRun();

    await runStep(run, '토큰을 검증한다', async () => {
      await verify('토큰이 발급된다', false, true);
    });

    expect(emitted[0].screenshotPath).toBe('artifacts/runs/1/1/1.png');
  });

  it('capture:true면 통과한 절차도 스크린샷을 남긴다', async () => {
    const { run, emitted } = makeRun();

    await runStep(run, '로그인 후 화면을 확인한다', async () => {
      await verify('대시보드가 열린다', true, true);
    }, { capture: true });

    expect(emitted[0].screenshotPath).toBe('artifacts/runs/1/1/1.png');
  });

  it('화면이 없는 케이스는 스크린샷 경로를 남기지 않는다', async () => {
    const { run, emitted } = makeRun(null);

    await runStep(run, '글을 등록한다', async () => {
      await verify('응답 코드가 정상이다', 500, 201);
    });

    expect(emitted[0].screenshotPath).toBeUndefined();
  });

  it('blocker 문장이 실패하면 그 절차를 끝으로 멈춘다', async () => {
    const { run, emitted } = makeRun();

    const outcome = await runStep(run, '로그인 API를 호출한다', async () => {
      await verify('로그인에 성공한다', 401, 200, { blocker: true });
      await verify('여기는 돌지 않는다', 1, 1);
    });

    expect(outcome.stopped).toBe(true);
    expect(outcome.fatal).toBeUndefined();
    expect(emitted[0].status).toBe('FAIL');
    expect(emitted[0].assertions).toHaveLength(1);
    expect(emitted[0].assertions[0].blocker).toBe(true);
  });

  it('예외는 항상 멈추고 그 절차를 FAIL + error로 남긴다', async () => {
    const { run, emitted } = makeRun();
    const boom = new Error('요소를 찾지 못했다');

    const outcome = await runStep(run, '버튼을 누른다', async () => {
      throw boom;
    });

    expect(outcome.stopped).toBe(true);
    expect(outcome.fatal).toBe(boom);
    expect(emitted[0].status).toBe('FAIL');
    expect(emitted[0].error?.message).toBe('요소를 찾지 못했다');
    expect(emitted[0].error?.stack).toBeTypeOf('string');
  });

  it('절차 번호는 1부터 순서대로 올라간다', async () => {
    const { run, emitted } = makeRun();

    await runStep(run, '첫 번째 절차', async () => {
      await verify('무언가 확인한다', 1, 1);
    });
    await runStep(run, '두 번째 절차', async () => {
      await verify('무언가 확인한다', 1, 1);
    });

    expect(emitted.map((s) => s.seq)).toEqual([1, 2]);
  });

  it('절차 안에서 오간 요청·응답 원문을 결과에 싣는다', async () => {
    const { run, emitted } = makeRun(null);

    await runStep(run, '글을 등록한다', async () => {
      recordHttpTrace({ method: 'POST', url: 'https://example.test/posts' }, { status: 201, body: '{}' });
      await verify('응답 코드가 정상이다', 201, 201);
    });

    expect(emitted[0].httpTrace).toEqual({
      request: { method: 'POST', url: 'https://example.test/posts' },
      response: { status: 201, body: '{}' },
    });
  });
});
