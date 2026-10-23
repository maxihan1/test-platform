// 녹화 실행 한 바퀴 — 러너 · DB 를 가짜로 두고 가린 녹화 한 파일 · 원본 폴더 지우기 · 실패 닫기를 본다

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const 가짜 = vi.hoisted(() => ({
  러너에보낸다: vi.fn(),
  callScenarioRunner: vi.fn(),
  녹화끝: vi.fn(),
  시험재료: vi.fn(),
}));

vi.mock('../execution/runner.js', () => ({ 러너에보낸다: 가짜.러너에보낸다, callScenarioRunner: 가짜.callScenarioRunner, httpTimeoutMs: (ms: number) => ms }));
vi.mock('../execution/dispatcher.js', () => ({ enqueue: <T>(일: () => Promise<T>) => 일() }));
vi.mock('../execution/savedInput.js', () => ({
  저장값을채운다: vi.fn(async () => [{ params: { password: 'pw-secret!' }, expected: {} }]),
}));
vi.mock('../execution/trial.js', () => ({ 비밀글자들: () => ['pw-secret!'] }));
vi.mock('../apidoc/caseDoc.js', () => ({ 케이스판: async () => ({}) }));
vi.mock('../scenario/trial.js', () => ({ 시험재료: 가짜.시험재료 }));
vi.mock('../scenario/apps.js', () => ({ 삭제코드합치기: async () => [] }));
vi.mock('./store.js', () => ({ 풀: async () => ({ connect: async () => ({ release: () => undefined }) }) }));
vi.mock('./ai.js', () => ({ 녹화끝: 가짜.녹화끝, 녹화중: new Set<number>() }));

const { 녹화하기 } = await import('./record.js');

const 로그인HAR = {
  log: {
    entries: [
      {
        startedDateTime: '2026-10-21T00:00:00.000Z', time: 50,
        request: { method: 'POST', url: 'http://shop.test/api/login', headers: [], postData: { text: JSON.stringify({ id: 'tester01', password: 'pw-secret!' }) } },
        response: { status: 200, headers: [], content: { mimeType: 'application/json', text: JSON.stringify({ accessToken: 'tok-abcdef123456' }) } },
      },
      {
        startedDateTime: '2026-10-21T00:00:01.000Z', time: 10,
        request: { method: 'GET', url: 'http://shop.test/logo.png', headers: [] },
        response: { status: 200, headers: [], content: { mimeType: 'image/png', text: 'iVBOR'.repeat(100), encoding: 'base64' } },
      },
    ],
  },
};

const 줄 = { env: 'qa', baseUrl: 'http://shop.test', loginId: 'tester01', loginPassword: 'pw-secret!', isProd: false, 계정들: [], appPath: null, apiAuths: [], adminKey: null };
const 케이스 = { 케이스: [{ tcId: 'XRD-001', platform: 'desktop' as const, filePath: 'tests/xrd/a.spec.ts', paramSchema: {}, expectedSchema: {} }] };
const 재료 = { cases: ['로그인'], baseUrl: 'http://shop.test', apiHosts: [] };

describe('녹화하기', () => {
  let 뿌리 = '';
  const 원래 = process.env.PLATFORM_ARTIFACTS_DIR;

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xrd-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
  });
  afterAll(async () => {
    process.env.PLATFORM_ARTIFACTS_DIR = 원래;
    await rm(뿌리, { recursive: true, force: true });
  });
  beforeEach(() => vi.clearAllMocks());

  // 러너가 하는 일 — 녹화 폴더에 차례 번호로 HAR 를 쓴다
  const 러너가쓴다 = (jobId: number, 답: unknown) => async () => {
    await writeFile(join(뿌리, 'perf-record', String(jobId), '1.har'), JSON.stringify(로그인HAR));
    return 답;
  };

  it('가린 녹화를 한 파일로 남기고 원본 폴더를 지운 뒤 AI 재료로 일을 세운다', async () => {
    가짜.러너에보낸다.mockImplementation(러너가쓴다(11, { status: 200, json: { status: 'FAIL' } }));
    await 녹화하기(11, 줄, 케이스, 재료);

    expect(가짜.러너에보낸다.mock.calls[0]?.[1]).toMatchObject({ runId: 0, tcId: 'XRD-001', baseUrl: 'http://shop.test', recordHar: { jobId: 11 } });
    expect(existsSync(join(뿌리, 'perf-record', '11'))).toBe(false);
    const 남은 = await readFile(join(뿌리, 'perf-record', '11.har'), 'utf8');
    expect(남은).not.toContain('pw-secret!');
    expect(남은).not.toContain('tok-abcdef123456');
    expect(남은).not.toContain('iVBOR');
    const [번호, 결과] = 가짜.녹화끝.mock.calls[0] as [number, { input: { entries: { reqBody?: string }[]; total: number; staticExcluded: number; recording: string } }];
    expect(번호).toBe(11);
    expect(결과.input).toMatchObject({ total: 2, staticExcluded: 1, recording: '11.har', cases: ['로그인'] });
    expect(결과.input.entries[0]?.reqBody).toBe(JSON.stringify({ id: '${username}', password: '${password}' }));
  });

  it('판정을 못 낸 케이스는 반쪽 녹화라 일을 실패로 닫고 원본 폴더도 지운다', async () => {
    가짜.러너에보낸다.mockImplementation(러너가쓴다(12, { status: 200, json: { status: 'NA' } }));
    await 녹화하기(12, 줄, 케이스, 재료);
    expect(가짜.녹화끝).toHaveBeenCalledWith(12, { error: expect.stringContaining('끝까지 돌리지 못했습니다') });
    expect(existsSync(join(뿌리, 'perf-record', '12'))).toBe(false);
    expect(existsSync(join(뿌리, 'perf-record', '12.har'))).toBe(false);
  });

  it('E2E 를 러너가 NA 로 접으면 러너가 준 까닭을 남긴다', async () => {
    가짜.시험재료.mockResolvedValue({ 앱들: new Map(), baseUrl: 'http://shop.test', parts: [], 비밀: [] });
    가짜.callScenarioRunner.mockResolvedValue({ status: 'NA', error: { message: '러너가 400 으로 거절했다' }, parts: [] });
    await 녹화하기(13, 줄, { 시나리오: { service: 'XRD', platform: 'desktop', parts: [] } }, 재료);
    expect(가짜.callScenarioRunner.mock.calls[0]?.[0]).toMatchObject({ runId: null, recordHar: { jobId: 13 } });
    expect(가짜.녹화끝).toHaveBeenCalledWith(13, { error: expect.stringContaining('러너가 400 으로 거절했다') });
  });
});
