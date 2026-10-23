// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringMadeCase, AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import type { 판정 } from './role.js';

const 운영: 판정 = () => true;
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
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

vi.mock('./RunWindow.js', () => ({
  RunWindow: ({ tcIds }: { tcIds: string[] }) => <div role="dialog" aria-label="실행 창">{tcIds.join(',')}</div>,
}));

const 때 = '2026-10-24T00:00:00.000Z';

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: 때,
    requestedByName: '테스터',
    claimedBy: '맥',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: 때,
    startedAt: 때,
    finishedAt: 때,
    ...덮을것,
  };
}

const 실행 = (id: number, kind: 'AUTHOR' | 'MERGE') => ({
  id,
  kind,
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
});

const 케이스 = (tcId: string, name: string): AuthoringMadeCase => ({
  tcId,
  name,
  file: `tests/mkt/${tcId}.spec.ts`,
  change: 'NEW',
  verifies: ['문구가 보인다'],
  reqs: [],
});

const 기록 = [실행(8, 'MERGE'), 실행(7, 'AUTHOR')];

function 반영된요청(mergedAs?: Record<string, string | null>): void {
  답들.set(
    7,
    줄({
      rootId: 7,
      runs: 기록,
      cases: [케이스('MKT-FN-001', '쿠폰을 쓰면 값이 준다'), 케이스('MKT-FN-002', '쿠폰이 지나면 못 쓴다'), 케이스('MKT-FN-003', '장바구니가 빈다')],
      result: { diffs: [{ no: 'D1', kind: 'DIFFERENT', where: '쿠폰', doc: '10%', screen: '5%', tcId: 'MKT-FN-001', marked: true }] },
      assets: [
        { id: 11, position: 1, kind: 'FILE', name: '쿠폰 기획서.docx', figmaUrl: null, size: 10, role: 'INPUT' },
        { id: 21, position: 2, kind: 'FILE', name: '쿠폰 기획서 표시.docx', figmaUrl: null, size: 12, role: 'MARKED', sourceAssetId: 11 },
      ],
    }),
  );
  답들.set(
    8,
    줄({
      id: 8,
      kind: 'MERGE',
      sourceId: 7,
      rootId: 7,
      runs: 기록,
      result: mergedAs === undefined ? { pulled: true } : { pulled: true, mergedAs },
    }),
  );
}

beforeEach(() => {
  답들.clear();
  window.location.hash = '';
});
afterEach(() => cleanup());

describe('반영이 겹친 케이스 번호를 바꾼 뒤의 작성 상세 (리뷰 M6)', () => {
  it('만든 케이스 · 차이 표 고리는 반영된 새 번호로, 뺀 케이스는 고리 없이 「반영 때 뺌」이다', async () => {
    반영된요청({ 'MKT-FN-001': 'MKT-FN-014', 'MKT-FN-002': null });
    render(<AuthoringDetail service="MKT" id={7} 할수={운영} />);

    const 만든 = await screen.findByRole('table', { name: '만든 케이스' });
    const 고리들 = Array.from(만든.querySelectorAll('a.mono')).map((a) => a.getAttribute('href'));
    expect(고리들).toEqual(['#/cases/fn?case=MKT-FN-014', '#/cases/fn?case=MKT-FN-003']);
    expect(만든.textContent).toContain('반영 때 뺌');

    const 차이 = screen.getByRole('table', { name: '기획서와 화면의 차이' });
    expect(차이.querySelector('a.mono')?.getAttribute('href')).toBe('#/cases/fn?case=MKT-FN-014');
  });

  it('「바로 실행」은 반영된 번호만 돌린다 — 뺀 케이스와 작성 때 번호는 안 싣는다', async () => {
    반영된요청({ 'MKT-FN-001': 'MKT-FN-014', 'MKT-FN-002': null });
    render(<AuthoringDetail service="MKT" id={7} 할수={운영} />);

    fireEvent.click(await screen.findByRole('button', { name: '기능 테스트 2건 바로 실행' }));
    expect(screen.getByRole('dialog', { name: '실행 창' }).textContent).toBe('MKT-FN-014,MKT-FN-003');
  });

  it('번호를 바꾸지 않은 반영은 작성 때 번호 그대로다', async () => {
    반영된요청();
    render(<AuthoringDetail service="MKT" id={7} 할수={운영} />);

    fireEvent.click(await screen.findByRole('button', { name: '기능 테스트 3건 바로 실행' }));
    expect(screen.getByRole('dialog', { name: '실행 창' }).textContent).toBe('MKT-FN-001,MKT-FN-002,MKT-FN-003');
  });
});

describe('반영 뒤의 산출물 고리 (리뷰 M7)', () => {
  it('산출물 내려받기 고리는 반영 행이 아니라 그것을 만든 작성 실행 번호로 간다', async () => {
    반영된요청();
    render(<AuthoringDetail service="MKT" id={7} 할수={운영} />);

    const 산출물 = await screen.findByRole('list', { name: '산출물' });
    expect(산출물.querySelector('a')?.getAttribute('href')).toBe('/api/authoring/requests/7/assets/21');
  });
});
