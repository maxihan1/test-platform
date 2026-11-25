// 게임 배우기 — 건너뛰기 · 2시간 다 쓰기와 컨텍스트 교대 · 세션 사이 올리기 · 이어 배우기 · 시험 뒤 내리기 · 양보 · 놓기 · PR 머리 줄 · 프롬프트
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type 세션거리, type 학습손, 못뜬것은끊김, 학습번호들, 학습하기 } from './authoring-learn.js';
import { 배움올리기, 학습끝줄 } from './authoring-learn-io.js';
import { 배울종류 } from './authoring-learn-map.js';
import { 학습프롬프트 } from './authoring-learn-prompt.js';
import type { 돌린결과 } from './authoring-spawn.js';
import { 컨텍스트크기 } from './authoring-usage.js';

const 분 = 60_000;
const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 결과 = (x: Partial<돌린결과> = {}): 돌린결과 => ({ 코드: 0, 낸것: '낸것', 오류: '', 시간초과: false, 멈춤으로죽음: false, ...x });
const 규칙 = (key: string, x: object = {}) => ({ kind: 'RULE', key, name: '가', learned: { text: 'ㄱ', belief: 'CONFIRMED', seen: 2, build: '59', data: 1, ...x } });
const 지도글 = (줄들: { kind: string; key: string; name: string; learned: object }[]) =>
  ['# 게임 지도', '', ...[...new Set(줄들.map((x) => x.kind))].flatMap((k) => [`## ${k} (${k}) — ${줄들.filter((x) => x.kind === k).length}개`, ...줄들.filter((x) => x.kind === k).map((x) => `- ${x.key} · ${x.name} · 배움 ${JSON.stringify(x.learned)}`)])].join('\n');
const 다배움 = 배울종류.map((k) => ({ ...규칙(`${k.toLowerCase()}:하나`), kind: k }));

let 자료 = '';
/** 서버 지도 — PUT 을 받으면 합치고 GET 이 글로 준다 */
let 서버지도: { kind: string; key: string; name: string; learned: object }[];
let 올린것: { key: string; learned: object | null }[][];
let 시계: number;
let 거절: { status: number; detail?: string } | null;
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
const 읽기 = (이름: string) => JSON.parse(readFileSync(join(자료, 이름), 'utf8')) as Record<string, unknown>;
const 적기 = (...줄들: object[]) => 쓰기('game-learned.json', { elements: 줄들 });

beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-'));
  서버지도 = [];
  올린것 = [];
  시계 = Date.UTC(2026, 10, 25, 3);
  거절 = null;
  쓰기('game-map.txt', 지도글([]));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/game-map')) return new Response(JSON.stringify({ text: 지도글(서버지도) }), { status: 200 });
    if (url.endsWith('/game-elements') && init?.method === 'PUT') {
      if (거절 !== null) return new Response(JSON.stringify({ error: 'BAD_ELEMENT', detail: 거절.detail }), { status: 거절.status });
      const { elements } = JSON.parse(String(init.body)) as { elements: (typeof 서버지도) };
      올린것.push(elements);
      서버지도 = [...서버지도.filter((x) => !elements.some((e) => e.key === x.key)), ...elements.filter((e) => e.learned !== null)];
      return new Response(null, { status: 204 });
    }
    return new Response('{}', { status: 404 });
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

type 세션 = (거리: 세션거리, 끊기: AbortSignal, 먹기: (줄: string) => void) => Partial<돌린결과> | void | Promise<Partial<돌린결과> | void>;
/** 세션마다 할 일을 차례로 주는 손. 세션 하나는 10분이 간 것으로 친다 */
function 손(세션들: 세션[], x: Partial<학습손> = {}) {
  const 거리들: 세션거리[] = [];
  const 끔 = vi.fn();
  // 첫 세션이 잡고, 놓으면 풀린다
  let 쥠 = false;
  const o: 학습손 = {
    통로, 자료, 비밀: [], 못함: null,
    빌드: async () => '59',
    프롬프트: (거리) => (거리들.push(거리), `글${거리들.length}`),
    한번: vi.fn(async (글짓기, 끊기, 먹기) => {
      글짓기();
      쥠 = true;
      const r = await 세션들[거리들.length - 1]?.(거리들.at(-1)!, 끊기, 먹기);
      시계 += 10 * 분;
      return { 돌린것: 결과(r ?? {}), 크레딧으로: false, 앞낸것: null };
    }),
    거두기: vi.fn(async () => true),
    늘리기: vi.fn(() => 끔),
    쥐었나: () => 쥠,
    놓기: vi.fn(async () => void (쥠 = false)),
    양보: vi.fn(async () => false),
    빈것기다리기: vi.fn(async () => true),
    멈추라했다: () => false,
    알린다: vi.fn(),
    지금: () => 시계,
    ...x,
  };
  return { o, 거리들, 끔 };
}

describe('학습하기 — 건너뛰기', () => {
  it('지도에 배울 것이 없으면 세션을 안 띄우고 디바이스도 안 잡는다', async () => {
    쓰기('game-map.txt', 지도글(다배움));
    const { o } = 손([]);
    expect(await 학습하기(o)).toEqual({ 앞낸것: [] });
    expect(o.한번).not.toHaveBeenCalled();
    expect(o.늘리기).not.toHaveBeenCalled();
    expect(await 학습끝줄(통로, 자료, [])).toEqual([]);
  });

  it('탐색을 지난 폴더 · 학습을 마친 폴더를 이어받으면 안 배운다', async () => {
    쓰기('game-explore.done', '탐색 플레이: 목표 1개');
    const { o } = 손([]);
    await 학습하기(o);
    rmSync(join(자료, 'game-explore.done'));
    쓰기('game-learn.json', { 쓴ms: 1, 세션: 1, 끝: true, 열쇠: [] });
    await 학습하기(o);
    expect(o.한번).not.toHaveBeenCalled();
  });

  it('디바이스 팜이 없거나 지도를 못 받았으면 안 배우고 PR 머리에 까닭을 적는다', async () => {
    const { o } = 손([], { 못함: '팜 없음' });
    await 학습하기(o);
    expect(await 학습끝줄(통로, 자료, [])).toEqual(['게임 학습: 안 함 — 팜 없음']);
    rmSync(join(자료, 'game-map.txt'));
    await 학습하기(손([]).o);
    expect(await 학습끝줄(통로, 자료, [])).toEqual(['게임 학습: 안 함 — 게임 지도를 못 받았다']);
  });
});

describe('학습하기 — 세션을 잇는다', () => {
  it('세션마다 적은 줄을 올리고 지도를 다시 받아 다음 세션이 이어 배운다 — 두 세션 이어 한 줄도 못 배우면 시험으로 간다', async () => {
    const { o, 거리들, 끔 } = 손([() => 적기(규칙('rule:1')), () => 적기(규칙('rule:2')), () => undefined, () => 적기(규칙('rule:3')), () => undefined, () => undefined, () => undefined]);
    const r = await 학습하기(o);
    expect(올린것.map((x) => x.map((e) => e.key))).toEqual([['rule:1'], ['rule:2'], ['rule:3']]);
    expect(existsSync(join(자료, 'game-learned.json'))).toBe(false);
    expect(readFileSync(join(자료, 'game-map.txt'), 'utf8')).toContain('rule:3');
    expect(거리들.map((x) => (x.시험 === true ? '시험' : x.차례))).toEqual([1, 2, 3, 4, 5, 6, '시험']);
    expect(거리들.map((x) => x.놓음)).toEqual([true, false, false, false, false, false, false]);
    expect(r).toEqual({ 앞낸것: Array(7).fill('낸것') });
    expect(읽기('game-learn.json')).toMatchObject({ 세션: 7, 끝: true, 쓴ms: 70 * 분, 열쇠: ['rule:1', 'rule:2', 'rule:3'] });
    // 세션 사이에는 쥔 채이고 다 배운 뒤 한 번 놓는다
    expect(o.놓기).toHaveBeenCalledTimes(1);
    expect(끔).toHaveBeenCalledTimes(1);
  });

  it('물음이 떨어져도 2시간을 다 쓴다 — 시험 몫 15분을 남기고 배우고, 남은 시간은 시험이 쓴다', async () => {
    let n = 0;
    const { o, 거리들 } = 손([], { 한번: undefined as never });
    const 띄운: 학습손['한번'] = async (글짓기) => {
      글짓기();
      if (거리들.at(-1)!.시험 !== true) 적기(...(n === 0 ? 다배움 : [규칙(`rule:${n}`)]));
      n += 1;
      시계 += 10 * 분;
      return { 돌린것: 결과(), 크레딧으로: false, 앞낸것: null };
    };
    await 학습하기({ ...o, 한번: 띄운 });
    expect(거리들.map((x) => x.남은분)).toEqual([105, 95, 85, 75, 65, 55, 45, 35, 25, 15, 20]);
    expect(거리들.map((x) => x.시험 === true).indexOf(true)).toBe(10);
  });

  it('배울 시간 105분이면 끊고, 5분 전에 정리하라는 알림을 남긴다', async () => {
    vi.useFakeTimers();
    let 알림 = '';
    const 멈춘세션: 세션 = (_거리, 끊기) => new Promise((끝) => {
      setTimeout(() => (알림 = readFileSync(join(자료, 'game-learn.wrap'), 'utf8')), 101 * 분);
      끊기.addEventListener('abort', () => 끝({ 코드: null, 마감으로끊김: true }));
    });
    const { o, 거리들 } = 손([멈춘세션, () => undefined]);
    const 돎 = 학습하기(o);
    await vi.advanceTimersByTimeAsync(99 * 분);
    expect(existsSync(join(자료, 'game-learn.wrap'))).toBe(false);
    await vi.advanceTimersByTimeAsync(6 * 분 + 1);
    await 돎;
    expect(알림).toContain('5분 남았다');
    // 마감으로 끊긴 것은 멈춤 · 끊김이 아니다 — 시험까지 이어 간다
    expect(거리들.map((x) => x.시험 === true)).toEqual([false, false, true]);
  });

  it('컨텍스트 창의 55% 면 정리 알림, 60% 면 교대한다 — 보조 AI 줄은 안 센다', async () => {
    const 줄 = (n: number, 보조 = false) => JSON.stringify({ type: 'assistant', parent_tool_use_id: 보조 ? 'x' : null, message: { usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: n - 10 } } });
    const 본: unknown[] = [];
    const { o } = 손([(_거리, 끊기, 먹기) => {
      먹기(줄(700_000, true));
      먹기(줄(549_999));
      본.push(existsSync(join(자료, 'game-learn.wrap')));
      먹기(줄(550_000));
      본.push(readFileSync(join(자료, 'game-learn.wrap'), 'utf8').includes('컨텍스트'), 끊기.aborted);
      먹기(줄(600_000));
      본.push(끊기.aborted);
      return { 코드: null, 마감으로끊김: true };
    }, () => undefined]);
    await 학습하기(o);
    expect(본).toEqual([false, true, false, true]);
    expect(컨텍스트크기(줄(20))).toBe(20);
    expect(컨텍스트크기(줄(20, true))).toBeNull();
    expect(컨텍스트크기('{"type":"result"}')).toBeNull();
  });

  it('이어받으면 쓴 시간 · 세션을 잇는다 — 시간이 다 됐으면 시험도 못 봤다고 적는다', async () => {
    쓰기('game-learn.json', { 쓴ms: 115 * 분, 세션: 3, 끝: false, 열쇠: ['rule:1'] });
    const { o } = 손([]);
    await 학습하기(o);
    expect(o.한번).not.toHaveBeenCalled();
    expect(await 학습끝줄(통로, 자료, [])).toEqual(['게임 학습: 세션 3번 · 115분 — 시험: 시험을 못 봄(배우는 데 시간을 다 씀)']);
  });

  it('사람이 멈추거나 끊기거나 못 띄우면 적은 줄을 올린 뒤 그 결과로 작성을 끝낸다', async () => {
    for (const x of [{ 코드: null, 멈춤으로죽음: true }, { 코드: 1 }, { 코드: null, 오류: 'spawn claude ENOENT' }, { 코드: null, 시간초과: true }]) {
      rmSync(join(자료, 'game-learn.json'), { force: true });
      올린것 = [];
      const { o } = 손([() => (적기(규칙('rule:1')), x)]);
      const r = await 학습하기(o);
      expect(r.끝?.돌린것).toMatchObject(x);
      expect(r.앞낸것).toEqual([]);
      expect(올린것).toHaveLength(1);
      // 끊긴 세션은 세지 않는다 — 세면 반영은 이어받았을 때 한 번도 안 배우고 끝난다
      expect(읽기('game-learn.json')).toMatchObject({ 끝: false, 세션: 0, 쓴ms: 10 * 분 });
      expect(o.놓기).toHaveBeenCalled();
    }
  });

  it('반영이 한도에 걸려 멈췄다 이어받으면 남은 시간만큼 다시 배운다', async () => {
    const 첫 = 손([() => ({ 코드: 1 })], { 번호들: ['CG-REQ-001'] });
    expect((await 학습하기(첫.o)).끝).toBeDefined();
    const 둘 = 손([() => 적기(규칙('rule:1'))], { 번호들: ['CG-REQ-001'] });
    await 학습하기(둘.o);
    expect(둘.거리들).toMatchObject([{ 남은분: 20, 차례: 1 }]);
  });

  it('앞 세션이 돈 뒤 다음 세션이 못 뜨면 실패가 아니라 끊김이다 — 배운 폴더와 토큰을 지킨다', async () => {
    const r = await 학습하기(손([() => 적기(규칙('rule:1')), () => ({ 코드: null, 오류: 'spawn claude EAGAIN' })]).o);
    expect(r.끝?.돌린것).toMatchObject({ 코드: 1, 오류: 'spawn claude EAGAIN' });
    expect(r.앞낸것).toEqual(['낸것']);
    expect(못뜬것은끊김(결과({ 코드: null }), [])).toMatchObject({ 코드: null });
    expect(못뜬것은끊김(결과({ 코드: null, 멈춤으로죽음: true }), ['x'])).toMatchObject({ 코드: null });
  });

  it('크레딧이 도중에 떨어져 이어 띄우면 프롬프트를 다시 짓는다 — 쥔 디바이스 · 남은 시간 · 정리 알림', async () => {
    const { o, 거리들 } = 손([], {
      한번: vi.fn(async (글짓기: () => string) => {
        글짓기();
        쓰기('game-learn.wrap', '컨텍스트가 거의 찼다');
        시계 += 20 * 분;
        글짓기();
        expect(existsSync(join(자료, 'game-learn.wrap'))).toBe(false);
        return { 돌린것: 결과({ 코드: 1 }), 크레딧으로: false, 앞낸것: null };
      }),
      쥐었나: vi.fn().mockReturnValueOnce(false).mockReturnValue(true),
    });
    await 학습하기(o);
    expect(거리들).toMatchObject([{ 남은분: 105, 놓음: true }, { 남은분: 85, 놓음: false }]);
  });

  it('디바이스를 못 잡고 끝난 세션 뒤에는 쥐었다고 알리지도 비켜 주지도 않는다', async () => {
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1')), () => undefined], { 쥐었나: () => false, 양보: vi.fn(async () => true) });
    await 학습하기(o);
    expect(거리들.every((x) => x.놓음)).toBe(true);
    expect(o.양보).not.toHaveBeenCalled();
  });

  it('마지막 세션이 남긴 정리 알림을 지운다 — 케이스를 쓰는 세션의 찾기 명령에 안 찍힌다. 안 배우는 폴더에서도 지운다', async () => {
    await 학습하기(손([() => 쓰기('game-learn.wrap', 'ㄱ'), () => 쓰기('game-learn.wrap', 'ㄱ')]).o);
    expect(existsSync(join(자료, 'game-learn.wrap'))).toBe(false);
    쓰기('game-learn.wrap', 'ㄱ');
    await 학습하기(손([]).o);
    expect(existsSync(join(자료, 'game-learn.wrap'))).toBe(false);
  });

  it('세션이 끝난 뒤 온 멈춤은 사람 멈춤으로 끝낸다 · 못 거두면 바로 끝낸다', async () => {
    const 멈춤 = await 학습하기(손([() => undefined], { 멈추라했다: () => true }).o);
    expect(멈춤.끝?.돌린것.멈춤으로죽음).toBe(true);
    rmSync(join(자료, 'game-learn.json'));
    const { o } = 손([() => 적기(규칙('rule:1'))], { 거두기: async () => false });
    expect((await 학습하기(o)).끝).toBeDefined();
    expect(올린것).toEqual([]);
  });

  it('기다리는 정식 실행이 있으면 세션 경계에서 놓고 다음 세션에 다시 잡으라고 알린다', async () => {
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1')), () => undefined, () => undefined], { 양보: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false) });
    await 학습하기(o);
    expect(거리들.map((x) => x.놓음)).toEqual([true, true, false, false]);
    expect(o.놓기).toHaveBeenCalledTimes(2);
    // 첫 세션 앞과 다 배운 뒤에는 묻지 않는다
    expect(o.양보).toHaveBeenCalledTimes(3);
    expect(o.빈것기다리기).toHaveBeenCalledTimes(1);
  });

  it('비켜 준 뒤 다시 안 비면 배우기를 그치고 작성은 간다 · 기다리다 사람이 멈추면 멈춤으로 끝낸다', async () => {
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1'))], { 양보: async () => true, 빈것기다리기: async () => false });
    expect((await 학습하기(o)).끝).toBeUndefined();
    expect(거리들).toHaveLength(1);
    expect((await 학습끝줄(통로, 자료, []))[0]).toContain('비켜 준 PC 가 다시 비지 않음');
    rmSync(join(자료, 'game-learn.json'));
    let 멈춤 = false;
    const 손2 = 손([() => 적기(규칙('rule:2'))], { 양보: async () => true, 빈것기다리기: async () => (멈춤 = true), 멈추라했다: () => 멈춤 });
    const r = await 학습하기(손2.o);
    expect(r.끝?.돌린것.멈춤으로죽음).toBe(true);
    expect(r.앞낸것).toEqual(['낸것']);
  });

  it('서버가 줄을 안 받으면 다음 세션에 까닭을 넘기고 적은 파일을 지키며, 작성 끝에 한 번 더 올린다', async () => {
    거절 = { status: 400, detail: 'elements.0.key' };
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1')), () => undefined]);
    await 학습하기(o);
    expect(거리들[1]).toMatchObject({ 못올림: ['배운 줄을 서버가 안 받았다(400 elements.0.key)'] });
    expect(existsSync(join(자료, 'game-learned.json'))).toBe(true);
    거절 = null;
    await 학습끝줄(통로, 자료, []);
    expect(서버지도.map((x) => x.key)).toEqual(['rule:1']);
  });

  it('반영 · 이어 작성은 고친 요구에 닿는 것만 한 세션이고 시험은 안 본다', async () => {
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1'))], { 번호들: ['CG-REQ-001'] });
    await 학습하기(o);
    expect(거리들).toHaveLength(1);
    expect(거리들[0]).toMatchObject({ 부분: true, 남은분: 30, 배울것: { 번호: ['CG-REQ-001'], 빈종류: [] } });
    expect((await 학습끝줄(통로, 자료, []))[0]).toContain('안 봄(고친 요구에 닿는 줄만 30분 배움)');
  });
});

describe('학습하기 — 시험', () => {
  it('틀린 줄을 「덜 봄」으로 내려 올리고, 남은 시간에 그 줄을 다시 배운다', async () => {
    const 시험: 세션 = () => {
      expect((읽기('game-exam.json') as unknown as { 열쇠: string }[]).map((x) => x.열쇠)).toEqual(['rule:1', 'rule:2']);
      쓰기('game-exam-answer.json', { 예측: [{ 열쇠: 'rule:1', 조건: 'ㄱ', 예측: { 값: 1 } }, { 열쇠: 'rule:2', 조건: 'ㄱ', 예측: { 값: 1 } }], 결과: [{ 열쇠: 'rule:1', 잰값: [1] }, { 열쇠: 'rule:2', 잰값: [9] }], 판: { 끝: true, 이김: true, 기록: '없음.json' } });
    };
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1'), 규칙('rule:2')), () => undefined, () => undefined, 시험, () => undefined]);
    await 학습하기(o);
    expect(올린것.at(-1)).toEqual([{ ...규칙('rule:2'), learned: { ...규칙('rule:2').learned, belief: 'SEEN' } }]);
    expect(거리들).toHaveLength(5);
    // 틀린 줄만 다시 배운다 — 빈 종류 · 남은 궁금한 것 · 물음 트리는 안 싣는다
    expect(거리들[4]).not.toHaveProperty('트리');
    expect(거리들[4]).toMatchObject({ 틀림: true, 배울것: { 빈종류: [], 궁금: ['rule:2'], 빌드다름: [], 게임글: [] } });
    expect((await 학습끝줄(통로, 자료, []))[0]).toBe('게임 학습: 세션 5번 · 50분 — 시험: 첫 판을 끝냈다고 했지만 조작 기록 없음 · 예측 2개 — 맞음 1 · 틀림 1 — 「확인」에서 내린 줄: rule:2');
  });

  it('첫 판은 시험 세션이 남긴 조작 기록이어야 간 것이다 — 앞 세션의 기록 · 폴더 이름은 안 친다. 까닭의 비밀번호는 자르기 전에 본다', async () => {
    mkdirSync(join(자료, 'game-play'));
    쓰기('game-play/옛것.json', '{}');
    utimesSync(join(자료, 'game-play', '옛것.json'), 1, 1);
    const 시험 = (판: object): 세션 => () => (쓰기('game-play/새것.json', '{}'), 쓰기('game-exam-answer.json', { 예측: [], 결과: [], 판 }));
    const 성적 = async (판: object, 비밀: string[] = []) => {
      rmSync(join(자료, 'game-learn.json'), { force: true });
      await 학습하기(손([() => undefined, () => undefined, 시험(판)], { 비밀 }).o);
      return String(읽기('game-learn.json').시험);
    };
    expect(await 성적({ 끝: true, 기록: '새것.json' })).toContain('첫 판 끝까지 감');
    expect(await 성적({ 끝: true, 기록: '옛것.json' })).toContain('조작 기록 없음');
    expect(await 성적({ 끝: true, 기록: '..' })).toContain('조작 기록 없음');
    // 같은 이름으로 남는 화면 파일은 기록이 아니다
    쓰기('game-play/새것-005s.jpg', 'x');
    expect(await 성적({ 끝: true, 기록: '새것-005s.jpg' })).toContain('조작 기록 없음');
    expect(await 성적({ 끝: false, 까닭: `${'가'.repeat(76)}pw-secret-1` }, ['pw-secret-1'])).not.toContain('pw-');
  });

  it('다 맞히면 다시 배우지 않는다', async () => {
    const { o, 거리들 } = 손([() => undefined, () => undefined, () => 쓰기('game-exam-answer.json', { 예측: [], 결과: [] })]);
    await 학습하기(o);
    expect(거리들).toHaveLength(3);
  });
});

describe('학습끝줄', () => {
  it('시험 성적 · 버그 후보 · 사람에게 물을 것만 — 배운 규칙은 안 싣는다. 비밀번호가 섞이면 글을 안 적는다', async () => {
    쓰기('game-learn.json', { 쓴ms: 분, 세션: 1, 끝: true, 시험: '첫 판 끝까지 감(이김)', 열쇠: ['rule:1', 'odd:1', 'ask:1'] });
    쓰기('game-map.txt', 지도글([규칙('rule:1'), { ...규칙('odd:1', { text: '체력이 0 인데 안 진다' }), kind: 'ODD' }, { ...규칙('ask:1', { data: { 막힘: '계정 하나 더' } }), kind: 'ASK' }]));
    expect(await 학습끝줄(통로, 자료, [])).toEqual(['게임 학습: 세션 1번 · 1분 — 시험: 첫 판 끝까지 감(이김)', '게임 버그 후보: 가 — 체력이 0 인데 안 진다', '게임에서 사람에게 물을 것: 가(계정 하나 더)']);
    expect((await 학습끝줄(통로, 자료, ['끝까지 감']))[0]).toBe('게임 학습: 테스트 계정 비밀번호가 들어 있어 안 적음');
  });
});

describe('배움올리기', () => {
  it('지도를 다시 못 받으면 적은 파일을 남긴다 — 먼저 지우면 다음 세션 지도에서 이번 줄이 사라진다', async () => {
    적기(규칙('rule:1'));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/game-elements') ? new Response(null, { status: 204 }) : new Response('{}', { status: 500 }))));
    const r = await 배움올리기(통로, 자료, []);
    expect(r.열쇠).toEqual(['rule:1']);
    expect(r.못올림[0]).toContain('지도를 다시 못 받았다');
    expect(existsSync(join(자료, 'game-learned.json'))).toBe(true);
  });

  it('비밀번호가 든 줄은 안 올린다', async () => {
    적기(규칙('rule:1', { text: 'pw-secret-1' }));
    expect((await 배움올리기(통로, 자료, ['pw-secret-1'])).못올림).toEqual(['배운 줄에 테스트 계정 비밀번호가 들어 있다']);
    expect(올린것).toEqual([]);
  });
});

describe('학습하기 — 쪽지', () => {
  it('앞 세션이 지도에 남긴 쪽지를 다음 학습 세션에 넘긴다 — 시험 세션에는 안 준다', async () => {
    const 쪽지줄 = { kind: 'PLAY', key: 'play:쪽지', name: '쪽지', learned: { text: '첫 맵 3판 다 짐. 다음에는 길 옆에 심어 본다', belief: 'GUESS' } };
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1'), 쪽지줄), () => 적기(규칙('rule:2')), () => undefined, () => undefined]);
    await 학습하기(o);
    expect(거리들[0]).not.toHaveProperty('쪽지');
    expect(거리들[1]).toMatchObject({ 차례: 2, 쪽지: '첫 맵 3판 다 짐. 다음에는 길 옆에 심어 본다' });
    expect(거리들.find((x) => x.시험 === true)).not.toHaveProperty('쪽지');
  });

  it('쪽지만 고쳐 쓴 세션은 한 줄도 안 배운 세션이다', async () => {
    const 쪽지줄 = { kind: 'PLAY', key: 'play:쪽지', name: '쪽지', learned: { text: '아직 못 풀었다', belief: 'GUESS' } };
    const { o, 거리들 } = 손([() => 적기(쪽지줄), () => 적기(쪽지줄), () => undefined]);
    await 학습하기(o);
    expect(거리들.map((x) => x.시험 === true)).toEqual([false, false, true]);
  });
});

describe('학습하기 — 물음 트리', () => {
  it('열린 물음이 어디서 나왔나를 다음 세션에 트리로 넘긴다', async () => {
    const 유령 = { kind: 'BEHAVIOR', key: 'behavior:유령', name: '유령', learned: { text: 'ㄱ', belief: 'SEEN', seen: 1 } };
    const 물음 = { kind: 'ASK', key: 'ask:죽으면', name: '죽으면 무엇이 생기나', learned: { text: 'ㄱ', belief: 'GUESS', data: { 어디서: 'behavior:유령' } } };
    const { o, 거리들 } = 손([() => 적기(유령, 물음)]);
    await 학습하기(o);
    expect(거리들[0]).not.toHaveProperty('트리');
    expect(거리들[1]).toMatchObject({ 트리: ['- behavior:유령 · 유령 [덜 봄]', '  - ? ask:죽으면 · 죽으면 무엇이 생기나'] });
    expect(거리들.find((x) => x.시험 === true)).not.toHaveProperty('트리');
  });
});

describe('학습하기 — 멈춰 둔 판', () => {
  it('앞 세션이 판을 멈춘 채 끝났으면 쥔 디바이스의 다음 세션에 알리고, 디바이스를 놓을 때 표시를 지운다', async () => {
    const 멈춘다 = () => 쓰기('game-freeze.json', { 배율: 1, 때: new Date().toISOString() });
    const { o, 거리들 } = 손([() => (적기(규칙('rule:1')), 멈춘다()), () => 적기(규칙('rule:2')), () => undefined, () => undefined]);
    await 학습하기(o);
    expect(거리들[0]).not.toHaveProperty('멈춤');
    expect(거리들[1]).toMatchObject({ 차례: 2, 멈춤: true });
    expect(거리들.find((x) => x.시험 === true)).toMatchObject({ 멈춤: true });
    expect(existsSync(join(자료, 'game-freeze.json'))).toBe(false);
  });

  it('표시가 남아 있어도 디바이스를 안 쥐고 있으면 멈춘 판이 아니다 — 놓은 게임은 꺼졌다', async () => {
    쓰기('game-freeze.json', { 배율: 1, 때: new Date().toISOString() });
    const { o, 거리들 } = 손([() => 적기(규칙('rule:1')), () => undefined, () => undefined]);
    await 학습하기(o);
    expect(거리들[0]).not.toHaveProperty('멈춤');
  });
});

describe('학습번호들', () => {
  it('반영은 다시 씀 · 새 항목, 이어 작성은 남은 번호, 그 밖은 전체다', () => {
    expect(학습번호들({ 반영: { 다시씀: [{ 번호: 'A' }], 새항목: ['B'] } })).toEqual(['A', 'B']);
    expect(학습번호들({ 이어작성: { 남은: ['C'] } })).toEqual(['C']);
    expect(학습번호들({})).toBeUndefined();
  });
});

describe('학습프롬프트', () => {
  const 재료 = { 서비스: 'CGP', 폴더: 'catsgo-pc', 자료: '/자료', 화면: { 못읽음: 'ㄱ', 게임: true as const, PC: { 패드: [] } }, 계획: [], 지금판: '/자료/prd-now.json', 항목수: 0, 가이드: null };
  const 배울것 = { 빈종류: ['RULE'], 궁금: ['ask:1'], 안잰글: ['rule:글1', 'rule:글2'], 안써봄: ['rule:치료'], 빌드다름: [], 게임글: [], 번호: [] };

  it('학습 — 지침 · 남은 시간 · 빌드 · 배울 것을 주고 놓지 말라고 한다. 케이스 작성 스킬은 부르지 않는다', () => {
    const 글 = 학습프롬프트(재료, { 배울것, 남은분: 30, 빌드: '59', 놓음: true, 못올림: [], 부분: false, 차례: 1 });
    expect(글).toContain('references/game-learn.md');
    expect(글).toContain('이 세션은 30분이다');
    expect(글).toContain('지금 빌드: 59');
    expect(글).toContain('빈 종류: RULE');
    expect(글).not.toContain('안 잰 칸');
    expect(글).toContain('`release` 하지 마라');
    expect(글).toContain('[단계] 게임 배우기');
    expect(글).toContain('글로 된 자료가 없다');
    expect(글).toContain('튜토리얼 끝까지');
    expect(글).toContain('알림이 없으면 끝내지 않는다');
    expect(글).toContain('읽기만 하고 안 해 본 것 2');
    expect(글).toContain('판에서 아직 안 써 본 것 1: rule:치료');
    expect(글).toContain('authoring-game-tree.ts /자료');
    expect(글).toContain('authoring-game-props.ts <주소>');
    for (const 좁은 of [{ 부분: true, 차례: 1 }, { 부분: false, 차례: 3, 틀림: true as const }]) {
      const 좁은글 = 학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: true, 못올림: [], ...좁은 });
      expect(좁은글).not.toContain('튜토리얼 끝까지');
      expect(좁은글).toContain('위에 적은 것을 다 배웠을 때 끝낸다');
    }
    expect(글).not.toMatch(/^\/tpx-author/);
  });

  it('쪽지 — 앞 AI 가 남긴 말을 「배울 것」 맨 위에 생각일 뿐이라는 말과 함께 싣는다. 없으면 안 싣는다', () => {
    const 글 = 학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: false, 못올림: [], 부분: false, 차례: 2, 쪽지: '첫 맵 3판 다 짐\n다음에는 길 옆에 심어 본다' });
    expect(글).toContain('> 첫 맵 3판 다 짐\n> 다음에는 길 옆에 심어 본다');
    expect(글).toContain('생각일 뿐이다');
    expect(글.indexOf('앞 AI 가 남긴 쪽지')).toBeGreaterThan(글.indexOf('--- 배울 것 ---'));
    expect(글.indexOf('앞 AI 가 남긴 쪽지')).toBeLessThan(글.indexOf('빈 종류'));
    expect(학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: true, 못올림: [], 부분: false, 차례: 1 })).not.toContain('남긴 쪽지');
  });

  it('이어진 세션 — 앞 세션의 대화가 없다고 알리고 쥔 디바이스를 다시 잡지 않게 하며 못 올린 것부터 고치게 한다', () => {
    const 글 = 학습프롬프트({ ...재료, 항목수: 3 }, { 배울것, 남은분: 20, 놓음: false, 못올림: ['elements.0.key 가 틀렸다'], 부분: false, 차례: 2 });
    expect(글).toContain('앞 세션의 대화는 없다');
    expect(글).toContain('다시 잡지 말고');
    expect(글).toContain('이것부터 고쳐라**: elements.0.key');
    expect(글).toContain('/자료/prd-now.json');
  });

  it('물음 트리 — 있으면 싣고 길면 자른다', () => {
    const 긴 = Array.from({ length: 70 }, (_, i) => `- ? ask:${i} · 물음`);
    const 글 = 학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: true, 못올림: [], 부분: false, 차례: 1, 트리: 긴 });
    expect(글).toContain('  - ? ask:59 · 물음\n  (나머지 10줄은 물음 트리 명령으로 본다)');
    expect(학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: true, 못올림: [], 부분: false, 차례: 1 })).not.toContain('**물음 트리**');
  });

  it('반영 — 맡은 번호만', () => {
    const 글 = 학습프롬프트(재료, { 배울것: { ...배울것, 번호: ['CGP-REQ-001'] }, 남은분: 30, 놓음: true, 못올림: [], 부분: true, 차례: 1 });
    expect(글).toContain('고친 요구에 닿는 것만 배운다: CGP-REQ-001');
    expect(글).not.toContain('빈 종류');
  });

  it('시험 — 지도만 보게 하고 기획서 자리를 안 준다', () => {
    const 글 = 학습프롬프트({ ...재료, 항목수: 3, 가이드: '/자료/guide/guide.md' }, { 시험: true, 남은분: 30, 놓음: false });
    expect(글).toContain('[단계] 배운 것 시험');
    expect(글).not.toContain('/자료/prd-now.json');
    expect(글).not.toContain('guide.md');
    // 시험 세션은 배우는 법을 안 읽는다 — 시험 지침만 연다. 멈춰 가며 하기도 안 권한다(원래 속도로 잰다)
    expect(글).toContain('references/game-learn-exam.md');
    expect(글).not.toContain('references/game-learn.md');
    expect(글).not.toContain('--freeze');
  });

  it('볼 눈 — 학습 세션에 멈춰 가며 하기와 도중 화면을 알려 주고, 앞 세션이 멈춘 채 끝났으면 판이 멈춰 있다고 알린다', () => {
    const 글 = 학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: false, 못올림: [], 부분: false, 차례: 2, 멈춤: true });
    expect(글).toContain('`--freeze`');
    expect(글).toContain('5초마다 화면이 남는다');
    expect(글).toContain('판이 멈춰 있다');
    expect(글).toContain('그 판을 이을지 새로 할지');
    expect(학습프롬프트(재료, { 시험: true, 남은분: 30, 놓음: false, 멈춤: true })).toContain('시험의 첫 판은 처음부터 새로 한다');
    expect(학습프롬프트(재료, { 배울것, 남은분: 30, 놓음: true, 못올림: [], 부분: false, 차례: 1 })).not.toContain('판이 멈춰 있다');
  });
});
