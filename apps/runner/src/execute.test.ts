// 러너 실행 로직의 단위 테스트. 판정 규칙과 경로 검증은 자식 프로세스 없이 확인할 수 있어야 한다

import { describe, expect, it } from 'vitest';

import { killedResponse, resolveSpecPath, statusFromExit } from './execute.js';

describe('statusFromExit', () => {
  it('exit code 0이면 PASS다', () => {
    expect(statusFromExit(0, false)).toBe('PASS');
  });

  it('exit code가 0이 아니면 FAIL이다', () => {
    expect(statusFromExit(1, false)).toBe('FAIL');
  });

  it('타임아웃으로 죽인 경우는 판정 불가라 NA다', () => {
    expect(statusFromExit(null, true)).toBe('NA');
  });
});

describe('killedResponse', () => {
  const 한절차 = { seq: 1, title: '로그인', status: 'PASS', durationMs: 3, assertions: [] };
  const 결과줄 = `@@RESULT@@${JSON.stringify({ status: 'PASS', durationMs: 5, steps: [한절차] })}\n`;

  it('끊긴 실행도 타임아웃과 같은 모양이고 사유만 갈린다', () => {
    const 끊김 = killedResponse(7, 'ABORTED', 12, '');
    const 시간초과 = killedResponse(7, 'TIMEOUT', 12, '');

    expect(끊김.status).toBe('NA');
    expect(시간초과.status).toBe('NA');
    expect(끊김.error?.message).toBe('ABORTED');
    expect(시간초과.error?.message).toBe('TIMEOUT');
  });

  it('죽이기 전까지 나온 절차는 그대로 남긴다', () => {
    expect(killedResponse(7, 'ABORTED', 12, 결과줄).steps).toHaveLength(1);
  });

  it('결과 줄이 없으면 절차는 빈 목록이다', () => {
    expect(killedResponse(7, 'TIMEOUT', 12, '').steps).toEqual([]);
  });

  it('죽이는 바람에 결과 줄이 잘렸으면 빈 목록으로 접고 예외를 밖으로 내보내지 않는다', () => {
    expect(killedResponse(7, 'ABORTED', 12, '@@RESULT@@{"steps":[').steps).toEqual([]);
  });
});

describe('resolveSpecPath', () => {
  it('테스트 루트 안의 경로는 절대 경로로 풀어준다', () => {
    expect(resolveSpecPath('/tests', 'demo/DEMO-001.spec.ts')).toBe('/tests/demo/DEMO-001.spec.ts');
  });

  it('테스트 루트 밖으로 나가는 경로는 거부한다', () => {
    expect(resolveSpecPath('/tests', '../etc/passwd')).toBeNull();
  });

  it('절대 경로로 루트를 갈아치우려는 요청도 거부한다', () => {
    expect(resolveSpecPath('/tests', '/etc/passwd')).toBeNull();
  });
});
