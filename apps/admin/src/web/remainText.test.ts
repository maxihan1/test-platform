import { describe, expect, it } from 'vitest';

import { 시간글자, 실행남은글, 작성남은글 } from './remainText.js';

const 지금 = Date.parse('2026-10-11T05:00:00Z');
const 분 = 60_000;

describe('실행남은글', () => {
  it('아직 못 쟀으면 계산 중이라 적는다 — 0 분으로 지어내지 않는다', () => {
    expect(실행남은글(null, 지금, 'ko')).toBe('남은 시간 계산 중');
  });

  it('1분이 안 남았으면 1분 미만이라 적는다', () => {
    expect(실행남은글(59_000, 지금, 'ko')).toBe('1분 미만 남음');
    expect(실행남은글(0, 지금, 'ko')).toBe('1분 미만 남음');
  });

  it('그 밖에는 분으로 올려 남은 시간과 끝날 시각을 적는다', () => {
    const 글 = 실행남은글(4 * 분 + 10_000, 지금, 'ko');
    expect(글).toMatch(/^약 5분 남음 · \d{2}:\d{2} 종료 예상$/);
  });

  it('영어도 같은 꼴이다', () => {
    expect(실행남은글(null, 지금, 'en')).toBe('Estimating time left');
    expect(실행남은글(2 * 분, 지금, 'en')).toMatch(/^About 2m left · expected to end \d{2}:\d{2}$/);
  });
});

describe('작성남은글', () => {
  it('평소 걸린 시간을 모르면 만들지 않는다', () => {
    expect(작성남은글(5 * 분, 지금, null, 'ko')).toBeNull();
    expect(작성남은글(5 * 분, 지금, undefined, 'ko')).toBeNull();
  });

  it('평소보다 덜 지났으면 남은 시간 · 종료 예상 · 몇 건 기준인지를 적는다', () => {
    const 글 = 작성남은글(12 * 분, 지금, { ms: 18 * 분, samples: 8 }, 'ko');
    expect(글).toMatch(/^약 6분 남음 · \d{2}:\d{2} 종료 예상 · 최근 8건 기준$/);
  });

  it('평소보다 오래 걸리면 얼마나 넘었는지를 적는다', () => {
    expect(작성남은글(20 * 분, 지금, { ms: 18 * 분, samples: 8 }, 'ko')).toBe('평소보다 2분 더 걸리고 있습니다');
    expect(작성남은글(18 * 분, 지금, { ms: 18 * 분, samples: 8 }, 'ko')).toBe('평소보다 1분 더 걸리고 있습니다');
  });
});

describe('시간글자', () => {
  it('초 · 분 · 분 초로 적는다', () => {
    expect(시간글자(45_000, 'ko')).toBe('45초');
    expect(시간글자(5 * 분, 'ko')).toBe('5분');
    expect(시간글자(5 * 분 + 7_000, 'ko')).toBe('5분 7초');
  });
});
