// 배운 것을 PRD 로 옮기기 검사 — 세 갈래 · 랜덤 표본 · 옮김 표와 결과 항목 맞추기 · 빠진 줄 · 화면만 닫는 길 · 체크포인트 · 배운 줄에 요구 번호 달기 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 세션띄우기 } from './authoring-explore.js';
import { 목록지문 } from './authoring-game-crawl.js';
import { 지도읽기 } from './authoring-game-find.js';
import { 번호달기 } from './authoring-learn-io.js';
import { 배울것고르기 } from './authoring-learn-map.js';
import { 가른줄들, 가르기, 안옮긴열쇠, 옮김검사, 옮김읽기, 화면만못옮김, 실행 } from './authoring-learn-prd.js';
import type { 옮긴항목 } from './authoring-prd.js';
import { 게임쓸것없나, 화면만다덮음 } from './authoring-upload-reverse.js';

type 줄재료 = [kind: string, key: string, learned?: object, 앞?: string];
const 지도글 = (줄들: 줄재료[]): string => {
  const 종류 = [...new Set(줄들.map((x) => x[0]))];
  return ['# 게임 지도 — 요소', '', ...종류.flatMap((k) => [`## ${k} (${k}) — ${줄들.filter((x) => x[0] === k).length}개`, ...줄들.filter((x) => x[0] === k).map(([, key, l, 앞 = '']) => `- ${key} · ${key.split(':')[1]}${앞}${l === undefined ? '' : ` · 배움 ${JSON.stringify(l)}`}`), ''])].join('\n');
};
const 확인 = { text: '심으면 고기 5 를 쓴다', belief: 'CONFIRMED', seen: 2, build: '59', shape: 'FIXED', data: { 고기: -5 } };
const 랜덤 = { text: '피해가 때마다 다르다', belief: 'CONFIRMED', seen: 12, build: '59', shape: 'RANGE', data: { 최소: 3, 최대: 8 } };
const 다름 = { ...확인, data: { 고기: -6, 글: '심으면 고기 5를 씁니다', 글다름: '빈 칸에 심었더니 고기가 6 줄었다' } };
const 갈래 = (learned: object, 종류 = 'RULE', 열쇠 = 'rule:심기') => 가르기(지도읽기(지도글([[종류, 열쇠, learned]])).줄들[0]!, '59');
const 들 = (줄들: 줄재료[]) => 가른줄들(지도읽기(지도글(줄들)), '59');
const 항목 = (x: Partial<옮긴항목>): 옮긴항목 => ({ 임시: 'CGP-NEW-001', feature: '심기', text: '빈 칸에 심으면 고기 5 를 쓴다', basis: [{ from: '화면', quote: '고기 20 에서 심으니 15' }], status: 'NEEDS_CHECK', ...x }) as 옮긴항목;
const 표 = (옮김: Record<string, string[]>, 안옮김: Record<string, string> = {}) => 옮김읽기(JSON.stringify({ 옮김, 안옮김 }));

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-prd-'));
  mkdirSync(join(자료, 'out'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
const 결과쓰기 = (items: unknown[]) => 쓰기('out/prd.json', { items });
const 새항목 = (x: object = {}) => ({ reqId: 'CGP-NEW-001', feature: '심기', text: '빈 칸에 심으면 고기 5 를 쓴다', basis: [{ from: '화면', quote: '고기 20 에서 심으니 15' }], status: 'NEEDS_CHECK', ...x });

describe('가르기', () => {
  it('확인은 확인 필요 항목, 게임 글은 안 쟀어도 확인 필요 항목이다', () => {
    expect(갈래(확인)).toEqual({ 갈래: '확인' });
    expect(갈래({ text: '글', belief: 'GAME_TEXT', data: { 글: '심으면 고기 5를 씁니다' } })).toEqual({ 갈래: '확인' });
  });

  it('게임 글과 잰 값이 다르면 판정 요청이다 — 게임 글 원문이 없거나 덜 쟀으면 지도에만 둔다', () => {
    expect(갈래(다름)).toEqual({ 갈래: '판정' });
    expect(갈래({ ...다름, data: { 글다름: '6 줄었다' } })).toMatchObject({ 갈래: '지도', 까닭: expect.stringContaining('게임 글 원문') as string });
    expect(갈래({ ...다름, seen: 1 })).toMatchObject({ 갈래: '지도' });
    expect(갈래({ ...다름, belief: 'GAME_TEXT' })).toMatchObject({ 갈래: '지도' });
  });

  it.each([
    ['추측', { ...확인, belief: 'GUESS' }],
    ['덜 봄', { ...확인, belief: 'SEEN' }],
    ['뒤집힘', { ...확인, belief: 'OVERTURNED' }],
    ['치트로 봄', { ...확인, marks: ['CHEAT'] }],
    ['사람이 바로잡음 — 서비스 가이드를 따른다', { ...확인, marks: ['HUMAN'] }],
    ['빌드 58 에서 봄 — 재확인 전', { ...확인, build: '58' }],
    ['확인인데 잰 값이나 빌드가 없음', { ...확인, data: undefined }],
    ['값의 꼴을 모름', { ...확인, shape: 'UNKNOWN' }],
    ['1번 봄 — 2번부터', { ...확인, seen: 1 }],
    ['9번 봄 — 랜덤은 10번부터', { ...랜덤, seen: 9 }],
    ['씨앗을 고정하고 봄', { ...랜덤, marks: ['SEED'] }],
  ])('%s 은 지도에만 둔다', (까닭, learned) => {
    expect(갈래(learned)).toEqual({ 갈래: '지도', 까닭 });
  });

  it('요구가 될 수 없는 종류와 「없음」 줄은 안 가른다 — 게임이 만든 종류는 가른다', () => {
    for (const k of ['SYSTEM', 'PLAY', 'FAIL', 'PROBE', 'TRIAL', 'ASK', 'ODD']) expect(갈래(확인, k, `${k.toLowerCase()}:하나`)).toBeNull();
    expect(갈래(확인, 'MULTI', 'multi:없음')).toBeNull();
    expect(갈래(확인, 'WEATHER', 'weather:비')).toEqual({ 갈래: '확인' });
  });
});

describe('옮김검사', () => {
  it('번호가 없거나 지도에만 두는 줄을 화면 항목으로 옮기면 짚는다 — 기획서 항목에는 이어도 된다', () => {
    const 줄들 = 들([['RULE', 'rule:심기', 확인], ['RULE', 'rule:덜', { ...확인, belief: 'SEEN' }]]);
    expect(옮김검사(줄들, 표({ 'rule:심기': ['CGP-NEW-001'] }), [항목({})], [])).toEqual([]);
    expect(옮김검사(줄들, 표({ 'rule:심기': ['CGP-NEW-009'] }), [항목({})], [])).toEqual(['rule:심기 — 표준 기획서에 없는 번호다(CGP-NEW-009)']);
    expect(옮김검사(줄들, 표({ 'rule:덜': ['CGP-NEW-001'] }), [항목({})], [])).toEqual(['rule:덜 — 지도에만 두는 줄을 CGP-NEW-001 로 옮겼다(덜 봄)']);
    expect(옮김검사(줄들, 표({ 'rule:덜': ['CGP-REQ-001'] }), [], [{ reqId: 'CGP-REQ-001', feature: 'a', text: 'b', basis: [{ from: '기획서.docx', quote: 'b' }], status: 'CONFIRMED' }])).toEqual([]);
    expect(옮김검사(줄들, 표({ 'rule:없는': ['CGP-NEW-001'] }), [항목({})], [])).toEqual(['rule:없는 — 지도에 없거나 요구가 될 수 없는 줄이다']);
  });

  it('판정 줄은 observed 와 게임 글 근거가 있어야 하고, 확인 줄에 observed 를 달면 짚는다', () => {
    const observed = { text: '고기가 6 줄었다', proposal: '심으면 고기 6 을 쓴다', where: 'EXPLORE' as const, build: '59', count: 2 };
    const 줄들 = 들([['RULE', 'rule:심기', 다름], ['RULE', 'rule:먹이', 확인]]);
    expect(옮김검사(줄들, 표({ 'rule:심기': ['CGP-NEW-001'] }), [항목({})], []).join('\n')).toMatch(/observed 가 없다[\s\S]*게임 글 「심으면 고기 5를 씁니다」 이 그대로 없다/);
    expect(옮김검사(줄들, 표({ 'rule:심기': ['CGP-NEW-001'] }), [항목({ observed, basis: [{ from: '화면', quote: '도움말: 심으면  고기 5를 씁니다' }] })], [])).toEqual([]);
    expect(옮김검사(줄들, 표({ 'rule:먹이': ['CGP-NEW-001'] }), [항목({ observed })], [])).toEqual(['CGP-NEW-001 — observed 는 게임 글과 잰 값이 다를 때만 단다']);
    const 있던 = { ...항목({}), reqId: 'CGP-REQ-001' };
    expect(옮김검사(줄들, 표({ 'rule:먹이': ['CGP-REQ-001'] }), [{ ...있던, observed }], [있던])).toEqual([]);
  });

  it('기획서가 적은 확정 항목과 다른 값은 observed 를 달라고 하지 않는다 — 테스트가 기획서 값으로 판정해 실패로 남는다', () => {
    expect(옮김검사(들([['RULE', 'rule:심기', 다름]]), 표({ 'rule:심기': ['CGP-REQ-001'] }), [], [{ reqId: 'CGP-REQ-001', feature: 'a', text: 'b', basis: [{ from: '기획서.docx', quote: 'b' }], status: 'CONFIRMED' }])).toEqual([]);
  });

  it('랜덤 줄의 본 범위 · 비율을 문장에 적으면 짚는다 — 게임 글이 말한 확률은 그대로 된다', () => {
    const 줄들 = 들([['CALC', 'calc:피해', 랜덤], ['CALC', 'calc:치명', { ...랜덤, shape: 'RATE', data: { 글: '20% 확률로 치명타' } }]]);
    const 본 = (열쇠: string, text: string) => 옮김검사(줄들, 표({ [열쇠]: ['CGP-NEW-001'] }), [항목({ text })], []);
    expect(본('calc:피해', '적의 피해는 때마다 다르다')).toEqual([]);
    expect(본('calc:피해', '적의 피해는 3 ~ 8 이다')[0]).toContain('본 비율 · 범위를 문장에 적었다(3~8)');
    expect(본('calc:치명', '20% 확률로 치명타가 난다')).toEqual([]);
    expect(본('calc:치명', '30% 확률로 치명타가 난다')[0]).toContain('30%');
    expect(본('calc:피해', '1-2 스테이지에서 피해가 때마다 다르다')).toEqual([]);
    expect(본('calc:피해', '1~3웨이브에서 피해가 때마다 다르다')).toEqual([]);
    expect(본('calc:피해', '1 ~ 13 웨이브에서 피해가 때마다 다르다')).toEqual([]);
    expect(본('calc:치명', '20 % 확률로 치명타가 난다')).toEqual([]);
    expect(본('calc:치명', '0% 가 아니고 2% 다')[0]).toContain('0% · 2%');
  });

  it('표 파일이 깨졌거나 꼴이 틀리면 그 까닭 하나다', () => {
    expect(옮김읽기('{').틀림).toContain('JSON 으로 못 읽었다');
    expect(옮김읽기('{"옮김":{"rule:심기":"CGP-NEW-001"}}').틀림).toContain('rule:심기');
    expect(옮김읽기('{"안옮김":{"rule:심기":""}}').틀림).toContain('까닭');
    expect(옮김읽기(null)).toMatchObject({ 틀림: null });
  });
});

describe('빠진 줄', () => {
  it('이미 요구 번호가 달렸거나 기획서 값이 있는 줄 · 안 옮긴 까닭을 적은 줄은 빼고 남은 열쇠다', () => {
    쓰기('game-map.txt', 지도글([
      ['RULE', 'rule:심기', 확인], ['RULE', 'rule:이음', 확인, ' · 근거 CGP-REQ-001'], ['DATA', 'item:검', 확인, ' · 기획서 {"공격력":3}'],
      ['RULE', 'rule:까닭', 확인], ['RULE', 'rule:덜', { ...확인, belief: 'SEEN' }], ['WEATHER', 'weather:비', { ...확인, data: { 요구: ['CGP-REQ-002'] } }],
    ]));
    쓰기('game-prd.json', { 안옮김: { 'rule:까닭': '창 항목이 이미 덮음' } });
    expect(안옮긴열쇠(자료)).toEqual(['rule:심기']);
    쓰기('game-prd.json', { 옮김: { 'rule:심기': ['CGP-NEW-001'] }, 안옮김: { 'rule:까닭': '창 항목이 이미 덮음' } });
    expect(안옮긴열쇠(자료)).toEqual(['rule:심기']);
    expect(화면만못옮김(자료, 'CGP')[0]).toContain('없는 번호다');
    쓰기('game-prd.json', { 안옮김: { 'rule:까닭': '창 항목이 이미 덮음' } });
    expect(화면만못옮김(자료, 'CGP')).toEqual(['배운 줄 1개를 PRD 로 안 옮겼다 — rule:심기']);
    결과쓰기([새항목()]);
    쓰기('game-prd.json', { 옮김: { 'rule:심기': ['CGP-NEW-001'] }, 안옮김: { 'rule:까닭': '창 항목이 이미 덮음' } });
    expect(화면만못옮김(자료, 'CGP')).toEqual([]);
  });

  it('사람이 PRD 에서 뺀 요구의 줄과 앞 작성이 안 옮기기로 한 줄은 다시 올리지 않는다', () => {
    const 뺀 = { ...확인, data: { 요구: ['CGP-REQ-012'] } };
    쓰기('game-map.txt', 지도글([['RULE', 'rule:창닫기', 뺀], ['WEATHER', 'weather:비', 뺀], ['RULE', 'rule:덮음', { ...확인, data: { 안옮김: '창 항목이 덮음' } }]]));
    쓰기('prd-current.json', { version: 2, items: [] });
    expect(안옮긴열쇠(자료)).toEqual([]);
    쓰기('prd-current.json', { version: 2, items: [{ reqId: 'CGP-REQ-012', feature: 'a', text: 'b', basis: [{ from: '화면', quote: 'q' }], status: 'NEEDS_CHECK' }] });
    expect(안옮긴열쇠(자료)).toEqual(['rule:창닫기']);
  });

  it('에이전트가 남긴 빌드와 다른 빌드에서 본 줄은 옮길 줄이 아니다', () => {
    쓰기('game-map.txt', 지도글([['RULE', 'rule:심기', 확인]]));
    쓰기('game-build.txt', '60');
    expect(안옮긴열쇠(자료)).toEqual([]);
  });

  it('명령은 갈래와 시스템 묶음을 찍고 화면만이면 빠진 줄을 1 로 알린다', () => {
    expect(실행([자료, 'CGP'])).toBe(2);
    쓰기('game-map.txt', 지도글([['SYSTEM', 'system:농사', { ...확인, related: ['rule:심기'] }], ['RULE', 'rule:심기', 다름], ['CALC', 'calc:피해', 랜덤], ['RULE', 'rule:덜', { ...확인, belief: 'SEEN' }]]));
    expect(실행([자료, 'CGP'])).toBe(0);
    expect(실행([자료, 'CGP', '화면만'])).toBe(1);
    expect(실행([자료, 'CGP', '대조'])).toBe(2);
    const 글 = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(글).toContain('아직 안 옮긴 줄 2(확인 1 · 판정 1) · 이미 이은 줄 0 · 지도에만 둘 줄 1');
    expect(글).toContain('## 농사\n- rule:심기');
    expect(글).toContain('게임 글 「심으면 고기 5를 씁니다」 ↔ 잰 값 「빈 칸에 심었더니 고기가 6 줄었다」 — observed 를 단다');
    expect(글).toContain('랜덤(폭 — 숫자는 문장에 안 적는다)');
    expect(글).toContain('- rule:덜 — 덜 봄');
  });
});

describe('화면만이 「PRD 에 없는 화면 0」으로 닫는 길', () => {
  it('훑은 창이 다 덮였어도 안 옮긴 배운 줄이 있으면 쓸 것이 있다', () => {
    const 폴더 = join(자료, 'game-crawl', 'login');
    mkdirSync(폴더, { recursive: true });
    const 목록글 = JSON.stringify([{ 주소: 'scene:World', 이름: 'World', 틀: 'scene:World', 파일: '001.yml', 지문: 'a', 글자지문: 'b', 연곳: null }]);
    writeFileSync(join(폴더, 'list.json'), 목록글);
    writeFileSync(join(폴더, 'game.json'), JSON.stringify({ 상태: '로그아웃', 목록: 목록지문(목록글), 창: [] }));
    쓰기('covered.json', ['game:World']);
    쓰기('game-map.txt', 지도글([['RULE', 'rule:심기', 확인]]));
    expect(화면만다덮음(자료, true)).toBeNull();
    쓰기('game-map.txt', 지도글([['RULE', 'rule:심기', 확인, ' · 근거 CGP-REQ-001']]));
    expect(화면만다덮음(자료, true)).toBe(1);
    expect(게임쓸것없나(자료)).toBe(true);
    결과쓰기([새항목()]);
    expect(게임쓸것없나(자료)).toBe(false);
  });
});

describe('탐색 체크포인트', () => {
  it('더 볼 것이 남았으면 케이스 작성 세션을 띄우지 않고 그 까닭으로 멈춘다', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    쓰기('game-explore.json', { 목표: [{ 기능: '심기', 열쇠: ['game:Main'], 결과: '진행 불가', 까닭: '창을 못 엶' }] });
    const 한번 = vi.fn(async () => ({ 돌린것: { 코드: 0, 낸것: '', 오류: '', 시간초과: false, 멈춤으로죽음: false }, 크레딧으로: false, 앞낸것: null }));
    const o = { 탐색: true, 통로: { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 }, 자료, 비밀: [], 한번, 거두기: async () => true, 멈추라했다: () => false, 알린다: () => undefined };
    const r = await 세션띄우기({ ...o, 더볼것: () => ['배운 줄 1개를 PRD 로 안 옮겼다 — rule:심기'] });
    expect(r.거절).toContain('배운 줄 1개를 PRD 로 안 옮겼다');
    expect(한번).toHaveBeenCalledTimes(1);
    expect((await 세션띄우기({ ...o, 더볼것: () => [] })).거절).toBeUndefined();
  });

  it('화면만이 쓸 것이 하나도 없어 아무것도 안 썼으면 목표가 없어도 막지 않고 그 세션으로 끝낸다', async () => {
    const 한번 = vi.fn(async () => ({ 돌린것: { 코드: 0, 낸것: '끝', 오류: '', 시간초과: false, 멈춤으로죽음: false }, 크레딧으로: false, 앞낸것: null }));
    const r = await 세션띄우기({ 탐색: true, 통로: { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 }, 자료, 비밀: [], 한번, 거두기: async () => true, 멈추라했다: () => false, 알린다: () => undefined, 쓸것없나: () => true });
    expect(r).toMatchObject({ 돌린것: { 낸것: '끝' } });
    expect(r.거절).toBeUndefined();
    expect(한번).toHaveBeenCalledTimes(1);
  });
});

describe('번호달기', () => {
  const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
  const 서버 = (글: string, status = 204) => {
    const 보냄: { elements: Record<string, unknown>[] }[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'PUT') return new Response(JSON.stringify({ text: 글 }), { status: 200 });
      보냄.push(JSON.parse(String(init.body)) as (typeof 보냄)[number]);
      return new Response(status === 204 ? null : JSON.stringify({ detail: 'elements.0.reqIds' }), { status });
    });
    return 보냄;
  };

  const 판쓰기 = (...번호들: string[]) => 쓰기('prd-current.json', { version: 1, items: 번호들.map((reqId) => ({ reqId, feature: 'a', text: reqId, basis: [{ from: '화면', quote: 'q' }], status: 'NEEDS_CHECK' })) });
  const 단것 = { ...확인, data: { 고기: -5, 요구: ['CGP-REQ-009'] } };

  it('배운 것을 그대로 싣고 번호를 더한다 — 「기획서가 바뀜」 줄 · 임시 번호 · 기획서에 없는 번호 · 지도에만 둘 줄은 안 건드리고 안 옮긴 까닭을 남긴다', async () => {
    판쓰기('CGP-REQ-001', 'CGP-REQ-003', 'CGP-REQ-009');
    const 보냄 = 서버(지도글([
      ['RULE', 'rule:심기', 확인, ' · 근거 CGP-REQ-001'], ['STATE', 'state:밤', 확인], ['RULE', 'rule:바뀜', 확인, ' · 근거 CGP-REQ-002 · 기획서가 바뀜(CGP-REQ-002) — 지금 판으로 다시 올린다'],
      ['RULE', 'rule:단', 확인, ' · 근거 CGP-REQ-003'], ['RULE', 'rule:임시', 확인], ['RULE', 'rule:없는번호', 확인], ['RULE', 'rule:덜', { ...확인, belief: 'SEEN' }], ['DATA', 'item:검', undefined, ' · 근거 CGP-REQ-004'],
    ]));
    쓰기('game-prd.json', { 옮김: { 'rule:심기': ['CGP-REQ-009'], 'state:밤': ['CGP-REQ-009'], 'rule:바뀜': ['CGP-REQ-009'], 'rule:단': ['CGP-REQ-003'], 'rule:임시': ['CGP-NEW-001'], 'rule:없는번호': ['CGP-REQ-999'], 'rule:덜': ['CGP-REQ-009'], 'item:검': ['CGP-REQ-009'] }, 안옮김: { 'rule:단': '창 항목이 덮음' } });
    expect(await 번호달기(통로, 자료, 'CGP', true)).toEqual([]);
    expect(보냄).toEqual([{ elements: [
      { kind: 'RULE', key: 'rule:심기', name: '심기', learned: 단것, reqIds: ['CGP-REQ-001', 'CGP-REQ-009'] },
      { kind: 'RULE', key: 'rule:단', name: '단', learned: { ...확인, data: { 고기: -5, 요구: ['CGP-REQ-003'], 안옮김: '창 항목이 덮음' } } },
      { kind: 'STATE', key: 'state:밤', name: '밤', learned: 단것, reqIds: ['CGP-REQ-009'] },
    ] }]);
  });

  it('게임이 만든 종류는 서버가 근거를 안 받아 배운 값의 요구 칸에만 적는다 — 이은 줄로 보되 요구가 바뀌면 다시 배운다', async () => {
    판쓰기('CGP-REQ-009');
    const 보냄 = 서버(지도글([['WEATHER', 'weather:비', 확인], ['WEATHER', 'weather:수', { ...확인, data: 3 }]]));
    쓰기('game-prd.json', { 옮김: { 'weather:비': ['CGP-REQ-009'], 'weather:수': ['CGP-REQ-009'] } });
    await 번호달기(통로, 자료, 'CGP', true);
    expect(보냄[0]!.elements).toEqual([{ kind: 'WEATHER', key: 'weather:비', name: '비', learned: 단것 }]);
    const 지도 = 지도읽기(지도글([['WEATHER', 'weather:비', 단것]]));
    expect(배울것고르기(지도, { 빌드: '59', 오늘: '2026-11-25', 게임글: null, 번호들: ['CGP-REQ-009'] }).번호).toEqual(['CGP-REQ-009']);
  });

  it('안 옮긴 까닭은 화면만 작성에서만 남긴다 — 대조가 적은 「기획서 밖 기능」이 화면만을 막지 않게', async () => {
    판쓰기();
    const 보냄 = 서버(지도글([['RULE', 'rule:심기', 확인]]));
    쓰기('game-prd.json', { 안옮김: { 'rule:심기': '기획서 밖 기능' } });
    expect(await 번호달기(통로, 자료, 'CGP', false)).toEqual([]);
    expect(보냄).toEqual([]);
  });

  it('옮김 표가 없으면 서버를 안 부르고, 못 달면 PR 머리 줄에만 적는다', async () => {
    const 보냄 = 서버(지도글([['RULE', 'rule:심기', 확인]]), 400);
    expect(await 번호달기(통로, 자료, 'CGP', true)).toEqual([]);
    expect(보냄).toEqual([]);
    판쓰기('CGP-REQ-009');
    쓰기('game-prd.json', { 옮김: { 'rule:심기': ['CGP-REQ-009'] } });
    expect(await 번호달기(통로, 자료, 'CGP', true)).toEqual(['배운 줄에 요구 번호: 못 달았음 — 서버 400 elements.0.reqIds']);
  });
});
