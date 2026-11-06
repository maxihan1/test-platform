// 실행 창 시험 실행 검사가 같이 쓰는 케이스 · 결과 · 가짜 통로 (RunPickTrialRun · RunPickTrialDone 검사)

import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { api, type TrialResult, type TrialState } from './api.js';
import { 서비스, 케이스, 시작누름 } from './runPick.fixture.js';
import { RunPickModal } from './RunPickModal.js';
import { 장면통로 } from './TrialLive.js';

export const 둘째 = { ...케이스, tcId: 'ZRS-002', name: '둘째 케이스' };
export const 통과: TrialResult = { status: 'PASS', durationMs: 1200, steps: [{ seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] }] };
export const 실패: TrialResult = {
  status: 'FAIL',
  durationMs: 1800,
  steps: [
    { seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] },
    { seq: 2, title: '수량을 3으로 바꾼다', status: 'FAIL', durationMs: 50, assertions: [], error: { message: '수량 칸을 찾지 못했습니다' } },
  ],
};

export function 둘을연다(onRun = vi.fn()) {
  localStorage.clear();
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
  render(<RunPickModal 케이스들={[케이스, 둘째]} service={서비스} onRun={onRun} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
  return onRun;
}

export function 시험시작() {
  fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
  시작누름('시험 실행 시작');
}

/** 시험 번호마다 응답 차례를 준다. 차례를 다 쓰면 마지막 것을 되풀이한다 */
export function 차례대로(답들: Record<string, TrialState[]>) {
  const 몇째: Record<string, number> = {};
  vi.spyOn(api, 'startTrial').mockImplementation((tcId) => Promise.resolve({ trialId: `t-${tcId}` }));
  return vi.spyOn(api, 'getTrial').mockImplementation((_tcId, trialId) => {
    const 줄 = 답들[trialId] ?? [{ status: 'RUNNING' }];
    const i = Math.min(몇째[trialId] ?? 0, 줄.length - 1);
    몇째[trialId] = i + 1;
    return Promise.resolve(줄[i]!);
  });
}
