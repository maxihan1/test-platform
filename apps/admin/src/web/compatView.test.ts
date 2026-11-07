import { describe, expect, it } from 'vitest';

import type { CompatDevice } from './compatApi.js';
import { 같은모델들, 모델별하나만, 안드로이드, 요약, 인치글, 커버율, 해상도글 } from './compatView.js';

const 폰 = (serial: string, model: string, 더: Partial<CompatDevice> = {}): CompatDevice => ({
  serial,
  model,
  manufacturer: 'Samsung',
  os: '14',
  resolution: '1080x2400',
  state: 'IDLE',
  ...더,
});

describe('디바이스 요약', () => {
  it('Android 범위 · 형태 · 해상도 종류 · 제조사 수를 센다', () => {
    const 목록 = [
      폰('a', 'SM-S928N', { os: '15', resolution: '1440x3120' }),
      폰('b', 'SM-F946N', { os: '12', formFactor: 'foldable', displays: [{ size: '1812x2176', inches: 7.6 }, { size: '904x2316', inches: 6.2 }] }),
      폰('c', 'Pixel 8', { manufacturer: 'Google' }),
      폰('d', 'SM-X710N', { formFactor: 'tablet' }),
    ];
    const 셈 = 요약(목록);
    expect(셈.android).toBe('12 ~ 15');
    expect(셈.형태수).toEqual([{ 형태: 'phone', 수: 2 }, { 형태: 'foldable', 수: 1 }, { 형태: 'tablet', 수: 1 }]);
    expect(셈.폴더블).toBe(1);
    expect(셈.해상도).toBe(3);
    expect(셈.제조사).toEqual([{ 이름: 'Samsung', 수: 3 }, { 이름: 'Google', 수: 1 }]);
  });

  it('형태를 못 읽은 디바이스는 폰으로 센다', () => {
    expect(요약([폰('a', 'X')]).형태수).toEqual([{ 형태: 'phone', 수: 1 }]);
  });

  it('한 버전뿐이면 범위 없이 그 숫자만, 읽은 버전이 없으면 비운다', () => {
    expect(요약([폰('a', 'X'), 폰('b', 'Y')]).android).toBe('14');
    expect(요약([폰('a', 'X', { os: '' })]).android).toBeNull();
    expect(안드로이드('Android 13')).toBe(13);
  });
});

describe('같은 모델은 1대만', () => {
  const 목록 = [폰('a1', 'SM-G996N'), 폰('a2', 'SM-G996N'), 폰('b1', 'Pixel 8')];

  it('고른 것이 없으면 목록에서 먼저 나온 것이 대표다', () => {
    expect([...같은모델들(목록, new Set())]).toEqual(['a2']);
  });

  it('두 번째 것을 골라 둔 세트는 그것이 대표로 남는다', () => {
    expect([...같은모델들(목록, new Set(['a2']))]).toEqual(['a1']);
  });

  it('켜면 고른 것에서 같은 모델의 두 번째부터 뺀다', () => {
    expect(모델별하나만(목록, ['a2', 'a1', 'b1'])).toEqual(['a2', 'b1']);
  });
});

describe('칸 글자', () => {
  it('폴더블은 내장 화면을 다 보이고, 못 읽은 인치는 - 다', () => {
    const 접는폰 = 폰('f', 'F', { displays: [{ size: '1812x2176', inches: 7.6 }, { size: '904x2316', inches: 6.2 }] });
    expect(해상도글(접는폰)).toBe('1812x2176 · 904x2316');
    expect(인치글(접는폰)).toBe('7.6″ · 6.2″');
    expect(인치글(폰('p', 'P'))).toBe('-');
    expect(인치글(폰('p', 'P', { inches: 6.1 }))).toBe('6.1″');
  });

  it('화면 커버리지는 다 덮기 전에 100% 로 올리지 않는다', () => {
    expect(커버율({ covered: 31, total: 34 })).toBe(91);
    expect(커버율({ covered: 199, total: 200 })).toBe(99);
    expect(커버율({ covered: 0, total: 0 })).toBe(0);
  });
});
