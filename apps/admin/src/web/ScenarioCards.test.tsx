// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ② 검사 — 왼쪽 단계 카드(요약 · 칩 · 모킹 구간 · 순서 · 빼기)와 오른쪽 탭 틀 (도메인/시나리오 §8.11)

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { Platform } from './api.js';
import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioCards } from './ScenarioCards.js';
import { ScenarioTabs, type 조립탭 } from './ScenarioTabs.js';
import type { 재료들 } from './scenarioView.js';

afterEach(cleanup);

const 케이스 = (tcId: string, 덮: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...덮,
});

const 재료 = (tcId: string, 덮: Partial<CasePartMaterial> = {}): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
  ...덮,
});

interface 판옵션 {
  단계들: ScenarioPart[];
  재료?: 재료들;
  쓰나?: boolean;
  이력있나?: boolean;
  디바이스?: Platform;
  고른번호?: number | null;
  탭?: 조립탭;
}

const 기록 = { 단계들: [] as ScenarioPart[] };

function 판({ 단계들: 처음, 재료: 재료표 = new Map(), 쓰나 = true, 이력있나 = true, 디바이스 = 'desktop', 고른번호: 처음고름 = null, 탭: 처음탭 = 'add' }: 판옵션) {
  const [단계들, set단계들] = useState(처음);
  const [고른, set고른] = useState<number | null>(처음고름);
  const [탭, set탭] = useState<조립탭>(처음탭);
  기록.단계들 = 단계들;
  return (
    <>
      <ScenarioCards
        단계들={단계들}
        단계들바꾸기={set단계들}
        재료={재료표}
        디바이스={디바이스}
        쓰나={쓰나}
        고른번호={고른}
        on고르기={set고른}
        on탭={set탭}
        시험요약={<p>시험 요약 자리</p>}
      />
      <ScenarioTabs 탭={탭} on탭={set탭} 고른번호={고른} 쓰나={쓰나} 이력있나={이력있나}>
        <p>탭 속</p>
      </ScenarioTabs>
    </>
  );
}

const 고르기버튼 = (n: number) => document.querySelector(`[data-card="${n}"][data-act="pick"]`) as HTMLButtonElement;

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
