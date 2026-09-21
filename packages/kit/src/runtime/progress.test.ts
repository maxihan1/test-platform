import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StepProgress } from '../types.js';
import { 알린다, 진행줄 } from './progress.js';
import { PROGRESS_MARKER } from './protocol.js';

describe('진행줄', () => {
  const 시작: StepProgress = { historyId: 12, seq: 3, title: '로그인 API를 호출한다' };

  it('표시자로 열고 개행 하나로 닫는 한 줄을 만든다', () => {
    const 줄 = 진행줄(시작);

    expect(줄.startsWith(PROGRESS_MARKER)).toBe(true);
    expect(줄.endsWith('\n')).toBe(true);
    expect(줄.slice(0, -1)).not.toContain('\n');
  });

  it('다른 출력에 섞여도 표시자로 갈라 원래 값을 되찾는다', () => {
    const 섞인줄 = `앞선 출력\n${진행줄(시작)}뒤따르는 출력\n`;

    const 뒤 = 섞인줄.split(PROGRESS_MARKER)[1];
    const 몸통 = 뒤.slice(0, 뒤.indexOf('\n'));

    expect(JSON.parse(몸통)).toEqual(시작);
  });

  it('흐른 시간 칸을 만들지 않는다', () => {
    expect(진행줄(시작)).not.toContain('elapsedMs');
  });
});

describe('알린다', () => {
  const 원래환경 = process.env.PLATFORM_HISTORY_ID;

  afterEach(() => {
    vi.restoreAllMocks();
    if (원래환경 === undefined) delete process.env.PLATFORM_HISTORY_ID;
    else process.env.PLATFORM_HISTORY_ID = 원래환경;
  });

  it('PLATFORM_HISTORY_ID가 있으면 출력 함수를 한 번 부른다', () => {
    process.env.PLATFORM_HISTORY_ID = '12';
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    알린다(3, '로그인 API를 호출한다');

    expect(쓰기).toHaveBeenCalledTimes(1);
    expect(쓰기).toHaveBeenCalledWith(진행줄({ historyId: 12, seq: 3, title: '로그인 API를 호출한다' }));
  });

  it('PLATFORM_HISTORY_ID가 없으면 출력 함수를 한 번도 부르지 않는다', () => {
    delete process.env.PLATFORM_HISTORY_ID;
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    알린다(3, '로그인 API를 호출한다');

    expect(쓰기).not.toHaveBeenCalled();
  });

  it('출력 함수가 던져도 알린다는 던지지 않는다', () => {
    process.env.PLATFORM_HISTORY_ID = '12';
    vi.spyOn(process.stdout, 'write').mockImplementation(() => {
      throw new Error('파이프가 닫혔다');
    });

    expect(() => 알린다(3, '로그인 API를 호출한다')).not.toThrow();
  });
});
