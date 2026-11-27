// 정보 모으기 명령 검사 — 인자 읽기 · 열림 조건(맵 시도 수만큼 하고도 못 깬 곳만) · 치트 표시 · call 이 단계마다 나가고 값 파일에 치트가 붙는지 (게임 정보 먼저 쌓기)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 깃발읽기, 실행, 열림조건, 열림판수, 치트표시 } from './authoring-game-info.js';
import type { 판기록 } from './authoring-learn-check.js';

const 폴더들: string[] = [];
afterEach(() => {
  for (const d of 폴더들.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const 줄 = (key: string, data: object) => ({ kind: 'STAGE', key, name: key, line: '', learned: { text: 'ㄱ', belief: 'SEEN', data } });
const 곳줄 = (key: string) => 줄(key, { 상태: '가봄', 장면: 'S', 결과: { 주소: 'ResultText', 깸: '승 리', 짐: '패 배' } });
const 계획줄 = { kind: 'TRIAL', key: 'trial:둘째', name: 't', line: '', learned: { text: 'ㄱ', belief: 'SEEN', data: { 곳: 'stage:둘째' } } };
const 판끝 = (n: number, 글: string): 판기록 => ({
  이름: `20261127${String(n).padStart(9, '0')}-판`,
  값기록: { 계획: 'trial:둘째', 볼값: [], 간격ms: 2000, 때: [], 어긋남: null, 화면다름: [] },
  끝글: [{ 주소: 'ResultText', 경로: '/Canvas/ResultText', 글 }],
});
const 판들 = (수: number, 글 = '패 배'): 판기록[] => Array.from({ length: 수 }, (_, i) => 판끝(i + 1, 글));

describe('깃발읽기', () => {
  it('자료 폴더 · 곳 · call 여럿 · 단계 · 대기를 읽는다', () => {
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/MonsterSpawner|MonsterSpawner.ClearLiveMonsters', '--call', '/MonsterSpawner|MonsterSpawner.SkipWave', '--steps', '6', '--wait', '4'])).toEqual({
      자료: '/자료',
      곳: 'stage:둘째',
      부름들: [{ 주소: '/MonsterSpawner', 메서드: 'MonsterSpawner.ClearLiveMonsters' }, { 주소: '/MonsterSpawner', 메서드: 'MonsterSpawner.SkipWave' }],
      단계: 6,
      대기초: 4,
    });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '//*[@id=1] | //*[@id=2]|A.B'])).toMatchObject({ 부름들: [{ 주소: '//*[@id=1] | //*[@id=2]', 메서드: 'A.B' }], 단계: 10, 대기초: 3 });
  });

  it('--call 은 쉼표로 나눈 인자도 받는다 — 주소에 |가 있어도, 인자가 1.5 꼴이어도 메서드로 안 읽는다', () => {
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|M.CheatSpawnFinalBoss|1'])).toMatchObject({ 부름들: [{ 주소: '/M', 메서드: 'M.CheatSpawnFinalBoss', 인자: ['1'] }] });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '//*[@id=1] | //*[@id=2]|A.B|1.5, "x" ,true'])).toMatchObject({ 부름들: [{ 주소: '//*[@id=1] | //*[@id=2]', 메서드: 'A.B', 인자: ['1.5', 'x', 'true'] }] });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|M.Skip|'])).toMatchObject({ 부름들: [{ 주소: '/M', 메서드: 'M.Skip' }] });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|M.Spawn|Boss.Final'])).toMatchObject({ 부름들: [{ 주소: '/M', 메서드: 'M.Spawn', 인자: ['Boss.Final'] }] });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/a|b/M|M.Skip'])).toMatchObject({ 부름들: [{ 주소: '/a|b/M', 메서드: 'M.Skip' }] });
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|M.없는꼴|1,2'])).not.toBeTypeOf('string');
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|메서드만|1'])).toContain('--call');
    expect(깃발읽기(['/자료', 'stage:둘째', '--call', '/M|Skip|1'])).toContain('--call');
  });

  it('틀린 인자는 까닭 글을 돌려준다', () => {
    const 틀림 = (인자: string[]): string => {
      const r = 깃발읽기(인자);
      expect(typeof r).toBe('string');
      return r as string;
    };
    expect(틀림(['/자료', '곳'])).toContain('--call');
    expect(틀림(['/자료', '곳', '--call', '주소만'])).toContain('--call');
    expect(틀림(['/자료', '곳', '--call', '/a|메서드만'])).toContain('--call');
    expect(틀림(['/자료', '곳', '--call', '/a|B.c', '--steps', '0'])).toContain('--steps');
    expect(틀림(['/자료', '곳', '--call', '/a|B.c', '--steps', 'x'])).toContain('자연수');
    expect(틀림(['/자료', '곳', '--call', '/a|B.c', '--wait', '61'])).toContain('--wait');
    expect(틀림(['/자료', '곳', '--call', '/a|B.c', '--steps', '100', '--wait', '60'])).toContain('한도');
    expect(틀림(['/자료', '--call', '/a|B.c'])).toContain('곳 열쇠');
  });
});

describe('열림조건', () => {
  const 줄들 = [곳줄('stage:둘째'), 계획줄, 줄('stage:메뉴', { 상태: '가봄' })] as never;

  it(`${열림판수}판을 해 보고도 못 깬 곳만 연다`, () => {
    expect(열림조건(줄들, 판들(열림판수), 'stage:둘째')).toMatchObject({ 열림: true, 곳판: { 판: 열림판수, 깸: 0 } });
  });

  it(`판 수가 ${열림판수}판이 안 되거나 이미 정보 모으기를 했으면 까닭을 돌려준다`, () => {
    expect(열림조건(줄들, 판들(열림판수 - 1), 'stage:둘째')).toEqual({ 열림: false, 까닭: expect.stringContaining(`${열림판수 - 1}판 해 봤다`) });
    expect(열림조건(줄들, [], 'stage:둘째')).toMatchObject({ 열림: false });
    const 모음 = { 이름: '20261126070000000-정보모으기', 값: { 정보모으기: { 곳: 'stage:둘째', 단계: 3 } }, 치트: true as const };
    expect(열림조건(줄들, [...판들(열림판수), 모음], 'stage:둘째')).toEqual({ 열림: false, 까닭: expect.stringContaining('이미 정보 모으기를 했') });
  });

  it('이미 깬 곳 · 깰 곳이 아닌 곳은 안 연다', () => {
    expect(열림조건(줄들, [...판들(열림판수 + 1), 판끝(99, '승 리')], 'stage:둘째')).toEqual({ 열림: false, 까닭: expect.stringContaining('이미 깼다') });
    expect(열림조건(줄들, 판들(9), 'stage:메뉴')).toEqual({ 열림: false, 까닭: expect.stringContaining('깰 곳이 아니다') });
    expect(열림조건(줄들, 판들(9), 'stage:없는곳')).toMatchObject({ 열림: false });
  });
});

describe('치트 표시', () => {
  it('쓴 call 을 주소|메서드 글로 적는다', () => {
    expect(치트표시([{ 주소: '/M', 메서드: 'M.Skip' }])).toEqual({ 치트: true, call: ['/M|M.Skip'] });
  });
});

describe('실행', () => {
  const 자료만들기 = (판수: number): { 자료: string; 트리: string } => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'game-info-'));
    폴더들.push(뿌리);
    const 자료 = join(뿌리, 'data');
    const 트리 = join(뿌리, 'tree');
    mkdirSync(join(자료, 'game-play'), { recursive: true });
    mkdirSync(join(트리, '.control-cli'), { recursive: true });
    writeFileSync(join(트리, '.control-cli', 'held'), 'pc-pc1\n');
    const 지도 = [곳줄('stage:둘째'), 계획줄].map((x) => `- ${x.key} · ${x.name} · 배움 ${JSON.stringify(x.learned)}`);
    writeFileSync(join(자료, 'game-map.txt'), ['# 게임 지도', '', '## STAGE (STAGE) — 1개', 지도[0]!, '', '## TRIAL (TRIAL) — 1개', 지도[1]!].join('\n'));
    for (const 판 of 판들(판수)) writeFileSync(join(자료, 'game-play', `${판.이름}.json`), JSON.stringify({ 함수: '판', 값기록: 판.값기록, 끝글: 판.끝글 }));
    return { 자료, 트리 };
  };

  const 가짜 = (명령: Command[], 부르면: (c: Record<string, unknown>) => unknown): Link =>
    (async (c: Command) => {
      const cmd = c as unknown as Record<string, unknown>;
      명령.push(c);
      return 부르면(cmd);
    }) as unknown as Link;

  it(`${열림판수}판이 안 되면 안 열고 call 도 안 보낸다`, async () => {
    const { 자료, 트리 } = 자료만들기(3);
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const 명령: Command[] = [];
    expect(await 실행([자료, 'stage:둘째', '--call', '/M|M.Skip'], 트리, {}, 가짜(명령, () => ({ ok: true })))).toBe(2);
    expect(명령).toEqual([]);
    expect(String(오류.mock.calls[0]?.[0])).toContain('안 연다');
  });

  it('열리면 단계마다 call 을 차례로 보내고, 나온 종류를 값 파일로 남기며 치트 표시를 붙인다', async () => {
    const { 자료, 트리 } = 자료만들기(열림판수);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const 명령: Command[] = [];
    let 목록 = 0;
    const 길 = 가짜(명령, (c) => {
      if (c.cmd === 'find-all') {
        목록 += 1;
        return { ok: true, found: [{ path: '/Stage' }, { path: '/Enemies' }, ...(목록 > 1 ? [{ path: '/Enemies/Ghost(Clone)', id: '7' }] : [])] };
      }
      if (c.cmd === 'scenes') return { ok: true, active: 'S', loaded: [], loads: 0, unloads: 0 };
      if (c.cmd === 'timescale-get') return { ok: true, timeScale: 1 };
      if (c.cmd === 'components') return { ok: true, components: [{ name: 'Ghost', type: 'Game.Ghost' }] };
      if (c.cmd === 'members') return { ok: true, fields: [{ name: 'Hp', type: 'Int32', value: 30 }], properties: [], methods: [] };
      return { ok: true, value: null };
    });
    expect(await 실행([자료, 'stage:둘째', '--call', '/M|M.Clear', '--call', '/M|M.Skip|3,x', '--steps', '2', '--wait', '1'], 트리, {}, 길)).toBe(0);
    const 보냄 = (명령 as unknown as Record<string, unknown>[]).filter((c) => c.cmd === 'call').map((c) => `${c.target}|${c.method}|${(c.args as string[]).join(',')}`);
    expect(보냄).toEqual(['/M|M.Clear|', '/M|M.Skip|3,x', '/M|M.Clear|', '/M|M.Skip|3,x']);
    const 파일 = JSON.parse(readFileSync(join(자료, 'game-props', 'Ghost.json'), 'utf8')) as Record<string, unknown>;
    expect(파일).toMatchObject({ 종류: 'Ghost', 출처: '실행 중', 치트: true, call: ['/M|M.Clear', '/M|M.Skip|3,x'], 칸: { 'Ghost.Hp': 30 } });
    const 기록 = readFileSync(join(자료, 'game-play', readdirSync(join(자료, 'game-play')).find((x) => x.endsWith('-정보모으기.json'))!), 'utf8');
    expect(JSON.parse(기록)).toMatchObject({ 함수: '정보모으기', 치트: true, call: ['/M|M.Clear', '/M|M.Skip|3,x'], 곳: 'stage:둘째' });
    expect(JSON.parse(readFileSync(join(자료, 'game-cheat.json'), 'utf8'))).toMatchObject({ 장면: 'S' });
  }, 15_000);

  it('call 이 거듭 안 먹히면 그치고 1', async () => {
    const { 자료, 트리 } = 자료만들기(열림판수);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const 명령: Command[] = [];
    const 길 = 가짜(명령, (c) => {
      if (c.cmd === 'call') throw new Error('그런 메서드가 없다');
      if (c.cmd === 'find-all') return { ok: true, found: [{ path: '/Stage' }] };
      if (c.cmd === 'scenes') return { ok: true, active: 'S', loaded: [], loads: 0, unloads: 0 };
      if (c.cmd === 'timescale-get') return { ok: true, timeScale: 1 };
      return { ok: true };
    });
    expect(await 실행([자료, 'stage:둘째', '--call', '/M|M.없음', '--steps', '10', '--wait', '1'], 트리, {}, 길)).toBe(1);
    expect((명령 as unknown as Record<string, unknown>[]).filter((c) => c.cmd === 'call')).toHaveLength(2);
    expect(JSON.parse(readFileSync(join(자료, 'game-cheat.json'), 'utf8'))).toMatchObject({ 장면: 'S' });
    // 하나도 안 먹혔으면 정보 모으기를 한 것으로 안 친다 — 다음 맵이 열리면 안 된다
    const 기록 = JSON.parse(readFileSync(join(자료, 'game-play', readdirSync(join(자료, 'game-play')).find((x) => x.endsWith('-정보모으기.json'))!), 'utf8')) as { 값: unknown };
    expect(기록.값).toMatchObject({ 정보모으기: { 단계: 0, 돈단계: 2 } });
  }, 15_000);
});
