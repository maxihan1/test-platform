// @vitest-environment jsdom
// 설정 › 성능 에이전트 · 성능 시나리오 목록 검사 (도메인/성능 §8.14)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { perfApi, type PerfAgent } from './perfApi.js';
import { PerfScenarioList } from './PerfScenarioList.js';
import { SettingsPerfAgents } from './SettingsPerfAgents.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 에이전트 = (덮: Partial<PerfAgent>): PerfAgent => ({ id: 1, name: '기본 에이전트', mode: 'LOAD', projectId: null, host: 'qahub', status: 'CONNECTED', maxVus: 1000, lastSeenAt: null, version: '1', ...덮 });

describe('설정 › 성능 에이전트', () => {
  it('역할 · 상태를 사람 말로 보인다', async () => {
    vi.spyOn(perfApi, 'agents').mockResolvedValue({
      agents: [에이전트({}), 에이전트({ id: 2, name: 'web-1', mode: 'MONITOR', projectId: 3, maxVus: null }), 에이전트({ id: 3, name: '사무실-3', status: 'OFFLINE' })],
    });
    render(<SettingsPerfAgents projects={[{ id: 3, name: '데모마켓' }]} />);
    const 줄 = (await screen.findByText('사무실-3')).closest('tr')!;
    expect(줄.textContent).toContain('연결 끊김');
    expect(screen.getByText('web-1').closest('tr')!.textContent).toContain('모니터링');
  });

  it('모니터링 에이전트를 붙이면 프로젝트를 싣고 설치 명령을 한 번 보인다', async () => {
    vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [] });
    const 추가 = vi.spyOn(perfApi, 'addAgent').mockResolvedValue({ id: 9, token: 'pga_x', installCommand: 'docker run -e AGENT_TOKEN=pga_x qahub-perf-agent' });
    render(<SettingsPerfAgents projects={[{ id: 3, name: '데모마켓' }]} />);

    fireEvent.click(await screen.findByLabelText('모니터링'));
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: 'db-1' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect((await screen.findByRole('alert')).textContent).toBe('이름과 프로젝트를 정해 주세요');

    fireEvent.change(screen.getByLabelText(/^프로젝트/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(await screen.findByText('docker run -e AGENT_TOKEN=pga_x qahub-perf-agent')).toBeTruthy();
    expect(추가).toHaveBeenCalledWith('db-1', 'MONITOR', 3);
  });

  it('지우기는 확인을 받고 지운다', async () => {
    vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [에이전트({ id: 5, name: '사무실-2' })] });
    const 지우기 = vi.spyOn(perfApi, 'removeAgent').mockResolvedValue(undefined);
    render(<SettingsPerfAgents projects={[]} />);
    fireEvent.click(await screen.findByRole('button', { name: '사무실-2 삭제' }));
    fireEvent.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!);
    await waitFor(() => expect(지우기).toHaveBeenCalledWith(5));
  });
});

describe('성능 테스트 › 시나리오 목록', () => {
  it('마지막 실행을 판정 글자로 보이고 시나리오로 가는 주소를 단다', async () => {
    vi.spyOn(perfApi, 'scenarios').mockResolvedValue({
      scenarios: [
        { id: 4, name: '주문하기', version: 3, updatedAt: '2026-10-21T00:00:00.000Z', lastRun: { id: 12, status: 'DONE', verdict: 'FAIL', createdAt: '2026-10-21T01:00:00.000Z' } },
        { id: 5, name: '로그인', version: 1, updatedAt: null, lastRun: null },
      ],
    });
    render(<PerfScenarioList serviceId={7} 할수={() => true} />);
    const 링크 = await screen.findByRole('link', { name: '주문하기' });
    expect(링크.getAttribute('href')).toBe('#/perf/scenarios/4');
    expect(링크.closest('tr')!.textContent).toContain('실패');
    expect(screen.getByRole('link', { name: '로그인' }).closest('tr')!.textContent).toContain('실행 전');
    expect(screen.getByRole('link', { name: '시나리오 만들기' }).getAttribute('href')).toBe('#/perf/scenarios/new');
  });

  it('읽기만 있으면 만들기 · 삭제가 없다', async () => {
    vi.spyOn(perfApi, 'scenarios').mockResolvedValue({ scenarios: [{ id: 4, name: '주문하기', version: 1, updatedAt: null, lastRun: null }] });
    render(<PerfScenarioList serviceId={7} 할수={() => false} />);
    await screen.findByText('주문하기');
    expect(screen.queryByRole('link', { name: '시나리오 만들기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '주문하기 삭제' })).toBeNull();
  });
});
