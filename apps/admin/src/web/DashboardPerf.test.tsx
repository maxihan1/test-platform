// @vitest-environment jsdom
// 대시보드 「게임 성능」 칸 검사 — PC 게임이면 배터리 온도 자리에 스터터를 보인다 (도메인/리포팅 §8.12 「종류별 칸」 · 2026-11-27 사용자)

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { 성능칸 } from './DashboardPerf.js';

afterEach(cleanup);

const 게임 = (pc: boolean) => ({
  runId: 31, serviceName: pc ? 'Cats Go! PC' : 'Boss Room 게임', device: pc ? 'pc-pc1' : 'SM-G996N', startedAt: '2026-11-27T03:00:00Z', verdict: 'FAIL' as const,
  avgCpu: 27.1, maxMemMb: 2010, launchMs: 54_000, jankPct: 0.5,
  avgFps: 59.1, low1Fps: 31.2, freezeCount: 0, maxTempC: pc ? null : 28.6, jankPerMin: 0.7, pc,
});

const 그리기 = (pc: boolean) =>
  render(<성능칸 성능={{ load: null, pages: null, app: null, game: 게임(pc) }} 종류들={new Set(['GAME'])} 실패유형={null} />);

describe('대시보드 게임 성능 칸', () => {
  it('PC 게임은 배터리 온도 대신 스터터를 분당 횟수로 보인다', () => {
    그리기(true);
    expect(screen.getByText('스터터')).toBeTruthy();
    expect(screen.getByText('분당 0.7회')).toBeTruthy();
    expect(screen.queryByText('배터리 온도')).toBeNull();
  });

  it('모바일 게임은 그대로 배터리 온도다', () => {
    그리기(false);
    expect(screen.getByText('배터리 온도')).toBeTruthy();
    expect(screen.getByText('28.6℃')).toBeTruthy();
    expect(screen.queryByText('스터터')).toBeNull();
  });
});
