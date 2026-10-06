// 러너 시나리오 결과 조립 검사 — 결과 줄 읽기 · 뒷정리 줄 읽기 · 빈 순번 채우기 · 스크린샷 폴더 환경변수 (SPEC 도메인/러너 §5.2 · 도메인/시나리오 §3.7 결정 9)

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { finishScenario, parseCleanup, parseParts, scenarioEnv } from './scenario.js';

const 줄 = (p: Partial<ScenarioPartResult> & { seq: number }): ScenarioPartResult => ({
  status: 'PASS', durationMs: 1, steps: [], mocks: [], ...p,
});
const 흘림 = (p: ScenarioPartResult) => `@@SCENARIO_PART@@${JSON.stringify(p)}\n`;
const 삭제 = (fromSeq: number): ScenarioCleanup => ({ fromSeq, method: 'DELETE', url: `https://x/api/${fromSeq}`, status: 200 });
const 뒷정리 = (list: ScenarioCleanup[]) => `@@SCENARIO_CLEANUP@@${JSON.stringify(list)}\n`;

describe('parseParts', () => {
  it('부품 결과 줄만 읽고 진행 줄·다른 출력은 버린다', () => {
    const stdout = `@@PROGRESS@@{"historyId":null,"seq":1,"title":"가"}\n아무 말\n${흘림(줄({ seq: 1 }))}`;

    expect(parseParts(stdout)).toEqual([줄({ seq: 1 })]);
  });

  it('순번이 제 차례인 줄만 받는다 — 케이스가 뒷 순번 줄을 찍어도 돌지 않은 부품이 PASS 로 안 된다', () => {
    const stdout = [줄({ seq: 1 }), 줄({ seq: 3 }), 줄({ seq: 2 })].map(흘림).join('');

    expect(parseParts(stdout).map((p) => p.seq)).toEqual([1, 2]);
  });

  it('지금 순번과 같은 줄은 갈아 끼운다 — 진짜 줄은 케이스가 끝난 뒤에 온다', () => {
    const stdout = [줄({ seq: 1, status: 'PASS' }), 줄({ seq: 1, status: 'FAIL' })].map(흘림).join('');

    expect(parseParts(stdout)).toEqual([줄({ seq: 1, status: 'FAIL' })]);
  });

  it('실패한 부품 뒤의 줄은 버린다', () => {
    const stdout = [줄({ seq: 1, status: 'FAIL' }), 줄({ seq: 2 })].map(흘림).join('');

    expect(parseParts(stdout).map((p) => p.seq)).toEqual([1]);
  });

  it('표시자는 줄 맨 앞에서만 읽는다 — 대상 화면 본문을 찍은 줄에 섞여도 안 받는다', () => {
    expect(parseParts(`화면: ${흘림(줄({ seq: 1 }))}`)).toEqual([]);
  });

  it('잘린 마지막 줄은 버리고 앞 부품은 살린다', () => {
    const stdout = `${흘림(줄({ seq: 1 }))}@@SCENARIO_PART@@{"seq":2,"sta`;

    expect(parseParts(stdout).map((p) => p.seq)).toEqual([1]);
  });
});

describe('parseCleanup', () => {
  it('뒷정리 줄을 읽고 부품 줄 · 다른 출력은 버린다', () => {
    const stdout = `${흘림(줄({ seq: 1 }))}아무 말\n${뒷정리([삭제(1)])}`;

    expect(parseCleanup(stdout)).toEqual([삭제(1)]);
  });

  it('여러 줄이면 마지막 것을 읽는다', () => {
    expect(parseCleanup(뒷정리([삭제(1)]) + 뒷정리([삭제(2), 삭제(1)]))).toEqual([삭제(2), 삭제(1)]);
  });

  it('표시자는 줄 맨 앞에서만 읽는다', () => {
    expect(parseCleanup(`화면: ${뒷정리([삭제(1)])}`)).toBeUndefined();
  });

  it('잘린 줄은 버린다', () => {
    expect(parseCleanup(`${뒷정리([삭제(1)])}@@SCENARIO_CLEANUP@@[{"fromSeq":2,"me`)).toEqual([삭제(1)]);
    expect(parseCleanup('@@SCENARIO_CLEANUP@@[{"fromSeq":2,"me')).toBeUndefined();
  });

  it('뒷정리 줄이 없으면 undefined 다', () => {
    expect(parseCleanup(흘림(줄({ seq: 1 })))).toBeUndefined();
  });
});

describe('finishScenario 뒷정리', () => {
  it('안 죽였으면 받은 뒷정리를 싣는다 — 빈 목록도 싣는다', () => {
    expect(finishScenario([줄({ seq: 1 })], 1, false, 10, '', [삭제(1)]).cleanup).toEqual([삭제(1)]);
    expect(finishScenario([줄({ seq: 1 })], 1, false, 10, '', [])).toHaveProperty('cleanup', []);
  });

  it('제한 시간에 죽였으면 싣지 않는다', () => {
    expect(finishScenario([줄({ seq: 1 })], 2, true, 10, '', [삭제(1)])).not.toHaveProperty('cleanup');
  });

  it('뒷정리 줄이 없었으면 칸이 없다', () => {
    expect(finishScenario([줄({ seq: 1 })], 1, false, 10, '', undefined)).not.toHaveProperty('cleanup');
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
