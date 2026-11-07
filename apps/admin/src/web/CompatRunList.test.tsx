// @vitest-environment jsdom
// 실행 기록 › 호환성 표 검사 (도메인/호환성 §8.17 ⑤)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { compatApi, type CompatRunRow } from './compatApi.js';
import { CompatRunList } from './CompatRunList.js';
import { 결과, 상태 } from './compatRun.fixture.js';

const 줄 = (덮: Partial<CompatRunRow>): CompatRunRow => ({
  runId: 21107,
  title: '출시 전 점검',
  triggeredBy: 'maxi',
  triggeredByName: 'maxi',
  env: 'stage',
  baseUrl: 'https://stage.example',
  serviceName: '데모마켓 앱',
  status: 'DONE',
  buildNo: '1.4.2',
  startedAt: '2026-11-06T05:20:00Z',
  finishedAt: '2026-11-06T06:20:00Z',
  compat: { setName: '출시 전 점검', devices: 12, screens: 31, confirmed: 2, pending: 4, affected: { states: 6, total: 14 }, unchecked: 2, stopReason: null },
  ...덮,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실행 기록 › 호환성', () => {
  it('끝난 줄은 점검 화면 · UI 결함 · 미점검을, 도는 줄은 진행을 보이고 줄은 결과로 간다', async () => {
    const 목록 = vi.spyOn(compatApi, 'runs').mockResolvedValue({
      items: [
        줄({ runId: 21112, status: 'RUNNING', finishedAt: null }),
        줄({}),
        줄({ runId: 21060, compat: { setName: '저사양', devices: 3, screens: 20, confirmed: 0, pending: 0, affected: { states: 0, total: 3 }, unchecked: 14, stopReason: 'AI 사용 한도 초과로 점검 중단' } }),
      ],
      total: 3,
      page: 1,
      pageSize: 50,
    });
    vi.spyOn(compatApi, 'run').mockResolvedValue(결과({ devices: [상태(1), 상태(2, { state: 'RUNNING', checks: { done: 1, total: 4 } }), 상태(3, { state: 'WAIT', checks: { done: 0, total: 0 } })] }));
    render(<CompatRunList service="DMA" />);
    expect(await screen.findByText('호환성 실행은 기능 · UI 실행 기록과 통과율에 포함하지 않습니다')).toBeTruthy();
    expect(목록).toHaveBeenCalledWith('DMA', 1, '');

    const 끝난 = within(screen.getByRole('link', { name: 'RUN 21107' }).closest('tr')!);
    expect(screen.getByRole('link', { name: 'RUN 21107' }).getAttribute('href')).toBe('#/compat/runs/21107?service=DMA');
    expect(끝난.getByText('결함 확정 2')).toBeTruthy();
    expect(끝난.getByText('미판정 4')).toBeTruthy();
    expect(끝난.getByText('발생 6 / 14 상태')).toBeTruthy();
    expect(끝난.getByText('2화면')).toBeTruthy();
    expect(끝난.getByText('빌드 1.4.2')).toBeTruthy();

    const 도는 = within(screen.getByRole('link', { name: 'RUN 21112' }).closest('tr')!);
    expect(await 도는.findByText('실행 중 · 점검 상태 1 / 3 · AI 점검 6 / 9장')).toBeTruthy();

    const 멈춘 = within(screen.getByRole('link', { name: 'RUN 21060' }).closest('tr')!);
    expect(멈춘.getByText('AI 사용 한도 초과로 점검 중단')).toBeTruthy();
  });
});
