import { describe, expect, it } from 'vitest';

import type { CaseRow } from './api.js';
import { 추천줄들 } from './scenarioView.js';

const 줄 = (tcId: string, 덮: Partial<CaseRow> = {}): CaseRow =>
  ({ tcId, name: tcId, platforms: ['android'], precondition: [], filePath: 'x', paramSchema: {}, expectedSchema: {}, isActive: true, scannedAt: '', techniques: [], ...덮 }) as CaseRow;

describe('추천줄들 · 이미 시나리오에 든 프로시저', () => {
  const 케이스들 = [줄('A-FN-1', { procId: 'A-TP-1' }), 줄('A-FN-2', { procId: 'A-TP-2' }), 줄('A-FN-3')];
  const 추천 = [
    { tcId: 'A-FN-1', screen: '/a', procId: 'A-TP-1' },
    { tcId: 'A-FN-2', screen: '/b', procId: 'A-TP-2' },
    { tcId: 'A-FN-3', screen: '/c' },
  ];

  it('든 프로시저의 케이스는 빼고 나머지는 그대로 낸다', () => {
    expect(추천줄들(케이스들, 'android', false, 추천, new Set(['A-TP-1'])).map((x) => x.row.tcId)).toEqual(['A-FN-2', 'A-FN-3']);
  });

  it('든 프로시저가 없으면 다 낸다', () => {
    expect(추천줄들(케이스들, 'android', false, 추천).map((x) => x.row.tcId)).toEqual(['A-FN-1', 'A-FN-2', 'A-FN-3']);
  });
});
