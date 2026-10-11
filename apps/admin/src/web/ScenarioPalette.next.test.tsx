// @vitest-environment jsdom
// E2E 단계 추가 탭의 다음 단계 추천 — 맨 뒤 케이스 기준 · 정상 쪽 · 디바이스 · 찾기 · 실패 (도메인/시나리오 §8.11 「다음 단계 추천」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { ScenarioPalette } from './ScenarioPalette.js';
import { scenarioApi } from './scenarioApi.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스 = (tcId: string, axis: '정상' | '경계', 덮: Partial<CaseRow> = {}): CaseRow => ({
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
  feature: '장바구니',
  reqs: [{ reqId: `REQ-${tcId}`, text: `${tcId} 요구 문장`, axis }],
  ...덮,
});

const 목록 = [
  케이스('ZNX-FN-001', '정상'),
  케이스('ZNX-FN-002', '정상'),
  케이스('ZNX-FN-003', '경계'),
  케이스('ZNX-FN-004', '정상', { platforms: ['mobile'] }),
  케이스('ZNX-FN-005', '정상', { name: '카드 결제' }),
];

function 차리기(추천: () => Promise<{ items: { tcId: string; screen: string }[] }>) {
  vi.spyOn(api, 'cases').mockResolvedValue({ items: 목록, total: 목록.length, page: 1, pageSize: 50, hasFeatures: true });
  return vi.spyOn(scenarioApi, 'nextCases').mockImplementation(추천);
}

function 그리기(뒤: { tcId: string; 번호: number } | null) {
  const 손 = { on케이스: vi.fn(), on다른단계: vi.fn(), on바꾸기취소: vi.fn() };
  const 판 = (x: typeof 뒤) => <ScenarioPalette 서비스="ZNX" 디바이스="desktop" 바꿀번호={null} 뒤={x} {...손} />;
  const { rerender } = render(판(뒤));
  return { ...손, 뒤바꾸기: (x: typeof 뒤) => rerender(판(x)) };
}

const 넷 = async () => ({
  items: ['ZNX-FN-005', 'ZNX-FN-003', 'ZNX-FN-004', 'ZNX-FN-001'].map((tcId) => ({ tcId, screen: tcId === 'ZNX-FN-005' ? '/order' : '/cart' })),
});

describe('ScenarioPalette 다음 단계 추천', () => {
  it('맨 뒤 케이스로 부르고, 목록 차례로 정상 쪽 · 디바이스에 맞는 것만 이어지는 화면과 함께 보인다', async () => {
    const spy = 차리기(넷);
    const 손 = 그리기({ tcId: 'ZNX-FN-009', 번호: 2 });

    const 칸 = await screen.findByRole('region', { name: '다음 단계 추천' });
    expect(spy).toHaveBeenCalledWith('ZNX', 'ZNX-FN-009');
    expect(within(칸).getByText('2번 단계가 머무는 화면에서 이어지는 정상 케이스 2')).toBeTruthy();
    expect(within(칸).getAllByRole('button').map((b) => b.textContent)).toEqual(['ZNX-FN-001 더하기', 'ZNX-FN-005 더하기']);
    expect([...칸.querySelectorAll('.scn-pal-goes code')].map((c) => c.textContent)).toEqual(['/cart', '/order']);

    fireEvent.click(within(칸).getByRole('button', { name: 'ZNX-FN-005 더하기' }));
    expect(손.on케이스).toHaveBeenCalledWith('ZNX-FN-005');
  });

  it('맨 뒤 케이스가 없으면 부르지 않고, 추천이 비면 칸을 안 그린다', async () => {
    const spy = 차리기(async () => ({ items: [] }));
    const 손 = 그리기(null);
    await screen.findByText('케이스 찾기');
    expect(spy).not.toHaveBeenCalled();

    손.뒤바꾸기({ tcId: 'ZNX-FN-001', 번호: 1 });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('ZNX', 'ZNX-FN-001'));
    expect(screen.queryByRole('region', { name: '다음 단계 추천' })).toBeNull();
  });

  it('찾기 칸에 글자를 넣으면 추천도 걸린 것만 남는다', async () => {
    차리기(넷);
    그리기({ tcId: 'ZNX-FN-009', 번호: 2 });
    await screen.findByRole('region', { name: '다음 단계 추천' });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '카드' } });
    const 칸 = screen.getByRole('region', { name: '다음 단계 추천' });
    expect(within(칸).getAllByRole('button').map((b) => b.textContent)).toEqual(['ZNX-FN-005 더하기']);
  });

  it('추천을 못 불러오면 오류 글을 보이고 목록은 그대로 쓴다', async () => {
    차리기(async () => {
      throw new Error('서버가 안 받습니다');
    });
    그리기({ tcId: 'ZNX-FN-009', 번호: 2 });

    await screen.findByText(/서버가 안 받습니다/);
    expect(screen.getByText('케이스 찾기')).toBeTruthy();
  });
});
