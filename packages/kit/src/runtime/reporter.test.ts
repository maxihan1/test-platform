// 리포터는 상대 import를 둘 수 없어 표시자를 따로 들고 있다. 두 벌이 어긋나면 러너가 결과 줄을 영영 못 찾는다

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { TestCase, TestResult } from '@playwright/test/reporter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runDir } from './artifacts.js';
import { DEVICE_ATTACHMENT, PROGRESS_MARKER, RESULT_MARKER, STEP_ATTACHMENT } from './protocol.js';
import PlatformReporter, {
  DEVICE_ATTACHMENT as REPORTER_DEVICE,
  moveTrace,
  RESULT_MARKER as REPORTER_MARKER,
  STEP_ATTACHMENT as REPORTER_ATTACHMENT,
  traceDest,
} from './reporter.js';

describe('리포터가 들고 있는 표시자', () => {
  it('protocol.ts의 값과 같다', () => {
    expect(REPORTER_MARKER).toBe(RESULT_MARKER);
    expect(REPORTER_ATTACHMENT).toBe(STEP_ATTACHMENT);
    expect(REPORTER_DEVICE).toBe(DEVICE_ATTACHMENT);
  });
});

describe('리포터가 워커 출력을 넘겨받는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('진행 줄을 진짜 stdout으로 다시 쓴다', () => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const 진행 = `${PROGRESS_MARKER}{"historyId":12,"seq":1,"title":"로그인 API를 호출한다"}\n`;

    new PlatformReporter().onStdOut(진행);

    expect(쓰기).toHaveBeenCalledTimes(1);
    expect(쓰기).toHaveBeenCalledWith(진행);
  });

  it('진행 줄이 아닌 보통 출력도 빠짐없이 다시 쓴다', () => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const 리포터 = new PlatformReporter();
    const 문법오류 = 'SyntaxError: Unexpected identifier\n';
    const 스택 = Buffer.from('    at file:///work/tests/cases/TC-1.spec.ts:3:1\n');

    리포터.onStdOut(문법오류);
    리포터.onStdOut(스택);

    expect(쓰기.mock.calls.map(([조각]) => String(조각))).toEqual([문법오류, String(스택)]);
  });
});

describe('리포터가 케이스 파일을 못 읽은 오류를 넘겨받는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onError 로 온 오류 문장을 stderr 로 흘린다 — 러너가 그것을 실패 사유로 싣는다', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const 문법오류 = 'SyntaxError: /tests/demo/DEMO-001.spec.ts: Unexpected token (3:12)\n\n> 3 |   const a = ;';

    new PlatformReporter().onError({ message: 문법오류 });

    expect(쓰기).toHaveBeenCalledWith(`${문법오류}\n`);
  });

  it('문장이 없는 오류는 값을 글자로 흘린다', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new PlatformReporter().onError({ value: 'boom' });

    expect(쓰기).toHaveBeenCalledWith('boom\n');
  });

  it('문장 · 스택 · 값이 다 없으면 아무것도 흘리지 않는다 — 「undefined」가 사유가 되지 않게', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new PlatformReporter().onError({});

    expect(쓰기).not.toHaveBeenCalled();
  });
});

describe('리포터가 trace 를 스크린샷 옆으로 옮긴다', () => {
  const 원래 = { ...process.env };
  let 임시: string;

  beforeEach(() => {
    임시 = mkdtempSync(join(tmpdir(), 'reporter-trace-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    process.env.PLATFORM_RUN_ID = '5';
    process.env.PLATFORM_HISTORY_ID = '77';
  });

  afterEach(() => {
    process.env = { ...원래 };
    rmSync(임시, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function 결과(attachments: TestResult['attachments'], status: TestResult['status'] = 'failed'): TestResult {
    return { status, duration: 3, attachments, annotations: [], errors: [], steps: [] } as unknown as TestResult;
  }

  function 첨부된trace(): TestResult['attachments'] {
    const 원본 = join(임시, 'playwright', 'out', 'trace.zip');
    mkdirSync(dirname(원본), { recursive: true });
    writeFileSync(원본, 'zip');
    return [{ name: 'trace', contentType: 'application/zip', path: 원본 }];
  }

  it('옮길 자리가 kit 의 runDir 과 같다 — 서버가 그 자리에서 찾는다', () => {
    expect(traceDest('5', '77')).toBe(join(runDir('5', '77'), 'trace.zip'));
  });

  it('trace 첨부를 runs/{runId}/{historyId}/trace.zip 으로 옮긴다', () => {
    moveTrace(결과(첨부된trace()));

    expect(readFileSync(traceDest('5', '77'), 'utf8')).toBe('zip');
    expect(existsSync(join(임시, 'playwright', 'out', 'trace.zip'))).toBe(false);
  });

  it('테스트 실행(runId 0)은 옮기지 않는다', () => {
    process.env.PLATFORM_RUN_ID = '0';

    moveTrace(결과(첨부된trace()));

    expect(existsSync(traceDest('0', '77'))).toBe(false);
  });

  it('옮기다 실패해도 결과 줄은 그대로 나가고 사유는 stderr 로 간다', () => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const 오류 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const 없는파일: TestResult['attachments'] = [{ name: 'trace', contentType: 'application/zip', path: join(임시, '없음.zip') }];

    new PlatformReporter().onTestEnd({ annotations: [] } as unknown as TestCase, 결과(없는파일, 'passed'));

    expect(String(오류.mock.calls[0]?.[0])).toContain('[kit] trace 를 옮기지 못했다');
    const 줄 = String(쓰기.mock.calls.at(-1)?.[0]);
    expect(줄.startsWith(RESULT_MARKER)).toBe(true);
    expect(JSON.parse(줄.slice(RESULT_MARKER.length))).toMatchObject({ historyId: 77, status: 'PASS' });
  });
});

describe('결과 줄의 기기 정보 (APP-F1-05)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const 끝줄 = (attachments: TestResult['attachments']) => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const result = { status: 'passed', duration: 3, attachments, annotations: [], errors: [], steps: [] } as unknown as TestResult;
    new PlatformReporter().onTestEnd({ annotations: [] } as unknown as TestCase, result);
    const 줄 = String(쓰기.mock.calls.at(-1)?.[0]);
    return JSON.parse(줄.slice(RESULT_MARKER.length)) as Record<string, unknown>;
  };

  it('기기 첨부가 있으면 device 로 싣는다', () => {
    const 기기 = { model: 'SM-G996N', osVersion: '14', appVersion: null };
    const body = Buffer.from(JSON.stringify(기기));
    expect(끝줄([{ name: DEVICE_ATTACHMENT, contentType: 'application/json', body }]).device).toEqual(기기);
  });

  it('없으면 device 칸이 없다 — 브라우저 항목', () => {
    expect('device' in 끝줄([])).toBe(false);
  });
});
