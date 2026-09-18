import { describe, expect, it } from 'vitest';

import { 검증, 무작위비밀번호, 해시 } from './password.js';

describe('비밀번호', () => {
  it('해시에 원문이 남지 않는다', async () => {
    const 저장값 = await 해시('correct horse');
    expect(저장값).not.toContain('correct horse');
    expect(저장값.startsWith('scrypt$')).toBe(true);
  });

  it('같은 원문이라도 매번 다른 값으로 저장된다', async () => {
    expect(await 해시('같은말')).not.toBe(await 해시('같은말'));
  });

  it('맞으면 통과하고 틀리면 막는다', async () => {
    const 저장값 = await 해시('correct horse');
    expect(await 검증('correct horse', 저장값)).toBe(true);
    expect(await 검증('correct horsf', 저장값)).toBe(false);
  });

  it('저장된 값이 망가져 있으면 통과시키지 않는다', async () => {
    expect(await 검증('아무거나', '')).toBe(false);
    expect(await 검증('아무거나', 'scrypt$xx')).toBe(false);
  });

  it('무작위 비밀번호는 매번 다르고 사람이 옮겨 적을 만큼 짧다', () => {
    const 첫번째 = 무작위비밀번호();
    expect(첫번째).not.toBe(무작위비밀번호());
    expect(첫번째.length).toBeGreaterThanOrEqual(12);
    expect(첫번째.length).toBeLessThanOrEqual(20);
  });
});
