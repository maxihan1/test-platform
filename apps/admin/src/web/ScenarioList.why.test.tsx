// @vitest-environment jsdom
// E2E 시나리오 목록의 실행 불가 · 확인 필요 까닭과 수정 단추 검사 (도메인/시나리오 §8.11 「목록」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import type { EnvRow } from './api.js';
import { t } from './i18n.js';
import { scenarioApi, type ScenarioDetail, type ScenarioRow } from './scenarioApi.js';
import { ScenarioList } from './ScenarioList.js';
import { 까닭글들 } from './ScenarioListWhy.js';

const 서버들: EnvRow[] = [{ env: 'qa', baseUrl: 'https://qa.example.com' }];
const 한국어 = (키: string, 값?: Record<string, string | number>) => t(키, 'ko', 값);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 줄(id: number, 덮: Partial<ScenarioRow> = {}): ScenarioRow {
  return { id, name: `ZSW 시나리오 ${id}`, platform: 'desktop', version: 2, partCount: 2, isActive: true, needsCheck: false, runnable: true, lastRun: null, ...덮 };
}

function 상세(checks: ScenarioDetail['checks']): ScenarioDetail {
  return {
    id: 1, service: 'ZSW', name: 'x', platform: 'desktop', version: 2, isActive: true, versions: [], checks,
    parts: [
      { kind: 'case', tcId: 'ZSW-FN-001', params: {}, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'ZSW-FN-002', params: {}, expected: {}, skipSteps: ['로그인'] },
    ],
  };
}

describe('까닭글들', () => {
  it('비활성 케이스는 단계 번호와 케이스 번호, 사라진 사전 단계는 단계 번호로 적는다', () => {
    const 글 = 까닭글들({ runnable: false }, 상세([{ seq: 1, reason: 'CASE_INACTIVE' }, { seq: 2, reason: 'STEP_GONE' }]), 한국어);
    expect(글).toEqual(['1번 단계 케이스가 비활성입니다 · ZSW-FN-001', '2번 단계에서 건너뛰던 사전 단계가 케이스에서 없어졌습니다']);
  });

  it('비활성 케이스 없이 실행 불가면 제한 시간 · 크기 까닭이다', () => {
    expect(까닭글들({ runnable: false }, 상세([]), 한국어)).toEqual(['단계 제한 시간 합이 60분을 넘거나 시나리오가 너무 커서 실행할 수 없습니다']);
  });

  it('실행할 수 있으면 확인 필요 까닭만 남는다', () => {
    expect(까닭글들({ runnable: true }, 상세([{ seq: 2, reason: 'STEP_GONE' }]), 한국어)).toHaveLength(1);
  });
});

describe('ScenarioList 까닭', () => {
  it('실행 불가 줄은 까닭이 이름 아래에 보이고 실행 대신 수정이 조립 화면으로 간다. 멀쩡한 줄은 상세를 안 읽는다', async () => {
    vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items: [줄(1, { runnable: false, needsCheck: true }), 줄(2)] });
    const 상세읽기 = vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세([{ seq: 1, reason: 'CASE_INACTIVE' }]));
    const { container } = render(<ScenarioList service="ZSW" envs={서버들} 할수={() => true} />);
    expect(await screen.findByText('1번 단계 케이스가 비활성입니다 · ZSW-FN-001')).toBeTruthy();
    const 첫 = container.querySelectorAll('.row')[0] as HTMLElement;
    expect(within(첫).getByRole('link', { name: '수정' }).getAttribute('href')).toBe('#/scenarios/1');
    expect(within(첫).queryByRole('button', { name: '실행' })).toBeNull();
    const 둘 = container.querySelectorAll('.row')[1] as HTMLElement;
    expect(within(둘).queryByRole('link', { name: '수정' })).toBeNull();
    expect(상세읽기).toHaveBeenCalledTimes(1);
    expect(상세읽기).toHaveBeenCalledWith(1);
  });

  it('확인 필요만 있는 줄은 실행 단추를 두고 까닭을 적는다', async () => {
    vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items: [줄(1, { needsCheck: true })] });
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세([{ seq: 2, reason: 'STEP_GONE' }]));
    render(<ScenarioList service="ZSW" envs={서버들} 할수={() => true} />);
    expect(await screen.findByText('2번 단계에서 건너뛰던 사전 단계가 케이스에서 없어졌습니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '실행' })).toBeTruthy();
  });
});
