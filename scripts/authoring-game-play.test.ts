// 조작 도우미 부르기 검사 — 한 프로세스로 돌리기 · 실패와 한도에서 입력 놓기 · 시간 배율 되돌리기 · 이번 로그만 · 기록 남기기 (도메인/게임 §3.10 「조작 도우미」)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 깃발읽기, 조작도우미자리 } from './authoring-game-play-call.js';
import { 기록남기기, 덧줄, 도중파일이름 } from './authoring-game-play-log.js';
import { 간격정하기, 상한장, 찍기시작 } from './authoring-game-play-shots.js';
import { 돌린다, 실행 } from './authoring-game-play.js';

const 도우미 = `
export async function 걷기(game, 키) {
  await game.keyDown(키);
  const 자리 = await game.get('/Player', 'Transform.position');
  await game.keyUp(키);
  return { 자리 };
}
export async function 던지기(game) {
  await game.keyDown('W');
  throw new Error('벽에 막힘 비밀값123');
}
export const 숫자 = 3;
`;

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

function 트리(잡음 = true): string {
  const t = mkdtempSync(join(tmpdir(), 'game-play-'));
  자리들.push(t);
  mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
  mkdirSync(join(t, '.control-cli'));
  mkdirSync(join(t, 'data'));
  writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 도우미);
  if (잡음) writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
  return t;
}

/** 가짜 게임 — 받은 명령을 적고 앞 번호 뒤의 로그만 준다 */
function 가짜(): { 길: Link; 명령: string[]; 배율: () => number } {
  const 명령: string[] = [];
  let 배율 = 1;
  const 로그 = ['앞 로그', '이번 로그'];
  const 길 = (async (c: Command) => {
    const cmd = c as unknown as Record<string, unknown>;
    명령.push([cmd.cmd, cmd.key].filter((x) => x !== undefined).join(' '));
    const 뒤 = (n: number) => 로그.slice(0, n).map((message, i) => ({ seq: i + 1, occurredAt: 't', type: 'Log', message, stack: '' })).filter((l) => l.seq > Number(cmd.since));
    switch (cmd.cmd) {
      case 'ping': return { ok: true, app: 'g', version: '1' };
      case 'get': return { ok: true, value: [1, 2, 3] };
      case 'timescale-get': return { ok: true, timeScale: 배율 };
      case 'timescale-set': 배율 = Number(cmd.scale); return { ok: true };
      case 'logs': return 명령.includes('key-up W') || 명령.includes('input-reset') ? { ok: true, last: 2, logs: 뒤(2) } : { ok: true, last: 1, logs: 뒤(1) };
      case 'errors': return { ok: true, last: 0, errors: [] };
      case 'events': return { ok: true, last: 0, events: [] };
      case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
      default: return { ok: true };
    }
  }) as unknown as Link;
  return { 길, 명령, 배율: () => 배율 };
}

describe('조작 도우미 부르기', () => {
  it('함수를 한 번에 돌리고 돌려준 값과 이번에 찍힌 로그만 찍고 기록을 남긴다', async () => {
    const t = 트리();
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'play', '걷기', '["W"]', '--max', '5'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    const 글 = 찍힘.mock.calls.map((c) => String(c[0])).join('\n');
    expect(글).toContain('걷기 끝');
    expect(글).toContain('게임 로그 1줄\n  t Log 이번 로그');
    expect(글).not.toContain('앞 로그');
    expect(글).toContain('"자리"');
    expect(g.명령.at(-1)).toBe('screenshot');
    expect(g.명령).not.toContain('timescale-set');
    const 남은 = readdirSync(join(t, 'data', 'game-play')).sort();
    expect(남은.map((x) => x.replace(/^\d+/, ''))).toEqual(['-걷기.jpg', '-걷기.json']);
    expect(JSON.parse(readFileSync(join(t, 'data', 'game-play', 남은[1]!), 'utf8'))).toMatchObject({ 함수: '걷기', 인자: ['W'], 값: { 자리: [1, 2, 3] }, 로그: ['t Log 이번 로그'] });
  });

  it('정보 모으기가 웨이브를 넘긴 표시가 있으면 이 판 기록에 치트를 단다', async () => {
    const t = 트리();
    mkdirSync(join(t, 'data'), { recursive: true });
    writeFileSync(join(t, 'data', 'game-cheat.json'), JSON.stringify({ 장면: 'S', 때: '2026-11-27T00:00:00.000Z' }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'play', '걷기', '["W"]', '--max', '5'], t, { [게임자료환경]: join(t, 'data') }, 가짜().길)).toBe(0);
    const 기록 = readdirSync(join(t, 'data', 'game-play')).find((x) => x.endsWith('.json'))!;
    expect(JSON.parse(readFileSync(join(t, 'data', 'game-play', 기록), 'utf8'))).toMatchObject({ 함수: '걷기', 치트: true });
  });

  it('함수가 던지면 1 — 눌러 둔 입력을 놓고 오류에서 비밀번호를 가린다', async () => {
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 계정 = JSON.stringify([{ role: '일반 회원', loginId: 'qa', loginPassword: '비밀값123', baseUrl: 'http://x.test' }]);
    expect(await 실행(['g', 'play', '던지기'], 트리(), { PLATFORM_ACCOUNTS: 계정 }, g.길)).toBe(1);
    expect(g.명령).toContain('input-reset');
    expect(찍힘.mock.calls[0]?.[0]).toContain('오류: 벽에 막힘 ••••••');
  });

  it('한도를 넘기면 그 뒤 명령을 막고 입력을 놓고 시간 배율을 되돌린다', async () => {
    const g = 가짜();
    const r = await 돌린다(
      g.길,
      async (game) => {
        const d = game as { keyDown(k: string): Promise<void>; setTimeScale(n: number): Promise<void>; get(a: string, b: string): Promise<unknown> };
        await d.setTimeScale(0.25);
        await d.keyDown('W');
        for (;;) await d.get('/Player', 'Transform.position').catch(() => null).then(() => new Promise((다음) => setTimeout(다음, 2)));
      },
      {},
      60,
    );
    expect(r.오류).toContain('제한 시간');
    const 놓음 = g.명령.indexOf('input-reset');
    expect(놓음).toBeGreaterThan(g.명령.indexOf('key-down W'));
    expect(g.명령.slice(놓음)).not.toContain('get');
    expect(g.배율()).toBe(1);
  });

  it('늦게 답하는 누르기는 답을 기다렸다 놓고, 밖에서 끊어도 놓는다', async () => {
    const g = 가짜();
    const 끊기 = new AbortController();
    const 느린: Link = async (c) => {
      if ((c as unknown as { cmd: string }).cmd === 'key-down') {
        끊기.abort();
        await new Promise((다음) => setTimeout(다음, 150));
      }
      return g.길(c);
    };
    const r = await 돌린다(느린, (game) => (game as { keyDown(k: string): Promise<void> }).keyDown('W'), {}, 10_000, 끊기.signal);
    expect(r.오류).toBe('밖에서 명령을 끊었습니다');
    expect(g.명령).toContain('key-down W');
    expect(g.명령.indexOf('input-reset')).toBeGreaterThan(g.명령.indexOf('key-down W'));
  });

  it('명령 종류마다 걸린 시간과 기다림을 재 기록 · 덧줄에 남긴다 — 명령이 하나도 없어도 함수가 돌았으면 남는다', async () => {
    const g = 가짜();
    const 느린: Link = async (c) => {
      const cmd = (c as unknown as { cmd: string }).cmd;
      if (cmd === 'get' || cmd === 'key-down') await new Promise((다음) => setTimeout(다음, 60));
      return g.길(c);
    };
    const r = await 돌린다(
      느린,
      async (game) => {
        const d = game as { keyDown(k: string): Promise<void>; get(a: string, b: string): Promise<unknown> };
        await Promise.all([d.get('/P', 'T.position'), d.keyDown('W')]);
        await new Promise((다음) => setTimeout(다음, 100));
      },
      {},
      5_000,
    );
    expect(r.시간표!.읽기ms).toBeGreaterThanOrEqual(50);
    expect(r.시간표!.입력ms).toBeGreaterThanOrEqual(50);
    expect(r.시간표!.기타ms).toBeLessThan(50);
    expect(r.시간표!.기다림ms).toBeGreaterThanOrEqual(90);
    expect(r.시간표!.읽기ms + r.시간표!.기다림ms).toBeLessThanOrEqual(r.걸린ms + 5);
    expect(덧줄(r, null).some((x) => /^바퀴: 읽기 \d+초 · 입력 \d+초 · 기다림 \d+초$/.test(x))).toBe(true);
    const 없음 = await 돌린다(가짜().길, () => new Promise((다음) => setTimeout(다음, 30)), {}, 5_000);
    expect(없음.시간표).toMatchObject({ 읽기ms: 0, 입력ms: 0, 기타ms: 0 });
    expect(없음.시간표!.기다림ms).toBeGreaterThanOrEqual(25);
  });

  it('기다리지 않은 일이 던져도 거두고, JSON 으로 못 바꾸는 값이어도 기록을 남긴다', async () => {
    const t = 트리();
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'odd.helper.ts'), 'export function 이상한값() { void Promise.reject(new Error("뒤에서")); const a = {}; a.a = a; return new Promise((다음) => setTimeout(() => 다음(a), 20)); }\n');
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'odd', '이상한값'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).toContain('기다리지 않은 일이 던짐: 뒤에서');
    expect(readdirSync(join(t, 'data', 'game-play'))).toHaveLength(2);
    expect(g.명령).toContain('input-reset');
  });

  it('잡은 디바이스가 없거나 함수 · 인자 · 한도가 틀리면 2', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const g = 가짜();
    expect(await 실행(['g', 'play', '걷기'], 트리(false), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '숫자'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '걷기', '{}'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '걷기', '[]', '--max', '9999'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'none', '걷기'], 트리(), {}, g.길)).toBe(2);
    const 깨짐 = 트리();
    writeFileSync(join(깨짐, 'tests', 'g', 'helpers', 'bad.helper.ts'), 'throw new Error("읽다 깨짐");');
    expect(await 실행(['g', 'bad', '걷기'], 깨짐, {}, g.길)).toBe(2);
    expect(g.명령).toEqual([]);
  });

  it('도중 화면 — 간격을 주면 도는 동안 여러 장 찍고, 안 주면 한 장도 안 찍고 명령도 더 안 보낸다', async () => {
    // 간격의 스무 배를 돈다 — 다른 테스트 파일과 같이 돌아 타이머가 밀려도 두 장은 넘게 찍힌다
    const 함수 = (game: unknown) => new Promise((끝) => setTimeout(끝, 400)).then(() => ({ 이름: typeof game }));
    const 켠 = 가짜();
    const r = await 돌린다(켠.길, 함수, {}, 800, undefined, { 도중화면ms: 20 });
    expect(r.도중화면.length).toBeGreaterThan(2);
    expect(r.도중화면[0]!.초).toBeGreaterThanOrEqual(0.02);
    expect(r.도중화면[0]!.그림.toString()).toBe('그림');
    expect(r.도중간격ms).toBe(20);
    expect(켠.명령.at(-1)).toBe('screenshot');
    const 안 = 가짜();
    const 기본 = await 돌린다(안.길, 함수, {}, 600);
    expect(기본.도중화면).toEqual([]);
    const 빈덧 = 가짜();
    await 돌린다(빈덧.길, 함수, {}, 600, undefined, { 도중화면ms: 0 });
    expect(빈덧.명령).toEqual(안.명령);
    expect(안.명령.filter((x) => x === 'screenshot')).toHaveLength(1);
  });

  it('도중 화면을 못 찍어도 함수는 끝까지 돌고 못한것에 한 줄만, 세 번 이어 실패하면 그친다', async () => {
    const g = 가짜();
    let 부름 = 0;
    const 깨진: Link = async (c) => {
      if ((c as unknown as { cmd: string }).cmd === 'screenshot') {
        부름 += 1;
        if (부름 <= 3) throw new Error('찍기 거절');
      }
      return g.길(c);
    };
    const r = await 돌린다(깨진, () => new Promise((끝) => setTimeout(() => 끝('다 돎'), 200)), {}, 2_000, undefined, { 도중화면ms: 10 });
    expect(r.값).toBe('다 돎');
    expect(r.오류).toBeUndefined();
    expect(r.도중화면).toEqual([]);
    expect(r.못한것.filter((x) => x.startsWith('도중 화면'))).toEqual(['도중 화면 3번 못 찍음: 찍기 거절']);
    expect(부름).toBe(4);
  });

  it('도중 화면은 40장까지 — 간격은 한도 안에 40장이 다 들어가게 넓힌다', async () => {
    let 찍음 = 0;
    const 고리 = 찍기시작({ screenshot: async () => (찍음 += 1, Buffer.from('x')) }, 1, Date.now());
    await new Promise((끝) => setTimeout(끝, 300));
    expect(await 고리.끝난다()).toBeNull();
    expect(고리.장들).toHaveLength(상한장);
    expect(상한장).toBe(40);
    expect(찍음).toBe(40);
    expect([간격정하기(5_000, 90_000), 간격정하기(5_000, 420_000), 간격정하기(5_000, 100_000)]).toEqual([5_000, 10_500, 5_000]);
  });

  it('깃발 읽기 — --max · --shots · --freeze 를 떼고 틀린 값은 null', () => {
    expect(깃발읽기(['g', 'play', '걷기'])).toEqual({ 남음: ['g', 'play', '걷기'], 초: 90, 멈춤: false, 초준: false });
    expect(깃발읽기(['g', '--freeze', 'play', '--shots', '3', '걷기', '["W"]', '--max', '30', '--plan', 'trial:가'])).toEqual({ 남음: ['g', 'play', '걷기', '["W"]'], 초: 30, 화면초: 3, 멈춤: true, 초준: true, 계획: 'trial:가' });
    expect(깃발읽기(['g', '--shots', '0'])).toMatchObject({ 화면초: 0 });
    expect([깃발읽기(['--shots', '-1']), 깃발읽기(['--shots', '가나']), 깃발읽기(['--shots', '301']), 깃발읽기(['--shots']), 깃발읽기(['--max', '9999']), 깃발읽기(['--max'])]).toEqual([null, null, null, null, null, null]);
  });

  it('도중 화면 파일 이름은 초를 세 자리로 채운 정수이고, 한 장이 실패해도 나머지는 남긴다', async () => {
    const t = 트리();
    const g = 가짜();
    const r = await 돌린다(g.길, () => 1, {}, 600, undefined, { 도중화면ms: 20 });
    r.도중화면.splice(0, r.도중화면.length, { 초: 5.2, 그림: Buffer.from('a'), 걸린ms: 10 }, { 초: 5.4, 그림: Buffer.from('b'), 걸린ms: 10 }, { 초: 12, 그림: Buffer.from('c'), 걸린ms: 10 });
    const 기록 = 기록남기기(join(t, 'data'), '걷기', [], r, [], new Date('2026-11-25T01:02:03.456Z'));
    expect(기록).not.toBeNull();
    const 이름 = '20261125010203456-걷기';
    expect(도중파일이름(이름, 5.2)).toBe(`${이름}-005s.jpg`);
    const 남은 = readdirSync(join(t, 'data', 'game-play')).sort();
    expect(남은).toEqual([`${이름}-005s.jpg`, `${이름}-012s.jpg`, `${이름}.jpg`, `${이름}.json`]);
    expect(r.못한것.filter((x) => x.includes('005s'))).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(t, 'data', 'game-play', `${이름}.json`), 'utf8'))).not.toHaveProperty('도중화면');
  });

  it('조작 도우미는 기본으로 도중 화면을 켠다 — 출력에 한 줄과 파일, --shots 0 이면 안 찍는다', async () => {
    const t = 트리();
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'slow.helper.ts'), 'export const 느림 = () => new Promise((끝) => setTimeout(() => 끝(1), 1300));\n');
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'slow', '느림', '--shots', '1', '--max', '5'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/도중 화면 1장\(1초 간격 · 한 장 평균 [\d.]+초\) — \d+-느림-001s\.jpg/);
    expect(readdirSync(join(t, 'data', 'game-play')).filter((x) => x.endsWith('s.jpg'))).toHaveLength(1);
    찍힘.mockClear();
    g.명령.length = 0;
    await 실행(['g', 'slow', '느림', '--shots', '0'], t, {}, g.길);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('도중 화면');
    expect(g.명령.filter((x) => x === 'screenshot')).toHaveLength(1);
  });

  it('자료 폴더에 정리 알림이 있으면 출력 맨 끝에 ※ 줄 — 오류로 끝나도 붙는다', async () => {
    const t = 트리();
    writeFileSync(join(t, 'data', 'game-learn.wrap'), '정리하라');
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'play', '걷기', '["W"]', '--shots', '0'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    expect(String(찍힘.mock.calls.at(-1)?.[0])).toBe('※ 정리하라');
    찍힘.mockClear();
    expect(await 실행(['g', 'play', '던지기', '--shots', '0'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(1);
    expect(String(찍힘.mock.calls.at(-1)?.[0])).toBe('※ 정리하라');
  });

  it('도우미 파일은 tests 안 일반 파일만 — 링크와 폴더 밖 이름은 안 된다', () => {
    const t = 트리();
    expect(조작도우미자리(t, 'g', 'play')).not.toBeNull();
    expect(조작도우미자리(t, '..', 'play')).toBeNull();
    expect(조작도우미자리(t, 'g', '../play')).toBeNull();
    expect(조작도우미자리(t, 'g', 'Play')).toBeNull();
    writeFileSync(join(t, 'out.ts'), '');
    symlinkSync(join(t, 'out.ts'), join(t, 'tests', 'g', 'helpers', 'link.helper.ts'));
    expect(조작도우미자리(t, 'g', 'link')).toBeNull();
  });
});
