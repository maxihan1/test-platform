// 러너 실행 로직의 단위 테스트. 판정 규칙과 경로 검증은 자식 프로세스 없이 확인할 수 있어야 한다

import { describe, expect, it } from 'vitest';

import { resolveSpecPath, statusFromExit } from './execute.js';

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
