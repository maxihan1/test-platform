// @vitest-environment jsdom
// 실행 기록 › 호환성 결과 화면 검사 (도메인/호환성 §8.17 ④)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { compatApi } from './compatApi.js';
import { CompatResult } from './CompatResult.js';
import { 결과 } from './compatRun.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기(쓰나 = true, 덮 = 결과()) {
  const 읽기 = vi.spyOn(compatApi, 'run').mockResolvedValue(덮);
  render(<CompatResult runId={21107} service="DMA" 쓰나={쓰나} />);
  await screen.findByText('출시 전 점검 · 호환성 결과');
  return { 읽기 };
}

describe('호환성 결과', () => {
  it('머리 숫자 · 표 · 미점검 까닭 · 미커버 화면을 보인다', async () => {
    await 그리기();
    const 요약 = within(screen.getByRole('region', { name: '요약' }));
    expect(요약.getByText('디바이스 · 점검 상태 3')).toBeTruthy();
    expect(screen.getByText('결함 의심 · 미점검이 있는 화면만 · 이상 없는 화면 3개 숨김')).toBeTruthy();
    const 표 = within(screen.getByRole('table'));
    expect(표.getByRole('button', { name: '확정' })).toBeTruthy();
    expect(표.getByRole('button', { name: '미판정' })).toBeTruthy();
    expect(표.getByRole('button', { name: '미점검' }).getAttribute('title')).toBe('DMA-UI-031 이 3단계에서 실패');
    expect(screen.getByText(/1대 미점검 — DMA-UI-031 이 3단계에서 실패/)).toBeTruthy();
    expect(screen.getByText(/리뷰 작성 —/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '세트 보기' }).getAttribute('href')).toBe('#/compat/3?service=DMA');
  });

  it('결함 확정을 누르면 그 칸을 판정하고 다시 읽는다 · 이미 누른 판정을 다시 누르면 미판정으로 되돌린다', async () => {
    const { 읽기 } = await 그리기();
    const 판정 = vi.spyOn(compatApi, 'verdict').mockResolvedValue({});
    const 묶음 = within(screen.getByRole('region', { name: '장바구니' }));
    // 미판정 먼저 — 미판정 카드(첫 상태)가 앞이다
    const [미판정카드단추, 확정카드단추] = 묶음.getAllByRole('button', { name: '결함 확정' });
    fireEvent.click(미판정카드단추!);
    await waitFor(() => expect(판정).toHaveBeenCalledWith(21107, '/cart', 1, 'CONFIRMED'));
    await waitFor(() => expect(읽기).toHaveBeenCalledTimes(2));
    expect(확정카드단추!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(확정카드단추!);
    await waitFor(() => expect(판정).toHaveBeenCalledWith(21107, '/cart', 2, null));
  });

  it('결함 확정 거르개는 확정 카드만 남긴다 · 실행 write 가 아니면 판정 단추가 없다', async () => {
    await 그리기(false);
    expect(screen.queryByRole('button', { name: '결함 아님' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '결함 확정' }));
    const 묶음 = within(screen.getByRole('region', { name: '장바구니' }));
    expect(묶음.getAllByText('SM-A102N')).toHaveLength(1);
    expect(묶음.queryByText('SM-A101N')).toBeNull();
  });

  it('도는 실행을 열면 실행 창이 같이 뜬다', async () => {
    vi.spyOn(compatApi, 'run').mockResolvedValue(결과({ run: { ...결과().run, state: 'RUNNING', finishedAt: null } }));
    render(<CompatResult runId={21107} service="DMA" 쓰나 />);
    expect(await screen.findByRole('dialog', { name: '출시 전 점검 · 호환성 실행 중' })).toBeTruthy();
  });
});
