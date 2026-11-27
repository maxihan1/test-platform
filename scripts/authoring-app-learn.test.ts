// 앱 배우기 — 건너뛰기 · 늘 한 번 띄우기 · 일찍 끝내기는 프로그램이 본다 · 빈손 두 번 · 컨텍스트 교대 · 이어 작성 30분 · 쪽지 · PR 머리 줄 · 프롬프트
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 배운것글짓기, type 읽은배운줄 } from '../apps/admin/src/prd/appLearned.js';
import { type 앱세션거리, type 앱학습손, 맡은줄, 앱학습끝줄, 앱학습하기 } from './authoring-app-learn.js';
import { 앱학습프롬프트 } from './authoring-app-learn-prompt.js';
import { 배운글읽기 } from './authoring-app-learned.js';
import type { 돌린결과 } from './authoring-spawn.js';

const 분 = 60_000;
const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 결과 = (x: Partial<돌린결과> = {}): 돌린결과 => ({ 코드: 0, 낸것: '낸것', 오류: '', 시간초과: false, 멈춤으로죽음: false, ...x });
const 확인 = { text: 'ㄱ', belief: 'CONFIRMED', seen: 2, build: '59', data: { 값: 1 } };
const 줄 = (kind: string, key: string, screen: string | null, learned: object = 확인) => ({ kind, key, name: '가', screen, learned });

let 자료 = '';
let 서버: 읽은배운줄[];
let 시계: number;
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
/** 세션 안에서 AI 가 적는 것 — 적기 명령이 쓰는 파일을 바로 쓴다 */
const 적기 = (...들: object[]) => 쓰기('app-learned.json', { rows: 들 });
const crawl = (...화면: string[]) => {
  mkdirSync(join(자료, 'crawl'), { recursive: true });
  쓰기('crawl/list.json', 화면.map((주소) => ({ 주소 })));
};

beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-learn-'));
  서버 = [];
  시계 = Date.UTC(2026, 10, 26, 3);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (!url.endsWith('/app-learned')) return new Response('{}', { status: 404 });
    if (init?.method !== 'PUT') return new Response(JSON.stringify({ text: 배운것글짓기(서버) }), { status: 200 });
    const { rows } = JSON.parse(String(init.body)) as { rows: { kind: string; key: string; name: string; screen: string | null; learned: object | null }[] };
    서버 = [...서버.filter((x) => !rows.some((r) => r.key === x.key)), ...rows.filter((r) => r.learned !== null).map((r) => ({ kind: r.kind, key: r.key, name: r.name, screen_key: r.screen, learned: r.learned }) as 읽은배운줄)]
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    return new Response(null, { status: 204 });
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

type 세션 = (거리: 앱세션거리, 끊기: AbortSignal, 먹기: (줄: string) => void) => Partial<돌린결과> | void;
/** 세션마다 할 일을 차례로 주는 손. 세션 하나는 10분이 간 것으로 친다 */
function 손(세션들: 세션[], x: Partial<앱학습손> = {}) {
  const 거리들: 앱세션거리[] = [];
  const o: 앱학습손 = {
    통로, 자료, 비밀: [], 못함: null,
    빌드: async () => '59',
    프롬프트: (거리) => (거리들.push(거리), `글${String(거리들.length)}`),
    한번: vi.fn(async (글짓기, 끊기, 먹기) => {
      글짓기();
      const r = 세션들[거리들.length - 1]?.(거리들.at(-1)!, 끊기, 먹기);
      시계 += 10 * 분;
      return { 돌린것: 결과(r ?? {}), 크레딧으로: false, 앞낸것: null };
    }),
    거두기: vi.fn(async () => true),
    멈추라했다: () => false,
    알린다: vi.fn(),
    지금: () => 시계,
    ...x,
  };
  return { o, 거리들 };
}
const 상태 = () => JSON.parse(readFileSync(join(자료, 'app-learn.json'), 'utf8')) as Record<string, unknown>;

describe('앱 배우기', () => {
  it('폰을 잡을 길이 없으면 띄우지 않고 까닭을 PR 머리에 단다', async () => {
    const { o } = 손([], { 못함: '디바이스 팜이 연결되지 않아 폰을 잡을 수 없다' });
    expect(await 앱학습하기(o)).toEqual({ 앞낸것: [] });
    expect(o.한번).not.toHaveBeenCalled();
    expect(await 앱학습끝줄(통로, 자료, [])).toEqual(['앱 배우기: 안 함 — 디바이스 팜이 연결되지 않아 폰을 잡을 수 없다']);
  });

  it('늘 한 번은 띄우고, 본 화면마다 배운 줄이 있고 열린 물음이 없으면 그친다', async () => {
    const { o, 거리들 } = 손([() => (crawl('app:.A/가'), 적기(줄('SCREEN', 'screen:가', 'app:.A/가')))]);
    const r = await 앱학습하기(o);
    expect(r.앞낸것).toEqual(['낸것']);
    expect(거리들).toHaveLength(1);
    expect(서버.map((x) => x.key)).toEqual(['screen:가']);
    expect(배운글읽기(readFileSync(join(자료, 'app-learned.txt'), 'utf8')).map((x) => x.key)).toEqual(['screen:가']);
    expect(상태()).toMatchObject({ 세션: 1, 끝: true, 남은화면: [] });
  });

  it('남은 화면 · 열린 물음이 있으면 AI 가 끝내도 다음 세션을 띄우고, 쪽지를 맨 위에 싣는다', async () => {
    const { o, 거리들 } = 손([
      () => (crawl('app:.A/가', 'app:.A/나'), 적기(줄('SCREEN', 'screen:가', 'app:.A/가'), 줄('ASK', 'ask:왜', null, { text: '?', belief: 'GUESS' }), 줄('NOTE', 'note:쪽지', null, { text: '나 화면 볼 것', belief: 'GUESS' }))),
      () => 적기(줄('RULE', 'rule:나', 'app:.A/나'), 줄('ASK', 'ask:왜', null, { text: '?', belief: 'GUESS', data: { 닫음: '풀었다' } })),
    ]);
    await 앱학습하기(o);
    expect(거리들).toHaveLength(2);
    expect(거리들[1]).toMatchObject({ 차례: 2, 쪽지: '나 화면 볼 것', 남은화면: ['app:.A/나'], 열린: ['ask:왜'], 빌드: '59' });
    expect(상태()).toMatchObject({ 세션: 2, 끝: true });
  });

  it('한 줄도 못 배운 세션이 두 번 이어지면 그치고, 남은 화면을 PR 머리에 단다', async () => {
    const { o, 거리들 } = 손([() => crawl('app:.A/가'), () => undefined, () => undefined]);
    await 앱학습하기(o);
    expect(거리들).toHaveLength(2);
    expect(await 앱학습끝줄(통로, 자료, [])).toEqual(['앱 배우기: 세션 2번 · 20분', '앱 배우기: 배운 줄 없는 화면 1 — app:.A/가']);
  });

  it('컨텍스트 60% 에서 끊고 다음 세션으로 바꾼다 — 55% 에 정리 알림', async () => {
    const 크기 = (n: number) => JSON.stringify({ type: 'assistant', message: { id: String(n), usage: { input_tokens: n, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 } } });
    let 알림 = '';
    let 끊김 = false;
    const { o, 거리들 } = 손([
      (_, 끊기, 먹기) => {
        적기(줄('RULE', 'rule:가', 'app:.A/가'));
        먹기(크기(560_000));
        알림 = readFileSync(join(자료, 'app-learn.wrap'), 'utf8');
        먹기(크기(610_000));
        끊김 = 끊기.aborted;
        return { 코드: null, 마감으로끊김: true };
      },
      () => 적기(줄('RULE', 'rule:나', 'app:.A/나')),
    ]);
    crawl('app:.A/가', 'app:.A/나');
    await 앱학습하기(o);
    expect(알림).toContain('note:쪽지');
    expect(끊김).toBe(true);
    expect(거리들).toHaveLength(2);
    expect(거리들[1]!.차례).toBe(2);
  });

  it('빌드를 모르면 앞 실행이 남긴 빌드 파일을 지운다', async () => {
    쓰기('app-learn-build.txt', '58');
    const { o, 거리들 } = 손([() => (crawl('app:.A/가'), 적기(줄('RULE', 'rule:가', 'app:.A/가')))], { 빌드: async () => undefined });
    await 앱학습하기(o);
    expect(거리들).toHaveLength(1);
    expect(() => readFileSync(join(자료, 'app-learn-build.txt'))).toThrow();
  });

  it('올리기가 계속 거절돼도 새로 적은 것이 없는 세션은 빈손으로 센다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'BAD_LEARNED', detail: 'rows.0' }), { status: 400 })));
    const { o, 거리들 } = 손([() => (crawl('app:.A/가', 'app:.A/나'), 적기(줄('RULE', 'rule:가', 'app:.A/가'))), () => undefined, () => undefined, () => undefined]);
    await 앱학습하기(o);
    expect(거리들).toHaveLength(3);
  });

  it('2시간을 다 쓰면 그친다 — 이어받은 폴더는 쓴 시간을 잇는다', async () => {
    쓰기('app-learn.json', { 쓴ms: 115 * 분, 세션: 6, 끝: false, 열쇠: [] });
    const { o } = 손([]);
    await 앱학습하기(o);
    expect(o.한번).not.toHaveBeenCalled();
    expect(상태()).toMatchObject({ 끝: true });
  });

  it('이어 작성 · 반영은 맡은 요구를 근거로 단 줄과 그 화면만 30분 한 세션 — 없으면 건너뛴다', async () => {
    서버 = [{ kind: 'RULE', key: 'rule:가', name: '가', screen_key: 'app:.A/가', learned: { ...확인, data: { 요구: 'MTA-REQ-001' } } } as 읽은배운줄];
    쓰기('app-learned.txt', 배운것글짓기(서버));
    expect(맡은줄(배운글읽기(배운것글짓기(서버)), ['MTA-REQ-001'])).toEqual({ 열쇠: ['rule:가'], 화면: ['app:.A/가'] });
    const 없음 = 손([], { 번호들: ['MTA-REQ-009'] });
    await 앱학습하기(없음.o);
    expect(없음.o.한번).not.toHaveBeenCalled();
    const { o, 거리들 } = 손([() => crawl('app:.A/가', 'app:.A/나')], { 번호들: ['MTA-REQ-001'] });
    await 앱학습하기(o);
    expect(거리들).toHaveLength(1);
    expect(거리들[0]).toMatchObject({ 남은분: 30, 부분: { 열쇠: ['rule:가'], 화면: ['app:.A/가'] } });
    expect(상태().남은화면).toBeUndefined();
  });

  it('자식이 못 떴거나 멈췄으면 작성을 끝낸다 — 앞에 돈 세션이 있으면 끊김(코드 1)으로', async () => {
    const { o } = 손([() => crawl('app:.A/가'), () => ({ 코드: null })]);
    const r = await 앱학습하기(o);
    expect(r.끝?.돌린것.코드).toBe(1);
  });

  it('PR 머리 — 세션 · 분과 이번에 적은 이상한 것 · 막힌 물음', async () => {
    const { o } = 손([() => (crawl('app:.A/가'), 적기(줄('ODD', 'odd:두번', 'app:.A/가', { text: '두 번 저장', belief: 'SEEN' }), 줄('ASK', 'ask:권한', null, { text: '?', belief: 'GUESS', build: '59', data: { 막힘: '관리자만' } })))]);
    await 앱학습하기(o);
    expect(await 앱학습끝줄(통로, 자료, [])).toEqual(['앱 배우기: 세션 1번 · 10분', '앱 버그 후보: 가', '앱에서 사람에게 물을 것: 가']);
  });
});

describe('프롬프트', () => {
  const 거리: 앱세션거리 = { 남은분: 120, 빌드: '59', 차례: 1, 못올림: [], 남은화면: [], 열린: [] };
  it('기획서를 싣지 않고 crawl → 해 보기 → 적기 → --check 차례를 준다', () => {
    const 글 = 앱학습프롬프트({ 서비스: 'MTA', 폴더: 'mta', 자료: '/자료' }, 거리);
    expect(글).toContain('**기획서를 보지 마라**');
    expect(글).toContain('npx tsx scripts/authoring-app-crawl.ts /자료');
    expect(글).toContain('npx tsx scripts/authoring-app-try.ts /자료 <이름> <명령 파일>');
    expect(글).toContain('npx tsx scripts/authoring-app-learn-note.ts /자료');
    expect(글).toContain('npx tsx scripts/authoring-app-find.ts /자료 --check');
    expect(글).toContain('2번 이상');
    expect(글).not.toMatch(/표준 기획서 현재 버전|prd-current/);
  });

  it('다음 세션은 쪽지를, 이어 작성은 맡은 줄만 싣는다', () => {
    const 다음 = 앱학습프롬프트({ 서비스: 'MTA', 폴더: 'mta', 자료: '/자료' }, { ...거리, 차례: 2, 쪽지: '설정 화면 볼 것' });
    expect(다음).toContain('> 설정 화면 볼 것');
    const 부분 = 앱학습프롬프트({ 서비스: 'MTA', 폴더: 'mta', 자료: '/자료' }, { ...거리, 부분: { 열쇠: ['rule:가'], 화면: ['app:.A/가'] } });
    expect(부분).toContain('고친 요구에 닿는 줄만 다시 본다: rule:가');
    expect(부분).toContain('일회용 회원');
    expect(부분).toContain('계정을 비우고');
    expect(부분).not.toContain('authoring-app-crawl.ts');
  });
});
