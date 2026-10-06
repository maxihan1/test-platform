// @vitest-environment jsdom
// E2E 시나리오 변경 이력 탭 검사 — 버전 줄 · 옛 버전 요약 · 되돌리기 · 초안 새로 불러오기 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type ServiceRow, type User } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { when } from './ui.js';

const 서비스 = (prefix: string, runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 1,
  prefix,
  name: `${prefix} 서비스`,
  color: '#000',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs, authoring: 'read' },
});
const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스('ZSB', runs)],
});

const 케이스단계 = (tcId: string, params: Record<string, unknown> = {}): ScenarioPart => ({
  kind: 'case',
  tcId,
  params,
  expected: {},
  skipSteps: [],
});

const 시각3 = '2026-10-06T00:10:00.000Z';
const 시각2 = '2026-10-05T00:10:00.000Z';
const 시각1 = '2026-10-04T00:10:00.000Z';
const 시각4 = '2026-10-07T00:10:00.000Z';

const 버전줄 = (version: number, savedByName: string, savedAt: string) => ({
  version,
  savedBy: 'zsb',
  savedByName,
  savedAt,
});
const 옛이력 = [버전줄(3, '홍길동', 시각3), 버전줄(2, '김철수', 시각2), 버전줄(1, '이영희', 시각1)];

function 상세(덮: Partial<ScenarioDetail> = {}): ScenarioDetail {
  return {
    id: 12,
    service: 'ZSB',
    name: 'ZSB 가입 흐름',
    platform: 'desktop',
    version: 3,
    parts: [케이스단계('ZSB-001', { name: '지금값' })],
    isActive: true,
    versions: 옛이력,
    checks: [],
    ...덮,
  };
}

const 재료 = (tcId: string): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: { name: { type: 'string', description: '이름' } } },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

const 옛본문 = {
  platform: 'desktop' as const,
  parts: [
    케이스단계('ZSB-001', { name: '돌린값' }),
    케이스단계('ZSB-009'),
    { kind: 'api', method: 'GET', path: '/api/x', expectStatus: 200 } as ScenarioPart,
  ],
};

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  sessionStorage.clear();
});

async function 이력열기(runs: 'read' | 'write' = 'write', 덮: Partial<ScenarioDetail> = {}) {
  vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세(덮));
  const 재료읽기 = vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
    if (tcId === 'ZSB-009') throw new ApiError(404, 'NOT_FOUND', 'x');
    return 재료(tcId);
  });
  const 버전읽기 = vi.spyOn(scenarioApi, 'version').mockResolvedValue(옛본문);
  const 것 = render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람(runs)} />);
  await screen.findByLabelText('시나리오 이름');
  if (runs === 'write') fireEvent.click(screen.getByRole('button', { name: '변경 이력' }));
  else fireEvent.click(screen.getByRole('tab', { name: '변경 이력' }));
  return { ...것, 재료읽기, 버전읽기 };
}

const 줄글 = (v: number, 이름: string, 시각: string) => `v${v} · ${이름} · ${when(시각, 'ko')}`;

describe('변경 이력 탭 목록', () => {
  it('머리 변경 이력 버튼이 탭을 열고 버전마다 한 줄이며 맨 앞에만 지금 버전이 붙는다', async () => {
    const { container } = await 이력열기();

    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('history');
    expect(screen.getByText(줄글(3, '홍길동', 시각3))).toBeTruthy();
    expect(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) })).toBeTruthy();
    expect(screen.getByRole('button', { name: 줄글(1, '이영희', 시각1) })).toBeTruthy();
    const 칩 = screen.getAllByText('지금 버전');
    expect(칩).toHaveLength(1);
    expect(칩[0]?.className).toContain('tech-tag');
    expect(칩[0]?.closest('li')?.textContent).toContain('v3');
  });

  it('읽기만 하는 사람도 탭 줄의 변경 이력으로 목록을 본다', async () => {
    await 이력열기('read');

    expect(screen.getByText(줄글(3, '홍길동', 시각3))).toBeTruthy();
  });
});

describe('옛 버전 펼치기', () => {
  it('누르면 그 버전을 불러 단계마다 한 줄 요약을 펼치고 재료가 없는 케이스는 tcId 만 보인다', async () => {
    const { 재료읽기, 버전읽기 } = await 이력열기();
    const 앞 = 재료읽기.mock.calls.length;

    const 줄 = screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) });
    expect(줄.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(줄);

    await waitFor(() => expect(버전읽기).toHaveBeenCalledWith(12, 2));
    const 목록 = await screen.findByRole('list', { name: 'v2 단계' });
    const 칸들 = within(목록).getAllByRole('listitem');
    expect(칸들).toHaveLength(3);
    expect(칸들[0]?.textContent).toContain('ZSB-001 ZSB-001 케이스');
    expect(칸들[1]?.textContent).toContain('ZSB-009');
    expect(칸들[1]?.textContent).not.toContain('케이스 ·');
    expect(칸들[2]?.textContent).toContain('GET /api/x → 200');
    expect(줄.getAttribute('aria-expanded')).toBe('true');
    expect(재료읽기.mock.calls.length).toBe(앞);
  });

  it('쓰기가 아니면 되돌리기 버튼이 없다', async () => {
    await 이력열기('read');
    fireEvent.click(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) }));
    await screen.findByRole('list', { name: 'v2 단계' });

    expect(screen.queryByRole('button', { name: '이 버전으로 되돌리기' })).toBeNull();
  });
});

describe('이 버전으로 되돌리기', () => {
  it('restore 를 부르고 상세를 다시 불러 새 버전 줄과 알림이 나오고 케이스 패널 입력 칸이 새 값을 보인다', async () => {
    await 이력열기();
    fireEvent.click(await screen.findByRole('tab', { name: '1번 설정' }));
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('지금값');
    fireEvent.click(screen.getByRole('tab', { name: '변경 이력' }));

    const 복원 = vi.spyOn(scenarioApi, 'restore').mockResolvedValue({ version: 4 });
    const 다시 = vi.spyOn(scenarioApi, 'detail').mockResolvedValue(
      상세({
        version: 4,
        parts: [케이스단계('ZSB-001', { name: '돌린값' })],
        versions: [버전줄(4, '조립자', 시각4), ...옛이력],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 되돌리기' }));

    await waitFor(() => expect(복원).toHaveBeenCalledWith(12, 2));
    expect(await screen.findByText('v2 내용으로 되돌렸습니다 · 지금 v4')).toBeTruthy();
    await waitFor(() => expect(다시).toHaveBeenCalled());
    expect(await screen.findByText(줄글(4, '조립자', 시각4))).toBeTruthy();
    expect(screen.getAllByText('지금 버전')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: '1번 설정' }));
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('돌린값');
  });

  it('저장 안 된 변경이 있으면 서버를 부르지 않고 문장만 보인다', async () => {
    await 이력열기();
    const 복원 = vi.spyOn(scenarioApi, 'restore').mockResolvedValue({ version: 4 });
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: 'ZSB 고친 이름' } });

    fireEvent.click(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 되돌리기' }));

    expect(await screen.findByText('저장 안 된 변경이 있어 되돌릴 수 없습니다')).toBeTruthy();
    expect(복원).not.toHaveBeenCalled();
  });

  it('치운 시나리오라 409 SCENARIO_ARCHIVED 가 오면 그 문장을 보이고 초안은 그대로다', async () => {
    await 이력열기();
    vi.spyOn(scenarioApi, 'restore').mockRejectedValue(new ApiError(409, 'SCENARIO_ARCHIVED', ''));

    fireEvent.click(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 되돌리기' }));

    expect(await screen.findByText('목록에서 치운 시나리오라 고치거나 실행할 수 없습니다')).toBeTruthy();
    expect(screen.queryByText(/내용으로 되돌렸습니다/)).toBeNull();
  });

  it('되돌린 뒤 상세를 다시 불러오다 실패하면 조립 화면은 남고 상태 줄에 오류 문장이 뜬다', async () => {
    await 이력열기();
    vi.spyOn(scenarioApi, 'restore').mockResolvedValue({ version: 4 });
    vi.spyOn(scenarioApi, 'detail').mockRejectedValue(new ApiError(500, 'SERVER_ERROR', ''));

    fireEvent.click(screen.getByRole('button', { name: 줄글(2, '김철수', 시각2) }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 되돌리기' }));

    expect(await screen.findByText('요청이 실패했습니다 (SERVER_ERROR)')).toBeTruthy();
    expect(screen.getByLabelText('시나리오 이름')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^1케이스/ })).toBeTruthy();
  });
});
