import { describe, expect, it } from 'vitest';
import type { ItemStatus, Platform } from '@platform/kit';
import { 카드쪽크기, 연속실패수, 쪽을자른다, 케이스로묶는다 } from './failuresShape.js';

type 행 = Parameters<typeof 케이스로묶는다>[0][number];

const 행만들기 = (
  historyId: number,
  tcId: string,
  platform: Platform,
  attempt: number,
  status: ItemStatus,
): 행 => ({ historyId, tcId, tcName: `${tcId} 이름`, platform, attempt, status });

const 표 = (줄: [string, Platform, '새로깨짐' | '계속깨짐' | null][]) =>
  new Map(줄.map(([tcId, platform, 변화]) => [`${tcId}|${platform}`, 변화]));

describe('케이스로묶는다', () => {
  it('실패를 케이스로 묶고 신규 → 연속 → 견줄 앞 없음 → tcId 순으로 세운다', () => {
    const 행들 = [
      행만들기(1, 'A-1', 'desktop', 1, 'FAIL'),
      행만들기(2, 'B-1', 'desktop', 1, 'FAIL'),
      행만들기(3, 'C-1', 'desktop', 1, 'FAIL'),
      행만들기(4, 'D-1', 'desktop', 1, 'FAIL'),
      행만들기(5, 'D-1', 'mobile', 1, 'FAIL'),
    ];
    const 결과 = 케이스로묶는다(
      행들,
      표([
        ['A-1', 'desktop', null],
        ['B-1', 'desktop', '계속깨짐'],
        ['C-1', 'desktop', '새로깨짐'],
        ['D-1', 'desktop', '계속깨짐'],
        ['D-1', 'mobile', '새로깨짐'],
      ]),
    );
    expect(결과.map((c) => c.tcId)).toEqual(['C-1', 'D-1', 'B-1', 'A-1']);
    expect(결과[1]?.devices.map((d) => d.platform)).toEqual(['desktop', 'mobile']);
  });

  it('디바이스마다 처음 실패한 회차 하나와 시도 수 · 실패 수를 담는다', () => {
    const 행들 = [
      행만들기(10, 'A-1', 'desktop', 1, 'PASS'),
      행만들기(11, 'A-1', 'desktop', 2, 'PASS'),
      행만들기(12, 'A-1', 'desktop', 3, 'FAIL'),
      행만들기(13, 'A-1', 'desktop', 4, 'PASS'),
      행만들기(14, 'A-1', 'desktop', 5, 'FAIL'),
    ];
    const [카드] = 케이스로묶는다(행들, 표([['A-1', 'desktop', '새로깨짐']]));
    expect(카드?.tcName).toBe('A-1 이름');
    expect(카드?.devices[0]).toMatchObject({
      attempts: 5,
      failedAttempts: 2,
      firstFailedHistoryId: 12,
      change: '새로깨짐',
    });
  });

  it('platform 을 주면 그 디바이스만 남기고 비는 케이스는 뺀다', () => {
    const 행들 = [
      행만들기(1, 'A-1', 'desktop', 1, 'FAIL'),
      행만들기(2, 'B-1', 'desktop', 1, 'FAIL'),
      행만들기(3, 'B-1', 'mobile', 1, 'FAIL'),
    ];
    const 결과 = 케이스로묶는다(행들, 표([]), 'mobile');
    expect(결과.map((c) => c.tcId)).toEqual(['B-1']);
    expect(결과[0]?.devices.map((d) => d.platform)).toEqual(['mobile']);
  });

  it('변화표에 없는 디바이스는 change 가 null 이다', () => {
    const [카드] = 케이스로묶는다([행만들기(1, 'A-1', 'android', 1, 'FAIL')], 표([]));
    expect(카드?.devices[0]?.change).toBeNull();
  });

  it('통과 · 미실행만 있는 케이스는 안 든다', () => {
    const 행들 = [행만들기(1, 'A-1', 'desktop', 1, 'PASS'), 행만들기(2, 'B-1', 'desktop', 1, 'NA')];
    expect(케이스로묶는다(행들, 표([]))).toEqual([]);
  });

  it('케이스 안 디바이스는 desktop → mobile → android 순이다', () => {
    const 행들 = [
      행만들기(1, 'A-1', 'android', 1, 'FAIL'),
      행만들기(2, 'A-1', 'mobile', 1, 'FAIL'),
      행만들기(3, 'A-1', 'desktop', 1, 'FAIL'),
    ];
    const [카드] = 케이스로묶는다(행들, 표([]));
    expect(카드?.devices.map((d) => d.platform)).toEqual(['desktop', 'mobile', 'android']);
  });
});

describe('쪽을자른다', () => {
  const 케이스들 = Array.from({ length: 21 }, (_, i) => ({
    tcId: `T-${i}`,
    tcName: '',
    devices: [],
  }));

  it('카드쪽크기 개씩 케이스 단위로 자른다', () => {
    expect(카드쪽크기).toBe(20);
    const 일 = 쪽을자른다(케이스들, 1);
    expect(일.items).toHaveLength(20);
    expect(일).toMatchObject({ total: 21, page: 1, pageSize: 20 });
    expect(쪽을자른다(케이스들, 2).items).toHaveLength(1);
  });

  it('범위를 넘는 쪽은 빈 items 다', () => {
    expect(쪽을자른다(케이스들, 3)).toMatchObject({ items: [], total: 21, page: 3 });
  });
});

describe('연속실패수', () => {
  it('맨 앞에서부터 이어진 FAIL 수를 센다', () => {
    expect(연속실패수(['FAIL', 'FAIL', 'PASS', 'FAIL'])).toBe(2);
    expect(연속실패수(['FAIL', 'FAIL', 'FAIL'])).toBe(3);
    expect(연속실패수([])).toBe(0);
    expect(연속실패수(['PASS', 'FAIL'])).toBe(0);
  });
});
