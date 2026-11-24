// 프로시저 실행 단위를 dispatcher 가 요청 하나로 보내고 한 번에 저장하는지 본다 (SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 · 도메인/러너 §5.2 「프로시저 실행」)

import http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatch } from './dispatcher.js';
import { finishExec, 실행단위를시작한다 } from './execFinish.js';
import { 단위로묶는다, 도는동안늘린다 } from './execUnit.js';
import { callRunner } from './runner.js';
import { 러너답 } from './runnerFixture.js';
import { finishItem, type PendingItem } from './store.js';
import { trace적재를맡긴다 } from './traceIngest.js';

vi.mock('./runner.js', async (원본) => ({ ...(await 원본<typeof import('./runner.js')>()), callRunner: vi.fn() }));
vi.mock('./execFinish.js', () => ({ finishExec: vi.fn(async () => undefined), 실행단위를시작한다: vi.fn(async () => undefined) }));
vi.mock('./store.js', () => ({ finishItem: vi.fn(async () => undefined), finishRun: vi.fn(async () => undefined) }));
vi.mock('./notify.js', () => ({ notifyRun: vi.fn(async () => undefined) }));
vi.mock('./traceIngest.js', () => ({ trace적재를맡긴다: vi.fn(async () => undefined) }));
vi.mock('../apidoc/runCompare.js', () => ({ 실행문서견주기: vi.fn(async () => undefined) }));
vi.mock('./farmToken.js', () => ({ 실행팜토큰: vi.fn(async () => undefined) }));
vi.mock('./prep.js', () => ({
  준비를끊는다: vi.fn(),
  준비실패로닫는다: vi.fn(async () => true),
  준비하고돌린다: vi.fn(async (_runId: number, _멈췄나: () => boolean, 돌리기: () => Promise<void>) => {
    await 돌리기();
    return { 결과: '돎' };
  }),
}));

const 프로시저 = 'XDP-TP-001';
const 케이스 = (historyId: number, tcId: string, 더?: Partial<PendingItem>): PendingItem => ({
  historyId,
  execId: 50,
  procId: 프로시저,
  tcId,
  platform: 'android',
  filePath: 'xdp/XDP-TP-001.spec.ts',
  baseUrl: 'http://x',
  params: { 본문: tcId },
  expected: {},
  timeoutMs: 300_000,
  ...더,
});
const 셋 = (): PendingItem[] => [케이스(51, 'XDP-FN-101'), 케이스(52, 'XDP-FN-102'), 케이스(53, 'XDP-FN-103')];

// 가짜 러너 — 프로시저 요청만 온다(옛 꼴은 callRunner 를 흉내 낸다)
const 러너 = vi.fn<(요청: ExecuteRequest) => Promise<ExecuteResponse>>();
const 러너서버 = http.createServer((req, res) => {
  if (req.method !== 'POST') return void res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
  const 조각: Buffer[] = [];
  req.on('data', (c: Buffer) => 조각.push(c));
  req.on('end', () => {
    void 러너(JSON.parse(Buffer.concat(조각).toString('utf8')) as ExecuteRequest).then((답) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(답)));
  });
});
const 옛주소 = process.env.RUNNER_URL;
beforeAll(async () => {
  await new Promise<void>((ok) => 러너서버.listen(0, '127.0.0.1', ok));
  process.env.RUNNER_URL = `http://127.0.0.1:${String((러너서버.address() as AddressInfo).port)}`;
});
afterAll(async () => {
  if (옛주소 === undefined) delete process.env.RUNNER_URL;
  else process.env.RUNNER_URL = 옛주소;
  await new Promise((ok) => 러너서버.close(ok));
});

describe('단위로묶는다', () => {
  it('같은 실행 단위 번호의 케이스 줄을 도는 차례대로 한 묶음으로 만들고 옛 꼴 케이스는 줄 하나짜리 묶음이다', () => {
    const 옛 = 케이스(9, 'XDP-FN-201', { execId: 9 });
    delete 옛.procId;
    const 단위들 = 단위로묶는다([...셋(), 옛]);
    expect(단위들.map((u) => [u.execId, u.procId, u.케이스들.map((c) => c.tcId)])).toEqual([
      [50, 프로시저, ['XDP-FN-101', 'XDP-FN-102', 'XDP-FN-103']],
      [9, undefined, ['XDP-FN-201']],
    ]);
  });
});

describe('dispatch 의 프로시저 실행 단위', () => {
  const 팜 = 'http://farm.test';
  const 받음: string[] = [];

  function 가짜팜(기기들: unknown[]): void {
    vi.stubGlobal('fetch', async (주소: string | URL | Request, 설정?: RequestInit) => {
      받음.push(`${설정?.method ?? 'GET'} ${String(주소).replace(팜, '')}${설정?.body ? ` ${String(설정.body)}` : ''}`);
      return new Response(JSON.stringify({ value: { devices: 기기들 }, held: {}, released: true }), { status: 200 });
    });
  }

  beforeEach(() => {
    process.env.DEVICE_FARM_URL = 팜;
    러너.mockImplementation(async (요청) => 러너답(요청));
  });

  afterEach(() => {
    러너.mockReset();
    vi.mocked(finishExec).mockReset().mockResolvedValue(undefined);
    vi.mocked(실행단위를시작한다).mockClear();
    vi.mocked(finishItem).mockClear();
    vi.mocked(trace적재를맡긴다).mockClear();
    vi.unstubAllGlobals();
    delete process.env.DEVICE_FARM_URL;
    받음.length = 0;
  });

  it('케이스 줄 셋을 요청 하나로 보내고 답을 실행 단위 하나로 저장한다 — 폰은 한 번 잡는다', async () => {
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);

    await dispatch(9301, 셋());

    expect(callRunner).not.toHaveBeenCalled();
    expect(러너).toHaveBeenCalledTimes(1);
    const 요청 = 러너.mock.calls[0]![0];
    expect(요청).toMatchObject({
      runId: 9301,
      historyId: 50,
      procId: 프로시저,
      platform: 'android',
      filePath: 'xdp/XDP-TP-001.spec.ts',
      udid: 'R3CR10TCVCD',
      // 러너 한도는 케이스 줄 한도의 합이다
      timeoutMs: 900_000,
      cases: [
        { tcId: 'XDP-FN-101', params: { 본문: 'XDP-FN-101' }, expected: {} },
        { tcId: 'XDP-FN-102', params: { 본문: 'XDP-FN-102' }, expected: {} },
        { tcId: 'XDP-FN-103', params: { 본문: 'XDP-FN-103' }, expected: {} },
      ],
    });
    // 15분짜리 실행 단위는 30분을 잡는다
    expect(받음.filter((줄) => 줄.includes('/hold'))).toEqual(['POST /api/devices/R3CR10TCVCD/hold {"minutes":30}', 'DELETE /api/devices/R3CR10TCVCD/hold']);
    expect(실행단위를시작한다).toHaveBeenCalledWith(50);
    expect(vi.mocked(finishExec).mock.calls.map(([번호, 받은답]) => [번호, 받은답.results.map((r) => r.status)])).toEqual([[50, ['PASS', 'PASS', 'PASS']]]);
    expect(finishItem).not.toHaveBeenCalled();
    expect(vi.mocked(trace적재를맡긴다).mock.calls.map(([번호]) => 번호)).toEqual([51, 52, 53]);
  });

  it('케이스가 일곱이면 러너 한도가 35분이라 폰을 60분 잡는다', async () => {
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);

    await dispatch(9302, Array.from({ length: 7 }, (_, k) => 케이스(60 + k, `XDP-FN-11${String(k)}`)));

    expect(받음.filter((줄) => 줄.endsWith('/hold {"minutes":60}'))).toHaveLength(1);
  });

  it('폰을 못 잡으면 러너에 안 보내고 케이스 줄마다 그 까닭의 미실행으로 한 번에 닫는다', async () => {
    가짜팜([]);

    await dispatch(9303, 셋());

    expect(러너).not.toHaveBeenCalled();
    const [번호, 받은답] = vi.mocked(finishExec).mock.calls[0]!;
    expect(번호).toBe(50);
    expect(받은답.results.map((r) => [r.tcId, r.status, r.error?.message])).toEqual([
      ['XDP-FN-101', 'NA', 'Device VISION 에 빈 폰이 없습니다'],
      ['XDP-FN-102', 'NA', 'Device VISION 에 빈 폰이 없습니다'],
      ['XDP-FN-103', 'NA', 'Device VISION 에 빈 폰이 없습니다'],
    ]);
    expect(받은답.error?.message).toBe('Device VISION 에 빈 폰이 없습니다');
  });

  it('저장이 깨지면 그 실행 단위의 케이스 줄을 미실행으로 닫아 실행이 RUNNING 에 남지 않게 한다', async () => {
    const 로그 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);
    vi.mocked(finishExec).mockRejectedValueOnce(new Error('unsupported Unicode escape sequence'));

    await dispatch(9304, 셋());
    로그.mockRestore();

    expect(vi.mocked(finishExec).mock.calls.map(([번호, 받은답]) => [번호, 받은답.results.map((r) => r.status), 받은답.error])).toEqual([
      [50, ['PASS', 'PASS', 'PASS'], undefined],
      [50, ['NA', 'NA', 'NA'], { message: '결과를 저장하지 못했습니다', stack: 'unsupported Unicode escape sequence' }],
    ]);
  });

  it('같은 프로시저의 실행 단위(반복 회차)는 앞 것이 끝난 뒤에 간다', async () => {
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);
    let 첫회차를끝낸다 = (): void => undefined;
    const 시작: number[] = [];
    러너.mockImplementation(async (요청) => {
      시작.push(요청.historyId);
      if (요청.historyId === 50) await new Promise<void>((done) => { 첫회차를끝낸다 = done; });
      return 러너답(요청);
    });

    const 끝 = dispatch(9306, [케이스(51, 'XDP-FN-101'), 케이스(52, 'XDP-FN-102'), 케이스(61, 'XDP-FN-101', { execId: 60 }), 케이스(62, 'XDP-FN-102', { execId: 60 })]);
    await vi.waitFor(() => expect(시작).toEqual([50]));
    첫회차를끝낸다();
    await 끝;

    expect(시작).toEqual([50, 60]);
  });

  it('옛 꼴 케이스와 섞인 실행은 옛 꼴은 케이스 줄 하나로, 프로시저는 실행 단위 하나로 저장한다', async () => {
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => ({ historyId: item.historyId, status: 'PASS', durationMs: 1, steps: [] }));
    const 옛 = 케이스(9, 'XDP-FN-201', { execId: 9, platform: 'desktop' });
    delete 옛.procId;

    await dispatch(9305, [...셋(), 옛]);
    vi.mocked(callRunner).mockReset();

    expect(vi.mocked(finishItem).mock.calls.map(([번호]) => 번호)).toEqual([9]);
    expect(vi.mocked(finishExec).mock.calls.map(([번호]) => 번호)).toEqual([50]);
  });
});

describe('도는동안늘린다', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('프로시저가 도는 동안 5분마다 늘리기를 부르고 끝나면 멈춘다', async () => {
    vi.useFakeTimers();
    const 늘린다 = vi.fn(async () => undefined);
    let 끝낸다 = (): void => undefined;
    const 일 = 도는동안늘린다({ execId: 50, procId: 프로시저, 케이스들: 셋() }, 늘린다, () => new Promise<void>((done) => { 끝낸다 = done; }));

    await vi.advanceTimersByTimeAsync(11 * 60_000);
    expect(늘린다).toHaveBeenCalledTimes(2);

    끝낸다();
    await 일;
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(늘린다).toHaveBeenCalledTimes(2);
  });

  it('옛 꼴 케이스는 도는 동안 늘리지 않는다 — 보내기 전 한 번이면 된다', async () => {
    vi.useFakeTimers();
    const 늘린다 = vi.fn(async () => undefined);
    let 끝낸다 = (): void => undefined;
    const 옛 = 케이스(9, 'XDP-FN-201', { execId: 9 });
    delete 옛.procId;
    const 일 = 도는동안늘린다({ execId: 9, 케이스들: [옛] }, 늘린다, () => new Promise<void>((done) => { 끝낸다 = done; }));

    await vi.advanceTimersByTimeAsync(11 * 60_000);
    끝낸다();
    await 일;
    expect(늘린다).not.toHaveBeenCalled();
  });
});
