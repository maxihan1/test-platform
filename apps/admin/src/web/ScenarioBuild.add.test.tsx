// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ⑥ 연결 검사 — 단계 추가 탭의 팔레트가 단계를 더하고 케이스 바꾸기 모드가 그 단계만 바꾼다 (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type CaseRow, type ServiceRow, type User } from './api.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZSB',
  name: 'ZSB 서비스',
  color: '#000',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
};
const 사람: User = {
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스],
};

const 케이스 = (tcId: string): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop', 'mobile'],
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-06T00:00:00.000Z',
  techniques: [],
});

const 재료 = (tcId: string): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

function 막기() {
  vi.spyOn(api, 'cases').mockResolvedValue({
    items: [케이스('ZSB-001'), 케이스('ZSB-002')],
    total: 2,
    page: 1,
    pageSize: 50,
  });
  vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
    if (tcId === 'ZSB-404') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
    return 재료(tcId);
  });
}

const 카드이름들 = () => [...document.querySelectorAll('.scn-card-name')].map((e) => e.textContent);
const 탭 = (글: string) => screen.getByRole('tab', { name: 글 });

describe('ScenarioBuild 단계 추가 탭', () => {
  it('새 시나리오에서 케이스를 더하면 단계 카드가 생기고 1번 설정 탭이 열린다', async () => {
    막기();
    render(<ScenarioBuild id={null} 띠서비스={서비스} user={사람} />);

    fireEvent.click(await screen.findByRole('button', { name: 'ZSB-002 더하기' }));

    await waitFor(() => expect(카드이름들()).toEqual(['ZSB-002 ZSB-002 케이스']));
    expect(탭('1번 설정').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('settings');
  });

  it('다른 단계를 더하면 맨 끝에 붙고 그 번호의 설정 탭이 열린다', async () => {
    막기();
    render(<ScenarioBuild id={null} 띠서비스={서비스} user={사람} />);

    fireEvent.click(await screen.findByRole('button', { name: 'ZSB-001 더하기' }));
    fireEvent.click(탭('단계 추가'));
    fireEvent.click(await screen.findByRole('button', { name: '대기' }));

    expect(카드이름들()).toHaveLength(2);
    expect(탭('2번 설정').getAttribute('aria-selected')).toBe('true');
  });
});

describe('ScenarioBuild 케이스 바꾸기', () => {
  const 상세 = (): ScenarioDetail => ({
    id: 12,
    service: 'ZSB',
    name: 'ZSB 흐름',
    platform: 'desktop',
    version: 1,
    parts: [
      { kind: 'case', tcId: 'ZSB-404', params: { a: '1' }, expected: { b: '2' }, skipSteps: ['준비'] },
      { kind: 'case', tcId: 'ZSB-001', params: {}, expected: {}, skipSteps: [] },
    ],
    isActive: true,
    versions: [{ version: 1, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' }],
    checks: [],
  });

  async function 열기() {
    막기();
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    render(<ScenarioBuild id={12} 띠서비스={서비스} user={사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '케이스 바꾸기' }));
  }

  it('바꾸기 모드로 열리고 고르면 그 단계만 바뀌어 설정 입력이 비고 N번 설정으로 돌아온다', async () => {
    await 열기();

    expect(탭('단계 추가').getAttribute('aria-selected')).toBe('true');
    await screen.findByText('1번 단계를 바꿀 케이스를 고릅니다');
    fireEvent.click(await screen.findByRole('button', { name: 'ZSB-002 더하기' }));

    await waitFor(() => expect(탭('1번 설정').getAttribute('aria-selected')).toBe('true'));
    expect(카드이름들()).toEqual(['ZSB-002 ZSB-002 케이스', 'ZSB-001 ZSB-001 케이스']);
    const 요약 = document.querySelector('.scn-card-sum')?.textContent;
    expect(요약).toContain('준비 전부 실행');
    expect(요약).toContain('저장값 사용');
    fireEvent.click(탭('단계 추가'));
    expect(screen.queryByText(/번 단계를 바꿀 케이스를 고릅니다/)).toBeNull();
  });

  it('취소하면 바꾸기 모드만 풀리고 단계는 그대로다', async () => {
    await 열기();

    fireEvent.click(await screen.findByRole('button', { name: '취소' }));

    expect(screen.queryByText(/번 단계를 바꿀 케이스를 고릅니다/)).toBeNull();
    expect(탭('단계 추가').getAttribute('aria-selected')).toBe('true');
    expect(카드이름들()[0]).toBe('ZSB-404');
  });

  it('다른 탭으로 옮겼다 돌아오면 바꾸기 모드가 풀려 있다', async () => {
    await 열기();
    await screen.findByText('1번 단계를 바꿀 케이스를 고릅니다');

    fireEvent.click(탭('1번 설정'));
    fireEvent.click(탭('단계 추가'));

    expect(screen.queryByText(/번 단계를 바꿀 케이스를 고릅니다/)).toBeNull();
  });

  it('다른 카드를 고르면 바꾸기 모드가 풀린다', async () => {
    await 열기();
    await screen.findByText('1번 단계를 바꿀 케이스를 고릅니다');

    fireEvent.click(document.querySelector('[data-card="2"][data-act="pick"]') as HTMLElement);
    fireEvent.click(탭('단계 추가'));

    expect(screen.queryByText(/번 단계를 바꿀 케이스를 고릅니다/)).toBeNull();
  });
});

describe('ScenarioBuild 잘못 적은 칸이 있을 때', () => {
  const 대기상세 = (): ScenarioDetail => ({
    id: 12,
    service: 'ZSB',
    name: 'ZSB 대기 흐름',
    platform: 'desktop',
    version: 1,
    parts: [{ kind: 'wait', ms: 1000 }],
    isActive: true,
    versions: [{ version: 1, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' }],
    checks: [],
  });

  async function 열기() {
    막기();
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(대기상세());
    render(<ScenarioBuild id={12} 띠서비스={서비스} user={사람} />);
    return (await screen.findByLabelText('기다릴 시간(초)')) as HTMLInputElement;
  }

  it('대기 칸에 0 을 넣고 저장을 누르면 서버를 안 부르고 사유가 뜬다', async () => {
    const 칸 = await 열기();
    const update = vi.spyOn(scenarioApi, 'update');
    fireEvent.change(칸, { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('1번 단계의 잘못 적은 칸을 고쳐야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });

  it('칸을 바르게 고치면 다시 저장된다', async () => {
    const 칸 = await 열기();
    const update = vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 2 });
    fireEvent.change(칸, { target: { value: '0' } });
    fireEvent.change(칸, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].parts).toEqual([{ kind: 'wait', ms: 5000 }]);
  });
});
