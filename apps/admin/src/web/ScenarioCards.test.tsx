// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ② 검사 — 왼쪽 단계 카드와 칩 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { 케이스, 재료, 판, 고르기버튼 } from './ScenarioCards.fixture.js';

afterEach(cleanup);

describe('ScenarioCards 카드', () => {
  it('머리 · 안내 · 번호 · 종류 칩 · 이름 · 한 줄 요약이 뜬다', () => {
    const 단계들: ScenarioPart[] = [
      케이스('ZSB-001', { skipSteps: ['가입'], params: { a: 1 } }),
      { kind: 'api', method: 'GET', path: '/api/x', expectStatus: 200 },
      { kind: 'mock', urlPattern: '**/api/y', status: 500, contentType: 'application/json', body: '{}' },
      { kind: 'unmock', urlPattern: '**/api/y' },
      { kind: 'wait', ms: 2000 },
    ];
    render(<판 단계들={단계들} 재료={new Map([['ZSB-001', 재료('ZSB-001', { steps: [{ title: '가입', skippable: true }] })]])} />);

    expect(screen.getByText('단계 순서')).toBeTruthy();
    expect(screen.getByText('단계를 누르면 설정이 열립니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ 단계 추가' })).toBeTruthy();
    expect(고르기버튼(1).textContent).toContain('ZSB-001 ZSB-001 케이스');
    expect(고르기버튼(1).textContent).toContain('준비 1개 건너뜀 · 입력값 1칸 직접 입력');
    expect(고르기버튼(2).textContent).toContain('GET /api/x → 200');
    expect(고르기버튼(3).textContent).toContain('**/api/y → 500');
    expect(고르기버튼(4).textContent).toContain('**/api/y');
    expect(고르기버튼(5).textContent).toContain('2초 기다림');
    for (const 글 of ['케이스', 'API 호출', '모킹 켜기', '모킹 끄기', '대기']) {
      expect(screen.getAllByText(글).some((e) => e.className.includes('tech-tag'))).toBe(true);
    }
    expect(고르기버튼(1).textContent).toContain('1');
    expect(screen.getByText('시험 요약 자리')).toBeTruthy();
  });

  it('단계가 0개면 안내 문장이 뜬다', () => {
    render(<판 단계들={[]} />);
    expect(screen.getByText('아직 단계가 없습니다. 「단계 추가」 탭에서 케이스를 고릅니다')).toBeTruthy();
  });

  it('+ 단계 추가를 누르면 탭이 단계 추가로 간다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" />);
    fireEvent.click(screen.getByRole('button', { name: '+ 단계 추가' }));
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('aria-selected')).toBe('true');
  });

  it('이름 쪽 버튼을 누르면 그 카드가 골라지고 탭이 설정으로 간다', () => {
    render(<판 단계들={[케이스('ZSB-001'), 케이스('ZSB-002')]} />);
    expect(screen.queryByRole('tab', { name: '2번 설정' })).toBeNull();
    fireEvent.click(고르기버튼(2));

    expect(screen.getByRole('tab', { name: '2번 설정' }).getAttribute('aria-selected')).toBe('true');
    expect(고르기버튼(2).closest('li')?.className).toContain('selected');
    expect(고르기버튼(1).closest('li')?.className).not.toContain('selected');
  });
});

describe('ScenarioCards 칩', () => {
  const 칩찾기 = (글: string) => screen.queryByText(글);

  it('조건이 없으면 칩이 하나도 안 뜬다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 재료={new Map([['ZSB-001', 재료('ZSB-001')]])} />);
    for (const 글 of ['미확정', '단독 실행', '확인 필요', '실행 불가', '모킹되지 않음']) expect(칩찾기(글)).toBeNull();
    expect(screen.queryByText(/돌지 않는 케이스/)).toBeNull();
  });

  it('재료가 아직 안 온 case 는 칩 없이 그린다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} />);
    expect(칩찾기('실행 불가')).toBeNull();
    expect(칩찾기('확인 필요')).toBeNull();
  });

  it('미확정 · 단독 실행은 재료와 carryOver 로 뜨고 클래스가 색 표대로다', () => {
    render(
      <판
        단계들={[케이스('ZSB-001', { carryOver: false })]}
        재료={new Map([['ZSB-001', 재료('ZSB-001', { unconfirmed: '화면에서 읽음' })]])}
      />,
    );
    expect(칩찾기('미확정')?.className).toContain('case-tag');
    expect(칩찾기('단독 실행')?.className).toContain('tech-tag');
  });

  it('건너뛸 수 없는 제목을 건너뛰면 확인 필요, 건너뛸 수 있으면 안 뜬다', () => {
    const 표 = new Map([['ZSB-001', 재료('ZSB-001', { steps: [{ title: '가입', skippable: true }, { title: '결제', skippable: false }] })]]);
    const { unmount } = render(<판 단계들={[케이스('ZSB-001', { skipSteps: ['가입'] })]} 재료={표} />);
    expect(칩찾기('확인 필요')).toBeNull();
    unmount();
    render(<판 단계들={[케이스('ZSB-001', { skipSteps: ['결제'] })]} 재료={표} />);
    expect(칩찾기('확인 필요')?.className).toContain('case-tag');
  });

  it('재료가 404(null)면 실행 불가 칩과 찾지 못했다는 요약이 뜬다', () => {
    render(<판 단계들={[케이스('ZSB-404')]} 재료={new Map([['ZSB-404', null]])} />);
    expect(칩찾기('실행 불가')?.className).toContain('case-tag');
    expect(고르기버튼(1).textContent).toContain('케이스를 찾지 못했습니다');
  });

  it('조립 디바이스를 안 지원하는 케이스에 디바이스 칩이 뜬다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 재료={new Map([['ZSB-001', 재료('ZSB-001', { platforms: ['mobile'] })]])} 디바이스="desktop" />);
    expect(칩찾기('PC에서 돌지 않는 케이스')?.className).toContain('case-tag');
  });

  it('모킹 구간 안의 api 단계는 모킹되지 않음 칩과 구간 표시가 붙는다', () => {
    const 단계들: ScenarioPart[] = [
      { kind: 'mock', urlPattern: '**/api/y', status: 500, contentType: 'application/json', body: '{}' },
      { kind: 'api', method: 'GET', path: '/api/y', expectStatus: 500 },
      { kind: 'unmock', urlPattern: '**/api/y' },
      { kind: 'api', method: 'GET', path: '/api/y', expectStatus: 200 },
    ];
    render(<판 단계들={단계들} />);

    expect(screen.getAllByText('모킹되지 않음')).toHaveLength(1);
    expect(screen.getByText('모킹되지 않음').className).toContain('tech-tag');
    expect(고르기버튼(1).closest('li')?.className).not.toContain('mocked');
    expect(고르기버튼(2).closest('li')?.className).toContain('mocked');
    expect(고르기버튼(3).closest('li')?.className).toContain('mocked');
    expect(고르기버튼(4).closest('li')?.className).not.toContain('mocked');
  });
});
