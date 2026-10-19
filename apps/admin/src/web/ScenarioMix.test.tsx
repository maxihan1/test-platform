// @vitest-environment jsdom
// E2E 시나리오 조립 화면 — 같은 프로젝트의 애플리케이션을 섞는 화면 조각 (도메인/시나리오 §3.7 결정 13 · §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioCards } from './ScenarioCards.js';
import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';
import { ScenarioPalette } from './ScenarioPalette.js';
import { TrialControls } from './ScenarioTrial.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 앱들 = [
  { prefix: 'MKT', name: '쇼핑몰', envs: [{ env: 'stg' }] },
  { prefix: 'ADM', name: '어드민', envs: [{ env: 'stg' }] },
];
const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const 행 = (tcId: string): CaseRow => ({
  tcId,
  name: `${tcId} 이름`,
  platforms: ['desktop'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-20T00:00:00.000Z',
  techniques: [],
});

describe('단계 카드 이름표 · 구분선', () => {
  const 그리기 = (단계들: ScenarioPart[]) =>
    render(
      <ScenarioCards
        단계들={단계들}
        단계들바꾸기={() => {}}
        재료={new Map()}
        디바이스="desktop"
        시작="MKT"
        앱들={앱들}
        쓰나
        고른번호={null}
        on고르기={() => {}}
        on탭={() => {}}
      />,
    );

  it('시작 애플리케이션 밖의 단계가 있으면 이름표가 붙고 애플리케이션이 바뀌는 자리에만 구분선이 선다', () => {
    그리기([케이스('MKT-FN-001'), 케이스('MKT-FN-002'), 케이스('ADM-FN-001'), { kind: 'wait', ms: 1000 }, 케이스('ADM-FN-002')]);

    expect(screen.getAllByText('MKT 쇼핑몰')).toHaveLength(2);
    expect(screen.getAllByText('ADM 어드민')).toHaveLength(2);
    const 구분선 = screen.getAllByRole('separator');
    expect(구분선).toHaveLength(1);
    expect(구분선[0]!.textContent).toBe('여기서 애플리케이션이 바뀝니다');
    expect(구분선[0]!.nextElementSibling?.textContent).toContain('ADM-FN-001');
  });

  it('시작 애플리케이션만 쓰면 이름표도 구분선도 없다', () => {
    그리기([케이스('MKT-FN-001'), { kind: 'api', method: 'GET', path: '/x', expectStatus: 200 }]);

    expect(screen.queryByText('MKT 쇼핑몰')).toBeNull();
    expect(screen.queryByRole('separator')).toBeNull();
  });
});

describe('팔레트 애플리케이션 칩 줄', () => {
  function 그리기(앱: typeof 앱들, 뒤: { tcId: string; 번호: number } | null = null) {
    const 목록 = vi.spyOn(api, 'cases').mockImplementation(async ({ service }) => {
      const items = service === 'ADM' ? [행('ADM-FN-001')] : [행('MKT-FN-001')];
      return { items, total: items.length, page: 1, pageSize: 50, hasFeatures: false };
    });
    const 추천 = vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [{ tcId: 'MKT-FN-001', screen: '/cart' }] });
    const 손 = { on케이스: vi.fn(), on다른단계: vi.fn(), on바꾸기취소: vi.fn() };
    render(<ScenarioPalette 서비스="MKT" 앱들={앱} 디바이스="desktop" 바꿀번호={null} 뒤={뒤} {...손} />);
    return { 목록, 추천, ...손 };
  }

  it('처음에는 시작 애플리케이션 칩이 골라져 있고, 다른 칩을 누르면 그 애플리케이션의 케이스를 받아 보인다', async () => {
    const { 목록, on케이스 } = 그리기(앱들);

    await screen.findByRole('button', { name: 'MKT-FN-001 추가' });
    expect(screen.getByRole('button', { name: 'MKT 쇼핑몰' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'ADM 어드민' }));
    fireEvent.click(await screen.findByRole('button', { name: 'ADM-FN-001 추가' }));

    expect(목록.mock.calls.map(([q]) => q.service)).toEqual(['MKT', 'ADM']);
    expect(on케이스).toHaveBeenCalledWith('ADM-FN-001');
    expect(screen.queryByRole('button', { name: 'MKT-FN-001 추가' })).toBeNull();
  });

  it('애플리케이션이 하나뿐인 프로젝트에는 칩 줄이 없다', async () => {
    그리기([앱들[0]!]);

    await screen.findByRole('button', { name: 'MKT-FN-001 추가' });
    expect(screen.queryByRole('group', { name: '애플리케이션' })).toBeNull();
  });

  it('다음 단계 추천은 맨 뒤 케이스와 같은 애플리케이션 칩일 때만 부른다', async () => {
    const { 추천 } = 그리기(앱들, { tcId: 'MKT-FN-001', 번호: 1 });

    await waitFor(() => expect(추천).toHaveBeenCalledWith('MKT', 'MKT-FN-001'));
    fireEvent.click(screen.getByRole('button', { name: 'ADM 어드민' }));
    await screen.findByRole('button', { name: 'ADM-FN-001 추가' });

    expect(추천).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('다음 단계 추천')).toBeNull();
  });
});

describe('대상 서버 고르개', () => {
  it('든 애플리케이션 가운데 없는 곳이 있는 이름은 못 고르고 사유가 붙는다', () => {
    render(
      <TrialControls
        서버들={[{ env: 'stg', 없는곳: [] }, { env: 'qa', 없는곳: ['ADM'] }]}
        서버=""
        on서버={() => {}}
        도는중={false}
        on시작={() => {}}
      />,
    );

    const 옵션 = screen.getByRole('option', { name: 'qa · ADM에 없음' }) as HTMLOptionElement;
    expect(옵션.disabled).toBe(true);
    expect((screen.getByRole('option', { name: 'stg' }) as HTMLOptionElement).disabled).toBe(false);
  });
});

describe('다른 단계 설정 패널', () => {
  const API단계: ScenarioPart = { kind: 'api', method: 'GET', path: '/orders', expectStatus: 200 };

  it('API 호출에 애플리케이션 고르개가 서고, 시작 애플리케이션이 아닌 곳을 고르면 service 가 들어간다. 시작 애플리케이션으로 되돌리면 빠진다', () => {
    const on바꿈 = vi.fn();
    render(<ScenarioOtherPanel 번호={1} 단계={API단계} 단계들={[API단계]} 앱들={앱들} 시작="MKT" 쓰나 on바꿈={on바꿈} />);

    const 고르개 = screen.getByLabelText('부를 애플리케이션') as HTMLSelectElement;
    expect(고르개.value).toBe('MKT');
    fireEvent.change(고르개, { target: { value: 'ADM' } });

    expect(on바꿈).toHaveBeenLastCalledWith({ ...API단계, service: 'ADM' });
  });

  it('애플리케이션이 하나뿐이면 고르개가 없고, 본문을 고쳐도 service 는 남는다', () => {
    const on바꿈 = vi.fn();
    const 단계: ScenarioPart = { ...API단계, service: 'ADM' };
    const { unmount } = render(<ScenarioOtherPanel 번호={1} 단계={API단계} 단계들={[API단계]} 앱들={[앱들[0]!]} 시작="MKT" 쓰나 on바꿈={on바꿈} />);
    expect(screen.queryByLabelText('부를 애플리케이션')).toBeNull();
    unmount();

    render(<ScenarioOtherPanel 번호={1} 단계={단계} 단계들={[단계]} 앱들={앱들} 시작="MKT" 쓰나 on바꿈={on바꿈} />);
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '{"a":1}' } });

    expect(on바꿈).toHaveBeenLastCalledWith({ ...단계, body: { a: 1 } });
  });

  it('시작 애플리케이션 밖의 단계가 섞였을 때 / 로 시작하는 모킹 패턴에는 사유가 붙는다', () => {
    const 모킹: ScenarioPart = { kind: 'mock', urlPattern: '/api/pay', status: 200, contentType: 'application/json', body: '{}' };
    const 문장 = '시작 애플리케이션 밖의 단계가 섞인 시나리오는 / 로 시작하는 URL 패턴을 쓸 수 없습니다. **/ 로 시작하거나 주소 전체를 적습니다';

    const { unmount } = render(<ScenarioOtherPanel 번호={2} 단계={모킹} 단계들={[케이스('ADM-FN-001'), 모킹]} 앱들={앱들} 시작="MKT" 쓰나 on바꿈={() => {}} />);
    expect(screen.getByText(문장)).toBeTruthy();
    unmount();

    render(<ScenarioOtherPanel 번호={2} 단계={모킹} 단계들={[케이스('MKT-FN-001'), 모킹]} 앱들={앱들} 시작="MKT" 쓰나 on바꿈={() => {}} />);
    expect(screen.queryByText(문장)).toBeNull();
  });
});
