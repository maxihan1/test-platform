// 러너 시나리오 결과 조립 검사 — 결과 줄 읽기 · 빈 순번 채우기 · 스크린샷 폴더 환경변수 (SPEC 도메인/러너 §5.2 · 도메인/시나리오 §3.7 결정 9)

import type { ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { finishScenario, parseParts, scenarioEnv } from './scenario.js';

const 줄 = (p: Partial<ScenarioPartResult> & { seq: number }): ScenarioPartResult => ({
  status: 'PASS', durationMs: 1, steps: [], mocks: [], ...p,
});
const 흘림 = (p: ScenarioPartResult) => `@@SCENARIO_PART@@${JSON.stringify(p)}\n`;

describe('parseParts', () => {
  it('부품 결과 줄만 읽고 진행 줄·다른 출력은 버린다', () => {
    const stdout = `@@PROGRESS@@{"historyId":null,"seq":1,"title":"가"}\n아무 말\n${흘림(줄({ seq: 1 }))}`;

    expect(parseParts(stdout)).toEqual([줄({ seq: 1 })]);
  });

  it('잘린 마지막 줄은 버리고 앞 부품은 살린다', () => {
    const stdout = `${흘림(줄({ seq: 1 }))}@@SCENARIO_PART@@{"seq":2,"sta`;

    expect(parseParts(stdout).map((p) => p.seq)).toEqual([1]);
  });
});

describe('finishScenario', () => {
  it('전부 PASS 일 때만 PASS 다', () => {
    const 결과 = finishScenario([줄({ seq: 1 }), 줄({ seq: 2 })], 2, false, 10, '');

    expect(결과).toEqual({ status: 'PASS', durationMs: 10, parts: [줄({ seq: 1 }), 줄({ seq: 2 })] });
  });

  it('실패한 부품 뒤는 NA + NOT_RUN 으로 채운다', () => {
    const 결과 = finishScenario([줄({ seq: 1, status: 'FAIL' })], 3, false, 10, '');

    expect(결과.status).toBe('FAIL');
    expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([
      [1, 'FAIL', undefined], [2, 'NA', 'NOT_RUN'], [3, 'NA', 'NOT_RUN'],
    ]);
    expect(결과.error).toBeUndefined();
  });

  it('제한 시간에 죽였으면 안 끝난 부품은 TIMEOUT 이고 전체는 NA 다', () => {
    const 결과 = finishScenario([줄({ seq: 1 })], 3, true, 10, '');

    expect(결과).toMatchObject({ status: 'NA', error: { message: 'TIMEOUT' } });
    expect(결과.parts.map((p) => [p.status, p.error?.message])).toEqual([
      ['PASS', undefined], ['NA', 'TIMEOUT'], ['NA', 'TIMEOUT'],
    ]);
  });

  it('제한 시간에 죽였어도 앞 부품 실패로 멈춘 뒤는 NOT_RUN 이다', () => {
    const 결과 = finishScenario([줄({ seq: 1, status: 'FAIL' })], 2, true, 10, '');

    expect(결과.parts[1]!.error?.message).toBe('NOT_RUN');
  });

  it('안 죽였는데 줄 없이 끝나면 첫 빈 부품을 실패로 두고 오류 꼬리를 싣는다 — 「안 돌았음」으로 두지 않는다', () => {
    const 결과 = finishScenario([줄({ seq: 1 })], 3, false, 10, 'Error: Cannot find module');

    expect(결과).toMatchObject({ status: 'FAIL', error: { message: 'Error: Cannot find module' } });
    expect(결과.parts.map((p) => [p.status, p.error?.message])).toEqual([
      ['PASS', undefined], ['FAIL', 'Error: Cannot find module'], ['NA', 'NOT_RUN'],
    ]);
  });
});

describe('scenarioEnv', () => {
  const 기본: ScenarioExecuteRequest = {
    runId: 42, platform: 'desktop', baseUrl: 'https://qa.example.com', parts: [{ kind: 'wait', ms: 1 }], timeoutMs: 1000,
  };

  it('실제 실행은 runs/<runId>/scenario/ 에 사진을 쌓는다', () => {
    expect(scenarioEnv(기본)).toMatchObject({
      PLATFORM_SCENARIO_MODE: '1', PLATFORM_RUN_ID: '42', PLATFORM_HISTORY_ID: 'scenario', PLATFORM_BASE_URL: 'https://qa.example.com',
    });
  });

  it('시험 실행은 runs/trial/<trialId>/ 에 쌓는다', () => {
    const trialId = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
    expect(scenarioEnv({ ...기본, runId: null, trialId })).toMatchObject({ PLATFORM_RUN_ID: 'trial', PLATFORM_HISTORY_ID: trialId });
  });

  it('조립 목록을 그대로 넘긴다', () => {
    expect(JSON.parse(scenarioEnv(기본).PLATFORM_SCENARIO!)).toEqual(기본.parts);
  });
});
