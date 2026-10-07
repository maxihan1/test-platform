// @vitest-environment jsdom
// 결과 화면 조립 검사 — 요약 띠 · 카드 · 줄 · 미확정 묶음 · 옆 칸 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
  api,
  type EvidenceRow,
  type FailureCase,
  type ItemStatus,
  type Platform,
  type RunInsights as 비교값,
  type RunItemSummary,
} from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 도는중응답, 실행, 실행까지, 증적 } from './RunResult.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

// 끝난 실행은 요약 띠 → 실패 카드 → 통과 · 미실행 줄 → 미확정 묶음이고 옆 칸이 따라온다 (도메인/실행 §8.3, 2026-10-08)
describe('결과 화면 조립 — 요약 띠 · 카드 · 줄 · 미확정 묶음 · 옆 칸', () => {
  function 항목줄(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 미확정?: string): RunItemSummary {
    return {
      historyId, tcId, tcName: `이름-${tcId}`, platform, attempt: 1, params: {}, paramSchema: {},
      status, durationMs: 1200, error: null, startedAt: '2026-09-15T17:13:00.000Z',
      finishedAt: '2026-09-15T17:14:00.000Z', unconfirmed: 미확정 ?? null,
    };
  }

  function 카드응답(tcId: string, platform: Platform = 'desktop'): FailureCase {
    return {
      tcId,
      tcName: `이름-${tcId}`,
      devices: [{
        platform, change: null, streak: null, recent: ['FAIL'], attempts: 1, failedAttempts: 1,
        item: {
          historyId: 900, runId: RUN_ID, runTitle: '결제 회귀', tcId, tcName: `이름-${tcId}`, platform, attempt: 1,
          params: {}, paramSchema: {}, status: 'FAIL', durationMs: 1000, error: null,
          startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:14:00.000Z',
          precondition: [], expected: {}, expectedSchema: {}, steps: [],
        },
      }],
    };
  }

  function 끝난실행(items: RunItemSummary[], 증적들: EvidenceRow[] = []) {
    const 확정 = items.filter((i) => typeof i.unconfirmed !== 'string');
    const 미 = items.filter((i) => typeof i.unconfirmed === 'string');
    const 셈 = (목록: RunItemSummary[], s: ItemStatus) => 목록.filter((i) => i.status === s).length;
    return {
      ...실행,
      kind: 'FN' as const,
      status: 'FINISHED',
      counts: {
        total: items.length, pass: 셈(확정, 'PASS'), fail: 셈(확정, 'FAIL'), na: 셈(확정, 'NA'), running: 0,
        unconfirmed: { total: 미.length, pass: 셈(미, 'PASS'), fail: 셈(미, 'FAIL'), na: 셈(미, 'NA') },
      },
      items,
      evidence: 증적들,
    };
  }

  const 첫실행: 비교값 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들: [] };
  const 견줌: 비교값 = {
    previous: { runId: 2110, startedAt: '2026-09-14T10:00:00.000Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [
      { tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop', 판정: '새로깨짐' },
      { tcId: 'ZRR-009', tcName: '이름-ZRR-009', platform: 'mobile', 판정: '고쳐짐' },
    ],
    실패덩어리들: [{
      대표문장: '가입 완료 안내가 안 보인다',
      건수: 2,
      항목들: [
        { historyId: 1, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop' },
        { historyId: 2, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'mobile' },
      ],
    }],
  };

  const 앞선가 = (앞: Element | null, 뒤: Element | null) =>
    앞 !== null && 뒤 !== null && (앞.compareDocumentPosition(뒤) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

  const 판정칸 = (이름: string) =>
    [...document.querySelectorAll('.rs-fbtn')].find((b) => b.textContent?.startsWith(이름)) as HTMLElement;

  const 섞인항목 = [
    항목줄(1, 'ZRR-001', 'desktop', 'FAIL'),
    항목줄(2, 'ZRR-001', 'mobile', 'PASS'),
    항목줄(3, 'ZRR-002', 'desktop', 'PASS'),
    항목줄(4, 'ZRR-003', 'desktop', 'NA'),
    항목줄(5, 'ZRR-004', 'desktop', 'PASS', '기획서에 값이 없습니다'),
    항목줄(6, 'ZRR-005', 'desktop', 'FAIL'),
    항목줄(7, 'ZRR-005', 'mobile', 'FAIL', '기획서에 값이 없습니다'),
  ];

  function 연다(items: RunItemSummary[], 인사이트: 비교값 = 첫실행, 상자안 = false, 증적들: EvidenceRow[] = []) {
    vi.spyOn(api, 'run').mockResolvedValue(끝난실행(items, 증적들));
    vi.spyOn(api, 'insights').mockResolvedValue(인사이트);
    const 실패부름 = vi.spyOn(api, 'failures').mockResolvedValue({
      items: [카드응답('ZRR-001'), 카드응답('ZRR-005')], total: 2, page: 1, pageSize: 5,
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안={상자안} />);
    return 실패부름;
  }

  it('요약 띠 → 실패 카드 → 통과 · 미실행 줄 → 미확정 묶음 차례다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 띠 = document.querySelector('.rs');
    const 카드 = await waitFor(() => {
      const 목록 = document.querySelector('.fc-list');
      expect(목록).not.toBeNull();
      return 목록;
    });
    const 줄 = document.querySelector('.rr-rows .result-row');
    const 미확정 = document.querySelector('.rr-unconf');
    expect(앞선가(띠, 카드)).toBe(true);
    expect(앞선가(카드, 줄)).toBe(true);
    expect(앞선가(줄, 미확정)).toBe(true);
    expect(미확정?.textContent).toContain('이름-ZRR-004');
    expect(미확정?.textContent).toContain('기획서에 값이 없습니다');
  });

  it('미확정 묶음 줄은 거터를 판정 색이 아닌 중립으로 그린다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 거터 = document.querySelector('.rr-unconf .gutter')?.getAttribute('style') ?? '';
    expect(거터).toContain('var(--line-2)');
  });

  it('도는 실행은 카드 통로도 견주기 통로도 부르지 않고 진행 집계와 줄 목록을 그린다', async () => {
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures');
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'run').mockResolvedValue({
      ...도는중응답, items: [항목줄(1, 'ZRR-001', 'desktop', 'PASS')],
    });
    const { container } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-001');
    expect(실패부름).not.toHaveBeenCalled();
    expect(견줌부름).not.toHaveBeenCalled();
    expect(container.querySelector('.rs')).toBeNull();
    expect(container.querySelector('.tally')?.textContent).toContain('통과');
    expect(screen.getByText('실행 중단')).toBeTruthy();
  });

  it('실패가 0건이면 카드 통로를 부르지 않고 한 줄만 적는다', async () => {
    const 실패부름 = 연다([항목줄(1, 'ZRR-002', 'desktop', 'PASS')]);

    expect(await screen.findByText('실패한 케이스가 없습니다')).toBeTruthy();
    expect(실패부름).not.toHaveBeenCalled();
  });

  it('판정별 보기 「실패」는 카드만, 「통과」는 줄만 그린다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    fireEvent.click(판정칸('실패'));
    expect(document.querySelector('.fc-list')).not.toBeNull();
    expect(document.querySelector('.rr-rows')).toBeNull();
    expect(document.querySelector('.rr-unconf')).toBeNull();

    fireEvent.click(판정칸('통과'));
    expect(document.querySelector('.fc-list')).toBeNull();
    expect(document.querySelector('.rr-unconf')).toBeNull();
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-002']);

    fireEvent.click(판정칸('미실행'));
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-003']);
  });

  it('PC 실패 · 모바일 통과 케이스는 카드에만 있고 줄 목록에 또 나오지 않는다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    const 줄들 = [...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent);
    expect(줄들).toEqual(['ZRR-002', 'ZRR-003']);
    expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-001');
  });

  it('확정 실패 + 미확정 실패 케이스는 카드와 미확정 묶음에 나뉜다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-005'));

    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).not.toContain('ZRR-005');
    const 묶음 = [...document.querySelectorAll('.rr-unconf .tcid')].map((el) => el.textContent);
    expect(묶음).toEqual(['ZRR-004', 'ZRR-005']);
  });

  it('디바이스 칩은 카드 통로에도 걸린다', async () => {
    const 실패부름 = 연다(섞인항목);
    await waitFor(() => expect(실패부름).toHaveBeenCalledWith(RUN_ID, 1, undefined));

    fireEvent.click(screen.getByRole('button', { name: '모바일' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, 'mobile'));
  });

  it('옆 칸에 실행 정보 · 같은 사유로 실패 · 해결 · 증적 문서가 선다', async () => {
    연다(섞인항목, 견줌, false, [증적('PDF', 'READY')]);
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('가입 완료 안내가 안 보인다');
      return 칸!;
    });

    const 글 = 옆.textContent ?? '';
    for (const 조각 of [
      '실행 정보', '결제', '기능 테스트', 'qa', 'https://qa-pay.example.com', '김철수', 'PC, 모바일', 'RUN 2110',
      '같은 사유로 실패', '실패 항목 2건', '해결', '이름-ZRR-009', '증적 문서', '만듦',
    ]) {
      expect(글, 조각).toContain(조각);
    }
  });

  it('견줄 앞이 없으면 비교 기준 · 해결 · 같은 사유 칸이 없다', async () => {
    연다(섞인항목);
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('실행 정보');
      return 칸!;
    });

    expect(옆.textContent).not.toContain('비교 기준');
    expect(옆.textContent).not.toContain('해결');
    expect(옆.textContent).not.toContain('같은 사유로 실패');
  });

  it('상자 안에서는 옆 칸이 접힌 줄 하나이고 실행 정보는 그리지 않는다', async () => {
    연다(섞인항목, 견줌, true);
    const 접기 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side details');
      expect(칸).not.toBeNull();
      return 칸!;
    });

    expect(document.querySelectorAll('.rr-side details')).toHaveLength(1);
    expect(접기.hasAttribute('open')).toBe(false);
    expect(접기.querySelector('summary')?.textContent).toBe('같은 사유로 실패 1묶음 · 해결 1');
    expect(document.querySelector('.rr-side dl')).toBeNull();
    expect(앞선가(document.querySelector('.rs'), document.querySelector('.rr-side'))).toBe(true);
    expect(document.querySelector('.rows-scroll .rr-side')).not.toBeNull();
  });
});
