// E2E 시나리오 조립 화면 ① 검사들이 나눠 쓰는 도우미 — 서비스 · 사람 · 상세 · 재료 자료와 그리기 · 해시 이동

import type { ScenarioPart } from '@platform/kit';
import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ServiceRow, type User } from './api.js';
import { useHash } from './leaveGuard.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';

export const 칸 = (runs: 'read' | 'write') => ({ cases: 'read' as const, runs, authoring: 'read' as const });
export const 서비스 = (prefix: string, runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 1,
  prefix,
  name: `${prefix} 서비스`,
  color: '#000',
  envs: [],
  hasSlackWebhook: false,
  permissions: 칸(runs),
});
export const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스('ZSB', runs), 서비스('ZSC', runs)],
});

export const 케이스단계 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });

export function 상세(덮: Partial<ScenarioDetail> = {}): ScenarioDetail {
  return {
    id: 12,
    service: 'ZSB',
    name: 'ZSB 가입 흐름',
    platform: 'desktop',
    version: 3,
    parts: [케이스단계('ZSB-001'), 케이스단계('ZSB-002'), 케이스단계('ZSB-001')],
    isActive: true,
    versions: [
      { version: 3, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' },
      { version: 2, savedBy: 'zsb', savedByName: '김철수', savedAt: '2026-10-05T00:10:00.000Z' },
    ],
    checks: [],
    ...덮,
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


export async function 기존그리기(
  덮: Partial<ScenarioDetail> = {},
  user: User = 사람(),
  띠: ServiceRow | null = 서비스('ZSB'),
) {
  const detail = vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세(덮));
  const caseParts = vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
  vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
  const 것 = render(<ScenarioBuild id={12} 띠서비스={띠} user={user} />);
  await screen.findByLabelText('시나리오 이름');
  return { ...것, detail, caseParts };
}

export function 새로그리기(user: User = 사람(), 띠: ServiceRow | null = 서비스('ZSB')) {
  vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
  return render(<ScenarioBuild id={null} 띠서비스={띠} user={user} />);
}

export const 이름칸 = () => screen.getByLabelText('시나리오 이름') as HTMLInputElement;
export const 바꾸기 = (글: string) => fireEvent.change(이름칸(), { target: { value: 글 } });

// main.tsx 를 못 그리므로 useHash 를 쓰는 작은 감싸개 안에 그린다. 도착 주소가 되면 다른 글자를 그린다
export function 감싸개({ id, 띠 = 서비스('ZSB'), 도착 }: { id: number | null; 띠?: ServiceRow; 도착: string }) {
  const hash = useHash();
  if (hash.startsWith(도착)) return <p>도착 화면</p>;
  return <ScenarioBuild id={id} 띠서비스={띠} user={사람()} />;
}

export async function 해시가(해시: string) {
  await act(async () => {
    await new Promise((끝) => setTimeout(끝, 0));
  });
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}
