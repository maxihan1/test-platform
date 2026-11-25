// 빌드 확인: 폰 쪽지와 깐 시각으로 그대로 둘지 · 쪽지만 쓸지 · 지우고 다시 깔지 가른다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 빌드맞추기, 빌드열쇠 } from './appBuild.js';

const 서명 = (exp: string, sig: string) => `https://qa.example/api/builds/39/apk?exp=${exp}&sig=${sig}`;

/** 폰 하나 — 깐 시각 · 폰 시계 · 쪽지를 들고 removeApp · installApp · echo 를 반영한다 */
function 폰({ 깐 = '2026-11-01 10:00:00', 지금 = '2026-11-21T15:00:00', 쪽지 = '', 다시깐 = '2026-11-21 15:00:30' } = {}) {
  const 상태 = { 깐, 쪽지 };
  const 부름: [string, Record<string, unknown>][] = [];
  const 실행 = vi.fn(async (script: string, args: Record<string, unknown>) => {
    부름.push([script, args]);
    if (script === 'mobile: installApp') 상태.깐 = 다시깐;
    if (script !== 'mobile: shell') return true;
    const a = args.args as string[];
    if (args.command === 'dumpsys') return `    versionCode=1\n    lastUpdateTime=${상태.깐}\n`;
    if (args.command === 'date') return `${지금}\n`;
    if (args.command === 'cat') return 상태.쪽지;
    if (args.command === 'echo') 상태.쪽지 = a[0]!.replace(/^'|'$/g, '');
    return '';
  });
  const 했나 = (s: string) => 부름.some(([x]) => x === s);
  return { 실행, 상태, 했나 };
}

describe('빌드열쇠', () => {
  it('서명 주소는 기한 · 서명이 달라도 같은 빌드면 같다 — 다른 빌드면 다르다', () => {
    expect(빌드열쇠(서명('1', 'aa'))).toBe(빌드열쇠(서명('2', 'bb')));
    expect(빌드열쇠(서명('1', 'aa'))).not.toBe(빌드열쇠(서명('1', 'aa').replace('/39/', '/40/')));
    expect(빌드열쇠('/tmp/a.apk')).toBe('/tmp/a.apk');
  });
});

describe('빌드맞추기', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('쪽지가 없고 앱을 오래전에 깔았으면 지우고 넘긴 APK 를 깐 뒤 쪽지를 쓴다 — 다음 항목은 그대로 둔다', async () => {
    const p = 폰();
    expect(await 빌드맞추기(p.실행, 'com.g', 서명('1', 'aa'), 5_000)).toBe('다시깖');
    expect(p.실행).toHaveBeenCalledWith('mobile: removeApp', { appId: 'com.g' });
    expect(p.실행).toHaveBeenCalledWith('mobile: installApp', { appPath: 서명('1', 'aa') });
    expect(p.상태.쪽지).toMatch(/^[0-9a-f]{16} 2026-11-21 15:00:30$/);
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain('[kit] 폰에 깔린 앱이 이번 빌드가 아니라 지우고 다시 깔았다');

    const 다음 = 폰({ 깐: '2026-11-21 15:00:30', 지금: '2026-11-21T16:30:00', 쪽지: p.상태.쪽지 });
    expect(await 빌드맞추기(다음.실행, 'com.g', 서명('2', 'bb'), 5_000)).toBe('그대로');
    expect(다음.했나('mobile: removeApp')).toBe(false);
    expect(다음.했나('mobile: installApp')).toBe(false);
  });

  it('연결이 방금 깐 앱이면 다시 깔지 않고 쪽지만 쓴다 — 팜이 놓을 때 앱을 지운 폰이 두 번 깔리지 않게', async () => {
    const p = 폰({ 깐: '2026-11-21 14:59:30', 지금: '2026-11-21T15:00:00' });
    expect(await 빌드맞추기(p.실행, 'com.g', '/tmp/a.apk', 40_000)).toBe('방금깖');
    expect(p.했나('mobile: installApp')).toBe(false);
    expect(p.상태.쪽지).toMatch(/ 2026-11-21 14:59:30$/);
  });

  it('연결 직전에 앞 실행이 깐 다른 빌드는 이 연결이 깐 것으로 믿지 않는다 — 판이 같아 Appium 이 안 깔았다', async () => {
    const 연결전 = 폰({ 깐: '2026-11-21 14:59:20', 지금: '2026-11-21T15:00:00' });
    expect(await 빌드맞추기(연결전.실행, 'com.g', '/tmp/a.apk', 10_000)).toBe('다시깖');
    const 같은시각 = 폰({ 깐: '2026-11-21 14:59:55', 지금: '2026-11-21T15:00:00', 쪽지: '0123456789abcdef 2026-11-21 14:59:55' });
    expect(await 빌드맞추기(같은시각.실행, 'com.g', '/tmp/a.apk', 10_000)).toBe('다시깖');
  });

  it('쪽지가 다른 빌드거나 그사이 누가 다시 깔았으면 지우고 다시 깐다', async () => {
    const 앞 = 폰();
    await 빌드맞추기(앞.실행, 'com.g', 서명('1', 'aa'), 0);
    const 다른빌드 = 폰({ 깐: '2026-11-21 15:00:30', 지금: '2026-11-22T09:00:00', 쪽지: 앞.상태.쪽지 });
    expect(await 빌드맞추기(다른빌드.실행, 'com.g', 서명('1', 'aa').replace('/39/', '/40/'), 0)).toBe('다시깖');
    const 누가깖 = 폰({ 깐: '2026-11-21 18:00:00', 지금: '2026-11-22T09:00:00', 쪽지: 앞.상태.쪽지 });
    expect(await 빌드맞추기(누가깖.실행, 'com.g', 서명('1', 'aa'), 0)).toBe('다시깖');
  });

  it('폰 셸을 못 쓰면 알리고 지금처럼 켠다', async () => {
    const 실행 = vi.fn(async (script: string) => {
      if (script === 'mobile: shell') throw new Error('adb_shell feature is not enabled');
      return true;
    });
    expect(await 빌드맞추기(실행, 'com.g', '/tmp/a.apk', 0)).toBe('못봄');
    expect(실행).not.toHaveBeenCalledWith('mobile: removeApp', expect.anything());
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain('adb_shell');
  });

  it('다시 깔기가 실패하면 서명을 가리고 던진다 — 앱이 지워진 채로 돌지 않게', async () => {
    const p = 폰();
    const 주소 = 서명('1', 'secret');
    p.실행.mockImplementation(async (script: string, args: Record<string, unknown>) => {
      if (script === 'mobile: installApp') throw new Error(`Cannot install ${주소}`);
      if (script === 'mobile: shell') return args.command === 'dumpsys' ? 'lastUpdateTime=2026-11-01 10:00:00' : args.command === 'date' ? '2026-11-21T15:00:00' : '';
      return true;
    });
    const 오류 = await 빌드맞추기(p.실행, 'com.g', 주소, 0).catch((e: Error) => e.message);
    expect(오류).toContain('다시 설치하지 못했다 — Cannot install <앱 파일>');
    expect(오류).not.toContain('secret');
  });
});
