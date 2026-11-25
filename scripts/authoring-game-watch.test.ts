// 지켜보기 검사 — 이름마다 생긴 것 · 나온 자리 · 길 · 사라진 것 · 바뀐 값 묶기, 화면 그림 빼기, 조작 도우미와 같이 보기 (도메인/게임 §3.10 「지켜보기」)
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 인자읽기, 실행 } from './authoring-game-watch.js';
import { type 자리, type 표본, 요약, 이름만, 자리묶기, 화면그림인가 } from './authoring-game-watch-report.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

const 본것 = (초: number, 것들: Record<string, 자리>, 값: 표본['값'] = {}, 곁: 자리 | null = null): 표본 => ({
  초,
  보인: Object.keys(것들).map((열쇠) => ({ 열쇠, 이름: 열쇠.split('-')[0]!, 경로: `/${열쇠}` })),
  자리: 것들,
  값,
  곁,
});

describe('요약', () => {
  it('새로 나온 것을 나온 자리로 묶는다 — 두 길이 두 곳으로 보인다. 길 · 빠르기도 낸다', () => {
    const 들 = [
      본것(0, {}),
      본것(1, { '유령-1#1': [4, 0, 13], '유령-2#1': [37, 0, 12] }),
      본것(3, { '유령-1#1': [4, 0, 9], '유령-2#1': [37, 0, 8], '유령-3#1': [4.5, 0, 13] }),
    ];
    const 줄 = 요약(들, {}, null);
    expect(줄[0]).toBe('■ 유령 — 처음 0 · 새로 3 · 사라짐 0 · 움직임 2');
    expect(줄[1]).toBe('  나온 자리 2곳 (4.0,0.0,13.0)×2 (37.0,0.0,12.0)×1');
    expect(줄.filter((x) => x.startsWith('  길 '))).toEqual(['  길 1s(4.0,0.0,13.0) → 3s(4.0,0.0,9.0)', '  길 1s(37.0,0.0,12.0) → 3s(37.0,0.0,8.0)']);
    expect(줄).toContain('  빠르기 초당 2.00칸(가운데 값 · 2개)');
  });

  it('값이 언제 얼마나 · 나와 몇 칸에서 바뀌었나, 사라질 때의 거리도 낸다. 가만한 것은 이름만이다', () => {
    const 칸 = 'HP.Value';
    const 들 = [
      본것(0, { '유령-1#1': [0, 0, 5], 나무: [9, 0, 9] }, { [칸]: { '유령-1#1': 20 } }, [0, 0, 0]),
      본것(1, { '유령-1#1': [0, 0, 2], 나무: [9, 0, 9] }, { [칸]: { '유령-1#1': 8 } }, [0, 0, 0]),
      본것(2, { 나무: [9, 0, 9], '고기-1#1': [0, 0, 2] }, { [칸]: {} }, [0, 0, 0]),
    ];
    const 글 = 요약(들, { 유령: { 컴포넌트: ['MonsterAI'], 칸: ['HP.Value'] } }, '/나').join('\n');
    expect(글).toContain('HP.Value 바뀜 1번: 1.0s 20→8(/나 과 2.0)');
    expect(글).toContain('마지막으로 보인 자리 1곳 (0.0,0.0,2.0)×1 · 그때 /나 과 거리 2.0~2.0');
    expect(글).toContain('■ 고기 — 처음 0 · 새로 1');
    expect(글).toContain('컴포넌트 MonsterAI — 칸 HP.Value');
    expect(글).toContain('가만히 있는 것: 나무');
  });

  it('나온 때 자리를 못 읽은 것은 나온 자리로 치지 않고, 같은 값이 새로 와도 바뀐 것이 아니다', () => {
    const 들 = [본것(0, {}), { ...본것(1, { '유령-1#1': [0, 0, 0], '유령-2#1': [5, 0, 5] }), 자리: { '유령-1#1': [0, 0, 0] as 자리 } }, 본것(2, { '유령-1#1': [0, 0, 9], '유령-2#1': [5, 0, 20] }, { 앞: { '유령-1#1': [1, 2] } }), 본것(3, { '유령-1#1': [0, 0, 9], '유령-2#1': [5, 0, 20] }, { 앞: { '유령-1#1': [1, 2] } })];
    const 글 = 요약(들, {}, null).join('\n');
    expect(글).toContain('나온 자리 1곳 (0.0,0.0,0.0)×1 (1개는 나온 때 자리를 못 읽음)');
    expect(글).toContain('앞 읽은 1개는 안 바뀜 — 1개는 안 읽음');
  });

  it('자리 묶기 · 이름 · 화면 그림', () => {
    expect(자리묶기([[0, 0, 0], [1, 0, 0], [30, 0, 0]])).toEqual([{ 자리: [0, 0, 0], 수: 2 }, { 자리: [30, 0, 0], 수: 1 }]);
    expect(이름만('/Pool/Ghost(Clone)[12]')).toBe('Ghost(Clone)');
    expect([화면그림인가('/BossRoomHudCanvas/Icon(Clone)'), 화면그림인가('/PlayerNameUI(Clone)'), 화면그림인가('/Pool/Ghost(Clone)')]).toEqual([true, true, false]);
    expect(요약([], {}, null)[0]).toContain('한 번도 못 봤다');
  });
});

describe('인자읽기', () => {
  it('초 · 곁 · 칸 · 같이 돌릴 함수', () => {
    expect(인자읽기(['--sec', '20', '--near', '/P', '--get', 'Ghost(Clone):HP.HP.Value', '--do', 'g', 'play', '걷기', '[1]', '--max', '5'])).toEqual({ 초: 20, 곁: '/P', 칸: { 'Ghost(Clone)': ['HP.HP.Value'] }, 안에든것: false, 할일: ['g', 'play', '걷기', '[1]', '--max', '5'], 화면초: 5 });
    expect(인자읽기(['--shots', '0'])).toMatchObject({ 화면초: 0 });
    expect(인자읽기(['--shots', '3', '--do', 'g', 'play', '걷기', '--shots', '2', '--freeze'])).toMatchObject({ 화면초: 3, 할일: ['g', 'play', '걷기', '--shots', '2', '--freeze'] });
    expect([인자읽기(['--shots', '-1']), 인자읽기(['--shots', '가']), 인자읽기(['--shots', '301'])]).toEqual([null, null, null]);
    expect(인자읽기(['--nested', '--sec', '9'])).toMatchObject({ 초: 9, 안에든것: true });
    expect([인자읽기(['--sec', '0']), 인자읽기(['--sec', '999']), 인자읽기(['--get', 'Ghost']), 인자읽기(['--do', 'g']), 인자읽기(['--what', '1'])]).toEqual([null, null, null, null, null]);
  });
});

describe('실행', () => {
  function 트리(): string {
    const t = mkdtempSync(join(tmpdir(), 'game-watch-'));
    자리들.push(t);
    mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
    mkdirSync(join(t, '.control-cli'));
    writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 'export async function 공격(game) { await game.key("Z"); await new Promise((r) => setTimeout(r, 700)); return { 눌렀나: true }; }\n');
    return t;
  }
  const 가짜 = (명령: string[]): Link => {
    let 본수 = 0;
    return (async (c: Command) => {
      const cmd = c as unknown as Record<string, unknown>;
      명령.push(String(cmd.cmd));
      switch (cmd.cmd) {
        case 'ping': return { ok: true, app: 'g', version: '1' };
        case 'find-all': 본수 += 1; return { ok: true, found: [{ path: '/Hud/Icon(Clone)', id: '9' }, { path: '/Pool/Ghost(Clone)[0]', id: '1' }, { path: '/Pool/Ghost(Clone)[0]/Fx(Clone)', id: '3' }, ...(본수 > 1 ? [{ path: '/Pool/Ghost(Clone)[1]', id: '2' }] : [])] };
        case 'get': return { ok: true, value: [Number(/id=(\d)/.exec(String(cmd.target))?.[1] ?? 0) * 10, 0, 0] };
        case 'components': return { ok: true, components: [{ name: 'Transform', type: 'UnityEngine.Transform' }, { name: 'MonsterHP', type: 'Game.MonsterHP' }] };
        case 'members': return { ok: true, fields: [{ name: 'HP', type: 'NetworkVariable`1' }, { name: 'MaxHP', type: 'Int32', value: 20 }], properties: [{ name: 'IsOwner', type: 'Boolean', value: true }], methods: [] };
        case 'timescale-get': return { ok: true, timeScale: 1 };
        case 'logs': return { ok: true, last: 0, logs: [] };
        case 'errors': return { ok: true, last: 0, errors: [] };
        case 'events': return { ok: true, last: 0, events: [] };
        case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
        default: return { ok: true };
      }
    }) as unknown as Link;
  };

  it('함수를 돌리는 동안 본다 — 화면 그림과 안에 든 것은 빼고, 값 칸을 알아본다', async () => {
    const 명령: string[] = [];
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['--do', 'g', 'play', '공격'], 트리(), {}, 가짜(명령))).toBe(0);
    const 글 = 찍힘.mock.calls.map((c) => String(c[0])).join('\n');
    expect(글).toContain('■ Ghost(Clone) — 처음 1 · 새로 1');
    expect(글).toContain('나온 자리 1곳 (20.0,0.0,0.0)×1');
    expect(글).toContain('컴포넌트 MonsterHP — 칸 MonsterHP.HP.Value · MonsterHP.MaxHP=20');
    expect(글).not.toContain('Icon');
    expect(글).toContain('뺀 것(--nested 로 본다): Fx(Clone)×1');
    expect(글).not.toContain('■ Fx');
    expect(글).toContain('눌렀나');
    expect(명령).toContain('key');
    expect(명령).toContain('input-reset');
  });

  it('함수가 바로 끝나도 앞뒤를 견주고, 안 보인 이름은 못 읽은 것으로 적는다', async () => {
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const t = 트리();
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 'export const 바로 = () => 1;\n');
    expect(await 실행(['--get', 'Ghost:HP.Value', '--do', 'g', 'play', '바로'], t, {}, 가짜([]))).toBe(0);
    const 글 = 찍힘.mock.calls.map((c) => String(c[0])).join('\n');
    expect(글).toContain('새로 1');
    expect(글).toContain('Ghost 은 한 번도 안 보였다');
  });

  it('도중 화면 — 가만히 볼 때도 --do 일 때도 --shots 로 남기고, 0 이면 끈다. 정리 알림은 맨 끝', async () => {
    const t = 트리();
    mkdirSync(join(t, 'data'));
    writeFileSync(join(t, 'data', 'game-learn.wrap'), '정리하라');
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 환경 = { [게임자료환경]: join(t, 'data') };
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'slow.helper.ts'), 'export const 느림 = () => new Promise((끝) => setTimeout(() => 끝(1), 1300));\n');
    const 켠 = ['--do', 'g', 'slow', '느림', '[]', '--shots', '1', '--max', '20'];
    expect(await 실행(켠, t, 환경, 가짜([]))).toBe(0);
    const 글 = 찍힘.mock.calls.map((c) => String(c[0])).join('\n');
    expect(글).toMatch(/도중 화면 \d+장\(1초 간격/);
    expect(String(찍힘.mock.calls.at(-1)?.[0])).toBe('※ 정리하라');
    expect(readdirSync(join(t, 'data', 'game-play')).some((x) => x.endsWith('s.jpg'))).toBe(true);
    찍힘.mockClear();
    const 명령: string[] = [];
    expect(await 실행(['--shots', '0', '--do', 'g', 'play', '공격', '[]', '--shots', '0'], t, 환경, 가짜(명령))).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('도중 화면');
    expect(명령.filter((x) => x === 'screenshot')).toHaveLength(1);
    찍힘.mockClear();
    expect(await 실행(['--sec', '2', '--shots', '1'], t, 환경, 가짜([]))).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/도중 화면 \d+장\(1초 간격/);
  }, 20_000);

  it('잡은 디바이스가 없으면 2', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = 트리();
    rmSync(join(t, '.control-cli', 'held'));
    expect(await 실행([], t, {}, 가짜([]))).toBe(2);
    expect(오류.mock.calls[0]?.[0]).toContain('잡은 디바이스가 없다');
  });
});
