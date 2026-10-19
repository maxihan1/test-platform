import { describe, expect, it } from 'vitest';

import type { CaseRow, HistoryRow, LastResult } from './api.js';
import { 빈기억, 실행마다묶기, 이력열쇠, 처음디바이스 } from './caseDetailView.js';
import { keyOf, type LastMap } from './catalogView.js';

const 케이스 = { tcId: 'ZZV-001', platforms: ['desktop', 'mobile'] } as unknown as CaseRow;

const 결과 = (platform: 'desktop' | 'mobile', status: LastResult['status']): LastResult => ({
  tcId: 'ZZV-001',
  platform,
  status,
  historyId: 1,
  runId: 1,
  durationMs: 1,
  finishedAt: '2026-10-19T00:00:00.000Z',
  recent: [status],
});

const 줄 = (historyId: number, runId: number, platform: 'desktop' | 'mobile', status: HistoryRow['status']): HistoryRow => ({
  historyId,
  runId,
  runTitle: `실행 ${runId}`,
  platform,
  status,
  durationMs: 1,
  startedAt: '2026-10-19T00:00:00.000Z',
  finishedAt: '2026-10-19T00:00:01.000Z',
});

describe('처음디바이스 — 실패한 디바이스가 먼저 열린다', () => {
  it('모바일만 실패했으면 PC 가 앞에 있어도 모바일을 고른다', () => {
    const 마지막: LastMap = {
      [keyOf('ZZV-001', 'desktop')]: 결과('desktop', 'PASS'),
      [keyOf('ZZV-001', 'mobile')]: 결과('mobile', 'FAIL'),
    };
    expect(처음디바이스(케이스, 마지막)).toBe('mobile');
  });

  it('실패가 없으면 돈 디바이스 가운데 첫 번째다', () => {
    const 마지막: LastMap = {
      [keyOf('ZZV-001', 'desktop')]: 결과('desktop', 'PASS'),
      [keyOf('ZZV-001', 'mobile')]: 결과('mobile', 'PASS'),
    };
    expect(처음디바이스(케이스, 마지막)).toBe('desktop');
  });

  it('PC 는 안 돌고 모바일만 돌았으면 모바일이다', () => {
    expect(처음디바이스(케이스, { [keyOf('ZZV-001', 'mobile')]: 결과('mobile', 'PASS') })).toBe('mobile');
  });

  it('한 번도 안 돌았으면 null 이다', () => {
    expect(처음디바이스(케이스, {})).toBeNull();
  });
});

describe('실행마다묶기 — 이력 한 줄은 실행 하나', () => {
  it('같은 실행의 회차는 한 줄로 묶고 통과 · 실패 수를 센다', () => {
    const 묶음 = 실행마다묶기([줄(10, 7, 'desktop', 'FAIL'), 줄(9, 7, 'desktop', 'PASS'), 줄(8, 7, 'desktop', 'PASS')]);

    expect(묶음).toHaveLength(1);
    expect(묶음[0]).toMatchObject({ runId: 7, 첫항목: 10, 회수: 3, 통과: 2, 실패: 1, 디바이스들: ['desktop'] });
  });

  it('실행이 다르면 줄이 갈리고 들어온 차례를 지킨다', () => {
    const 묶음 = 실행마다묶기([줄(3, 2, 'desktop', 'PASS'), 줄(2, 1, 'desktop', 'FAIL')]);

    expect(묶음.map((m) => m.runId)).toEqual([2, 1]);
  });

  it('한 실행에서 디바이스 둘이 돌면 디바이스 목록에 한 번씩만 든다', () => {
    const 묶음 = 실행마다묶기([줄(4, 5, 'desktop', 'PASS'), 줄(5, 5, 'mobile', 'PASS'), 줄(6, 5, 'mobile', 'PASS')]);

    expect(묶음[0]?.디바이스들).toEqual(['desktop', 'mobile']);
    expect(묶음[0]?.회수).toBe(3);
  });

  it('이력이 없으면 빈 배열이다', () => {
    expect(실행마다묶기([])).toEqual([]);
  });
});

describe('빈기억', () => {
  it('부를 때마다 새 표를 낸다 — 목록 둘이 기억을 나눠 쓰지 않는다', () => {
    const a = 빈기억();
    a.이력.set('x', []);
    expect(빈기억().이력.size).toBe(0);
  });
});

describe('이력열쇠 — 새 실행이 끝나면 이력을 다시 받는다', () => {
  it('어느 디바이스든 마지막 항목이 바뀌면 열쇠가 바뀐다', () => {
    const 전: LastMap = { [keyOf('ZZV-001', 'desktop')]: 결과('desktop', 'PASS') };
    const 뒤: LastMap = { ...전, [keyOf('ZZV-001', 'mobile')]: { ...결과('mobile', 'FAIL'), historyId: 9 } };
    expect(이력열쇠(케이스, 전)).toBe('ZZV-001:1');
    expect(이력열쇠(케이스, 뒤)).toBe('ZZV-001:9');
  });

  it('한 번도 안 돌았으면 0 이다', () => {
    expect(이력열쇠(케이스, {})).toBe('ZZV-001:0');
  });
});
