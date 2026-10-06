// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ⑥ 검사 — 단계 추가 탭의 팔레트(쪽 모으기 · 두 묶음 · 다른 단계 · 바꾸기 모드) (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type Platform } from './api.js';
import { ScenarioPalette } from './ScenarioPalette.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스 = (tcId: string, 덮: Partial<CaseRow> = {}): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop', 'mobile'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-06T00:00:00.000Z',
  techniques: [],
  ...덮,
});

function 쪽들(전체: CaseRow[], 크기 = 50) {
  return vi.spyOn(api, 'cases').mockImplementation(async (q) => {
    const 쪽 = q.page ?? 1;
    return { items: 전체.slice((쪽 - 1) * 크기, 쪽 * 크기), total: 전체.length, page: 쪽, pageSize: 크기 };
  });
}

const 꽉 = (수: number) => Array.from({ length: 수 }, (_, i) => 케이스(`ZSP-${String(i + 1).padStart(4, '0')}`));

function 그리기(옵션: { 디바이스?: Platform; 바꿀번호?: number | null } = {}) {
  const 손 = { on케이스: vi.fn(), on다른단계: vi.fn(), on바꾸기취소: vi.fn() };
  render(<ScenarioPalette 서비스="ZSP" 디바이스={옵션.디바이스 ?? 'desktop'} 바꿀번호={옵션.바꿀번호 ?? null} {...손} />);
  return 손;
}

describe('ScenarioPalette 불러오기', () => {
  it('쪽마다 부르고 꽉 차지 않은 쪽에서 멈춘다', async () => {
    const spy = 쪽들(꽉(53));
    그리기();

    await screen.findByRole('button', { name: 'ZSP-0053 더하기' });
    expect(spy.mock.calls.map(([q]) => q)).toEqual([
      { service: 'ZSP', kind: 'FN', page: 1 },
      { service: 'ZSP', kind: 'FN', page: 2 },
    ]);
  });

  it('20쪽이 다 꽉 차면 21쪽을 부르지 않고 앞 건수만 보인다는 문장을 단다', async () => {
    const spy = 쪽들(꽉(1100));
    그리기();

    await screen.findByText('케이스가 많아 앞 1000건만 보입니다. 찾기로 좁힙니다');
    expect(spy).toHaveBeenCalledTimes(20);
    expect(screen.getByRole('button', { name: 'ZSP-1000 더하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZSP-1001 더하기' })).toBeNull();
  });

  it('꽉 차지 않은 쪽에서 끝나면 상한 문장을 달지 않는다', async () => {
    쪽들(꽉(120));
    그리기();

    await screen.findByRole('button', { name: 'ZSP-0120 더하기' });
    expect(screen.queryByText(/케이스가 많아/)).toBeNull();
  });

  it('0건이면 안내 문장을 보인다', async () => {
    쪽들([]);
    그리기();

    await screen.findByText('이 서비스에는 단계로 쓸 기능 테스트 케이스가 없습니다');
  });

  it('불러오다 실패하면 오류 글을 보이고 찾기 칸은 없다', async () => {
    vi.spyOn(api, 'cases').mockRejectedValue(new Error('깨짐'));
    그리기();

    await waitFor(() => expect(document.querySelector('.empty')).not.toBeNull());
    expect(screen.queryByLabelText('케이스 찾기')).toBeNull();
  });
});

describe('ScenarioPalette 목록', () => {
  it('디바이스에서 못 도는 케이스는 빼고 그 수를 알린다', async () => {
    쪽들([케이스('ZSP-001'), 케이스('ZSP-002', { platforms: ['desktop'] }), 케이스('ZSP-003', { platforms: ['desktop'] })]);
    그리기({ 디바이스: 'mobile' });

    await screen.findByRole('button', { name: 'ZSP-001 더하기' });
    expect(screen.queryByRole('button', { name: 'ZSP-002 더하기' })).toBeNull();
    expect(screen.getByText('모바일에서 돌지 않는 케이스 2건은 뺐습니다')).toBeTruthy();
  });

  it('케이스 찾기는 tcId 와 이름에 든 글자로 거르고 대소문자를 가리지 않는다', async () => {
    쪽들([케이스('ZSP-001', { name: '로그인' }), 케이스('ZSP-002', { name: '주문 Flow' }), 케이스('ABC-003', { name: '결제' })]);
    그리기();
    await screen.findByRole('button', { name: 'ZSP-001 더하기' });
    const 칸 = screen.getByLabelText('케이스 찾기');

    fireEvent.change(칸, { target: { value: 'flow' } });
    expect(screen.queryByRole('button', { name: 'ZSP-001 더하기' })).toBeNull();
    expect(screen.getByRole('button', { name: 'ZSP-002 더하기' })).toBeTruthy();

    fireEvent.change(칸, { target: { value: 'abc' } });
    expect(screen.getByRole('button', { name: 'ABC-003 더하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZSP-002 더하기' })).toBeNull();
  });

  it('업무 흐름 묶음은 펼쳐 있고 입력값 검증 묶음은 접혀 있다가 눌러야 펼친다', async () => {
    쪽들([케이스('ZSP-001'), 케이스('ZSP-002', { techniques: ['경계값 분석'] }), 케이스('ZSP-003', { techniques: ['상태 전이'] })]);
    그리기();
    await screen.findByRole('button', { name: 'ZSP-001 더하기' });

    expect(screen.getByText('업무 흐름 케이스')).toBeTruthy();
    expect(screen.getByText('상태 전이 사용 또는 기법 표시 없음')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ZSP-003 더하기' })).toBeTruthy();

    const 머리 = screen.getByRole('button', { name: /입력값 검증 케이스 1/ });
    expect(머리.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('경계값 · 동등 분할 · 결정 테이블만 사용')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZSP-002 더하기' })).toBeNull();

    fireEvent.click(머리);
    expect(머리.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'ZSP-002 더하기' })).toBeTruthy();
  });

  it('미확정 케이스에는 미확정 칩이 붙는다', async () => {
    쪽들([케이스('ZSP-001', { unconfirmed: '화면에서 본 값' }), 케이스('ZSP-002')]);
    그리기();
    await screen.findByRole('button', { name: 'ZSP-001 더하기' });

    const 칩 = document.querySelectorAll('.case-tag');
    expect(칩).toHaveLength(1);
    expect(칩[0]?.textContent).toBe('미확정');
  });
});

describe('ScenarioPalette 더하기', () => {
  it('번호 더하기 버튼은 그 tcId 로 on케이스를 부른다', async () => {
    쪽들([케이스('ZSP-001'), 케이스('ZSP-002')]);
    const 손 = 그리기();

    fireEvent.click(await screen.findByRole('button', { name: 'ZSP-002 더하기' }));
    expect(손.on케이스).toHaveBeenCalledWith('ZSP-002');
  });

  it('다른 단계 넷은 정해 둔 기본값으로 on다른단계를 부른다', async () => {
    쪽들([]);
    const 손 = 그리기();
    await screen.findByText('이 서비스에는 단계로 쓸 기능 테스트 케이스가 없습니다');

    fireEvent.click(screen.getByRole('button', { name: 'API 호출' }));
    fireEvent.click(screen.getByRole('button', { name: '모킹 켜기' }));
    fireEvent.click(screen.getByRole('button', { name: '모킹 끄기' }));
    fireEvent.click(screen.getByRole('button', { name: '대기' }));

    expect(손.on다른단계.mock.calls.map(([p]) => p)).toEqual([
      { kind: 'api', method: 'GET', path: '/', expectStatus: 200 },
      { kind: 'mock', urlPattern: '**/api/**', status: 200, contentType: 'application/json', body: '{}' },
      { kind: 'unmock', urlPattern: '' },
      { kind: 'wait', ms: 1000 },
    ]);
  });
});

describe('ScenarioPalette 바꾸기 모드', () => {
  it('머리 문장과 취소가 보이고 다른 단계 버튼은 없다', async () => {
    쪽들([케이스('ZSP-001')]);
    const 손 = 그리기({ 바꿀번호: 2 });

    await screen.findByRole('button', { name: 'ZSP-001 더하기' });
    expect(screen.getByText('2번 단계를 바꿀 케이스를 고릅니다')).toBeTruthy();
    for (const 이름 of ['API 호출', '모킹 켜기', '모킹 끄기', '대기']) {
      expect(screen.queryByRole('button', { name: 이름 })).toBeNull();
    }

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(손.on바꾸기취소).toHaveBeenCalledTimes(1);
  });

  it('줄 버튼은 바꾸기 모드에서도 on케이스를 부른다', async () => {
    쪽들([케이스('ZSP-001')]);
    const 손 = 그리기({ 바꿀번호: 1 });

    fireEvent.click(await screen.findByRole('button', { name: 'ZSP-001 더하기' }));
    expect(손.on케이스).toHaveBeenCalledWith('ZSP-001');
  });
});
