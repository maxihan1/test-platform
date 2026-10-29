// 러너가 끝난 android 항목의 Appium 연결을 닫는 통로의 단위 테스트. 네트워크는 fetch 가짜로 막는다

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_FILE, runDir } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 앱연결을닫는다 } from './appSession.js';

let 임시: string;
const fetchMock = vi.fn();

function 번호를_적는다(runId: number, historyId: number, id: string): string {
  const file = join(runDir(String(runId), String(historyId)), APPIUM_SESSION_FILE);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, `${id}\n`);
  return file;
}

beforeEach(() => {
  임시 = mkdtempSync(join(tmpdir(), 'appsession-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 임시;
  process.env.PLATFORM_APPIUM_URL = 'http://farm:4723';
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  delete process.env.PLATFORM_APPIUM_URL;
  delete process.env.PLATFORM_APPIUM_TOKEN;
  rmSync(임시, { recursive: true, force: true });
});

describe('앱연결을닫는다', () => {
  it('번호 파일이 있으면 DELETE 를 보내고 파일을 지운다', async () => {
    const file = 번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://farm:4723/session/abc-123');
    expect(init.method).toBe('DELETE');
    expect(existsSync(file)).toBe(false);
  });

  it('주소의 경로(/wd/hub)를 살린다', async () => {
    process.env.PLATFORM_APPIUM_URL = 'http://farm:4723/wd/hub';
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://farm:4723/wd/hub/session/abc-123');
  });

  it('주소 안 계정은 주소에서 빼고 Authorization 머리로 보낸다', async () => {
    process.env.PLATFORM_APPIUM_URL = 'https://us%40er:p%3Aw@farm.example:8443/wd/hub';
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://farm.example:8443/wd/hub/session/abc-123');
    const 머리 = new Headers(init.headers).get('authorization');
    expect(머리).toBe(`Basic ${Buffer.from('us@er:p:w').toString('base64')}`);
  });

  it('PLATFORM_APPIUM_TOKEN 이 있으면 주소 안 계정보다 앞서 Bearer 로 보낸다', async () => {
    process.env.PLATFORM_APPIUM_URL = 'https://user:pw@farm.example/wd/hub';
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_abc';
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://farm.example/wd/hub/session/abc-123');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer pat_abc');
  });

  it('요청이 준 토큰이 있으면 환경값보다 앞선다 — 그 연결을 연 사람의 토큰이다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_server';
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9, 'pat_kim');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer pat_kim');
  });

  it('PLATFORM_APPIUM_TOKEN 이 비면 머리를 싣지 않는다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = '';
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('닫기가 실패해도 토큰을 로그에 찍지 않는다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_secret';
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('pat_secret');
  });

  it('번호 파일이 없으면 아무것도 안 보낸다', async () => {
    await 앱연결을닫는다(3, 9);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PLATFORM_APPIUM_URL 이 없으면 보내지 않는다', async () => {
    delete process.env.PLATFORM_APPIUM_URL;
    const file = 번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(existsSync(file)).toBe(true);
  });

  it('번호 파일 자리에 폴더가 있으면 오류를 기록하고 아무것도 안 보낸다', async () => {
    const file = join(runDir('3', '9'), APPIUM_SESSION_FILE);
    mkdirSync(file, { recursive: true });

    await expect(앱연결을닫는다(3, 9)).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Appium 연결 번호를 읽지 못했다'));
  });

  it('번호 파일이 없으면 오류도 기록하지 않는다', async () => {
    await 앱연결을닫는다(3, 9);

    expect(console.error).not.toHaveBeenCalled();
  });

  it('Appium 이 500 으로 답해도 던지지 않고 파일은 지운다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const file = 번호를_적는다(3, 9, 'abc-123');

    await expect(앱연결을닫는다(3, 9)).resolves.toBeUndefined();

    expect(existsSync(file)).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('연결이 실패해도 던지지 않고 파일은 지운다', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const file = 번호를_적는다(3, 9, 'abc-123');

    await expect(앱연결을닫는다(3, 9)).resolves.toBeUndefined();

    expect(existsSync(file)).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('10초 제한을 걸어 보낸다', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    번호를_적는다(3, 9, 'abc-123');

    await 앱연결을닫는다(3, 9);

    expect(timeout).toHaveBeenCalledWith(10_000);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('시간 초과로 fetch 가 중단돼도 던지지 않고 파일은 지운다', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    const file = 번호를_적는다(3, 9, 'abc-123');

    await expect(앱연결을닫는다(3, 9)).resolves.toBeUndefined();

    expect(existsSync(file)).toBe(false);
  });
});
