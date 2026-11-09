// 내 컴퓨터 러너의 테스트 저장소 받아 오기 — 케이스 경로에서 자리 뽑기 · 받는 명령 검사
import { describe, expect, it } from 'vitest';

import { 받기명령, 케이스자리 } from './repoPull.js';

describe('케이스자리', () => {
  it('받아 온 저장소들의 뿌리 기준 경로에서 <소유자>/<이름> 을 뽑는다', () => {
    expect(케이스자리('maxihan1/demo-market/tests/dmw/DMW-FN-001.spec.ts')).toBe('maxihan1/demo-market');
  });

  it.each(['dmw/DMW-FN-001.spec.ts', 'a/../tests/x.spec.ts', 'a/b/docs/x.md', '../a/tests/x.spec.ts'])('그 꼴이 아닌 %s 는 null', (경로) => {
    expect(케이스자리(경로)).toBeNull();
  });
});

describe('받기명령', () => {
  it('처음이면 임시 자리에 테스트 · 표만 풀어 받고 옮긴다 — 자격은 그 명령에만 빌린다', () => {
    const 명령 = 받기명령('/r', 'o/n', false);
    expect(명령[0]!.인자).toEqual(expect.arrayContaining(['clone', '--sparse', '--branch', 'main', 'https://github.com/o/n', '/r/o/n.받는중']));
    expect(명령[0]!.인자.join(' ')).toContain('credential.helper=!gh auth git-credential');
    expect(명령[1]).toEqual({ 인자: ['-C', '/r/o/n.받는중', 'sparse-checkout', 'set', '--no-cone', '/tests/', '/docs/cases/'], 옮기기: ['/r/o/n.받는중', '/r/o/n'] });
  });

  it('있으면 main 머리를 받아 그대로 맞춘다', () => {
    const 명령 = 받기명령('/r', 'o/n', true);
    expect(명령.map((c) => c.인자.slice(-4))).toEqual([
      ['--depth', '1', 'origin', 'main'],
      ['reset', '-q', '--hard', 'FETCH_HEAD'],
    ]);
  });
});
