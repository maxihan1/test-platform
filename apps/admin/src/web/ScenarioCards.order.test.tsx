// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ② 검사 — 순서 · 빼기와 오른쪽 탭 틀 (도메인/시나리오 §8.11)

import type { ScenarioLink } from '@platform/kit';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { 케이스, 기록, 판, 고르기버튼 } from './ScenarioCards.fixture.js';

afterEach(cleanup);

describe('ScenarioCards 순서 · 빼기', () => {
  const 셋 = () => [케이스('ZSB-001'), 케이스('ZSB-002'), 케이스('ZSB-003')];

  it('맨 위에는 위로가, 맨 아래에는 아래로가 없다', () => {
    render(<판 단계들={셋()} />);
    expect(screen.queryByRole('button', { name: '1번 위로' })).toBeNull();
    expect(screen.getByRole('button', { name: '2번 위로' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1번 아래로' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '3번 아래로' })).toBeNull();
    expect(screen.getByRole('button', { name: '3번 빼기' })).toBeTruthy();
  });

  it('쓰기가 아니면 위로 · 아래로 · 빼기 · + 단계 추가가 다 없다', () => {
    render(<판 단계들={셋()} 쓰나={false} />);
    expect(screen.queryByRole('button', { name: /번 (위로|아래로|빼기)/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ 단계 추가' })).toBeNull();
    expect(고르기버튼(1)).toBeTruthy();
  });

  it('2번 위로를 누르면 순서가 바뀌고 포커스는 맨 위에 닿은 그 카드의 고르는 버튼으로 간다', () => {
    render(<판 단계들={셋()} />);
    fireEvent.click(screen.getByRole('button', { name: '2번 위로' }));

    expect(기록.단계들.map((p) => (p.kind === 'case' ? p.tcId : ''))).toEqual(['ZSB-002', 'ZSB-001', 'ZSB-003']);
    expect(document.activeElement).toBe(고르기버튼(1));
    expect(고르기버튼(1).textContent).toContain('ZSB-002');
  });

  it('1번 아래로를 누르면 포커스가 같은 방향 버튼(2번 아래로)으로 따라간다', () => {
    render(<판 단계들={셋()} />);
    fireEvent.click(screen.getByRole('button', { name: '1번 아래로' }));

    expect(기록.단계들.map((p) => (p.kind === 'case' ? p.tcId : ''))).toEqual(['ZSB-002', 'ZSB-001', 'ZSB-003']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2번 아래로' }));
  });

  it('옮기면 값 연결이 가리키는 번호가 따라간다', () => {
    const 연결: ScenarioLink = { kind: 'reuse', method: 'GET', urlPattern: '**/api/x', fromSeq: 1 };
    render(<판 단계들={[케이스('ZSB-001'), 케이스('ZSB-002'), 케이스('ZSB-003', { links: [연결] })]} />);
    fireEvent.click(screen.getByRole('button', { name: '1번 아래로' }));

    const 셋째 = 기록.단계들[2];
    expect(셋째?.kind === 'case' ? 셋째.links : null).toEqual([{ ...연결, fromSeq: 2 }]);
  });

  it('고른 카드를 옮기면 탭 이름이 새 번호가 되고 다른 카드가 지나가면 밀린 번호가 된다', () => {
    render(<판 단계들={셋()} 고른번호={2} 탭="settings" />);
    fireEvent.click(screen.getByRole('button', { name: '2번 위로' }));
    expect(screen.getByRole('tab', { name: '1번 설정' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2번 위로' }));
    expect(screen.getByRole('tab', { name: '2번 설정' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1번 아래로' }));
    expect(screen.getByRole('tab', { name: '1번 설정' })).toBeTruthy();
  });

  it('다른 카드를 앞에서 빼면 고른 번호가 하나 줄고, 고른 카드를 빼면 탭이 단계 추가로 간다', () => {
    render(<판 단계들={셋()} 고른번호={3} 탭="settings" />);
    fireEvent.click(screen.getByRole('button', { name: '1번 빼기' }));
    expect(screen.getByRole('tab', { name: '2번 설정' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2번 빼기' }));
    expect(screen.queryByRole('tab', { name: /번 설정/ })).toBeNull();
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('aria-selected')).toBe('true');
  });

  it('빼면 값 연결은 0 이 되고 포커스는 다음 카드로 가며 마지막을 빼면 앞 카드로, 다 빼면 단계 추가 버튼으로 간다', () => {
    const 연결: ScenarioLink = { kind: 'reuse', method: 'GET', urlPattern: '**/api/x', fromSeq: 2 };
    render(<판 단계들={[케이스('ZSB-001'), 케이스('ZSB-002'), 케이스('ZSB-003', { links: [연결] })]} />);
    fireEvent.click(screen.getByRole('button', { name: '2번 빼기' }));

    const 둘째 = 기록.단계들[1];
    expect(둘째?.kind === 'case' ? 둘째.links : null).toEqual([{ ...연결, fromSeq: 0 }]);
    expect(document.activeElement).toBe(고르기버튼(2));
    expect(고르기버튼(2).textContent).toContain('ZSB-003');

    fireEvent.click(screen.getByRole('button', { name: '2번 빼기' }));
    expect(document.activeElement).toBe(고르기버튼(1));

    fireEvent.click(screen.getByRole('button', { name: '1번 빼기' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ 단계 추가' }));
  });
});

describe('ScenarioTabs 탭 틀', () => {
  it('tablist · tab · aria-selected · tabpanel 이 이어진다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" />);

    expect(screen.getByRole('tablist')).toBeTruthy();
    const 설정 = screen.getByRole('tab', { name: '1번 설정' });
    expect(설정.getAttribute('aria-selected')).toBe('true');
    expect(설정.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('tabindex')).toBe('-1');
    const 칸 = screen.getByRole('tabpanel');
    expect(설정.getAttribute('aria-controls')).toBe(칸.id);
    expect(칸.getAttribute('aria-labelledby')).toBe(설정.id);
    expect(칸.textContent).toBe('탭 속');
  });

  it('쓰기 · 이력에 따라 보이는 탭이 다르다', () => {
    const { unmount } = render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" />);
    expect(screen.getAllByRole('tab').map((e) => e.textContent)).toEqual(['1번 설정', '단계 추가', '시험 결과', '변경 이력']);
    unmount();

    render(<판 단계들={[]} 쓰나={false} 이력있나={false} />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('쓰기가 아니면 단계 추가 · 시험 결과 탭이 없고 새 시나리오면 변경 이력 탭이 없다', () => {
    const { unmount } = render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" 쓰나={false} />);
    expect(screen.getAllByRole('tab').map((e) => e.textContent)).toEqual(['1번 설정', '변경 이력']);
    unmount();

    render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" 이력있나={false} />);
    expect(screen.queryByRole('tab', { name: '변경 이력' })).toBeNull();
  });

  it('지금 탭이 보이는 탭에 없으면 첫 보이는 탭을 그린다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 탭="settings" />);
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('aria-selected')).toBe('true');
  });

  it('오른쪽 화살표는 다음 탭으로, 왼쪽 끝에서 왼쪽 화살표는 마지막 탭으로 옮기고 포커스도 따라간다', () => {
    render(<판 단계들={[케이스('ZSB-001')]} 고른번호={1} 탭="settings" />);
    const 설정 = screen.getByRole('tab', { name: '1번 설정' });
    fireEvent.keyDown(설정, { key: 'ArrowRight' });

    const 추가 = screen.getByRole('tab', { name: '단계 추가' });
    expect(추가.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(추가);

    fireEvent.keyDown(추가, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: '1번 설정' }), { key: 'ArrowLeft' });
    const 이력 = screen.getByRole('tab', { name: '변경 이력' });
    expect(이력.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(이력);
  });
});
