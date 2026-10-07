// 러너 실행 로직의 단위 테스트. 판정 규칙과 경로 검증은 자식 프로세스 없이 확인할 수 있어야 한다

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { runDir, type ExecuteRequest } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 앱연결을닫는다 } from './appSession.js';
import { abort, execute, killedResponse, resolveSpecPath, running, statusFromExit } from './execute.js';
import { killTree } from './kill.js';

// playwright 대신 짧은 셸 스크립트를 띄운다. 어느 스크립트인지는 테스트가 정한다
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

describe('statusFromExit', () => {
  it('exit code 0이면 PASS다', () => {
    expect(statusFromExit(0, false)).toBe('PASS');
  });

  it('exit code가 0이 아니면 FAIL이다', () => {
    expect(statusFromExit(1, false)).toBe('FAIL');
  });

  it('타임아웃으로 죽인 경우는 판정 불가라 NA다', () => {
    expect(statusFromExit(null, true)).toBe('NA');
  });
});

describe('killedResponse', () => {
  const 한절차 = { seq: 1, title: '로그인', status: 'PASS', durationMs: 3, assertions: [] };
  const 결과줄 = `@@RESULT@@${JSON.stringify({ status: 'PASS', durationMs: 5, steps: [한절차] })}\n`;

  it('끊긴 실행도 타임아웃과 같은 모양이고 사유만 갈린다', () => {
    const 끊김 = killedResponse(7, 'ABORTED', 12, '');
    const 시간초과 = killedResponse(7, 'TIMEOUT', 12, '');

    expect(끊김.status).toBe('NA');
    expect(시간초과.status).toBe('NA');
    expect(끊김.error?.message).toBe('ABORTED');
    expect(시간초과.error?.message).toBe('TIMEOUT');
  });

  it('죽이기 전까지 나온 절차는 그대로 남긴다', () => {
    expect(killedResponse(7, 'ABORTED', 12, 결과줄).steps).toHaveLength(1);
  });

  it('결과 줄이 없으면 절차는 빈 목록이다', () => {
    expect(killedResponse(7, 'TIMEOUT', 12, '').steps).toEqual([]);
  });

  it('죽이는 바람에 결과 줄이 잘렸으면 빈 목록으로 접고 예외를 밖으로 내보내지 않는다', () => {
    expect(killedResponse(7, 'ABORTED', 12, '@@RESULT@@{"steps":[').steps).toEqual([]);
  });
});

describe('resolveSpecPath', () => {
  it('테스트 루트 안의 경로는 절대 경로로 풀어준다', () => {
    expect(resolveSpecPath('/tests', 'demo/DEMO-001.spec.ts')).toBe('/tests/demo/DEMO-001.spec.ts');
  });

  it('테스트 루트 밖으로 나가는 경로는 거부한다', () => {
    expect(resolveSpecPath('/tests', '../etc/passwd')).toBeNull();
  });

  it('절대 경로로 루트를 갈아치우려는 요청도 거부한다', () => {
    expect(resolveSpecPath('/tests', '/etc/passwd')).toBeNull();
  });
});

describe('execute 가 끝난 뒤 앱 연결을 닫는다', () => {
  const 닫기 = vi.mocked(앱연결을닫는다);

  afterEach(() => {
    for (const { child } of running.values()) killTree(child);
    running.clear();
    닫기.mockReset();
    vi.restoreAllMocks();
  });

  function 요청(platform: ExecuteRequest['platform'], timeoutMs = 10_000): ExecuteRequest {
    return {
      runId: 5,
      historyId: 8,
      tcId: 'AND-001',
      platform,
      filePath: 'a.spec.ts',
      baseUrl: '',
      params: {},
      expected: {},
      timeoutMs,
    };
  }

  // 닫기가 끝나기 전에 응답이 나가면 admin 이 답을 받은 뒤에도 연결이 남는다. 늦게 끝나는 닫기로 순서를 잡는다
  function 늦게_닫히게_한다(): { 닫혔나: () => boolean } {
    let 닫힘 = false;
    닫기.mockImplementation(async () => {
      await new Promise((done) => setTimeout(done, 50));
      닫힘 = true;
    });
    return { 닫혔나: () => 닫힘 };
  }

  it('android 항목이 정상 종료하면 응답 전에 닫는다', async () => {
    스크립트.지금 = 'exit 0';
    const 상태 = 늦게_닫히게_한다();

    await execute(요청('android'), 'a.spec.ts');

    expect(닫기).toHaveBeenCalledWith(5, 8);
    expect(상태.닫혔나()).toBe(true);
  });

  it('android 항목을 abort 로 끊어도 응답 전에 닫는다', async () => {
    스크립트.지금 = 'sleep 30';
    const 상태 = 늦게_닫히게_한다();

    const 응답 = execute(요청('android'), 'a.spec.ts');
    await vi.waitFor(() => expect(running.has(8)).toBe(true));
    abort(8);

    expect((await 응답).error?.message).toBe('ABORTED');
    expect(닫기).toHaveBeenCalledWith(5, 8);
    expect(상태.닫혔나()).toBe(true);
  });

  it('android 항목이 제한 시간에 걸려도 응답 전에 닫는다', async () => {
    스크립트.지금 = 'sleep 30';
    const 상태 = 늦게_닫히게_한다();

    const 응답 = await execute(요청('android', 200), 'a.spec.ts');

    expect(응답.error?.message).toBe('TIMEOUT');
    expect(닫기).toHaveBeenCalledWith(5, 8);
    expect(상태.닫혔나()).toBe(true);
  });

  it('desktop 항목은 닫기를 부르지 않는다', async () => {
    스크립트.지금 = 'exit 0';

    await execute(요청('desktop'), 'a.spec.ts');

    expect(닫기).not.toHaveBeenCalled();
  });

  it('상대 경로 환경값도 자식에게는 러너 cwd 기준 절대 경로로 넘긴다', async () => {
    const 임시 = mkdtempSync(join(tmpdir(), 'exec-env-'));
    const 기록 = join(임시, 'env.txt');
    const 원래 = process.env.PLATFORM_ARTIFACTS_DIR;
    process.env.PLATFORM_ARTIFACTS_DIR = './artifacts';
    스크립트.지금 = `printf %s "$PLATFORM_ARTIFACTS_DIR" > '${기록}'`;
    try {
      await execute(요청('desktop'), 'a.spec.ts');

      const 자식값 = readFileSync(기록, 'utf8');
      expect(자식값).toBe(resolve('./artifacts'));
      expect(runDir('5', '8').startsWith(`${자식값}/`)).toBe(true);
    } finally {
      if (원래 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
      else process.env.PLATFORM_ARTIFACTS_DIR = 원래;
      rmSync(임시, { recursive: true, force: true });
    }
  });
});
