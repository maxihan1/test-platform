// @vitest-environment jsdom
// E2E 조립 화면 · 프로시저 단계 — 단계 카드의 프로시저 한 줄과 케이스 목록, 설정 패널의 건너뛰기 칸 (도메인/시나리오 §3.7 결정 17)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ScenarioCards } from './ScenarioCards.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import { 케이스, 재료 } from './ScenarioCards.fixture.js';
import type { 프로시저정보 } from './scenarioProc.js';

afterEach(cleanup);

const 정보: 프로시저정보 = {
  procId: 'ZSB-TP-001',
  procName: '글쓰기 흐름',
  cases: [{ tcId: 'ZSB-FN-001', name: '로그인' }, { tcId: 'ZSB-FN-002', name: '글쓰기' }, { tcId: 'ZSB-FN-003', name: '로그아웃' }],
};

function 카드판(프로시저들: ReadonlyMap<string, 프로시저정보>) {
  render(
    <ScenarioCards
      단계들={[케이스('ZSB-FN-002'), 케이스('ZSB-900')]}
      단계들바꾸기={vi.fn()}
      재료={new Map([['ZSB-FN-002', 재료('ZSB-FN-002')], ['ZSB-900', 재료('ZSB-900')]])}
      프로시저들={프로시저들}
      디바이스="android"
      쓰나
      고른번호={null}
      on고르기={vi.fn()}
      on탭={vi.fn()}
    />,
  );
}

describe('프로시저 단계 카드', () => {
  it('「프로시저 <번호> · N건 전체를 실행」 한 줄과 케이스 목록이 서고 옛 꼴 카드는 그대로다', () => {
    카드판(new Map([['ZSB-FN-002', 정보]]));
    expect(screen.getByText('프로시저 ZSB-TP-001 · 3건 전체를 실행')).toBeTruthy();
    const 목록 = document.querySelectorAll('.scn-card-cases li');
    expect([...목록].map((li) => li.textContent)).toEqual(['1ZSB-FN-001로그인', '2ZSB-FN-002글쓰기', '3ZSB-FN-003로그아웃']);
    expect(document.querySelectorAll('.scn-card-cases')).toHaveLength(1);
    expect(screen.getAllByText(/전체를 실행/)).toHaveLength(1);
  });

  it('프로시저 정보가 없으면 한 줄도 목록도 없다', () => {
    카드판(new Map());
    expect(screen.queryByText(/전체를 실행/)).toBeNull();
    expect(document.querySelector('.scn-card-cases')).toBeNull();
  });
});

describe('프로시저 단계 설정 패널', () => {
  const 그리기 = (프로시저: 프로시저정보 | null) =>
    render(
      <ScenarioPartPanel
        번호={2}
        단계={{ kind: 'case', tcId: 'ZSB-FN-002', params: {}, expected: {}, skipSteps: [] }}
        단계들={[케이스('ZSB-FN-001'), 케이스('ZSB-FN-002')]}
        재료={new Map([['ZSB-FN-002', 재료('ZSB-FN-002', { r16: true, steps: [{ title: '로그인한다', skippable: true }] })]])}
        프로시저={프로시저}
        쓰나
        on바꿈={vi.fn()}
        on케이스바꾸기={vi.fn()}
      />,
    );

  it('사전 단계 체크와 「N번에서 이미 실행」 칩 대신 건너뛸 수 없다는 안내가 선다', () => {
    그리기(정보);
    expect(screen.queryByText('사전 단계 — 체크한 것만 실행')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('프로시저는 시작 상태를 스스로 맞추므로 사전 단계를 건너뛸 수 없습니다')).toBeTruthy();
  });

  it('프로시저가 아니면 사전 단계 체크가 그대로 선다', () => {
    그리기(null);
    expect(screen.getByText('사전 단계 — 체크한 것만 실행')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: '로그인한다' })).toBeTruthy();
  });
});
