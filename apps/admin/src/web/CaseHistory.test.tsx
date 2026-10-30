// @vitest-environment jsdom
// 케이스 상세 「실행 이력」의 한 건 실행 줄 — 붙은 실행 · 도는 한 건은 「진행 보기」로 진행 창을 다시 연다 (도메인/실행 §3.2 「저장」)

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { HistoryRow } from './api.js';
import { 실행마다묶기 } from './caseDetailView.js';
import { 실행이력칸 } from './CaseHistory.js';
import { 지켜보는실행, 지켜본다 } from './runWatchStore.js';

afterEach(() => {
  cleanup();
  지켜본다(null);
  sessionStorage.clear();
});

const 줄 = (덮어쓸: Partial<HistoryRow>): HistoryRow => ({
  historyId: 1, runId: 10, runTitle: '밤 전체 테스트', platform: 'desktop', status: 'FAIL', durationMs: 1,
  startedAt: '2026-10-29T01:00:00.000Z', finishedAt: '2026-10-29T01:01:00.000Z', origin: 'MANUAL', rerunOf: null, ...덮어쓸,
});

describe('실행 이력의 한 건 실행 줄', () => {
  it('끝난 한 건은 붙은 실행을, 붙은 곳이 없으면 한 건 실행이라고 적는다', () => {
    render(
      <실행이력칸
        묶음={실행마다묶기([
          줄({ historyId: 3, runId: 12, runTitle: 'ZRS-001 실행', status: 'PASS', origin: 'SINGLE', rerunOf: 10 }),
          줄({ historyId: 2, runId: 11, runTitle: 'ZRS-001 실행', status: 'PASS', origin: 'SINGLE', rerunOf: null }),
          줄({}),
        ])}
      />,
    );
    const 줄들 = screen.getAllByRole('row').map((r) => r.textContent);
    expect(줄들[0]).toContain('ZRS-001 실행 · RUN 10에 다시 실행으로 붙음');
    expect(줄들[1]).toContain('ZRS-001 실행 · 한 건 실행');
    expect(줄들[2]).not.toContain('다시 실행');
  });

  it('도는 한 건은 「진행 중」이고 「진행 보기」를 누르면 진행 창을 다시 연다', () => {
    render(<실행이력칸 묶음={실행마다묶기([줄({ runId: 12, origin: 'SINGLE', rerunOf: 10, finishedAt: null, status: 'NA' })])} />);
    expect(screen.getByRole('row').textContent).toContain('진행 중');
    fireEvent.click(screen.getByRole('button', { name: '진행 보기' }));
    expect(지켜보는실행()).toEqual({ runId: 12, 열림: true });
  });
});
