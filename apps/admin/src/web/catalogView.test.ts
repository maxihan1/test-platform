import { describe, expect, it } from 'vitest';

import type { CaseRow, LastResult } from './api.js';
import { keyOf, 마지막결과로거른다, 빈이유, 판정개수 } from './catalogView.js';

function 케이스(tcId: string, platforms: ('desktop' | 'mobile')[] = ['desktop']): CaseRow {
  return {
    tcId,
    name: `${tcId}의 케이스명`,
    platforms,
    precondition: [],
    filePath: `tests/demo/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-19T00:00:00.000Z',
  };
}

function 마지막(tcId: string, status: 'PASS' | 'FAIL' | 'NA'): LastResult {
  return {
    tcId,
    platform: 'desktop',
    status,
    historyId: 1,
    runId: 1,
    recent: [status],
    durationMs: 100,
    finishedAt: '2026-09-19T00:00:00.000Z',
  };
}

describe('마지막 결과로 거르기 (SPEC §8.1 — 화면이 겹쳐 거르는 유일한 조건)', () => {
  const 행들 = [케이스('DEMO-001'), 케이스('DEMO-002'), 케이스('DEMO-003')];
  const 맵 = {
    'DEMO-001:desktop': 마지막('DEMO-001', 'PASS'),
    'DEMO-002:desktop': 마지막('DEMO-002', 'FAIL'),
  };

  it('전체면 그대로 둔다', () => {
    expect(마지막결과로거른다(행들, 맵, 'ALL')).toHaveLength(3);
  });

  it('통과만 고르면 통과한 것만 남는다', () => {
    expect(마지막결과로거른다(행들, 맵, 'PASS').map((r) => r.tcId)).toEqual(['DEMO-001']);
  });

  it('실패만 고르면 실패한 것만 남는다', () => {
    expect(마지막결과로거른다(행들, 맵, 'FAIL').map((r) => r.tcId)).toEqual(['DEMO-002']);
  });

  it('한 번도 안 돌린 케이스는 미실행이다. 기록이 없는 것과 미실행 판정은 같은 칸에 온다', () => {
    expect(마지막결과로거른다(행들, 맵, 'NA').map((r) => r.tcId)).toEqual(['DEMO-003']);
  });

  it('디바이스가 둘인데 한쪽만 깨졌으면 실패로 본다', () => {
    const 둘 = [케이스('DEMO-008', ['desktop', 'mobile'])];
    const 한쪽깨짐 = {
      'DEMO-008:desktop': 마지막('DEMO-008', 'PASS'),
      'DEMO-008:mobile': { ...마지막('DEMO-008', 'FAIL'), platform: 'mobile' as const },
    };
    expect(마지막결과로거른다(둘, 한쪽깨짐, 'FAIL')).toHaveLength(1);
    expect(마지막결과로거른다(둘, 한쪽깨짐, 'PASS')).toHaveLength(0);
  });
});

describe('목록이 비었을 때 세 갈래 (SPEC §8.1)', () => {
  it('아직 한 번도 안 불러왔으면 그렇게 말한다. 「찾는」이라고 하면 안 된다', () => {
    const 것 = 빈이유({ scannedAt: null, 전체건수: 0, 건조건: false, 친글자: '' });
    expect(것.무엇).toBe('아직 케이스를 불러오지 않았습니다');
    expect(것.버튼).toBe('케이스 불러오기');
  });

  it('불러왔는데 0건이면 왜인지 볼 길을 준다', () => {
    const 것 = 빈이유({ scannedAt: '2026-09-19T00:00:00.000Z', 전체건수: 0, 건조건: false, 친글자: '' });
    expect(것.무엇).toBe('불러왔지만 케이스가 하나도 없습니다');
    // 사유는 화면 위 스캔 결과 줄이 이미 보여준다. 버튼은 다시 훑는 길을 준다
    expect(것.버튼).toBe('다시 스캔');
    expect(것.왜).toContain('사유는 위 스캔 결과에 있습니다');
  });

  it('검색에 안 걸린 것이면 친 글자를 그대로 넣는다', () => {
    const 것 = 빈이유({
      scannedAt: '2026-09-19T00:00:00.000Z',
      전체건수: 20,
      건조건: true,
      친글자: '장바구니',
    });
    expect(것.무엇).toBe("'장바구니'에 맞는 케이스가 없습니다");
    expect(것.버튼).toBe('조건 초기화');
  });

  it('글자 없이 칩만 걸었어도 검색에 안 걸린 것이다', () => {
    const 것 = 빈이유({
      scannedAt: '2026-09-19T00:00:00.000Z',
      전체건수: 20,
      건조건: true,
      친글자: '',
    });
    expect(것.무엇).toBe('조건에 맞는 케이스가 없습니다');
    expect(것.버튼).toBe('조건 초기화');
  });
});

describe('판정개수', () => {
  it('마지막 결과를 통과·실패·미실행으로 센다', () => {
    const rows = [케이스('A-001'), 케이스('A-002'), 케이스('A-003')];
    const last = {
      [keyOf('A-001', 'desktop')]: 마지막('A-001', 'PASS'),
      [keyOf('A-002', 'desktop')]: 마지막('A-002', 'FAIL'),
    };
    expect(판정개수(rows, last)).toEqual({ 전체: 3, 통과: 1, 실패: 1, 미실행: 1 });
  });

  it('디바이스 한쪽만 깨져도 실패로 센다', () => {
    const rows = [케이스('A-001', ['desktop', 'mobile'])];
    const last = {
      [keyOf('A-001', 'desktop')]: 마지막('A-001', 'PASS'),
      [keyOf('A-001', 'mobile')]: { ...마지막('A-001', 'FAIL'), platform: 'mobile' as const },
    };
    expect(판정개수(rows, last)).toEqual({ 전체: 1, 통과: 0, 실패: 1, 미실행: 0 });
  });

  it('빈 목록이면 넷 다 0 이다', () => {
    expect(판정개수([], {})).toEqual({ 전체: 0, 통과: 0, 실패: 0, 미실행: 0 });
  });
});
