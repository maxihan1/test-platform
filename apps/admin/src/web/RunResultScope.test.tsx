// @vitest-environment jsdom
// 실행 결과 화면 — 권한 · 시나리오 갈아타기 · 디바이스 칸 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, ApiError, type User } from './api.js';
import { RunResult } from './RunResult.js';
import { 판정을만든다 } from './role.js';
import { scenarioApi } from './scenarioApi.js';
import { RUN_ID, 실행, 실행까지 } from './RunResult.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

// 버튼은 띠에서 고른 서비스가 아니라 **그 실행의 서비스** 칸을 본다.
// 띠가 회원(실행 읽기)인 채로 결제 실행 주소를 열면 결제 칸으로 가른다 (화면공통 §8)
describe('실행 결과의 권한은 그 실행의 애플리케이션으로', () => {
  const 김: User = {
    username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false,
    services: [
      { id: 1, prefix: 'PAY', name: '결제', color: '#000000', projectId: 1, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'write', authoring: 'none' } },
      { id: 2, prefix: 'MEM', name: '회원', color: '#000000', projectId: 1, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'read', authoring: 'none' } },
    ],
  };

  function 항목(tcId: string) {
    return {
      historyId: 1, tcId, tcName: tcId, platform: 'desktop' as const, attempt: 1, params: {}, paramSchema: {},
      status: 'PASS' as const, durationMs: 1, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: null,
    };
  }

  function 연다(tcId: string, status: string) {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status, items: [항목(tcId)], evidence: [] });
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [], remainingMs: null });
    render(<RunResult runId={RUN_ID} 판정하기={(접두사) => 판정을만든다(김, 접두사)} />);
  }

  it('실행 쓰기인 애플리케이션의 실행이면 중단 버튼이 선다', async () => {
    연다('PAY-001', 'RUNNING');
    expect(await screen.findByText('실행 중단')).toBeTruthy();
  });

  it('실행 읽기인 애플리케이션의 실행이면 중단 버튼이 없다', async () => {
    연다('MEM-001', 'RUNNING');
    await screen.findAllByText(/대상 서버/);
    expect(screen.queryByText('실행 중단')).toBeNull();
  });

  it('리포트 생성도 그 실행의 애플리케이션으로 가른다', async () => {
    연다('PAY-001', 'FINISHED');
    expect(await screen.findByRole('button', { name: '리포트 생성' })).toBeTruthy();
    cleanup();
    연다('MEM-001', 'FINISHED');
    await screen.findAllByText(/대상 서버/);
    expect(screen.queryByRole('button', { name: '리포트 생성' })).toBeNull();
  });
});

describe('시나리오 실행 번호면 E2E 결과 화면으로 갈아탄다', () => {
  const 시나리오답 = {
    scenarioId: 12, version: 3, status: 'FINISHED', platform: 'desktop' as const, title: '결제 시나리오',
    env: 'qa', baseUrl: 'https://qa.example.com', triggeredBy: 'kim', triggeredByName: '김철수',
    startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:25:00.000Z', parts: [], evidence: [],
  };

  it('시나리오 실행 번호를 열면 E2E 결과를 부른다', async () => {
    vi.spyOn(api, 'run').mockRejectedValue(new ApiError(404, 'SCENARIO_RUN', ''));
    const 부름 = vi.spyOn(scenarioApi, 'result').mockResolvedValue(시나리오답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    expect(await screen.findByText('단계별 결과')).toBeTruthy();
    expect(부름).toHaveBeenCalledWith(RUN_ID);
  });
});

// 표의 칸과 디바이스 칩은 그 실행에서 실제로 돈 디바이스를 따른다 — 앞 판은 웹이면 늘 PC · 모바일 두 칸이었다 (도메인/실행 §8.3)
describe('디바이스 칸은 실제로 돈 디바이스로 정한다 (도메인/실행 §8.3)', () => {
  type 기기 = 'desktop' | 'mobile' | 'android';

  function 줄(tcId: string, platform: 기기) {
    return {
      historyId: 1, tcId, tcName: tcId, platform, attempt: 1, params: {}, paramSchema: {},
      status: 'PASS' as const, durationMs: 1, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:14:00.000Z',
    };
  }

  async function 본다(platforms: 기기[]) {
    vi.spyOn(api, 'run').mockResolvedValue({
      ...실행, status: 'FINISHED', items: platforms.map((p, i) => 줄(`PAY-00${i + 1}`, p)), evidence: [],
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await screen.findAllByText('PAY-001');
    return {
      머리: [...document.querySelectorAll('.rf-head span')].map((el) => el.textContent).filter((글) => 글 !== '' && 글 !== 'TC ID' && 글 !== '케이스명'),
      칩: [...document.querySelectorAll('button.chip')].map((el) => el.textContent),
    };
  }

  it('PC 만 돌았으면 칸 하나이고 디바이스 칩이 없다 — 안 돈 모바일 칸을 두지 않는다', async () => {
    const { 머리, 칩 } = await 본다(['desktop']);
    expect(머리).toEqual(['결과', '소요 시간']);
    expect(칩).toEqual([]);
  });

  it('Android 앱 항목만 있으면 칸 하나이고 칩이 없다', async () => {
    const { 머리, 칩 } = await 본다(['android']);
    expect(머리).toEqual(['결과', '소요 시간']);
    expect(칩).toEqual([]);
  });

  it('PC · 모바일이 다 돌았으면 칸이 둘이고 칩은 전체 · PC · 모바일이다', async () => {
    const { 머리, 칩 } = await 본다(['desktop', 'mobile']);
    expect(머리).toEqual(['PC', '모바일']);
    expect(칩).toEqual(['전체', 'PC', '모바일']);
  });

  it('둘이 섞이면 돈 것만 PC · 모바일 · Android 앱 차례로 칸이 된다', async () => {
    const { 머리, 칩 } = await 본다(['android', 'desktop']);
    expect(머리).toEqual(['PC', 'Android 앱']);
    expect(칩).toEqual(['전체', 'PC', 'Android 앱']);
  });
});
