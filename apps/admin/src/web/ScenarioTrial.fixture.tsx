// E2E 시나리오 시험 실행 화면 검사들이 나눠 쓰는 도우미 — 서비스 · 단계 · 결과 자료와 조립 화면 그리기

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ServiceRow, type User } from './api.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';

export const 서비스 = (prefix: string, runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 1,
  prefix,
  name: `${prefix} 서비스`,
  color: '#000',
  envs: prefix === 'ZSB' ? [{ env: 'stg', baseUrl: 'https://stg.example' }, { env: 'prod', baseUrl: 'https://prod.example' }] : [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs, authoring: 'read' },
});
export const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스('ZSB', runs), 서비스('ZSC', runs)],
});

export const 케이스단계 = (tcId: string, 덮: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...덮,
});

export const 단계셋 = [케이스단계('ZSB-001'), 케이스단계('ZSB-002'), 케이스단계('ZSB-001')];

export function 상세(parts: ScenarioPart[] = 단계셋): ScenarioDetail {
  return {
    id: 12,
    service: 'ZSB',
    name: 'ZSB 가입 흐름',
    platform: 'desktop',
    version: 3,
    parts,
    isActive: true,
    versions: [{ version: 3, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' }],
    checks: [],
  };
}

export const 재료 = (tcId: string): CasePartMaterial => ({
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

export const 실패결과: ScenarioExecuteResponse = {
  status: 'FAIL',
  durationMs: 3400,
  parts: [
    { seq: 1, status: 'PASS', durationMs: 1200, steps: [], mocks: [] },
    {
      seq: 2,
      status: 'FAIL',
      durationMs: 2200,
      steps: [{ seq: 5, title: '결제한다', status: 'FAIL', durationMs: 10, assertions: [] }],
      mocks: [],
      error: { message: '기대 a\n실제 b' },
    },
    { seq: 3, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: 'NOT_RUN' } },
  ],
};
export const 통과결과: ScenarioExecuteResponse = {
  status: 'PASS',
  durationMs: 1500,
  parts: [{ seq: 1, status: 'PASS', durationMs: 1500, steps: [], mocks: [] }],
};


export async function 기존그리기(parts: ScenarioPart[] = 단계셋, user: User = 사람()) {
  vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세(parts));
  vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
  const 것 = render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={user} />);
  await screen.findByLabelText('시나리오 이름');
  return 것;
}

export async function 흘리기(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

export const 서버고르기 = (env: string) => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: env } });
export const 시험누르기 = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
  });
  await 흘리기(0);
};
export const 탭 = (container: HTMLElement) => container.querySelector('.scn-build')?.getAttribute('data-tab');
