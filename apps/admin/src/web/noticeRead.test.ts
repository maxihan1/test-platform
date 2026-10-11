import { beforeEach, describe, expect, it, vi } from 'vitest';

import { 읽음들, 읽음으로적는다, 읽음정리 } from './noticeRead.js';

// 노드 환경이라 브라우저 저장소 가짜를 끼운다 (runState.test.ts 와 같은 방식)
const 보관 = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => 보관.get(key) ?? null,
  setItem: (key: string, value: string) => 보관.set(key, value),
});

beforeEach(() => 보관.clear());

describe('알림 읽음 (이 브라우저에만)', () => {
  it('적은 열쇠를 다시 읽는다. 같은 열쇠를 또 적어도 하나다', () => {
    읽음으로적는다(['run:1', 'authoring:2']);
    읽음으로적는다(['run:1']);
    expect([...읽음들()].sort()).toEqual(['authoring:2', 'run:1']);
  });

  it('서버 목록에 없는 열쇠는 정리한다 — 목록이 끝없이 커지지 않게', () => {
    읽음으로적는다(['run:1', 'run:2', 'authoring:3']);
    읽음정리(new Set(['run:2', 'authoring:3', 'run:9']));
    expect([...읽음들()].sort()).toEqual(['authoring:3', 'run:2']);
  });

  it('저장된 값이 깨져 있으면 빈 목록으로 본다', () => {
    보관.set('notice-read', '{깨진');
    expect(읽음들().size).toBe(0);
    보관.set('notice-read', '{"a":1}');
    expect(읽음들().size).toBe(0);
  });

  it('저장소 접근이 던져도(비공개 창) 알림은 뜬다 — 읽음을 못 남길 뿐이다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('막힘');
      },
      setItem: () => {
        throw new Error('막힘');
      },
    });
    expect(읽음들().size).toBe(0);
    expect(() => 읽음으로적는다(['run:1'])).not.toThrow();
    expect(() => 읽음정리(new Set())).not.toThrow();
  });
});
