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

function 그리기(값: 비교값, items: RunItemSummary[] = []) {
  const 부름 = vi.spyOn(api, 'insights').mockResolvedValue(값);
  render(<RunInsights runId={RUN_ID} status="FINISHED" items={items} />);
  return 부름;
}

describe('직전 실행과 견준 칸 (SPEC §7 · §8.3)', () => {
  it('견줄 직전 실행이 없으면 비교 칸을 아예 안 그린다', async () => {
    그리기(비교({ previous: null, 실패덩어리들: [덩어리('연결 시간 초과', [61])] }));

    await screen.findByText(/연결 시간 초과/);
    expect(screen.queryByText(/직전 실행과 견줌/)).toBeNull();
  });

  it('새로 깨진 케이스는 그 이름이 보인다', async () => {
    그리기(비교({ 케이스들: [견줌('ZZI-0001', '결제 취소 흐름', '새로깨짐')] }), [
      항목(11, 'ZZI-0001', '결제 취소 흐름', 'FAIL'),
    ]);

    expect(await screen.findByText(/결제 취소 흐름/)).toBeDefined();
    expect(screen.getByText('새로깨짐').style.color).toBe('var(--fail)');
  });

  it('직전 실행이 다른 주소에서 돌았으면 그 사실을 한 줄로 알린다', async () => {
    그리기(비교({ 주소바뀜: true }));

    expect(await screen.findByText('직전 실행은 다른 주소에서 돌았습니다')).toBeDefined();
  });

  it('직전에 있었으나 이번에 안 돈 케이스 수를 글자로 적는다', async () => {
    그리기(비교({ 빠진건수: 2 }));

    expect(await screen.findByText(/이번에 돌지 않은 케이스 2건/)).toBeDefined();
  });

  it('「그대로」라도 이번에 안 돌았으면 미실행 색으로 적는다', async () => {
    그리기(
      비교({
        케이스들: [
          견줌('ZZI-0002', '쿠폰 적용', '그대로'),
          견줌('ZZI-0003', '주소 검색', '고쳐짐'),
        ],
      }),
      [항목(12, 'ZZI-0002', '쿠폰 적용', 'NA'), 항목(13, 'ZZI-0003', '주소 검색', 'PASS')],
    );

    expect((await screen.findByText('그대로')).style.color).toBe('var(--na)');
    expect(screen.getByText('고쳐짐').style.color).toBe('var(--pass)');
  });

  it('직전과 같은 통과는 줄을 만들지 않고 수만 적는다', async () => {
    그리기(
      비교({
        케이스들: [견줌('ZZI-0004', '로그인', '그대로'), 견줌('ZZI-0005', '로그아웃', '그대로')],
      }),
      [항목(14, 'ZZI-0004', '로그인', 'PASS'), 항목(15, 'ZZI-0005', '로그아웃', 'PASS')],
    );

    expect(await screen.findByText(/나머지 2건/)).toBeDefined();
    expect(screen.queryByText(/ZZI-0004/)).toBeNull();
  });
});

describe('같은 사유로 묶은 실패 (SPEC §7)', () => {
  it('묶음이 몇 건인지를 글자로 적고 케이스 수로 속이지 않는다', async () => {
    그리기(비교({ previous: null, 실패덩어리들: [덩어리('기대값 200, 실제 500', [71, 72, 73])] }));

    expect(await screen.findByText(/실패 항목 3건/)).toBeDefined();
    expect(screen.queryByText(/케이스 3건/)).toBeNull();
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
    render(<RunResult runId={RUN_ID} role="operator" />);

    await screen.findByRole('dialog');
    expect(부름).not.toHaveBeenCalled();
  });

  it('화면 머리에 지금 진행 중인 항목을 적되 단정하지 않는다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(비교());
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} role="operator" />);

    const 머리 = await screen.findByText(/진행 중 ZZI-0009/);
    expect(머리.className).toBe('runmeta');
    expect(screen.queryByText(/실행 중 ZZI-0009/)).toBeNull();
  });
});
