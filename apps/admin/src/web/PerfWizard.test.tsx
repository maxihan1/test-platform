// @vitest-environment jsdom
// 성능 시나리오 네 단계 마법사 검사 (도메인/성능 §8.14)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError, type ServiceRow, type User } from './api.js';
import { perfApi, type PerfAgent, type PerfScenario, type 더미클라이언트 } from './perfApi.js';
import { PerfWizard } from './PerfWizard.js';
import { scenarioApi } from './scenarioApi.js';

const 앱 = (runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 7,
  prefix: 'ZPW',
  name: 'ZPW 웹',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs, authoring: 'read' },
});
const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zpw',
  displayName: '성능',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [앱(runs)],
});
const 부하에이전트: PerfAgent = { id: 11, name: '기본 에이전트', mode: 'LOAD', projectId: null, host: 'qahub', status: 'CONNECTED', maxVus: 1000, lastSeenAt: null, version: '1' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
});

async function 그리기(id: number | null = null, user: User = 사람(), 더미: 더미클라이언트[] = []) {
  vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [부하에이전트] });
  vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: 더미 });
  const 것 = render(<PerfWizard id={id} 띠서비스={user.services[0] ?? null} user={user} />);
  await screen.findByRole('button', { name: '다음' });
  return 것;
}

const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));

describe('새 시나리오를 네 단계로 만들어 실행한다', () => {
  it('이름 · 트랜잭션 · 부하 · 목표 · 실행 설정이 저장과 실행 요청에 실린다', async () => {
    const 만들기 = vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    const 실행 = vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 12 });
    await 그리기();

    다음();
    expect((await screen.findByRole('alert')).textContent).toContain('시나리오 이름을 적어 주세요');
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '주문하기' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: '/api/products' } });
    다음();

    fireEvent.click(screen.getByLabelText(/스트레스 테스트/));
    fireEvent.change(screen.getByLabelText('최대 가상 사용자'), { target: { value: '500' } });
    다음();

    fireEvent.click(screen.getByRole('button', { name: '목표 추가' }));
    expect((screen.getByLabelText('1번째 목표 값') as HTMLInputElement).value).toBe('2');
    다음();

    fireEvent.click(await screen.findByLabelText(/기본 에이전트/));
    fireEvent.change(screen.getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
    expect(screen.getByText('스트레스 테스트', { selector: 'dd' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    await waitFor(() => expect(실행).toHaveBeenCalled());
    const [serviceId, name, body] = 만들기.mock.calls[0]!;
    expect([serviceId, name]).toEqual([7, '주문하기']);
    expect(body.transactions).toEqual([{ name: '트랜잭션 1', method: 'GET', url: '/api/products' }]);
    expect(body.load).toMatchObject({ basis: 'VUS', testType: 'STRESS' });
    expect(body.run).toMatchObject({ env: 'qa', agentIds: [11], maxVus: 500 });
    expect(실행.mock.calls[0]![0]).toMatchObject({
      scenarioId: 42,
      env: 'qa',
      testType: 'STRESS',
      agentIds: [11],
      targets: [{ metric: 'P95', op: '<=', value: 2000, source: 'MANUAL' }],
    });
    expect(실행.mock.calls[0]![0].stages.at(-1)).toEqual({ durationSec: 300, target: 500 });
    await waitFor(() => expect(window.location.hash).toBe('#/perf/runs/12'));
  });

  it('서버가 거절하면 까닭을 그 자리에 보인다', async () => {
    vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    vi.spyOn(perfApi, 'run').mockRejectedValue(new ApiError(400, 'PROD_ENV_BLOCKED', '', []));
    await 그리기();
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '주문하기' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    다음();
    다음();
    다음();
    fireEvent.click(await screen.findByLabelText(/기본 에이전트/));
    fireEvent.change(screen.getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect((await screen.findByRole('alert')).textContent).toContain('실서비스 서버로는 부하를 걸 수 없습니다');
  });
});

it('E2E 녹화를 맡기면 AI 가 만든 트랜잭션과 녹화 셈이 표에 들어온다', async () => {
  vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items: [{ id: 5, name: '주문 흐름', platform: 'desktop', version: 1, partCount: 3, isActive: true, needsCheck: false, runnable: true, lastRun: null }] });
  const 초안 = vi.spyOn(perfApi, 'draft').mockResolvedValue({ jobId: 90 });
  vi.spyOn(perfApi, 'job').mockResolvedValue({
    status: 'DONE',
    output: {
      transactions: [{ name: '로그인', method: 'POST', url: '/api/login', extract: [{ var: 'token', where: 'JSON', path: 'token', pick: 'FIRST' }] }],
      notes: { 로그인: '토큰을 뒤 요청 머리글에 쓴다' },
      excluded: [{ url: 'https://cdn.example.com/a.js', reason: '분석 스크립트' }],
      recorded: { total: 23, staticExcluded: 17, used: 1, excluded: 1 },
    },
  });
  const 만들기 = vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
  await 그리기();

  fireEvent.click(screen.getByRole('button', { name: 'E2E 녹화' }));
  fireEvent.change(await screen.findByLabelText(/^E2E 시나리오/), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
  fireEvent.click(screen.getByRole('button', { name: '녹화 시작' }));

  expect(await screen.findByText('녹화 요청 23건 중 API 1건 사용')).toBeTruthy();
  expect(초안).toHaveBeenCalledWith({ serviceId: 7, from: 'RECORD', env: 'qa', scenarioId: 5 });
  fireEvent.click(screen.getByRole('button', { name: '▸ 로그인' }));
  expect(screen.getByText('토큰을 뒤 요청 머리글에 쓴다')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '로그인 부하' } });
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
  await waitFor(() => expect(만들기).toHaveBeenCalled());
  expect(만들기.mock.calls[0]![3]).toBe(90);
});

it('고칠 때는 네 단계를 다 끝낸 것으로 보고 바로 간다', async () => {
  const 시나리오: PerfScenario = {
    id: 42,
    serviceId: 7,
    name: '주문하기',
    version: 3,
    accountsRows: 0,
    schedule: null,
    versions: [],
    body: {
      transactions: [{ name: '상품 목록', method: 'GET', url: '/api/products' }],
      load: { basis: 'VUS', testType: 'LOAD', stages: [{ durationSec: 60, target: 30 }] },
      targets: [{ metric: 'ERROR_RATE', op: '<=', value: 1, source: 'AI' }],
    },
  };
  vi.spyOn(perfApi, 'scenario').mockResolvedValue(시나리오);
  const 저장 = vi.spyOn(perfApi, 'save').mockResolvedValue({ version: 4 });
  await 그리기(42);

  fireEvent.click(await screen.findByRole('button', { name: /성능 목표/ }));
  expect(screen.getByText('AI 추천', { selector: '.perf-ai' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('1번째 목표 값'), { target: { value: '2' } });
  expect(screen.getByText('직접 입력', { selector: '.perf-tag' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
  await waitFor(() => expect(저장).toHaveBeenCalled());
  expect(저장.mock.calls[0]![1].targets).toEqual([{ metric: 'ERROR_RATE', op: '<=', value: 2, source: 'MANUAL', reqId: undefined }]);
  expect(await screen.findByText('버전 4')).toBeTruthy();
});

it('실행 읽기만 있는 사람에게는 저장 · 실행 · 가져오기가 없다', async () => {
  await 그리기(null, 사람('read'));
  expect(screen.queryByRole('button', { name: '임시 저장' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'E2E 녹화' })).toBeNull();
  expect(screen.queryByRole('button', { name: '트랜잭션 추가' })).toBeNull();
});

describe('부하 중 페이지 로딩 측정', () => {
  async function 네번째까지(user: User) {
    vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    await 그리기(null, user);
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '주문하기' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    다음();
    다음();
    다음();
    fireEvent.click(await screen.findByLabelText(/기본 에이전트/));
    fireEvent.change(screen.getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
  }

  it('웹이면 체크 칸이 있고, 켜면 실행 요청에 pageCheck: true 가 간다', async () => {
    const 실행 = vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 12 });
    await 네번째까지(사람());
    expect(screen.getByText('가장 최근 페이지 성능 측정에서 쓴 페이지를 브라우저 2개가 30초마다 엽니다')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('부하 중 페이지 로딩 측정'));
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    await waitFor(() => expect(실행).toHaveBeenCalled());
    expect(실행.mock.calls[0]![0]).toMatchObject({ pageCheck: true });
  });

  it('켜지 않으면 pageCheck 를 보내지 않는다', async () => {
    const 실행 = vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 12 });
    await 네번째까지(사람());
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    await waitFor(() => expect(실행).toHaveBeenCalled());
    expect(실행.mock.calls[0]![0]).not.toHaveProperty('pageCheck');
  });

  it('Android 앱 애플리케이션에는 체크 칸이 없다', async () => {
    const 앱사람: User = { ...사람(), services: [{ ...앱(), kind: 'APP' }] };
    await 네번째까지(앱사람);
    expect(screen.queryByLabelText('부하 중 페이지 로딩 측정')).toBeNull();
  });
});
