// @vitest-environment jsdom
// 대시보드 신규 실패 서랍 검사 (도메인/리포팅 §8.12 · DESIGN.md 「모달」 서랍)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api } from './api.js';
import { 신규실패표 } from './DashboardFail.js';
import { 장치, 줄, 케이스, 쪽 } from './RunFailCards.fixture.js';

const 실패 = {
  runId: 7,
  serviceId: 1,
  serviceName: 'ZDA 결제',
  env: 'qa',
  kind: 'FN' as const,
  tcId: 'ZDA-001',
  tcName: '카드로 결제한다',
  platform: 'desktop' as const,
  finishedAt: '2026-10-07T05:10:00.000Z',
  reason: null,
  type: 'mismatch' as const,
};

const 값 = { window: { days: 14 }, byService: [], newFailures: [실패] } as unknown as 대시보드응답;

function 실행응답(): Awaited<ReturnType<typeof api.run>> {
  return {
    runId: 7,
    title: '결제 회귀',
    triggeredBy: 'u',
    triggeredByName: null,
    env: 'qa',
    baseUrl: '',
    serviceName: 'ZDA 결제',
    status: 'FINISHED',
    startedAt: '2026-10-07T05:00:00.000Z',
    finishedAt: '2026-10-07T05:10:00.000Z',
    counts: { total: 1, pass: 0, fail: 1, na: 0, running: 0 },
    items: [줄(11, 'ZDA-001', 'desktop', 'FAIL')],
    evidence: [],
  } as Awaited<ReturnType<typeof api.run>>;
}

function 그리기(서비스열기 = vi.fn()) {
  vi.spyOn(api, 'run').mockResolvedValue(실행응답());
  vi.spyOn(api, 'failures').mockResolvedValue(쪽([케이스('ZDA-001', '카드로 결제한다', [장치('desktop', 11)])]));
  render(<신규실패표 값={값} 이동={{ 서비스번호: null, 서비스열기 }} />);
  return screen.getByRole('link', { name: '카드로 결제한다' });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('신규 실패 서랍', () => {
  it('케이스 이름을 누르면 화면을 떠나지 않고 서랍에 그 케이스의 실패 카드가 펼쳐진다', async () => {
    const 서비스열기 = vi.fn();
    const 이름 = 그리기(서비스열기);

    expect(fireEvent.click(이름)).toBe(false);

    const 서랍 = document.getElementById('fail-drawer')!;
    expect(서랍.tagName).toBe('ASIDE');
    expect(within(서랍).getByRole('heading', { level: 2 }).textContent).toBe('신규 실패 · RUN 7');
    expect(await within(서랍).findByRole('heading', { name: '카드로 결제한다' })).toBeTruthy();
    expect(서랍.querySelector('details')?.open).toBe(true);
    expect(within(서랍).getByRole('link', { name: '실행 기록에서 보기' }).getAttribute('href')).toBe('#/runs/fn?run=7&tc=ZDA-001');
    expect(서비스열기).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc 로 닫히고 포커스가 누른 이름으로 돌아온다', async () => {
    const 이름 = 그리기();
    이름.focus();
    fireEvent.click(이름);
    await screen.findByRole('heading', { name: '카드로 결제한다' });
    expect(document.activeElement).toBe(document.getElementById('fail-drawer'));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.getElementById('fail-drawer')).toBeNull();
    expect(document.activeElement).toBe(이름);
  });

  it('✕ 로도 닫힌다', async () => {
    const 이름 = 그리기();
    fireEvent.click(이름);

    fireEvent.click(within(document.getElementById('fail-drawer')!).getByRole('button', { name: '닫기' }));

    expect(document.getElementById('fail-drawer')).toBeNull();
  });

  it('새 탭으로 열려고 누르면 서랍을 열지 않고 주소대로 가며 애플리케이션을 고른다', () => {
    const 서비스열기 = vi.fn();
    const 이름 = 그리기(서비스열기);

    expect(fireEvent.click(이름, { metaKey: true })).toBe(true);

    expect(document.getElementById('fail-drawer')).toBeNull();
    expect(서비스열기).toHaveBeenCalledWith(1);
  });

  it('그 실행에서 카드를 못 찾으면 그렇다고 적는다', async () => {
    const 이름 = 그리기();
    vi.spyOn(api, 'failures').mockResolvedValue(쪽([]));
    fireEvent.click(이름);

    expect(await screen.findByText('이 실행에서 실패 카드를 찾지 못했습니다')).toBeTruthy();
  });
});
