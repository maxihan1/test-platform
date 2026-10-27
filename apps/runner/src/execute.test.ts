// 러너 실행 로직의 단위 테스트. 판정 규칙과 경로 검증은 자식 프로세스 없이 확인할 수 있어야 한다

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { runDir, type ExecuteRequest } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 앱연결을닫는다 } from './appSession.js';
import { abort, execute, gameEnv, killedResponse, resolveSpecPath, running, statusFromExit, tail, traceEnv } from './execute.js';
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

describe('traceEnv', () => {
  it('정식 실행의 브라우저 항목만 trace 를 켠다', () => {
    expect(traceEnv({ runId: 5, platform: 'desktop' })).toBe('1');
    expect(traceEnv({ runId: 5, platform: 'mobile' })).toBe('1');
  });

  it('테스트 실행(runId 0)과 앱 실행은 끈다', () => {
    expect(traceEnv({ runId: 0, platform: 'desktop' })).toBe('0');
    expect(traceEnv({ runId: 5, platform: 'android' })).toBe('0');
  });
});

describe('gameEnv', () => {
  it('게임 android 항목은 폰 번호가 있으면 디바이스 팜, 없으면 USB 로 간다', () => {
    expect(gameEnv({ platform: 'android', engine: 'GAME', udid: 'R3CR' })).toMatchObject({ PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'farm' });
    expect(gameEnv({ platform: 'android', engine: 'GAME' })).toMatchObject({ PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'usb' });
  });

  it('게임이 아니면 셋 다 빈 값으로 늘 적는다 — 러너를 켠 셸의 값을 물려받지 않게', () => {
    expect(gameEnv({ platform: 'android', udid: 'R3CR' })).toEqual({ PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_ADMIN_KEY: '' });
    expect(gameEnv({ platform: 'desktop', engine: 'GAME' }).PLATFORM_ENGINE).toBe('');
  });

  it('어드민 키는 JSON 으로 넘긴다', () => {
    const env = gameEnv({ platform: 'android', engine: 'GAME', adminKey: { header: 'X-Admin-Key', value: 'k' } });
    expect(JSON.parse(env.PLATFORM_ADMIN_KEY!)).toEqual({ header: 'X-Admin-Key', value: 'k' });
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

describe('tail', () => {
  const 첫줄 = 'Error: SyntaxError — 케이스 파일을 읽지 못했다';
  const 원문 = [첫줄, ...Array.from({ length: 100 }, (_, i) => `    at 줄 ${i} Received: "pa55word-${i}"`)].join('\n');

  it('2000자 이하면 앞뒤 공백만 걷고 그대로 둔다', () => {
    expect(tail('  짧은 오류\n둘째 줄  ')).toBe('짧은 오류\n둘째 줄');
  });

  it('색 코드를 걷는다 — admin 요약은 첫 줄을 그대로 사유로 쓴다', () => {
    expect(tail('\u001b[31mSyntaxError: x\u001b[39m\n다음')).toBe('SyntaxError: x\n다음');
  });

  it('2000자를 넘어도 첫 줄은 원문 첫 줄이다 — 요약 자리가 그 줄을 사유로 쓴다', () => {
    const 자른것 = tail(원문);
    expect(자른것.length).toBeLessThanOrEqual(2000);
    expect(자른것.split('\n')[0]).toBe(첫줄);
    expect(자른것.endsWith('Received: "pa55word-99"')).toBe(true);
  });

  it('끝부분은 줄 경계에서 자른다 — 비밀값 조각이 한 줄로 남지 않는다', () => {
    const 원문줄 = new Set(원문.split('\n'));
    const [, 표시, ...뒤] = tail(원문).split('\n');
    expect(표시).toBe('…');
    for (const 줄 of 뒤) expect(원문줄.has(줄)).toBe(true);
  });

  it('첫 줄이 1000자를 넘으면 자르지 않고 통째로 뺀다 — 1000자 자리에 걸친 비밀값 조각이 남지 않는다', () => {
    const 자른것 = tail(`${'x'.repeat(995)}"pa55word-secret"\n${'c'.repeat(50)}\n${'d'.repeat(1500)}`);
    expect(자른것.split('\n')[0]).toBe('…');
    expect(자른것).not.toContain('pa55');
    expect(자른것.length).toBeLessThanOrEqual(2000);
  });

  it('끝부분이 줄바꿈 없는 긴 한 줄이면 조각을 남기지 않고 버린다', () => {
    expect(tail(`${첫줄}\n잠깐\nReceived: "${'p'.repeat(2500)}"`)).toBe(`${첫줄}\n…`);
  });

  it('창이 마침 줄 첫머리에서 시작하면 그 줄을 버리지 않는다', () => {
    expect(tail(`E\n${'z'.repeat(100)}\n${'y'.repeat(1996)}`)).toBe(`E\n…\n${'y'.repeat(1996)}`);
  });

  it('1000자 자리에 이모지가 있어도 짝 없는 반쪽을 남기지 않는다 — jsonb 가 받지 않는다', () => {
    expect(/\p{Cs}/u.test(tail(`${'a'.repeat(999)}😀${'b'.repeat(500)}\n${'c'.repeat(600)}`))).toBe(false);
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

  it('팜 토큰은 android 항목 자식만 받는다 — 웹 케이스는 읽지 못한다', async () => {
    const 임시 = mkdtempSync(join(tmpdir(), 'exec-token-'));
    const 기록 = join(임시, 'token.txt');
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_abc';
    스크립트.지금 = `printf %s "\${PLATFORM_APPIUM_TOKEN-없음}" > '${기록}'`;
    try {
      await execute(요청('desktop'), 'a.spec.ts');
      expect(readFileSync(기록, 'utf8')).toBe('없음');
      await execute(요청('android'), 'a.spec.ts');
      expect(readFileSync(기록, 'utf8')).toBe('pat_abc');
    } finally {
      delete process.env.PLATFORM_APPIUM_TOKEN;
      rmSync(임시, { recursive: true, force: true });
    }
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

  it('자식에게 실행마다 다른 출력 폴더 이름과 trace 켜기를 넘기고, 끝나면 그 폴더를 지운다', async () => {
    const 임시 = mkdtempSync(join(tmpdir(), 'exec-out-'));
    const 원래 = process.env.PLATFORM_ARTIFACTS_DIR;
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    스크립트.지금 = `mkdir -p "$PLATFORM_ARTIFACTS_DIR/playwright/$PLATFORM_OUTPUT_ID" && printf '%s %s' "$PLATFORM_OUTPUT_ID" "$PLATFORM_TRACE" > '${join(임시, 'env.txt')}'`;
    try {
      await execute(요청('desktop'), 'a.spec.ts');
      const [첫이름, 켜기] = readFileSync(join(임시, 'env.txt'), 'utf8').split(' ');
      await execute(요청('desktop'), 'a.spec.ts');
      const [둘째이름] = readFileSync(join(임시, 'env.txt'), 'utf8').split(' ');

      expect(첫이름).toMatch(/^8-/);
      expect(둘째이름).not.toBe(첫이름);
      expect(켜기).toBe('1');
      expect(existsSync(join(임시, 'playwright', 첫이름!))).toBe(false);
    } finally {
      if (원래 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
      else process.env.PLATFORM_ARTIFACTS_DIR = 원래;
      rmSync(임시, { recursive: true, force: true });
    }
  });
});

describe('execute 는 자식 출력을 UTF-8 로 이어 읽는다', () => {
  const 요청: ExecuteRequest = {
    runId: 5, historyId: 9, tcId: 'DEMO-001', platform: 'desktop', filePath: 'a.spec.ts',
    baseUrl: '', params: {}, expected: {}, timeoutMs: 10_000,
  };

  it('한글 한 글자가 stderr 두 조각에 걸쳐도 깨지지 않는다', async () => {
    스크립트.지금 = String.raw`printf '\352\260' >&2; sleep 0.2; printf '\200 실패\n' >&2; exit 1`;

    expect((await execute(요청, 'a.spec.ts')).error?.message).toBe('가 실패');
  });

  it('결과 줄의 한글이 stdout 두 조각에 걸쳐도 깨지지 않는다', async () => {
    스크립트.지금 = String.raw`printf '@@RESULT@@{"status":"FAIL","durationMs":1,"steps":[],"error":{"message":"\352\260'; sleep 0.2; printf '\200"}}\n'`;

    expect((await execute(요청, 'a.spec.ts')).error?.message).toBe('가');
  });
});
