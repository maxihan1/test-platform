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
    return {
      items: 전체.slice((쪽 - 1) * 크기, 쪽 * 크기),
      total: 전체.length,
      page: 쪽,
      pageSize: 크기,
      hasFeatures: 전체.some((c) => (c.feature ?? null) !== null),
    };
  });
}

const 꽉 = (수: number) => Array.from({ length: 수 }, (_, i) => 케이스(`ZSP-${String(i + 1).padStart(4, '0')}`));

function 그리기(옵션: { 디바이스?: Platform; 바꿀번호?: number | null; 서비스?: string } = {}) {
  const 손 = { on케이스: vi.fn(), on다른단계: vi.fn(), on바꾸기취소: vi.fn() };
  const 판 = (서비스: string) => (
    <ScenarioPalette 서비스={서비스} 디바이스={옵션.디바이스 ?? 'desktop'} 바꿀번호={옵션.바꿀번호 ?? null} {...손} />
  );
  const { rerender } = render(판(옵션.서비스 ?? 'ZSP'));
  return { ...손, 서비스바꾸기: (서비스: string) => rerender(판(서비스)) };
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

    await screen.findByText('이 서비스에는 단계로 쓸 기능 테스트 스크립트가 없습니다');
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

describe('ScenarioPalette 맥락', () => {
  type 축 = '정상' | '경계' | '예외';
  const 요구 = (feature: string | null, ...목록: [string, string | null, 축][]): Partial<CaseRow> => ({
    feature,
    reqs: 목록.map(([reqId, text, axis]) => ({ reqId, text, axis })),
  });
  const PRD케이스들 = () => [
    케이스('ZSP-001', { name: '가입 성공', ...요구('회원가입', ['ZSP-REQ-001', '이메일로 가입한다', '정상'], ['ZSP-REQ-002', '닉네임을 받는다', '정상']) }),
    케이스('ZSP-002', { name: '비밀번호 길이', ...요구('회원가입', ['ZSP-REQ-003', '비밀번호는 8자 이상이다', '경계']) }),
    케이스('ZSP-003', { name: '담기', ...요구('장바구니', ['ZSP-REQ-010', '수량을 골라 담는다', '정상']) }),
    케이스('ZSP-004', { name: '배너 닫기' }),
  ];
  const 묶음단추 = (이름: RegExp) => screen.getByRole('button', { name: 이름 });

  it('기능 묶음은 받은 차례대로 접힌 채 이름과 정상 · 경계 · 예외 건수만 보이고, 묶음 없음은 맨 뒤다', async () => {
    쪽들(PRD케이스들());
    그리기();
    await screen.findByRole('button', { name: /회원가입/ });

    const 머리들 = [...document.querySelectorAll('.scn-pal-feature > h3 .scn-pal-fold')].map((b) => b.textContent);
    expect(머리들).toEqual(['회원가입정상 1 · 경계 · 예외 1', '장바구니정상 1 · 경계 · 예외 0', '기능 묶음 없음정상 1 · 경계 · 예외 0']);
    expect(묶음단추(/회원가입/).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'ZSP-001 더하기' })).toBeNull();
    expect(screen.queryByText('업무 흐름 케이스')).toBeNull();
  });

  it('묶음을 펴면 정상 케이스가 보이고 경계 · 예외는 한 번 더 눌러야 보인다', async () => {
    쪽들(PRD케이스들());
    그리기();
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));

    expect(screen.getByRole('button', { name: 'ZSP-001 더하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZSP-002 더하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ZSP-003 더하기' })).toBeNull();

    const 경계 = screen.getByRole('button', { name: '경계 · 예외 케이스 1' });
    expect(경계.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(경계);
    expect(screen.getByRole('button', { name: 'ZSP-002 더하기' })).toBeTruthy();
  });

  it('줄 아래 요구 줄 — 첫 요구 번호 · 문장 · 외 N건이고 번호에 고리가 없다. 요구가 없으면 없다고 적는다', async () => {
    쪽들(PRD케이스들());
    그리기();
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(묶음단추(/기능 묶음 없음/));

    const 가입 = screen.getByRole('button', { name: 'ZSP-001 더하기' }).closest('li')!;
    expect(가입.querySelector('.case-req-id')?.textContent).toBe('ZSP-REQ-001');
    expect(가입.querySelector('.case-req-text')?.textContent).toBe('이메일로 가입한다');
    expect(가입.querySelector('.case-req-more')?.textContent).toBe('외 1건');
    expect(가입.querySelector('a')).toBeNull();

    const 배너 = screen.getByRole('button', { name: 'ZSP-004 더하기' }).closest('li')!;
    expect(배너.querySelector('.case-req')?.textContent).toBe('연결된 요구 없음');
  });

  it('찾기는 요구 번호 · 요구 문장에도 맞고, 찾는 동안은 걸린 묶음과 경계 · 예외를 펴 둔 채 못 접는다', async () => {
    쪽들(PRD케이스들());
    그리기();
    await screen.findByRole('button', { name: /회원가입/ });
    const 칸 = screen.getByLabelText('케이스 찾기');

    fireEvent.change(칸, { target: { value: '8자' } });
    expect(screen.getByRole('button', { name: 'ZSP-002 더하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZSP-001 더하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /장바구니/ })).toBeNull();
    const 머리 = 묶음단추(/회원가입/);
    expect(머리.getAttribute('aria-expanded')).toBe('true');
    expect(머리.getAttribute('aria-disabled')).toBe('true');
    expect((머리 as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(머리);
    expect(머리.getAttribute('aria-expanded')).toBe('true');
    expect(머리.textContent).toContain('정상 0 · 경계 · 예외 1');

    fireEvent.change(칸, { target: { value: 'zsp-req-010' } });
    expect(screen.getByRole('button', { name: 'ZSP-003 더하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /회원가입/ })).toBeNull();

    fireEvent.change(칸, { target: { value: '없는말' } });
    expect(screen.getByText('「없는말」에 맞는 케이스가 없습니다')).toBeTruthy();

    fireEvent.change(칸, { target: { value: '' } });
    expect(묶음단추(/회원가입/).getAttribute('aria-expanded')).toBe('false');
  });

  it('서비스를 바꾸면 같은 이름 묶음도 접힌 채 연다', async () => {
    쪽들(PRD케이스들());
    const 손 = 그리기();
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    expect(묶음단추(/회원가입/).getAttribute('aria-expanded')).toBe('true');

    손.서비스바꾸기('ZSQ');
    await waitFor(() => expect(묶음단추(/회원가입/).getAttribute('aria-expanded')).toBe('false'));
  });

  it('요구가 붙은 케이스가 없는 서비스는 묶음 머리와 요구 줄 없이 두 덩어리 그대로다', async () => {
    쪽들([케이스('ZSP-001'), 케이스('ZSP-002', { techniques: ['경계값 분석'] })]);
    그리기();
    await screen.findByRole('button', { name: 'ZSP-001 더하기' });

    expect(screen.queryByText('기능 묶음 없음')).toBeNull();
    expect(document.querySelector('.case-req')).toBeNull();
    fireEvent.change(screen.getByLabelText('케이스 찾기'), { target: { value: 'ZSP-002' } });
    expect(screen.getByRole('button', { name: /입력값 검증 케이스 1/ }).getAttribute('aria-expanded')).toBe('false');
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
    await screen.findByText('이 서비스에는 단계로 쓸 기능 테스트 스크립트가 없습니다');

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
