// 연결 번호 파일을 못 지워도 앱연결을닫는다 가 던지지 않는지 보는 단위 테스트. rm 이 실패하도록 fs 를 바꿔 끼워 따로 둔다

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_FILE, runDir } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 앱연결을닫는다 } from './appSession.js';

vi.mock('node:fs/promises', async (원본) => ({
  ...(await 원본<typeof import('node:fs/promises')>()),
  rm: vi.fn().mockRejectedValue(new Error('EPERM')),
}));

let 임시: string;

beforeEach(() => {
  임시 = mkdtempSync(join(tmpdir(), 'appsession-rm-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 임시;
  process.env.PLATFORM_APPIUM_URL = 'http://farm:4723';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  delete process.env.PLATFORM_APPIUM_URL;
  rmSync(임시, { recursive: true, force: true });
});

describe('앱연결을닫는다 — 번호 파일을 못 지울 때', () => {
  it('던지지 않고 오류를 기록한다', async () => {
    const file = join(runDir('3', '9'), APPIUM_SESSION_FILE);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, 'abc-123\n');

    await expect(앱연결을닫는다(3, 9)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('EPERM'));
  });
});
