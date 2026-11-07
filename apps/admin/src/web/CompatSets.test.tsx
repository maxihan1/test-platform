// @vitest-environment jsdom
// 테스트 실행 › 호환성 세트 목록 검사 (도메인/호환성 §8.17 ①)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { compatApi, type CompatSetRow } from './compatApi.js';
import { CompatSets } from './CompatSets.js';

const 세트 = (덮: Partial<CompatSetRow>): CompatSetRow => ({
  id: 3,
  name: '출시 전 점검',
  onePerModel: true,
  devices: [
    { serial: 's1', model: 'SM-S928N', name: 'Galaxy S24 Ultra' },
    { serial: 's2', model: 'Pixel 8', name: 'Pixel 8' },
    { serial: 's3', model: 'SM-A155N', name: 'Galaxy A15' },
    { serial: 's4', model: 'LM-V500N', name: 'LG V50 ThinQ' },
  ],
  addedCases: ['MKA-FN-046', 'MKA-UI-012'],
  coverage: { covered: 31, total: 34, fallback: false },
  lastRun: { runId: 31, startedAt: '2026-11-06T05:20:00Z', state: 'DONE', confirmed: 2, pending: 4, unchecked: 0 },
  ...덮,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기(sets: CompatSetRow[], 쓰나 = true) {
  vi.spyOn(compatApi, 'sets').mockResolvedValue({ sets });
  const 미리셈 = vi.spyOn(compatApi, 'preview').mockResolvedValue({
    auto: Array.from({ length: 8 }, (_, i) => ({ tcId: `MKA-UI-0${String(10 + i)}`, name: `케이스 ${String(i)}`, adds: 3 })),
    coverage: { covered: 30, total: 34, fallback: false },
    uncovered: [],
  });
  render(<CompatSets serviceId={7} service="MKA" 쓰나={쓰나} />);
  await screen.findByText('호환성');
  return { 미리셈 };
}

describe('호환성 세트 목록', () => {
  it('세트 줄에 디바이스 · 케이스 · 화면 커버리지 · 최근 실행 알약을 보인다', async () => {
    const { 미리셈 } = await 그리기([세트({})]);
    expect(미리셈).toHaveBeenCalledWith(7, []);
    const 줄 = (await screen.findByRole('link', { name: '출시 전 점검' })).closest('tr')!;
    expect(screen.getByRole('link', { name: '출시 전 점검' }).getAttribute('href')).toBe('#/compat/3?service=MKA');
    const 칸 = within(줄);
    expect(칸.getByText('모델별 1대')).toBeTruthy();
    expect(칸.getByText('4대')).toBeTruthy();
    expect(칸.getByText('Galaxy S24 Ultra · Pixel 8 · Galaxy A15 외 1대')).toBeTruthy();
    expect(칸.getByText('자동 선택 8 · 직접 추가 1')).toBeTruthy();
    expect(칸.getByText('(91%)')).toBeTruthy();
    expect(칸.getByText('미커버 화면 3')).toBeTruthy();
    expect(칸.getByText('결함 확정 2')).toBeTruthy();
    expect(칸.getByText('미판정 4')).toBeTruthy();
    expect(칸.queryByText(/미점검/)).toBeNull();
  });

  it('실행이 없으면 실행 이력 없음, 다 덮으면 미커버 알약이 없다', async () => {
    await 그리기([세트({ onePerModel: false, lastRun: null, addedCases: [], coverage: { covered: 34, total: 34, fallback: false } })]);
    const 줄 = (await screen.findByRole('link', { name: '출시 전 점검' })).closest('tr')!;
    expect(within(줄).getByText('직접 선택')).toBeTruthy();
    expect(within(줄).getByText('자동 선택 8')).toBeTruthy();
    expect(within(줄).getByText('실행 이력 없음')).toBeTruthy();
    expect(within(줄).queryByText(/미커버 화면/)).toBeNull();
  });

  it('실행 write 만 세트를 만든다', async () => {
    await 그리기([], false);
    expect(screen.getByText('아직 만든 호환성 세트가 없습니다')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '세트 만들기' })).toBeNull();
    cleanup();
    await 그리기([]);
    expect(screen.getByRole('link', { name: '세트 만들기' }).getAttribute('href')).toBe('#/compat/new?service=MKA');
  });
});
