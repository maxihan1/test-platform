// 앱 배운 것 — 글 읽기 · 얹기 · 장치 ① · 열린 물음 · 올리기 · 적기 명령 · 찾기 명령
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 배운것글짓기 } from '../apps/admin/src/prd/appLearned.js';
import { 찾기 } from './authoring-app-find.js';
import { 합치기, 실행 as 적기 } from './authoring-app-learn-note.js';
import { type 앱배운줄, 끝내도되나, 배운것올리기, 배운글읽기, 배운줄없는화면, 사람줄, 얹기, 열린물음, 이번화면들 } from './authoring-app-learned.js';

const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 확인 = { text: '501자째부터 안 들어간다', belief: 'CONFIRMED' as const, seen: 2, build: '59', data: { 한도: 500 } };
const 줄 = (kind: string, key: string, screen: string | null, learned: object = 확인): 앱배운줄 => ({ kind, key, name: `${key} 이름`, screen, learned: learned as 앱배운줄['learned'] });
const 글 = (줄들: 앱배운줄[]) => 배운것글짓기(줄들.map((x) => ({ kind: x.kind as 'RULE', key: x.key, name: x.name, screen_key: x.screen, learned: x.learned })));

let 자료 = '';
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-learned-'));
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

describe('배운 것 글', () => {
  it('서버가 지은 글을 같은 줄로 거꾸로 읽는다 — 화면 없는 줄 · 배움 JSON 안의 「 · 」까지', () => {
    const 들 = [줄('RULE', 'rule:글', 'app:.A/글쓰기', { ...확인, text: '가 · 나' }), 줄('ASK', 'ask:왜', null, { text: '왜?', belief: 'GUESS' })];
    expect(배운글읽기(글(들))).toEqual(expect.arrayContaining(들));
    expect(배운글읽기(글(들))).toHaveLength(2);
  });

  it('적은 줄이 받은 줄을 이기고 null 은 지운다', () => {
    const 받은 = [줄('RULE', 'rule:가', 'app:.A/x'), 줄('RULE', 'rule:나', 'app:.A/x')];
    const r = 얹기(받은, [{ ...줄('RULE', 'rule:가', 'app:.A/y') }, { ...줄('RULE', 'rule:나', 'app:.A/x'), learned: null }]);
    expect(r.map((x) => [x.key, x.screen])).toEqual([['rule:가', 'app:.A/y']]);
  });
});

describe('장치 ① · 열린 물음', () => {
  it('crawl 목록 · 이번 맵 줄 도착 · 해 본 기록 앞뒤 화면 가운데 배운 줄(쪽지 빼고)이 없는 화면', () => {
    mkdirSync(join(자료, 'crawl'));
    쓰기('crawl/list.json', [{ 주소: 'app:.A/가' }, { 주소: 'app:.A/나' }]);
    쓰기('app-route.json', { rows: [{ kind: 'MOVE', toKey: 'app:.A/다' }, { kind: 'API', toKey: 'app:.A/무시' }] });
    mkdirSync(join(자료, 'app-try'));
    쓰기('app-try/20261126000000000-x.json', { 앞화면: 'app:.A/라', 뒤화면: null });
    const 화면 = 이번화면들(자료);
    expect([...화면].sort()).toEqual(['app:.A/가', 'app:.A/나', 'app:.A/다', 'app:.A/라']);
    expect(배운줄없는화면(화면, [줄('SCREEN', 'screen:가', 'app:.A/가', { text: '빈 화면', belief: 'SEEN', data: { 닫음: '볼 것 없음' } }), 줄('NOTE', 'note:쪽지', 'app:.A/나', { text: 'x', belief: 'GUESS' })]))
      .toEqual(['app:.A/나', 'app:.A/다', 'app:.A/라']);
  });

  it('닫음 없는 물음 · 다른 빌드의 막힘 · 다른 빌드의 확인 줄이 열린 물음이다', () => {
    const 들 = [
      줄('ASK', 'ask:열림', null, { text: '?', belief: 'GUESS' }),
      줄('ASK', 'ask:닫힘', null, { text: '?', belief: 'GUESS', data: { 닫음: '풀었다' } }),
      줄('ASK', 'ask:막힘', null, { text: '?', belief: 'GUESS', build: '59', data: { 막힘: '사람만 안다' } }),
      줄('ASK', 'ask:옛막힘', null, { text: '?', belief: 'GUESS', build: '58', data: { 막힘: '사람만 안다' } }),
      줄('ASK', 'ask:빌드없는막힘', null, { text: '?', belief: 'GUESS', data: { 막힘: '사람만 안다' } }),
      줄('RULE', 'rule:옛빌드', 'app:.A/x', { ...확인, build: '58' }),
      줄('RULE', 'rule:지금', 'app:.A/x'),
    ];
    expect(열린물음(들, '59')).toEqual(['ask:열림', 'ask:옛막힘', 'ask:빌드없는막힘', 'rule:옛빌드']);
    expect(열린물음(들, undefined)).toEqual(['ask:열림']);
  });

  it('사람줄 — 이번에 적은 이상한 것 · 막힌 물음 · 남은 화면만', () => {
    const 들 = [줄('ODD', 'odd:두번', 'app:.A/x', { text: '두 번 저장', belief: 'SEEN' }), 줄('ODD', 'odd:옛것', 'app:.A/x', { text: 'x', belief: 'SEEN' }), 줄('ASK', 'ask:막힘', null, { text: '?', belief: 'GUESS', data: { 막힘: '권한' } })];
    expect(사람줄(들, new Set(['odd:두번', 'ask:막힘']), ['app:.A/z'])).toEqual([
      '앱 버그 후보: odd:두번 이름', '앱에서 사람에게 물을 것: ask:막힘 이름', '앱 배우기: 배운 줄 없는 화면 1 — app:.A/z',
    ]);
  });
});

describe('올리기', () => {
  it('적은 줄을 PUT 하고 글을 다시 받은 뒤에야 적은 파일을 지운다', async () => {
    const 들 = [줄('RULE', 'rule:가', 'app:.A/x')];
    쓰기('app-learned.json', { rows: 들 });
    const 부름 = vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PUT' ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ text: 글(들) }), { status: 200 })));
    vi.stubGlobal('fetch', 부름);
    expect(await 배운것올리기(통로, 자료, [])).toEqual({ 열쇠: ['rule:가'], 못올림: [] });
    expect(JSON.parse(String(부름.mock.calls[0]![1]!.body))).toEqual({ rows: 들 });
    expect(readFileSync(join(자료, 'app-learned.txt'), 'utf8')).toContain('rule:가');
    expect(() => readFileSync(join(자료, 'app-learned.json'))).toThrow();
  });

  it('서버가 거절하면 적은 파일을 남기고 까닭을 돌려준다 · 비밀번호가 섞이면 안 올린다', async () => {
    쓰기('app-learned.json', { rows: [줄('RULE', 'rule:가', 'app:.A/x', { ...확인, text: 'pw123 넣음' })] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'BAD_LEARNED', detail: 'rows.0.screen' }), { status: 400 })));
    expect((await 배운것올리기(통로, 자료, ['pw123'])).못올림).toEqual(['배운 줄에 테스트 계정 비밀번호가 들어 있다']);
    expect((await 배운것올리기(통로, 자료, [])).못올림[0]).toContain('400 rows.0.screen');
    expect(readFileSync(join(자료, 'app-learned.json'), 'utf8')).toContain('rule:가');
  });

  it('올린 뒤 다시 받기가 실패해도 앞 글을 지우지 않는다', async () => {
    쓰기('app-learned.txt', 글([줄('RULE', 'rule:앞', 'app:.A/x')]));
    쓰기('app-learned.json', { rows: [줄('RULE', 'rule:가', 'app:.A/x')] });
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PUT' ? new Response(null, { status: 204 }) : new Response('{}', { status: 500 }))));
    expect((await 배운것올리기(통로, 자료, [])).못올림[0]).toContain('다시 못 받았다');
    expect(readFileSync(join(자료, 'app-learned.txt'), 'utf8')).toContain('rule:앞');
    expect(readFileSync(join(자료, 'app-learned.json'), 'utf8')).toContain('rule:가');
  });
});

describe('적기 명령 (장치 ④)', () => {
  it('서버와 같은 검사 — 확인 줄에 횟수가 모자라면 아무것도 안 적는다', () => {
    expect(합치기(new Set(), [], [줄('RULE', 'rule:가', 'app:.A/x', { ...확인, seen: 1 })])).toContain('rows.0.learned.seen');
    expect(합치기(new Set(), [], [{ ...줄('RULE', 'rule:가', null) }])).toContain('rows.0.screen');
    expect(합치기(new Set(), [], [{ kind: 'RULE', key: 'rule:가' }])).toContain('learned 가 없다');
  });

  it('앞에 적은 줄에 합치고, 받은 적 없는 줄의 지우기는 버린다', () => {
    const r = 합치기(new Set(['rule:서버']), [줄('RULE', 'rule:가', 'app:.A/x')], [{ ...줄('RULE', 'rule:새', 'app:.A/x'), learned: null }, { ...줄('RULE', 'rule:서버', 'app:.A/x'), learned: null }]);
    expect(typeof r !== 'string' && r.rows.map((x) => x.key)).toEqual(['rule:가', 'rule:서버']);
  });

  it('파일에 쓰고 셈을 찍는다 · 비밀번호가 든 줄은 안 받는다', () => {
    expect(적기([자료], JSON.stringify([줄('RULE', 'rule:가', 'app:.A/x')]))).toBe(0);
    expect(JSON.parse(readFileSync(join(자료, 'app-learned.json'), 'utf8')).rows).toHaveLength(1);
    expect(적기([자료], JSON.stringify([줄('RULE', 'rule:나', 'app:.A/x', { ...확인, text: 'secret!' })]), { PLATFORM_ACCOUNTS: JSON.stringify([{ loginPassword: 'secret!' }]) })).toBe(1);
    expect(적기([자료], '{')).toBe(1);
    expect(적기([], '[]')).toBe(2);
  });
});

describe('찾기 명령', () => {
  beforeEach(() => {
    mkdirSync(join(자료, 'crawl'));
    쓰기('crawl/list.json', [{ 주소: 'app:.A/가' }]);
    쓰기('app-learned.txt', 글([줄('RULE', 'rule:글', 'app:.A/가'), 줄('NOTE', 'note:쪽지', null, { text: '다음엔 설정', belief: 'GUESS' })]));
    쓰기('app-learn-build.txt', '59');
  });

  it('목차에 종류마다 줄 수 · 남은 화면 · 쪽지를 싣는다', () => {
    const r = 찾기(자료, []);
    expect(r.글).toContain('- RULE 규칙: 1');
    expect(r.글).toContain('배운 줄 없는 화면 0');
    expect(r.글).toContain('쪽지: 다음엔 설정');
  });

  it('--check 는 남은 화면 · 열린 물음이 없을 때만 0 이다', () => {
    expect(찾기(자료, ['--check']).코드).toBe(0);
    쓰기('crawl/list.json', [{ 주소: 'app:.A/가' }, { 주소: 'app:.A/나' }]);
    const r = 찾기(자료, ['--check']);
    expect(r.코드).toBe(1);
    expect(r.글).toContain('app:.A/나');
    expect(끝내도되나(자료).남은화면).toEqual(['app:.A/나']);
  });

  it('화면 키 · 종류 · 낱말로 찾고, 정리 알림을 덧붙인다', () => {
    쓰기('app-learn.wrap', '5분 남았다');
    expect(찾기(자료, ['--screen', 'app:.A/가']).글).toContain('rule:글 · rule:글 이름 · 화면 app:.A/가 · 배움 {');
    expect(찾기(자료, ['RULE']).글).toContain('rule:글 · rule:글 이름 · app:.A/가 · 확인 · 2번 봄');
    expect(찾기(자료, ['501자째']).글).toContain('# 찾은 줄 1');
    expect(찾기(자료, ['없는말']).글).toContain('# 찾은 줄 0\n※ 5분 남았다');
  });
});
