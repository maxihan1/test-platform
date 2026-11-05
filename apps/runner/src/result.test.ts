// 자식 프로세스의 stdout에서 결과 줄을 골라내는 규칙을 검사한다. 러너는 이 줄 하나만 믿는다 (SPEC §5.2)

import { describe, expect, it } from 'vitest';

import { kit경고, parseResult } from './result.js';

const line = (payload: unknown) => `@@RESULT@@${JSON.stringify(payload)}`;

describe('parseResult', () => {
  it('결과 줄이 없으면 아무것도 돌려주지 않는다', () => {
    expect(parseResult('Running 1 test using 1 worker\n  1 passed (3.2s)\n')).toBeNull();
  });

  it('다른 출력에 섞여 있어도 결과 줄만 골라 읽는다', () => {
    const stdout = [
      '브라우저를 띄우는 중',
      line({ historyId: 0, status: 'PASS', durationMs: 120, steps: [{ seq: 1, title: '화면을 연다', status: 'PASS', durationMs: 100, assertions: [] }] }),
      '실행이 끝났다',
    ].join('\n');

    const parsed = parseResult(stdout);

    expect(parsed?.status).toBe('PASS');
    expect(parsed?.durationMs).toBe(120);
    expect(parsed?.steps[0].title).toBe('화면을 연다');
  });

  it('결과 줄이 여러 개면 마지막 것을 쓴다', () => {
    const stdout = [
      line({ historyId: 0, status: 'PASS', durationMs: 1, steps: [] }),
      line({ historyId: 0, status: 'FAIL', durationMs: 2, steps: [] }),
    ].join('\n');

    expect(parseResult(stdout)?.status).toBe('FAIL');
  });

  it('결과 줄이 깨져 있으면 러너 고장으로 올린다', () => {
    expect(() => parseResult('@@RESULT@@{망가진')).toThrow(/@@RESULT@@/);
  });
});

describe('kit경고', () => {
  it('자식 출력에서 kit 경고 줄만 한 번씩 골라 낸다 — 장면을 못 건 까닭을 러너 기록에 남긴다', () => {
    const 출력 = [
      '보통 출력',
      '[kit] 테스트 모드 장면이 2000ms 동안 한 장도 안 와 탭을 직접 찍는다',
      '\u001b[33m[kit] 테스트 모드 장면을 못 찍었다: 탭이 닫혔다\u001b[39m',
      '  [kit] 테스트 모드 장면이 2000ms 동안 한 장도 안 와 탭을 직접 찍는다',
      '[runner] 다른 줄',
    ].join('\n');

    expect(kit경고(출력)).toEqual([
      '[kit] 테스트 모드 장면이 2000ms 동안 한 장도 안 와 탭을 직접 찍는다',
      '[kit] 테스트 모드 장면을 못 찍었다: 탭이 닫혔다',
    ]);
  });
});
