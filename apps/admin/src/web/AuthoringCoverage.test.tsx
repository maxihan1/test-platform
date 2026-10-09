// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringCoverage, AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import { AuthoringStatusCard } from './AuthoringStatusCard.js';
import { 언어함 } from './i18n.js';
import type { 판정 } from './role.js';

const 답들 = new Map<number, AuthoringRow>();

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequest: (_s: string, id: number) => {
        const 답 = 답들.get(id);
        return 답 === undefined ? Promise.reject(new Error(`없는 번호 ${String(id)}`)) : Promise.resolve(답);
      },
      createAuthoringMerge: () => Promise.resolve({ id: 2 }),
      stopAuthoring: () => Promise.resolve({ status: 'RUNNING' as const }),
      discardAuthoring: () => Promise.resolve({ ok: true as const }),
      createAuthoringRequest: () => Promise.resolve({ id: 9 }),
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

const 지금 = Date.parse('2026-09-30T13:32:00Z');
const 운영: 판정 = () => true;

function 번호들(머리: string, 수: number): string[] {
  return Array.from({ length: 수 }, (_, i) => `${머리}-${String(i + 1)}`);
}

const 예시셈: AuthoringCoverage = {
  total: 172,
  cased: 48,
  held: 3,
  excluded: { '다음 요청': 100, 비기능: 24 },
  missing: [],
  later: 번호들('R', 100),
};

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 5877,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: '2026-09-30T13:30:00Z',
    requestedByName: '테스터',
    claimedBy: 'author',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: '2026-09-30T13:00:00Z',
    startedAt: '2026-09-30T13:01:00Z',
    finishedAt: '2026-09-30T13:30:00Z',
    progress: { childRunning: false, elapsedSec: 1740, limitSec: 3600, caseFiles: 30, tokens: 900_000 },
    ...덮을것,
  };
}

function 셈줄(): HTMLElement {
  const 라벨 = screen.getByText('기획서 요구');
  const 줄 = 라벨.closest('.status-row');
  if (!(줄 instanceof HTMLElement)) throw new Error('기획서 요구 줄이 status-row 안에 없다');
  return 줄;
}

beforeEach(() => {
  답들.clear();
  window.location.hash = '';
});

afterEach(cleanup);

describe('Status 카드 — 기획서 요구 셈 한 줄', () => {
  it('셈이 있으면 요구 수 · 케이스로 덮은 수와 % · 보류로만 · 제외(다음 요청) · 빠짐을 한 줄에 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 지금={지금} />);
    expect(셈줄().textContent).toBe('기획서 요구172개 → 케이스로 덮음 48 (28%) · 보류로만 3 · 제외 124 (다음 요청 100) · 빠짐 0');
  });

  it('보류를 모르면 끝난 실행에서만 보류 모름이라고 적는다 — 보류는 끝났을 때만 센다', () => {
    const 셈 = { ...예시셈, held: null };
    render(<AuthoringStatusCard 요청={줄({ coverage: 셈 })} 지금={지금} />);
    expect(셈줄().textContent).toContain('보류 모름');
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ status: 'STOPPED', stopReason: 'REJECTED', coverage: 셈 })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('보류');
  });

  it('갈래 수가 있으면 케이스로 덮음 뒤에 기능 · UI 테스트로 덮은 수를 붙인다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, casedFn: 40, casedUi: 12 } })} 지금={지금} />);
    expect(셈줄().textContent).toBe(
      '기획서 요구172개 → 케이스로 덮음 48 (28%) · 기능 테스트 40 · UI 테스트 12 · 보류로만 3 · 제외 124 (다음 요청 100) · 빠짐 0',
    );
  });

  it('보류로만 덮은 것이 0 이면 그 칸을 뺀다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, held: 0 } })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('보류');
  });

  it('다음 요청이 없으면 괄호를 빼고, 원장 밖 자료가 있으면 끝에 적는다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { ...예시셈, held: 0, later: [], unread: ['화면설계.pdf'] } })}
        지금={지금}
      />,
    );
    const 글 = 셈줄().textContent ?? '';
    expect(글).not.toContain('(다음 요청');
    expect(글).toContain('제외 124 · 빠짐 0 · 원장 밖 자료 1');
  });

  it('제외가 0 이어도 제외 칸을 남긴다 — 넷이 합쳐 전부라는 것이 보여야 한다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { total: 3, cased: 1, held: 0, excluded: {}, missing: ['R-2', 'R-3'], later: [] } })}
        지금={지금}
      />,
    );
    expect(셈줄().textContent).toBe('기획서 요구3개 → 케이스로 덮음 1 (33%) · 제외 0 · 빠짐 2');
  });

  it('요구가 0 개면 % 를 뺀다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { total: 0, cased: 0, held: 0, excluded: {}, missing: [], later: [] } })}
        지금={지금}
      />,
    );
    const 글 = 셈줄().textContent ?? '';
    expect(글).toContain('0개 → 케이스로 덮음 0');
    expect(글).not.toContain('%');
  });

  it('원장을 못 만들었으면 셈 없음과 까닭을 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { none: 'PDF 라 글자를 못 뽑았다' } })} 지금={지금} />);
    expect(셈줄().textContent).toBe('기획서 요구셈 없음 — PDF 라 글자를 못 뽑았다');
  });

  it('셈이 없는 요청(이 칸 전의 실행)에는 줄이 없다', () => {
    render(<AuthoringStatusCard 요청={줄({})} 지금={지금} />);
    expect(screen.queryByText('기획서 요구')).toBeNull();
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: null })} 지금={지금} />);
    expect(screen.queryByText('기획서 요구')).toBeNull();
  });

  it('진척 기록이 없어도 줄은 보인다 — 숫자 칸과 따로다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: null, coverage: 예시셈 })} 지금={지금} />);
    expect(screen.queryByText('만든 케이스 파일')).toBeNull();
    expect(셈줄().textContent).toContain('172개 → 케이스로 덮음 48 (28%)');
  });

  it('셈을 따로 넘기면 요청의 셈 대신 그것을 쓴다 — null 을 넘기면 줄이 없다', () => {
    const 따로 = { ...예시셈, total: 50, cased: 50, excluded: {}, later: [] };
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 커버리지={따로} 지금={지금} />);
    expect(셈줄().textContent).toContain('50개 → 케이스로 덮음 50 (100%)');
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 커버리지={null} 지금={지금} />);
    expect(screen.queryByText('기획서 요구')).toBeNull();
  });

  it('영어 화면에서는 라벨과 칸이 영어다', () => {
    render(
      <언어함 value="en">
        <AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, unread: ['a.pdf'] } })} 지금={지금} />
      </언어함>,
    );
    const 라벨 = screen.getByText('Spec requirements');
    const 글 = 라벨.closest('.status-row')?.textContent ?? '';
    expect(글).not.toMatch(/[가-힣]/u);
    expect(글).toContain('172');
    expect(글).toContain('(28%)');
    expect(글).toContain('100');
  });
});

describe('상세 — 셈은 머지를 뺀 최신 작성 실행 것이다', () => {
  const 때 = '2026-09-30T13:30:00.000Z';
  const 실행 = (덮을것: Partial<NonNullable<AuthoringRow['runs']>[number]>) => ({
    id: 5,
    kind: 'AUTHOR' as const,
    resumeFrom: null,
    status: 'DONE' as const,
    stopReason: null,
    error: null,
    createdAt: 때,
    startedAt: 때,
    finishedAt: 때,
    caseFiles: null,
    tokens: null,
    prUrl: null,
    ...덮을것,
  });

  it('반영이 끝나 최신 실행이 머지여도 작성 실행의 셈 줄이 남는다', async () => {
    const 기록 = [실행({ id: 11, kind: 'MERGE' }), 실행({ id: 5 })];
    답들.set(5, 줄({ id: 5, rootId: 5, runs: 기록, coverage: 예시셈 }));
    답들.set(11, 줄({ id: 11, kind: 'MERGE', sourceId: 5, progress: null, rootId: 5, runs: 기록 }));
    render(<AuthoringDetail service="PAY" id={5} 할수={운영} />);
    await screen.findByText('기획서 요구');
    expect(셈줄().textContent).toContain('172개 → 케이스로 덮음 48 (28%)');
  });

  it('다시 작성한 실행이 있으면 처음 실행이 아니라 그 실행의 셈을 보인다', async () => {
    const 기록 = [실행({ id: 11, kind: 'MERGE' }), 실행({ id: 9, kind: 'RERUN' }), 실행({ id: 5, status: 'FAILED' })];
    답들.set(5, 줄({ id: 5, status: 'FAILED', rootId: 5, runs: 기록, coverage: { none: '처음 실행의 옛 셈' } }));
    답들.set(9, 줄({ id: 9, kind: 'RERUN', sourceId: 5, rootId: 5, runs: 기록, coverage: 예시셈 }));
    답들.set(11, 줄({ id: 11, kind: 'MERGE', sourceId: 9, progress: null, rootId: 5, runs: 기록 }));
    render(<AuthoringDetail service="PAY" id={5} 할수={운영} />);
    await screen.findByText('기획서 요구');
    expect(셈줄().textContent).toContain('172개 → 케이스로 덮음 48 (28%)');
    expect(screen.queryByText(/처음 실행의 옛 셈/)).toBeNull();
  });
});
