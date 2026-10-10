// 표준 기획서 껍데기 검사 — 지금 판 받아 두기 · 결과 읽기 · 비밀값 · 올린 뒤 임시 번호 바꿔 적기 · 못 올리면 거절
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { 사본 } from './authoring-copy.js';
import type { 원장 } from './authoring-ledger.js';
import { 앞결과, 옮기기올리기, 판받기 } from './authoring-prd-io.js';

const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };
const 답 = (status: number, 몸: unknown = {}) => new Response(JSON.stringify(몸), { status });
const 있던 = { reqId: 'MKT-REQ-001', feature: '회원가입', text: '아이디는 4자 이상', basis: [{ from: '기획서.docx', ref: 'REQ-1', quote: '아이디 4자 이상' }], status: 'CONFIRMED' };
const 앞 = { version: 2, 번호들: ['MKT-REQ-001', 'MKT-REQ-003'], items: [] };
const 원장하나: 원장 = { 항목: [{ 번호: 'REQ-1', 자료: '기획서.docx' }, { 번호: 'REQ-2', 자료: '기획서.docx' }], 가족: {}, 모드: {}, 경고: [], 빠진자료: [], 꼴: {} };

let 폴더 = '';
let 자리: 사본;
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'prd-io-'));
  자리 = { 자료: join(폴더, '자료'), 트리: join(폴더, '트리') } as 사본;
  mkdirSync(자리.자료);
  mkdirSync(join(자리.트리, 'docs', 'cases'), { recursive: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(폴더, { recursive: true, force: true });
});

const 결과쓰기 = (몸: unknown) => {
  mkdirSync(join(자리.자료, 'out'), { recursive: true });
  writeFileSync(join(자리.자료, 'out', 'prd.json'), typeof 몸 === 'string' ? 몸 : JSON.stringify(몸));
};
const 올리기 = (원본: 원장 | { 없음: string } = 원장하나, 비밀 = {}, 앞판: typeof 앞 = 앞) => 옮기기올리기(서버, 'MKT', 7, 자리, 앞판, 원본, 비밀, null, 'mkt');

describe('판받기', () => {
  it('지금 판을 자료 폴더에 두고 프롬프트 재료와 앞 판을 돌려준다', async () => {
    const 건것: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => (건것.push(url), 답(200, { version: 2, items: [있던] })));
    const r = await 판받기(서버, 'MKT', 7, 자리.자료);
    expect(건것).toEqual(['http://admin:3000/api/authoring/requests/7/prd?service=MKT']);
    expect(r).toEqual({
      입력: { 지금판: join(자리.자료, 'prd-current.json'), 결과: join(자리.자료, 'out', 'prd.json'), 판: 2, 항목수: 1 },
      앞판: { version: 2, 번호들: ['MKT-REQ-001'], items: [있던] },
    });
    expect(JSON.parse(readFileSync(join(자리.자료, 'prd-current.json'), 'utf8'))).toEqual({ version: 2, items: [있던] });
  });

  it('역방향 비밀번호는 날 글자와 이스케이프 꼴 둘 다 가려 쓰고, 원장을 만들 앞 판 항목도 가린 것이다', async () => {
    vi.stubGlobal('fetch', async () => 답(200, { version: 1, items: [{ ...있던, text: '비번은 pa"ss1234 이다' }] }));
    const r = await 판받기(서버, 'MKT', 7, 자리.자료, 'pa"ss1234');
    const 글 = readFileSync(join(자리.자료, 'prd-current.json'), 'utf8');
    expect(글).not.toContain('ss1234');
    expect(글).toContain('••••••');
    expect('앞판' in r && r.앞판.items[0]?.text).not.toContain('ss1234');
  });

  it('비밀번호가 JSON 키와 같아도 글 값만 가려 깨진 JSON 을 만들지 않는다', async () => {
    vi.stubGlobal('fetch', async () => 답(200, { version: 1, items: [{ ...있던, text: '본문 text 칸' }] }));
    const r = await 판받기(서버, 'MKT', 7, 자리.자료, 'text');
    expect('앞판' in r && r.앞판.items[0]?.text).toBe('본문 •••••• 칸');
    expect(JSON.parse(readFileSync(join(자리.자료, 'prd-current.json'), 'utf8'))).toMatchObject({ version: 1 });
  });

  it('앞 자식이 심은 링크를 따라 쓰지 않고 지운 뒤 새로 만든다', async () => {
    const 남의것 = join(폴더, 'victim.txt');
    writeFileSync(남의것, '그대로');
    symlinkSync(남의것, join(자리.자료, 'prd-current.json'));
    vi.stubGlobal('fetch', async () => 답(200, { version: 0, items: [] }));
    await 판받기(서버, 'MKT', 7, 자리.자료);
    expect(readFileSync(남의것, 'utf8')).toBe('그대로');
  });

  it('못 받으면 까닭을 돌려준다 — 작성은 표준 기획서만 읽어 부르는 쪽이 실패로 끝낸다. 거절은 던진다', async () => {
    vi.stubGlobal('fetch', async () => 답(500));
    expect(await 판받기(서버, 'MKT', 7, 자리.자료)).toEqual({ 까닭: '표준 기획서 지금 판을 못 읽었다 (500)' });
    vi.stubGlobal('fetch', async () => 답(403));
    await expect(판받기(서버, 'MKT', 7, 자리.자료)).rejects.toThrow(/403/);
  });
});

describe('앞결과 — 이어받은 폴더의 결과 파일', () => {
  it('있으면 푼 값, 없거나 깨졌으면 undefined', () => {
    expect(앞결과(자리, [], 'MKT')).toBeUndefined();
    결과쓰기('{ 깨짐');
    expect(앞결과(자리, [], 'MKT')).toBeUndefined();
    결과쓰기({ items: [] });
    expect(앞결과(자리, [], 'MKT')).toEqual({ items: [] });
  });

  it('앞 실행이 올린 뒤 바꿔 적기 전에 멈췄으면 판에 든 항목의 임시 번호를 표 · 결과 파일에서 받은 번호로 먼저 바꾼다', () => {
    const 올라간 = { ...있던, reqId: 'MKT-REQ-009', text: '닉네임은 필수' };
    결과쓰기({ items: [{ ...올라간, reqId: 'MKT-NEW-001' }] });
    writeFileSync(join(자리.트리, 'docs', 'cases', 'MKT.md'), '| 1 | 정상 | 전 | 조 | 결 | MKT-NEW-001 | MKT-FN-010 |\n');
    const 몸 = 앞결과(자리, [올라간 as never], 'MKT') as { items: { reqId: string }[] };
    expect(몸.items[0]?.reqId).toBe('MKT-REQ-009');
    expect(readFileSync(join(자리.트리, 'docs', 'cases', 'MKT.md'), 'utf8')).toContain('| MKT-REQ-009 |');
    expect(readFileSync(join(자리.자료, 'out', 'prd.json'), 'utf8')).not.toContain('MKT-NEW-001');
  });
});

describe('옮기기올리기', () => {
  it('결과 파일이 없거나 JSON 이 아니면 올리지 않고 거절한다 — 표가 판에 없는 번호를 가리킨다', async () => {
    const 건것 = vi.fn(async () => 답(200));
    vi.stubGlobal('fetch', 건것);
    expect(await 올리기()).toEqual({ 거절: '표준 기획서 결과(out/prd.json)가 없다', 줄: [] });
    결과쓰기('{ 깨짐');
    expect(await 올리기()).toEqual({ 거절: '표준 기획서 결과를 못 읽었다 — JSON 이 아니다', 줄: [] });
    expect(건것).not.toHaveBeenCalled();
  });

  it('테스트 계정 비밀번호가 들었으면 이스케이프돼 있어도 올리지 않고 거절한다', async () => {
    const 건것 = vi.fn(async () => 답(200));
    vi.stubGlobal('fetch', 건것);
    결과쓰기({ items: [{ ...있던, reqId: undefined, text: '비번은 pa"ss1234 로 들어간다' }] });
    expect(await 올리기(원장하나, { 계정: 'pa"ss1234' })).toEqual({ 거절: expect.stringContaining('비밀값') as string, 줄: [] });
    expect(건것).not.toHaveBeenCalled();
  });

  it('지금 판에 합쳐 올리고 저장된 판에서 새 번호를 읽어 표 · 결과 파일의 임시 번호를 바꾸고 원장을 그 판으로 만든다', async () => {
    const 남이더한 = { ...있던, reqId: 'MKT-REQ-002', feature: '장바구니', text: '장바구니는 20개까지' };
    const 새것 = { reqId: 'MKT-REQ-004', feature: '회원가입', text: '닉네임은 필수', basis: [{ from: '기획서.docx', ref: 'REQ-2', quote: '닉네임 필수' }], status: 'CONFIRMED' };
    let 몸: { baseVersion?: number; items?: Record<string, unknown>[] } = {};
    let 올렸다 = false;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'POST') return 올렸다 ? 답(200, { version: 6, items: [있던, 남이더한, 새것] }) : 답(200, { version: 5, items: [있던, 남이더한] });
      몸 = JSON.parse(String(init.body)) as typeof 몸;
      올렸다 = true;
      return 답(200, { version: 6, keptByPerson: ['MKT-REQ-001'] });
    });
    결과쓰기({ items: [{ ...새것, reqId: 'MKT-NEW-001' }] });
    writeFileSync(join(자리.트리, 'docs', 'cases', 'MKT.md'), '| 1 | 정상 | 전 | 조 | 결 | MKT-NEW-001 | MKT-FN-010 |\n');
    const r = await 올리기(원장하나, {}, { ...앞, items: [있던, 남이더한] as never[] });
    expect(몸.baseVersion).toBe(2);
    expect(몸.items?.map((i) => [i.reqId, i.text, '임시' in i])).toEqual([
      ['MKT-REQ-001', '아이디는 4자 이상', false],
      ['MKT-REQ-002', '장바구니는 20개까지', false],
      [undefined, '닉네임은 필수', false],
    ]);
    expect(readFileSync(join(자리.트리, 'docs', 'cases', 'MKT.md'), 'utf8')).toContain('| MKT-REQ-004 |');
    expect(readFileSync(join(자리.자료, 'out', 'prd.json'), 'utf8')).toContain('"MKT-REQ-004"');
    expect(r).toMatchObject({
      줄: [
        '표준 기획서: 판 6 · 이번 자료 항목 1(확인 필요 0) · 지움 0',
        '⚠️ 사람이 고친 항목과 새 문서가 다름 1 — MKT-REQ-001',
        '옮기기 대조: 요구 2 중 빠짐 1 · 요구 아님 0 · 설계 잃음 0',
        '⚠️ 옮기기 빠짐 1 — REQ-1',
      ],
    });
    expect('원장' in r && !('없음' in r.원장) ? r.원장.항목.map((h) => h.번호) : null).toEqual(['MKT-REQ-001', 'MKT-REQ-002', 'MKT-REQ-004']);
  });

  it('원장에 못 넣은 자료가 섞였으면 그 몫은 대조 없음 줄로 남긴다', async () => {
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? 답(200, { version: 3 }) : 답(200, { version: 3, items: [] })));
    결과쓰기({ items: [] });
    const r = await 올리기({ ...원장하나, 빠진자료: ['화면.pdf(PDF)'] });
    expect(r.줄.at(-1)).toBe('⚠️ 옮기기 대조 없음 — 화면.pdf(PDF)');
  });

  it('지금 판을 못 읽거나 서버가 거절하거나 올린 판을 다시 못 읽거나 새 항목을 못 찾으면 거절하고 대조 줄은 남긴다', async () => {
    결과쓰기({ items: [] });
    vi.stubGlobal('fetch', async () => 답(500));
    expect(await 올리기({ 없음: '글자본이 있는 자료가 없다' })).toEqual({
      거절: '표준 기획서를 못 올렸다 — 지금 판을 못 읽었다 (500)',
      줄: ['⚠️ 옮기기 대조 없음 — 글자본이 있는 자료가 없다'],
    });
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) =>
      init?.method === 'POST' ? 답(400, { error: 'PRD_FULL', detail: '1000' }) : 답(200, { version: 1, items: [] }));
    expect(await 올리기({ 없음: '글자본이 있는 자료가 없다' })).toMatchObject({ 거절: '표준 기획서를 못 올렸다 — 400 PRD_FULL 1000' });
    let 올렸다 = false;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? ((올렸다 = true), 답(200, { version: 2 })) : 올렸다 ? 답(500) : 답(200, { version: 1, items: [] })));
    expect(await 올리기({ 없음: '글자본이 있는 자료가 없다' })).toMatchObject({ 거절: expect.stringContaining('다시 못 읽어 새 번호를 모른다') as string });
    결과쓰기({ items: [{ ...있던, reqId: 'MKT-NEW-001', text: '새 규칙' }] });
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? 답(200, { version: 2 }) : 답(200, { version: 1, items: [] })));
    expect(await 올리기({ 없음: '글자본이 있는 자료가 없다' })).toMatchObject({ 거절: expect.stringContaining('올린 판에서 못 찾았다') as string });
  });
});
