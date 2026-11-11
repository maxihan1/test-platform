import { describe, expect, it } from 'vitest';

import type { CaseGroup, CaseRow } from './api.js';
import { 기능묶음들, 덩어리들, 파일이름 } from './caseGroups.js';

const 줄 = (tcId: string): CaseRow => ({
  tcId,
  name: tcId,
  platforms: ['desktop'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-10-11T00:00:00.000Z',
});
const 화면 = 'tests/x/pages/signup.page.ts';
const 묶음들: CaseGroup[] = [
  { feature: '회원가입', screen: null, screenUrl: null, part: null, tcIds: ['X-001'] },
  { feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['X-002', 'X-003'] },
  { feature: '주문', screen: null, screenUrl: null, part: null, tcIds: ['X-004'] },
  { feature: null, screen: null, screenUrl: null, part: null, tcIds: ['X-005'] },
];
const 모양 = (rows: CaseRow[], 보임 = true) => 덩어리들(rows, 묶음들, 보임).map((d) => `${d.feature ?? '없음'}: ${d.rows.map((r) => r.tcId).join(' ')}`);

describe('덩어리들', () => {
  it('화면 · 화면 조각으로 나뉜 번호표도 기능 묶음 한 덩어리로 가른다', () => {
    expect(모양(['X-001', 'X-002', 'X-003', 'X-004', 'X-005'].map(줄))).toEqual(['회원가입: X-001 X-002 X-003', '주문: X-004', '없음: X-005']);
  });

  it('번호표에 없는 줄은 앞 덩어리에 붙는다', () => {
    expect(모양(['X-004', 'X-999'].map(줄))).toEqual(['주문: X-004 X-999']);
  });

  it('PRD 를 안 쓰는 서비스는 이름표 없는 덩어리 하나다', () => {
    expect(모양(['X-001', 'X-004'].map(줄), false)).toEqual(['없음: X-001 X-004']);
    expect(덩어리들([], 묶음들, false)).toEqual([]);
  });
});

describe('기능묶음들', () => {
  it('쪽 밖까지 기능 묶음마다 번호를 모은다 — 목차 건수다', () => {
    expect(기능묶음들(묶음들, true).map((g) => [g.feature, g.tcIds.length])).toEqual([
      ['회원가입', 3],
      ['주문', 1],
      [null, 1],
    ]);
    expect(기능묶음들(묶음들, false)).toEqual([]);
  });
});

describe('파일이름', () => {
  it('화면 파일 경로에서 이름만 뽑는다', () => {
    expect(파일이름(화면)).toBe('signup');
    expect(파일이름('tests/x/components/terms.component.ts')).toBe('terms');
  });
});
