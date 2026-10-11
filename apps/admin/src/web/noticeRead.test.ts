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

  it('서버 목록에 없어도 적은 지 얼마 안 된 열쇠는 둔다 — 늦게 온 응답이 방금 적은 읽음을 지우지 못하게', () => {
    읽음으로적는다(['run:1', 'run:2']);
    읽음정리(new Set(['run:2']));
    expect([...읽음들()].sort()).toEqual(['run:1', 'run:2']);
  });

  it('서버 목록에 없고 적은 지 8일이 지난 열쇠만 정리한다 — 목록이 끝없이 커지지 않게', () => {
    const 지금 = Date.now();
    const 일 = 86_400_000;
    보관.set('notice-read', JSON.stringify({ 'run:1': 지금 - 9 * 일, 'run:2': 지금 - 9 * 일, 'authoring:3': 지금 - 7 * 일 }));
    읽음정리(new Set(['run:2']), 지금);
    expect([...읽음들()].sort()).toEqual(['authoring:3', 'run:2']);
  });

  it('옛 꼴(열쇠 배열)이 저장돼 있으면 읽을 때 지금 시각으로 옮기고, 그때부터 8일 뒤에 정리된다', () => {
    보관.set('notice-read', JSON.stringify(['run:1']));
    expect([...읽음들()]).toEqual(['run:1']);
    expect(JSON.parse(보관.get('notice-read') ?? '')).toEqual({ 'run:1': expect.any(Number) });
    읽음정리(new Set(), Date.now() + 9 * 86_400_000);
    expect(읽음들().size).toBe(0);
  });

  it('저장된 값이 깨져 있으면 빈 목록으로 본다', () => {
    보관.set('notice-read', '{깨진');
    expect(읽음들().size).toBe(0);
    보관.set('notice-read', '{"a":"x"}');
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
