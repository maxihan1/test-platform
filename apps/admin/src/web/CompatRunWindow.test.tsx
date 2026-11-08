// @vitest-environment jsdom
// 호환성 실행 중 창 검사 (도메인/호환성 §8.17 ③)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { compatApi } from './compatApi.js';
import { 결과, 상태 } from './compatRun.fixture.js';
import { CompatRunWindow } from './CompatRunWindow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 도는 = (vision: string | null) =>
  결과({
    run: { ...결과().run, state: 'RUNNING', finishedAt: null },
    devices: [
      상태(1),
      상태(2, { state: 'RUNNING', cases: { done: 5, total: 9 }, checks: { done: 40, total: 61 }, now: { tcId: 'DMA-UI-031', name: '장바구니 담기', startedAt: new Date().toISOString() }, vision }),
      상태(3, { state: 'WAIT' }),
    ],
  });

describe('호환성 실행 중 창', () => {
  it('지금 디바이스 카드에 케이스 차례 · 지금 케이스 · AI 점검 장 수를 보이고 잡은 폰의 VISION 링크를 연다', async () => {
    vi.spyOn(compatApi, 'run').mockResolvedValue(도는('https://vision.example/devices/S2'));
    render(<CompatRunWindow runId={21107} service="DMA" 닫기={() => undefined} />);
    const 창 = within(await screen.findByRole('dialog', { name: '출시 전 점검 · 호환성 실행 중' }));
    // 지금 디바이스 카드와 실행 순서 줄 둘 다 같은 차례를 말한다
    expect(창.getAllByText(/케이스 6 \/ 9/)).toHaveLength(2);
    expect(창.getByText('장바구니 담기', { exact: false })).toBeTruthy();
    expect(창.getByText(/^점검 상태 1 \/ 3 완료/)).toBeTruthy();
    expect(창.getByRole('link', { name: /Device VISION 에서 디바이스 화면 보기/ }).getAttribute('href')).toBe('https://vision.example/devices/S2');
    expect(창.getByRole('button', { name: '실행 중단' })).toBeTruthy();
  });

  it('링크가 없으면(놓았거나 옛 비전) 안내만 선다', async () => {
    vi.spyOn(compatApi, 'run').mockResolvedValue(도는(null));
    render(<CompatRunWindow runId={21107} service="DMA" 닫기={() => undefined} />);
    const 창 = within(await screen.findByRole('dialog', { name: '출시 전 점검 · 호환성 실행 중' }));
    expect(창.queryByRole('link', { name: /Device VISION/ })).toBeNull();
    expect(창.getByText('디바이스 화면은 Device VISION 에서 봅니다')).toBeTruthy();
  });

  it('끝나면 결과 단계로 넘어가고 결과 보기는 애플리케이션을 담은 결과 주소로 간다', async () => {
    vi.spyOn(compatApi, 'run').mockResolvedValue(결과());
    render(<CompatRunWindow runId={21107} service="DMA" 닫기={() => undefined} />);
    const 창 = within(await screen.findByRole('dialog', { name: '출시 전 점검 · 호환성 실행이 완료되었습니다' }));
    fireEvent.click(창.getByRole('button', { name: '결과 보기' }));
    expect(window.location.hash).toBe('#/compat/runs/21107?service=DMA');
  });
});
