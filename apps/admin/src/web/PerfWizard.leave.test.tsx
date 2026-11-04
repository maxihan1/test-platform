// @vitest-environment jsdom
// 부하 마법사 — 마지막 저장과 다른 값이 있으면 화면을 떠나기 전에 묻는다. 「실행」으로 결과 화면에 가는 것은 묻지 않는다 (공통/5-화면공통 §8 「저장 안 한 내용이 있으면 떠나기 전에 묻는다」)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ServiceRow, User } from './api.js';
import { 주소로간다, 주소보기, 주소에선다 } from './keepState.fixture.js';
import { perfApi, type PerfAgent } from './perfApi.js';
import { PerfWizard } from './PerfWizard.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'ZPL',
  name: 'ZPL 웹',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
};
const 사람: User = { username: 'zpl', displayName: '성능', role: 'member', dashboard: 'none', mustChangePassword: false, services: [앱] };
const 에이전트: PerfAgent = { id: 11, name: '기본 에이전트', mode: 'LOAD', projectId: null, host: 'qahub', status: 'CONNECTED', maxVus: 1000, lastSeenAt: null, version: '1' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기() {
  vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [에이전트] });
  vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: [] });
  주소에선다('#/perf/scenarios/new');
  render(
    <>
      <주소보기 />
      <PerfWizard id={null} 띠서비스={앱} user={사람} />
    </>,
  );
  await screen.findByRole('button', { name: '다음' });
}

const 이름을적는다 = () => fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '주문하기' } });

describe('부하 마법사 떠나기 묻기', () => {
  it('아무것도 안 고쳤으면 그냥 간다', async () => {
    await 그리기();
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });

  it('값을 고쳤으면 묻고 주소는 그대로다', async () => {
    await 그리기();
    이름을적는다();
    await 주소로간다('#/cases');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).toBe('#/perf/scenarios/new');
  });

  it('저장한 뒤에는 묻지 않는다', async () => {
    vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    await 그리기();
    이름을적는다();
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await screen.findByText('저장했습니다');
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });

  it('「실행」으로 결과 화면에 갈 때는 묻지 않는다', async () => {
    vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 12 });
    await 그리기();
    이름을적는다();
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(await screen.findByLabelText(/기본 에이전트/));
    fireEvent.change(screen.getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    await waitFor(() => expect(screen.getByTestId('hash').textContent).toBe('#/perf/runs/12'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
