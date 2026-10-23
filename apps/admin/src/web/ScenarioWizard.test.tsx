// @vitest-environment jsdom
// E2E 마법사 ① — 단계 띠 · 시작 방법 · AI 추천(맡기기 · 후보 · 꺼짐) · 단계(첫 단계 추천 · 이어 붙이기) · 조립 화면으로 (도메인/시나리오 §8.11 「마법사」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type CaseRow } from './api.js';
import { useHash } from './leaveGuard.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 사람, 서비스, 재료 } from './ScenarioBuild.fixture.js';
import { scenarioApi, type FlowJob } from './scenarioApi.js';
import { ScenarioWizard } from './ScenarioWizard.js';
import { 묻는간격 } from './usePerfJob.js';

const 줄 = (tcId: string, axis: '정상' | '경계' = '정상'): CaseRow => ({
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
  reqs: [{ reqId: `REQ-${tcId}`, text: `${tcId} 요구`, axis }],
  screens: [{ file: 'pages/x.page.ts', url: tcId === 'ZSB-001' ? '/login' : '/cart' }],
});

const 끝난일: FlowJob = {
  status: 'DONE',
  error: null,
  material: { reqs: 4, cases: 12, links: 30, truncated: false },
  candidates: [
    {
      name: '첫 주문',
      why: '로그인부터 주문까지',
      reqIds: ['REQ-1', 'REQ-2'],
      steps: [
        { tcId: 'ZSB-001', name: '로그인 성공' },
        { tcId: 'ZSB-002', name: '주문하기' },
      ],
      links: [
        {
          toSeq: 2,
          link: { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'id' } },
          needs: [],
          why: '1번 응답을 2번에',
        },
      ],
    },
  ],
};

beforeEach(() => {
  묻는간격.ms = 0;
  window.location.hash = '#/scenarios/new';
  vi.spyOn(api, 'cases').mockResolvedValue({
    items: [줄('ZSB-001'), 줄('ZSB-002'), 줄('ZSB-003', '경계')],
    total: 3,
    page: 1,
    pageSize: 50,
    hasFeatures: true,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 그리기 = (user = 사람()) => render(<ScenarioWizard 띠서비스={서비스('ZSB')} user={user} />);
const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));
const 띠 = () => within(screen.getByRole('dialog')).getAllByRole('listitem').filter((li) => li.parentElement?.classList.contains('wz-steps')).map((li) => li.querySelector('.wz-stepbtn')?.textContent?.replace(/^\d/u, ''));

describe('ScenarioWizard 시작 방법', () => {
  it('고르기 전에 다음을 누르면 까닭이 뜨고, 직접 고르기면 AI 추천 단계가 띠에 없다', () => {
    그리기();
    다음();
    expect(screen.getByRole('alert').textContent).toBe('시작 방법을 고릅니다');
    expect(띠()).toEqual(['시작 방법', '단계', '값 연결', '시험 실행', '저장']);

    fireEvent.click(screen.getByRole('button', { name: /AI 추천으로 시작/ }));
    expect(띠()).toEqual(['시작 방법', 'AI 추천', '단계', '값 연결', '시험 실행', '저장']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('다음 단계로 넘어가면 본문이 맨 위에서 시작한다', () => {
    그리기();
    fireEvent.click(screen.getByRole('button', { name: /직접 고르기/ }));
    const 본문 = document.querySelector('.wz-main');
    if (본문 === null) throw new Error('마법사 본문이 없다');
    본문.scrollTop = 490;
    다음();
    expect(screen.getByText(/^2 \/ 5/u)).toBeTruthy();
    expect(본문.scrollTop).toBe(0);
  });

  it('읽기만 하는 사람은 목록으로 보낸다', async () => {
    그리기(사람('read'));
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios'));
  });
});

describe('ScenarioWizard AI 추천', () => {
  it('들어오면 맡기고 끝날 때까지 묻는다. 후보를 고르면 단계가 채워지고 값 연결이 받는 단계에 달린다', async () => {
    const 맡기기 = vi.spyOn(scenarioApi, 'suggestFlows').mockResolvedValue({ jobId: 7 });
    const 묻기 = vi
      .spyOn(scenarioApi, 'flowJob')
      .mockResolvedValueOnce({ ...끝난일, status: 'QUEUED', candidates: null })
      .mockResolvedValue(끝난일);
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    그리기();
    fireEvent.click(screen.getByRole('button', { name: /AI 추천으로 시작/ }));
    다음();

    const 후보 = await screen.findByRole('button', { name: /첫 주문/ });
    expect(맡기기).toHaveBeenCalledWith({ service: 'ZSB', platform: 'desktop' });
    expect(묻기).toHaveBeenCalledWith(7);
    expect(후보.textContent).toContain('단계 2개 · 값 연결 1곳 · 요구 2건');
    expect(screen.getByText('테스트 12건')).toBeTruthy();

    다음();
    expect(screen.getByRole('alert').textContent).toContain('후보를 하나 골라 주세요');
    fireEvent.click(후보);
    expect(후보.getAttribute('aria-pressed')).toBe('true');
    다음();

    const 순서 = await screen.findByRole('region', { name: '지금 순서' });
    expect(within(순서).getByText('로그인 성공')).toBeTruthy();
    expect(within(순서).getByText('주문하기')).toBeTruthy();

    // 이전으로 돌아와도 다시 맡기지 않고 받은 후보를 보인다
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(await screen.findByRole('button', { name: /첫 주문/ })).toBeTruthy();
    expect(맡기기).toHaveBeenCalledTimes(1);
  });

  it('작성 에이전트가 꺼져 있으면 쓸 수 없다고 알리고 직접 고르기로 이어 간다', async () => {
    vi.spyOn(scenarioApi, 'suggestFlows').mockRejectedValue(new ApiError(503, 'AGENT_OFFLINE', '작성 에이전트가 꺼져 있습니다'));
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    그리기();
    fireEvent.click(screen.getByRole('button', { name: /AI 추천으로 시작/ }));
    다음();

    expect(await screen.findByText('AI 추천을 지금 쓸 수 없습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '직접 고르기로 바꾸기' }));
    expect(screen.getByRole('heading', { name: '단계를 차례로 이어 붙입니다' })).toBeTruthy();
    expect(띠()).toEqual(['시작 방법', '단계', '값 연결', '시험 실행', '저장']);
  });
});

describe('ScenarioWizard 단계', () => {
  async function 단계로() {
    그리기();
    fireEvent.click(screen.getByRole('button', { name: /직접 고르기/ }));
    다음();
    await screen.findByRole('region', { name: '지금 순서' });
  }

  it('단계가 없으면 첫 단계 추천을 보이고, 넣으면 그 단계 다음 추천으로 바뀐다', async () => {
    const 추천 = vi.spyOn(scenarioApi, 'nextCases').mockImplementation(async (_s, after) => ({
      items: after === undefined ? [{ tcId: 'ZSB-001', screen: '/' }] : [{ tcId: 'ZSB-002', screen: '/cart' }],
    }));
    await 단계로();
    다음();
    expect(screen.getByRole('alert').textContent).toBe('단계를 하나 이상 넣습니다');

    const 첫 = await screen.findByRole('region', { name: '첫 단계 추천' });
    expect(추천).toHaveBeenCalledWith('ZSB', undefined);
    fireEvent.click(within(첫).getByRole('button', { name: 'ZSB-001 넣기' }));

    const 뒤 = await screen.findByRole('region', { name: '다음 단계 추천' });
    expect(추천).toHaveBeenCalledWith('ZSB', 'ZSB-001');
    await waitFor(() => expect(뒤.textContent).toContain('1번 「ZSB-001 케이스」 다음 · 이어지는 화면 /cart'));
    fireEvent.click(within(뒤).getByRole('button', { name: 'ZSB-002 넣기' }));

    const 순서 = screen.getByRole('region', { name: '지금 순서' });
    expect(within(순서).getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent)).toEqual(['ZSB-001 케이스', 'ZSB-002 케이스']);
    expect(within(순서).getAllByText('ZSB-001 · /login')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '2번 위로' }));
    expect(within(순서).getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent)).toEqual(['ZSB-002 케이스', 'ZSB-001 케이스']);
    fireEvent.click(screen.getByRole('button', { name: '1번 삭제' }));
    expect(within(순서).getAllByRole('listitem')).toHaveLength(1);
  });

  it('케이스 찾기는 경계 · 예외 케이스도 찾고, 다른 단계는 줄 아래에 설정 칸을 편다', async () => {
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    await 단계로();
    expect(await screen.findByText('이어지는 화면 기록이 없습니다. 「케이스 찾기」로 고릅니다')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('케이스 찾기'), { target: { value: 'ZSB-003' } });
    fireEvent.click(await screen.findByRole('button', { name: 'ZSB-003 넣기' }));
    fireEvent.change(screen.getByLabelText('케이스 찾기'), { target: { value: '없는 것' } });
    expect(screen.getByText('「없는 것」에 맞는 케이스가 없습니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ 대기' }));
    const 순서 = screen.getByRole('region', { name: '지금 순서' });
    expect(within(순서).getAllByRole('listitem')).toHaveLength(2);
    expect(within(순서).getByRole('heading', { name: '대기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+ 모킹 끄기' })).toBeNull();
  });
});

describe('ScenarioWizard 조립 화면으로', () => {
  function 감싸개() {
    const hash = useHash();
    if (hash === '#/scenarios/new/build') return <ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />;
    return <ScenarioWizard 띠서비스={서비스('ZSB')} user={사람()} />;
  }

  it('지금 초안을 들고 빈 조립 화면으로 옮긴다. 저장 안 한 변경으로 보인다', async () => {
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [{ tcId: 'ZSB-001', screen: '/' }] });
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    render(<감싸개 />);
    fireEvent.click(screen.getByRole('button', { name: /직접 고르기/ }));
    다음();
    fireEvent.click(within(await screen.findByRole('region', { name: '첫 단계 추천' })).getByRole('button', { name: 'ZSB-001 넣기' }));
    fireEvent.click(screen.getByRole('button', { name: '조립 화면으로' }));

    expect(await screen.findByText('저장 안 된 변경 있음')).toBeTruthy();
    expect(window.location.hash).toBe('#/scenarios/new/build');
    expect(screen.getByRole('region', { name: '시나리오 단계' }).textContent).toContain('ZSB-001');
  });
});
