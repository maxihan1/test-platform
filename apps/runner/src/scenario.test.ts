// 러너 시나리오 결과 조립 검사 — 결과 줄 읽기 · 뒷정리 줄 읽기 · 빈 순번 채우기 · 스크린샷 폴더 환경변수 (SPEC 도메인/러너 §5.2 · 도메인/시나리오 §3.7 결정 9)

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { SCENARIO_DEVICE_MARKER } from '@platform/kit/scenario';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { finishScenario, parseCleanup, parseDevice, parseParts, scenarioEnv, trace를옮긴다, 판을파일로, 시나리오project, 폰환경 } from './scenario.js';

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

  it('녹화 요청이 오면 perf-record/<jobId> 폴더를 환경으로 넘기고, 없으면 빈 값이다', () => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'rec-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
    try {
      expect(scenarioEnv({ ...기본, runId: null, trialId: 'x', recordHar: { jobId: 3 } }).PLATFORM_RECORD_HAR_DIR).toBe(join(뿌리, 'perf-record', '3'));
      expect(scenarioEnv(기본).PLATFORM_RECORD_HAR_DIR).toBe('');
    } finally {
      delete process.env.PLATFORM_ARTIFACTS_DIR;
      rmSync(뿌리, { recursive: true, force: true });
    }
  });

  it('조립 목록을 그대로 넘긴다', () => {
    expect(JSON.parse(scenarioEnv(기본).PLATFORM_SCENARIO!)).toEqual(기본.parts);
  });

  it('미룬 삭제 코드를 넘기고, 없으면 빈 목록이다', () => {
    const 코드 = [{ host: 'qa.example.com', path: '/api/me', status: 204 }];
    expect(JSON.parse(scenarioEnv({ ...기본, deleteStatuses: 코드 }).PLATFORM_DELETE_STATUSES!)).toEqual(코드);
    expect(JSON.parse(scenarioEnv(기본).PLATFORM_DELETE_STATUSES!)).toEqual([]);
  });

  describe('천천히', () => {
    const 시험 = { ...기본, runId: null, trialId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b' };

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('창을 띄우는 러너의 시험 실행은 동작마다 늦춘다', () => {
      vi.stubEnv('PLATFORM_HEADED', '1');
      expect(scenarioEnv(시험).PLATFORM_SLOW_MO).toBe('1000');
    });

    it('창을 띄우는 러너라도 진짜 실행은 늦추지 않는다', () => {
      vi.stubEnv('PLATFORM_HEADED', '1');
      expect(scenarioEnv(기본).PLATFORM_SLOW_MO).toBe('');
    });

    it('창이 없는 러너의 시험 실행은 늦추지 않는다 — 볼 사람이 없다', () => {
      vi.stubEnv('PLATFORM_HEADED', '');
      expect(scenarioEnv(시험).PLATFORM_SLOW_MO).toBe('');
    });
  });

  it('진짜 실행 · 시험 실행 다 trace 를 켠다', () => {
    expect(scenarioEnv(기본).PLATFORM_TRACE).toBe('1');
    expect(scenarioEnv({ ...기본, runId: null, trialId: 'x' }).PLATFORM_TRACE).toBe('1');
  });
});

describe('trace를옮긴다', () => {
  let 뿌리 = '';
  const trialId = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
  const 기본: ScenarioExecuteRequest = { runId: 42, platform: 'desktop', baseUrl: 'https://x', parts: [], timeoutMs: 1 };

  const 출력에둔다 = (출력: string) => {
    const 폴더 = join(뿌리, 'playwright', 출력, 'scenario-E2E-시나리오-desktop');
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, 'trace.zip'), 'zip');
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(뿌리, { recursive: true, force: true });
  });

  it('진짜 실행은 runs/<runId>/scenario/ 로, 시험 실행은 runs/trial/<trialId>/ 로 옮긴다', async () => {
    뿌리 = mkdtempSync(join(tmpdir(), 'scenario-trace-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);
    출력에둔다('a');
    출력에둔다('b');

    await trace를옮긴다('a', 기본);
    await trace를옮긴다('b', { ...기본, runId: null, trialId });

    expect(readFileSync(join(뿌리, 'runs', '42', 'scenario', 'trace.zip'), 'utf8')).toBe('zip');
    expect(readFileSync(join(뿌리, 'runs', 'trial', trialId, 'trace.zip'), 'utf8')).toBe('zip');
  });

  it('출력 폴더에 trace 가 없으면 아무것도 안 만든다', async () => {
    뿌리 = mkdtempSync(join(tmpdir(), 'scenario-trace-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);

    await trace를옮긴다('없음', 기본);

    expect(existsSync(join(뿌리, 'runs'))).toBe(false);
  });
});

describe('판을파일로', () => {
  let 폴더: string;
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(폴더, { recursive: true, force: true });
  });

  it('케이스 부품의 판 원문을 trace 옆 파일로 쓰고 부품 줄에는 경로만 싣는다 — 환경값 한 칸에 수 MB 가 안 든다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'runner-scn-doc-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 폴더);
    const doc = { openapi: '3.1.0', paths: {} };
    const req = {
      runId: 9, platform: 'desktop', baseUrl: 'https://x', timeoutMs: 1000,
      parts: [
        { kind: 'case', tcId: 'A-001', filePath: '/t/a.spec.ts', params: {}, expected: {}, skipSteps: [] },
        { kind: 'case', tcId: 'B-001', filePath: '/t/b.spec.ts', params: {}, expected: {}, skipSteps: [], apiDoc: { version: 2, doc } },
      ],
    } as unknown as ScenarioExecuteRequest;

    const { parts, 파일들 } = await 판을파일로(req);

    expect(파일들).toEqual([join(폴더, 'runs', '9', 'scenario', 'api-doc-2.json')]);
    expect(parts[0]).toBe(req.parts[0]);
    expect(parts[1]).toEqual(expect.objectContaining({ tcId: 'B-001', apiDocFile: 파일들[0] }));
    expect(parts[1]).not.toHaveProperty('apiDoc');
    expect(JSON.parse(readFileSync(파일들[0] ?? '', 'utf8'))).toEqual(doc);
    expect(JSON.parse(scenarioEnv(req, parts).PLATFORM_SCENARIO ?? '')[1]).not.toHaveProperty('apiDoc');
  });
});

describe('앱 · 게임 단계가 있는 시나리오', () => {
  const 앱단계 = { kind: 'case' as const, tcId: 'DMA-001', params: {}, expected: {}, skipSteps: [], filePath: '/t/a.spec.ts', appStep: true };
  const 웹만: ScenarioExecuteRequest = {
    runId: 42, platform: 'desktop', baseUrl: 'https://qa.example.com', parts: [{ kind: 'wait', ms: 1 }], timeoutMs: 1_200_001,
    adminKey: { header: 'X-Admin-Key', value: 'k1' },
  };
  const 앱: ScenarioExecuteRequest = { ...웹만, platform: 'android', parts: [앱단계], app: '/apk/dma.apk', udid: 'R58M', engine: 'GAME' };

  it('폰 연결 값을 싣고 연결 유지 시간은 시나리오 제한 시간을 초로 올린 값이다', () => {
    const 이전 = process.env.PLATFORM_APPIUM_TOKEN;
    process.env.PLATFORM_APPIUM_TOKEN = 'farm-token';
    try {
      expect(폰환경(앱)).toEqual({
        PLATFORM_APPIUM_TOKEN: 'farm-token', PLATFORM_APP: '/apk/dma.apk', PLATFORM_DEVICE_UDID: 'R58M',
        PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: '1201', PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'farm', PLATFORM_ADMIN_KEY: '{"header":"X-Admin-Key","value":"k1"}',
      });
      // 앱 단계가 없으면 팜 토큰 · 어드민 키를 안 넘긴다 — 러너를 켠 셸의 값도 덮는다
      expect(폰환경(웹만)).toEqual({
        PLATFORM_APPIUM_TOKEN: undefined, PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: '', PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_ADMIN_KEY: '',
      });
    } finally {
      if (이전 === undefined) delete process.env.PLATFORM_APPIUM_TOKEN;
      else process.env.PLATFORM_APPIUM_TOKEN = 이전;
    }
  });

  it('android 시나리오는 PC 창 project 로 띄운다 — android project 에는 브라우저가 없다', () => {
    expect(시나리오project(앱)).toBe('desktop');
    expect(시나리오project({ platform: 'mobile' })).toBe('mobile');
  });

  it('기기 줄은 맨 앞 표시자만 읽고 잘린 줄은 버린다', () => {
    const 기기 = { model: 'SM-S918N', osVersion: '14', appVersion: '1.2.0', appBuild: '120' };
    expect(parseDevice(`케이스 로그\n${SCENARIO_DEVICE_MARKER}${JSON.stringify(기기)}\n`)).toEqual(기기);
    expect(parseDevice(`${SCENARIO_DEVICE_MARKER}{"model":"SM`)).toBeUndefined();
    expect(parseDevice(`앞글 ${SCENARIO_DEVICE_MARKER}{}`)).toBeUndefined();
  });
});
