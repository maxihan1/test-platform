// @vitest-environment jsdom
// E2E 마법사 ② — 값 연결(제안 · 빈 칸 막기 · 확인 · 지운 제안) · 로그인 이어받기 · 시험 실행(쓰였는지) · 저장 · 저장하고 실행 (도메인/시나리오 §8.11 「마법사」)

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { prdApi } from './prdApi.js';
import { scenarioApi, type CasePartMaterial, type LinkSuggestion } from './scenarioApi.js';
import { 결과주소 } from './ScenarioResultNext.js';
import { 사람, 서비스, 흘리기 } from './ScenarioTrial.fixture.js';
import { ScenarioWizard } from './ScenarioWizard.js';

const 줄 = (tcId: string): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-23T00:00:00.000Z',
  techniques: [],
  feature: '주문',
  reqs: [{ reqId: `REQ-${tcId}`, text: `${tcId} 요구`, axis: '정상' }],
  screens: [],
});

const 재료 = (tcId: string): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: tcId === 'ZSB-002' ? { type: 'object', properties: { orderId: { type: 'string' } } } : { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [{ title: '로그인한다', skippable: true }],
  r16: true,
  unconfirmed: null,
});

const 제안: LinkSuggestion = {
  toSeq: 2,
  link: { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: '' } },
  needs: ['jsonPath'],
  why: '1번이 부른 POST /api/orders 응답의 값을 2번의 orderId 칸에 넣습니다',
};

let 제안받기: MockInstance<typeof scenarioApi.linkSuggestions>;

beforeEach(() => {
  window.location.hash = '#/scenarios/new';
  localStorage.clear();
  vi.spyOn(api, 'cases').mockResolvedValue({ items: [줄('ZSB-001'), 줄('ZSB-002')], total: 2, page: 1, pageSize: 50, hasFeatures: true });
  vi.spyOn(scenarioApi, 'nextCases').mockImplementation(async (_s, after) => ({
    items: after === undefined ? [{ tcId: 'ZSB-001', screen: '/' }] : [{ tcId: 'ZSB-002', screen: '/orders' }],
  }));
  vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
  vi.spyOn(prdApi, 'apis').mockResolvedValue({ apis: [] });
  제안받기 = vi.spyOn(scenarioApi, 'linkSuggestions').mockResolvedValue({ items: [제안] });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
});

const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));
const 바닥 = () => document.querySelector('.wz-why')?.textContent;

async function 값연결로() {
  render(<ScenarioWizard 띠서비스={서비스('ZSB')} user={사람()} />);
  fireEvent.click(screen.getByRole('button', { name: /직접 고르기/ }));
  다음();
  fireEvent.click(within(await screen.findByRole('region', { name: '첫 단계 추천' })).getByRole('button', { name: 'ZSB-001 넣기' }));
  fireEvent.click(within(await screen.findByRole('region', { name: '다음 단계 추천' })).getByRole('button', { name: 'ZSB-002 넣기' }));
  다음();
  await screen.findByText('값 연결 1곳 찾음');
}

async function 경로채우고시험으로() {
  await 값연결로();
  fireEvent.change(screen.getByLabelText('JSON 경로'), { target: { value: 'id' } });
  다음();
  await screen.findByRole('heading', { name: '끝까지 이어지는지 돌려 봅니다' });
}

describe('ScenarioWizard 값 연결', () => {
  it('서비스 지도 제안을 받는 단계에 달고, 빈 JSON 경로가 남으면 다음으로 못 간다. 맞아요로 확인한다', async () => {
    await 값연결로();
    expect(제안받기).toHaveBeenCalledWith({
      service: 'ZSB',
      parts: [
        { kind: 'case', tcId: 'ZSB-001', params: {}, expected: {}, skipSteps: [] },
        { kind: 'case', tcId: 'ZSB-002', params: {}, expected: {}, skipSteps: [] },
      ],
    });
    const 연결 = screen.getByText(제안.why).closest('li')!;
    expect(연결.textContent).toContain('2번 ZSB-002 케이스');
    expect(연결.textContent).toContain('1번 ZSB-001 케이스');
    expect(연결.textContent).toContain('확인 필요');
    expect(연결.textContent).toContain('서비스 지도에서 찾았습니다 · 종류 「값 주입」');
    expect(screen.getByText('앞 단계 응답에서 꺼낼 값의 경로를 적습니다 · 예: id, data.id')).toBeTruthy();
    expect(screen.getByText('1번 「ZSB-001 케이스」부터 끝까지 같은 계정으로 이어 갑니다. 뒤 단계의 로그인 사전 단계는 건너뜁니다')).toBeTruthy();

    다음();
    expect(screen.getByRole('alert').textContent).toBe('빈 칸이 남은 값 연결이 있습니다. 적거나 삭제합니다');

    fireEvent.change(screen.getByLabelText('JSON 경로'), { target: { value: 'id' } });
    fireEvent.click(within(연결).getByRole('button', { name: '맞아요' }));
    expect(연결.textContent).toContain('확인함');

    다음();
    expect(screen.getByRole('heading', { name: '끝까지 이어지는지 돌려 봅니다' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await waitFor(() => expect(제안받기).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('값 연결 1곳 찾음')).toBeTruthy();
    expect(screen.getByText(제안.why).closest('li')!.textContent).toContain('확인함');
  });

  it('지운 제안은 다시 들어와도 달지 않는다', async () => {
    await 값연결로();
    expect(바닥()).toBe('확인하지 않은 값 연결이 1곳 있습니다');
    fireEvent.click(within(screen.getByText(제안.why).closest('li')!).getByRole('button', { name: '삭제' }));
    expect(바닥()).toBe('');
    expect(screen.getByText('넘길 값이 없습니다. 단계끼리 값을 주고받지 않는 흐름입니다')).toBeTruthy();
    다음();
    fireEvent.click(await screen.findByRole('button', { name: '이전' }));
    await waitFor(() => expect(제안받기).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('넘길 값이 없습니다. 단계끼리 값을 주고받지 않는 흐름입니다')).toBeTruthy();
  });
});

describe('ScenarioWizard 시험 실행 · 저장', () => {
  it('지난번 서버로 돌려 값 연결이 쓰였는지 알리고, 같은 단계로 저장한다', async () => {
    localStorage.setItem('대상서버:ZSB', 'stg');
    await 경로채우고시험으로();
    expect(screen.getByText('지난번에 고른 서버를 미리 골라 두었습니다')).toBeTruthy();
    expect(바닥()).toBe('시험 없이 넘어가도 저장할 수 있습니다');

    const 시작 = vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({
      status: 'FINISHED',
      result: {
        status: 'PASS',
        durationMs: 3000,
        parts: [
          { seq: 1, status: 'PASS', durationMs: 1000, steps: [], mocks: [] },
          { seq: 2, status: 'PASS', durationMs: 2000, steps: [], mocks: [], bound: { orderId: 5 } },
        ],
      },
    });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    });
    await 흘리기(2000);
    vi.useRealTimers();

    const 보낸 = [
      { kind: 'case', tcId: 'ZSB-001', params: {}, expected: {}, skipSteps: [] },
      {
        kind: 'case',
        tcId: 'ZSB-002',
        params: {},
        expected: {},
        skipSteps: ['로그인한다'],
        links: [{ kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'id' } }],
      },
    ];
    expect(시작).toHaveBeenCalledWith({ service: 'ZSB', env: 'stg', platform: 'desktop', parts: 보낸 });
    expect(screen.getByText(/^끝까지 이어졌습니다 · 2단계/)).toBeTruthy();
    expect(screen.getByText('2번 ← 1번 · 값 주입 · 쓰임')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 돌리기' })).toBeTruthy();

    다음();
    const 요약 = screen.getByRole('heading', { name: '이름을 정하고 저장합니다' }).parentElement!;
    expect(요약.textContent).toContain('직접 고름');
    expect(요약.textContent).toContain('단계 2개');
    expect(요약.textContent).toContain('값 연결 1곳 · 로그인 이어받기');
    expect(요약.textContent).toContain('통과 · stg');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('시나리오 이름을 적어야 저장할 수 있습니다');

    const 만들기 = vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 31, version: 1 });
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '신규 회원 첫 주문' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('「신규 회원 첫 주문」 시나리오를 저장했습니다 · v1')).toBeTruthy();
    expect(만들기).toHaveBeenCalledWith({ service: 'ZSB', name: '신규 회원 첫 주문', platform: 'desktop', parts: 보낸 });
    expect(screen.getByRole('link', { name: '조립 화면에서 열기' }).getAttribute('href')).toBe('#/scenarios/31');
    expect(screen.queryByRole('button', { name: '이전' })).toBeNull();
  });

  it('앞 단계로 돌아가 단계를 바꾸면 시험 결과를 버린다', async () => {
    localStorage.setItem('대상서버:ZSB', 'stg');
    await 경로채우고시험으로();
    vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-2' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({
      status: 'FINISHED',
      result: { status: 'PASS', durationMs: 10, parts: [{ seq: 1, status: 'PASS', durationMs: 5, steps: [], mocks: [] }] },
    });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    });
    await 흘리기(2000);
    vi.useRealTimers();
    expect(screen.getByText(/^끝까지 이어졌습니다/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await screen.findByText('값 연결 1곳 찾음');
    fireEvent.click(screen.getByRole('switch', { name: '로그인 이어받기' }));
    다음();
    expect(screen.queryByText(/^끝까지 이어졌습니다/)).toBeNull();
    expect(바닥()).toBe('시험 없이 넘어가도 저장할 수 있습니다');
  });

  it('저장하고 실행은 대상 서버가 없으면 저장 단계에 고르개를 열고, 고르면 저장 · 실행 뒤 결과로 간다', async () => {
    await 경로채우고시험으로();
    다음();
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '첫 주문' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하고 실행' }));
    expect((await screen.findByRole('alert')).textContent).toBe('대상 서버를 먼저 고릅니다');
    expect(screen.queryByRole('button', { name: '시험 실행 중' })).toBeNull();

    vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 32, version: 1 });
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 9 });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'stg' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하고 실행' }));
    await waitFor(() => expect(window.location.hash).toBe(결과주소(9, 'scenario')));
    expect(실행).toHaveBeenCalledWith(32, 'stg');
  });
});
