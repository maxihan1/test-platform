import type { ExecuteResponse } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 시작한다, 읽는다, 전부비운다, TrialBusyError } from './trial.js';

const 명세 = {
  paramSchema: { type: 'object', properties: { loginId: { type: 'string' }, password: { type: 'string', secret: true } } },
  expectedSchema: { type: 'object', properties: { token: { type: 'string' } } },
  params: { loginId: 'u', password: 'p4ssw0rd!' },
  expected: { token: 'tok-9999' },
};

function 결과(덧: Partial<ExecuteResponse> = {}): ExecuteResponse {
  return { historyId: 1, status: 'PASS', durationMs: 10, steps: [], ...덧 };
}

function 미룬것() {
  let 끝냄!: (r: ExecuteResponse) => void;
  let 던짐!: (e: unknown) => void;
  const promise = new Promise<ExecuteResponse>((res, rej) => {
    끝냄 = res;
    던짐 = rej;
  });
  return { promise, 끝냄, 던짐 };
}

describe('테스트 실행 메모리 저장소', () => {
  beforeEach(전부비운다);
  afterEach(() => {
    vi.useRealTimers();
  });

  it('시작하면 RUNNING 이고 러너 응답이 오면 DONE 과 결과다', async () => {
    const 러너 = 미룬것();
    const id = 시작한다('kim', () => 러너.promise, 명세);
    expect(읽는다('kim', id)).toEqual({ status: 'RUNNING' });

    러너.끝냄(결과({ durationMs: 77 }));
    await vi.waitFor(() => expect(읽는다('kim', id)?.status).toBe('DONE'));
    expect(읽는다('kim', id)).toEqual({ status: 'DONE', result: 결과({ durationMs: 77 }) });
  });

  it('러너에 못 닿으면 NA 와 안내 문장이고 원문은 stack 에 있다', async () => {
    const id = 시작한다('kim', () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:4001')), 명세);
    await vi.waitFor(() => expect(읽는다('kim', id)?.status).toBe('DONE'));
    const 읽음 = 읽는다('kim', id);
    expect(읽음).toMatchObject({
      status: 'DONE',
      result: {
        status: 'NA',
        steps: [],
        error: {
          message: '내 컴퓨터 러너에 닿지 못했습니다. 맥에서 npm run runner:local 을 켜 두었는지 보세요',
          stack: 'connect ECONNREFUSED 127.0.0.1:4001',
        },
      },
    });
  });

  it('시작한 사람만 읽는다 — 남이 읽으면 null 이다', () => {
    const id = 시작한다('kim', () => 미룬것().promise, 명세);
    expect(읽는다('lee', id)).toBeNull();
    expect(읽는다('kim', '없는-번호')).toBeNull();
  });

  it('한 사람이 돌리는 중에 또 시작하면 TRIAL_BUSY 로 거절한다', async () => {
    const 러너 = 미룬것();
    시작한다('kim', () => 러너.promise, 명세);
    expect(() => 시작한다('kim', () => 미룬것().promise, 명세)).toThrow(TrialBusyError);
    expect(() => 시작한다('lee', () => 미룬것().promise, 명세)).not.toThrow();

    러너.끝냄(결과());
    await vi.waitFor(() => expect(() => 시작한다('kim', () => 미룬것().promise, 명세)).not.toThrow());
  });

  it('전체 50건을 넘으면 가장 오래된 끝난 것부터 버린다', async () => {
    const 번호: string[] = [];
    for (let i = 0; i < 50; i += 1) {
      번호.push(시작한다(`u${i}`, () => Promise.resolve(결과()), 명세));
    }
    await vi.waitFor(() => expect(읽는다('u49', 번호[49]!)?.status).toBe('DONE'));

    const 새것 = 시작한다('새사람', () => 미룬것().promise, 명세);
    expect(읽는다('u0', 번호[0]!)).toBeNull();
    expect(읽는다('u1', 번호[1]!)?.status).toBe('DONE');
    expect(읽는다('새사람', 새것)).toEqual({ status: 'RUNNING' });
  });

  it('50건이 전부 돌고 있으면 51번째는 TRIAL_BUSY 로 거절한다', () => {
    for (let i = 0; i < 50; i += 1) 시작한다(`u${i}`, () => 미룬것().promise, 명세);
    expect(() => 시작한다('새사람', () => 미룬것().promise, 명세)).toThrow(TrialBusyError);
  });

  it('24시간 지난 것은 새로 시작할 때 치운다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T00:00:00Z'));
    const 옛것 = 시작한다('kim', () => Promise.resolve(결과()), 명세);
    await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(new Date('2026-10-01T00:00:01Z'));
    expect(읽는다('kim', 옛것)?.status).toBe('DONE');

    시작한다('lee', () => 미룬것().promise, 명세);
    expect(읽는다('kim', 옛것)).toBeNull();
  });

  it('결과의 단계·오류 어디에도 비밀값 원문이 없다', async () => {
    const id = 시작한다(
      'kim',
      () =>
        Promise.resolve(
          결과({
            status: 'FAIL',
            error: { message: 'p4ssw0rd! 로 로그인 실패', stack: 'at tok-9999 …' },
            steps: [
              {
                seq: 1,
                title: '비밀번호 p4ssw0rd! 를 입력한다',
                status: 'FAIL',
                durationMs: 1,
                assertions: [],
                error: { message: '값 p4ssw0rd! 가 틀렸다', stack: 'tok-9999' },
                httpTrace: { request: { body: { password: 'p4ssw0rd!' } }, response: { note: 'tok-9999' } },
              },
            ],
          }),
        ),
      명세,
    );
    await vi.waitFor(() => expect(읽는다('kim', id)?.status).toBe('DONE'));
    const 글 = JSON.stringify(읽는다('kim', id));
    expect(글).not.toContain('p4ssw0rd!');
    expect(글).not.toContain('tok-9999');
    expect(글).toContain('********');
    expect(글).toContain('로 로그인 실패');
  });

  it('비밀이 아닌 값은 그대로 둔다', async () => {
    const id = 시작한다(
      'kim',
      () => Promise.resolve(결과({ steps: [{ seq: 1, title: 'u 로 로그인한다', status: 'PASS', durationMs: 1, assertions: [] }] })),
      명세,
    );
    await vi.waitFor(() => expect(읽는다('kim', id)?.status).toBe('DONE'));
    expect(JSON.stringify(읽는다('kim', id))).toContain('u 로 로그인한다');
  });
});
