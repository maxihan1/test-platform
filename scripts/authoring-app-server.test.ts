// 앱 서버 닿음 검사 — 맥 서버 주소 바꾸기 · nc 답 읽기 · 잡은 폰에서 두드리기 (도메인/작성 §3.6 「앱 화면」 「서버에 닿는지」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { nc답읽기, 앱서버확인, 폰에서볼자리 } from './authoring-app-server.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

function 트리만들기(): { 트리: string } {
  const 트리 = mkdtempSync(join(tmpdir(), 'app-server-'));
  자리들.push(트리);
  return { 트리 };
}

describe('폰에서볼자리 — 맥의 서버는 팜이 이은 폰의 127.0.0.1 로 본다', () => {
  it('localhost · host.docker.internal 은 127.0.0.1 같은 포트, 다른 주소는 그대로, 포트가 없으면 꼴의 기본, 주소가 아니면 null', () => {
    expect(폰에서볼자리('http://localhost:3002')).toEqual({ 호스트: '127.0.0.1', 포트: 3002 });
    expect(폰에서볼자리('http://host.docker.internal:3002/api')).toEqual({ 호스트: '127.0.0.1', 포트: 3002 });
    expect(폰에서볼자리('https://qa.shop.test')).toEqual({ 호스트: 'qa.shop.test', 포트: 443 });
    expect(폰에서볼자리('http://10.0.0.5')).toEqual({ 호스트: '10.0.0.5', 포트: 80 });
    expect(폰에서볼자리('qa.shop.test')).toBeNull();
  });
});

describe('nc답읽기 — 폰 셸이 돌려준 끝 코드 글', () => {
  it('rc=0 닿음 · rc=1 못 닿음 · 옵션을 모르거나 nc 가 없거나 끝 코드가 없으면 모름', () => {
    expect(nc답읽기({ stdout: 'rc=0\n', stderr: '' })).toEqual({ 닿음: true });
    expect(nc답읽기({ stdout: 'rc=1\n', stderr: '' })).toEqual({ 닿음: false });
    expect(nc답읽기({ stdout: 'rc=1\n', stderr: "nc: Unknown option 'z' (see \"nc --help\")" })).toEqual({ 모름: "nc: Unknown option 'z' (see \"nc --help\")" });
    expect(nc답읽기({ stdout: 'rc=127\n', stderr: '/system/bin/sh: nc: inaccessible or not found' })).toEqual({ 모름: '/system/bin/sh: nc: inaccessible or not found' });
    expect(nc답읽기({ stdout: '' })).toEqual({ 모름: '폰이 끝 코드를 안 돌려줬다' });
  });
});

describe('앱서버확인 — 잡은 폰이 대상 서버에 닿는지', () => {
  const 계정 = JSON.stringify([{ baseUrl: 'http://host.docker.internal:3002', role: '일반 회원' }]);
  const 잡기 = (트리: string) => {
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD');
  };

  it('팜 · 앱 줄 · 잡은 폰이 없으면 두드리지 않고 2 — 확인 못 함은 멈추지 않는다', async () => {
    const { 트리 } = 트리만들기();
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const 두드리기 = vi.fn();
    expect(await 앱서버확인(트리, { PLATFORM_ACCOUNTS: 계정 }, 두드리기)).toBe(2);
    expect(await 앱서버확인(트리, { PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub' }, 두드리기)).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/앱 줄을 모른다/);
    expect(await 앱서버확인(트리, { PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_ACCOUNTS: 계정 }, 두드리기)).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/잡은 폰이 없다/);
    expect(두드리기).not.toHaveBeenCalled();
  });

  it('잡은 폰에서 앱 줄 포트를 두드려 닿으면 0 · 못 닿으면 1 · 폰이 답을 못 하면 2', async () => {
    const { 트리 } = 트리만들기();
    잡기(트리);
    const 말 = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = { PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APPIUM_TOKEN: 'pat_abc', PLATFORM_ACCOUNTS: 계정 };
    const 닿음 = vi.fn().mockResolvedValue({ 닿음: true });
    expect(await 앱서버확인(트리, env, 닿음)).toBe(0);
    expect(닿음).toHaveBeenCalledWith('http://farm.test/wd/hub', 'R3CR10TCVCD', { 호스트: '127.0.0.1', 포트: 3002 }, 'pat_abc');
    expect(await 앱서버확인(트리, env, vi.fn().mockResolvedValue({ 닿음: false }))).toBe(1);
    expect(말.mock.calls.at(-1)?.[0]).toMatch(/못 닿는다 — 케이스를 쓰지 않는다/);
    expect(await 앱서버확인(트리, env, vi.fn().mockResolvedValue({ 모름: 'adb_shell 이 닫혔다' }))).toBe(2);
  });
});
