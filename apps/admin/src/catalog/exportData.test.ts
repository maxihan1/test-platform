// 케이스 엑셀 「마지막 결과」 칸 — 기기가 둘이어도 추적표 · 목록과 같은 판정을 싣는지 (카탈로그 §7 GET /api/catalog/export · PRD-F9-09)

import { describe, expect, it } from 'vitest';

import type { LastResult } from '../execution/history.js';
import { 결과칸 } from './exportData.js';

const 결과 = (platform: LastResult['platform'], status: LastResult['status'], finishedAt: string): LastResult => ({
  tcId: 'XCX-001',
  platform,
  status,
  historyId: 1,
  runId: 1,
  durationMs: 10,
  finishedAt,
  recent: [],
});

describe('결과칸', () => {
  it('한 기기라도 실패면 실패다 — 나중에 끝난 기기가 통과여도', () => {
    const 칸 = 결과칸(['desktop', 'mobile'], [결과('desktop', 'FAIL', '2026-10-12T01:00:00Z'), 결과('mobile', 'PASS', '2026-10-12T02:00:00Z')]);
    expect(칸).toEqual({ status: 'FAIL', at: '2026-10-12 11:00' });
  });

  it('기기가 다 통과여야 통과 · 한 기기만 돌았으면 미실행', () => {
    expect(결과칸(['desktop', 'mobile'], [결과('desktop', 'PASS', '2026-10-12T01:00:00Z'), 결과('mobile', 'PASS', '2026-10-12T00:00:00Z')]))
      .toEqual({ status: 'PASS', at: '2026-10-12 10:00' });
    expect(결과칸(['desktop', 'mobile'], [결과('desktop', 'PASS', '2026-10-12T01:00:00Z')])?.status).toBe('NA');
  });

  it('돈 기기가 없으면 빈칸이다', () => {
    expect(결과칸(['desktop'], [])).toBeNull();
  });
});
