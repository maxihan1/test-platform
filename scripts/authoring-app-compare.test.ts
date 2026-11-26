// 앱 기획서 맞대기 — 표 읽기 · 장치 ③ · 시작 표시 · 해 본 기록 고르기 · 앱에만 번호 달기 · 명령
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 배운것글짓기 } from '../apps/admin/src/prd/appLearned.js';
import { type 맞대기재료, 맞대기검사, 맞대기표읽기, 범위읽기, 시작적기, 실행, 앱번호달기, 앱맞대기자리, 앱쓸것없나, 이번기록들 } from './authoring-app-compare.js';
import type { 앱배운줄 } from './authoring-app-learned.js';

const 확인 = { text: '501자째부터 안 들어간다', belief: 'CONFIRMED' as const, seen: 2, build: '59', data: { 한도: 500 } };
const 줄 = (kind: string, key: string, learned: object = 확인): 앱배운줄 => ({ kind, key, name: `${key} 이름`, screen: 'app:.A/글쓰기', learned: learned as 앱배운줄['learned'] });
const 항목 = (reqId: string, 더?: Partial<PrdItem>): PrdItem => ({ reqId, feature: '글쓰기', text: '글은 500자까지다', basis: [{ from: '기획서', quote: '500자' }], status: 'CONFIRMED', ...더 });
const 재료 = (더: Partial<맞대기재료>): 맞대기재료 => ({ 표: { 항목: [], 앱에만: [] }, 줄들: [], 빌드: '59', 결과: null, 지금판: [], 이번: new Set(), 범위: {}, ...더 });

let 자료 = '';
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
const 기록 = (이름: string, 해봄: boolean, 시각: number) => {
  mkdirSync(join(자료, 'app-try'), { recursive: true });
  writeFileSync(join(자료, 'app-try', 이름), JSON.stringify({ 해봄 }));
  utimesSync(join(자료, 'app-try', 이름), 시각, 시각);
};
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-compare-'));
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

describe('표 읽기', () => {
  it('없거나 갈래가 틀리면 까닭 글, 맞으면 빈 칸을 채워 읽는다', () => {
    expect(맞대기표읽기(null)).toMatch(/app-compare\.json 이 없거나/);
    expect(맞대기표읽기(JSON.stringify({ 항목: [{ 요구: 'MTA-REQ-001', 갈래: '비슷함' }] }))).toMatch(/항목 1 의 꼴이 틀렸다/);
    expect(맞대기표읽기(JSON.stringify({ 항목: [{ 요구: 'MTA-REQ-001', 갈래: '같음', 배운줄: ['rule:글'] }] }))).toEqual({ 항목: [{ 요구: 'MTA-REQ-001', 갈래: '같음', 배운줄: ['rule:글'], 해본것: [] }], 앱에만: [] });
  });
});

describe('장치 ③ — 맞대기검사', () => {
  it('항목마다 갈래가 하나 있고 같음이 확인 줄을 대면 지난다', () => {
    expect(맞대기검사(재료({ 표: { 항목: [{ 요구: 'MTA-REQ-001', 갈래: '같음', 배운줄: ['rule:글'], 해본것: [] }], 앱에만: [] }, 줄들: [줄('RULE', 'rule:글')], 지금판: [항목('MTA-REQ-001')] }))).toEqual([]);
  });

  it('갈래 없는 항목 · 덜 본 줄 · 다른 빌드 줄 · observed 없는 다름을 짚는다', () => {
    const r = 맞대기검사(재료({
      표: { 항목: [{ 요구: 'MTA-REQ-001', 갈래: '같음', 배운줄: ['rule:덜'], 해본것: [] }, { 요구: 'MTA-REQ-002', 갈래: '다름', 배운줄: ['rule:옛'], 해본것: [] }], 앱에만: [] },
      줄들: [줄('RULE', 'rule:덜', { ...확인, belief: 'SEEN' }), 줄('RULE', 'rule:옛', { ...확인, build: '58' })],
      지금판: [항목('MTA-REQ-001'), 항목('MTA-REQ-002', { status: 'NEEDS_CHECK' }), 항목('MTA-REQ-003')],
    }));
    expect(r).toEqual([
      expect.stringMatching(/^MTA-REQ-003 — 갈래가 없다/),
      expect.stringMatching(/rule:덜 는 확인 줄이 아니다\(SEEN\)/),
      expect.stringMatching(/rule:옛 는 확인 줄이 아니다\(CONFIRMED · 빌드 58\)/),
      expect.stringMatching(/MTA-REQ-002\(다름\) — 확인 필요 항목인데 .*observed/),
    ]);
  });

  it('기획서에만은 시작 뒤의 해 본 기록을 대야 한다', () => {
    const 표 = { 항목: [{ 요구: 'MTA-REQ-001', 갈래: '기획서에만' as const, 배운줄: [], 해본것: ['20261126010101000-찾기.json'] }], 앱에만: [] };
    expect(맞대기검사(재료({ 표, 지금판: [항목('MTA-REQ-001')] }))).toEqual([expect.stringMatching(/해 본 기록을 안 댔다/)]);
    expect(맞대기검사(재료({ 표, 지금판: [항목('MTA-REQ-001')], 이번: new Set(['20261126010101000-찾기.json']) }))).toEqual([]);
    expect(맞대기검사(재료({ 표: { 항목: [{ ...표.항목[0]!, 해본것: [], 까닭: '앱 서버에 못 닿음' }], 앱에만: [] }, 지금판: [항목('MTA-REQ-001')] }))).toEqual([]);
  });

  it('앱에만 — 확인 필요 · 근거 화면 항목이나 안옮김을 대야 하고, 표에 없는 확인 줄은 빠짐으로 센다(ASK · 이은 줄 · 안옮김 줄은 빼고)', () => {
    const 줄들 = [줄('RULE', 'rule:더함'), 줄('INPUT', 'input:빠짐'), 줄('ASK', 'ask:왜'), 줄('RULE', 'rule:이음', { ...확인, data: { 요구: 'MTA-REQ-001' } }), 줄('STATE', 'state:안', { ...확인, data: { 안옮김: '계정에만 있는 데이터' } })];
    const 화면항목 = 항목('MTA-REQ-009', { status: 'NEEDS_CHECK', basis: [{ from: '화면', ref: 'app:.A/글쓰기', quote: '501자째부터 안 들어간다' }] });
    const 지남 = 재료({ 표: { 항목: [], 앱에만: [{ 배운줄: 'rule:더함', 요구: 'MTA-REQ-009' }, { 배운줄: 'input:빠짐', 안옮김: '요구가 아님' }] }, 줄들, 결과: [화면항목], 지금판: [항목('MTA-REQ-001')], 범위: { 화면만: true } });
    expect(맞대기검사(지남)).toEqual([]);
    const 틀림 = 맞대기검사({ ...지남, 표: { 항목: [], 앱에만: [{ 배운줄: 'rule:더함', 요구: 'MTA-REQ-001' }] } });
    expect(틀림).toEqual([
      expect.stringMatching(/^MTA-REQ-009 — 갈래가 없다/),
      expect.stringMatching(/MTA-REQ-001 는 근거 「화면」을 단 확인 필요 항목이어야 한다/),
      expect.stringMatching(/확인 줄 1개가 표에 없다 .* input:빠짐$/),
    ]);
  });

  it('이어 작성 · 반영은 맡은 요구만 보고 빠짐을 세지 않으며 앱에만을 더하지 않는다', () => {
    const r = 맞대기검사(재료({ 표: { 항목: [], 앱에만: [{ 배운줄: 'rule:가', 요구: 'MTA-REQ-002' }] }, 줄들: [줄('RULE', 'rule:가'), 줄('RULE', 'rule:나')], 지금판: [항목('MTA-REQ-001'), 항목('MTA-REQ-002', { status: 'NEEDS_CHECK', basis: [{ from: '화면', quote: 'x' }] })], 범위: { 맡은요구: ['MTA-REQ-001'] } }));
    expect(r).toEqual([expect.stringMatching(/^MTA-REQ-001 — 갈래가 없다/), expect.stringMatching(/이어 작성 · 반영은 앱에만을/)]);
  });
});

describe('시작 표시 · 해 본 기록', () => {
  it('표시는 처음 한 번만 쓰고 범위를 읽는다', () => {
    시작적기(자료, 앱맞대기자리.시작, { 맡은요구: ['MTA-REQ-001'] });
    시작적기(자료, 앱맞대기자리.시작, {});
    expect(범위읽기(자료)).toEqual({ 맡은요구: ['MTA-REQ-001'] });
  });

  it('표시보다 늦고 해 본 기록만 — 화면 읽기만 한 기록과 앞 기록은 뺀다', () => {
    쓰기(앱맞대기자리.케이스시작, '{}');
    utimesSync(join(자료, 앱맞대기자리.케이스시작), 1000, 1000);
    기록('20261126000000000-앞.json', true, 500);
    기록('20261126000000001-봄.json', false, 2000);
    기록('20261126000000002-눌러봄.json', true, 2000);
    expect([...이번기록들(자료, 앱맞대기자리.케이스시작)]).toEqual(['20261126000000002-눌러봄.json']);
  });
});

describe('자료 폴더로 — 명령 · 화면만 쓸 것 · 번호 달기', () => {
  const 배운글 = (들: 앱배운줄[]) => 배운것글짓기(들.map((x) => ({ kind: x.kind as 'RULE', key: x.key, name: x.name, screen_key: x.screen, learned: x.learned })));
  beforeEach(() => {
    쓰기('app-learned.txt', 배운글([줄('RULE', 'rule:글')]));
    쓰기('app-learn-build.txt', '59');
    쓰기('prd-current.json', { version: 1, items: [항목('MTA-REQ-001')] });
  });

  it('명령은 표가 맞으면 0, 빈칸이 있으면 1, 잘못 부르면 2', () => {
    expect(실행([자료])).toBe(2);
    expect(실행([자료, 'MTA'])).toBe(1);
    쓰기(앱맞대기자리.표, { 항목: [{ 요구: 'MTA-REQ-001', 갈래: '같음', 배운줄: ['rule:글'] }] });
    expect(실행([자료, 'MTA'])).toBe(0);
  });

  it('화면만은 결과 파일이 없고 표에 넣을 확인 줄도 없을 때만 쓸 것이 없다 — 표가 없으면 빈 표로 센다', () => {
    expect(앱쓸것없나(자료, 'MTA')).toBe(false);
    쓰기('app-learned.txt', '');
    expect(앱쓸것없나(자료, 'MTA')).toBe(true);
    쓰기('app-learned.txt', 배운글([줄('RULE', 'rule:글')]));
    쓰기(앱맞대기자리.표, { 항목: [] });
    expect(앱쓸것없나(자료, 'MTA')).toBe(false);
    쓰기(앱맞대기자리.표, { 항목: [], 앱에만: [{ 배운줄: 'rule:글', 안옮김: '요구가 아님' }] });
    expect(앱쓸것없나(자료, 'MTA')).toBe(true);
  });

  it('앱에만 줄에 받은 번호를 data.요구 로 달아 올린다 — 임시 번호는 안 단다', async () => {
    쓰기(앱맞대기자리.표, { 항목: [], 앱에만: [{ 배운줄: 'rule:글', 요구: 'MTA-REQ-009' }] });
    const 부름: { url: string; body?: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      부름.push({ url, ...(typeof init?.body === 'string' ? { body: init.body } : {}) });
      return init?.method === 'PUT' ? new Response(null, { status: 204 }) : Response.json({ text: '' });
    }));
    expect(await 앱번호달기({ 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 }, 자료, [])).toEqual(['앱 배운 줄에 요구 번호: 1줄']);
    const 올린 = JSON.parse(부름.find((x) => x.body !== undefined)!.body!) as { rows: { key: string; learned: { data: unknown } }[] };
    expect(올린.rows).toEqual([expect.objectContaining({ key: 'rule:글', learned: expect.objectContaining({ data: { 한도: 500, 요구: ['MTA-REQ-009'] } }) })]);
    쓰기(앱맞대기자리.표, { 항목: [], 앱에만: [{ 배운줄: 'rule:글', 요구: 'MTA-임시-1' }] });
    expect(await 앱번호달기({ 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 }, 자료, [])).toEqual([]);
  });
});
