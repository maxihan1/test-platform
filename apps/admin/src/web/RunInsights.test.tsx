// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  api,
  type ItemStatus,
  type Platform,
  type RunInsights as 비교값,
  type RunItemSummary,
  type RunSummary,
  type 변화,
  type 실패덩어리,
} from './api.js';
import { RunInsights } from './RunInsights.js';
import { RunResult } from './RunResult.js';
import type { 판정 } from './role.js';

// 옛 등급 셋의 판정을 그대로 옮긴 것 — 운영은 전부, 실행까지는 머지·설정 빼고, 보기만은 받기뿐
const 실행까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const RUN_ID = 5011;

const 실행: RunSummary = {
  runId: RUN_ID,
  title: '결제 회귀',
  triggeredBy: 'zzi',
  triggeredByName: '테스터',
  env: 'qa',
  baseUrl: 'https://zzi.example.test',
  serviceName: '결제',
  status: 'RUNNING',
  startedAt: '2026-09-21T00:59:00.000Z',
  finishedAt: null,
  counts: { total: 2, pass: 0, fail: 0, na: 0, running: 2 },
};

function 항목(
  historyId: number,
  tcId: string,
  tcName: string,
  status: ItemStatus,
  finishedAt: string | null = '2026-09-21T01:00:00.000Z',
): RunItemSummary {
  return {
    historyId,
    tcId,
    tcName,
    platform: 'desktop',
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: finishedAt === null ? null : 1200,
    error: null,
    startedAt: '2026-09-21T00:59:00.000Z',
    finishedAt,
  };
}

function 견줌(tcId: string, tcName: string, 판정: 변화): 비교값['케이스들'][number] {
  return { tcId, tcName, platform: 'desktop' as Platform, 판정 };
}

function 덩어리(대표문장: string, historyIds: number[]): 실패덩어리 {
  return {
    대표문장,
    건수: historyIds.length,
    항목들: historyIds.map((historyId) => ({
      historyId,
      tcId: 'ZZI-0007',
      tcName: '장바구니 담기',
      platform: 'desktop' as Platform,
    })),
  };
}

function 비교(덮을것: Partial<비교값> = {}): 비교값 {
  return {
    previous: { runId: 5010, startedAt: '2026-09-20T01:00:00.000Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [],
    실패덩어리들: [],
    ...덮을것,
  };
}

function 그리기(값: 비교값) {
  return render(<RunInsights insights={값} />);
}

describe('같은 사유로 실패 (SPEC §7 · §8.3 옆 칸)', () => {
  it('견줄 앞 실행이 없어도 같은 사유 묶음은 그린다', () => {
    그리기(비교({ previous: null, 실패덩어리들: [덩어리('연결 시간 초과', [61])] }));

    expect(screen.getByText(/연결 시간 초과/)).toBeDefined();
    expect(screen.getByText('같은 사유로 실패')).toBeDefined();
  });

  it('묶음이 몇 건인지를 글자로 적고 케이스 수로 속이지 않는다', () => {
    그리기(비교({ previous: null, 실패덩어리들: [덩어리('기대값 200, 실제 500', [71, 72, 73])] }));

    expect(screen.getByText(/실패 항목 3건/)).toBeDefined();
    expect(screen.queryByText(/케이스 3건/)).toBeNull();
  });

  it('묶음마다 어느 케이스가 어느 디바이스에서 깨졌는지 한 줄로 이어 적는다', () => {
    그리기(비교({ 실패덩어리들: [덩어리('연결 시간 초과', [61, 62])] }));

    expect(screen.getByText('ZZI-0007 장바구니 담기 (PC)')).toBeDefined();
  });

  it('묶음이 없으면 칸 제목도 없다', () => {
    그리기(비교());

    expect(screen.queryByText('같은 사유로 실패')).toBeNull();
  });
});

describe('해결 (SPEC §8.3 옆 칸)', () => {
  it('직전 실행에서 깨졌다가 이번에 통과한 케이스만 이름으로 적는다', () => {
    그리기(
      비교({
        케이스들: [
          견줌('ZZI-0001', '결제 취소 흐름', '새로깨짐'),
          견줌('ZZI-0002', '쿠폰 적용', '계속깨짐'),
          견줌('ZZI-0003', '주소 검색', '고쳐짐'),
          견줌('ZZI-0004', '로그인', '그대로'),
        ],
      }),
    );

    expect(screen.getByText('해결')).toBeDefined();
    expect(screen.getByText(/주소 검색/).textContent).toContain('PC');
    expect(screen.queryByText(/결제 취소 흐름/)).toBeNull();
    expect(screen.queryByText(/쿠폰 적용/)).toBeNull();
    expect(screen.queryByText(/로그인/)).toBeNull();
  });

  it('고쳐진 것이 없으면 칸 제목도 없다', () => {
    그리기(비교({ 케이스들: [견줌('ZZI-0004', '로그인', '그대로')] }));

    expect(screen.queryByText('해결')).toBeNull();
  });
});

describe('도는 중인 실행 (SPEC §8.3 · §8.9)', () => {
  const 도는중응답 = {
    ...실행,
    items: [항목(21, 'ZZI-0009', '결제 승인', 'NA', null)],
    evidence: [],
  };

  it('아직 도는 중이면 견주기 조회를 아예 부르지 않는다', async () => {
    const 부름 = vi.spyOn(api, 'insights').mockResolvedValue(비교());
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByRole('dialog');
    expect(부름).not.toHaveBeenCalled();
  });

  it('화면 머리에 지금 진행 중인 항목을 적되 단정하지 않는다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(비교());
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    // 2026-09-22 에 머리가 본문 밖으로 나가면서 클래스 이름이 head-meta 가 됐다.
    // 단언하는 것은 그대로다 — 「진행 중」이 화면 머리에 있고 「실행 중」이라 단정하지 않는다
    const 머리 = await screen.findByText(/진행 중 ZZI-0009/);
    expect(머리.className).toBe('head-meta');
    expect(screen.queryByText(/실행 중 ZZI-0009/)).toBeNull();
  });
});
