// @vitest-environment jsdom
// E2E 조립 화면이 다음 단계 추천에 맨 뒤 케이스를 넘기고, 케이스 바꾸기 중에는 추천 칸을 안 그리는지 (도메인/시나리오 §8.11 「다음 단계 추천」)

import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type CaseRow } from './api.js';
import { 상세, 재료, 서비스, 사람, 케이스단계 } from './ScenarioBuild.fixture.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스 = (tcId: string): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-11T00:00:00.000Z',
  techniques: [],
});

it('케이스 바꾸기 중에는 추천을 부르지도 그리지도 않고, 취소하면 맨 뒤 케이스 기준 추천이 뜬다', async () => {
  vi.spyOn(api, 'cases').mockResolvedValue({ items: [케이스('ZSB-001'), 케이스('ZSB-002')], total: 2, page: 1, pageSize: 50 });
  vi.spyOn(scenarioApi, 'detail').mockResolvedValue(
    상세({ parts: [케이스단계('ZSB-404'), 케이스단계('ZSB-001'), { kind: 'wait', ms: 1000 }] }),
  );
  vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
    if (tcId === 'ZSB-404') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
    return 재료(tcId);
  });
  const 추천 = vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [{ tcId: 'ZSB-002', screen: '/cart' }] });
  render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

  fireEvent.click(await screen.findByRole('button', { name: '케이스 바꾸기' }));
  await screen.findByText('1번 단계를 바꿀 케이스를 고릅니다');
  expect(screen.queryByRole('region', { name: '다음 단계 추천' })).toBeNull();
  expect(추천).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(await screen.findByRole('region', { name: '다음 단계 추천' })).toBeTruthy();
  await waitFor(() => expect(추천).toHaveBeenCalledWith('ZSB', 'ZSB-001'));
  expect(screen.getByText('2번 단계가 머무는 화면에서 이어지는 정상 케이스 1')).toBeTruthy();
});
