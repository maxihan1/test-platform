// 실패 카드 검사들이 나눠 쓰는 도우미 — 실패 케이스 · 디바이스 · 통과 줄 자료와 화면 그리기

import { vi } from 'vitest';
import { render } from '@testing-library/react';

import {
  api,
  type FailureCase,
  type FailureDevice,
  type ItemStatus,
  type Paged,
  type Platform,
  type RunItemDetail,
  type RunItemSummary,
  type StepResult,
} from './api.js';
import { RunFailCards } from './RunFailCards.js';
import type { 판정 } from './role.js';

export const RUN_ID = 5011;

type 확인 = [string, ItemStatus, unknown, unknown];

export function 단계(seq: number, title: string, 확인들: 확인[], 덮을것: Partial<StepResult> = {}): StepResult {
  return {
    seq,
    title,
    status: 확인들.some((c) => c[1] === 'FAIL') ? 'FAIL' : 'PASS',
    durationMs: 1000,
    assertions: 확인들.map(([statement, status, expected, actual]) => ({ statement, status, expected, actual })),
    ...덮을것,
  };
}

export const 기본단계 = (실제값: unknown = '없음'): StepResult[] => [
  단계(1, '로그인 양식을 채운다', [['입력 칸이 보인다', 'PASS', true, true]]),
  단계(2, '가입 버튼을 누른다', [
    ['가입 완료 안내가 보인다', 'PASS', true, true],
    ['가입한 이메일이 보인다', 'FAIL', 'new@demo.kr', 실제값],
  ]),
];

export function 상세(historyId: number, platform: Platform, 덮을것: Partial<RunItemDetail> = {}): RunItemDetail {
  return {
    historyId,
    runId: RUN_ID,
    runTitle: '결제 회귀',
    tcId: 'ZZI-0001',
    tcName: '회원가입',
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status: 'FAIL',
    durationMs: 4200,
    error: null,
    startedAt: '2026-09-21T00:59:00.000Z',
    finishedAt: '2026-09-21T01:00:00.000Z',
    precondition: ['가입하지 않은 이메일'],
    expected: {},
    expectedSchema: {},
    steps: 기본단계(),
    ...덮을것,
  };
}

export function 장치(platform: Platform, historyId: number, 덮을것: Partial<FailureDevice> = {}, 항목덮기: Partial<RunItemDetail> = {}): FailureDevice {
  return {
    platform,
    change: null,
    streak: null,
    recent: ['FAIL', 'PASS', 'PASS'],
    attempts: 1,
    failedAttempts: 1,
    item: 상세(historyId, platform, 항목덮기),
    ...덮을것,
  };
}

export function 케이스(tcId: string, tcName: string, devices: FailureDevice[], 덮을것: Partial<FailureCase> = {}): FailureCase {
  return { tcId, tcName, reqs: [], judgment: null, devices: devices.map((d) => ({ ...d, item: { ...d.item, tcId, tcName } })), ...덮을것 };
}

export function 쪽(items: FailureCase[], 덮을것: Partial<Paged<FailureCase>> = {}): Paged<FailureCase> {
  return { items, total: items.length, page: 1, pageSize: 5, ...덮을것 };
}

export function 줄(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary {
  return {
    historyId,
    tcId,
    tcName: '회원가입',
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: 3200,
    error: null,
    startedAt: '2026-09-21T00:59:00.000Z',
    finishedAt: '2026-09-21T01:00:00.000Z',
    ...덮을것,
  };
}

export function 그리기(
  응답: Paged<FailureCase>,
  items: RunItemSummary[] = [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
  platform: Platform | 'ALL' = 'ALL',
  권한: 판정 = () => true,
) {
  const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(응답);
  const 결과 = render(<RunFailCards runId={RUN_ID} env="qa" items={items} platform={platform} 권한={권한} />);
  return { 부름, ...결과 };
}
