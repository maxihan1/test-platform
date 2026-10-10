// 화면이 맞음 자식 뒤 검사 — 결과 파일에서 그 번호만 골라 합치기 · 고친 번호가 없으면 안 올림 · 못 올리면 거절 · PR 머리 줄
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { 반영계획 } from './authoring-apply.js';
import type { 사본 } from './authoring-copy.js';
import { 옮긴것읽기, type 옮긴것 } from './authoring-prd.js';
import { 안옮김뒤, 화면대로합치기 } from './authoring-screen-right.js';

const 항목 = (reqId: string, text: string, 덧: Partial<PrdItem> = {}): PrdItem => ({
  reqId, feature: '회원가입', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED', ...덧,
});
const 화면근거 = [{ from: '화면', ref: '/join', quote: '실행 RUN 42 실패 — 사람이 화면이 맞다고 판정' }];
const 판 = [항목('X-REQ-001', '비밀번호는 8자 이상이어야 한다'), 항목('X-REQ-002', '약관에 동의한다', { byPerson: true }), 항목('X-REQ-003', '가입하면 환영 문구가 보인다')];
const 읽기 = (몸: unknown): 옮긴것 => {
  const r = 옮긴것읽기(몸, 'X');
  if ('사유' in r) throw new Error(r.사유);
  return r;
};

describe('화면대로합치기', () => {
  it('화면이 맞음 번호의 바뀐 항목만 그 자리에 넣고 확정 · 사람이 고친 것으로 둔다 — 다른 번호 · 새 항목 · 지움은 버린다', () => {
    const 옮긴 = 읽기({
      items: [
        { reqId: 'X-REQ-001', feature: '회원가입', text: '비밀번호는 10자 이상이어야 한다', basis: 화면근거, status: 'CONFIRMED' },
        { reqId: 'X-REQ-003', feature: '회원가입', text: '다른 번호를 고쳤다', basis: 화면근거, status: 'CONFIRMED' },
        { feature: '회원가입', text: '새 항목', basis: 화면근거, status: 'CONFIRMED' },
      ],
      removed: ['X-REQ-002'],
    });
    const r = 화면대로합치기(판, 옮긴, ['X-REQ-001', 'X-REQ-002']);
    expect(r.고친).toEqual(['X-REQ-001']);
    expect(r.items).toEqual([
      { reqId: 'X-REQ-001', feature: '회원가입', text: '비밀번호는 10자 이상이어야 한다', basis: 화면근거, status: 'CONFIRMED', byPerson: true },
      판[1],
      판[2],
    ]);
  });

  it('판과 요구가 같으면 상태가 달라도 고친 것이 아니다 — 화면 근거뿐이면 확인 필요로 읽힌다', () => {
    const 같은 = 항목('X-REQ-001', '비밀번호는 8자 이상이어야 한다', { basis: 화면근거 });
    const 옮긴 = 읽기({ items: [같은] });
    expect(옮긴.items[0]?.status).toBe('NEEDS_CHECK');
    expect(화면대로합치기([같은], 옮긴, ['X-REQ-001'])).toEqual({ items: [같은], 고친: [] });
  });
});

describe('안옮김뒤', () => {
  const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };
  const 답 = (status: number, 몸: unknown = {}) => new Response(JSON.stringify(몸), { status });
  const 원장 = { 없음: '그대로' };
  const 기준 = { 사람이뺌: new Set<string>(), 다음요청: new Set<string>(), 칸재료: null };
  const 계획 = (화면 = true): 반영계획 => ({
    기준판: 3, 지금판: 3, 다시씀: [], 새항목: [], 지움: [],
    ...(화면 ? { 화면이맞음: { runId: 42, tcId: 'X-FN-001', env: 'qa', 번호들: [{ 번호: 'X-REQ-001', 문장: '비밀번호는 8자 이상이어야 한다', 케이스: [] }] } } : {}),
  });
  let 폴더 = '';
  let 자리: 사본;
  beforeEach(() => {
    폴더 = mkdtempSync(join(tmpdir(), 'screen-right-'));
    자리 = { 자료: join(폴더, '자료'), 트리: join(폴더, '트리') } as 사본;
    mkdirSync(join(자리.자료, 'out'), { recursive: true });
    mkdirSync(join(자리.트리, 'tests', 'x'), { recursive: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(폴더, { recursive: true, force: true });
  });
  const 결과쓰기 = (몸: unknown) => writeFileSync(join(자리.자료, 'out', 'prd.json'), JSON.stringify(몸));
  const 부르기 = (반영계획 = 계획(), 비밀 = {}) =>
    안옮김뒤(서버, 'X', 7, 자리, { version: 3, 번호들: 판.map((i) => i.reqId), items: 판 }, { 원장, 기준, 기준표: null, 반영: { 계획: 반영계획, 사본: 'apply.json' } }, 비밀, 'x');
  const 머리 = '표준 기획서 반영: 판 3 → 판 3 · 다시 씀 0 · 새 항목 0 · 지움 0';

  it('이어 작성은 줄 없이, 반영은 반영 줄만 단다 — 서버를 부르지 않는다', async () => {
    const 건것 = vi.fn(async () => 답(200));
    vi.stubGlobal('fetch', 건것);
    expect(await 안옮김뒤(서버, 'X', 7, 자리, { version: 3, 번호들: [], items: [] }, { 원장, 기준, 기준표: null }, {}, 'x')).toEqual({ 줄: [], 원장, 기준 });
    expect(await 부르기(계획(false))).toEqual({ 줄: [머리], 원장, 기준 });
    expect(건것).not.toHaveBeenCalled();
  });

  it('결과 파일이 없거나 고친 번호가 없으면 올리지 않는다 — 케이스만 고친 PR 이다', async () => {
    const 건것 = vi.fn(async () => 답(200, { version: 3, items: 판 }));
    vi.stubGlobal('fetch', 건것);
    const 케이스만 = { 줄: [머리, '화면이 맞음: RUN 42 · X-FN-001 · 고친 요구 없음 — 케이스만'], 원장, 기준 };
    expect(await 부르기()).toEqual(케이스만);
    결과쓰기({ items: [{ ...판[2], text: '맡지 않은 번호' }] });
    expect(await 부르기()).toEqual(케이스만);
    expect(건것.mock.calls.every((c) => (c as unknown[])[1] === undefined || ((c as unknown[])[1] as RequestInit).method !== 'POST')).toBe(true);
  });

  it('고친 번호만 지금 판에 합쳐 올리고 머리 줄에 번호를 단다. 원장은 고친 문장으로 다시 짓는다', async () => {
    let 몸: { baseVersion?: number; items?: { reqId: string; text: string }[] } = {};
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'POST') return 답(200, { version: 3, items: 판 });
      몸 = JSON.parse(String(init.body)) as typeof 몸;
      return 답(200, { version: 4, keptByPerson: [] });
    });
    결과쓰기({ items: [{ reqId: 'X-REQ-001', feature: '회원가입', text: '비밀번호는 10자 이상이어야 한다', basis: 화면근거, status: 'CONFIRMED' }], removed: ['X-REQ-003'] });
    const r = await 부르기();
    expect(몸.baseVersion).toBe(3);
    expect(몸.items?.map((i) => [i.reqId, i.text])).toEqual([
      ['X-REQ-001', '비밀번호는 10자 이상이어야 한다'],
      ['X-REQ-002', '약관에 동의한다'],
      ['X-REQ-003', '가입하면 환영 문구가 보인다'],
    ]);
    if ('거절' in r) throw new Error(r.거절);
    expect(r.줄).toEqual([머리, '화면이 맞음: RUN 42 · X-FN-001 · 고친 요구 X-REQ-001']);
    expect('항목' in r.원장 ? r.원장.항목.map((h) => [h.번호, h.문장, h.확인필요]) : r.원장).toEqual([
      ['X-REQ-001', '비밀번호는 10자 이상이어야 한다', undefined],
      ['X-REQ-002', '약관에 동의한다', undefined],
      ['X-REQ-003', '가입하면 환영 문구가 보인다', undefined],
    ]);
  });

  it('못 올리거나 비밀값이 들었으면 올리기 거절이다', async () => {
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? 답(400, { error: 'BAD_PRD', detail: '0.text' }) : 답(200, { version: 3, items: 판 })));
    결과쓰기({ items: [{ reqId: 'X-REQ-001', feature: '회원가입', text: '비밀번호는 10자 이상이어야 한다', basis: 화면근거, status: 'CONFIRMED' }] });
    expect(await 부르기()).toEqual({ 거절: '표준 기획서를 못 올렸다 — 400 BAD_PRD 0.text', 줄: [머리] });
    결과쓰기({ items: [{ reqId: 'X-REQ-001', feature: '회원가입', text: '비번 pass1234 로 들어간다', basis: 화면근거, status: 'CONFIRMED' }] });
    expect(await 부르기(계획(), { 계정: 'pass1234' })).toEqual({ 거절: expect.stringContaining('비밀값') as string, 줄: [머리] });
  });
});
