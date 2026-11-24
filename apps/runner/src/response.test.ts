// 러너의 답 — 받은 케이스 판정 줄로 답을 만들고 줄이 없는 케이스만 표대로 채우는지 검사한다 (SPEC 도메인/러너 §5.2 「프로시저 실행」 「못 간 케이스 채우기」)

import { 판정줄, type CaseResult, type ExecuteCase, type StepResult } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { 증적상태, 케이스응답, type 끝난자식 } from './response.js';
import type { RunnerResult } from './result.js';

const 시작 = Date.parse('2026-11-24T00:00:00.000Z');
const 지금 = 시작 + 200_000;
const 케이스들 = (...ids: string[]): ExecuteCase[] => ids.map((tcId) => ({ tcId, params: {}, expected: {} }));
const 절차 = (seq: number, tcId?: string): StepResult => ({ seq, title: `절차 ${String(seq)}`, status: 'PASS', durationMs: 1, assertions: [], ...(tcId !== undefined && { tcId }) });

const 판정 = (tcId: string, status: CaseResult['status'], 덧: Partial<CaseResult> = {}): CaseResult => ({ tcId, status, durationMs: 1000, steps: [], ...덧 });
const 통과 = (tcId: string, 끝초: number): CaseResult =>
  판정(tcId, 'PASS', { startedAt: new Date(시작).toISOString(), finishedAt: new Date(시작 + 끝초 * 1000).toISOString() });
// kit 이 쓰는 줄 그대로다
const 줄 = (...판정들: CaseResult[]): string => 판정들.map(판정줄).join('');
const 결과줄 = (r: Partial<RunnerResult>): string => `@@RESULT@@${JSON.stringify({ status: 'PASS', durationMs: 5, steps: [], ...r })}\n`;

function 답(cases: ExecuteCase[], 덧: Partial<끝난자식>) {
  const 자식: 끝난자식 = { killedBy: null, code: 0, startedAt: 시작, stdout: '', stderr: '', ...덧 };
  return 케이스응답(9, cases, 자식, {}, 지금);
}
/** 케이스마다 [번호, 판정, 사유, 막은 케이스] — 없는 칸은 뺀다 */
const 요약 = (results: CaseResult[]): unknown[][] => results.map((r) => [r.tcId, r.status, r.error?.message, r.blockedBy].filter((v) => v !== undefined));

describe('케이스응답 — 받은 판정 줄', () => {
  it('줄이 다 있으면 요청의 케이스 차례대로 그대로 답한다 — 묶은 판정은 없다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stdout: 줄(통과('A-1', 10), 판정('A-2', 'FAIL')) });

    expect(요약(r.results)).toEqual([['A-1', 'PASS'], ['A-2', 'FAIL']]);
    expect(r).toMatchObject({ historyId: 9, durationMs: 200_000 });
    expect(r).not.toHaveProperty('status');
    // 통과가 아닌 케이스가 있으면 프로세스가 실패로 끝나는 것이 정상이다
    expect(r.error).toBeUndefined();
  });

  it('같은 케이스의 줄이 다시 오면 뒤 것을 쓴다 — 끝 정리 절차를 더한 줄이다', () => {
    const 앞 = 판정('A-1', 'PASS', { steps: [절차(1, 'A-1')] });
    const 뒤 = 판정('A-1', 'PASS', { steps: [절차(1, 'A-1'), 절차(2, 'A-1')] });

    expect(답(케이스들('A-1'), { stdout: 줄(앞, 뒤) }).results[0]?.steps).toHaveLength(2);
  });

  it('요청에 없는 케이스의 줄과 잘린 줄은 버린다', () => {
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = 답(케이스들('A-1', 'A-2'), { killedBy: 'ABORTED', stdout: `${줄(통과('A-1', 10), 판정('Z-9', 'FAIL'))}@@CASE@@{"tcId":"A-2","sta` });

    expect(요약(r.results)).toEqual([['A-1', 'PASS'], ['A-2', 'NA', 'ABORTED']]);
    경고.mockRestore();
  });

  it('케이스 코드가 줄바꿈 없이 찍은 글 뒤에 판정 줄이 붙어도 읽는다 — kit 이 줄 앞에 줄바꿈을 둔다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { stdout: `loading...${줄(통과('A-1', 10))}불러오는 중${줄(통과('A-2', 20))}` });

    expect(요약(r.results)).toEqual([['A-1', 'PASS'], ['A-2', 'PASS']]);
  });

  it('리포터 결과 줄을 못 읽어도 받은 판정으로 답한다 — 판정을 하나도 못 받았으면 러너 고장으로 던진다', () => {
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const 자식: 끝난자식 = { killedBy: null, code: 1, startedAt: 시작, stdout: `${줄(통과('A-1', 10), 판정('A-2', 'FAIL'))}@@RESULT@@{"status":"FA\n`, stderr: '' };

    expect(요약(케이스응답(9, 케이스들('A-1', 'A-2'), 자식, {}, 지금).results)).toEqual([['A-1', 'PASS'], ['A-2', 'FAIL']]);
    expect(() => 답(케이스들('A-1'), { code: 0, stdout: '@@RESULT@@{"status":"PA\n' })).toThrow('@@RESULT@@ 줄을 읽지 못했다');
    경고.mockRestore();
  });

  it('Playwright 가 오류 글에 섞은 색 코드를 걷는다', () => {
    const r = 답(케이스들('A-1'), { code: 1, stdout: 줄(판정('A-1', 'FAIL', { error: { message: '\u001b[31m요소를 찾지 못했다\u001b[39m' } })) });

    expect(r.results[0]?.error?.message).toBe('요소를 찾지 못했다');
  });

  it('기기 정보와 FPS 는 실행 단위에 한 벌이라 답 맨 위에 싣는다', () => {
    const 기기 = { model: 'SM-G996N', osVersion: '14', appVersion: '1.2.0' };
    const 자식: 끝난자식 = { killedBy: null, code: 0, startedAt: 시작, stdout: 줄(통과('A-1', 10)) + 결과줄({ device: 기기 }), stderr: '' };
    const r = 케이스응답(9, 케이스들('A-1'), 자식, { fps: [{ seq: 1, fps: 60 }] }, 지금);

    expect(r).toMatchObject({ device: 기기, fps: [{ seq: 1, fps: 60 }] });
  });
});

describe('케이스응답 — 못 간 케이스 채우기', () => {
  it.each(['TIMEOUT', 'ABORTED'] as const)('러너가 끊었으면(%s) 끝난 케이스의 판정은 남기고 줄이 없는 케이스는 모두 NA + 그 사유다 — Blocked 가 아니다', (killedBy) => {
    const r = 답(케이스들('A-1', 'A-2', 'A-3', 'A-4'), { killedBy, code: null, stdout: 줄(통과('A-1', 10), 통과('A-2', 50)) });

    expect(요약(r.results)).toEqual([['A-1', 'PASS'], ['A-2', 'PASS'], ['A-3', 'NA', killedBy], ['A-4', 'NA', killedBy]]);
    expect(r.error).toEqual({ message: killedBy });
    // 돌던 케이스(줄이 없는 첫 케이스)의 시계는 앞 케이스가 끝난 때부터다. 못 간 케이스는 시각이 없다
    expect(r.results[2]).toMatchObject({ durationMs: 150_000, startedAt: new Date(시작 + 50_000).toISOString() });
    expect(r.results[2]).not.toHaveProperty('finishedAt');
    expect(r.results[3]).toMatchObject({ durationMs: 0 });
    expect(r.results[3]).not.toHaveProperty('startedAt');
  });

  it('돌던 케이스의 시작은 그 앞 케이스가 끝난 때만 본다 — 자식이 쓴 시각을 못 읽으면 프로세스를 띄운 때다', () => {
    const 깨진시각 = 판정('A-1', 'PASS', { finishedAt: '날짜가 아니다' });
    const r = 답(케이스들('A-1', 'A-2'), { killedBy: 'TIMEOUT', code: null, stdout: 줄(깨진시각) });

    expect(r.results[1]).toMatchObject({ status: 'NA', durationMs: 200_000, startedAt: new Date(시작).toISOString() });
  });

  it('시작할 때 줄이 나간 보류 케이스는 끊겨도 보류 그대로다 — 돌던 케이스는 그 앞의 줄 없는 케이스다', () => {
    const 보류 = 판정('A-2', 'NA', { durationMs: 0, error: { message: '보류 — 값을 채워야 한다' } });
    const r = 답(케이스들('A-1', 'A-2', 'A-3'), { killedBy: 'TIMEOUT', code: null, stdout: 줄(보류) });

    expect(요약(r.results)).toEqual([['A-1', 'NA', 'TIMEOUT'], ['A-2', 'NA', '보류 — 값을 채워야 한다'], ['A-3', 'NA', 'TIMEOUT']]);
    expect(r.results[0]).toMatchObject({ durationMs: 200_000 });
  });

  it('스스로 끝났는데 줄이 모자라면 돌던 케이스는 NA + 프로세스 오류 글, 그 뒤는 그 케이스에 막힌 Blocked 다 — 앞 케이스의 실패 탓으로 돌리지 않는다', () => {
    const r = 답(케이스들('A-1', 'A-2', 'A-3', 'A-4'), { code: 1, stdout: 줄(판정('A-1', 'FAIL'), 통과('A-2', 30)), stderr: 'Error: worker process exited unexpectedly\n' });

    expect(요약(r.results)).toEqual([
      ['A-1', 'FAIL'],
      ['A-2', 'PASS'],
      ['A-3', 'NA', 'Error: worker process exited unexpectedly'],
      ['A-4', 'NA', 'BLOCKED', 'A-3'],
    ]);
    expect(r.error).toBeUndefined();
  });

  it('프로세스 오류 글은 stderr 가 비었으면 stdout 꼬리다 — kit 경고 줄은 사유로 치지 않는다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stdout: `${줄(통과('A-1', 10))}[kit] 끼어든 창을 닫았다\nSegmentation fault\n`, stderr: '[kit] 장면을 걸지 못했다\n' });

    expect(r.results[1]?.error?.message).toBe('Segmentation fault');
  });

  it('스스로 끝났고 줄이 하나도 없으면(파일을 못 읽었다) 모두 지금 꼴 그대로 FAIL + 오류 글이다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stderr: 'SyntaxError: Unexpected token\n' });

    expect(요약(r.results)).toEqual([['A-1', 'FAIL', 'SyntaxError: Unexpected token'], ['A-2', 'FAIL', 'SyntaxError: Unexpected token']]);
  });

  it('첫 줄이 나기 전에 끊겼으면 모두 NA + 그 사유다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { killedBy: 'ABORTED', code: null });

    expect(요약(r.results)).toEqual([['A-1', 'NA', 'ABORTED'], ['A-2', 'NA', 'ABORTED']]);
    expect(r.error).toEqual({ message: 'ABORTED' });
  });

  it('선언하지 않은 환경으로 불려 건너뛴 프로시저는 케이스마다 NA + 건너뛴 사유다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { stdout: 결과줄({ status: 'NA', error: { message: 'DEMO-TP-001은 PC 환경을 선언하지 않았다' } }) });

    expect(요약(r.results)).toEqual([['A-1', 'NA', 'DEMO-TP-001은 PC 환경을 선언하지 않았다'], ['A-2', 'NA', 'DEMO-TP-001은 PC 환경을 선언하지 않았다']]);
  });

  it('케이스가 여럿인데 줄이 하나도 없으면 결과 줄이 통과여도 통과로 치지 않는다', () => {
    const r = 답(케이스들('A-1', 'A-2'), { stdout: 결과줄({ status: 'PASS' }) });

    expect(r.results.map((x) => x.status)).toEqual(['FAIL', 'FAIL']);
    expect(r.results[0]?.error?.message).toBe('케이스 판정 줄 없이 프로세스가 끝났다');
  });
});

describe('케이스응답 — 옛 꼴 파일(케이스 1건짜리 목록)', () => {
  it('리포터 결과 줄을 케이스 한 건으로 옮겨 담는다 — 판정 · 걸린 시간 · 절차 · 사유 · 게임 기록이 그대로다', () => {
    const 결과 = { status: 'FAIL' as const, durationMs: 4321, steps: [절차(1), 절차(2)], error: { message: '요소를 찾지 못했다' }, elementChecks: [{ key: 'item:sword', serverValue: 3, same: true }], apiCalls: [{ method: 'POST', path: '/gm/gold', status: 200 }] };
    const 자식: 끝난자식 = { killedBy: null, code: 1, startedAt: 시작, stdout: 결과줄(결과), stderr: '' };
    const r = 케이스응답(9, 케이스들('TODO-001'), 자식, {}, 지금);

    expect(r.results).toEqual([{ tcId: 'TODO-001', ...결과 }]);
    expect(r.error).toBeUndefined();
  });

  it('제한 시간 초과 · 건너뜀도 리포터가 정한 그대로다', () => {
    const r = 답(케이스들('TODO-001'), { code: 1, stdout: 결과줄({ status: 'NA', error: { message: 'Test timeout of 120000ms exceeded.' } }) });

    expect(요약(r.results)).toEqual([['TODO-001', 'NA', 'Test timeout of 120000ms exceeded.']]);
  });

  it('러너가 끊었으면 NA + 그 사유이고 그때까지 나온 절차를 남긴다', () => {
    const r = 답(케이스들('TODO-001'), { killedBy: 'TIMEOUT', code: null, stdout: 결과줄({ steps: [절차(1)] }) });

    expect(요약(r.results)).toEqual([['TODO-001', 'NA', 'TIMEOUT']]);
    expect(r.results[0]?.steps).toHaveLength(1);
    expect(r.error).toEqual({ message: 'TIMEOUT' });
  });

  it('끊는 바람에 결과 줄이 잘렸으면 절차를 비우고 예외를 밖으로 내보내지 않는다', () => {
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = 답(케이스들('TODO-001'), { killedBy: 'ABORTED', code: null, stdout: '@@RESULT@@{"steps":[' });

    expect(r.results).toMatchObject([{ status: 'NA', steps: [], error: { message: 'ABORTED' } }]);
    경고.mockRestore();
  });

  it('결과 줄 없이 0 으로 끝났으면 통과다', () => {
    expect(요약(답(케이스들('TODO-001'), {}).results)).toEqual([['TODO-001', 'PASS']]);
  });
});

describe('케이스응답 — 판정이 다 난 뒤에 프로세스가 실패로 끝났다', () => {
  it('케이스 판정은 그대로 두고 오류 글을 답 맨 위에 싣는다 — 케이스가 틀린 것이 아니라 파일이 잘못됐다', () => {
    const 글 = 'DEMO-TP-001: 마지막 케이스 뒤에 절차를 두었거나 test.case 를 다시 불렀다';
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stdout: 줄(통과('A-1', 10), 통과('A-2', 20)) + 결과줄({ status: 'FAIL', error: { message: 글 } }) });

    expect(요약(r.results)).toEqual([['A-1', 'PASS'], ['A-2', 'PASS']]);
    expect(r.error).toEqual({ message: 글 });
  });

  it('보류 케이스는 테스트를 실패로 끝내지 않는다 — 통과와 보류뿐인데 실패로 끝났으면 싣는다', () => {
    const 보류 = 판정('A-2', 'NA', { durationMs: 0, error: { message: '보류 — 값을 채워야 한다' } });
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stdout: 줄(보류, 통과('A-1', 10)), stderr: 'Error: 정리 단계가 깨졌다\n' });

    expect(r.error).toEqual({ message: 'Error: 정리 단계가 깨졌다' });
  });

  it.each([
    ['실패', 판정('A-2', 'FAIL')],
    ['Blocked', 판정('A-2', 'NA', { durationMs: 0, error: { message: 'BLOCKED' }, blockedBy: 'A-1' })],
    ['한도 초과', 판정('A-2', 'NA', { startedAt: new Date(시작).toISOString(), error: { message: 'Test timeout of 120000ms exceeded.' } })],
  ])('%s 케이스가 있으면 프로세스가 실패로 끝나는 것이 정상이라 싣지 않는다', (_무엇, 둘째) => {
    const r = 답(케이스들('A-1', 'A-2'), { code: 1, stdout: 줄(통과('A-1', 10), 둘째) + 결과줄({ status: 'FAIL', error: { message: '검증 실패: 값이 같다' } }) });

    expect(r.error).toBeUndefined();
  });

  it('통째로 건너뛴 프로시저(모두 보류 · 바뀐 프로시저)는 0 으로 끝나 싣지 않는다', () => {
    const 바뀜 = (tcId: string) => 판정(tcId, 'NA', { durationMs: 0, error: { message: 'PROCEDURE_CHANGED' } });
    const r = 답(케이스들('A-1', 'A-2'), { code: 0, stdout: 줄(바뀜('A-1'), 바뀜('A-2')) + 결과줄({ status: 'NA', error: { message: '건너뜀' } }) });

    expect(요약(r.results)).toEqual([['A-1', 'NA', 'PROCEDURE_CHANGED'], ['A-2', 'NA', 'PROCEDURE_CHANGED']]);
    expect(r.error).toBeUndefined();
  });
});

describe('증적상태', () => {
  it('통과가 아닌 케이스가 하나라도 있으면 증적을 남긴다', () => {
    const 머리 = { historyId: 1, durationMs: 1 };
    expect(증적상태({ ...머리, results: [판정('A-1', 'PASS'), 판정('A-2', 'PASS')] })).toBe('PASS');
    expect(증적상태({ ...머리, results: [판정('A-1', 'PASS'), 판정('A-2', 'NA')] })).toBe('FAIL');
  });
});
