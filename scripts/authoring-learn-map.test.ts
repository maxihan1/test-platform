// 게임 배우기의 판단 — 배울 것 고르기(빈 종류 · 궁금한 것 · 빌드 · 게임 글 · 요구 번호) · 사람이 볼 줄 · 시험감 · 예측 채점 · 답 적기 · 배운 줄 적기
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 지도읽기 } from './authoring-game-find.js';
import { type 시험감, 답더하기, 맞나, 시험감고르기, 시험답읽기, 시험줄, 실행 as 시험실행, 채점하기 } from './authoring-learn-exam.js';
import { 배울것고르기, 배울것없나, 배울종류, 빠진게임글, 사람줄, 쪽지글, 쪽지열쇠 } from './authoring-learn-map.js';
import { 합치기, 실행 as 적기실행 } from './authoring-learn-note.js';

type 줄재료 = [kind: string, key: string, name: string, learned?: object, 앞?: string];
const 지도글 = (줄들: 줄재료[]): string => {
  const 종류 = [...new Set(줄들.map((x) => x[0]))];
  return ['# 게임 지도 — 요소', '', ...종류.flatMap((k) => [`## ${k} (${k}) — ${줄들.filter((x) => x[0] === k).length}개`, ...줄들.filter((x) => x[0] === k).map(([, key, name, l, 앞 = '']) => `- ${key} · ${name}${앞}${l === undefined ? '' : ` · 배움 ${JSON.stringify(l)}`}`), ''])].join('\n');
};
const 지도 = (줄들: 줄재료[]) => 지도읽기(지도글(줄들));
const 다배움: 줄재료[] = 배울종류.map((k) => [k, `${k.toLowerCase()}:하나`, '하나', { text: '안다', belief: 'CONFIRMED', seen: 2, build: '59' }]);
const 볼 = { 빌드: '59', 오늘: '2026-11-25', 게임글: null };

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});
const 찍힘 = () => [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join('\n');

describe('배울것고르기', () => {
  it('빈 지도면 기획서에서 온 다섯 · 궁금한 것 · 이상한 것을 뺀 종류가 다 배울 것이다', () => {
    const b = 배울것고르기(지도([]), 볼);
    expect(b.빈종류).toEqual(배울종류);
    expect(배울종류).not.toContain('DATA');
    expect(배울종류).not.toContain('ASK');
    expect(배울것없나(b)).toBe(false);
  });

  it('종류가 다 차고 궁금한 것도 빌드 차이도 없으면 배울 것이 없다 — 학습을 건너뛴다', () => {
    expect(배울것없나(배울것고르기(지도(다배움), 볼))).toBe(true);
  });

  it('「없음」 줄도 찬 것이다 · 기획서 줄만 있는 종류는 배운 것이 아니다', () => {
    const r = 배울것고르기(지도([...다배움.filter((x) => x[0] !== 'MULTI' && x[0] !== 'SAVE'), ['MULTI', 'multi:없음', '없음', { text: '혼자 하는 게임', belief: 'CONFIRMED' }], ['SAVE', 'save:칸', '칸']]), 볼);
    expect(r.빈종류).toEqual(['SAVE']);
  });

  it('궁금한 것 — 막힌 것은 빌드가 바뀌어야, 볼 날이 있으면 그날부터, 뒤집힌 것은 안 센다', () => {
    const 궁금 = (data: object | undefined, build = '59', belief = 'GUESS'): 줄재료 => ['ASK', `ask:${JSON.stringify(data)}${build}${belief}`, '궁금', { text: 'ㄱ', belief, build, ...(data === undefined ? {} : { data }) }];
    const 것 = [궁금(undefined), 궁금({ 막힘: '계정 없음' }), 궁금({ 막힘: '계정 없음' }, '58'), 궁금({ 볼날: '2026-11-26' }), 궁금({ 볼날: '2026-11-25' }), 궁금(undefined, '59', 'OVERTURNED')];
    expect(배울것고르기(지도([...다배움, ...것]), 볼).궁금).toEqual([것[0]![1], 것[2]![1], 것[4]![1]]);
  });

  it('빌드가 다른 줄은 다시 볼 것이고, 지금 빌드를 모르면 안 본다', () => {
    const 줄들: 줄재료[] = [...다배움, ['RULE', 'rule:옛', '옛', { text: 'ㄱ', belief: 'CONFIRMED', build: '58' }], ['RULE', 'rule:뒤', '뒤', { text: 'ㄱ', belief: 'OVERTURNED', build: '58' }]];
    expect(배울것고르기(지도(줄들), 볼).빌드다름).toEqual(['rule:옛']);
    expect(배울것없나(배울것고르기(지도(줄들), { ...볼, 빌드: undefined }))).toBe(true);
  });

  it('반영 · 이어 작성은 맡은 번호에 닿는 줄만 본다 — 지도의 빈 종류는 안 본다', () => {
    const 줄들: 줄재료[] = [
      ['RULE', 'rule:가', '가', { text: 'ㄱ', belief: 'CONFIRMED', build: '59' }, ' · 근거 CG-REQ-001'],
      ['RULE', 'rule:나', '나', { text: 'ㄱ', belief: 'SEEN', build: '59' }, ' · 근거 CG-REQ-002'],
      ['DATA', 'item:다', '다', { text: 'ㄱ', belief: 'CONFIRMED', build: '59' }, ' · 기획서 {"값":1} · 근거 CG-REQ-003, CG-REQ-001 · 기획서가 바뀜(CG-REQ-003) — 지금 판으로 다시 올린다'],
      ['DATA', 'item:라', '라', undefined, ' · 근거 CG-REQ-004 · 거친 케이스 없음'],
      ['RULE', 'rule:마', '마', { text: 'ㄱ', belief: 'CONFIRMED', build: '58' }, ' · 근거 CG-REQ-005'],
    ];
    const b = 배울것고르기(지도(줄들), { ...볼, 번호들: ['CG-REQ-001', 'CG-REQ-002', 'CG-REQ-003', 'CG-REQ-004', 'CG-REQ-005', 'CG-REQ-006'] });
    expect(b).toEqual({ 빈종류: [], 궁금: [], 빌드다름: [], 게임글: [], 번호: ['CG-REQ-002', 'CG-REQ-003', 'CG-REQ-004', 'CG-REQ-005', 'CG-REQ-006'] });
    expect(배울것없나(배울것고르기(지도(줄들), { ...볼, 번호들: [] }))).toBe(true);
  });
});

describe('옛 칸', () => {
  it('지도 줄에 `data.칸` 이 비어 남아 있어도 배울 것으로 세지 않는다 — 칸 세기는 걷어냈다(2026-11-25 GAME-F6-05)', () => {
    const 옛줄: 줄재료 = ['INPUT', 'input:공격', '공격', { text: 'ㄱ', belief: 'SEEN', build: '59', data: { 칸: { 어디서: '모름', 닿는곳: '' } } }];
    expect(배울것없나(배울것고르기(지도([...다배움, 옛줄]), 볼))).toBe(true);
  });
});

describe('쪽지 — 다음 AI 에게 남기는 말', () => {
  const 쪽지 = (learned: object | undefined): 줄재료 => ['PLAY', 쪽지열쇠, '쪽지', learned];
  it('지도의 쪽지 줄 글을 준다 — 없거나 비웠거나 뒤집었으면 없다. 서버가 받는 길이에서 자른다', () => {
    expect(쪽지글(지도([쪽지({ text: ' 첫 맵 3판 다 짐\n다음에는 길 옆에 심어 본다 ', belief: 'GUESS' })]))).toBe('첫 맵 3판 다 짐\n다음에는 길 옆에 심어 본다');
    expect(쪽지글(지도(다배움))).toBeNull();
    expect(쪽지글(지도([쪽지(undefined)]))).toBeNull();
    expect(쪽지글(지도([쪽지({ text: ' ', belief: 'GUESS' })]))).toBeNull();
    expect(쪽지글(지도([쪽지({ text: '옛 생각', belief: 'OVERTURNED' })]))).toBeNull();
    expect(쪽지글(지도([쪽지({ text: 'ㄱ'.repeat(1_200), belief: 'GUESS' })]))).toHaveLength(1_001);
  });

  it('쪽지는 배운 줄이 아니다 — 「이기는 법」 종류를 채우지 않고, 빌드가 달라도 다시 볼 줄이 아니고, 게임 글이 든 것으로 치지 않는다', () => {
    const 줄들: 줄재료[] = [...다배움.filter((x) => x[0] !== 'PLAY'), 쪽지({ text: '악마가 기지에 닿으면 진다고 한다', belief: 'GUESS', build: '58' })];
    const b = 배울것고르기(지도(줄들), { ...볼, 게임글: '악마가 기지에 닿으면 진다고 한다' });
    expect(b.빈종류).toEqual(['PLAY']);
    expect(b.빌드다름).toEqual([]);
    expect(b.게임글).toEqual(['악마가 기지에 닿으면 진다고 한다']);
  });

  it('적는 명령이 쪽지 열쇠를 받는다 — 글이 서버 길이를 넘으면 거절한다', () => {
    const 줄 = (글: string) => ({ kind: 'PLAY', key: 쪽지열쇠, name: '쪽지', learned: { text: 글, belief: 'GUESS' } });
    expect(합치기(지도([]), [], 줄('첫 맵 3판 다 짐'))).toMatchObject({ 수: 1 });
    expect(합치기(지도([]), [], 줄('ㄱ'.repeat(1_001)))).toContain('learned.text');
  });
});

describe('빠진게임글', () => {
  it('지도의 배운 줄 어디에든 그 문장이 들어야 든 것이다 — 자리 줄(#)과 빈칸 차이는 안 본다', () => {
    const 글 = '# 공지 창\n고기를 먹이면  식물이 자란다\n악마가 기지에 닿으면 진다\n\n악마가 기지에 닿으면 진다\n방향키로 움직인다';
    const m = 지도([['RULE', 'rule:먹이', '먹이', { text: 'ㄱ', belief: 'GAME_TEXT', data: { 글: ['고기를 먹이면 식물이 자란다'] } }], ['GOAL', 'goal:패배', '패배', { text: '악마가 기지에 닿으면 진다', belief: 'GAME_TEXT' }]]);
    expect(빠진게임글(글, m)).toEqual(['방향키로 움직인다']);
    expect(배울것고르기(m, { ...볼, 게임글: 글 }).게임글).toEqual(['방향키로 움직인다']);
    expect(빠진게임글(null, m)).toEqual([]);
  });

  it('짧은 줄은 남의 문장에 들어 있는 것으로 치지 않는다 — 그대로 적은 줄이 있어야 든 것이다', () => {
    const m = 지도([['RULE', 'rule:방패', '방패 들기', { text: '방패를 들면 느려진다', belief: 'SEEN' }], ['RULE', 'rule:특기', '특기', { text: 'ㄱ', belief: 'GAME_TEXT', data: { 글: '감속 / 다중 타격' } }]]);
    expect(빠진게임글('방패\n감속\n다중 타격', m)).toEqual(['방패']);
  });
});

describe('사람줄', () => {
  const m = 지도([
    ['ODD', 'odd:체력', '체력 표시', { text: '체력이 0 인데 안 진다', belief: 'SEEN' }],
    ['ODD', 'odd:옛것', '옛것', { text: '지난 작성 것', belief: 'SEEN' }],
    ['ASK', 'ask:셋', '세 명', { text: 'ㄱ', belief: 'GUESS', data: { 막힘: '세 번째 패드가 없다' } }],
    ['ASK', 'ask:열림', '열림', { text: 'ㄱ', belief: 'GUESS' }],
    ['RULE', 'rule:가', '가', { text: '규칙', belief: 'CONFIRMED' }],
  ]);
  it('이번 작성이 적은 이상한 것과 막힌 것만 — 지도 요약(규칙)은 안 싣는다', () => {
    expect(사람줄(m, new Set(['odd:체력', 'ask:셋', 'ask:열림', 'rule:가']), [])).toEqual(['게임 버그 후보: 체력 표시 — 체력이 0 인데 안 진다', '게임에서 사람에게 물을 것: 세 명(세 번째 패드가 없다)']);
    expect(사람줄(m, new Set(['rule:가']), [])).toEqual([]);
  });
  it('비밀번호가 섞이면 글을 안 적는다', () => {
    expect(사람줄(m, new Set(['odd:체력']), ['0 인데 안'])).toEqual(['게임 버그 후보: 1개 — 테스트 계정 비밀번호가 들어 있어 안 적음']);
  });
});

describe('시험', () => {
  const 확인 = (kind: string, n: number, x: object = {}): 줄재료 => [kind, `${kind.toLowerCase()}:${n}`, `${kind}${n}`, { text: 'ㄱ', belief: 'CONFIRMED', seen: 2, build: '59', data: n, ...x }];
  const 감 = (열쇠: string, 랜덤 = false): 시험감 => ({ 열쇠, 종류: 'RULE', 이름: '가', 문장: 'ㄱ', 랜덤, 잰것: 1 });

  it('확인된 줄만 종류를 돌아가며 여덟까지 — 치트로 본 것 · 덜 본 것은 뺀다', () => {
    const m = 지도([...[1, 2, 3, 4, 5, 6].map((n) => 확인('CALC', n)), ...[1, 2, 3].map((n) => 확인('RULE', n)), 확인('TIME', 1, { shape: 'RANGE' }), 확인('GOAL', 1, { marks: ['CHEAT'] }), 확인('MATCH', 1, { belief: 'SEEN' }), 확인('ODD', 1)]);
    const 들 = 시험감고르기(m);
    expect(들.map((x) => x.열쇠)).toEqual(['rule:1', 'calc:1', 'time:1', 'rule:2', 'calc:2', 'rule:3', 'calc:3', 'calc:4']);
    expect(들.find((x) => x.열쇠 === 'time:1')?.랜덤).toBe(true);
    expect(시험감고르기(지도([]))).toEqual([]);
  });

  it('맞나 — 값 · 범위 · 목록', () => {
    expect([맞나({ 값: 5 }, 5), 맞나({ 값: 5 }, 6), 맞나({ 최소: 1, 최대: 3 }, 3), 맞나({ 최소: 1, 최대: 3 }, '2'), 맞나({ 목록: ['가', '나'] }, '나'), 맞나({ 목록: ['가'] }, '다')]).toEqual([true, false, true, false, true, false]);
  });

  it('고정 줄은 한 번 벗어나면 틀림, 랜덤 줄은 셋 넘게 다 벗어나야 틀림이고 그 밖은 표본이다', () => {
    const 들 = [감('a:1'), 감('a:2'), 감('a:3', true), 감('a:4', true), 감('a:5'), 감('a:6'), 감('a:7', true)];
    const 예측 = 들.slice(0, 6).map((x) => ({ 열쇠: x.열쇠, 조건: 'ㄱ', 예측: { 값: 1 } })).concat([{ 열쇠: 'a:7', 조건: 'ㄱ', 예측: { 값: 1 } }]);
    const 결과 = [{ 열쇠: 'a:1', 잰값: [1, 1] }, { 열쇠: 'a:2', 잰값: [1, 2] }, { 열쇠: 'a:3', 잰값: [1, 2, 3] }, { 열쇠: 'a:4', 잰값: [2, 2, 3] }, { 열쇠: 'a:5', 못잼: '못 감' }, { 열쇠: 'a:7', 잰값: [2, 2] }];
    expect(채점하기(들, { 예측, 결과 })).toEqual({ 맞음: ['a:1'], 틀림: ['a:2', 'a:4'], 표본: ['a:3', 'a:7'], 못잼: ['a:5', 'a:6'] });
  });

  it('성적 줄 — 첫 판은 조작 기록이 있어야 끝까지 간 것이다', () => {
    const 점 = { 맞음: ['a'], 틀림: ['calc:1'], 표본: [], 못잼: ['b'] };
    expect(시험줄(점, { 예측: [], 결과: [], 판: { 끝: true, 이김: false, 기록: 'x.json' } }, true)).toBe('첫 판 끝까지 감(짐) · 예측 3개 — 맞음 1 · 틀림 1 · 못 잼 1 — 「확인」에서 내린 줄: calc:1');
    expect(시험줄(점, { 예측: [], 결과: [], 판: { 끝: true, 기록: 'x.json' } }, false)).toContain('조작 기록 없음');
    expect(시험줄(점, { 예측: [], 결과: [], 판: { 끝: false, 까닭: '켜지\n않음' } }, false)).toContain('첫 판을 끝까지 못 감(켜지 않음)');
    expect(시험줄(점, { 예측: [], 결과: [] }, false)).toContain('첫 판 안 해 봄');
  });

  it('예측은 재기 전에 한 번만 — 예측 없이 결과를, 결과 뒤에 예측을 못 고친다', () => {
    const 들 = [감('a:1')];
    const 빈 = { 예측: [], 결과: [] };
    expect(답더하기(들, 빈, '결과', { 열쇠: 'a:1', 잰값: [1] })).toContain('예측부터');
    expect(답더하기(들, 빈, '예측', { 열쇠: 'a:9', 조건: 'ㄱ', 예측: { 값: 1 } })).toContain('시험감에 없는');
    expect(답더하기(들, 빈, '예측', { 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 최소: 3, 최대: 1 } })).toContain('예측');
    const 적음 = 답더하기(들, 빈, '예측', [{ 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 값: 1 } }]);
    if (typeof 적음 === 'string') throw new Error(적음);
    expect(답더하기(들, 적음, '예측', { 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 값: 2 } })).toContain('한 번만');
    const 잼 = 답더하기(들, 적음, '결과', { 열쇠: 'a:1', 잰값: [1] });
    if (typeof 잼 === 'string') throw new Error(잼);
    expect(답더하기(들, 잼, '결과', { 열쇠: 'a:1', 잰값: [2] })).toContain('한 번만');
    expect(답더하기(들, 잼, '판', { 끝: '네' })).toContain('꼴');
  });

  it('자식이 답 파일을 직접 고쳐 꼴이 틀리면 그 칸만 버린다 — 작성이 깨지지 않는다', () => {
    const 글 = JSON.stringify({ 예측: [null, { 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 값: 1 } }, { 열쇠: 'a:2', 조건: 'ㄱ', 예측: 5 }], 결과: [{ 열쇠: 'a:1', 잰값: 5 }, 3], 판: { 끝: true, 기록: 1 } });
    expect(시험답읽기(글)).toEqual({ 예측: [{ 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 값: 1 } }], 결과: [], 판: { 끝: true } });
    expect(시험답읽기('null')).toEqual({ 예측: [], 결과: [] });
    expect(시험답읽기('[')).toEqual({ 예측: [], 결과: [] });
  });

  it('명령은 자료 폴더의 답 파일에 쌓는다', () => {
    writeFileSync(join(자료, 'game-exam.json'), JSON.stringify([감('a:1')]));
    expect(시험실행([자료, '예측'], '{"열쇠":"a:1","조건":"ㄱ","예측":{"값":1}}')).toBe(0);
    expect(시험실행([자료, '결과'], '{"열쇠":"a:1","잰값":[2]}')).toBe(0);
    expect(시험실행([자료, '판'], '{"끝":true}')).toBe(0);
    expect(JSON.parse(readFileSync(join(자료, 'game-exam-answer.json'), 'utf8'))).toEqual({ 예측: [{ 열쇠: 'a:1', 조건: 'ㄱ', 예측: { 값: 1 } }], 결과: [{ 열쇠: 'a:1', 잰값: [2] }], 판: { 끝: true } });
    expect(시험실행([자료, '예측'], '{')).toBe(1);
    expect(시험실행([자료, '딴것'], '{}')).toBe(2);
  });
});

describe('배운 줄 적기', () => {
  const 배움 = { text: 'ㄱ', belief: 'GUESS' };
  const 규칙 = (key: string, learned: object | null = 배움) => ({ kind: 'RULE', key, name: '가', learned });

  it('같은 열쇠는 새것이 이기고, 이 세션에서 적었다 지운 줄은 빠진다 — 서버에 있는 줄은 지움으로 남는다', () => {
    const m = 지도([['RULE', 'rule:서버', '서버', 배움]]);
    const r = 합치기(m, [규칙('rule:가'), 규칙('rule:나')], [규칙('rule:가', { text: '바뀜', belief: 'SEEN' }), 규칙('rule:나', null), 규칙('rule:서버', null)]);
    if (typeof r === 'string') throw new Error(r);
    expect(r.elements).toEqual([규칙('rule:가', { text: '바뀜', belief: 'SEEN' }), 규칙('rule:서버', null)]);
  });

  it('한 줄이라도 틀리면 아무것도 안 적고 어느 열쇠인지 알린다 — 서버는 통째로 거절한다', () => {
    expect(합치기(지도([]), [], [규칙('rule:가'), { kind: 'RULE', key: 'rule:나', name: '나', learned: { text: 'ㄱ', belief: '확신' } }])).toContain('rule:나 — elements.1.learned.belief');
    expect(합치기(지도([]), [], { kind: 'RULE', key: 'calc:가', name: '가', learned: 배움 })).toContain('elements.0.key');
    expect(합치기(지도([]), [], { ...규칙('rule:가'), value: 5 })).toContain('value 는 기획서 값');
    expect(합치기(지도([]), [], { kind: 'RULE', key: 'rule:가', name: '가' })).toContain('learned 가 없다');
  });

  it('기획서에서 온 줄에는 근거를 안 싣는다 — 실으면 서버가 「기획서가 바뀜」을 비워 다음 세션이 옛 값을 못 본다. 배운 종류 줄은 앞 근거에 더한다', () => {
    const m = 지도([['DATA', 'item:검', '검', undefined, ' · 기획서 {"값":1} · 근거 R-12 · 기획서가 바뀜(R-12) — 지금 판으로 다시 올린다'], ['RULE', 'rule:가', '가', 배움, ' · 근거 R-1']]);
    const r = 합치기(m, [], [{ ...규칙('item:검'), kind: 'DATA', reqIds: ['R-12'] }, { ...규칙('rule:가'), reqIds: ['R-2'] }, { ...규칙('rule:새'), reqIds: ['R-3'] }]);
    if (typeof r === 'string') throw new Error(r);
    expect(r.elements.map((e) => (e as { reqIds?: string[] }).reqIds)).toEqual([undefined, ['R-1', 'R-2'], ['R-3']]);
  });

  it('게임이 만든 종류는 지도나 같은 세션에 정의가 있어야 받는다', () => {
    const 눈 = { kind: 'WEATHER', key: 'weather:눈', name: '눈', learned: 배움 };
    expect(합치기(지도([]), [], 눈)).toContain('elements.0.kind');
    expect(typeof 합치기(지도([['KIND', 'kind:WEATHER', '날씨', { text: '날씨가 무엇을 바꾸나' }]]), [], 눈)).toBe('object');
  });

  it('명령 — 파일에 합치고 빠진 게임 글과 정리 알림을 찍는다', () => {
    writeFileSync(join(자료, 'game-map.txt'), 지도글([]));
    writeFileSync(join(자료, 'game-guide.txt'), '악마가 닿으면 진다\n고기를 먹인다');
    writeFileSync(join(자료, 'game-learn.wrap'), '세션 끝까지 5분 남았다');
    expect(적기실행([자료], JSON.stringify([규칙('rule:가', { text: '고기를 먹인다', belief: 'GAME_TEXT' })]), {})).toBe(0);
    expect(JSON.parse(readFileSync(join(자료, 'game-learned.json'), 'utf8')).elements).toHaveLength(1);
    expect(찍힘()).toContain('지도에 안 든 문장 1 — 악마가 닿으면 진다');
    expect(찍힘()).toContain('※ 세션 끝까지 5분 남았다');
  });

  it('명령 — 비밀번호가 들면 안 적는다 · 지도 글이 없으면 2', () => {
    writeFileSync(join(자료, 'game-map.txt'), 지도글([]));
    const env = { PLATFORM_ACCOUNTS: JSON.stringify([{ role: '일반 회원', loginId: 'a', loginPassword: 'pw-secret-1' }]) };
    expect(적기실행([자료], JSON.stringify(규칙('rule:가', { text: '비번은 pw-secret-1', belief: 'GUESS' })), env)).toBe(1);
    expect(적기실행([자료], JSON.stringify(규칙('rule:가', { text: 'ㄱ', belief: 'GUESS', data: { 'pw-secret-1': '됨' } })), env)).toBe(1);
    expect(existsSync(join(자료, 'game-learned.json'))).toBe(false);
    expect(적기실행([join(자료, '없음')], '[]', {})).toBe(2);
    expect(적기실행([자료], '{', {})).toBe(1);
  });
});
