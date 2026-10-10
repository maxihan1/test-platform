// 목록 줄 사이 묶음 머리 — 이웃끼리 자리가 바뀌는 곳에만 끼우고 건수는 쪽이 아니라 묶음 번호표로 센다 (도메인/카탈로그 §8.1 「맥락」)

import { describe, expect, it } from 'vitest';

import type { CaseGroup, CaseRow } from './api.js';
import { 줄과머리, 파일이름, type 목록칸 } from './caseGroups.js';

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
const 조각 = 'tests/x/components/terms.component.ts';
const 묶음들: CaseGroup[] = [
  { feature: '회원가입', screen: null, screenUrl: null, part: null, tcIds: ['X-001'] },
  { feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['X-002', 'X-003'] },
  { feature: '회원가입', screen: 화면, screenUrl: '/signup', part: 조각, tcIds: ['X-004'] },
  { feature: null, screen: null, screenUrl: null, part: null, tcIds: ['X-005'] },
];
const 모양 = (칸들: 목록칸[]) =>
  칸들.map((칸) => ('row' in 칸 ? 칸.row.tcId : `${'#'.repeat(칸.머리.단)} ${칸.머리.값 ?? '없음'} ${칸.머리.tcIds.length}${칸.머리.이어짐 ? ' 이어짐' : ''}`));

describe('줄과머리', () => {
  it('기능 묶음 > 화면 > 화면 조각 머리를 자리가 바뀌는 곳에 끼우고 건수는 아래 묶음까지 전부다', () => {
    const 받은 = ['X-001', 'X-002', 'X-003', 'X-004', 'X-005'];
    expect(모양(줄과머리(받은.map(줄), 묶음들, new Set(받은)))).toEqual([
      '# 회원가입 4', 'X-001', `## ${화면} 3`, 'X-002', 'X-003', `### ${조각} 1`, 'X-004', '# 없음 1', 'X-005',
    ]);
  });

  it('앞 케이스가 앞 쪽에 있으면 「이어짐」 — 머리는 이 쪽 첫 줄 앞에 다시 선다', () => {
    const 이쪽 = ['X-003', 'X-004', 'X-005'];
    expect(모양(줄과머리(이쪽.map(줄), 묶음들, new Set(이쪽))).slice(0, 3)).toEqual(['# 회원가입 4 이어짐', `## ${화면} 3 이어짐`, 'X-003']);
  });

  it('줄과 머리는 접을 때 따를 위 묶음 열쇠를 들고 · 「이것만 보기」 조건은 묶인 자리 그대로다', () => {
    const 칸들 = 줄과머리(['X-004'].map(줄), 묶음들, new Set(['X-004']));
    const 머리들 = 칸들.flatMap((칸) => ('row' in 칸 ? [] : [칸.머리]));
    expect(머리들.map((m) => m.조건)).toEqual([{ feature: '회원가입' }, { feature: '회원가입', screen: 화면 }, { feature: '회원가입', screen: 화면, part: 조각 }]);
    expect(칸들.at(-1)!.위).toEqual(머리들.map((m) => m.열쇠));
    expect(머리들[2]!.위).toEqual([머리들[0]!.열쇠, 머리들[1]!.열쇠]);
  });

  it('기능 묶음이 하나도 없으면 묶음 머리를 안 세우고 · 번호표가 없으면 머리 없이 그대로다', () => {
    const 묶음없음: CaseGroup[] = [{ feature: null, screen: null, screenUrl: null, part: null, tcIds: ['X-001', 'X-002'] }];
    expect(모양(줄과머리(['X-001', 'X-002'].map(줄), 묶음없음, new Set()))).toEqual(['X-001', 'X-002']);
    expect(모양(줄과머리(['X-001'].map(줄), undefined, new Set()))).toEqual(['X-001']);
  });

  it('파일이름은 경로와 꼬리를 뗀다', () => {
    expect([파일이름(화면), 파일이름(조각)]).toEqual(['signup', 'terms']);
  });
});
