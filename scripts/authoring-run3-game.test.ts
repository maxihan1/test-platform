// 돌려 보기 폰 갈래 검사 — 잡은 폰 읽기 · 돌릴 게임 · 앱 케이스 고르기 · 끝 검사 줄 · 폰 없이 끝나는 길 (도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 도메인/작성 §3.6 「앱 화면」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 기록남기며비우기, 끝검사줄들 } from './authoring-gate3.js';
import { 데이터남기나, 앱줄주소, 앱케이스말, 잡은폰, 폰끝검사, 폰실행, 폰차례, 폰판정들 } from './authoring-run3-game.js';

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

describe('폰판정들 — 고친 뒤 폰에서 돈 기록으로 판정한다', () => {
  it('고친 뒤 기록이 없으면 안돎, 같은 폰 · 계정으로 다시 돌아 초록이면 초록, 고치기 전 기록은 안 본다', () => {
    const 기록 = new Map([['g/A.spec.ts', [판(100, 'unexpected')]], ['g/B.spec.ts', [판(50, 'expected')]], ['g/D.spec.ts', [판(100, 'unexpected'), 판(200, 'expected')]]]);
    expect(폰판정들({ 'g/A.spec.ts': 90, 'g/B.spec.ts': 90, 'g/C.spec.ts': 90, 'g/D.spec.ts': 90 }, 기록).map(([f, p]) => [f, p.상태])).toEqual([
      ['g/A.spec.ts', '빨강'],
      ['g/B.spec.ts', '안돎'],
      ['g/C.spec.ts', '안돎'],
      ['g/D.spec.ts', '초록'],
    ]);
  });
});

describe('폰판정들 — PC 게임은 선언한 윈도우 값이 다 돌아야 판정한다', () => {
  it('PS5 만 돌고 Xbox 가 시간 안에 못 돌았으면 초록이 아니라 안돎이고, 둘 다 돌았으면 초록이다', () => {
    const 패드판 = (자리: string) => ({ ...판(2000, 'expected'), 기록: `gate3-game-1~${자리}~1.json` });
    const 값들 = () => ['windows-ps5', 'windows-xbox'];
    expect(폰판정들({ 'g/A.spec.ts': 1000 }, new Map([['g/A.spec.ts', [패드판('pc-pc1:ps5')]]]), [], [1], 값들)).toEqual([['g/A.spec.ts', { 상태: '안돎' }]]);
    expect(폰판정들({ 'g/A.spec.ts': 1000 }, new Map([['g/A.spec.ts', [패드판('pc-pc1:ps5'), 패드판('pc-pc1:xbox')]]]), [], [1], 값들)).toEqual([['g/A.spec.ts', { 상태: '초록' }]]);
    expect(폰판정들({ 'g/B.spec.ts': 1000 }, new Map([['g/B.spec.ts', [패드판('pc-pc1')]]]), [], [1], () => ['windows'])).toEqual([['g/B.spec.ts', { 상태: '초록' }]]);
  });
});

describe('폰차례 · 데이터남기나 — 앱 데이터를 남기는 케이스끼리 붙여 돌린다', () => {
  it('남기는 케이스를 앞에 모으고 나머지를 뒤에 세운다 — 거르지 않아 못 도는 케이스 하나가 나머지를 막지 않는다', () => {
    const 남기나 = (f: string) => f.startsWith('m/K');
    expect(폰차례(['m/A.spec.ts', 'm/K1.spec.ts', 'm/B.spec.ts', 'm/K2.spec.ts'], 남기나)).toEqual(['m/K1.spec.ts', 'm/K2.spec.ts', 'm/A.spec.ts', 'm/B.spec.ts']);
    expect(폰차례(['m/A.spec.ts', 'm/B.spec.ts'], 남기나)).toEqual(['m/A.spec.ts', 'm/B.spec.ts']);
    expect(폰차례([], 남기나)).toEqual([]);
  });

  it('본문 앞 선언의 keepAppData: true 만 남기기로 본다 — 한 줄 선언도 잡고, 없는 파일 · false · 본문 속 글자는 아니다', () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'keep-'));
    try {
      mkdirSync(join(트리, 'tests', 'm'), { recursive: true });
      writeFileSync(join(트리, 'tests', 'm', 'K.spec.ts'), "export const spec = defineCase({\n  tcId: 'M-1',\n  platforms: ['android'],\n  keepAppData: true,\n});\n");
      writeFileSync(join(트리, 'tests', 'm', 'F.spec.ts'), 'export const spec = defineCase({\n  keepAppData: false,\n});\n');
      writeFileSync(join(트리, 'tests', 'm', 'S.spec.ts'), "export const spec = defineCase({ name: 'x' });\n\ntest(spec, async ({ driver }) => {\n  const 글 = 'keepAppData: true 라는 글자';\n});\n");
      writeFileSync(join(트리, 'tests', 'm', 'O.spec.ts'), "export const spec = defineCase({ tcId: 'M-2', platforms: ['android'], keepAppData: true });\n\ntest(spec, async () => {});\n");
      expect(데이터남기나(트리, 'm/O.spec.ts')).toBe(true);
      expect(데이터남기나(트리, 'm/K.spec.ts')).toBe(true);
      expect(데이터남기나(트리, 'm/F.spec.ts')).toBe(false);
      expect(데이터남기나(트리, 'm/S.spec.ts')).toBe(false);
      expect(데이터남기나(트리, 'm/없음.spec.ts')).toBe(false);
    } finally {
      rmSync(트리, { recursive: true, force: true });
    }
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

  it('도우미만 바뀌었으면 그 도우미를 쓰는 기존 케이스는 표본 1개만 보고, 뺀 수를 따로 알린다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    mkdirSync(join(트리, 'tests', 'g', 'helpers'));
    writeFileSync(join(트리, 'tests', 'g', 'helpers', 'login.ts'), 'export const 로그인 = 1;');
    const 도우미케이스 = (id: string) => `import { 로그인 } from './helpers/login.js';\n${게임케이스.replace('G-FN-001', id)}`;
    writeFileSync(join(트리, 'tests', 'g', 'G-FN-001.spec.ts'), 도우미케이스('G-FN-001'));
    writeFileSync(join(트리, 'tests', 'g', 'G-FN-003.spec.ts'), 도우미케이스('G-FN-003'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/helpers/login.ts'], '앱')).toEqual([
      '⚠️ 폰에서 돌려 보지 않은 앱 케이스 1개 — g/G-FN-001.spec.ts',
      '⚠️ 도우미가 바뀌었는데 폰에서 안 돈 기존 앱 케이스 1개 — 「바뀐 파일 · 케이스가 바로 쓰는 화면」 짝마다 표본 1개만 돈다(돌릴 것 1개). 정식 실행에서 처음 돈다',
    ]);
  });

  it('한 번 초록이던 케이스는 도우미를 고쳐도 다시 안 본다 — 빨갛던 케이스와 케이스 파일을 고친 것만 다시 본다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 자리 = (이름: string) => join(트리, 'tests', 'g', 이름);
    mkdirSync(자리('helpers'));
    const 도우미케이스 = (id: string) => `import { 로그인 } from './helpers/login.js';\n${게임케이스.replace('G-FN-001', id)}`;
    for (const id of ['G-FN-001', 'G-FN-003', 'G-FN-004']) writeFileSync(자리(`${id}.spec.ts`), 도우미케이스(id));
    writeFileSync(자리('helpers/login.ts'), 'export const 로그인 = 1;');
    const 쓴때 = new Date('2030-01-01T00:00:00.000Z');
    const 고친때 = new Date('2030-01-03T00:00:00.000Z');
    for (const 이름 of ['G-FN-001.spec.ts', 'G-FN-003.spec.ts', 'G-FN-004.spec.ts', 'helpers/login.ts']) utimesSync(자리(이름), 쓴때, 쓴때);
    const 바뀐 = ['tests/g/G-FN-001.spec.ts', 'tests/g/G-FN-003.spec.ts', 'tests/g/G-FN-004.spec.ts', 'tests/g/helpers/login.ts'];
    writeFileSync(join(결과폴더, 'gate3-game-1.json'), 결과({ 'g/G-FN-001.spec.ts': 'expected', 'g/G-FN-003.spec.ts': 'unexpected', 'g/G-FN-004.spec.ts': 'expected' }, '2030-01-02T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', 바뀐)).toEqual(['⚠️ 폰에서 빨간 게임 케이스 1개 — g/G-FN-003.spec.ts']);
    // 도우미를 고친다 — 초록이던 001 · 004 는 그대로, 빨갛던 003 만 다시 돌 것이 된다
    utimesSync(자리('helpers/login.ts'), 고친때, 고친때);
    expect(폰끝검사(결과폴더, 트리, 'g', 바뀐)).toEqual([
      '⚠️ 폰에서 돌려 보지 않은 게임 케이스 1개 — g/G-FN-003.spec.ts',
      '⚠️ 도우미 · 화면 파일을 고친 뒤 폰에서 다시 안 돈 초록 게임 케이스 2개 — 한 번 초록이면 다시 돌리지 않는다. 정식 실행에서 다시 돈다',
    ]);
    // 케이스 파일 자체를 고치면 초록이었어도 다시 돈다
    utimesSync(자리('G-FN-004.spec.ts'), 고친때, 고친때);
    expect(폰끝검사(결과폴더, 트리, 'g', 바뀐)).toEqual([
      '⚠️ 폰에서 돌려 보지 않은 게임 케이스 2개 — g/G-FN-003.spec.ts · g/G-FN-004.spec.ts',
      '⚠️ 도우미 · 화면 파일을 고친 뒤 폰에서 다시 안 돈 초록 게임 케이스 1개 — 한 번 초록이면 다시 돌리지 않는다. 정식 실행에서 다시 돈다',
    ]);
  });

  it('폰마다 결과가 다르던 케이스와 기존 케이스 표본은 초록이었어도 도우미를 고치면 다시 본다', () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 자리 = (이름: string) => join(트리, 'tests', 'g', 이름);
    mkdirSync(자리('helpers'));
    writeFileSync(자리('G-FN-001.spec.ts'), `import { 로그인 } from './helpers/login.js';\n${게임케이스}`);
    writeFileSync(자리('helpers/login.ts'), 'export const 로그인 = 1;');
    const 쓴때 = new Date('2030-01-01T00:00:00.000Z');
    const 고친때 = new Date('2030-01-03T00:00:00.000Z');
    for (const 이름 of ['G-FN-001.spec.ts', 'helpers/login.ts']) utimesSync(자리(이름), 쓴때, 쓴때);
    // 기존 케이스(도우미만 바뀜)가 표본으로 초록이었다 — 도우미를 또 고치면 표본은 다시 돈다
    writeFileSync(join(결과폴더, 'gate3-game-1~PHONEA~1.json'), 결과({ 'g/G-FN-001.spec.ts': 'expected' }, '2030-01-02T00:00:00.000Z'));
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/helpers/login.ts'])).toEqual([]);
    utimesSync(자리('helpers/login.ts'), 고친때, 고친때);
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/helpers/login.ts'])).toEqual(['⚠️ 폰에서 돌려 보지 않은 게임 케이스 1개 — g/G-FN-001.spec.ts']);
    // 이번 케이스여도 다른 폰에서 빨갰으면(폰 차이) 초록으로 지키지 않는다
    utimesSync(자리('helpers/login.ts'), 쓴때, 쓴때);
    writeFileSync(join(결과폴더, 'gate3-game-2~PHONEB~1.json'), 결과({ 'g/G-FN-001.spec.ts': 'unexpected' }, '2030-01-02T01:00:00.000Z'));
    const 바뀐 = ['tests/g/G-FN-001.spec.ts', 'tests/g/helpers/login.ts'];
    expect(폰끝검사(결과폴더, 트리, 'g', 바뀐)).toEqual(['⚠️ 폰마다 결과가 다른 게임 케이스 1개 — g/G-FN-001.spec.ts(PHONEB 에서만 빨강)']);
    utimesSync(자리('helpers/login.ts'), 고친때, 고친때);
    expect(폰끝검사(결과폴더, 트리, 'g', 바뀐)).toEqual(['⚠️ 폰에서 돌려 보지 않은 게임 케이스 1개 — g/G-FN-001.spec.ts']);
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

  it('에이전트가 갈아 끼운 링크 파일이 있으면 시작 때 받은 옛 링크 대신 그 링크로 깐다', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const 가짜 = join(트리, 'bin');
    mkdirSync(가짜);
    writeFileSync(join(가짜, 'npx'), `#!/bin/sh\nprintf %s "$PLATFORM_APP" > "$AUTHORING_GATE3_DIR/app.txt"\n`, { mode: 0o755 });
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    const 링크파일 = join(트리, 'app-link.txt');
    const env = {
      PATH: `${가짜}:${process.env.PATH ?? ''}`, AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_APP_FILE: 링크파일,
      PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: 'https://qa.test/api/builds/1/apk?exp=1&sig=old', PLATFORM_BASE_URL: 'http://qa.g.test',
    };

    await 폰실행('앱', 'g', 트리, env);
    expect(readFileSync(join(결과폴더, 'app.txt'), 'utf8')).toBe(env.PLATFORM_APP);

    writeFileSync(링크파일, 'https://qa.test/api/builds/1/apk?exp=2&sig=new\n');
    await 폰실행('앱', 'g', 트리, env);
    expect(readFileSync(join(결과폴더, 'app.txt'), 'utf8')).toBe('https://qa.test/api/builds/1/apk?exp=2&sig=new');
  });

  it('폰마다 계정이 있으면 빈 폰을 더 잡아 나눠 돌고, 한 폰에서만 빨간 케이스는 같은 계정으로 다른 폰에서 다시 돌려 폰 차이로 가른다', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    writeFileSync(join(트리, 'tests', 'g', 'G-FN-003.spec.ts'), 게임케이스.replace('G-FN-001', 'G-FN-003'));
    const 말 = vi.spyOn(console, 'log').mockImplementation(() => {});
    // 가짜 Playwright — 받은 케이스마다 결과를 쓰고, 폰 번호 · 일반 회원 아이디를 남긴다. red-<폰> 파일에 적힌 케이스는 그 폰에서 빨갛다
    const 가짜 = join(트리, 'bin');
    mkdirSync(가짜);
    writeFileSync(
      join(가짜, 'pw.mjs'),
      `import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const 폰 = process.env.PLATFORM_DEVICE_UDID;
const 빨강 = existsSync(process.env.AUTHORING_GATE3_DIR + '/red-' + 폰) ? readFileSync(process.env.AUTHORING_GATE3_DIR + '/red-' + 폰, 'utf8') : '';
const 아이디 = JSON.parse(process.env.PLATFORM_ACCOUNTS).find((a) => a.role === '일반 회원').loginId;
const 파일들 = process.argv.slice(2).filter((a) => a.startsWith('tests/')).map((a) => a.slice(6));
appendFileSync(process.env.AUTHORING_GATE3_DIR + '/runs.txt', 폰 + ' ' + 아이디 + ' ' + 파일들.join(',') + '\\n');
writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify({ config: {}, stats: { startTime: new Date().toISOString() }, suites: 파일들.map((file) => ({ file, specs: [{ tests: [{ projectName: 'android', status: 빨강.includes(file) ? 'unexpected' : 'expected', results: [{ duration: 1000, ...(빨강.includes(file) ? { error: { message: '로그인 승인 화면을 못 찾았다' } } : {}) }] }] }] })) }));
`,
    );
    writeFileSync(join(가짜, 'npx'), `#!/bin/sh\nshift\nshift\nexec node "${join(가짜, 'pw.mjs')}" "$@"\n`, { mode: 0o755 });
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    writeFileSync(join(결과폴더, 'red-RF9R408GKRR'), 'g/G-FN-003.spec.ts');
    const 잡힘 = new Set<string>();
    const 팜 = vi.fn(async (주소: string, 설정?: RequestInit) => {
      if (주소.endsWith('/api/devices/acquire')) {
        if (잡힘.has('RF9R408GKRR')) return new Response('{"refused":"빈 폰 없음"}', { status: 409 });
        잡힘.add('RF9R408GKRR');
        return new Response(JSON.stringify({ held: { serial: 'RF9R408GKRR' } }), { status: 200 });
      }
      const 폰 = /devices\/([^/]+)\/hold/.exec(주소)?.[1];
      if (폰 !== undefined && 설정?.method === 'DELETE') {
        잡힘.delete(폰);
        return new Response('{}', { status: 200 });
      }
      const 폰들 = [
        { serial: 'R3CR10TCVCD', state: 'OCCUPIED', marketName: 'Galaxy S21+ 5G' },
        { serial: 'RF9R408GKRR', state: 잡힘.has('RF9R408GKRR') ? 'OCCUPIED' : 'IDLE', marketName: 'Galaxy A32' },
      ];
      return new Response(JSON.stringify({ value: { devices: 주소.includes('status=idle') ? 폰들.filter((p) => p.state === 'IDLE') : 폰들 } }), { status: 200 });
    });
    const env = {
      PATH: `${가짜}:${process.env.PATH ?? ''}`, AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리),
      PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk',
      PLATFORM_ACCOUNTS: JSON.stringify([
        { baseUrl: 'http://qa.g.test', role: '일반 회원', loginId: 'qa_user1', loginPassword: 'pw-123456' },
        { baseUrl: 'http://qa.g.test', role: '일반 회원 2', loginId: 'qa_par2', loginPassword: 'pw-654321' },
      ]),
    };

    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(3);
    expect(readFileSync(join(결과폴더, 'runs.txt'), 'utf8').trim().split('\n').sort()).toEqual(['R3CR10TCVCD qa_user1 g/G-FN-001.spec.ts', 'RF9R408GKRR qa_par2 g/G-FN-003.spec.ts']);
    expect(잡힘.size).toBe(0);
    expect(existsSync(join(트리, '.appium-cli', 'held-RF9R408GKRR'))).toBe(false);

    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(1);
    expect(readFileSync(join(결과폴더, 'runs.txt'), 'utf8').trim().split('\n').at(-1)).toBe('R3CR10TCVCD qa_par2 g/G-FN-003.spec.ts');
    expect(말.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/폰 차이 1건[\s\S]*G-FN-003\.spec\.ts \(Galaxy A32 RF9R408GKRR 에서만 빨강\): 로그인 승인 화면을 못 찾았다/);
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts', 'tests/g/G-FN-003.spec.ts'], '앱')).toEqual(['⚠️ 폰마다 결과가 다른 앱 케이스 1개 — g/G-FN-003.spec.ts(RF9R408GKRR 에서만 빨강)']);
  });

  it('도중에 끊긴 폰의 기록은 버리고, 폰마다 계정이 없으면 한 대로 돈다', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    const 말 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 가짜 = join(트리, 'bin');
    mkdirSync(가짜);
    writeFileSync(join(가짜, 'npx'), `#!/bin/sh\nfor a; do case "$a" in tests/*) f="\${a#tests/}";; esac; done\nprintf '{"config":{},"stats":{"startTime":"%s"},"suites":[{"file":"%s","specs":[{"tests":[{"projectName":"android","status":"unexpected","results":[{"duration":1000,"error":{"message":"세션이 끊겼다"}}]}]}]}]}' "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" "$f" > "$PLAYWRIGHT_JSON_OUTPUT_FILE"\n`, { mode: 0o755 });
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    let 뽑힘 = false;
    const 팜 = vi.fn(async (주소: string) => {
      const 폰들 = [{ serial: 'R3CR10TCVCD', state: 뽑힘 ? 'OFFLINE' : 'OCCUPIED' }];
      뽑힘 = 주소.endsWith('/api/devices?status=idle') || 뽑힘;
      return new Response(JSON.stringify({ value: { devices: 주소.includes('status=idle') ? [] : 폰들 } }), { status: 200 });
    });
    const env = {
      PATH: `${가짜}:${process.env.PATH ?? ''}`, AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리),
      PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk', PLATFORM_BASE_URL: 'http://qa.g.test',
    };

    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(3);
    const 찍힌 = 말.mock.calls.map((c) => String(c[0])).join('\n');
    expect(찍힌).toMatch(/폰 한 대로 돈다/);
    expect(찍힌).toMatch(/도중에 끊긴 폰 R3CR10TCVCD — 그 폰 기록은 버렸다/);
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts'], '앱')).toEqual(['⚠️ 폰에서 돌려 보지 않은 앱 케이스 1개 — g/G-FN-001.spec.ts']);
  });

  it('PC 게임은 잡은 PC 한 대에서 선언한 윈도우 값마다 따로 돌고(패드 값은 PLATFORM_PAD) 덤 폰을 안 잡으며, 패드 하나에서만 빨간 케이스를 가른다', async () => {
    const { 트리, 결과폴더 } = 트리만들기();
    writeFileSync(join(트리, 'tests', 'g', 'G-FN-001.spec.ts'), 게임케이스.replace("['android']", "['windows']"));
    writeFileSync(join(트리, 'tests', 'g', 'G-FN-003.spec.ts'), 게임케이스.replace('G-FN-001', 'G-FN-003').replace("['android']", "['windows-ps5', 'windows-xbox']"));
    const 말 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    // 가짜 Playwright — 프로젝트 · 패드 · 게임 이름 · PC 번호 · 케이스를 남기고, red-<패드> 파일에 적힌 케이스는 그 패드에서 빨갛다
    const 가짜 = join(트리, 'bin');
    mkdirSync(가짜);
    writeFileSync(
      join(가짜, 'pw.mjs'),
      `import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const 프로젝트 = process.argv.find((a) => a.startsWith('--project=')).slice(10);
const 패드 = process.env.PLATFORM_PAD;
const 빨강 = existsSync(process.env.AUTHORING_GATE3_DIR + '/red-' + 패드) ? readFileSync(process.env.AUTHORING_GATE3_DIR + '/red-' + 패드, 'utf8') : '';
const 파일들 = process.argv.slice(2).filter((a) => a.startsWith('tests/')).map((a) => a.slice(6));
appendFileSync(process.env.AUTHORING_GATE3_DIR + '/runs.txt', [프로젝트, 패드 || '-', process.env.PLATFORM_PC_GAME, process.env.PLATFORM_DEVICE_UDID, 파일들.join(',')].join(' ') + '\\n');
writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify({ config: {}, stats: { startTime: new Date().toISOString() }, suites: 파일들.map((file) => ({ file, specs: [{ tests: [{ projectName: 프로젝트, status: 빨강.includes(file) ? 'unexpected' : 'expected', results: [{ duration: 1000, ...(빨강.includes(file) ? { error: { message: 'Cross 그림이 안 떴다' } } : {}) }] }] }] })) }));
`,
    );
    writeFileSync(join(가짜, 'npx'), `#!/bin/sh\nshift\nshift\nexec node "${join(가짜, 'pw.mjs')}" "$@"\n`, { mode: 0o755 });
    mkdirSync(join(트리, '.control-cli'));
    writeFileSync(join(트리, '.control-cli', 'held'), 'pc-pc1\n');
    writeFileSync(join(결과폴더, 'red-ps5'), 'g/G-FN-003.spec.ts');
    const 팜 = vi.fn(async (주소: string) => {
      if (주소.endsWith('/api/devices/acquire')) throw new Error('PC 게임은 덤 폰을 잡지 않는다');
      return new Response(JSON.stringify({ value: { devices: [{ serial: 'pc-pc1', state: 'OCCUPIED', platform: 'windows' }] } }), { status: 200 });
    });
    const env = {
      PATH: `${가짜}:${process.env.PATH ?? ''}`, AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록(트리), AUTHORING_GAME_DIR: 트리, AUTHORING_GAME_PLATFORM: 'windows',
      PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: 'https://qa.test/api/builds/7/apk?exp=1&sig=a', PLATFORM_BASE_URL: 'http://qa.g.test',
      PLATFORM_ACCOUNTS: JSON.stringify([
        { baseUrl: 'http://qa.g.test', role: '일반 회원', loginId: 'qa_user1', loginPassword: 'pw-123456' },
        { baseUrl: 'http://qa.g.test', role: '일반 회원 2', loginId: 'qa_par2', loginPassword: 'pw-654321' },
      ]),
    };

    expect(await 폰실행('게임', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/PLATFORM_PC_GAME=<이름>/);

    writeFileSync(join(트리, 'tests', 'g', 'G-FN-004.spec.ts'), 게임케이스.replace('G-FN-001', 'G-FN-004'));
    expect(await 폰실행('게임', 'g', 트리, { ...env, PLATFORM_PC_GAME: 'BossRoom' }, 팜 as unknown as typeof fetch)).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/윈도우 값이 없는 케이스 1건 — g\/G-FN-004\.spec\.ts/);
    rmSync(join(트리, 'tests', 'g', 'G-FN-004.spec.ts'));

    expect(await 폰실행('게임', 'g', 트리, { ...env, PLATFORM_PC_GAME: 'BossRoom' }, 팜 as unknown as typeof fetch)).toBe(1);
    expect(readFileSync(join(결과폴더, 'runs.txt'), 'utf8').trim().split('\n')).toEqual([
      'windows - BossRoom pc-pc1 g/G-FN-001.spec.ts',
      'windows-ps5 ps5 BossRoom pc-pc1 g/G-FN-003.spec.ts',
      'windows-xbox xbox BossRoom pc-pc1 g/G-FN-003.spec.ts',
    ]);
    expect(말.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/G-FN-003\.spec\.ts \(PS5 패드 pc-pc1:ps5 에서만 빨강\): Cross 그림이 안 떴다/);
    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/G-FN-001.spec.ts', 'tests/g/G-FN-003.spec.ts'])).toEqual(['⚠️ 폰마다 결과가 다른 게임 케이스 1개 — g/G-FN-003.spec.ts(pc-pc1:ps5 에서만 빨강)']);
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
