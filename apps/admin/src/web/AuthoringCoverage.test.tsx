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
  const 라벨 = screen.getByText('PRD 요구사항');
  const 줄 = 라벨.closest('.status-row');
  if (!(줄 instanceof HTMLElement)) throw new Error('PRD 요구사항 줄이 status-row 안에 없다');
  return 줄;
}

beforeEach(() => {
  답들.clear();
  window.location.hash = '';
});

afterEach(cleanup);

describe('Status 카드 — PRD 요구사항 집계 한 줄', () => {
  it('집계가 있으면 요구 수 · 케이스로 만든 수와 % · 입력이 필요한 케이스로만 · 제외(다음 작성) · 빠짐을 한 줄에 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 지금={지금} />);
    expect(셈줄().textContent).toBe('PRD 요구사항요구 172개 중 케이스로 만듦 48개 (28%) · 입력이 필요한 케이스로만 3 · 제외 124 (다음 작성 100) · 빠짐 0');
  });

  it('보류를 모르면 끝난 실행에서만 보류 여부 확인 불가라고 적는다 — 보류는 끝났을 때만 센다', () => {
    const 셈 = { ...예시셈, held: null };
    render(<AuthoringStatusCard 요청={줄({ coverage: 셈 })} 지금={지금} />);
    expect(셈줄().textContent).toContain('입력이 필요한지 확인할 수 없음');
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ status: 'STOPPED', stopReason: 'REJECTED', coverage: 셈 })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('입력 필요');
  });

  it('갈래 수가 있으면 첫 줄은 그대로 두고 둘째 줄에 기능 · UI 테스트가 덮은 수를 따로 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, casedFn: 40, casedUi: 12 } })} 지금={지금} />);
    const 글 = 셈줄().textContent ?? '';
    expect(글).toContain('요구 172개 중 케이스로 만듦 48개 (28%) · 입력이 필요한 케이스로만 3 · 제외 124 (다음 작성 100) · 빠짐 0');
    expect(글).toContain('만든 48개 중 기능 테스트가 덮은 것 40 · UI 테스트가 덮은 것 12 — 둘 다 덮은 요구는 양쪽에 셉니다');
    expect(글.split('기능 테스트')).toHaveLength(2);
  });

  it('갈래 수가 하나라도 없으면 둘째 줄을 안 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, casedFn: 40 } })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('덮은 것');
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('덮은 것');
  });

  it('입력이 필요한 케이스로만 쓴 것이 0 이면 그 칸을 뺀다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, held: 0 } })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('입력이 필요한 케이스');
  });

  it('빠진 요구가 있으면 셋째 줄에 번호 고리를 단다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, missing: ['FR-001', 'FR-002'] } })} 지금={지금} />);
    expect(셈줄().textContent).toContain('빠짐 2');
    expect(셈줄().textContent).toContain('빠진 요구');
    expect(screen.getByRole('link', { name: 'FR-001' }).getAttribute('href')).toBe('#/prd/FR-001');
    expect(screen.getByRole('link', { name: 'FR-002' }).getAttribute('href')).toBe('#/prd/FR-002');
  });

  it('빠진 요구가 없으면 번호 줄이 없고, 열 개를 넘으면 앞의 열 개와 외 N개만 낸다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 지금={지금} />);
    expect(셈줄().textContent).not.toContain('빠진 요구');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, missing: 번호들('FR', 13) } })} 지금={지금} />);
    expect(screen.getAllByRole('link')).toHaveLength(10);
    expect(screen.getByRole('link', { name: 'FR-10' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'FR-11' })).toBeNull();
    expect(셈줄().textContent).toContain('외 3개');
    expect(셈줄().textContent).toContain('빠짐 13');
  });

  it('다음 작성이 없으면 괄호를 빼고, PRD 밖 자료가 있으면 끝에 적는다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { ...예시셈, held: 0, later: [], unread: ['화면설계.pdf'] } })}
        지금={지금}
      />,
    );
    const 글 = 셈줄().textContent ?? '';
    expect(글).not.toContain('(다음 작성');
    expect(글).toContain('제외 124 · 빠짐 0 · PRD 밖 자료 1');
  });

  it('제외가 0 이어도 제외 칸을 남긴다 — 넷이 합쳐 전부라는 것이 보여야 한다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { total: 3, cased: 1, held: 0, excluded: {}, missing: ['R-2', 'R-3'], later: [] } })}
        지금={지금}
      />,
    );
    expect(셈줄().textContent).toContain('요구 3개 중 케이스로 만듦 1개 (33%) · 제외 0 · 빠짐 2');
  });

  it('요구가 0 개면 % 를 뺀다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ coverage: { total: 0, cased: 0, held: 0, excluded: {}, missing: [], later: [] } })}
        지금={지금}
      />,
    );
    const 글 = 셈줄().textContent ?? '';
    expect(글).toContain('요구 0개 중 케이스로 만듦 0개');
    expect(글).not.toContain('%');
  });

  it('제외에 계정 미등록이 있어도 카드에는 계정 보류 줄을 안 적는다 — 다음 단계가 역할 이름과 함께 말한다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, excluded: { '계정 미등록': 16 } } })} 지금={지금} />);
    expect(screen.queryByText(/역할 계정이 등록되지 않았습니다/)).toBeNull();
    expect(screen.queryByText(/계정이 없어 못 쓴 요구/)).toBeNull();
    expect(셈줄().textContent).toContain('제외 16');
  });

  it('원장을 못 만들었으면 집계 없음과 까닭을 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ coverage: { none: 'PDF 라 글자를 못 뽑았다' } })} 지금={지금} />);
    expect(셈줄().textContent).toBe('PRD 요구사항집계 없음 — PDF 라 글자를 못 뽑았다');
  });

  it('셈이 없는 요청(이 칸 전의 실행)에는 줄이 없다', () => {
    render(<AuthoringStatusCard 요청={줄({})} 지금={지금} />);
    expect(screen.queryByText('PRD 요구사항')).toBeNull();
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: null })} 지금={지금} />);
    expect(screen.queryByText('PRD 요구사항')).toBeNull();
  });

  it('진척 기록이 없어도 줄은 보인다 — 숫자 칸과 따로다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: null, coverage: 예시셈 })} 지금={지금} />);
    expect(screen.queryByText('작성한 케이스 파일')).toBeNull();
    expect(셈줄().textContent).toContain('요구 172개 중 케이스로 만듦 48개 (28%)');
  });

  it('셈을 따로 넘기면 요청의 셈 대신 그것을 쓴다 — null 을 넘기면 줄이 없다', () => {
    const 따로 = { ...예시셈, total: 50, cased: 50, excluded: {}, later: [] };
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 커버리지={따로} 지금={지금} />);
    expect(셈줄().textContent).toContain('요구 50개 중 케이스로 만듦 50개 (100%)');
    cleanup();
    render(<AuthoringStatusCard 요청={줄({ coverage: 예시셈 })} 커버리지={null} 지금={지금} />);
    expect(screen.queryByText('PRD 요구사항')).toBeNull();
  });

  it('영어 화면에서는 라벨과 칸이 영어다', () => {
    render(
      <언어함 value="en">
        <AuthoringStatusCard 요청={줄({ coverage: { ...예시셈, unread: ['a.pdf'] } })} 지금={지금} />
      </언어함>,
    );
    const 라벨 = screen.getByText('PRD requirements');
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
    await screen.findByText('PRD 요구사항');
    expect(셈줄().textContent).toContain('요구 172개 중 케이스로 만듦 48개 (28%)');
  });

  it('다시 작성한 실행이 있으면 처음 실행이 아니라 그 실행의 셈을 보인다', async () => {
    const 기록 = [실행({ id: 11, kind: 'MERGE' }), 실행({ id: 9, kind: 'RERUN' }), 실행({ id: 5, status: 'FAILED' })];
    답들.set(5, 줄({ id: 5, status: 'FAILED', rootId: 5, runs: 기록, coverage: { none: '처음 실행의 옛 셈' } }));
    답들.set(9, 줄({ id: 9, kind: 'RERUN', sourceId: 5, rootId: 5, runs: 기록, coverage: 예시셈 }));
    답들.set(11, 줄({ id: 11, kind: 'MERGE', sourceId: 9, progress: null, rootId: 5, runs: 기록 }));
    render(<AuthoringDetail service="PAY" id={5} 할수={운영} />);
    await screen.findByText('PRD 요구사항');
    expect(셈줄().textContent).toContain('요구 172개 중 케이스로 만듦 48개 (28%)');
    expect(screen.queryByText(/처음 실행의 옛 셈/)).toBeNull();
  });
});
