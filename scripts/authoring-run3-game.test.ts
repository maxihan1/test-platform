// 돌려 보기 폰 갈래 검사 — 잡은 폰 읽기 · 돌릴 게임 · 앱 케이스 고르기 · 끝 검사 줄 · 폰 없이 끝나는 길 · 앱 서버 닿음 (도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 도메인/작성 §3.6 「앱 화면」)
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 기록남기며비우기, 끝검사줄들 } from './authoring-gate3.js';
import { nc답읽기, 빨간폰케이스, 앱서버확인, 앱줄주소, 앱케이스말, 잡은폰, 폰끝검사, 폰실행, 폰에서볼자리, 폰할일 } from './authoring-run3-game.js';

const 게임케이스 = `defineCase({ tcId: 'G-FN-001', platforms: ['android'] }, async ({ game }) => { await game.click('Start'); });`;
const 웹케이스 = `defineCase({ tcId: 'G-FN-002', platforms: ['desktop'] }, async ({ page }) => { await page.goto('/'); });`;

/** android 결과 한 벌 — 파일마다 상태 하나 */
const 결과 = (파일들: Record<string, string>, startTime: string) =>
  JSON.stringify({
    config: { workers: 1, metadata: { slowApi: false } },
    stats: { startTime },
    suites: Object.entries(파일들).map(([file, status]) => ({
      file,
      specs: [{ tests: [{ projectName: 'android', status, results: [{ duration: 30_000, ...(status === 'unexpected' ? { error: { message: '골드가 0 이다\n자세히' } } : {}) }] }] }],
    })),
  });

const 판 = (시작: number, 상태: string) => ({ 기록: 'gate3-game-1.json', 시작, 느림: false, 끝: false, 상태들: [상태], 시간들: [30_000], 오류: 상태 === 'unexpected' ? '골드가 0 이다' : null });

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

function 트리만들기(): { 트리: string; 결과폴더: string } {
  const 트리 = mkdtempSync(join(tmpdir(), 'run3-game-'));
  자리들.push(트리);
  mkdirSync(join(트리, 'tests', 'g'), { recursive: true });
  writeFileSync(join(트리, 'tests', 'g', 'G-FN-001.spec.ts'), 게임케이스);
  writeFileSync(join(트리, 'tests', 'g', 'G-FN-002.spec.ts'), 웹케이스);
  const 결과폴더 = join(트리, 'gate3');
  mkdirSync(결과폴더);
  return { 트리, 결과폴더 };
}

describe('폰할일 · 빨간폰케이스 — 고친 뒤 폰에서 돈 기록으로 고른다', () => {
  it('고친 뒤 기록이 없으면 돌리고, 빨강이어도 돌았으면 끝이다', () => {
    const 기록 = new Map([['g/A.spec.ts', [판(100, 'unexpected')]], ['g/B.spec.ts', [판(50, 'expected')]]]);
    expect(폰할일({ 'g/A.spec.ts': 90, 'g/B.spec.ts': 90, 'g/C.spec.ts': 90 }, (f) => 기록.get(f))).toEqual(['g/B.spec.ts', 'g/C.spec.ts']);
    expect(빨간폰케이스({ 'g/A.spec.ts': 90, 'g/B.spec.ts': 90 }, (f) => 기록.get(f))).toEqual([{ 파일: 'g/A.spec.ts', 오류: '골드가 0 이다' }]);
  });

  it('빨강은 고친 뒤 가장 늦은 기록으로 본다 — 고쳐서 다시 초록이면 빨강이 아니다', () => {
    const 기록 = new Map([['g/A.spec.ts', [판(100, 'unexpected'), 판(200, 'expected')]]]);
    expect(빨간폰케이스({ 'g/A.spec.ts': 90 }, (f) => 기록.get(f))).toEqual([]);
  });
});

describe('잡은폰 — AI 가 잡은 폰 번호(게임 .control-cli/held · 앱 .appium-cli/held)', () => {
  it('폰 번호 꼴이면 읽고, 없거나 꼴이 아니거나 링크면 null', () => {
    const { 트리 } = 트리만들기();
    expect(잡은폰(트리)).toBeNull();
    mkdirSync(join(트리, '.control-cli'));
    writeFileSync(join(트리, '.control-cli', 'held'), 'R5CT1234ABC\n');
    expect(잡은폰(트리)).toBe('R5CT1234ABC');
    writeFileSync(join(트리, '.control-cli', 'held'), 'a b; rm -rf');
    expect(잡은폰(트리)).toBeNull();
    rmSync(join(트리, '.control-cli', 'held'));
    writeFileSync(join(트리, 'elsewhere'), 'R5CT1234ABC');
    symlinkSync(join(트리, 'elsewhere'), join(트리, '.control-cli', 'held'));
    expect(잡은폰(트리)).toBeNull();
    expect(잡은폰(트리, '앱')).toBeNull();
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    expect(잡은폰(트리, '앱')).toBe('R3CR10TCVCD');
  });
});

describe('폰끝검사 · 끝검사줄들 — 게임 · 앱 케이스는 웹 경고 대신 폰 돌려 보기 줄', () => {
  it('이번 작성이 닿은 폰 케이스 가운데 안 돈 것을 갈래 이름으로 알리고, 끝검사줄들은 폰 케이스를 안 본다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'])).toEqual(['⚠️ 폰에서 돌려 보지 않은 게임 케이스 1개 — g/G-FN-001.spec.ts']);
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'], '앱')).toEqual(['⚠️ 폰에서 돌려 보지 않은 앱 케이스 1개 — g/G-FN-001.spec.ts']);
    expect(끝검사줄들(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts']).join('\n')).not.toMatch(/앱 케이스|게임 케이스/);
  });

  it('고친 뒤 빨갛게 돈 케이스를 알리고, 초록이면 줄이 없다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    writeFileSync(join(결과폴더, 'gate3-game-1.json'), 결과({ 'g/G-FN-001.spec.ts': 'unexpected' }, '2999-01-01T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'])).toEqual(['⚠️ 폰에서 빨간 게임 케이스 1개 — g/G-FN-001.spec.ts']);
    writeFileSync(join(결과폴더, 'gate3-game-2.json'), 결과({ 'g/G-FN-001.spec.ts': 'expected' }, '2999-01-02T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'])).toEqual([]);
  });

  it('앱 갈래는 gate3-app 기록만 본다 — 게임 기록이 초록이어도 앱은 안 돈 것이다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    writeFileSync(join(결과폴더, 'gate3-game-1.json'), 결과({ 'g/G-FN-001.spec.ts': 'expected' }, '2999-01-01T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'], '앱')).toEqual(['⚠️ 폰에서 돌려 보지 않은 앱 케이스 1개 — g/G-FN-001.spec.ts']);
    writeFileSync(join(결과폴더, 'gate3-app-1.json'), 결과({ 'g/G-FN-001.spec.ts': 'unexpected' }, '2999-01-01T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'], '앱')).toEqual(['⚠️ 폰에서 빨간 앱 케이스 1개 — g/G-FN-001.spec.ts']);
  });

  it('이번에 안 닿은 게임 케이스는 안 본다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-002.spec.ts'])).toEqual([]);
  });
});

describe('폰실행 — 폰에서 돌릴 수 없으면 Playwright 를 띄우기 전에 끝난다', () => {
  const 기준목록 = (트리: string) => {
    const 파일 = join(트리, 'base.z');
    writeFileSync(파일, '');
    return 파일;
  };

  it('게임 작성이 아니면 게임 갈래 · 게임 작성이면 앱 갈래가 2 — 서로의 갈래를 가리킨다', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await 폰실행('게임', 'g', 트리, { AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리) })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/`앱 g` 로 돌린다/);
    expect(await 폰실행('앱', 'g', 트리, { AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_GAME_DIR: 트리 })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/`게임 g` 로 돌린다/);
  });

  it('디바이스 팜이 안 붙었거나 잡은 폰이 없으면 까닭을 찍고 2', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = { AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_GAME_DIR: 트리 };
    expect(await 폰실행('게임', 'g', 트리, env)).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/디바이스 팜이 안 붙어/);
    expect(await 폰실행('게임', 'g', 트리, { ...env, PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk', PLATFORM_BASE_URL: 'http://qa.g.test' })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/잡은 폰이 없다 — `npx control-cli hold/);
    const { AUTHORING_GAME_DIR: _, ...앱env } = env;
    expect(await 폰실행('앱', 'g', 트리, { ...앱env, PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk', PLATFORM_BASE_URL: 'http://qa.g.test' })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/잡은 폰이 없다 — `npx appium-cli hold/);
  });

  it('어드민 키도 계정도 없어 앱 줄을 모르면 주소를 고르게 하지 않고 2', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await 폰실행('게임', 'g', 트리, { AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_GAME_DIR: 트리, PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk' })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/앱 줄을 모른다/);
  });

  it('이번에 닿은 게임 케이스가 없으면 폰 없이 0', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    rmSync(join(트리, 'tests', 'g', 'G-FN-001.spec.ts'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 폰실행('게임', 'g', 트리, { AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_GAME_DIR: 트리 })).toBe(0);
  });
});

describe('앱줄주소 — 게임 케이스가 갈 서버', () => {
  it('어드민 키 줄 주소가 먼저, 없으면 계정 맨 앞(앱 줄) 주소, 둘 다 없거나 깨졌으면 null', () => {
    const 계정 = JSON.stringify([{ baseUrl: 'http://qa.g.test', role: '일반 회원' }, { baseUrl: 'http://dev.g.test', role: '일반 회원' }]);
    expect(앱줄주소({ PLATFORM_BASE_URL: 'http://key.g.test', PLATFORM_ACCOUNTS: 계정 })).toBe('http://key.g.test');
    expect(앱줄주소({ PLATFORM_ACCOUNTS: 계정 })).toBe('http://qa.g.test');
    expect(앱줄주소({})).toBeNull();
    expect(앱줄주소({ PLATFORM_ACCOUNTS: '[{' })).toBeNull();
  });

  it('앱은 계정 맨 앞(앱 줄)이 AI 가 붙인 주소보다 먼저, 계정이 없으면 붙인 주소', () => {
    const 계정 = JSON.stringify([{ baseUrl: 'http://qa.g.test', role: '일반 회원' }]);
    expect(앱줄주소({ PLATFORM_BASE_URL: 'http://dev.g.test', PLATFORM_ACCOUNTS: 계정 }, true)).toBe('http://qa.g.test');
    expect(앱줄주소({ PLATFORM_BASE_URL: 'http://dev.g.test' }, true)).toBe('http://dev.g.test');
    expect(앱줄주소({}, true)).toBeNull();
  });
});

describe('기록남기며비우기 — 이어하기가 폰 돌려 보기 기록도 넘긴다', () => {
  it('gate3-game · gate3-app 기록이 남는다 — 안 남기면 다 돈 폰 케이스를 또 돌린다', () => {
    const { 결과폴더 } = 트리만들기();
    writeFileSync(join(결과폴더, 'gate3-game-1.json'), '{}');
    writeFileSync(join(결과폴더, 'gate3-app-1.json'), '{}');
    writeFileSync(join(결과폴더, 'cache.bin'), 'x');
    expect(기록남기며비우기(결과폴더, () => {
      rmSync(결과폴더, { recursive: true });
      mkdirSync(결과폴더);
    })).toBe(2);
  });
});

describe('앱케이스말 — 마지막 돌려 보기가 앱 케이스를 뺄 때', () => {
  it('게임 작성이면 게임 갈래, 팜이 붙은 앱 작성이면 앱 갈래 명령을 가리키고, 아니면 폰이 없다고 한다', () => {
    expect(앱케이스말(['g/A.spec.ts'], 'g', { AUTHORING_GAME_DIR: '/자료' })).toMatch(/authoring:run -- 게임 g/);
    expect(앱케이스말(['g/A.spec.ts'], 'g', { PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/a.apk' })).toMatch(/authoring:run -- 앱 g/);
    expect(앱케이스말(['g/A.spec.ts'], 'g', {})).toBe('[돌려 보기] 앱 케이스 1건은 폰이 없어 안 돌린다 — g/A.spec.ts');
  });
});

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
    const env = { PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_ACCOUNTS: 계정 };
    const 닿음 = vi.fn().mockResolvedValue({ 닿음: true });
    expect(await 앱서버확인(트리, env, 닿음)).toBe(0);
    expect(닿음).toHaveBeenCalledWith('http://farm.test/wd/hub', 'R3CR10TCVCD', { 호스트: '127.0.0.1', 포트: 3002 });
    expect(await 앱서버확인(트리, env, vi.fn().mockResolvedValue({ 닿음: false }))).toBe(1);
    expect(말.mock.calls.at(-1)?.[0]).toMatch(/못 닿는다 — 케이스를 쓰지 않는다/);
    expect(await 앱서버확인(트리, env, vi.fn().mockResolvedValue({ 모름: 'adb_shell 이 닫혔다' }))).toBe(2);
  });
});
