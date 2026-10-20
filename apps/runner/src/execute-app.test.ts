// 요청이 실은 앱 파일 경로가 러너 환경값 PLATFORM_APP 보다 앞서 자식에게 가는지 본다 (러너 §5.2 「앱 실행」 · APP-F1-03)

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ExecuteRequest } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { execute } from './execute.js';

// playwright 대신 받은 환경값을 파일에 적는 셸을 띄운다 (execute.test.ts 와 같은 방식)
const 스크립트 = vi.hoisted(() => ({ 지금: 'exit 0' }));

vi.mock('node:child_process', async (원본) => {
  const 실제 = await 원본<typeof import('node:child_process')>();
  return {
    ...실제,
    spawn: (_cmd: string, _args: readonly string[], opts: import('node:child_process').SpawnOptions) =>
      실제.spawn('sh', ['-c', 스크립트.지금], opts),
  };
});

vi.mock('./appSession.js', () => ({ 앱연결을닫는다: vi.fn() }));

describe('execute 가 자식에게 넘기는 앱 파일', () => {
  let 폴더: string;
  let 옛값: string | undefined;

  beforeEach(() => {
    폴더 = mkdtempSync(join(tmpdir(), 'runner-app-'));
    옛값 = process.env.PLATFORM_APP;
    process.env.PLATFORM_APP = '/runner/env.apk';
    스크립트.지금 = `printf %s "$PLATFORM_APP" > '${join(폴더, 'app.txt')}'`;
  });

  afterEach(() => {
    if (옛값 === undefined) delete process.env.PLATFORM_APP;
    else process.env.PLATFORM_APP = 옛값;
    rmSync(폴더, { recursive: true, force: true });
  });

  const 요청 = (app?: string): ExecuteRequest => ({
    runId: 5,
    historyId: 9,
    tcId: 'AND-001',
    platform: 'android',
    filePath: 'a.spec.ts',
    baseUrl: '',
    params: {},
    expected: {},
    timeoutMs: 10_000,
    ...(app !== undefined && { app }),
  });
  const 받은앱 = () => readFileSync(join(폴더, 'app.txt'), 'utf8');

  it('요청이 실으면 그 경로가 러너 환경값보다 앞선다', async () => {
    await execute(요청('/apk/qa.apk'), 'a.spec.ts');
    expect(받은앱()).toBe('/apk/qa.apk');
  });

  it('브라우저 항목은 요청이 실어도 덮지 않는다', async () => {
    await execute({ ...요청('/apk/qa.apk'), platform: 'desktop' }, 'a.spec.ts');
    expect(받은앱()).toBe('/runner/env.apk');
  });

  it('요청에 없으면 러너를 켤 때 준 PLATFORM_APP 그대로다', async () => {
    await execute(요청(), 'a.spec.ts');
    expect(받은앱()).toBe('/runner/env.apk');
  });
});

describe('execute 가 자식에게 넘기는 폰 번호 (APP-F1-10)', () => {
  let 폴더: string;
  let 옛값: string | undefined;

  beforeEach(() => {
    폴더 = mkdtempSync(join(tmpdir(), 'runner-udid-'));
    옛값 = process.env.PLATFORM_DEVICE_UDID;
    process.env.PLATFORM_DEVICE_UDID = 'ENV-PHONE';
    스크립트.지금 = `printf %s "$PLATFORM_DEVICE_UDID" > '${join(폴더, 'udid.txt')}'`;
  });

  afterEach(() => {
    if (옛값 === undefined) delete process.env.PLATFORM_DEVICE_UDID;
    else process.env.PLATFORM_DEVICE_UDID = 옛값;
    rmSync(폴더, { recursive: true, force: true });
  });

  const 요청 = (platform: ExecuteRequest['platform'], udid?: string): ExecuteRequest => ({
    runId: 5, historyId: 11, tcId: 'AND-001', platform, filePath: 'a.spec.ts', baseUrl: '', params: {}, expected: {}, timeoutMs: 10_000,
    ...(udid !== undefined && { udid }),
  });
  const 받은폰 = () => readFileSync(join(폴더, 'udid.txt'), 'utf8');

  it('admin 이 팜에서 잡은 폰이 러너 환경값보다 앞선다', async () => {
    await execute(요청('android', 'R3CR10TCVCD'), 'a.spec.ts');
    expect(받은폰()).toBe('R3CR10TCVCD');
  });

  it('요청에 없거나 브라우저 항목이면 러너 환경값 그대로다', async () => {
    await execute(요청('android'), 'a.spec.ts');
    expect(받은폰()).toBe('ENV-PHONE');
    await execute(요청('desktop', 'R3CR10TCVCD'), 'a.spec.ts');
    expect(받은폰()).toBe('ENV-PHONE');
  });
});

describe('execute 가 결과 줄의 기기 정보를 응답에 넘긴다 (APP-F1-05)', () => {
  it('device 를 그대로 싣는다', async () => {
    const 기기 = { model: 'SM-G996N', osVersion: '14', appVersion: '1.4.2' };
    const 줄 = `@@RESULT@@${JSON.stringify({ status: 'PASS', durationMs: 5, steps: [], device: 기기 })}`;
    스크립트.지금 = `printf '%s\\n' '${줄}'`;
    const 응답 = await execute(
      { runId: 5, historyId: 10, tcId: 'AND-001', platform: 'android', filePath: 'a.spec.ts', baseUrl: '', params: {}, expected: {}, timeoutMs: 10_000 },
      'a.spec.ts',
    );
    expect(응답.device).toEqual(기기);
  });
});
